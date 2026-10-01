/**
 * A tolerant HTML / JSX reader (T-071). It is not a full parser: it reads tags, attributes, text and comments well enough
 * to summarise anchored units, and never throws. JSX mode understands `{expression}` attributes and children
 * (only plain string literals are kept) and `{/* ui:anchor x *\/}` comments.
 */
export interface El {
  tag: string;
  /** string = literal value, true = bare attribute, null = dynamic expression (value unknown). */
  attrs: Record<string, string | true | null>;
  children: (El | string)[];
  start: number;
  end: number;
  line: number;
  /** Set when the element is dynamic (children contain non-literal expressions). */
  dynamic: boolean;
}

const VOID = new Set([
  "input",
  "img",
  "br",
  "hr",
  "meta",
  "link",
  "area",
  "base",
  "col",
  "embed",
  "source",
  "track",
  "wbr",
]);
const ANCHOR_COMMENT = /^\s*ui:anchor\s+([A-Za-z~][\w~-]*)\s*$/;

export interface ParseOpts {
  jsx: boolean;
}

/** Plain string value of a JS expression source, or undefined when it is not a single string literal. */
export function stringLiteral(expr: string): string | undefined {
  const e = expr.trim();
  const q = e[0];
  if ((q === '"' || q === "'" || q === "`") && e.length >= 2 && e.endsWith(q)) {
    const body = e.slice(1, -1);
    if (q === "`" && body.includes("${")) return undefined;
    if (body.includes(q) && !body.includes("\\" + q)) return undefined;
    return body.replace(/\\(.)/g, "$1");
  }
  return undefined;
}

const decode = (s: string): string =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

class Reader {
  i = 0;
  constructor(
    readonly src: string,
    readonly opts: ParseOpts,
    private readonly lineStarts: number[],
  ) {}

  line(off: number): number {
    let lo = 0;
    let hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((this.lineStarts[mid] as number) <= off) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  }

  /** Skip a balanced `{ … }` starting at `{`; returns the inner text. Understands strings and template literals. */
  braces(): string {
    const s = this.src;
    let depth = 0;
    const from = this.i;
    for (; this.i < s.length; this.i++) {
      const c = s[this.i] as string;
      if (c === '"' || c === "'" || c === "`") {
        for (this.i++; this.i < s.length && s[this.i] !== c; this.i++)
          if (s[this.i] === "\\") this.i++;
      } else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) {
        this.i++;
        return s.slice(from + 1, this.i - 1);
      }
    }
    return s.slice(from + 1);
  }

  /** Parse one element starting at `<`; `pending` is an anchor from a preceding comment. */
  element(pending: string | undefined): El | undefined {
    const s = this.src;
    const start = this.i;
    const m = /^<([A-Za-z][\w.:-]*)/.exec(s.slice(this.i, this.i + 80));
    if (m === null) return undefined;
    this.i += m[0].length;
    const el: El = {
      tag: m[1] as string,
      attrs: Object.create(null) as El["attrs"],
      children: [],
      start,
      end: start,
      line: this.line(start),
      dynamic: false,
    };
    if (pending !== undefined) el.attrs["data-mdui-anchor"] = pending;
    // attributes
    let selfClosed = false;
    while (this.i < s.length) {
      while (this.i < s.length && /\s/.test(s[this.i] as string)) this.i++;
      const c = s[this.i];
      if (c === ">") {
        this.i++;
        break;
      }
      if (c === "/" && s[this.i + 1] === ">") {
        this.i += 2;
        selfClosed = true;
        break;
      }
      if (c === "{" && this.opts.jsx) {
        this.braces(); // spread
        continue;
      }
      const a = /^[^\s=/>{]+/.exec(s.slice(this.i, this.i + 200));
      if (a === null) {
        this.i++;
        continue;
      }
      const name = a[0];
      this.i += name.length;
      while (this.i < s.length && /\s/.test(s[this.i] as string)) this.i++;
      if (s[this.i] !== "=") {
        el.attrs[name] = true;
        continue;
      }
      this.i++;
      while (this.i < s.length && /\s/.test(s[this.i] as string)) this.i++;
      const q = s[this.i];
      if (q === '"' || q === "'") {
        const end = s.indexOf(q, this.i + 1);
        const stop = end === -1 ? s.length : end;
        el.attrs[name] = decode(s.slice(this.i + 1, stop));
        this.i = Math.min(stop + 1, s.length);
      } else if (q === "{" && this.opts.jsx) {
        const lit = stringLiteral(this.braces());
        el.attrs[name] = lit ?? null;
      } else {
        const v = /^[^\s>]+/.exec(s.slice(this.i, this.i + 200));
        el.attrs[name] = v === null ? "" : v[0];
        this.i += v === null ? 0 : v[0].length;
      }
    }
    if (selfClosed || (!this.opts.jsx && VOID.has(el.tag.toLowerCase()))) {
      el.end = this.i;
      return el;
    }
    this.children(el);
    el.end = this.i;
    return el;
  }

  children(parent: El): void {
    const s = this.src;
    let pending: string | undefined;
    let text = "";
    const flush = (): void => {
      if (text !== "") parent.children.push(decode(text));
      text = "";
    };
    while (this.i < s.length) {
      const c = s[this.i] as string;
      if (s.startsWith("<!--", this.i)) {
        const end = s.indexOf("-->", this.i + 4);
        const stop = end === -1 ? s.length : end;
        const a = ANCHOR_COMMENT.exec(s.slice(this.i + 4, stop));
        if (a !== null) pending = a[1];
        this.i = Math.min(stop + 3, s.length);
      } else if (s.startsWith("</", this.i)) {
        flush();
        const end = s.indexOf(">", this.i);
        this.i = end === -1 ? s.length : end + 1;
        return;
      } else if (c === "<" && /[A-Za-z]/.test(s[this.i + 1] ?? "")) {
        flush();
        const child = this.element(pending);
        pending = undefined;
        if (child !== undefined) parent.children.push(child);
      } else if (c === "{" && this.opts.jsx) {
        const inner = this.braces();
        const block = /^\s*\/\*([\s\S]*)\*\/\s*$/.exec(inner);
        if (block !== null) {
          const a = ANCHOR_COMMENT.exec(block[1] as string);
          if (a !== null) pending = a[1];
        } else {
          const lit = stringLiteral(inner);
          if (lit !== undefined) text += lit;
          else if (inner.trim() !== "") parent.dynamic = true;
        }
      } else {
        text += c;
        this.i++;
      }
    }
    flush();
  }
}

function lineStartsOf(src: string): number[] {
  const out = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") out.push(i + 1);
  return out;
}

/** Parse a whole HTML fragment/document into top-level elements. */
export function parseMarkup(src: string, opts: ParseOpts): El[] {
  const r = new Reader(src, opts, lineStartsOf(src));
  const root: El = {
    tag: "#root",
    attrs: Object.create(null) as El["attrs"],
    children: [],
    start: 0,
    end: src.length,
    line: 1,
    dynamic: false,
  };
  r.children(root);
  return root.children.filter((c): c is El => typeof c !== "string");
}

/** Parse the single element that starts at `offset` (a `<`), as when an anchor comment precedes JSX in a TSX file. */
export function parseElementAt(
  src: string,
  offset: number,
  opts: ParseOpts,
  anchor?: string,
): El | undefined {
  const r = new Reader(src, opts, lineStartsOf(src));
  r.i = offset;
  return r.element(anchor);
}
