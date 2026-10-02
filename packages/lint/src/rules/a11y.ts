import { walkBlocks, type InlineNode } from "@mdui/core";
import type { Rule } from "../rule.js";
import { eachInline, textOf } from "../util.js";

/** WCAG criteria listed here are the ones confirmed by axe-core's rule tags in `reference/verification/axe-core`
 * (canonical W3C text was unreachable during development — see docs/LINT_RULES.md). Empty ⇒ best practice. */

const GENERIC_ALT = new Set([
  "image",
  "img",
  "picture",
  "photo",
  "placeholder",
  "icon",
  "graphic",
  "untitled",
]);
const GENERIC_LINK = new Set([
  "click here",
  "here",
  "more",
  "read more",
  "link",
  "this",
  "learn more",
  "click",
  "details",
]);
const INTERACTIVE = new Set<InlineNode["kind"]>(["button", "link"]);
const LIVE_OK_BLOCKS = new Set(["toast", "callout", "region", "state"]);

export const inputLabel: Rule = {
  id: "input-label",
  category: "accessibility",
  description:
    "Text inputs, sliders and date pickers have an accessible name: a label attribute or, for text inputs, a placeholder (W3101).",
  defaultSeverity: "warn",
  codes: ["W3101"],
  wcag: ["4.1.2"],
  check(ctx, report) {
    eachInline(ctx.doc, (n, _o, span) => {
      const label = "attrs" in n ? n.attrs?.props["label"] : undefined;
      const hasLabel = typeof label === "string" && label.trim() !== "";
      if (n.kind === "input" && n.placeholder.trim() === "" && !hasLabel)
        report({
          code: "W3101",
          message: "Text input has neither a placeholder nor a `label`.",
          span,
        });
      if (n.kind === "widget" && (n.widget === "slider" || n.widget === "date") && !hasLabel)
        report({
          code: "W3101",
          message: `${n.widget.toUpperCase()} needs a \`label\` attribute (it has no visible text).`,
          span,
        });
    });
  },
};

export const imgAlt: Rule = {
  id: "img-alt",
  category: "accessibility",
  description:
    'Image placeholders describe the image: not empty and not just "image" or "placeholder" (W3102).',
  defaultSeverity: "warn",
  codes: ["W3102"],
  wcag: ["1.1.1"],
  check(ctx, report) {
    eachInline(ctx.doc, (n, _o, span) => {
      if (n.kind !== "image") return;
      const alt = n.attrs?.props["alt"];
      const text = (typeof alt === "string" ? alt : n.description).trim().toLowerCase();
      if (text === "" || GENERIC_ALT.has(text))
        report({
          code: "W3102",
          message: `Image text "${text}" does not describe the image.`,
          span,
        });
    });
  },
};

export const headingOrder: Rule = {
  id: "heading-order",
  category: "accessibility",
  description:
    "Heading levels do not skip downwards (h1 → h3). Best practice, not a WCAG criterion (W3103).",
  defaultSeverity: "warn",
  codes: ["W3103"],
  wcag: [],
  check(ctx, report) {
    let prev = 0;
    walkBlocks(ctx.doc.body, ({ node }) => {
      if (node.kind !== "heading") return;
      if (prev > 0 && node.level > prev + 1)
        report({
          code: "W3103",
          message: `Heading level jumps from h${prev} to h${node.level}.`,
          span: node.span,
        });
      prev = node.level;
    });
  },
};

export const singleH1: Rule = {
  id: "single-h1",
  category: "accessibility",
  description:
    "A screen has at most one level-1 heading (components embedded in a page may have none). Best practice (W3104).",
  defaultSeverity: "warn",
  codes: ["W3104"],
  wcag: [],
  check(ctx, report) {
    const t = ctx.doc.meta["type"];
    if (t === "partial" || t === "flow") return;
    const headings: { level: number; span: (typeof ctx.doc.body)[number]["span"] }[] = [];
    walkBlocks(ctx.doc.body, ({ node }) => {
      if (node.kind === "heading") headings.push({ level: node.level, span: node.span });
    });
    const h1 = headings.filter((h) => h.level === 1);
    if (h1.length > 1)
      report({
        code: "W3104",
        message: "More than one level-1 heading.",
        span: (h1[1] as (typeof headings)[number]).span,
      });
  },
};

