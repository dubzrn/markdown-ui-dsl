/** Baselines and the CI verdict (T-078). */
import type { Report } from "./match.js";

export interface Baseline {
  version: 1;
  fidelity: number;
  /** `role|name` keys of expected nodes that were not present when the baseline was taken (known divergences). */
  known: string[];
}

export const verdictKey = (v: { expected: { role: string; name: string } }): string =>
  `${v.expected.role}|${v.expected.name}`;

export function toBaseline(r: Report): Baseline {
  return {
    version: 1,
    fidelity: Math.round(r.fidelity * 1e6) / 1e6,
    known: r.verdicts
      .filter((v) => v.verdict !== "present")
      .map(verdictKey)
      .sort(),
  };
}

export function parseBaseline(text: string): Baseline | undefined {
  try {
    const b = JSON.parse(text) as Partial<Baseline>;
    if (
      b.version === 1 &&
      typeof b.fidelity === "number" &&
      Array.isArray(b.known) &&
      b.known.every((k) => typeof k === "string")
    )
      return b as Baseline;
  } catch {
    /* fall through */
  }
  return undefined;
}

export interface Verdicts {
  ok: boolean;
  reasons: string[];
}

/** Pass when the score meets `min` and nothing new is missing relative to the baseline. */
export function judge(r: Report, opts: { minFidelity?: number; baseline?: Baseline }): Verdicts {
  const reasons: string[] = [];
  if (opts.minFidelity !== undefined && r.fidelity + 1e-9 < opts.minFidelity)
    reasons.push(
      `fidelity ${(r.fidelity * 100).toFixed(1)}% is below the required ${(opts.minFidelity * 100).toFixed(1)}%`,
    );
  if (opts.baseline !== undefined) {
    const known = new Set(opts.baseline.known);
    const fresh = r.verdicts.filter((v) => v.verdict !== "present" && !known.has(verdictKey(v)));
    for (const v of fresh)
      reasons.push(
        `new ${v.verdict}: ${v.expected.role}${v.expected.name !== "" ? ` "${v.expected.name}"` : ""} (spec line ${v.expected.line})`,
      );
    if (r.fidelity + 1e-9 < opts.baseline.fidelity)
      reasons.push(
        `fidelity ${(r.fidelity * 100).toFixed(1)}% regressed from the baseline ${(opts.baseline.fidelity * 100).toFixed(1)}%`,
      );
  }
  return { ok: reasons.length === 0, reasons };
}
