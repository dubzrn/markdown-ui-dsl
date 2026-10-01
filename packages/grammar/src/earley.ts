/** Scannerless Earley recogniser over characters: tells whether a document is in the grammar's language. */
import { inSet, type CharSet, type Expr, type Grammar } from "./model.js";

type Sym = { k: "nt"; id: number } | { k: "set"; set: CharSet } | { k: "ch"; c: string };
interface Prod {
  lhs: number;
  rhs: Sym[];
}
export interface Compiled {
  prods: Prod[];
  byLhs: number[][];
  nullable: boolean[];
  start: number;
}

export function compile(g: Grammar): Compiled {
  const ids = new Map<string, number>();
  const prods: Prod[] = [];
  let count = 0;
  const id = (n: string): number => {
    let v = ids.get(n);
    if (v === undefined) {
      v = count++;
      ids.set(n, v);
    }
    return v;
  };
  for (const n of g.rules.keys()) id(n);
  const fresh = (): number => count++;
  const syms = (e: Expr): Sym[] => {
    switch (e.t) {
      case "lit":
        return [...e.s].map((c): Sym => ({ k: "ch", c }));
      case "set":
        return [{ k: "set", set: e.set }];
      case "ref": {
        if (!g.rules.has(e.n)) throw new Error(`grammar: undefined rule ${e.n}`);
        return [{ k: "nt", id: id(e.n) }];
      }
      case "seq":
        return e.xs.flatMap(syms);
      case "alt": {
        const x = fresh();
        for (const b of e.xs) prods.push({ lhs: x, rhs: syms(b) });
        return [{ k: "nt", id: x }];
      }
      case "opt": {
        const x = fresh();
        prods.push({ lhs: x, rhs: [] }, { lhs: x, rhs: syms(e.x) });
        return [{ k: "nt", id: x }];
      }
      case "star": {
        const x = fresh();
        prods.push({ lhs: x, rhs: [] }, { lhs: x, rhs: [...syms(e.x), { k: "nt", id: x }] });
        return [{ k: "nt", id: x }];
      }
      case "plus": {
        const x = fresh();
        const body = syms(e.x);
        prods.push({ lhs: x, rhs: body }, { lhs: x, rhs: [...body, { k: "nt", id: x }] });
        return [{ k: "nt", id: x }];
      }
    }
  };
  for (const [n, e] of g.rules) prods.push({ lhs: id(n), rhs: syms(e) });
  const byLhs: number[][] = Array.from({ length: count }, () => []);
  prods.forEach((p, i) => (byLhs[p.lhs] as number[]).push(i));
  const nullable: boolean[] = new Array<boolean>(count).fill(false);
  for (let changed = true; changed;) {
    changed = false;
    for (const p of prods)
      if (!nullable[p.lhs] && p.rhs.every((s) => s.k === "nt" && nullable[s.id] === true)) {
        nullable[p.lhs] = true;
        changed = true;
      }
  }
  return { prods, byLhs, nullable, start: id(g.start) };
}

export interface RecognizeResult {
  ok: boolean;
  /** Furthest offset the parser could still extend (useful to point at the first unacceptable character). */
  furthest: number;
}

export function recognize(c: Compiled, input: string): RecognizeResult {
  const chars = [...input.replace(/\r\n/g, "\n")];
  const n = chars.length;
  // chart[i]: Map key -> item; item = [prod, dot, origin]
  const chart: Map<number, [number, number, number]>[] = Array.from(
    { length: n + 1 },
    () => new Map(),
  );
  const key = (p: number, d: number, o: number): number => (p * 64 + d) * (n + 1) + o;
  const agenda: [number, number, number][][] = Array.from({ length: n + 1 }, () => []);
  const add = (i: number, p: number, d: number, o: number): void => {
    const k = key(p, d, o);
    const m = chart[i] as Map<number, [number, number, number]>;
    if (m.has(k)) return;
    const it: [number, number, number] = [p, d, o];
    m.set(k, it);
    const next = (c.prods[p] as Prod).rhs[d];
    if (next !== undefined && next.k === "nt") {
      const w = waiting[i] as Map<number, [number, number, number][]>;
      const list = w.get(next.id);
      if (list === undefined) w.set(next.id, [it]);
      else list.push(it);
    }
    (agenda[i] as [number, number, number][]).push(it);
  };
  // waiting[i]: nonterminal -> items at position i that wait for it (completion looks here, not through the whole chart)
  const waiting: Map<number, [number, number, number][]>[] = Array.from(
    { length: n + 1 },
    () => new Map(),
  );
  for (const p of c.byLhs[c.start] as number[]) add(0, p, 0, 0);
  let furthest = 0;
  for (let i = 0; i <= n; i++) {
    const todo = agenda[i] as [number, number, number][];
    if (todo.length > 0) furthest = i;
    for (let q = 0; q < todo.length; q++) {
      const [pi, dot, origin] = todo[q] as [number, number, number];
      const prod = c.prods[pi] as Prod;
      const sym = prod.rhs[dot];
      if (sym === undefined) {
        // complete: advance every item at `origin` that was waiting for this nonterminal
        const w = (waiting[origin] as Map<number, [number, number, number][]>).get(prod.lhs);
        if (w !== undefined)
          for (let j = 0; j < w.length; j++) {
            const it = w[j] as [number, number, number];
            add(i, it[0], it[1] + 1, it[2]);
          }
      } else if (sym.k === "nt") {
        for (const p2 of c.byLhs[sym.id] as number[]) add(i, p2, 0, i);
        if (c.nullable[sym.id] === true) add(i, pi, dot + 1, origin);
      } else {
        const ch = chars[i];
        if (ch !== undefined && (sym.k === "ch" ? sym.c === ch : inSet(sym.set, ch)))
          add(i + 1, pi, dot + 1, origin);
      }
    }
  }
  let ok = false;
  for (const [, it] of chart[n] as Map<number, [number, number, number]>) {
    const p = c.prods[it[0]] as Prod;
    if (p.lhs === c.start && it[1] === p.rhs.length && it[2] === 0) ok = true;
  }
  return { ok, furthest };
}

/** Convenience: compile once per grammar, reuse across inputs. */
export function recognizer(g: Grammar): (input: string) => RecognizeResult {
  const c = compile(g);
  return (input) => recognize(c, input);
}
