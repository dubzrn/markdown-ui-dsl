/** Diagnostic model and code registry (T-014, SPEC §2.4). Ranges: 1xxx syntax · 2xxx semantic · 3xxx a11y · 4xxx tokens · 5xxx constraints/flows · 6xxx catalog · 7xxx safety. */

export interface Pos {
  /** 1-based line. */
  line: number;
  /** 1-based column (UTF-16 code units). */
  col: number;
  /** 0-based offset into the source string. */
  offset: number;
}
export interface Span {
  start: Pos;
  end: Pos;
}
export interface TextEdit {
  span: Span;
  newText: string;
}
export type Severity = "error" | "warn" | "info";

export interface Diagnostic {
  code: string;
  severity: Severity;
  message: string;
  span: Span;
  fix?: TextEdit[];
}

interface CodeInfo {
  severity: Severity;
  summary: string;
}

/** Stable code registry. The letter prefix encodes severity (E/W/I). */
export const CODES = {
  E1001: {
    severity: "error",
    summary: "Container opened here is never closed (--- END --- missing).",
  },
  E1002: { severity: "error", summary: "--- END --- with no open container." },
  E1003: { severity: "error", summary: "HTML comment is not terminated (-->)." },
  E1004: {
    severity: "error",
    summary: "Typed closer does not match the innermost open block (DSL 2.0).",
  },
  E1005: { severity: "error", summary: "Code fence is not terminated." },
  E1006: { severity: "error", summary: "Frontmatter is not terminated (closing --- missing)." },
  E1102: {
    severity: "error",
    summary: "Unsupported YAML syntax in frontmatter (outside the strict subset).",
  },
  E1103: { severity: "error", summary: "Duplicate key in frontmatter." },
  E1104: { severity: "error", summary: "Unsupported or malformed `dsl:` version in frontmatter." },
  E1301: { severity: "error", summary: "Invalid attribute or primitive argument." },
  E1302: { severity: "error", summary: "Unknown primitive or container kind (DSL 2.0)." },
  W1301: { severity: "warn", summary: "Unknown attribute key." },
  E1303: {
    severity: "error",
    summary:
      "Construct used in the wrong place or with invalid arguments (e.g. STATE outside REGION).",
  },
  E2001: { severity: "error", summary: "Duplicate #id in the document." },
  E2101: { severity: "error", summary: "Binding path is not present in the declared data." },
  E2102: {
    severity: "error",
    summary: "Bindings take a data path only (no calls, operators or arithmetic).",
  },
  E2301: { severity: "error", summary: "Include path escapes the project root." },
  E2302: { severity: "error", summary: "Include cycle." },
  E2303: { severity: "error", summary: "Include nesting is deeper than 8." },
  E2304: { severity: "error", summary: "Include target is missing or is not `type: partial`." },
  E2401: {
    severity: "error",
    summary: "Flow transition names an action the source screen does not define.",
  },
  E2402: { severity: "error", summary: "Flow references an unknown screen id." },
  E2501: { severity: "error", summary: "Button target is not in the declared action registry." },
  W3201: { severity: "warn", summary: "REGION with states has no `default` state." },
  W1201: {
    severity: "warn",
    summary: "Unknown breakpoint in a responsive directive; treated as a plain hint.",
  },
  W1204: { severity: "warn", summary: "Unknown frontmatter key." },
  W1202: {
    severity: "warn",
    summary: "Table row has a different number of cells than the header.",
  },
  W1203: {
    severity: "warn",
    summary:
      "Malformed responsive directive (expected `@bp token: value, …`); treated as a plain hint.",
  },
} as const satisfies Record<string, CodeInfo>;

export type DiagnosticCode = keyof typeof CODES;

export function makeDiagnostic(
  code: DiagnosticCode,
  span: Span,
  message: string = CODES[code].summary,
): Diagnostic {
  return { code, severity: CODES[code].severity, message, span };
}
