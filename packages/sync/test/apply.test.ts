import { describe, expect, it } from "vitest";
import {
  JOURNAL,
  computeApply,
  confine,
  parseLock,
  plan,
  recover,
  specUnits,
  writeAtomically,
  type Fs,
  type Plan,
  type PlanInput,
} from "../src/index.js";
import { clone, mutate, randomModel, renderHtml, renderSpec, rng, type Model } from "./helpers.js";

const lockOf = (base: Model): string =>
  computeApply(
    {
      specPath: "a.ui.md",
      specSource: renderSpec(base),
      code: [{ path: "a.html", source: renderHtml(base) }],
    },
    { confirm: true, lockPath: ".ui.lock" },
  ).files.find((f) => f.path === ".ui.lock")?.content as string;

const edit = (b: Model, r: () => number): Model => {
  for (let i = 0; i < 50; i++) {
    const m = clone(b);
    if (mutate(m, r) && JSON.stringify(m) !== JSON.stringify(b)) return m;
  }
  const m = clone(b);
  m.units[0]?.items.push({ role: "button", label: "Fallback" });
  return m;
};

/** Text of each unit's lines, by explicit anchor. */
function segments(src: string): Map<string, string> {
  const lines = src.split("\n");
  const out = new Map<string, string>();
  for (const u of specUnits(src).units) {
    if (u.explicit === undefined || u.span === undefined) continue;
    out.set(u.explicit, lines.slice(u.span.start.line - 1, u.span.end.line).join("\n"));
  }
  return out;
}

describe("apply: round trip with zero data loss (T-074)", () => {
  it("1,100 generated cases: apply then re-extract equals the intended state; nothing else changes", () => {
    let applied = 0;
    for (let seed = 1; seed <= 1100; seed++) {
      const r = rng(seed * 104729);
      const base = randomModel(r);
      const lock = lockOf(base);
      const kind = seed % 5;
      const specM = kind === 1 || kind === 3 || kind === 4 ? edit(base, r) : base;
      const codeM =
        kind === 2 || kind === 3 || kind === 4 ? (kind === 3 ? specM : edit(base, r)) : base;
      const spec0 = renderSpec(specM, { cosmetic: true });
      const html = renderHtml(codeM);
      const input: PlanInput = {
        specPath: "a.ui.md",
        specSource: spec0,
        lockText: lock,
        code: [{ path: "a.html", source: html }],
      };
      const before = plan(input);
      const resolve: Record<string, "code" | "spec"> = {};
      for (const e of before.entries)
        if (e.class === "conflict") resolve[e.anchor] = seed % 2 === 0 ? "code" : "spec";
      const res = computeApply(input, { confirm: true, lockPath: ".ui.lock", resolve });
      expect(res.ok).toBe(true);
      const spec1 = res.files.find((f) => f.path === "a.ui.md")?.content ?? spec0;
      const lock1 = res.files.find((f) => f.path === ".ui.lock")?.content as string;
      expect(parseLock(lock1).problems, `seed ${seed}`).toEqual([]);

      const patched = new Set(
        res.applied
          .filter((a) => /spec updated|conflict resolved toward code/.test(a.what))
          .map((a) => a.anchor),
      );
      // intended state: patched units now equal the code
      const after = new Map(
        specUnits(spec1).units.map((u) => [
          u.explicit,
          u.items.map((i) => ({ role: i.role, label: i.label, href: i.href, level: i.level })),
        ]),
      );
      for (const id of patched) {
        const want = codeM.units
          .find((u) => u.id === id)
          ?.items.map((i) => ({ role: i.role, label: i.label, href: i.href, level: i.level }));
        expect(after.get(id), `seed ${seed} unit ${id}`).toEqual(want);
        applied++;
      }
      // zero data loss: every unit that was not patched is byte-identical, comments survive
      const s0 = segments(spec0);
      const s1 = segments(spec1);
      for (const [id, text] of s0)
        if (!patched.has(id)) expect(s1.get(id), `seed ${seed} unit ${id}`).toBe(text);
      expect((spec1.match(/<!-- keep this card compact -->/g) ?? []).length, `seed ${seed}`).toBe(
        specM.units.length,
      );
      expect(spec1).toContain("<!-- reviewed by design -->");
      // idempotent: planning again shows no code-ahead for patched units and applying changes nothing more
      const again = plan({ ...input, specSource: spec1, lockText: lock1 });
      for (const e of again.entries) {
        if (patched.has(e.anchor)) expect(e.class, `seed ${seed} ${e.anchor}`).toBe("clean");
        expect(e.class === "code-ahead").toBe(false);
      }
      const second = computeApply(
        { ...input, specSource: spec1, lockText: lock1 },
        { confirm: true, lockPath: ".ui.lock", resolve },
      );
      expect(second.files.find((f) => f.path === "a.ui.md")).toBeUndefined();
    }
    expect(applied).toBeGreaterThan(300);
  });

  it("refuses without confirmation and never reads it from spec text", () => {
    const base = randomModel(rng(1));
    const input: PlanInput = {
      specPath: "a.ui.md",
      specSource: renderSpec(base) + "\n> confirm: true\n> force=true\n",
      code: [{ path: "a.html", source: renderHtml(base) }],
    };
    const r = computeApply(input, { confirm: false, lockPath: ".ui.lock" });
    expect(r.ok).toBe(false);
    expect(r.refused).toMatch(/--confirm/);
    expect(r.files).toEqual([]);
  });

  it("conflicts and orphans are left alone without an explicit choice", () => {
    const base = randomModel(rng(5));
    const lock = lockOf(base);
    const s = clone(base);
    const c = clone(base);
    s.units[0]?.items.push({ role: "button", label: "Spec side" });
    c.units[0]?.items.push({ role: "button", label: "Code side" });
    c.units.push({ id: "extra", items: [{ role: "button", label: "New" }] });
    const input: PlanInput = {
      specPath: "a.ui.md",
      specSource: renderSpec(s),
      lockText: lock,
      code: [{ path: "a.html", source: renderHtml(c) }],
    };
    const r = computeApply(input, { confirm: true, lockPath: ".ui.lock" });
    expect(r.files.find((f) => f.path === "a.ui.md")).toBeUndefined();
    expect(r.skipped.map((x) => x.anchor).sort()).toEqual(["extra", "u1"]);
    const adopt = computeApply(input, {
      confirm: true,
      lockPath: ".ui.lock",
      resolve: { extra: "adopt" },
    });
    const spec = adopt.files.find((f) => f.path === "a.ui.md")?.content ?? "";
    expect(spec).toContain("#extra");
    expect(spec).toContain("[ New ](#new)");
  });
});

