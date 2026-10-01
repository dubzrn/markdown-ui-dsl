/** Inline parser (T-016). Decisions: docs/adr/ADR-005-v1-ambiguity-decisions.md (D1, D2, D5, D7, D8). */

export type InlineNode =
  | { kind: "text"; value: string }
  | { kind: "strong"; children: InlineNode[] }
  | { kind: "em"; children: InlineNode[] }
  | { kind: "code"; value: string }
  | { kind: "button"; label: string; action?: string }
  | { kind: "link"; label: string; target: string }
  | { kind: "input"; placeholder: string }
  | { kind: "image"; description: string }
  | { kind: "badge"; label: string }
  | { kind: "checkbox"; checked: boolean; label: string }
  | { kind: "radio"; checked: boolean; label: string }
  | { kind: "toggle"; on: boolean; label: string }
  | { kind: "dropdown"; label: string; options?: string[]; dynamic?: string };

/** Characters a backslash can escape (D7). */
export const ESCAPABLE = "\\[](){}|>#*_`";

const MAX_DEPTH = 8;

/** Index of the closing `close` at/after `from`, skipping backslash escapes; -1 if none. */
function findClose(s: string, from: number, close: string): number {
  for (let i = from; i < s.length; i++) {
    if (s[i] === "\\") i++;
    else if (s.startsWith(close, i)) return i;
  }
  return -1;
}

/** Remove D7 escapes from a raw label/target. */
export function unescape(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i] as string;
    if (c === "\\" && i + 1 < s.length && ESCAPABLE.includes(s[i + 1] as string)) {
      out += s[i + 1];
      i++;
    } else out += c;
  }
  return out;
}

const isAlnum = (c: string | undefined): boolean => c !== undefined && /[\p{L}\p{N}]/u.test(c);

/** Line-start widgets: checkbox, radio, toggle, dropdown (D5). Returns a node or undefined. */
function lineStart(s: string): InlineNode | undefined {
  let m = /^\[( |x|X)\] (.+)$/.exec(s);
  if (m !== null)
    return { kind: "checkbox", checked: m[1] !== " ", label: unescape((m[2] as string).trim()) };
  m = /^\((?: |x|X)\) (.+)$/.exec(s);
  if (m !== null)
    return {
      kind: "radio",
      checked: !s.startsWith("( )"),
      label: unescape((m[1] as string).trim()),
    };
  m = /^\[(on|off)\] (.+)$/.exec(s);
  if (m !== null)
    return { kind: "toggle", on: m[1] === "on", label: unescape((m[2] as string).trim()) };
  m = /^\[v\] (.+)$/.exec(s);
  if (m !== null) {
    const rest = (m[1] as string).trim();
    const o = /^(.*?)\s*\{([^{}]*)\}$/.exec(rest);
    if (o === null) return { kind: "dropdown", label: unescape(rest) };
    const body = (o[2] as string).trim();
    const label = unescape((o[1] as string).trim());
    const dyn = /^dynamic:\s*([A-Za-z][\w-]*)$/.exec(body);
    if (dyn !== null) return { kind: "dropdown", label, dynamic: dyn[1] as string };
    return {
      kind: "dropdown",
      label,
      options: body === "" ? [] : body.split(",").map((x) => unescape(x.trim())),
    };
  }
  return undefined;
}

