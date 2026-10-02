/** `.ui.lock` (T-072): committed JSON recording the last agreed state. Deterministic key order, versioned, strictly validated. */
import { fingerprintHash, snapshot, type Item, type Role } from "./fingerprint.js";

export const LOCK_VERSION = 1;

export interface LockSide {
  hash: string;
  items: Item[];
}
export interface LockUnit {
  kind: string;
  spec: LockSide;
  code?: LockSide & { path: string };
}
export interface LockWaiver {
  rule: string;
  reason: string;
  line: number;
  anchor?: string;
}
export interface Lock {
  version: typeof LOCK_VERSION;
  dsl: string;
  spec: { path: string; hash: string };
  anchors: Record<string, LockUnit>;
  waivers: LockWaiver[];
}

export const side = (items: readonly Item[]): LockSide => ({
  hash: fingerprintHash(items),
  items: snapshot(items),
});

export function emptyLock(specPath: string, dsl: string, specHash: string): Lock {
  return {
    version: LOCK_VERSION,
    dsl,
    spec: { path: specPath, hash: specHash },
    anchors: Object.create(null) as Lock["anchors"],
    waivers: [],
  };
}

const ROLES: readonly string[] = [
  "button",
  "link",
  "textbox",
  "checkbox",
  "radio",
  "switch",
  "combobox",
  "heading",
  "img",
];

/** Canonical text: sorted keys everywhere, 2-space indent, trailing newline. Same lock, same bytes. */
export function serializeLock(lock: Lock): string {
  const sorted = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sorted);
    if (v !== null && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .filter(([, x]) => x !== undefined)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, x]) => [k, sorted(x)]),
      );
    return v;
  };
  return JSON.stringify(sorted(lock), null, 2) + "\n";
}

const isItem = (x: unknown): x is Item => {
  if (x === null || typeof x !== "object") return false;
  const i = x as Record<string, unknown>;
  return (
    typeof i["role"] === "string" &&
    ROLES.includes(i["role"]) &&
    typeof i["label"] === "string" &&
    (i["href"] === undefined || typeof i["href"] === "string") &&
    (i["level"] === undefined || typeof i["level"] === "number")
  );
};
const isSide = (x: unknown): x is LockSide => {
  if (x === null || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s["hash"] === "string" &&
    Array.isArray(s["items"]) &&
    (s["items"] as unknown[]).every(isItem)
  );
};

export interface LockResult {
  lock: Lock | undefined;
  problems: string[];
}

/** Parse and validate. Unknown versions are refused; nothing in the file is trusted to have the right shape. */
export function parseLock(text: string): LockResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { lock: undefined, problems: [".ui.lock is not valid JSON"] };
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw))
    return { lock: undefined, problems: [".ui.lock must be a JSON object"] };
  const r = raw as Record<string, unknown>;
  if (r["version"] !== LOCK_VERSION)
    return {
      lock: undefined,
      problems: [
        `unsupported .ui.lock version ${JSON.stringify(r["version"])} (this tool reads version ${LOCK_VERSION})`,
      ],
    };
  const problems: string[] = [];
  const spec = r["spec"] as { path?: unknown; hash?: unknown } | undefined;
  if (spec === undefined || typeof spec.path !== "string" || typeof spec.hash !== "string")
    problems.push("spec.path and spec.hash are required");
  if (typeof r["dsl"] !== "string") problems.push("dsl is required");
  const anchors = Object.create(null) as Lock["anchors"];
  if (r["anchors"] === null || typeof r["anchors"] !== "object" || Array.isArray(r["anchors"]))
    problems.push("anchors must be an object");
  else
    for (const [name, u] of Object.entries(r["anchors"] as Record<string, unknown>)) {
      const o = u as Record<string, unknown> | null;
      if (
        o === null ||
        typeof o !== "object" ||
        typeof o["kind"] !== "string" ||
        !isSide(o["spec"])
      ) {
        problems.push(`anchor "${name}" is malformed`);
        continue;
      }
      const code = o["code"] as Record<string, unknown> | undefined;
      if (code !== undefined && !(isSide(code) && typeof code["path"] === "string")) {
        problems.push(`anchor "${name}": code side is malformed`);
        continue;
      }
      anchors[name] = {
        kind: o["kind"],
        spec: o["spec"] as LockSide,
        ...(code !== undefined ? { code: code as unknown as LockSide & { path: string } } : {}),
      };
    }
  const waivers = Array.isArray(r["waivers"]) ? (r["waivers"] as unknown[]) : [];
  const okWaivers = waivers.filter((w): w is LockWaiver => {
    const o = w as Record<string, unknown> | null;
    return (
      o !== null &&
      typeof o === "object" &&
      typeof o["rule"] === "string" &&
      typeof o["reason"] === "string" &&
      typeof o["line"] === "number"
    );
  });
  if (okWaivers.length !== waivers.length) problems.push("waivers contain a malformed entry");
  if (problems.length > 0) return { lock: undefined, problems };
  return {
    lock: {
      version: LOCK_VERSION,
      dsl: r["dsl"] as string,
      spec: spec as Lock["spec"],
      anchors,
      waivers: okWaivers,
    },
    problems: [],
  };
}

/** Rename an anchor in the lock (the `relink` primitive). */
export function relink(lock: Lock, from: string, to: string): string | undefined {
  if (!Object.hasOwn(lock.anchors, from)) return `no anchor "${from}" in the lock`;
  if (Object.hasOwn(lock.anchors, to)) return `anchor "${to}" already exists`;
  if (!/^[A-Za-z~][\w~-]*$/.test(to)) return `"${to}" is not a valid anchor name`;
  lock.anchors[to] = lock.anchors[from] as LockUnit;
  delete lock.anchors[from]; // eslint-disable-line @typescript-eslint/no-dynamic-delete
  lock.waivers = lock.waivers.map((w) => (w.anchor === from ? { ...w, anchor: to } : w));
  return undefined;
}

export type { Role };
