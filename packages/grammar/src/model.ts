/** A small context-free grammar model: the single source for the Lark / GBNF emitters, the generator and the recognizer. */

/** A character set: single characters and inclusive ranges, optionally negated. */
export interface CharSet {
  neg: boolean;
  items: (string | [string, string])[];
}

export type Expr =
  | { t: "lit"; s: string }
  | { t: "set"; set: CharSet }
  | { t: "ref"; n: string }
  | { t: "seq"; xs: Expr[] }
  | { t: "alt"; xs: Expr[] }
  | { t: "star" | "plus" | "opt"; x: Expr };

export interface Grammar {
  start: string;
  /** Rule name -> body. Names are lower-case `a-z0-9_`. Insertion order is the emission order. */
  rules: Map<string, Expr>;
}

export const lit = (s: string): Expr => ({ t: "lit", s });
export const ref = (n: string): Expr => ({ t: "ref", n });
export const seq = (...xs: (Expr | string)[]): Expr => ({
  t: "seq",
  xs: xs.map((x) => (typeof x === "string" ? lit(x) : x)),
});
export const alt = (...xs: (Expr | string)[]): Expr => {
  const out: Expr[] = [];
  for (const x of xs) {
    const e = typeof x === "string" ? lit(x) : x;
    // flatten nested alternatives: same language, and the generator then chooses uniformly among all of them
    if (e.t === "alt") out.push(...e.xs);
    else out.push(e);
  }
  return { t: "alt", xs: out };
};
export const star = (x: Expr | string): Expr => ({
  t: "star",
  x: typeof x === "string" ? lit(x) : x,
});
export const plus = (x: Expr | string): Expr => ({
  t: "plus",
  x: typeof x === "string" ? lit(x) : x,
});
export const opt = (x: Expr | string): Expr => ({
  t: "opt",
  x: typeof x === "string" ? lit(x) : x,
});
export const EPS: Expr = lit("");

function expand(items: (string | [string, string])[]): (string | [string, string])[] {
  const out: (string | [string, string])[] = [];
  for (const i of items) {
    if (typeof i === "string") out.push(...i);
    else out.push(i);
  }
  return out;
}

/** `chars("ab", ["0","9"])` = one of a, b, 0-9. */
export const oneOf = (...items: (string | [string, string])[]): Expr => ({
  t: "set",
  set: { neg: false, items: expand(items) },
});
/** Any character except those listed (newline is NOT implied: list it). */
export const noneOf = (...items: (string | [string, string])[]): Expr => ({
  t: "set",
  set: { neg: true, items: expand(items) },
});

export function inSet(set: CharSet, ch: string): boolean {
  const hit = set.items.some((i) => (typeof i === "string" ? i === ch : ch >= i[0] && ch <= i[1]));
  return set.neg ? !hit : hit;
}

/** Quote for a Lark/GBNF double-quoted string. */
export function quote(s: string): string {
  let out = '"';
  for (const ch of s) {
    if (ch === "\\") out += "\\\\";
    else if (ch === '"') out += '\\"';
    else if (ch === "\n") out += "\\n";
    else if (ch === "\t") out += "\\t";
    else if (ch === "\r") out += "\\r";
    else out += ch;
  }
  return out + '"';
}

/** `lark` = Python regex classes; `gbnf` = llama.cpp GBNF, which only knows `\\ \n \r \t \[ \]` and `\xNN` escapes. */
export type Dialect = "lark" | "gbnf";

const esc = (c: string, dialect: Dialect): string => {
  if (c === "\\" || c === "]" || c === "[") return `\\${c}`;
  if (c === "^" || c === "-")
    return dialect === "gbnf" ? `\\x${c.charCodeAt(0).toString(16).toUpperCase()}` : `\\${c}`;
  if (c === "\n") return "\\n";
  if (c === "\t") return "\\t";
  if (c === "\r") return "\\r";
  return c;
};

/** `[...]` class text for the target dialect. */
export function classText(set: CharSet, dialect: Dialect = "lark"): string {
  const body = set.items
    .map((i) =>
      typeof i === "string" ? esc(i, dialect) : `${esc(i[0], dialect)}-${esc(i[1], dialect)}`,
    )
    .join("");
  return `[${set.neg ? "^" : ""}${body}]`;
}
