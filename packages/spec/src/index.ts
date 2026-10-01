/** Language versions this toolchain understands (see docs/SPEC.md §4). */
export const SUPPORTED_DSL_VERSIONS = ["1.0"] as const;
export type DslVersion = (typeof SUPPORTED_DSL_VERSIONS)[number];
