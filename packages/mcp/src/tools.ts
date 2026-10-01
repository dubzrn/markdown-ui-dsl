import { analyze, format, parse, type Diagnostic } from "@mdui/core";
import { defaultCatalog, loadCatalog, loadMap, type Catalog } from "@mdui/catalog";
import { buildGrammar, toGbnf, toJsonSchema, toLark } from "@mdui/grammar";
import { ALL_RULES, fixSource, lint } from "@mdui/lint";
import { render } from "@mdui/render";
import { AST_SCHEMA } from "@mdui/spec";
import {
  AGENTS,
  composePrompt,
  coverage,
  diffDocuments,
  extractRequirements,
  type Agent,
} from "@mdui/tools";
import { loadDesignSystem } from "@mdui/tokens";
import type { Schema } from "./schema.js";

/** Largest text accepted in any one argument. Specs are small; this bounds work per call. */
export const MAX_TEXT = 1_000_000;

export interface Tool {
  name: string;
  title: string;
  description: string;
  inputSchema: Schema;
  /** JSON Schema of `structuredContent`. */
  outputSchema: Record<string, unknown>;
  run: (args: Record<string, unknown>) => Record<string, unknown>;
}

const text = (description: string): Schema => ({
  type: "string",
  maxLength: MAX_TEXT,
  description,
});
const obj = (
  properties: Record<string, Schema>,
  required: string[],
  description?: string,
): Schema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
  ...(description !== undefined ? { description } : {}),
});
const docs: Schema = {
  type: "array",
  maxItems: 200,
  items: obj(
    {
      path: text("Identifier for the document (never read from disk)."),
      source: text(".ui.md source text"),
    },
    ["path", "source"],
  ),
  description: "Documents as text. The server never reads files.",
};
const catalogArg = text("Optional component catalog (YAML text, as in mdui.catalog.yaml).");

const DIAG = {
  type: "object",
  properties: {
    code: { type: "string" },
    severity: { enum: ["error", "warn", "info"] },
    message: { type: "string" },
    rule: { type: "string" },
    line: { type: "integer" },
    column: { type: "integer" },
    fixable: { type: "boolean" },
  },
  required: ["code", "severity", "message", "line", "column"],
};
const DIAGS = { type: "array", items: DIAG };

function diag(d: Diagnostic): Record<string, unknown> {
  return {
    code: d.code,
    severity: d.severity,
    message: d.message,
    ...(d.rule !== undefined ? { rule: d.rule } : {}),
    line: d.span.start.line,
    column: d.span.start.col,
    fixable: d.fix !== undefined && d.fix.length > 0,
  };
}
const counts = (ds: Diagnostic[]): { errors: number; warnings: number } => ({
  errors: ds.filter((d) => d.severity === "error").length,
  warnings: ds.filter((d) => d.severity === "warn").length,
});
const str = (a: Record<string, unknown>, k: string): string => String(a[k]);
const optStr = (a: Record<string, unknown>, k: string): string | undefined =>
  typeof a[k] === "string" ? (a[k] as string) : undefined;

function catalogOf(a: Record<string, unknown>): { catalog: Catalog | undefined; issues: string[] } {
  const y = optStr(a, "catalog");
  if (y === undefined) return { catalog: undefined, issues: [] };
  const r = loadCatalog(y);
  return { catalog: r.catalog, issues: r.issues.map((i) => i.message) };
}