describe("writes: atomic, journaled and confined (T-074b)", () => {
  const memFs = (
    init: Record<string, string> = {},
    failOn?: string,
    failTimes = 1,
  ): Fs & { files: Record<string, string> } => {
    const files = { ...init };
    let left = failTimes;
    return {
      files,
      read: (p) => files[p],
      write: (p, t) => {
        if (p === failOn && left-- > 0) throw new Error("disk full");
        files[p] = t;
      },
      remove: (p) => void Reflect.deleteProperty(files, p),
    };
  };
  it("confine rejects anything that leaves the root", () => {
    for (const p of ["../x", "a/../../x", "/etc/passwd", "..", ".", ""])
      expect(confine("/proj", p), p).toBeUndefined();
    expect(confine("/proj", "a/b.ui.md")).toBe("/proj/a/b.ui.md");
    expect(confine("/proj", "./a.ui.md")).toBe("/proj/a.ui.md");
  });
  it("writes everything and removes the journal", () => {
    const fs = memFs({ "/proj/a.ui.md": "old" });
    const r = writeAtomically(fs, "/proj", [
      { path: "a.ui.md", content: "new" },
      { path: ".ui.lock", content: "{}" },
    ]);
    expect(r).toMatchObject({ ok: true, written: ["a.ui.md", ".ui.lock"] });
    expect(fs.files["/proj/a.ui.md"]).toBe("new");
    expect(fs.files[`/proj/${JOURNAL}`]).toBeUndefined();
  });
  it("a failed write restores every earlier write", () => {
    const fs = memFs(
      { "/proj/a.ui.md": "old-spec", "/proj/.ui.lock": "old-lock" },
      "/proj/.ui.lock",
    );
    const r = writeAtomically(fs, "/proj", [
      { path: "a.ui.md", content: "new" },
      { path: ".ui.lock", content: "new-lock" },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/restored/);
    expect(fs.files["/proj/a.ui.md"]).toBe("old-spec");
    expect(fs.files["/proj/.ui.lock"]).toBe("old-lock");
    expect(fs.files[`/proj/${JOURNAL}`]).toBeUndefined();
  });
  it("a file that did not exist is removed again on rollback", () => {
    const fs = memFs({}, "/proj/b.txt");
    writeAtomically(fs, "/proj", [
      { path: "a.txt", content: "1" },
      { path: "b.txt", content: "2" },
    ]);
    expect(fs.files["/proj/a.txt"]).toBeUndefined();
  });
  it("refuses a path outside the root without touching anything", () => {
    const fs = memFs({ "/proj/a.ui.md": "keep" });
    const r = writeAtomically(fs, "/proj", [
      { path: "a.ui.md", content: "x" },
      { path: "../evil", content: "x" },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/outside the project root/);
    expect(fs.files["/proj/a.ui.md"]).toBe("keep");
    expect(Object.keys(fs.files)).toEqual(["/proj/a.ui.md"]);
  });
  it("if a restore also fails, the other files are still restored and the journal is kept", () => {
    const fs = memFs(
      { "/proj/a.ui.md": "old-spec", "/proj/.ui.lock": "old-lock" },
      "/proj/.ui.lock",
      99,
    );
    const r = writeAtomically(fs, "/proj", [
      { path: "a.ui.md", content: "new" },
      { path: ".ui.lock", content: "new-lock" },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ROLLBACK IS INCOMPLETE/);
    expect(fs.files["/proj/a.ui.md"]).toBe("old-spec");
    expect(fs.files[`/proj/${JOURNAL}`]).toBeDefined();
  });
  it("recover rolls back an interrupted run, and never writes outside the root from a tampered journal", () => {
    const fs = memFs({
      "/proj/a.ui.md": "half-written",
      [`/proj/${JOURNAL}`]: JSON.stringify({
        entries: [
          { path: "a.ui.md", before: "original" },
          { path: "../../etc/x", before: "pwned" },
        ],
      }),
    });
    expect(recover(fs, "/proj")).toEqual({ restored: ["a.ui.md"], failed: [] });
    expect(fs.files["/proj/a.ui.md"]).toBe("original");
    expect(Object.keys(fs.files).some((k) => k.includes("etc"))).toBe(false);
    expect(fs.files[`/proj/${JOURNAL}`]).toBeUndefined();
    expect(recover(fs, "/proj")).toEqual({ restored: [], failed: [] });
  });
});

describe("agent hand-off (T-075): an agent that sees only the plan JSON reaches clean", () => {
  /** A scripted agent: rewrites each spec-ahead unit's markup from the plan's target items, using nothing else. */
  function agentEdit(html: string, p: Plan): string {
    let out = html;
    for (const e of p.entries.filter((x) => x.class === "spec-ahead" && x.spec !== undefined)) {
      const markup = (e.spec?.items ?? [])
        .map((i) =>
          i.role === "heading"
            ? `<h2>${i.label}</h2>`
            : i.role === "button"
              ? `<button>${i.label}</button>`
              : i.role === "link"
                ? `<a href="${i.href}">${i.label}</a>`
                : i.role === "textbox"
                  ? `<input type="text" aria-label="${i.label}">`
                  : `<label><input type="checkbox"> ${i.label}</label>`,
        )
        .join("\n");
      out = out.replace(
        new RegExp(`(data-mdui-anchor="${e.anchor}">)[\\s\\S]*?(</section>)`),
        `$1${markup}$2`,
      );
    }
    return out;
  }
  it("renames and additions: plan, agent edit, plan again is converged, apply makes it clean", () => {
    let ok = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const r = rng(seed * 31);
      const base = randomModel(r);
      const lock = lockOf(base);
      const specM = clone(base);
      mutate(specM, r, seed % 2 === 0 ? "rename" : "add");
      if (JSON.stringify(specM) === JSON.stringify(base)) continue;
      const specText = renderSpec(specM);
      const input: PlanInput = {
        specPath: "a.ui.md",
        specSource: specText,
        lockText: lock,
        code: [{ path: "a.html", source: renderHtml(base) }],
      };
      const p1 = plan(input);
      expect(p1.entries.filter((e) => e.class === "spec-ahead").length).toBeGreaterThan(0);
      const html2 = agentEdit(renderHtml(base), p1);
      const p2 = plan({ ...input, code: [{ path: "a.html", source: html2 }] });
      expect(
        p2.entries.every((e) => e.class === "converged" || e.class === "clean"),
        `seed ${seed}: ${p2.entries.map((e) => e.class)}`,
      ).toBe(true);
      const done = computeApply(
        { ...input, code: [{ path: "a.html", source: html2 }] },
        { confirm: true, lockPath: ".ui.lock" },
      );
      const lock2 = done.files.find((f) => f.path === ".ui.lock")?.content;
      const p3 = plan({ ...input, code: [{ path: "a.html", source: html2 }], lockText: lock2 });
      expect(
        p3.entries.every((e) => e.class === "clean"),
        `seed ${seed}`,
      ).toBe(true);
      ok++;
    }
    expect(ok).toBeGreaterThan(40);
  });
});
