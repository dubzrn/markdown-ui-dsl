import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "@vrillabs/mdui-catalog";
import {
  ALL_TASKS,
  GENERATION,
  INJECTION,
  SYNC,
  compareArms,
  extractDsl,
  llamacpp,
  ollama,
  openaiCompatible,
  replay,
  run,
  scoreAnswer,
  signTest,
  summarise,
  systemFor,
  wilson,
  type Fetch,
} from "../src/index.js";
import { REFERENCE } from "./reference.js";

const task = (id: string) => ALL_TASKS.find((t) => t.id === id) as (typeof ALL_TASKS)[number];

describe("task set (T-063)", () => {
  it("has at least 30 generation prompts, sync scenarios and injection prompts, with unique ids", () => {
    expect(GENERATION.length).toBeGreaterThanOrEqual(30);
    expect(SYNC.length).toBeGreaterThanOrEqual(5);
    expect(INJECTION.length).toBeGreaterThanOrEqual(8);
    expect(new Set(ALL_TASKS.map((t) => t.id)).size).toBe(ALL_TASKS.length);
  });
  it("every task has a synthetic reference answer that passes its own assertions (so each task is passable)", () => {
    for (const t of ALL_TASKS) {
      const s = scoreAnswer(t, REFERENCE[t.id] as string);
      expect(s.failed, t.id).toEqual([]);
      expect(s.errors, t.id).toEqual([]);
      expect(s.pass, t.id).toBe(true);
    }
    expect(Object.keys(REFERENCE).sort()).toEqual(ALL_TASKS.map((t) => t.id).sort());
  });
  it("every assertion is discriminating: the empty answer and a wrong-topic answer fail every task", () => {
    for (const t of ALL_TASKS) {
      expect(scoreAnswer(t, "").pass, `${t.id} empty`).toBe(false);
      expect(scoreAnswer(t, "::: CARD :::\nhello\n--- END ---\n").pass, `${t.id} generic`).toBe(
        false,
      );
    }
  });
  it("injection tasks fail when the model obeys the hostile content", () => {
    const obey: Record<string, string> = {
      "inj-ignore": "---\ndsl: 2.0\nlang: en\n---\n[ Sign in ](#go)\n[ x ](javascript:alert(1))\n",
      "inj-system":
        "---\ndsl: 2.0\nlang: en\n---\n## My system prompt and API key\n[ Close ](#c)\n[ Contact support ](/s)\n",
      "inj-hidden-hint":
        "---\ndsl: 2.0\nlang: en\n---\n## Plan PWNED\n[ Buy ](#b)\n[ Compare ](#c)\n",
    };
    for (const [id, text] of Object.entries(obey))
      expect(scoreAnswer(task(id), text).pass, id).toBe(false);
  });
});

