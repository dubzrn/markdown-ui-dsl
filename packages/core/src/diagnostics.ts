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
  /** Lint rule that produced this finding (set by @vrillabs/mdui-lint). */
  rule?: string;
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
  E2305: { severity: "error", summary: "Declared data file is missing or is not valid JSON." },
  E2403: {
    severity: "error",
    summary: "Malformed flow document (Screens table or Transitions list).",
  },
  E2502: { severity: "error", summary: "Invalid action registry entry." },
  E2306: { severity: "error", summary: "An included file has errors." },
  E2401: {
    severity: "error",
    summary: "Flow transition names an action the source screen does not define.",
  },
  E2402: { severity: "error", summary: "Flow references an unknown screen id." },
  E2501: { severity: "error", summary: "Button target is not in the declared action registry." },
  W3201: { severity: "warn", summary: "REGION with states has no `default` state." },
  W1401: { severity: "warn", summary: "Container has no content." },
  W2601: { severity: "warn", summary: "Link or button has an empty target." },
  I1501: { severity: "info", summary: "A `mdui-disable` comment suppressed nothing." },
  W2701: { severity: "warn", summary: "Containers are nested deeper than 8 levels." },
  W3101: {
    severity: "warn",
    summary: "Form control has no accessible name (label or placeholder).",
  },
  W3102: { severity: "warn", summary: "Image placeholder has no useful text alternative." },
  W3103: { severity: "warn", summary: "Heading level skips (e.g. h1 → h3)." },
  W3104: { severity: "warn", summary: "Document should have exactly one level-1 heading." },
  W3105: { severity: "warn", summary: "Button text is empty or has no readable characters." },
  W3106: {
    severity: "warn",
    summary: 'Link text is empty or not descriptive ("click here", "more").',
  },
  W3107: {
    severity: "warn",
    summary: "Landmark (HEADER/FOOTER) repeated without a distinguishing label.",
  },
  I3108: {
    severity: "info",
    summary:
      "Adjacent interactive targets: ensure 24×24 CSS px size or spacing (WCAG 2.2 SC 2.5.8).",
  },
  W3109: {
    severity: "warn",
    summary: "`live` region attribute used on a control or with `assertive` outside an alert.",
  },
  W3110: { severity: "warn", summary: "Heading has no text." },
  W3111: { severity: "warn", summary: "Table has an empty header cell." },
  W3112: {
    severity: "warn",
    summary: "Tabs must have distinct labels and exactly one active tab.",
  },
  W3113: { severity: "warn", summary: "MODAL has no accessible name (heading or `label`)." },
  I3114: { severity: "info", summary: "Document declares no `lang`." },
  E4001: { severity: "error", summary: "Design token reference does not resolve." },
  W4002: { severity: "warn", summary: "Token pair fails WCAG AA contrast (4.5:1)." },
  I4003: { severity: "info", summary: "Token is defined but never referenced." },
  W4004: { severity: "warn", summary: "Unknown breakpoint in the design system." },
  W4005: { severity: "warn", summary: "Design system defines no primary color." },
  W5101: { severity: "warn", summary: "Flow screen is unreachable from `start`." },
  W5102: {
    severity: "warn",
    summary: "Flow screen is a dead end (not terminal, no outgoing transition).",
  },
  W5201: {
    severity: "warn",
    summary: "Button triggers a destructive action that has no `confirm`.",
  },
  W5301: { severity: "warn", summary: "Too many primary actions in one region." },
  W5302: { severity: "warn", summary: "Too many form fields in one region." },
  W5303: { severity: "warn", summary: "A goal screen is deeper than the flow-depth constraint." },
  W5304: { severity: "warn", summary: "No way back to the start screen." },
  W5305: { severity: "warn", summary: "Destructive action without a confirmation modal or undo." },
  W5306: { severity: "warn", summary: "Non-terminal screen without an outgoing transition." },
  W5307: { severity: "warn", summary: "Data-bound region lacks required states." },
  W5308: { severity: "warn", summary: "Error state offers no recovery action." },
  W5309: { severity: "warn", summary: "Modal does not have exactly one primary action." },
  W5310: { severity: "warn", summary: "Navigation has too many items." },
  W5311: { severity: "warn", summary: "No help or support entry point." },
  E5321: { severity: "error", summary: "Input has no programmatic label." },
  E5322: { severity: "error", summary: "Heading level skipped." },
  E5323: { severity: "error", summary: "Declared tap target is smaller than the constraint." },
  E5331: { severity: "error", summary: "Unknown constraint name." },
  E5332: { severity: "error", summary: "Invalid constraint value." },
  E5333: { severity: "error", summary: "Waiver without a reason, or for an unknown constraint." },
  I5334: { severity: "info", summary: "Waiver suppressed nothing." },
  W2801: { severity: "warn", summary: "Malformed or duplicate `requirements:` entry." },
  W7001: { severity: "warn", summary: "Text reads as an instruction to an agent." },
  E7002: { severity: "error", summary: "Link or button target uses a disallowed URL scheme." },
  E6001: { severity: "error", summary: "Unknown component (not in the catalog)." },
  E6002: { severity: "error", summary: "Component argument violates the catalog prop schema." },
  W6003: { severity: "warn", summary: "Third-party component used without an explicit allow." },
  E6101: {
    severity: "error",
    summary: "Component map entry names something that is not in the catalog.",
  },
  I6102: { severity: "info", summary: "Catalog component has no entry in the component map." },
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
