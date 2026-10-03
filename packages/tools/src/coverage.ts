/** SDD interoperability (T-056): which requirements do the `.ui.md` specs cover (`requirements:` frontmatter)? */
import { parse, type YamlValue } from "@vrillabs/mdui-core";

/** Spec Kit style identifiers: FR-001, REQ-QLT-04, NFR-2. */
const ID_RE = /\b[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d+\b/g;

export interface Requirement {
  id: string;
  /** Where it was found, e.g. `spec-kit`, `openspec`, `kiro`. */
  style: "id" | "openspec" | "kiro";
  line: number;
}

/**
 * Requirement identifiers in a requirements document. Understands
 * Spec Kit (`FR-001`), OpenSpec (`### Requirement: Name`) and Kiro (`### Requirement 1: Title`).
 * Fenced code is skipped. Order and duplicates are normalised (first occurrence wins).
 */
export function extractRequirements(text: string): Requirement[] {
  const out: Requirement[] = [];
  const seen = new Set<string>();
  const add = (r: Requirement): void => {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      out.push(r);
    }
  };
  let fence = false;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (line.startsWith("```")) {
      fence = !fence;
      return;
    }
    if (fence) return;
    const open = /^#{2,4}\s+Requirement:\s+(.+?)\s*$/.exec(line);
    if (open !== null) return add({ id: open[1] as string, style: "openspec", line: i + 1 });
    const kiro = /^#{2,4}\s+Requirement\s+(\d+(?:\.\d+)*)\b/.exec(line);
    if (kiro !== null) return add({ id: kiro[1] as string, style: "kiro", line: i + 1 });
    for (const m of line.matchAll(ID_RE)) add({ id: m[0], style: "id", line: i + 1 });
  });
  return out;
}

export interface DeclaredRequirements {
  ids: string[];
  /** Entries that are not a non-empty string/number. */
  malformed: number;
}

/** `requirements:` from a spec's frontmatter (a list, or a single value). */
export function declaredRequirements(source: string): DeclaredRequirements {
  const v: YamlValue | undefined = parse(source).meta["requirements"];
  if (v === undefined || v === null) return { ids: [], malformed: 0 };
  const list = Array.isArray(v) ? v : [v];
  const ids: string[] = [];
  let malformed = 0;
  for (const e of list) {
    if ((typeof e === "string" && e.trim() !== "") || typeof e === "number")
      ids.push(String(e).trim());
    else malformed++;
  }
  return { ids, malformed };
}

export interface CoverageReport {
  /** Requirement id -> specs that cover it. */
  covered: Record<string, string[]>;
  uncovered: string[];
  /** Referenced by a spec but absent from the requirements document. */
  unknown: { id: string; path: string }[];
  totals: { requirements: number; covered: number };
}

/** A reference `1.3` covers requirement `1` (Kiro acceptance criterion). */
const parentOf = (id: string): string | undefined =>
  /^\d+\.\d+/.test(id) ? id.split(".")[0] : undefined;

export function coverage(
  requirements: Requirement[],
  specs: { path: string; source: string }[],
): CoverageReport {
  const known = new Set(requirements.map((r) => r.id));
  const covered: Record<string, string[]> = Object.create(null) as Record<string, string[]>;
  const unknown: { id: string; path: string }[] = [];
  for (const s of [...specs].sort((a, b) => a.path.localeCompare(b.path))) {
    for (const id of new Set(declaredRequirements(s.source).ids)) {
      const target = known.has(id)
        ? id
        : parentOf(id) !== undefined && known.has(parentOf(id) as string)
          ? (parentOf(id) as string)
          : undefined;
      if (target === undefined) unknown.push({ id, path: s.path });
      else (covered[target] ??= []).push(s.path);
    }
  }
  const uncovered = requirements.map((r) => r.id).filter((id) => covered[id] === undefined);
  return {
    covered,
    uncovered,
    unknown,
    totals: { requirements: requirements.length, covered: requirements.length - uncovered.length },
  };
}

export function formatCoverage(r: CoverageReport): string {
  const lines = [`requirements covered: ${r.totals.covered}/${r.totals.requirements}`];
  for (const id of r.uncovered) lines.push(`  uncovered: ${id}`);
  for (const u of r.unknown) lines.push(`  unknown requirement ${u.id} (in ${u.path})`);
  return lines.join("\n") + "\n";
}
