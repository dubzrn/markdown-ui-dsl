import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lint } from "@mdui/lint";
import { coverage, declaredRequirements, extractRequirements } from "../src/index.js";

const root = new URL("../../../examples/sdd/", import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), "utf8");
const H = (reqs: string) => `---\ndsl: 2.0\nlang: en\nrequirements: ${reqs}\n---\nx\n`;

describe("requirements extraction (T-056)", () => {
  it("Spec Kit ids", () =>
    expect(extractRequirements("- **FR-001**: a\n- **NFR-2**: b\n").map((r) => r.id)).toEqual([
      "FR-001",
      "NFR-2",
    ]));
  it("OpenSpec requirement names", () =>
    expect(
      extractRequirements("### Requirement: Sign in\n#### Scenario: x\n").map((r) => r.id),
    ).toEqual(["Sign in"]));
  it("Kiro requirement numbers (not acceptance criteria)", () =>
    expect(
      extractRequirements("### Requirement 1: A\n1. WHEN x\n### Requirement 2: B\n").map(
        (r) => r.id,
      ),
    ).toEqual(["1", "2"]));
  it("skips fenced code and duplicates", () =>
    expect(extractRequirements("FR-001 FR-001\n```\nFR-009\n```\n").map((r) => r.id)).toEqual([
      "FR-001",
    ]));
});

describe("coverage (T-056)", () => {
  const reqs = extractRequirements("FR-001 FR-002 FR-003");
  it("lists uncovered and unknown requirements", () => {
    const r = coverage(reqs, [
      { path: "a.ui.md", source: H("[FR-001, FR-009]") },
      { path: "b.ui.md", source: H("FR-002") },
    ]);
    expect(r.uncovered).toEqual(["FR-003"]);
    expect(r.unknown).toEqual([{ id: "FR-009", path: "a.ui.md" }]);
    expect(r.covered["FR-001"]).toEqual(["a.ui.md"]);
    expect(r.totals).toEqual({ requirements: 3, covered: 2 });
  });
  it("tolerates a missing or malformed requirements key", () => {
    expect(declaredRequirements("plain").ids).toEqual([]);
    const src = [
      "---",
      "dsl: 2.0",
      "requirements:",
      "  - a",
      '  - ""',
      "  - {b: c}",
      "  - null",
      "---",
      "x",
      "",
    ].join("\n");
    expect(declaredRequirements(src).malformed).toBe(3);
  });
  it("a prototype-named id never pollutes the report", () => {
    const r = coverage(reqs, [{ path: "a.ui.md", source: H("[toString, __proto__]") }]);
    expect(r.unknown.map((u) => u.id)).toEqual(["toString", "__proto__"]);
    expect(r.uncovered).toHaveLength(3);
  });
});

describe("sample projects: .ui.md participates in each flow", () => {
  const flows: [string, string, string][] = [
    ["spec-kit", "spec-kit/specs/001-login/spec.md", "spec-kit/specs/001-login/login.ui.md"],
    [
      "openspec",
      "openspec/openspec/specs/auth/spec.md",
      "openspec/openspec/specs/auth/login.ui.md",
    ],
    ["kiro", "kiro/.kiro/specs/login/requirements.md", "kiro/.kiro/specs/login/login.ui.md"],
  ];
  for (const [name, req, ui] of flows)
    it(`${name}: lints clean and covers every requirement`, () => {
      const src = read(ui);
      expect(lint(src).diagnostics).toEqual([]);
      const r = coverage(extractRequirements(read(req)), [{ path: ui, source: src }]);
      expect(r.uncovered).toEqual([]);
      expect(r.unknown).toEqual([]);
    });
});
