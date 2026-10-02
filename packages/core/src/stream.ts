/** Streaming incremental parser (T-042).
 *
 * Text arrives in arbitrary chunks. Only complete lines are parsed; the unfinished last line is held back
 * (its provisional parse appears in `tail`). Top-level blocks that nothing later can change are *committed*
 * and never revoked; the *tail* (blocks that may still grow) is replaced wholesale on every update, which is the
 * only retraction channel. After `end()` the committed nodes, diagnostics and metadata equal a batch `parse()`.
 */
import type { BlockNode, Document, FrontmatterNode } from "./ast.js";
import type { Diagnostic } from "./diagnostics.js";
import type { FrontmatterData } from "./frontmatter.js";
import { parse, parseWith, type ParseInit } from "./parse.js";
import { walkBlocks } from "./walk.js";

/** True when `n` (or anything inside it) is a container still waiting for its closer. */
function isOpen(n: BlockNode): boolean {
  let open = false;
  walkBlocks([n], ({ node }) => {
    if ("closed" in node && node.closed === false) open = true;
  });
  return open;
}

export interface StreamUpdate {
  /** Blocks newly committed by this update (final; never retracted). */
  committed: BlockNode[];
  /** Provisional blocks after the committed ones. Replaces the previous tail entirely. */
  tail: BlockNode[];
  /** Diagnostics for committed blocks only (monotonically growing). */
  diagnostics: Diagnostic[];
  /** Diagnostics of the provisional tail (may disappear on the next update). */
  tailDiagnostics: Diagnostic[];
  /** Frontmatter, once complete. */
  frontmatter: FrontmatterNode | undefined;
}

export class StreamParser {
  private text = ""; // everything received
  private resumeOffset = 0; // offset in `text` where uncommitted parsing starts
  private resumeLine = 1;
  private committedBody: BlockNode[] = [];
  private committedDiags: Diagnostic[] = [];
  private frontmatter: FrontmatterNode | undefined;
  private meta: FrontmatterData = {};
  private dsl: "1" | "2.0" = "1";
  private started = false; // has the first parse (which may find frontmatter) run

  /** Feed a chunk. Never throws. */
  push(chunk: string): StreamUpdate {
    this.text += chunk;
    return this.advance(false);
  }

  /** Finish the stream and return the final document (equal to `parse(allText)`). */
  end(): Document {
    this.advance(true);
    const full = this.text;
    const lineStarts: number[] = [0];
    for (let i = 0; i < full.length; i++) if (full[i] === "\n") lineStarts.push(i + 1);
    return {
      ...(this.frontmatter !== undefined
        ? { frontmatter: this.frontmatter }
        : { frontmatter: undefined }),
      meta: this.meta,
      dsl: this.dsl,
      body: this.committedBody,
      diagnostics: this.committedDiags,
      lineStarts,
    };
  }

  private advance(final: boolean): StreamUpdate {
    const complete = final ? this.text : this.text.slice(0, this.text.lastIndexOf("\n") + 1);
    const region = complete.slice(this.resumeOffset);
    const init: ParseInit | undefined = this.started
      ? { baseLine: this.resumeLine, baseOffset: this.resumeOffset, dsl: this.dsl, meta: this.meta }
      : undefined;
    // nothing complete yet (first line still arriving): hold off — it may turn out to be a frontmatter fence
    if (!this.started && region === "" && !final) {
      const prov = this.parseRest(this.text);
      return this.update([], prov.body, prov.diagnostics);
    }
    const doc = parseWith(region, init);
    const newlyCommitted: BlockNode[] = [];

    if (!this.started) {
      const fm = doc.frontmatter;
      if (fm !== undefined) {
        // frontmatter is complete: commit its diagnostics, resume after its closing fence, and re-run
        this.frontmatter = fm;
        this.meta = doc.meta;
        this.dsl = doc.dsl;
        this.committedDiags.push(
          ...doc.diagnostics.filter((d) => d.span.start.line <= fm.span.end.line),
        );
        this.resumeOffset = doc.lineStarts[fm.span.end.line] ?? complete.length; // start of the line after the closing fence
        this.resumeLine = fm.span.end.line + 1;
        this.started = true;
        return this.advance(final);
      }
      const waiting =
        !final &&
        /^---[ \t]*(\r?\n|$)/.test(region) &&
        doc.diagnostics.some((d) => d.code === "E1006");
      if (waiting) return this.update([], [], []); // a possible frontmatter whose closing fence has not arrived
      this.started = true; // no frontmatter (or a final, unterminated one): body parsing as batch would
      if (final) {
        this.committedBody.push(...doc.body);
        this.committedDiags.push(...doc.diagnostics);
        this.meta = doc.meta;
        this.dsl = doc.dsl;
        this.resumeOffset = complete.length;
        return this.update(doc.body, [], []);
      }
    }

    const nodes = doc.body;
    let commitCount = final ? nodes.length : Math.max(nodes.length - 1, 0);
    if (!final && nodes.length > 0) {
      const last = nodes[nodes.length - 1] as BlockNode;
      const endsBlank = /(^|\n)[ \t]*\r?\n$/.test(complete);
      const open =
        isOpen(last) ||
        doc.diagnostics.some(
          (d) =>
            (d.code === "E1003" || d.code === "E1005") && d.span.start.line >= last.span.start.line,
        );
      if (endsBlank && !open) commitCount = nodes.length;
    }
    if (commitCount > 0) {
      newlyCommitted.push(...nodes.slice(0, commitCount));
      this.committedBody.push(...newlyCommitted);
      const next = commitCount < nodes.length ? (nodes[commitCount] as BlockNode) : undefined;
      let boundaryLine: number;
      if (next !== undefined) {
        boundaryLine = next.span.start.line;
        this.resumeOffset = next.span.start.offset - (next.span.start.col - 1);
      } else {
        boundaryLine = this.resumeLine + (region.split("\n").length - 1);
        this.resumeOffset = complete.length;
      }
      this.resumeLine = boundaryLine;
      if (!final)
        this.committedDiags.push(
          ...doc.diagnostics.filter((d) => d.span.start.line < boundaryLine),
        );
    }
    if (final) {
      // the stream is over: whatever the last parse reported is final
      this.committedDiags.push(...doc.diagnostics);
      return this.update(newlyCommitted, [], []);
    }
    const rest = this.parseRest(this.text.slice(this.resumeOffset));
    return this.update(newlyCommitted, rest.body, rest.diagnostics);
  }

  private update(
    committed: BlockNode[],
    tail: BlockNode[],
    tailDiagnostics: Diagnostic[],
  ): StreamUpdate {
    return {
      committed,
      tail,
      diagnostics: this.committedDiags,
      tailDiagnostics,
      frontmatter: this.frontmatter,
    };
  }

  private parseRest(rest: string): Document {
    if (rest === "")
      return {
        frontmatter: undefined,
        meta: this.meta,
        dsl: this.dsl,
        body: [],
        diagnostics: [],
        lineStarts: [],
      };
    if (!this.started) return parse(rest);
    return parseWith(rest, {
      baseLine: this.resumeLine,
      baseOffset: this.resumeOffset,
      dsl: this.dsl,
      meta: this.meta,
    });
  }
}

/** Convenience: parse an iterable of chunks and return the final document. */
export function parseStream(chunks: Iterable<string>): Document {
  const p = new StreamParser();
  for (const c of chunks) p.push(c);
  return p.end();
}
