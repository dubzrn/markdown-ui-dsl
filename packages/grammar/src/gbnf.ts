import { classText, quote, type Expr, type Grammar } from "./model.js";

/** GBNF rule names: lower-case letters, digits and `-`. */
const name = (n: string): string => n.replace(/_/g, "-");

function expr(e: Expr, top: boolean): string {
  switch (e.t) {
    case "lit":
      return e.s === "" ? '""' : quote(e.s);
    case "set":
      return classText(e.set, "gbnf");
    case "ref":
      return name(e.n);
    case "seq": {
      const xs = e.xs.filter((x) => !(x.t === "lit" && x.s === ""));
      if (xs.length === 0) return '""';
      const s = xs.map((x) => expr(x, false)).join(" ");
      return top || xs.length === 1 ? s : `(${s})`;
    }
    case "alt": {
      const s = e.xs.map((x) => expr(x, true)).join(" | ");
      return top ? s : `(${s})`;
    }
    case "star":
      return `${atom(e.x)}*`;
    case "plus":
      return `${atom(e.x)}+`;
    case "opt":
      return `${atom(e.x)}?`;
  }
}
function atom(e: Expr): string {
  const s = expr(e, false);
  return e.t === "seq" || e.t === "alt" ? (s.startsWith("(") ? s : `(${s})`) : s;
}

/** Emit the grammar for llama.cpp GBNF. */
export function toGbnf(g: Grammar): string {
  const out: string[] = [
    `# markdown-ui-dsl generation grammar (GBNF)`,
    `root ::= ${name(g.start)}`,
  ];
  for (const [n, e] of g.rules) out.push(`${name(n)} ::= ${expr(e, true)}`);
  return out.join("\n") + "\n";
}
