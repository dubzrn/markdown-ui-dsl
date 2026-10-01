import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classify, computeApply, plan, type SyncClass } from "../src/index.js";
import {
  clone,
  mutate,
  randomModel,
  renderHtml,
  renderSpec,
  renderTsx,
  rng,
  type Model,
} from "./helpers.js";

const key = (u: { items: unknown }): string => JSON.stringify(u.items);
const CLASSES: (SyncClass | "none")[] = [
  "clean",
  "spec-ahead",
  "code-ahead",
  "converged",
  "conflict",
  "orphan-spec",
  "orphan-code",
];

/** The class an anchor must land in, derived only from the three models (never from the toolchain). */
function truth(base: Model, spec: Model, code: Model): Record<string, SyncClass> {
  const out: Record<string, SyncClass> = {};
  const ids = new Set([...base.units, ...spec.units, ...code.units].map((u) => u.id));
  for (const id of ids) {
    const b = base.units.find((u) => u.id === id);
    const s = spec.units.find((u) => u.id === id);
    const c = code.units.find((u) => u.id === id);
    if (s !== undefined && c === undefined) out[id] = "orphan-spec";
    else if (s === undefined && c !== undefined)
      out[id] = b === undefined ? "orphan-code" : "spec-ahead";
    else if (s !== undefined && c !== undefined) {
      const sc = b === undefined || key(b) !== key(s);
      const cc = b === undefined || key(b) !== key(c);
      out[id] =
        !sc && !cc
          ? "clean"
          : sc && !cc
            ? "spec-ahead"
            : !sc && cc
              ? "code-ahead"
              : key(s) === key(c)
                ? "converged"
                : "conflict";
    }
  }
  return out;
}

/** Sync the base once, as a user would: spec and code agree, `apply` writes the lock. */
function lockOf(base: Model): string {
  const r = computeApply(
    {
      specPath: "a.ui.md",
      specSource: renderSpec(base),
      code: [{ path: "a.html", source: renderHtml(base) }],
    },
    { confirm: true, lockPath: ".ui.lock" },
  );
  return r.files.find((f) => f.path === ".ui.lock")?.content as string;
}

type Scenario = {
  name: string;
  make: (
    base: Model,
    r: () => number,
  ) => { spec: Model; code: Model; specCosmetic?: boolean; codeCosmetic?: boolean; tsx?: boolean };
};
const changed = (base: Model, r: () => number, kind?: Parameters<typeof mutate>[2]): Model => {
  for (let i = 0; i < 50; i++) {
    const m = clone(base);
    if (mutate(m, r, kind) && JSON.stringify(m) !== JSON.stringify(base)) return m;
  }
  const m = clone(base);
  (m.units[0] as Model["units"][number]).items.push({ role: "button", label: "Fallback" });
  return m;
};
const SCENARIOS: Scenario[] = [
  { name: "no change", make: (b) => ({ spec: b, code: b }) },
  { name: "spec edited", make: (b, r) => ({ spec: changed(b, r), code: b }) },
  { name: "code edited", make: (b, r) => ({ spec: b, code: changed(b, r) }) },
  {
    name: "both, same edit",
    make: (b, r) => {
      const m = changed(b, r);
      return { spec: m, code: m };
    },
  },
  {
    name: "both, different edits",
    make: (b, r) => {
      for (let i = 0; i < 100; i++) {
        const s = changed(b, r);
        const c = changed(b, r);
        // different edits that touch the same unit differently
        const diff = b.units.some(
          (u, k) =>
            key(u) !== key(s.units[k] as typeof u) &&
            key(u) !== key(c.units[k] as typeof u) &&
            key(s.units[k] as typeof u) !== key(c.units[k] as typeof u),
        );
        if (diff) return { spec: s, code: c };
      }
      const s = clone(b);
      const c = clone(b);
      (s.units[0] as Model["units"][number]).items.push({ role: "button", label: "From spec" });
      (c.units[0] as Model["units"][number]).items.push({ role: "button", label: "From code" });
      return { spec: s, code: c };
    },
  },
  { name: "code reformatted", make: (b) => ({ spec: b, code: b, codeCosmetic: true }) },
  { name: "spec reformatted", make: (b) => ({ spec: b, code: b, specCosmetic: true }) },
  { name: "code is TSX", make: (b) => ({ spec: b, code: b, tsx: true }) },
  {
    name: "unit missing in code",
    make: (b) => {
      const c = clone(b);
      if (c.units.length > 1) c.units.pop();
      else c.units = [];
      return { spec: b, code: c };
    },
  },
  {
    name: "code-only unit",
    make: (b) => {
      const c = clone(b);
      c.units.push({
        id: "extra",
        items: [
          { role: "heading", label: "Extra", level: 2 },
          { role: "button", label: "Surprise" },
        ],
      });
      return { spec: b, code: c };
    },
  },
];

const SEEDS = 40;