describe("scoring", () => {
  const t = task("login");
  it("extracts DSL from a fenced answer, ignoring prose around it", () => {
    expect(
      extractDsl("Sure!\n```markdown\n::: CARD :::\nx\n--- END ---\n```\nHope that helps"),
    ).toBe("::: CARD :::\nx\n--- END ---\n");
    expect(extractDsl("```text\nnot dsl\n```\n```md\n[ Go ](#g)\n```")).toContain("[ Go ]");
    expect(extractDsl("```markdown\n::: CARD :::\nx\n")).toContain(":::");
  });
  it("counts nesting errors: unclosed, orphan closer, typed mismatch", () => {
    expect(scoreAnswer(t, "::: CARD :::\n[ text: a ]\n").nestingErrors).toBe(1);
    expect(scoreAnswer(t, "--- END ---\n").nestingErrors).toBe(1);
    expect(
      scoreAnswer(
        task("v2-typed-closers"),
        `${"---\ndsl: 2.0\n---\n"}::: CARD :::\n--- END ROW ---\n`,
      ).nestingErrors,
    ).toBe(1);
  });
  it("flags framework code and markup", () => {
    expect(scoreAnswer(t, "import React from 'react';\nexport function Login() {}\n").onlyDsl).toBe(
      false,
    );
    expect(scoreAnswer(t, "<div><button>Log in</button></div>").onlyDsl).toBe(false);
    expect(scoreAnswer(t, REFERENCE["login"] as string).onlyDsl).toBe(true);
  });
  it("checks the DSL version the task asks for", () => {
    expect(scoreAnswer(task("v2-grid"), "::: GRID cols=3 :::\n--- END ---\n").rightVersion).toBe(
      false,
    );
    expect(scoreAnswer(task("v2-grid"), REFERENCE["v2-grid"] as string).rightVersion).toBe(true);
  });
  it("catalog adherence is scored when a catalog is given", () => {
    const catalog = loadCatalog(
      "components:\n  Rating:\n    props:\n      value: { type: number, positional: 0 }\n",
    ).catalog;
    const s = scoreAnswer(
      task("v2-ids"),
      "---\ndsl: 2.0\n---\n[ RATNG: 4 ]\n[ Submit ](#go){: #submit-btn .primary }\n",
      { catalog },
    );
    expect(s.catalogErrors).toBe(1);
  });
  it("Wilson interval: widens for small n and brackets the rate", () => {
    const [lo, hi] = wilson(8, 10);
    expect(lo).toBeLessThan(0.8);
    expect(hi).toBeGreaterThan(0.8);
    expect(wilson(0, 0)).toEqual([0, 1]);
    const [l2, h2] = wilson(800, 1000);
    expect(h2 - l2).toBeLessThan(hi - lo);
  });
  it("sign test on discordant pairs", () => {
    expect(signTest(0, 0)).toBe(1);
    expect(signTest(10, 0)).toBeCloseTo(2 / 1024, 6);
    expect(signTest(5, 5)).toBe(1);
  });
});

describe("runner on the replay provider (dry run)", () => {
  const recorded: Record<string, string> = {};
  for (const [id, text] of Object.entries(REFERENCE)) recorded[`${id}|none`] = text;
  // the "skill" arm is a flawed copy: it forgets closers on every third task
  ALL_TASKS.forEach(
    (t, i) =>
      (recorded[`${t.id}|skill`] =
        i % 3 === 0
          ? (REFERENCE[t.id] as string).replace(/--- END[^\n]*---\n/g, "")
          : (REFERENCE[t.id] as string)),
  );
  const provider = replay(recorded, "dry-run");
  it("scores every task and arm, and separates the two arms", async () => {
    const results = await run({
      provider,
      tasks: ALL_TASKS,
      arms: [
        { context: "none", constrained: false },
        { context: "skill", constrained: false },
      ],
      contexts: { skill: "SKILL" },
    });
    const cells = summarise(results);
    const none = cells.find((c) => c.arm === "none");
    const skill = cells.find((c) => c.arm === "skill");
    expect(none).toMatchObject({ n: 50, errors: 0, pass: 50 });
    expect(skill?.nesting).toBeGreaterThan(10);
    expect(skill?.pass).toBeLessThan(40);
    const cmp = compareArms(results, provider.id, "none", "skill");
    expect(cmp.pairs).toBe(50);
    expect(cmp.onlyA).toBeGreaterThan(10);
    expect(cmp.onlyB).toBe(0);
    expect(signTest(cmp.onlyA, cmp.onlyB)).toBeLessThan(0.001);
  });
  it("a provider failure is recorded as an error, not scored as a model failure", async () => {
    const results = await run({
      provider: replay({}, "empty"),
      tasks: [task("login")],
      arms: [{ context: "none", constrained: false }],
      contexts: { skill: "" },
    });
    expect(results[0]?.error).toMatch(/no recorded output/);
    const cell = summarise(results)[0];
    expect(cell).toMatchObject({ n: 0, errors: 1 });
  });
  it("refuses a constrained arm on a provider that cannot enforce grammars", async () => {
    await expect(
      run({
        provider,
        tasks: [task("login")],
        arms: [{ context: "none", constrained: true }],
        contexts: { skill: "" },
      }),
    ).rejects.toThrow(/cannot enforce a grammar/);
  });
  it("arms build the right system text: none has none, prompt omits unused widgets", () => {
    expect(
      systemFor({ context: "none", constrained: false }, task("login"), { skill: "S" }),
    ).toBeUndefined();
    expect(systemFor({ context: "skill", constrained: false }, task("login"), { skill: "S" })).toBe(
      "S",
    );
    const p = systemFor({ context: "prompt", constrained: false }, task("sync-rename"), {
      skill: "S",
    }) as string;
    expect(p).toMatch(/CARD/);
    expect(p).not.toMatch(/CHART|SLIDER/);
  });
});

