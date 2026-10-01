export type WarningKind = "degraded" | "dropped" | "synthesized";
/** Exporters never lose content silently: everything that does not map one-to-one is reported here. */
export interface ExportWarning {
  kind: WarningKind;
  /** 1-based source line. */
  line: number;
  /** DSL construct, e.g. `table`, `[ chart ]`. */
  construct: string;
  message: string;
}
