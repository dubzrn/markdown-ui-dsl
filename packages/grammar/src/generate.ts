/** Seeded random derivations from a grammar: strings the grammar accepts, for parity fuzzing and examples. */
import { inSet, type CharSet, type Expr, type Grammar } from "./model.js";

export interface GenerateOptions {
  /** Deepest container nesting to generate (default 3). */
  maxNest?: number;
  /** Soft cap on characters before the generator starts picking minimal alternatives (default 700). */
  budget?: number;
}

/** Characters the generator draws from: nothing that could form syntax by accident. */
const SAFE = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Minimum derivation length per expression (fixpoint over rules). */
function minSizes(g: Grammar): Map<string, number> {
  const min = new Map<string, number>();
  for (const n of g.rules.keys()) min.set(n, Infinity);
  const size = (e: Expr): number => {
    switch (e.t) {
      case "lit":
        return [...e.s].length;
      case "set":
        return 1;
      case "ref":
        return min.get(e.n) ?? Infinity;
      case "seq":
        return e.xs.reduce((a, x) => a + size(x), 0);
      case "alt":
        return Math.min(...e.xs.map(size));
      case "star":
      case "opt":
        return 0;
      case "plus":
        return size(e.x);
    }
  };
  for (let changed = true; changed;) {
    changed = false;
    for (const [n, e] of g.rules) {
      const s = size(e);
      if (s < (min.get(n) ?? Infinity)) {
        min.set(n, s);
        changed = true;
      }
    }
  }
  return min;
}

export function generator(g: Grammar, opts: GenerateOptions = {}): (seed: number) => string {
  const min = minSizes(g);
  const maxNest = opts.maxNest ?? 3;
  const budget = opts.budget ?? 700;
  const sizeOf = (e: Expr): number => {
    switch (e.t) {
      case "lit":
        return [...e.s].length;
      case "set":
        return 1;
      case "ref":
        return min.get(e.n) ?? Infinity;
      case "seq":
        return e.xs.reduce((a, x) => a + sizeOf(x), 0);
      case "alt":
        return Math.min(...e.xs.map(sizeOf));
      case "star":
      case "opt":
        return 0;
      case "plus":
        return sizeOf(e.x);
    }
  };
  return (seed) => {
    const rnd = mulberry32(seed);
    let out = "";
    let nest = 0;
    const pick = (set: CharSet): string => {
      const pool = [...SAFE].filter((c) => inSet(set, c));
      if (pool.length > 0) return pool[Math.floor(rnd() * pool.length)] as string;
      for (let c = 33; c < 127; c++)
        if (inSet(set, String.fromCharCode(c))) return String.fromCharCode(c);
      throw new Error("generator: empty character set");
    };
    const tight = (): boolean => out.length > budget;
    const gen = (e: Expr): void => {
      switch (e.t) {
        case "lit":
          out += e.s;
          return;
        case "set":
          out += pick(e.set);
          return;
        case "ref": {
          const body = g.rules.get(e.n);
          if (body === undefined) throw new Error(`generator: undefined rule ${e.n}`);
          const container = e.n.startsWith("blocks");
          if (container) nest++;
          gen(body);
          if (container) nest--;
          return;
        }
        case "seq":
          for (const x of e.xs) gen(x);
          return;
        case "alt": {
          if (tight() || nest > maxNest) {
            const best = Math.min(...e.xs.map(sizeOf));
            const cands = e.xs.filter((x) => sizeOf(x) === best);
            gen(cands[Math.floor(rnd() * cands.length)] as Expr);
          } else gen(e.xs[Math.floor(rnd() * e.xs.length)] as Expr);
          return;
        }
        case "opt":
          if (!tight() && nest <= maxNest && rnd() < 0.4) gen(e.x);
          return;
        case "star": {
          let n = 0;
          while (!tight() && nest <= maxNest && n < 8 && rnd() < 0.78) {
            gen(e.x);
            n++;
          }
          return;
        }
        case "plus": {
          gen(e.x);
          let n = 0;
          while (!tight() && nest <= maxNest && n < 5 && rnd() < 0.5) {
            gen(e.x);
            n++;
          }
          return;
        }
      }
    };
    gen({ t: "ref", n: g.start });
    return out;
  };
}
