import { walkBlocks, type Diagnostic } from "@mdui/core";
import type { Finding, Rule, RuleContext } from "../rule.js";

/** A rule that surfaces already-computed diagnostics with the given codes. */
function fromDiagnostics(
  id: string,
  description: string,
  codes: string[],
  severity: Rule["defaultSeverity"] = "error",
): Rule {
  return {
    id,
    description,
    defaultSeverity: severity,
    check(ctx: RuleContext, report: (f: Finding) => void): void {
      for (const d of ctx.diagnostics as Diagnostic[])
        if (codes.includes(d.code)) report({ code: d.code, message: d.message, span: d.span });
    },
  };
}

export const balancedBlocks = fromDiagnostics(
  "balanced-blocks",
  "Every container opener has a matching closer, and typed closers match (E1001, E1004).",
  ["E1001", "E1004"],
);

export const orphanCloser = fromDiagnostics(
  "orphan-closer",
  "A `--- END ---` with nothing open (E1002).",
  ["E1002"],
);

export const duplicateId = fromDiagnostics(
  "duplicate-id",
  "Each #id is used once per document (E2001).",
  ["E2001"],
);

export const unknownDirective = fromDiagnostics(
  "unknown-directive",
  "Responsive/environment directives use a known `@token` and `name: value` pairs (W1201, W1203).",
  ["W1201", "W1203"],
  "warn",
);

export const brokenLinkOrInclude = {
  id: "broken-link-or-include",
  description: "Includes resolve (E2301–E2304) and links/buttons have a target (W2601).",
  defaultSeverity: "error",
  check(ctx, report): void {
    for (const d of ctx.diagnostics)
      if (["E2301", "E2302", "E2303", "E2304"].includes(d.code))
        report({ code: d.code, message: d.message, span: d.span });
    const visit = (nodes: Parameters<typeof walkBlocks>[0]): void =>
      walkBlocks(nodes, ({ node }) => {
        const runs =
          node.kind === "line" || node.kind === "heading" || node.kind === "item"
            ? [node.inline]
            : node.kind === "table"
              ? [...node.headerInline, ...node.rowsInline.flat()]
              : [];
        for (const run of runs)
          for (const n of run) {
            if ((n.kind === "link" && n.target === "") || (n.kind === "button" && n.action === ""))
              report({
                code: "W2601",
                message: "Link or button has an empty target.",
                span: node.span,
              });
          }
      });
    visit(ctx.doc.body);
  },
} satisfies Rule;

export const emptyContainer = {
  id: "empty-container",
  description:
    "Containers should contain something (W1401). `EMPTY`, `SKELETON`-style placeholders are exempt.",
  defaultSeverity: "warn",
  check(ctx, report): void {
    walkBlocks(ctx.doc.body, ({ node }) => {
      const isContainer =
        node.kind === "column" ||
        node.kind === "row" ||
        node.kind === "card" ||
        node.kind === "modal" ||
        node.kind === "header" ||
        node.kind === "footer" ||
        node.kind === "bubble-user" ||
        node.kind === "bubble-agent" ||
        (node.kind === "block" && !["empty", "tooltip"].includes(node.name));
      if (isContainer && "children" in node && node.children.length === 0)
        report({
          code: "W1401",
          message: `Empty ${node.kind === "block" ? node.name.toUpperCase() : node.kind.toUpperCase()} block.`,
          span: node.span,
        });
    });
  },
} satisfies Rule;

export const structuralRules: Rule[] = [
  balancedBlocks,
  orphanCloser,
  duplicateId,
  unknownDirective,
  emptyContainer,
  brokenLinkOrInclude,
];