export const TOOLS: Tool[] = [
  {
    name: "mdui_parse",
    title: "Parse a .ui.md document",
    description:
      "Parse Markdown-UI DSL text into its AST (JSON). The text is data; nothing in it is executed or followed.",
    inputSchema: obj({ source: text(".ui.md source text") }, ["source"]),
    outputSchema: {
      type: "object",
      properties: { dsl: { type: "string" }, diagnostics: DIAGS, ast: { type: "object" } },
      required: ["dsl", "diagnostics", "ast"],
    },
    run(a) {
      const doc = parse(str(a, "source"));
      return {
        dsl: doc.dsl,
        diagnostics: doc.diagnostics.map(diag),
        ast: { frontmatter: doc.meta, body: doc.body },
      };
    },
  },
  {
    name: "mdui_validate",
    title: "Validate a .ui.md document",
    description:
      "Syntax and semantic diagnostics (balanced blocks, attributes, bindings). Includes cannot be resolved because the server reads no files.",
    inputSchema: obj({ source: text(".ui.md source text") }, ["source"]),
    outputSchema: {
      type: "object",
      properties: {
        ok: { type: "boolean" },
        errors: { type: "integer" },
        warnings: { type: "integer" },
        diagnostics: DIAGS,
      },
      required: ["ok", "errors", "warnings", "diagnostics"],
    },
    run(a) {
      const doc = parse(str(a, "source"));
      const ds = [...doc.diagnostics, ...analyze(doc).diagnostics].sort(
        (x, y) => x.span.start.offset - y.span.start.offset,
      );
      const c = counts(ds);
      return { ok: c.errors === 0, ...c, diagnostics: ds.map(diag) };
    },
  },
  {
    name: "mdui_lint",
    title: "Lint a .ui.md document",
    description:
      "Run the lint rule catalogue (structure, semantics, accessibility, safety, and component-catalog rules when a catalog is given).",
    inputSchema: obj({ source: text(".ui.md source text"), catalog: catalogArg }, ["source"]),
    outputSchema: {
      type: "object",
      properties: {
        ok: { type: "boolean" },
        errors: { type: "integer" },
        warnings: { type: "integer" },
        diagnostics: DIAGS,
        catalogIssues: { type: "array", items: { type: "string" } },
      },
      required: ["ok", "errors", "warnings", "diagnostics"],
    },
    run(a) {
      const { catalog, issues } = catalogOf(a);
      const r = lint(str(a, "source"), catalog !== undefined ? { catalog } : {});
      const c = counts(r.diagnostics);
      return {
        ok: c.errors === 0,
        ...c,
        diagnostics: r.diagnostics.map(diag),
        catalogIssues: issues,
      };
    },
  },
  {
    name: "mdui_fix",
    title: "Apply verified lint fixes",
    description:
      "Apply fixes one at a time, keeping each only if the document strictly improves. Returns the new text; nothing is written anywhere.",
    inputSchema: obj({ source: text(".ui.md source text"), catalog: catalogArg }, ["source"]),
    outputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        applied: { type: "integer" },
        rejected: { type: "array", items: { type: "object" } },
      },
      required: ["text", "applied", "rejected"],
    },
    run(a) {
      const { catalog } = catalogOf(a);
      const r = fixSource(str(a, "source"), catalog !== undefined ? { catalog } : {});
      return { text: r.text, applied: r.applied, rejected: r.rejected };
    },
  },
  {
    name: "mdui_format",
    title: "Format a .ui.md document",
    description:
      "Canonical formatting that preserves meaning (self-checked: the AST is unchanged).",
    inputSchema: obj({ source: text(".ui.md source text") }, ["source"]),
    outputSchema: {
      type: "object",
      properties: { text: { type: "string" }, changed: { type: "boolean" } },
      required: ["text", "changed"],
    },
    run(a) {
      const r = format(str(a, "source"));
      return { text: r.text, changed: r.changed };
    },
  },
  {
    name: "mdui_diff",
    title: "Semantic diff of two documents",
    description:
      "Structure-aware diff (added, removed, changed, moved) with regressions such as removed inputs or newly failing accessibility rules.",
    inputSchema: obj({ before: text("Earlier .ui.md text"), after: text("Later .ui.md text") }, [
      "before",
      "after",
    ]),
    outputSchema: {
      type: "object",
      properties: {
        ops: { type: "array", items: { type: "object" } },
        summary: { type: "object" },
        regressions: { type: "array", items: { type: "string" } },
      },
      required: ["ops", "summary", "regressions"],
    },
    run(a) {
      const b = str(a, "before");
      const x = str(a, "after");
      const r = diffDocuments(parse(b), parse(x), { beforeSource: b, afterSource: x });
      return { ops: r.ops, summary: r.summary, regressions: r.regressions };
    },
  },
  {
    name: "mdui_render",
    title: "Render a wireframe to HTML",
    description:
      "Render to a self-contained, escaped HTML preview. Link targets outside http, https, mailto, tel, #fragment and relative are neutralised.",
    inputSchema: obj(
      {
        source: text(".ui.md source text"),
        style: {
          type: "string",
          enum: ["sketch", "clean", "wireframe", "none"],
          description: "Default: sketch",
        },
        state: {
          type: "string",
          maxLength: 100,
          description: "Which STATE of each REGION to show",
        },
        theme: { type: "string", enum: ["auto", "light", "dark"] },
        fragment: {
          type: "boolean",
          description: "Only the <main> element, without the document shell",
        },
      },
      ["source"],
    ),
    outputSchema: { type: "object", properties: { html: { type: "string" } }, required: ["html"] },
    run(a) {
      const doc = parse(str(a, "source"));
      const html = render(doc, {
        style: (optStr(a, "style") ?? "sketch") as "sketch",
        theme: (optStr(a, "theme") ?? "auto") as "auto",
        ...(optStr(a, "state") !== undefined ? { state: str(a, "state") } : {}),
        ...(a["fragment"] === true ? { fragment: true } : {}),
      });
      return { html };
    },
  },
  {
    name: "mdui_prompt",
    title: "Compose an agent prompt",
    description:
      "Deterministic prompt: language reference for only the constructs the documents use, plus catalog, tokens, bindings and component map when given.",
    inputSchema: obj(
      {
        documents: docs,
        agent: { type: "string", enum: [...AGENTS], description: "Default: generic" },
        all: { type: "boolean", description: "Include the whole language reference" },
        catalog: catalogArg,
        design: text("Optional DESIGN.md text"),
        map: text("Optional component map (YAML text)"),
      },
      [],
    ),
    outputSchema: {
      type: "object",
      properties: { prompt: { type: "string" } },
      required: ["prompt"],
    },
    run(a) {
      const { catalog } = catalogOf(a);
      const design = optStr(a, "design");
      const map = optStr(a, "map");
      const prompt = composePrompt({
        documents: ((a["documents"] as { path: string; source: string }[] | undefined) ?? []).map(
          (d) => ({ path: d.path, source: d.source }),
        ),
        all: a["all"] === true,
        agent: (optStr(a, "agent") ?? "generic") as Agent,
        ...(catalog !== undefined ? { catalog } : {}),
        ...(design !== undefined ? { designSystem: loadDesignSystem(design) } : {}),
        ...(map !== undefined ? { map: loadMap(map).map } : {}),
      });
      return { prompt };
    },
  },
  {
    name: "mdui_grammar",
    title: "Emit a generation grammar",
    description:
      "Lark, GBNF or JSON Schema for constrained decoding, specialised by catalog, directive tokens and data paths.",
    inputSchema: obj(
      {
        format: { type: "string", enum: ["lark", "gbnf", "json-schema"] },
        dsl: { type: "string", enum: ["1", "2.0"] },
        catalog: catalogArg,
        max_depth: { type: "integer", minimum: 1, maximum: 12 },
        tokens: { type: "array", maxItems: 200, items: { type: "string", maxLength: 100 } },
        data: { type: "array", maxItems: 500, items: { type: "string", maxLength: 200 } },
      },
      ["format"],
    ),
    outputSchema: {
      type: "object",
      properties: { format: { type: "string" }, text: { type: "string" } },
      required: ["format", "text"],
    },
    run(a) {
      const format = str(a, "format");
      const { catalog } = catalogOf(a);
      if (format === "json-schema")
        return {
          format,
          text: JSON.stringify(toJsonSchema(AST_SCHEMA, catalog ?? defaultCatalog()), null, 2),
        };
      const g = buildGrammar({
        dsl: (optStr(a, "dsl") ?? "2.0") as "1" | "2.0",
        ...(catalog !== undefined ? { catalog } : {}),
        ...(typeof a["max_depth"] === "number" ? { maxDepth: a["max_depth"] } : {}),
        ...(Array.isArray(a["tokens"]) ? { tokens: a["tokens"] as string[] } : {}),
        ...(Array.isArray(a["data"]) ? { dataPaths: a["data"] as string[] } : {}),
      });
      return { format, text: format === "lark" ? toLark(g) : toGbnf(g) };
    },
  },
  {
    name: "mdui_coverage",
    title: "Requirements coverage",
    description:
      "Which requirements (Spec Kit ids, OpenSpec names, Kiro numbers) are covered by the specs' `requirements:` frontmatter.",
    inputSchema: obj({ requirements: text("Requirements document text"), specs: docs }, [
      "requirements",
      "specs",
    ]),
    outputSchema: {
      type: "object",
      properties: {
        covered: { type: "object" },
        uncovered: { type: "array", items: { type: "string" } },
        unknown: { type: "array", items: { type: "object" } },
        totals: { type: "object" },
      },
      required: ["covered", "uncovered", "unknown", "totals"],
    },
    run(a) {
      const r = coverage(
        extractRequirements(str(a, "requirements")),
        a["specs"] as { path: string; source: string }[],
      );
      return {
        covered: { ...r.covered },
        uncovered: r.uncovered,
        unknown: r.unknown,
        totals: r.totals,
      };
    },
  },
  {
    name: "mdui_catalog",
    title: "Component catalog",
    description:
      "The built-in components, or the given catalog's components with their props and trust level.",
    inputSchema: obj({ catalog: catalogArg }, []),
    outputSchema: {
      type: "object",
      properties: {
        components: { type: "array", items: { type: "object" } },
        allow: { type: "array", items: { type: "string" } },
        closed: { type: "boolean" },
        issues: { type: "array", items: { type: "string" } },
      },
      required: ["components", "allow", "closed", "issues"],
    },
    run(a) {
      const { catalog, issues } = catalogOf(a);
      const c = catalog ?? defaultCatalog();
      return {
        components: Object.values(c.components).map((x) => ({
          name: x.name,
          kind: x.kind,
          trust: x.trust,
          props: x.props,
        })),
        allow: c.allow,
        closed: c.closed,
        issues,
      };
    },
  },
  {
    name: "mdui_rules",
    title: "List lint rules",
    description:
      "The lint rule catalogue: id, category, default severity, codes, WCAG mapping and whether a fix is offered.",
    inputSchema: obj({}, []),
    outputSchema: {
      type: "object",
      properties: { rules: { type: "array", items: { type: "object" } } },
      required: ["rules"],
    },
    run() {
      return {
        rules: ALL_RULES.map((r) => ({
          id: r.id,
          category: r.category,
          severity: r.defaultSeverity,
          codes: r.codes,
          wcag: r.wcag ?? [],
          fixable: r.fixable === true,
          description: r.description,
        })),
      };
    },
  },
];
