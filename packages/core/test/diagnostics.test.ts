import { describe, expect, it } from "vitest";
import { CODES } from "../src/diagnostics.js";

describe("diagnostic registry", () => {
  const entries = Object.entries(CODES);
  it("codes are unique, well-formed and in range", () => {
    expect(new Set(entries.map(([c]) => c)).size).toBe(entries.length);
    for (const [code] of entries) expect(code).toMatch(/^[EWI][1-7]\d{3}$/);
  });
  it("severity letter matches severity", () => {
    const letter = { error: "E", warn: "W", info: "I" } as const;
    for (const [code, info] of entries) expect(code[0]).toBe(letter[info.severity]);
  });
  it("every code has a summary", () => {
    for (const [, info] of entries) expect(info.summary.length).toBeGreaterThan(10);
  });
});