export const buttonText: Rule = {
  id: "button-text",
  category: "accessibility",
  description: "Buttons have readable text, not only symbols (W3105).",
  defaultSeverity: "warn",
  codes: ["W3105"],
  wcag: ["4.1.2"],
  check(ctx, report) {
    eachInline(ctx.doc, (n, _o, span) => {
      if (n.kind === "button" && !/[\p{L}\p{N}]/u.test(n.label))
        report({ code: "W3105", message: `Button "${n.label}" has no readable text.`, span });
    });
  },
};

export const linkText: Rule = {
  id: "link-text",
  category: "accessibility",
  description: 'Link text states the destination: not empty and not "click here" / "more" (W3106).',
  defaultSeverity: "warn",
  codes: ["W3106"],
  wcag: ["2.4.4", "4.1.2"],
  check(ctx, report) {
    eachInline(ctx.doc, (n, _o, span) => {
      if (n.kind !== "link") return;
      const t = n.label.trim().toLowerCase();
      if (t === "" || GENERIC_LINK.has(t))
        report({ code: "W3106", message: `Link text "${n.label}" is not descriptive.`, span });
    });
  },
};

export const duplicateLandmark: Rule = {
  id: "duplicate-landmark",
  category: "accessibility",
  description:
    "A second HEADER/FOOTER needs a distinguishing `label` (maps to banner / contentinfo landmarks). Best practice (W3107).",
  defaultSeverity: "warn",
  codes: ["W3107"],
  wcag: [],
  check(ctx, report) {
    const seen = { header: 0, footer: 0 };
    walkBlocks(ctx.doc.body, ({ node }) => {
      if (node.kind !== "header" && node.kind !== "footer") return;
      seen[node.kind]++;
      const labelled = typeof node.attrs?.props["label"] === "string";
      if (seen[node.kind] > 1 && !labelled)
        report({
          code: "W3107",
          message: `Repeated ${node.kind.toUpperCase()} landmark without a \`label\`.`,
          span: node.span,
        });
    });
  },
};

export const targetSizeAnnotation: Rule = {
  id: "target-size-annotation",
  category: "accessibility",
  description:
    "Interactive controls placed side by side with no separating text need 24×24 CSS px targets or spacing (WCAG 2.2 SC 2.5.8) (I3108).",
  defaultSeverity: "info",
  codes: ["I3108"],
  wcag: ["2.5.8"],
  check(ctx, report) {
    walkBlocks(ctx.doc.body, ({ node }) => {
      const runs: InlineNode[][] =
        node.kind === "line" || node.kind === "heading" || node.kind === "item"
          ? [node.inline]
          : node.kind === "table"
            ? node.rowsInline.flat()
            : [];
      for (const run of runs)
        for (let i = 1; i < run.length; i++)
          if (
            INTERACTIVE.has((run[i - 1] as InlineNode).kind) &&
            INTERACTIVE.has((run[i] as InlineNode).kind)
          ) {
            report({
              code: "I3108",
              message: "Adjacent interactive targets without spacing text.",
              span: node.span,
            });
            break;
          }
    });
  },
};

export const liveRegionMisuse: Rule = {
  id: "live-region-misuse",
  category: "accessibility",
  description:
    "`live` belongs on status containers (TOAST, CALLOUT, REGION, STATE), not on controls; `assertive` only for alerts (W3109). Best practice; relates to WCAG 4.1.3 Status Messages.",
  defaultSeverity: "warn",
  codes: ["W3109"],
  wcag: [],
  check(ctx, report) {
    eachInline(ctx.doc, (n, _o, span) => {
      if ("attrs" in n && n.attrs?.props["live"] !== undefined)
        report({
          code: "W3109",
          message: `\`live\` on a ${n.kind} control has no useful effect.`,
          span,
        });
    });
    walkBlocks(ctx.doc.body, ({ node }) => {
      if (!("attrs" in node) || node.attrs === undefined) return;
      const live = node.attrs.props["live"];
      if (live === undefined) return;
      const name = node.kind === "block" ? node.name : node.kind;
      if (!LIVE_OK_BLOCKS.has(name))
        report({
          code: "W3109",
          message: `\`live\` on a ${name.toUpperCase()} block: use a status container.`,
          span: node.span,
        });
      else if (
        live === "assertive" &&
        node.attrs.props["role"] !== "alert" &&
        !(node.kind === "block" && node.args.includes("kind=error"))
      )
        report({
          code: "W3109",
          message: "`assertive` is reserved for alerts (role=alert or toast kind=error).",
          span: node.span,
        });
    });
  },
};

