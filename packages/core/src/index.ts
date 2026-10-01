import { SUPPORTED_DSL_VERSIONS } from "@mdui/spec";

export { parse } from "./parse.js";
export { outline } from "./outline.js";
export { CODES, makeDiagnostic } from "./diagnostics.js";
export type { Diagnostic, DiagnosticCode, Pos, Severity, Span, TextEdit } from "./diagnostics.js";
export type * from "./ast.js";

export const supportedVersions: readonly string[] = SUPPORTED_DSL_VERSIONS;
