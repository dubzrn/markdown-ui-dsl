export interface Report {
  features: string[];
  reqs: string[];
  tasks: string[];
  errors: string[];
}

const FEATURE_ROW = /^(?:\|\s*\*\*|### )([A-Z]{3}-\d{2})(?:\*\*\s*\||\s—)/gm;
const REQ_DEF = /^- \*\*(REQ-[A-Z]{3}-\d{2}[a-z]?)\*\*/gm;
const TASK_HEAD = /^### (T-\d{3})\b/gm;

const all = (re: RegExp, text: string): string[] =>
  [...text.matchAll(re)].flatMap((m) => (m[1] === undefined ? [] : [m[1]]));

/** Split TASKS.md into per-task blocks: id -> text until the next task heading. */
function taskBlocks(tasks: string): Map<string, string> {
  const heads = [...tasks.matchAll(TASK_HEAD)];
  const out = new Map<string, string>();
  heads.forEach((h, i) => {
    const end = heads[i + 1]?.index ?? tasks.length;
    out.set(h[1] ?? "", tasks.slice(h.index, end));
  });
  return out;
}

export function checkTraceability(features: string, spec: string, tasks: string): Report {
  const featureIds = [...new Set(all(FEATURE_ROW, features))];
  const reqIds = [...new Set(all(REQ_DEF, spec))];
  const blocks = taskBlocks(tasks);
  const errors: string[] = [];
  const usedFeatures = new Set<string>();
  const usedReqs = new Set<string>();

  for (const [id, block] of blocks) {
    const line = block.split("\n").find((l) => l.includes("Implements:")) ?? "";
    const impl = line.split("Implements:")[1]?.split("· REQ:")[0] ?? "";
    const req = line.split("· REQ:")[1] ?? "";
    for (const f of impl.match(/\b[A-Z]{3}-\d{2}\b/g) ?? []) {
      usedFeatures.add(f);
      if (!featureIds.includes(f)) errors.push(`${id}: unknown feature ${f}`);
    }
    for (const r of req.match(/REQ-[A-Z]{3}-\d{2}[a-z]?/g) ?? []) {
      usedReqs.add(r);
      // a bare REQ-NOV-01 stands for its lettered sub-requirements (REQ-NOV-01a, -01b, ...)
      if (!reqIds.some((d) => d === r || d.slice(0, -1) === r))
        errors.push(`${id}: unknown requirement ${r}`);
    }
  }
  for (const f of featureIds) if (!usedFeatures.has(f)) errors.push(`feature ${f} has no task`);
  for (const r of reqIds)
    if (!usedReqs.has(r) && !usedReqs.has(r.slice(0, -1)))
      errors.push(`requirement ${r} has no task`);
  return { features: featureIds, reqs: reqIds, tasks: [...blocks.keys()], errors };
}
