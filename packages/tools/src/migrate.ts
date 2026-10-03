/** v1 → 2.0 migration (T-036): bump `dsl:`, convert unambiguous idioms, list everything that would change meaning. */
import { parse, walkBlocks, type Document } from "@vrillabs/mdui-core";

export interface MigrateChange {
  line: number;
  kind: "bump" | "date" | "progress";
  before: string;
  after: string;
}
export interface MigrateManual {
  line: number;
  message: string;
}
export interface MigrateResult {
  /** The migrated text (equal to the input when `alreadyV2` or nothing to do). */
  text: string;
  changes: MigrateChange[];
  /** Text whose meaning RFC-0001 §6 changes under 2.0; a human must decide. Migration is refused while any remain (unless forced). */
  manual: MigrateManual[];
  alreadyV2: boolean;
}

/** Constructs that mean something different when `dsl: 2.0` is declared (RFC-0001 §6). */
const MEANING_CHANGES: { re: RegExp; message: string }[] = [
  {
    re: /^\s*--- END [A-Z]/,
    message:
      "line looks like a typed closer (`--- END KIND ---`): plain text in 1.x, a closer in 2.0",
  },
  { re: /\{:(?=[ #.A-Za-z])/, message: "`{:` starts an attribute list in 2.0" },
  { re: /\{\{/, message: "`{{ … }}` is a data binding in 2.0 (use `\\{\\{` for literal braces)" },
  { re: /\[\[/, message: "`[[ … ]]` can be an include in 2.0" },
  {
    re: /\[ ?(?!IMG)[A-Z]{2,}:/,
    message: "`[ KIND: … ]` with an upper-case kind is a 2.0 primitive",
  },
  { re: /^\s*\*\*\* .+ \*\*\*\s*$/, message: "`*** text ***` is a labelled divider in 2.0" },
  {
    re: /^\s*>\s*@(dark|light|print|reduced-motion|contrast-more|touch|hover)\b/,
    message: "environment directive: a plain hint in 1.x, a directive in 2.0",
  },
  {
    re: /^\s*(?:- )?::: (?!CARD :::|MODAL :::|HEADER :::|FOOTER :::|BUBBLE (?:USER|AGENT) :::)[A-Z]/,
    message: "`::: KIND :::` with another kind is a 2.0 container",
  },
];

const ISO_DATE = /^\[ text: (\d{4}-\d{2}-\d{2}) \]$/;
const PROGRESS = /^(?:\*\*)?(\d{1,3})% (?:complete|done)(?:\*\*)?$/;

/** Lines inside code fences or comments are literal and never migrated. */
function literalLines(doc: Document): Set<number> {
  const s = new Set<number>();
  walkBlocks(doc.body, ({ node }) => {
    if (node.kind === "code" || node.kind === "comment")
      for (let l = node.span.start.line; l <= node.span.end.line; l++) s.add(l);
  });
  return s;
}

export function migrate(source: string): MigrateResult {
  const src = source.replace(/\r\n/g, "\n");
  const doc = parse(src);
  if (doc.dsl === "2.0") return { text: source, changes: [], manual: [], alreadyV2: true };
  const lines = src.split("\n");
  const literal = literalLines(doc);
  const fmEnd = doc.frontmatter?.span.end.line ?? 0;
  const manual: MigrateManual[] = [];
  lines.forEach((l, i) => {
    const no = i + 1;
    if (no <= fmEnd || literal.has(no)) return;
    for (const m of MEANING_CHANGES)
      if (m.re.test(l)) manual.push({ line: no, message: m.message });
  });

  const changes: MigrateChange[] = [];
  const edits = new Map<number, string>();
  walkBlocks(doc.body, ({ node }) => {
    if (node.kind !== "line") return;
    const line = node.span.start.line;
    const raw = lines[line - 1] as string;
    const t = node.text;
    const d = ISO_DATE.exec(t);
    if (d !== null) edits.set(line, raw.replace(t, `[ DATE: ${d[1]} ]`));
    const p = PROGRESS.exec(t);
    if (p !== null && Number(p[1]) <= 100)
      edits.set(line, raw.replace(t, `[ PROGRESS: ${p[1]}% ]`));
  });
  for (const [line, after] of edits) {
    const before = lines[line - 1] as string;
    changes.push({ line, kind: /DATE/.test(after) ? "date" : "progress", before, after });
    lines[line - 1] = after;
  }

  // bump (after content edits so recorded line numbers refer to the original)
  let out: string[];
  if (doc.frontmatter !== undefined) {
    const start = doc.frontmatter.span.start.line;
    const idx = lines.findIndex((l, i) => i >= start && i < fmEnd - 1 && /^dsl:/.test(l));
    out = [...lines];
    if (idx !== -1) out[idx] = "dsl: 2.0";
    else out.splice(start, 0, "dsl: 2.0");
    changes.push({
      line: start + 1,
      kind: "bump",
      before: idx !== -1 ? (lines[idx] as string) : "",
      after: "dsl: 2.0",
    });
  } else {
    out = ["---", "dsl: 2.0", "---", "", ...lines];
    changes.push({ line: 1, kind: "bump", before: "", after: "---\ndsl: 2.0\n---" });
  }
  changes.sort((a, b) => a.line - b.line);
  return { text: out.join("\n"), changes, manual, alreadyV2: false };
}
