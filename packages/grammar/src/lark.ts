import { classText, quote, type Expr, type Grammar } from "./model.js";

/** Lark names must be lower-case letters, digits and `_`. */
const name = (n: string): string => n.replace(/-/g, "_");

/** How a rendered fragment composes: `single` token/group can take a quantifier; `quant` and `multi` must be wrapped first. */
interface R {
  s: string;
  kind: "single" | "quant" | "multi";
}

const wrap = (r: R): string => (r.kind === "single" ? r.s : `(${r.s})`);

/**
 * Lark has no empty terminals, so epsilon never appears as `""`: it is dropped from sequences and turns an
 * alternative into an optional group. Returns undefined when the expression matches only the empty string.
 */
function render(e: Expr): R | undefined {
  switch (e.t) {
    case "lit":
      return e.s === "" ? undefined : { s: quote(e.s), kind: "single" };
    case "set":
      return { s: `/${classText(e.set)}/`, kind: "single" };
    case "ref":
      return { s: name(e.n), kind: "single" };
    case "seq": {
      const parts = e.xs.map(render).filter((x): x is R => x !== undefined);
      if (parts.length === 0) return undefined;
      if (parts.length === 1) return parts[0] as R;
      return {
        s: parts
          .map((p) => (p.kind === "multi" && p.s.includes(" | ") ? `(${p.s})` : p.s))
          .join(" "),
        kind: "multi",
      };
    }
    case "alt": {
      const branches = e.xs.map(render);
      const hasEps = branches.some((b) => b === undefined);
      const rest = branches.filter((b): b is R => b !== undefined);
      if (rest.length === 0) return undefined;
      const body = rest.map((b) => b.s).join(" | ");
      if (hasEps) return { s: `(${body})?`, kind: "quant" };
      return rest.length === 1 ? (rest[0] as R) : { s: body, kind: "multi" };
    }
    case "star":
    case "plus":
    case "opt": {
      const inner = render(e.x);
      if (inner === undefined) return undefined;
      const q = e.t === "star" ? "*" : e.t === "plus" ? "+" : "?";
      return { s: `${wrap(inner)}${q}`, kind: "quant" };
    }
  }
}

/** Emit the grammar for Lark (Earley, dynamic lexer). Rule bodies use only strings, `/[class]/` and rule references. */
export function toLark(g: Grammar): string {
  const out: string[] = [
    `// markdown-ui-dsl generation grammar (Lark). Start: ${name(g.start)}.`,
    `start: ${name(g.start)}`,
    "",
  ];
  for (const [n, e] of g.rules) {
    const r = render(e);
    // a rule that can only be empty is written as an optional empty group Lark accepts: an unreachable alternative
    out.push(`${name(n)}: ${r === undefined ? '("")?' : r.s}`);
  }
  return out.join("\n") + "\n";
}
