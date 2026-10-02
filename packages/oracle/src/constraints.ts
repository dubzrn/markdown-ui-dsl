/**
 * Post-code constraint verification (T-080): the measurable subset of the UX constraints, checked against the live page.
 * Violations point at the spec line of the node they concern.
 */
import { parse, type Document } from "@mdui/core";
import { expectedTree, type Expected } from "./expected.js";
import type { Actual } from "./snapshot.js";

export interface Box {
  role: string;
  name: string;
  width: number;
  height: number;
}

export interface PostViolation {
  constraint:
    | "every-input-labelled"
    | "heading-order"
    | "landmarks-present"
    | "tap-target"
    | "help-reachable";
  message: string;
  /** Spec line of the node concerned (1 when the constraint is document-wide). */
  line: number;
}

export interface PostOptions {
  /** Constraint values as declared (same shapes as the lint constraints). Only listed constraints are checked. */
  constraints: Record<string, unknown>;
  /** Interactive elements with their rendered size (from `readBoxes`). Needed for `tap-target`. */
  boxes?: Box[];
}

const num = (v: unknown, dflt: number): number => {
  if (typeof v === "number") return v;
  if (v !== null && typeof v === "object") {
    const o = v as { min?: unknown };
    if (typeof o.min === "number") return o.min;
  }
  return dflt;
};
const on = (c: Record<string, unknown>, k: string): boolean =>
  c[k] !== undefined && c[k] !== false && c[k] !== null;

export function verifyConstraints(
  specSource: string,
  actual: readonly Actual[],
  opts: PostOptions,
): PostViolation[] {
  const doc: Document = parse(specSource);
  const expected = expectedTree(doc);
  const c = opts.constraints;
  const out: PostViolation[] = [];
  const lineOf = (role: string, name: string): number =>
    expected.find((e) => e.role === role && e.name.toLowerCase() === name.toLowerCase())?.line ?? 1;

  if (on(c, "every-input-labelled"))
    for (const a of actual)
      if (
        ["textbox", "combobox", "checkbox", "radio", "switch", "slider"].includes(a.role) &&
        a.name.trim() === ""
      )
        out.push({
          constraint: "every-input-labelled",
          message: `A ${a.role} on the page has no accessible name.`,
          line: 1,
        });

  if (on(c, "heading-order")) {
    let prev = 0;
    for (const a of actual)
      if (a.role === "heading" && a.level !== undefined) {
        if (a.level > prev + 1)
          out.push({
            constraint: "heading-order",
            message: `Heading "${a.name}" is level ${a.level} after level ${prev}.`,
            line: lineOf("heading", a.name),
          });
        prev = a.level;
      }
  }

  if (on(c, "landmarks-present"))
    for (const e of expected.filter(
      (x: Expected) =>
        x.kind === "landmark" && ["banner", "contentinfo", "dialog"].includes(x.role),
    ))
      if (!actual.some((a) => a.role === e.role))
        out.push({
          constraint: "landmarks-present",
          message: `The spec declares a ${e.role} landmark; the page has none.`,
          line: e.line,
        });

  if (
    on(c, "help-reachable") &&
    !actual.some(
      (a) =>
        (a.role === "link" || a.role === "button") &&
        /\b(help|support|contact|faq)\b/i.test(a.name),
    )
  )
    out.push({
      constraint: "help-reachable",
      message: "The page has no help, support or contact control.",
      line: 1,
    });

  if (on(c, "tap-target") && opts.boxes !== undefined) {
    const min = num(c["tap-target"], 44);
    for (const b of opts.boxes)
      if (b.width > 0 && b.height > 0 && (b.width < min || b.height < min))
        out.push({
          constraint: "tap-target",
          message: `${b.role} "${b.name}" is ${Math.round(b.width)}x${Math.round(b.height)} px; the minimum is ${min}.`,
          line: lineOf(b.role, b.name),
        });
  }
  return out;
}

export interface BoxPage {
  evaluate(expression: string): Promise<unknown>;
}

/** Browser-side expression: sizes of the interactive elements (kept as a string so this package needs no DOM types). */
const BOXES_JS = `(() => {
  const roleOf = (e) => {
    const r = e.getAttribute("role");
    if (r !== null) return r;
    const t = e.tagName.toLowerCase();
    if (t === "a") return "link";
    if (t === "button") return "button";
    if (t === "select") return "combobox";
    if (t === "textarea") return "textbox";
    const type = (e.getAttribute("type") || "text").toLowerCase();
    return type === "checkbox" ? "checkbox" : type === "radio" ? "radio" : type === "submit" || type === "button" ? "button" : "textbox";
  };
  const nameOf = (e) => (e.getAttribute("aria-label") || e.textContent || e.getAttribute("placeholder") || "").replace(/\\s+/g, " ").trim();
  return [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=switch]")].map((e) => {
    const r = e.getBoundingClientRect();
    return { role: roleOf(e), name: nameOf(e), width: r.width, height: r.height };
  });
})()`;

/** Sizes of the interactive elements on a page. */
export async function readBoxes(page: BoxPage): Promise<Box[]> {
  return (await page.evaluate(BOXES_JS)) as Box[];
}
