import { buildGrammar, toGbnf } from "@mdui/grammar";
import type { Catalog } from "@mdui/catalog";
import { composePrompt } from "@mdui/tools";
import type { Provider } from "./provider.js";
import { scoreAnswer, wilson, type Score } from "./score.js";
import type { Task } from "./tasks.js";

export type Context = "none" | "skill" | "prompt";
export interface Arm {
  context: Context;
  /** Grammar-constrained decoding (needs a provider with `supportsGrammar`). */
  constrained: boolean;
}
export const armName = (a: Arm): string => `${a.context}${a.constrained ? "+grammar" : ""}`;

export interface Contexts {
  /** Text of the shipped skill (SKILL.md plus the syntax reference). */
  skill: string;
}

/** System text for an arm. `prompt` is the generated, used-constructs-only prompt (`mdui prompt`). */
export function systemFor(arm: Arm, task: Task, ctx: Contexts): string | undefined {
  if (arm.context === "none") return undefined;
  if (arm.context === "skill") return ctx.skill;
  const documents = task.kind === "generate" ? [] : [{ path: "spec.ui.md", source: specOf(task) }];
  return composePrompt({ documents, all: task.kind === "generate", agent: "generic" });
}
const specOf = (t: Task): string =>
  /```markdown\n([\s\S]*?)```/.exec(t.prompt)?.[1] ?? "---\ndsl: 2.0\n---\n";

export interface RunOptions {
  provider: Provider;
  tasks: Task[];
  arms: Arm[];
  contexts: Contexts;
  catalog?: Catalog;
  /** Seeds per (task, arm); results at temperature > 0 vary by seed. */
  seeds?: number[];
  temperature?: number;
  maxTokens?: number;
  /** DSL version of the constrained grammar. */
  onResult?: (r: RunResult) => void;
}

export interface RunResult {
  provider: string;
  arm: string;
  taskId: string;
  kind: Task["kind"];
  seed: number;
  answer: string;
  score: Score;
  promptTokens?: number;
  completionTokens?: number;
  ms: number;
  error?: string;
}

/** Grammar for a task: DSL version from the task, catalog-specialised when a catalog is given. */
export function grammarFor(task: Task, catalog?: Catalog): string {
  return toGbnf(
    buildGrammar({ dsl: task.dsl, ...(catalog !== undefined ? { catalog } : {}), maxDepth: 4 }),
  );
}

export async function run(o: RunOptions): Promise<RunResult[]> {
  const out: RunResult[] = [];
  const seeds = o.seeds ?? [1];
  for (const arm of o.arms) {
    if (arm.constrained && !o.provider.supportsGrammar)
      throw new Error(
        `${o.provider.id} cannot enforce a grammar; drop the +grammar arms or use the llamacpp provider`,
      );
    for (const task of o.tasks)
      for (const seed of seeds) {
        const system = systemFor(arm, task, o.contexts);
        const base = {
          provider: o.provider.id,
          arm: armName(arm),
          taskId: task.id,
          kind: task.kind,
          seed,
        };
        try {
          const g = await o.provider.generate({
            ...(system !== undefined ? { system } : {}),
            prompt: task.prompt,
            ...(arm.constrained ? { grammar: grammarFor(task, o.catalog) } : {}),
            seed,
            temperature: o.temperature ?? 0,
            maxTokens: o.maxTokens ?? 1500,
            meta: { taskId: task.id, arm: armName(arm) },
          });
          const r: RunResult = {
            ...base,
            answer: g.text,
            score: scoreAnswer(task, g.text, o.catalog !== undefined ? { catalog: o.catalog } : {}),
            ms: g.ms,
            ...(g.promptTokens !== undefined ? { promptTokens: g.promptTokens } : {}),
            ...(g.completionTokens !== undefined ? { completionTokens: g.completionTokens } : {}),
          };
          out.push(r);
          o.onResult?.(r);
        } catch (e) {
          // a provider failure is recorded, not scored as a model failure
          const r: RunResult = {
            ...base,
            answer: "",
            score: scoreAnswer(task, ""),
            ms: 0,
            error: e instanceof Error ? e.message : String(e),
          };
          out.push(r);
          o.onResult?.(r);
        }
      }
  }
  return out;
}

export interface Cell {
  provider: string;
  arm: string;
  n: number;
  errors: number;
  pass: number;
  valid: number;
  onlyDsl: number;
  nesting: number;
  catalogErrors: number;
  meanCompletionTokens?: number;
  meanPromptTokens?: number;
  meanMs: number;
  passCI: [number, number];
  validCI: [number, number];
  byKind: Record<string, { n: number; pass: number }>;
}

/** Aggregate per (provider, arm). Provider failures are excluded from `n` and counted in `errors`. */
export function summarise(results: readonly RunResult[]): Cell[] {
  const keys = [...new Set(results.map((r) => `${r.provider}\u0000${r.arm}`))];
  return keys.map((k) => {
    const [provider, arm] = k.split("\u0000") as [string, string];
    const all = results.filter((r) => r.provider === provider && r.arm === arm);
    const rs = all.filter((r) => r.error === undefined);
    const mean = (f: (r: RunResult) => number | undefined): number | undefined => {
      const v = rs.map(f).filter((x): x is number => x !== undefined);
      return v.length === 0 ? undefined : v.reduce((a, b) => a + b, 0) / v.length;
    };
    const pass = rs.filter((r) => r.score.pass).length;
    const valid = rs.filter((r) => r.score.valid).length;
    const byKind: Cell["byKind"] = {};
    for (const r of rs) {
      const c = (byKind[r.kind] ??= { n: 0, pass: 0 });
      c.n++;
      if (r.score.pass) c.pass++;
    }
    const mct = mean((r) => r.completionTokens);
    const mpt = mean((r) => r.promptTokens);
    return {
      provider,
      arm,
      n: rs.length,
      errors: all.length - rs.length,
      pass,
      valid,
      onlyDsl: rs.filter((r) => r.score.onlyDsl).length,
      nesting: rs.filter((r) => r.score.nestingErrors > 0).length,
      catalogErrors: rs.filter((r) => r.score.catalogErrors > 0).length,
      ...(mct !== undefined ? { meanCompletionTokens: mct } : {}),
      ...(mpt !== undefined ? { meanPromptTokens: mpt } : {}),
      meanMs: mean((r) => r.ms) ?? 0,
      passCI: wilson(pass, rs.length),
      validCI: wilson(valid, rs.length),
      byKind,
    };
  });
}
