/** Provider adapters (T-063): the harness only needs "prompt in, text out", so any runner can replace these. */
export interface GenerateRequest {
  system?: string;
  prompt: string;
  /** GBNF grammar; only `llamacpp` can enforce it. */
  grammar?: string;
  seed: number;
  temperature: number;
  maxTokens: number;
  /** Identifies the task and arm; used only by the replay provider, never sent to a model. */
  meta?: { taskId: string; arm: string };
}
export interface Generation {
  text: string;
  promptTokens?: number;
  completionTokens?: number;
  ms: number;
}
export interface Provider {
  /** Stable label used in reports, e.g. `ollama:ornith-1.5:9b`. */
  id: string;
  /** Can this provider enforce a grammar? Requests with `grammar` are refused otherwise rather than silently ignored. */
  supportsGrammar: boolean;
  generate(req: GenerateRequest): Promise<Generation>;
}

export type Fetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

const post = async (
  f: Fetch,
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
  timeoutMs = 600_000,
): Promise<unknown> => {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await f(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text) as unknown;
  } finally {
    clearTimeout(timer);
  }
};
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const str = (v: unknown): string => (typeof v === "string" ? v : "");

const defaultFetch: Fetch = (url, init) =>
  fetch(url, init as RequestInit) as unknown as ReturnType<Fetch>;

/** Ollama `/api/generate`. Ollama's API takes a JSON-schema `format` but no GBNF, so this provider cannot enforce a grammar. */
export function ollama(
  model: string,
  opts: {
    baseUrl?: string;
    fetch?: Fetch;
    /** Context window; Ollama's default is small enough to cut the skill arm's prompt silently. */ numCtx?: number;
  } = {},
): Provider {
  const base = (opts.baseUrl ?? "http://localhost:11434").replace(/\/$/, "");
  const f = opts.fetch ?? defaultFetch;
  return {
    id: `ollama:${model}`,
    supportsGrammar: false,
    async generate(req) {
      if (req.grammar !== undefined)
        throw new Error(
          "ollama cannot enforce a GBNF grammar; use the llamacpp provider for constrained arms",
        );
      const t0 = Date.now();
      const r = (await post(f, `${base}/api/generate`, {
        model,
        prompt: req.prompt,
        ...(req.system !== undefined ? { system: req.system } : {}),
        stream: false,
        options: {
          temperature: req.temperature,
          seed: req.seed,
          num_predict: req.maxTokens,
          ...(opts.numCtx !== undefined ? { num_ctx: opts.numCtx } : {}),
        },
      })) as Record<string, unknown>;
      return {
        text: str(r["response"]),
        ...(num(r["prompt_eval_count"]) !== undefined
          ? { promptTokens: num(r["prompt_eval_count"]) as number }
          : {}),
        ...(num(r["eval_count"]) !== undefined
          ? { completionTokens: num(r["eval_count"]) as number }
          : {}),
        ms: Date.now() - t0,
      };
    },
  };
}

/** llama.cpp `llama-server` `/completion`: the engine that takes `grammar` (GBNF). */
export function llamacpp(opts: { baseUrl?: string; label?: string; fetch?: Fetch } = {}): Provider {
  const base = (opts.baseUrl ?? "http://localhost:8080").replace(/\/$/, "");
  const f = opts.fetch ?? defaultFetch;
  return {
    id: `llamacpp:${opts.label ?? base}`,
    supportsGrammar: true,
    async generate(req) {
      const t0 = Date.now();
      const prompt = req.system !== undefined ? `${req.system}\n\n${req.prompt}` : req.prompt;
      const r = (await post(f, `${base}/completion`, {
        prompt,
        temperature: req.temperature,
        seed: req.seed,
        n_predict: req.maxTokens,
        ...(req.grammar !== undefined ? { grammar: req.grammar } : {}),
      })) as Record<string, unknown>;
      return {
        text: str(r["content"]),
        ...(num(r["tokens_evaluated"]) !== undefined
          ? { promptTokens: num(r["tokens_evaluated"]) as number }
          : {}),
        ...(num(r["tokens_predicted"]) !== undefined
          ? { completionTokens: num(r["tokens_predicted"]) as number }
          : {}),
        ms: Date.now() - t0,
      };
    },
  };
}

/** Any OpenAI-compatible `/v1/chat/completions` endpoint (hosted or local). No grammar support here. */
export function openaiCompatible(
  model: string,
  opts: { baseUrl: string; apiKey?: string; fetch?: Fetch },
): Provider {
  const base = opts.baseUrl.replace(/\/$/, "");
  const f = opts.fetch ?? defaultFetch;
  return {
    id: `openai:${model}`,
    supportsGrammar: false,
    async generate(req) {
      if (req.grammar !== undefined) throw new Error("this provider does not enforce grammars");
      const t0 = Date.now();
      const r = (await post(
        f,
        `${base}/chat/completions`,
        {
          model,
          temperature: req.temperature,
          seed: req.seed,
          max_tokens: req.maxTokens,
          messages: [
            ...(req.system !== undefined ? [{ role: "system", content: req.system }] : []),
            { role: "user", content: req.prompt },
          ],
        },
        opts.apiKey !== undefined ? { authorization: `Bearer ${opts.apiKey}` } : {},
      )) as { choices?: { message?: { content?: unknown } }[]; usage?: Record<string, unknown> };
      return {
        text: str(r.choices?.[0]?.message?.content),
        ...(num(r.usage?.["prompt_tokens"]) !== undefined
          ? { promptTokens: num(r.usage?.["prompt_tokens"]) as number }
          : {}),
        ...(num(r.usage?.["completion_tokens"]) !== undefined
          ? { completionTokens: num(r.usage?.["completion_tokens"]) as number }
          : {}),
        ms: Date.now() - t0,
      };
    },
  };
}

/** Replays recorded outputs keyed by `taskId|arm`; used for dry runs and tests, never a source of results. */
export function replay(
  recorded: Record<string, string>,
  label = "recorded",
  opts: { grammar?: boolean } = {},
): Provider & { key: (taskId: string, arm: string) => string } {
  const key = (taskId: string, arm: string): string => `${taskId}|${arm}`;
  return {
    id: `mock:${label}`,
    supportsGrammar: opts.grammar === true,
    key,
    async generate(req) {
      const text =
        req.meta !== undefined ? recorded[key(req.meta.taskId, req.meta.arm)] : undefined;
      if (text === undefined)
        throw new Error(
          `no recorded output for ${req.meta !== undefined ? key(req.meta.taskId, req.meta.arm) : "this request"}`,
        );
      return { text, completionTokens: Math.ceil(text.length / 4), ms: 0 };
    },
  };
}
