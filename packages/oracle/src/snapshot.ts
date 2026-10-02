/** Parse a Playwright `ariaSnapshot()` YAML into a flat, document-ordered list of actual nodes. */
export interface Actual {
  role: string;
  name: string;
  level?: number;
  text?: string;
}

interface Tree extends Actual {
  kids: Tree[];
}

const unq = (s: string): string => {
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2)
    return t.slice(1, -1).replace(/\\(["\\])/g, "$1");
  return t;
};
/** YAML puts a whole entry in single quotes when it contains quotes: `- 'heading "x" [level=1]'`. */
const unwrapSingle = (s: string): string =>
  s.startsWith("'") && s.endsWith("'") && s.length >= 2 ? s.slice(1, -1).replace(/''/g, "'") : s;

const TEXTISH = new Set([
  "text",
  "strong",
  "emphasis",
  "code",
  "mark",
  "insertion",
  "deletion",
  "generic",
]);

function readLine(body: string): Tree | undefined {
  const line = unwrapSingle(body);
  if (line.startsWith("/")) return undefined; // `/url: …` properties
  if (line.startsWith("text:") || line === "text")
    return { role: "text", name: unq(line.replace(/^text:?\s*/, "")), kids: [] };
  const m = /^([a-z][a-z-]*)(?:\s+("(?:[^"\\]|\\.)*"))?((?:\s+\[[^\]]+\])*)\s*:?\s*(.*)$/.exec(
    line,
  );
  if (m === null) return undefined;
  const node: Tree = { role: m[1] as string, name: m[2] !== undefined ? unq(m[2]) : "", kids: [] };
  const lvl = /\[level=(\d+)\]/.exec(m[3] ?? "");
  if (lvl !== null) node.level = Number(lvl[1]);
  const rest = (m[4] ?? "").trim();
  if (rest !== "" && !rest.startsWith("[")) node.text = unq(rest);
  return node;
}

function flatten(n: Tree, out: Actual[]): void {
  const textOf = (t: Tree): string =>
    [t.text ?? t.name, ...t.kids.filter((k) => TEXTISH.has(k.role)).map(textOf)]
      .filter((x) => x !== "")
      .join(" ");
  if (n.role === "paragraph" || n.role === "generic" || TEXTISH.has(n.role)) {
    const own =
      n.role === "paragraph" || n.role === "generic"
        ? [n.text ?? "", ...n.kids.filter((k) => TEXTISH.has(k.role)).map(textOf)]
        : [textOf(n)];
    const joined = own
      .filter((x) => x !== "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (joined !== "") out.push({ role: "text", name: joined });
    for (const k of n.kids) if (!TEXTISH.has(k.role)) flatten(k, out);
    return;
  }
  const { kids, ...rest } = n;
  out.push(rest);
  for (const k of kids) flatten(k, out);
}

export function parseAriaSnapshot(yaml: string): Actual[] {
  const roots: Tree[] = [];
  const stack: { indent: number; node: Tree }[] = [];
  for (const raw of yaml.split("\n")) {
    const m = /^(\s*)-\s+(.*)$/.exec(raw);
    if (m === null) continue;
    const node = readLine(m[2] as string);
    if (node === undefined) continue;
    const indent = (m[1] as string).length;
    while (stack.length > 0 && (stack[stack.length - 1] as { indent: number }).indent >= indent)
      stack.pop();
    const parent = stack[stack.length - 1]?.node;
    (parent === undefined ? roots : parent.kids).push(node);
    stack.push({ indent, node });
  }
  const out: Actual[] = [];
  for (const r of roots) flatten(r, out);
  return out;
}
