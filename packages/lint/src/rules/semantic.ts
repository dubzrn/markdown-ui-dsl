import { walkBlocks, type Diagnostic } from "@mdui/core";
import type { Finding, Rule, RuleContext } from "../rule.js";
import { isContainer } from "../util.js";

function fromCodes(
  id: string,
  category: Rule["category"],
  description: string,
  codes: string[],
  severity: Rule["defaultSeverity"] = "error",
): Rule {
  return {
    id,
    category,
    description,
    defaultSeverity: severity,
    codes,
    check(ctx: RuleContext, report: (f: Finding) => void): void {
      for (const d of ctx.diagnostics as Diagnostic[])
        if (codes.includes(d.code)) report({ code: d.code, message: d.message, span: d.span });
    },
  };
}

export const unresolvedBinding = fromCodes(
  "unresolved-binding",
  "semantics",
  "`{{ path }}` resolves against the declared data and contains no expression (E2101, E2102).",
  ["E2101", "E2102"],
);
export const invalidAttribute = fromCodes(
  "invalid-attribute",
  "semantics",
  "Attribute keys are known and values valid for reserved keys (E1301, W1301).",
  ["E1301", "W1301"],
  "warn",
);
export const missingDefaultState = fromCodes(
  "missing-default-state",
  "semantics",
  "A REGION with states declares a `default` state (W3201).",
  ["W3201"],
  "warn",
);
export const unknownAction = fromCodes(
  "unknown-action",
  "semantics",
  "Button targets exist in the action registry, which is well-formed (E2501, E2502).",
  ["E2501", "E2502"],
);
export const flowReferences = fromCodes(
  "flow-references",
  "flow",
  "Flow screens, start, actions and the Screens/Transitions tables are consistent (E2401, E2402, E2403).",
  ["E2401", "E2402", "E2403"],
);
export const includeCycle = fromCodes(
  "include-cycle",
  "semantics",
  "Includes do not form cycles or nest deeper than 8 (E2302, E2303).",
  ["E2302", "E2303"],
);
export const invalidConstruct = fromCodes(
  "invalid-construct",
  "semantics",
  "Known 2.0 primitives/containers used in the right place with valid arguments (E1302, E1303).",
  ["E1302", "E1303"],
);
export const frontmatterValid = fromCodes(
  "frontmatter-valid",
  "structure",
  "Frontmatter is within the supported YAML subset with known keys (E1102, E1103, E1104, W1204).",
  ["E1102", "E1103", "E1104", "W1204"],
  "warn",
);
export const unterminatedBlock = fromCodes(
  "unterminated-block",
  "structure",
  "Comments, code fences and frontmatter are closed (E1003, E1005, E1006).",
  ["E1003", "E1005", "E1006"],
);
export const tableShape = fromCodes(
  "table-shape",
  "structure",
  "Every table row has as many cells as the header (W1202).",
  ["W1202"],
  "warn",
);
export const dataFile = fromCodes(
  "data-file",
  "semantics",
  "A declared `data:` file exists and is valid JSON (E2305).",
  ["E2305"],
);

export const nestingDepth: Rule = {
  id: "nesting-depth",
  category: "structure",
  description: "Containers nested deeper than 8 levels are hard to read and to render (W2701).",
  defaultSeverity: "warn",
  codes: ["W2701"],
  check(ctx, report) {
    walkBlocks(ctx.doc.body, ({ node, parents }) => {
      if (!isContainer(node)) return;
      const depth = parents.filter(isContainer).length + 1;
      if (depth === 9)
        report({ code: "W2701", message: "Nesting is deeper than 8 levels.", span: node.span });
    });
  },
};

export const destructiveWithoutConfirm: Rule = {
  id: "destructive-without-confirm",
  category: "semantics",
  description:
    "A button for an action marked `destructive: true` must have `confirm` in the registry (W5201).",
  defaultSeverity: "warn",
  codes: ["W5201"],
  check(ctx, report) {
    const reg = ctx.analysis.actions;
    if (Object.keys(reg).length === 0) return;
    walkBlocks(ctx.doc.body, ({ node }) => {
      const runs =
        node.kind === "line" || node.kind === "heading" || node.kind === "item"
          ? [node.inline]
          : node.kind === "table"
            ? [...node.headerInline, ...node.rowsInline.flat()]
            : [];
      for (const run of runs)
        for (const n of run) {
          if (n.kind !== "button" || !n.action?.startsWith("#")) continue;
          const def = reg[n.action.slice(1)];
          if (def?.destructive === true && (def.confirm === undefined || def.confirm === false))
            report({
              code: "W5201",
              message: `Action "${n.action.slice(1)}" is destructive but has no confirm.`,
              span: node.span,
            });
        }
    });
  },
};

export const flowUnreachableScreen: Rule = {
  id: "flow-unreachable-screen",
  category: "flow",
  description: "Every flow screen is reachable from `start` (W5101).",
  defaultSeverity: "warn",
  codes: ["W5101"],
  check(ctx, report) {
    const a = ctx.analysis.flowAnalysis;
    const flow = ctx.analysis.flow;
    if (a === undefined || flow === undefined) return;
    for (const id of a.unreachable) {
      const s = flow.screens.find((x) => x.id === id);
      if (s === undefined) continue;
      const p = { line: s.line, col: 1, offset: ctx.doc.lineStarts[s.line - 1] ?? 0 };
      report({
        code: "W5101",
        message: `Screen "${id}" is unreachable from start.`,
        span: { start: p, end: p },
      });
    }
  },
};

export const flowDeadEnd: Rule = {
  id: "flow-dead-end",
  category: "flow",
  description: "Non-terminal flow screens have at least one outgoing transition (W5102).",
  defaultSeverity: "warn",
  codes: ["W5102"],
  check(ctx, report) {
    const a = ctx.analysis.flowAnalysis;
    const flow = ctx.analysis.flow;
    if (a === undefined || flow === undefined) return;
    for (const id of a.deadEnds) {
      const s = flow.screens.find((x) => x.id === id);
      if (s === undefined) continue;
      const p = { line: s.line, col: 1, offset: ctx.doc.lineStarts[s.line - 1] ?? 0 };
      report({
        code: "W5102",
        message: `Screen "${id}" is a dead end: mark it terminal or add a transition.`,
        span: { start: p, end: p },
      });
    }
  },
};

export const semanticRules: Rule[] = [
  unresolvedBinding,
  invalidAttribute,
  missingDefaultState,
  unknownAction,
  flowReferences,
  includeCycle,
  invalidConstruct,
  frontmatterValid,
  unterminatedBlock,
  tableShape,
  dataFile,
  nestingDepth,
  destructiveWithoutConfirm,
  flowUnreachableScreen,
  flowDeadEnd,
];
