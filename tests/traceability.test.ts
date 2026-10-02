import { describe, expect, it } from "vitest";
import { checkTraceability } from "../scripts/lib/traceability.ts";

const F = "| **LNG-01** | grammar |\n| **TLS-01** | ast |\n";
const S = "- **REQ-LNG-01** The system SHALL x.\n- **REQ-TLS-01** The system SHALL y.\n";
const T = (a: string) =>
  `### T-010 · a\n\`M\` · Deps: — · Implements: **${a}** · REQ: REQ-LNG-01\n### T-011 · b\n\`S\` · Deps: T-010 · Implements: **TLS-01** · REQ: REQ-TLS-01\n`;

describe("checkTraceability", () => {
  it("passes on a complete set", () => {
    expect(checkTraceability(F, S, T("LNG-01")).errors).toEqual([]);
  });
  it("flags a feature with no task", () => {
    const r = checkTraceability(F + "| **QLT-09** | z |\n", S, T("LNG-01"));
    expect(r.errors).toContain("feature QLT-09 has no task");
  });
  it("flags a requirement with no task", () => {
    const r = checkTraceability(F, S + "- **REQ-QLT-09** The system SHALL z.\n", T("LNG-01"));
    expect(r.errors).toContain("requirement REQ-QLT-09 has no task");
  });
  it("flags an unknown feature id", () => {
    expect(checkTraceability(F, S, T("LNG-99")).errors).toContain("T-010: unknown feature LNG-99");
  });
  it("lets a bare REQ id cover lettered sub-requirements", () => {
    const S2 = "- **REQ-NOV-01a** x\n- **REQ-NOV-01b** y\n";
    const T2 = "### T-070 · a\n`M` · Deps: — · Implements: **NOV-01** · REQ: REQ-NOV-01\n";
    expect(checkTraceability("### NOV-01 — sync\n", S2, T2).errors).toEqual([]);
  });
});
