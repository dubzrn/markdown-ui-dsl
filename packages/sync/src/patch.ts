/** Spec patcher (T-075): turn a spec unit into the code unit's items with minimal line edits. */
import { parse, printInline, type InlineNode } from "@mdui/core";
import type { ItemOp } from "./classify.js";
import { norm, type Item } from "./fingerprint.js";
import { specUnits } from "./spec.js";
import { assignAnchors } from "./anchors.js";
import type { Lock } from "./lock.js";

/** DSL line for an item (no indentation). */
export function renderItem(i: Item): string {
  const slug =
    norm(i.label)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "action";
  const one = (n: InlineNode): string => printInline([n], { style: "pretty" });
  switch (i.role) {
    case "heading":
      return `${"#".repeat(Math.min(6, Math.max(1, i.level ?? 2)))} ${i.label}`;
    case "button":
      return one({ kind: "button", label: i.label, action: `#${slug}` });
    case "link":
      return one({ kind: "link", label: i.label, target: i.href ?? "#" });
    case "textbox":
      return one({ kind: "input", placeholder: i.label });
    case "checkbox":
      return one({ kind: "checkbox", checked: false, label: i.label });
    case "radio":
      return one({ kind: "radio", checked: false, label: i.label });
    case "switch":
      return one({ kind: "toggle", on: false, label: i.label });
    case "combobox":
      return one({ kind: "dropdown", label: i.label });
    case "img":
      return one({ kind: "image", description: i.label });
  }
}

type Edit =
  | { kind: "replace"; line: number; text: string }
  | { kind: "delete"; line: number }
  | { kind: "insert"; after: number; text: string; indent: string };

export interface PatchResult {
  source: string;
  /** Operations that could not be applied by a minimal edit (the unit is left untouched when any are present). */
  skipped: string[];
}

const indentOf = (l: string): string => /^[ \t]*/.exec(l)?.[0] ?? "";

function replaceOnce(line: string, from: string, to: string): string | undefined {
  if (from === "") return undefined;
  const first = line.indexOf(from);
  if (first === -1 || line.indexOf(from, first + 1) !== -1) return undefined;
  return line.slice(0, first) + to + line.slice(first + from.length);
}

/**
 * Edit the unit `anchor` of `source` so its items equal `target`. `lock` is only used to name units.
 * All-or-nothing per unit: if any operation cannot be applied minimally the source is returned unchanged with `skipped` set.
 */
export function patchUnit(
  source: string,
  anchor: string,
  ops: ItemOp[],
  lock: Lock | undefined,
): PatchResult {
  const { units, doc } = (() => {
    const r = specUnits(source);
    return { units: assignAnchors(r.units, lock).units, doc: r.doc };
  })();
  const unit = units.find((u) => u.anchor === anchor);
  if (unit === undefined) return { source, skipped: [`no unit "${anchor}" in the spec`] };
  const lines = source.split("\n");
  const perLine = new Map<number, number>();
  for (const it of unit.items) perLine.set(it.line ?? 0, (perLine.get(it.line ?? 0) ?? 0) + 1);
  const edits: Edit[] = [];
  const skipped: string[] = [];
  const firstLine = unit.span?.start.line ?? doc.frontmatter?.span.end.line ?? 0;
  let last = firstLine;
  const openerIndent =
    unit.span !== undefined ? indentOf(lines[unit.span.start.line - 1] ?? "") + "  " : "";
  for (const op of ops) {
    if (op.op === "keep") {
      last = (op.from as Item).line ?? last;
    } else if (op.op === "change") {
      const f = op.from as Item;
      const t = op.to as Item;
      const ln = f.line ?? 0;
      const cur = lines[ln - 1] ?? "";
      let next: string | undefined = cur;
      if (f.role === "heading")
        next = cur.replace(
          /^(\s*)#+\s+.*$/,
          `$1${"#".repeat(Math.min(6, t.level ?? 2))} ${t.label}`,
        );
      else {
        if (f.label !== t.label) next = replaceOnce(next, f.label, t.label);
        if (next !== undefined && f.role === "link" && (f.href ?? "") !== (t.href ?? ""))
          next = replaceOnce(next, `(${f.href ?? ""})`, `(${t.href ?? ""})`);
      }
      if (next === undefined || next === cur)
        skipped.push(`cannot change ${f.role} "${f.label}" on line ${ln} minimally`);
      else edits.push({ kind: "replace", line: ln, text: next });
      last = ln;
    } else if (op.op === "remove") {
      const f = op.from as Item;
      const ln = f.line ?? 0;
      if ((perLine.get(ln) ?? 0) === 1) edits.push({ kind: "delete", line: ln });
      else skipped.push(`cannot remove ${f.role} "${f.label}": line ${ln} holds several items`);
    } else {
      const t = op.to as Item;
      const ref = lines[last - 1];
      const indent = last === firstLine ? openerIndent : indentOf(ref ?? "");
      edits.push({ kind: "insert", after: last, text: renderItem(t), indent });
    }
  }
  if (skipped.length > 0) return { source, skipped };
  const del = new Set(
    edits
      .filter((e): e is Extract<Edit, { kind: "delete" }> => e.kind === "delete")
      .map((e) => e.line),
  );
  const rep = new Map(
    edits
      .filter((e): e is Extract<Edit, { kind: "replace" }> => e.kind === "replace")
      .map((e) => [e.line, e.text]),
  );
  const ins = new Map<number, string[]>();
  for (const e of edits)
    if (e.kind === "insert") ins.set(e.after, [...(ins.get(e.after) ?? []), e.indent + e.text]);
  const out: string[] = [...(ins.get(0) ?? [])];
  lines.forEach((l, i) => {
    const n = i + 1;
    if (!del.has(n)) out.push(rep.get(n) ?? l);
    out.push(...(ins.get(n) ?? []));
  });
  return { source: out.join("\n"), skipped };
}

/** Append a new unit for an anchor that exists only in code. */
export function appendUnit(source: string, anchor: string, items: readonly Item[]): string {
  const body = items.map((i) => `  ${renderItem(i)}`).join("\n");
  const sep = source.endsWith("\n") ? "" : "\n";
  return `${source}${sep}\n::: CARD :::{: #${anchor} }\n${body}${body === "" ? "" : "\n"}--- END ---\n`;
}

export { parse };
