import { walkBlocks, type Diagnostic, type TextEdit } from "@mdui/core";
import type { Finding, Rule, RuleContext } from "../rule.js";
import { isContainer } from "../util.js";

function fromDiagnostics(
  id: string,
  description: string,
  codes: string[],
  severity: Rule["defaultSeverity"] = "error",
  fix?: (d: Diagnostic, ctx: RuleContext) => TextEdit[] | undefined,
): Rule {
  return {
    id,
    category: "structure",
    description,
    defaultSeverity: severity,
    codes,
    fixable: fix !== undefined,
    check(ctx: RuleContext, report: (f: Finding) => void): void {
      for (const d of ctx.diagnostics as Diagnostic[]) {
        if (!codes.includes(d.code)) continue;
        const edits = fix?.(d, ctx);
        report({
          code: d.code,
          message: d.message,
          span: d.span,
          ...(edits !== undefined ? { fix: edits } : {}),
        });
      }
    },
  };
}

/** Delete the orphan closer's whole line. */
const deleteLine = (d: Diagnostic, ctx: RuleContext): TextEdit[] => {
  const line = d.span.start.line;
  const from = ctx.doc.lineStarts[line - 1] ?? 0;
  const to = ctx.doc.lineStarts[line] ?? ctx.source.length;
  return [
    {
      span: { start: { line, col: 1, offset: from }, end: { line: line + 1, col: 1, offset: to } },
      newText: "",
    },
  ];
};

export const balancedBlocks: Rule = {
  id: "balanced-blocks",
  category: "structure",
  description:
    "Every container opener has a matching closer, and typed closers match (E1001, E1004). Fix inserts the missing closers at end of file.",
  defaultSeverity: "error",
  codes: ["E1001", "E1004"],
  fixable: true,
  check(ctx, report) {
    // The parser already auto-closes at end of file, so inserting the closers there leaves the AST unchanged.
    // Only the first insertion adds the line break that a final line without one needs.
    // If the file ends inside an unterminated comment/fence an appended closer would become part of it: no fix then.
    const swallowed = ctx.diagnostics.some((x) => x.code === "E1003" || x.code === "E1005");
    let first = true;
    for (const d of ctx.diagnostics) {
      if (d.code === "E1004") report({ code: d.code, message: d.message, span: d.span });
      if (d.code !== "E1001") continue;
      const p = { line: ctx.doc.lineStarts.length, col: 1, offset: ctx.source.length };
      const nl = first && !ctx.source.endsWith("\n") ? "\n" : "";
      first = false;
      report({
        code: d.code,
        message: d.message,
        span: d.span,
        ...(swallowed
          ? {}
          : { fix: [{ span: { start: p, end: p }, newText: `${nl}--- END ---\n` }] }),
      });
    }
  },
};

export const orphanCloser = fromDiagnostics(
  "orphan-closer",
  "A `--- END ---` with nothing open (E1002). Fix deletes the line.",
  ["E1002"],
  "error",
  deleteLine,
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

export const brokenLinkOrInclude: Rule = {
  id: "broken-link-or-include",
  category: "structure",
  description:
    "Includes resolve inside the project root (E2301, E2304) and links/buttons have a target (W2601).",
  defaultSeverity: "error",
  codes: ["E2301", "E2304", "W2601"],
  check(ctx, report): void {
    for (const d of ctx.diagnostics)
      if (["E2301", "E2304"].includes(d.code))
        report({ code: d.code, message: d.message, span: d.span });
    walkBlocks(ctx.doc.body, ({ node }) => {
      const runs =
        node.kind === "line" || node.kind === "heading" || node.kind === "item"
          ? [node.inline]
          : node.kind === "table"
            ? [...node.headerInline, ...node.rowsInline.flat()]
            : [];
      for (const run of runs)
        for (const n of run)
          if ((n.kind === "link" && n.target === "") || (n.kind === "button" && n.action === ""))
            report({
              code: "W2601",
              message: "Link or button has an empty target.",
              span: node.span,
            });
    });
  },
};

export const emptyContainer: Rule = {
  id: "empty-container",
  category: "structure",
  description: "Containers should contain something (W1401). `EMPTY` and `TOOLTIP` are exempt.",
  defaultSeverity: "warn",
  codes: ["W1401"],
  check(ctx, report): void {
    walkBlocks(ctx.doc.body, ({ node }) => {
      if (!isContainer(node)) return;
      if (node.kind === "block" && ["empty", "tooltip"].includes(node.name)) return;
      if ("children" in node && node.children.length === 0)
        report({
          code: "W1401",
          message: `Empty ${node.kind === "block" ? node.name.toUpperCase() : node.kind.toUpperCase()} block.`,
          span: node.span,
        });
    });
  },
};

export const structuralRules: Rule[] = [
  balancedBlocks,
  orphanCloser,
  duplicateId,
  unknownDirective,
  emptyContainer,
  brokenLinkOrInclude,
];