export const emptyHeading: Rule = {
  id: "empty-heading",
  category: "accessibility",
  description: "Headings have text (W3110). Best practice.",
  defaultSeverity: "warn",
  codes: ["W3110"],
  wcag: [],
  check(ctx, report) {
    walkBlocks(ctx.doc.body, ({ node }) => {
      if (node.kind === "heading" && textOf(node.inline).trim() === "")
        report({ code: "W3110", message: "Empty heading.", span: node.span });
    });
  },
};

export const tableHeader: Rule = {
  id: "table-header",
  category: "accessibility",
  description: "Every table header cell has text so data cells have a header (W3111).",
  defaultSeverity: "warn",
  codes: ["W3111"],
  wcag: ["1.3.1"],
  check(ctx, report) {
    walkBlocks(ctx.doc.body, ({ node }) => {
      if (node.kind === "table" && node.header.some((h) => h.trim() === ""))
        report({ code: "W3111", message: "Table has an empty header cell.", span: node.span });
    });
  },
};

export const tabLabels: Rule = {
  id: "tab-labels",
  category: "accessibility",
  description:
    "Tabs have non-empty, distinct labels and exactly one active tab (W3112). Best practice.",
  defaultSeverity: "warn",
  codes: ["W3112"],
  wcag: [],
  check(ctx, report) {
    walkBlocks(ctx.doc.body, ({ node }) => {
      if (node.kind !== "tabs") return;
      const labels = node.tabs.map((t) => t.label.trim().toLowerCase());
      const active = node.tabs.filter((t) => t.active).length;
      if (labels.some((l) => l === ""))
        report({ code: "W3112", message: "Tab with an empty label.", span: node.span });
      else if (new Set(labels).size !== labels.length)
        report({ code: "W3112", message: "Duplicate tab labels.", span: node.span });
      else if (active !== 1)
        report({
          code: "W3112",
          message: `Tabs must have exactly one active tab (found ${active}).`,
          span: node.span,
        });
    });
  },
};

export const modalLabel: Rule = {
  id: "modal-label",
  category: "accessibility",
  description:
    "A MODAL (role=dialog) has an accessible name: a heading inside it or a `label` attribute (W3113). Best practice.",
  defaultSeverity: "warn",
  codes: ["W3113"],
  wcag: [],
  check(ctx, report) {
    walkBlocks(ctx.doc.body, ({ node }) => {
      if (node.kind !== "modal") return;
      if (typeof node.attrs?.props["label"] === "string") return;
      let heading = false;
      walkBlocks(node.children, ({ node: c }) => {
        if (c.kind === "heading") heading = true;
      });
      if (!heading)
        report({
          code: "W3113",
          message: "MODAL has no heading or `label` to name the dialog.",
          span: node.span,
        });
    });
  },
};

export const documentLanguage: Rule = {
  id: "document-language",
  category: "accessibility",
  description: "A 2.0 screen declares its natural language with `lang:` (I3114).",
  defaultSeverity: "info",
  codes: ["I3114"],
  wcag: ["3.1.1"],
  check(ctx, report) {
    if (
      ctx.doc.dsl !== "2.0" ||
      ctx.doc.meta["type"] === "partial" ||
      typeof ctx.doc.meta["lang"] === "string"
    )
      return;
    const p = { line: 1, col: 1, offset: 0 };
    report({ code: "I3114", message: "No `lang:` in frontmatter.", span: { start: p, end: p } });
  },
};

export const a11yRules: Rule[] = [
  inputLabel,
  imgAlt,
  headingOrder,
  singleH1,
  buttonText,
  linkText,
  duplicateLandmark,
  targetSizeAnnotation,
  liveRegionMisuse,
  emptyHeading,
  tableHeader,
  tabLabels,
  modalLabel,
  documentLanguage,
];