/** `inEm` is internal: emphasis does not nest inside emphasis (keeps printing unambiguous). */
export function parseInline(input: string, depth = 0, inEm = false): InlineNode[] {
  const s = depth === 0 ? input.trim() : input;
  const head = depth === 0 ? lineStart(s) : undefined;
  if (head !== undefined) return [head];

  const out: InlineNode[] = [];
  let buf = "";
  const flush = (): void => {
    if (buf !== "") {
      out.push({ kind: "text", value: buf });
      buf = "";
    }
  };
  let i = 0;
  while (i < s.length) {
    const c = s[i] as string;
    if (c === "\\" && i + 1 < s.length && ESCAPABLE.includes(s[i + 1] as string)) {
      buf += s[i + 1];
      i += 2;
      continue;
    }
    if (c === "`") {
      const j = s.indexOf("`", i + 1);
      if (j > i + 1) {
        flush();
        out.push({ kind: "code", value: s.slice(i + 1, j) });
        i = j + 1;
        continue;
      }
    }
    if (c === "(" && s[i + 1] === "(") {
      const j = findClose(s, i + 2, "))");
      const label = j === -1 ? "" : s.slice(i + 2, j).trim();
      if (j !== -1 && label !== "") {
        flush();
        out.push({ kind: "badge", label: unescape(label) });
        i = j + 2;
        continue;
      }
    }
    if (c === "[") {
      const j = findClose(s, i + 1, "]");
      if (j !== -1) {
        const raw = s.slice(i + 1, j);
        const inner = raw.trim();
        const padded = raw !== inner;
        let node: InlineNode | undefined;
        let end = j + 1;
        let target: string | undefined;
        if (s[j + 1] === "(") {
          const k = findClose(s, j + 2, ")");
          if (k !== -1) {
            target = unescape(s.slice(j + 2, k).trim());
            end = k + 1;
          }
        }
        if (inner.startsWith("text:"))
          node = { kind: "input", placeholder: unescape(inner.slice(5).trim()) };
        else if (inner.startsWith("IMG:"))
          node = { kind: "image", description: unescape(inner.slice(4).trim()) };
        else if (inner !== "" && target !== undefined) {
          node = padded
            ? { kind: "button", label: unescape(inner), action: target }
            : { kind: "link", label: unescape(inner), target };
        } else if (inner !== "" && padded) {
          node = { kind: "button", label: unescape(inner) };
          end = j + 1;
        }
        if (node !== undefined) {
          if (node.kind === "input" || node.kind === "image") end = j + 1;
          flush();
          out.push(node);
          i = end;
          continue;
        }
      }
    }
    if (c === "*" && depth < MAX_DEPTH) {
      const strong = s.startsWith("**", i);
      const mark = strong ? "**" : "*";
      const j = inEm && !strong ? -1 : findClose(s, i + mark.length, mark);
      const body = j === -1 ? "" : s.slice(i + mark.length, j);
      if (j !== -1 && body.trim() !== "" && !/^\s|\s$/.test(body)) {
        flush();
        const children = parseInline(body, depth + 1, inEm || !strong);
        out.push(strong ? { kind: "strong", children } : { kind: "em", children });
        i = j + mark.length;
        continue;
      }
    }
    if (c === "_" && depth < MAX_DEPTH && !inEm && !isAlnum(s[i - 1])) {
      const j = findClose(s, i + 1, "_");
      const body = j === -1 ? "" : s.slice(i + 1, j);
      if (j !== -1 && body !== "" && !/^\s|\s$/.test(body) && !isAlnum(s[j + 1])) {
        flush();
        out.push({ kind: "em", children: parseInline(body, depth + 1, true) });
        i = j + 1;
        continue;
      }
    }
    buf += c;
    i++;
  }
  flush();
  return out;
}

const esc = (t: string): string =>
  [...t].map((ch) => (ESCAPABLE.includes(ch) ? `\\${ch}` : ch)).join("");

const isEmphasis = (n: InlineNode | undefined): boolean => n?.kind === "strong" || n?.kind === "em";

/** Canonical printer; `parseInline(printInline(x))` equals `x` after normalisation. */
export function printInline(nodes: InlineNode[], inEmphasis = false): string {
  return nodes
    .map((n): string => {
      switch (n.kind) {
        case "text":
          return esc(n.value);
        case "strong":
          return `**${printInline(n.children, true)}**`;
        case "em": {
          // `*` directly next to another emphasis run is ambiguous (`***`), so use `_` there.
          const mark =
            isEmphasis(n.children[0]) || isEmphasis(n.children[n.children.length - 1]) ? "_" : "*";
          return `${mark}${printInline(n.children, true)}${mark}`;
        }
        case "code":
          return `\`${n.value}\``;
        case "button":
          return n.action === undefined
            ? `[ ${esc(n.label)} ]`
            : `[ ${esc(n.label)} ](${esc(n.action)})`;
        case "link":
          return `[${esc(n.label)}](${esc(n.target)})`;
        case "input":
          return `[ text: ${esc(n.placeholder)} ]`;
        case "image":
          return `[ IMG: ${esc(n.description)} ]`;
        case "badge":
          return `(( ${esc(n.label)} ))`;
        case "checkbox":
          return `[${n.checked ? "x" : " "}] ${esc(n.label)}`;
        case "radio":
          return `(${n.checked ? "x" : " "}) ${esc(n.label)}`;
        case "toggle":
          return `[${n.on ? "on" : "off"}] ${esc(n.label)}`;
        case "dropdown": {
          const tail =
            n.dynamic !== undefined
              ? ` {dynamic: ${n.dynamic}}`
              : n.options !== undefined
                ? ` {${n.options.map(esc).join(", ")}}`
                : "";
          return `[v] ${esc(n.label)}${tail}`;
        }
      }
    })
    .join("");
}