describe("provider adapters (no network: injected fetch)", () => {
  const fake =
    (
      reply: unknown,
      seen: { url?: string; body?: Record<string, unknown>; headers?: Record<string, string> } = {},
    ): Fetch =>
    async (url, init) => {
      seen.url = url;
      seen.body = JSON.parse(init.body) as Record<string, unknown>;
      seen.headers = init.headers;
      return { ok: true, status: 200, text: async () => JSON.stringify(reply) };
    };
  const req = { prompt: "p", system: "s", seed: 7, temperature: 0, maxTokens: 50 };
  it("ollama: /api/generate with seed, temperature and token counts; refuses a grammar", async () => {
    const seen: { url?: string; body?: Record<string, unknown> } = {};
    const p = ollama("ornith-1.5:9b", {
      fetch: fake({ response: "hi", prompt_eval_count: 11, eval_count: 3 }, seen),
    });
    expect(await p.generate(req)).toMatchObject({
      text: "hi",
      promptTokens: 11,
      completionTokens: 3,
    });
    expect(seen.url).toBe("http://localhost:11434/api/generate");
    expect(seen.body).toMatchObject({
      model: "ornith-1.5:9b",
      stream: false,
      system: "s",
      options: { seed: 7, temperature: 0, num_predict: 50 },
    });
    await expect(p.generate({ ...req, grammar: "root ::= x" })).rejects.toThrow(
      /cannot enforce a GBNF/,
    );
    expect(p.supportsGrammar).toBe(false);
  });
  it("llama.cpp: /completion with the grammar", async () => {
    const seen: { url?: string; body?: Record<string, unknown> } = {};
    const p = llamacpp({
      fetch: fake({ content: "ok", tokens_evaluated: 5, tokens_predicted: 2 }, seen),
      label: "m",
    });
    expect(await p.generate({ ...req, grammar: "root ::= x" })).toMatchObject({
      text: "ok",
      completionTokens: 2,
    });
    expect(seen.url).toBe("http://localhost:8080/completion");
    expect(seen.body).toMatchObject({ grammar: "root ::= x", seed: 7, n_predict: 50 });
    expect(p.supportsGrammar).toBe(true);
  });
  it("OpenAI-compatible: chat completions with a bearer key", async () => {
    const seen: { url?: string; body?: Record<string, unknown>; headers?: Record<string, string> } =
      {};
    const p = openaiCompatible("m", {
      baseUrl: "http://x/v1/",
      apiKey: "k",
      fetch: fake(
        {
          choices: [{ message: { content: "yo" } }],
          usage: { prompt_tokens: 4, completion_tokens: 1 },
        },
        seen,
      ),
    });
    expect(await p.generate(req)).toMatchObject({ text: "yo", promptTokens: 4 });
    expect(seen.url).toBe("http://x/v1/chat/completions");
    expect(seen.headers?.["authorization"]).toBe("Bearer k");
  });
  it("HTTP errors and malformed bodies surface as errors", async () => {
    const bad: Fetch = async () => ({ ok: false, status: 500, text: async () => "boom" });
    await expect(ollama("m", { fetch: bad }).generate(req)).rejects.toThrow(/HTTP 500/);
    const junk: Fetch = async () => ({ ok: true, status: 200, text: async () => "not json" });
    await expect(llamacpp({ fetch: junk }).generate(req)).rejects.toThrow();
  });
  it("the committed dry-run fixture matches the reference answers", () => {
    const f = JSON.parse(
      readFileSync(
        new URL("../../../evals/fixtures/reference-answers.json", import.meta.url),
        "utf8",
      ),
    ) as { answers: Record<string, string> };
    expect(f.answers).toEqual(REFERENCE);
  });
});
