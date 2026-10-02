import {
  nearest,
  validateUse,
  levenshtein,
  type Catalog,
  type UseIssue,
} from "@vrillabs/mdui-catalog";
import { BLOCK_KINDS, walkBlocks, type InlineNode, type Span } from "@vrillabs/mdui-core";
import type { Finding, Rule, RuleContext } from "../rule.js";
import { eachInline } from "../util.js";

interface Use {
  name: string;
  /** Raw arguments text, parsed lazily by validateUse. */
  args: string;
  attrs?: Parameters<typeof validateUse>[3];
  span: Span;
  /** Built-in kinds are checked against restricted catalogs only. */
  builtin: boolean;
}

const INLINE_BUILTIN: Partial<Record<InlineNode["kind"], string>> = {
  button: "BUTTON",
  link: "LINK",
  input: "INPUT",
  image: "IMAGE",
  badge: "BADGE",
  checkbox: "CHECKBOX",
  radio: "RADIO",
  toggle: "TOGGLE",
  dropdown: "DROPDOWN",
};
const CONTAINER_NAME: Record<string, string> = {
  column: "COLUMN",
  row: "ROW",
  card: "CARD",
  modal: "MODAL",
  header: "HEADER",
  footer: "FOOTER",
  "bubble-user": "BUBBLE",
  "bubble-agent": "BUBBLE",
};

/** Every component usage in the document: custom components always, built-ins for restricted catalogs. */
function uses(ctx: RuleContext, restricted: boolean): Use[] {
  const out: Use[] = [];
  eachInline(ctx.doc, (n, _o, span) => {
    if (n.kind === "component")
      out.push({
        name: n.name,
        args: n.raw,
        ...(n.attrs !== undefined ? { attrs: n.attrs } : {}),
        span,
        builtin: false,
      });
    else if (restricted && n.kind === "widget")
      out.push({
        name: n.widget,
        args: n.raw,
        ...(n.attrs !== undefined ? { attrs: n.attrs } : {}),
        span,
        builtin: true,
      });
    else if (restricted && INLINE_BUILTIN[n.kind] !== undefined)
      out.push({ name: INLINE_BUILTIN[n.kind] as string, args: "", span, builtin: true });
  });
  walkBlocks(ctx.doc.body, ({ node }) => {
    if (node.kind === "block") {
      const upper = node.name.toUpperCase();
      const known = (BLOCK_KINDS as readonly string[]).includes(upper);
      if (!known || restricted)
        out.push({
          name: upper,
          args: node.args,
          ...(node.attrs !== undefined ? { attrs: node.attrs } : {}),
          span: node.span,
          builtin: known,
        });
    } else if (restricted && CONTAINER_NAME[node.kind] !== undefined)
      out.push({
        name: CONTAINER_NAME[node.kind] as string,
        args: "",
        span: node.span,
        builtin: true,
      });
  });
  return out;
}

function nameFix(ctx: RuleContext, catalog: Catalog, u: Use): Finding["fix"] {
  const hint = nearest(catalog, u.name);
  if (hint === undefined || levenshtein(u.name, hint) > 2) return undefined;
  const lineStart = ctx.doc.lineStarts[u.span.start.line - 1];
  if (lineStart === undefined) return undefined;
  const lineEnd = ctx.doc.lineStarts[u.span.start.line] ?? ctx.source.length;
  const line = ctx.source.slice(lineStart, lineEnd);
  const at = line.search(new RegExp(`(\\[ ?|::: )${u.name}\\b`, "i"));
  if (at === -1) return undefined;
  const start =
    lineStart + at + (line.slice(at).startsWith("[ ") ? 2 : line.slice(at).startsWith("[") ? 1 : 4);
  const p = (o: number) => ({ line: u.span.start.line, col: o - lineStart + 1, offset: o });
  return [{ span: { start: p(start), end: p(start + u.name.length) }, newText: hint }];
}

function catalogRule(
  id: string,
  description: string,
  codes: string[],
  severity: Rule["defaultSeverity"],
  pick: (i: UseIssue) => boolean,
  withFix = false,
): Rule {
  return {
    id,
    category: "catalog",
    description,
    defaultSeverity: severity,
    codes,
    fixable: withFix,
    check(ctx, report) {
      const catalog = ctx.catalog;
      if (catalog === undefined) return;
      for (const u of uses(ctx, catalog.closed)) {
        for (const issue of validateUse(catalog, u.name, u.args, u.attrs)) {
          if (!pick(issue)) continue;
          const fix = withFix && issue.code === "E6001" ? nameFix(ctx, catalog, u) : undefined;
          report({
            code: issue.code,
            message: issue.message,
            span: u.span,
            ...(fix !== undefined ? { fix } : {}),
          });
        }
      }
    },
  };
}

export const unknownComponent = catalogRule(
  "unknown-component",
  "Components used are defined in the catalog; the message (and fix) offers the nearest catalog name (E6001). Needs a catalog.",
  ["E6001"],
  "error",
  (i) => i.code === "E6001",
  true,
);
export const componentProps = catalogRule(
  "component-props",
  "A component's arguments satisfy its catalog prop schema: required, types, enums, unknown props (E6002). Needs a catalog.",
  ["E6002"],
  "error",
  (i) => i.code === "E6002",
);
export const thirdPartyComponent = catalogRule(
  "third-party-component",
  "Third-party components must be listed in the catalog's `allow` (W6003). Needs a catalog.",
  ["W6003"],
  "warn",
  (i) => i.code === "W6003",
);

export const catalogRules: Rule[] = [unknownComponent, componentProps, thirdPartyComponent];
