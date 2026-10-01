/** Flow documents (`type: flow`): screens table + transitions list → navigation graph (T-025, RFC-0001 §3d). */
import type { BlockNode, Document } from "./ast.js";

export interface FlowScreen {
  id: string;
  file: string;
  terminal: boolean;
  line: number;
}
export interface FlowTransition {
  from: string;
  action: string;
  to: string;
  when?: string;
  line: number;
}
export interface Flow {
  start: string | undefined;
  screens: FlowScreen[];
  transitions: FlowTransition[];
  problems: { line: number; message: string }[];
}

const TRANSITION_RE =
  /^([A-Za-z][\w-]*) #([A-Za-z][\w-]*) -> ([A-Za-z][\w-]*)(?: \[when: (.+)\])?$/;
const TRUE = ["yes", "true", "x", "✓", "terminal", "1"];

/** Build the flow model from a parsed `type: flow` document. */
export function extractFlow(doc: Document): Flow {
  const flow: Flow = {
    start: typeof doc.meta["start"] === "string" ? doc.meta["start"] : undefined,
    screens: [],
    transitions: [],
    problems: [],
  };
  let section: "screens" | "transitions" | undefined;
  const visit = (nodes: BlockNode[]): void => {
    for (const n of nodes) {
      if (n.kind === "heading") {
        const t = n.text.toLowerCase();
        section = t === "screens" ? "screens" : t === "transitions" ? "transitions" : undefined;
      } else if (n.kind === "table" && section === "screens") {
        const h = n.header.map((x) => x.toLowerCase());
        const iId = h.indexOf("id");
        const iFile = h.indexOf("file");
        const iTerm = h.indexOf("terminal");
        if (iId === -1 || iFile === -1) {
          flow.problems.push({
            line: n.span.start.line,
            message: "Screens table needs `id` and `file` columns.",
          });
          continue;
        }
        n.rows.forEach((r, k) => {
          flow.screens.push({
            id: r[iId] ?? "",
            file: r[iFile] ?? "",
            terminal: iTerm !== -1 && TRUE.includes((r[iTerm] ?? "").toLowerCase()),
            line: n.span.start.line + 2 + k,
          });
        });
      } else if (n.kind === "list" && section === "transitions") {
        for (const item of n.children) {
          const m = TRANSITION_RE.exec(item.text.trim());
          if (m === null) {
            flow.problems.push({
              line: item.span.start.line,
              message: "Transition must be `- <screen> #<action> -> <screen> [when: text]`.",
            });
            continue;
          }
          const t: FlowTransition = {
            from: m[1] as string,
            action: m[2] as string,
            to: m[3] as string,
            line: item.span.start.line,
          };
          if (m[4] !== undefined) t.when = m[4];
          flow.transitions.push(t);
        }
      }
    }
  };
  visit(doc.body);
  return flow;
}

export interface FlowAnalysis {
  /** Screens reachable from `start`, with shortest-path depth (start = 0). */
  depth: Map<string, number>;
  unreachable: string[];
  /** Non-terminal screens with no outgoing transition. */
  deadEnds: string[];
  /** Screens that lie on a cycle. */
  cyclic: string[];
}

export function analyzeFlow(flow: Flow): FlowAnalysis {
  const out = new Map<string, string[]>();
  for (const s of flow.screens) out.set(s.id, []);
  for (const t of flow.transitions) out.get(t.from)?.push(t.to);
  const depth = new Map<string, number>();
  if (flow.start !== undefined && out.has(flow.start)) {
    depth.set(flow.start, 0);
    const queue = [flow.start];
    for (let q = queue.shift(); q !== undefined; q = queue.shift()) {
      for (const next of out.get(q) ?? []) {
        if (!depth.has(next) && out.has(next)) {
          depth.set(next, (depth.get(q) ?? 0) + 1);
          queue.push(next);
        }
      }
    }
  }
  const ids = flow.screens.map((s) => s.id);
  const unreachable = ids.filter((id) => !depth.has(id));
  const deadEnds = flow.screens
    .filter((s) => !s.terminal && (out.get(s.id)?.length ?? 0) === 0)
    .map((s) => s.id);
  const cyclic = ids.filter((id) => {
    const seen = new Set<string>();
    const stack = [...(out.get(id) ?? [])];
    for (let n = stack.pop(); n !== undefined; n = stack.pop()) {
      if (n === id) return true;
      if (seen.has(n)) continue;
      seen.add(n);
      stack.push(...(out.get(n) ?? []));
    }
    return false;
  });
  return { depth, unreachable, deadEnds, cyclic };
}