describe("three-way classifier on generated cases (T-073)", () => {
  const matrix: Record<string, Record<string, number>> = {};
  let decisions = 0;
  let correct = 0;
  const wrong: string[] = [];
  let cases = 0;
  for (const sc of SCENARIOS)
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = rng(seed * 7919 + SCENARIOS.indexOf(sc));
      const base = randomModel(r);
      const made = sc.make(base, r);
      const lock = lockOf(base);
      const p = plan({
        specPath: "a.ui.md",
        specSource: renderSpec(made.spec, { cosmetic: made.specCosmetic === true }),
        lockText: lock,
        code: [
          made.tsx === true
            ? { path: "a.tsx", source: renderTsx(made.code) }
            : {
                path: "a.html",
                source:
                  made.codeCosmetic === true
                    ? renderHtml(made.code, { cosmetic: true })
                    : renderHtml(made.code),
              },
        ],
      });
      cases++;
      const want = truth(base, made.spec, made.code);
      const got = new Map(p.entries.map((e) => [e.anchor, e.class]));
      for (const [id, cls] of Object.entries(want)) {
        decisions++;
        const g = got.get(id) ?? "none";
        (matrix[cls] ??= {})[g] = ((matrix[cls] as Record<string, number>)[g] ?? 0) + 1;
        if (g === cls) correct++;
        else wrong.push(`${sc.name} seed ${seed} anchor ${id}: expected ${cls}, got ${g}`);
      }
      // every anchor lands in exactly one class
      const ids = p.entries.map((e) => e.anchor);
      expect(new Set(ids).size).toBe(ids.length);
      // no spurious entries
      for (const id of got.keys())
        if (id !== "page")
          expect(Object.hasOwn(want, id), `${sc.name} seed ${seed}: unexpected anchor ${id}`).toBe(
            true,
          );
    }

  it("is at least 95% correct over at least 200 cases", () => {
    expect(cases).toBeGreaterThanOrEqual(200);
    expect(wrong.slice(0, 10)).toEqual([]);
    expect(correct / decisions).toBeGreaterThanOrEqual(0.95);
  });

  it("records the confusion matrix (set WRITE_EVALS=1 to rewrite evals/NOV-01.md)", () => {
    const rows = CLASSES.filter((c) => c !== "none").map(
      (c) =>
        `| ${c} | ${CLASSES.filter((x) => x !== "none")
          .map((x) => matrix[c]?.[x] ?? 0)
          .join(" | ")} | ${matrix[c]?.["none"] ?? 0} |`,
    );
    const md = `# NOV-01 three-way classifier evaluation

Generated by \`pnpm vitest run packages/sync/test/classify.test.ts\` with \`WRITE_EVALS=1\`.

${cases} generated cases (${SCENARIOS.length} scenarios x ${SEEDS} seeds), ${decisions} per-anchor decisions, **${correct} correct (${((correct / decisions) * 100).toFixed(1)}%)**; target >= 95% over >= 200 cases.

Each case renders one screen model as a \`.ui.md\` spec and as HTML or TSX code, syncs it (\`apply\` writes the lock), mutates spec, code or both, and classifies. The expected class comes from the three models only, never from the toolchain. Scenarios: ${SCENARIOS.map((s) => s.name).join("; ")}.

Rows are the true class, columns the predicted class.

| true \\\\ predicted | ${CLASSES.filter((c) => c !== "none").join(" | ")} | (no entry) |
|---|${"---|".repeat(8)}
${rows.join("\n")}

Limits: the screens are small generated models (headings, buttons, links, text inputs, checkboxes) in two code dialects; real applications have dynamic markup, conditional rendering and component indirection that the TSX adapter does not interpret.
`;
    if (process.env["WRITE_EVALS"] === "1") {
      mkdirSync(new URL("../../../evals/", import.meta.url), { recursive: true });
      writeFileSync(new URL("../../../evals/NOV-01.md", import.meta.url), md);
    }
    expect(md).toContain("correct");
  });
});

describe("classify() truth table (T-073a, T-073b)", () => {
  const item = (label: string) => [{ role: "button" as const, label }];
  const base = {
    kind: "card",
    spec: { hash: "", items: item("A") },
    code: { path: "c", hash: "", items: item("A") },
  };
  it("covers every row of the table", () => {
    expect(classify(base, item("A"), item("A")).cls).toBe("clean");
    expect(classify(base, item("B"), item("A")).cls).toBe("spec-ahead");
    expect(classify(base, item("A"), item("B")).cls).toBe("code-ahead");
    expect(classify(base, item("B"), item("B")).cls).toBe("converged");
    expect(classify(base, item("B"), item("C")).cls).toBe("conflict");
    expect(classify(undefined, item("A"), undefined).cls).toBe("orphan-spec");
    expect(classify(undefined, undefined, item("A")).cls).toBe("orphan-code");
    expect(classify(base, undefined, undefined).cls).toBe("gone");
  });
  it("without a base, agreement converges and disagreement is a conflict", () => {
    expect(classify(undefined, item("A"), item("A")).cls).toBe("converged");
    expect(classify(undefined, item("A"), item("B")).cls).toBe("conflict");
  });
  it("a unit the spec dropped: unchanged code is spec-ahead, edited code is a conflict", () => {
    expect(classify(base, undefined, item("A")).cls).toBe("spec-ahead");
    expect(classify(base, undefined, item("Z")).cls).toBe("conflict");
  });
});
