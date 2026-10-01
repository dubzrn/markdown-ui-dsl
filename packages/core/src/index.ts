import { SUPPORTED_DSL_VERSIONS } from "@mdui/spec";

export { parse, BLOCK_KINDS } from "./parse.js";
export { parseInline, printInline, unescape, ESCAPABLE } from "./inline.js";
export type { InlineNode, InlineIssue, InlineOptions } from "./inline.js";
export { parseAttrs, printAttrs, splitAttrs, RESERVED_KEYS } from "./attrs.js";
export type { Attrs } from "./attrs.js";
export { WIDGET_KINDS, parseArgs, validateWidget, splitMenu } from "./widgets.js";
export type { WidgetKind, WidgetArgs } from "./widgets.js";
export { outline } from "./outline.js";
export { CODES, makeDiagnostic } from "./diagnostics.js";
export type { Diagnostic, DiagnosticCode, Pos, Severity, Span, TextEdit } from "./diagnostics.js";
export type * from "./ast.js";

export const supportedVersions: readonly string[] = SUPPORTED_DSL_VERSIONS;
export { parseFrontmatter, dslVersion, KNOWN_KEYS } from "./frontmatter.js";
export type {
  FrontmatterData,
  FrontmatterIssue,
  FrontmatterResult,
  YamlValue,
} from "./frontmatter.js";
