import type { Item } from "../src/index.js";

/** Small deterministic PRNG. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = [
  "Login",
  "Signup",
  "Cancel",
  "Save",
  "Delete",
  "Search",
  "Email",
  "Password",
  "Profile",
  "Settings",
  "Billing",
  "Invite",
  "Export",
  "Import",
  "Share",
  "Archive",
  "Restore",
  "Next",
  "Back",
  "Finish",
  "Pricing",
  "Docs",
  "Support",
  "Status",
  "Reports",
  "Alerts",
  "Teams",
  "Roles",
  "Audit",
  "Notes",
];

/** One screen model: units with explicit anchors and an ordered item list each. */
export interface Model {
  units: { id: string; items: Item[] }[];
}

export function randomModel(r: () => number): Model {
  const pool = [...WORDS];
  const take = (): string => pool.splice(Math.floor(r() * pool.length), 1)[0] as string;
  const n = 1 + Math.floor(r() * 3);
  const units: Model["units"] = [];
  for (let u = 0; u < n; u++) {
    const items: Item[] = [{ role: "heading", label: take(), level: 2 }];
    const k = 2 + Math.floor(r() * 3);
    for (let i = 0; i < k; i++) {
      const roles = ["button", "link", "textbox", "checkbox"] as const;
      const role = roles[Math.floor(r() * roles.length)] as (typeof roles)[number];
      const label = take();
      items.push(
        role === "link" ? { role, label, href: `/${label.toLowerCase()}` } : { role, label },
      );
    }
    units.push({ id: `u${u + 1}`, items });
  }
  return { units };
}

export const clone = (m: Model): Model => JSON.parse(JSON.stringify(m)) as Model;

export type Mutation = "rename" | "add" | "remove" | "reorder";
const FRESH = ["Zeta", "Omega", "Delta", "Sigma", "Kappa", "Theta", "Lambda", "Gamma"];

/** Apply one semantic mutation to one unit; returns false when it could not change anything. */
export function mutate(m: Model, r: () => number, kind?: Mutation): boolean {
  const u = m.units[Math.floor(r() * m.units.length)];
  if (u === undefined) return false;
  const body = u.items.slice(1); // keep the heading stable
  const ops: Mutation[] = kind !== undefined ? [kind] : ["rename", "add", "remove", "reorder"];
  const op = ops[Math.floor(r() * ops.length)] as Mutation;
  const fresh = FRESH[Math.floor(r() * FRESH.length)] as string;
  if (op === "rename" && body.length > 0) {
    const it = body[Math.floor(r() * body.length)] as Item;
    it.label = `${it.label} ${fresh}`;
    if (it.role === "link") it.href = `/${it.label.toLowerCase().replace(/ /g, "-")}`;
    return true;
  }
  if (op === "add") {
    const at = 1 + Math.floor(r() * u.items.length);
    u.items.splice(at, 0, { role: "button", label: `${fresh} ${Math.floor(r() * 1000)}` });
    return true;
  }
  if (op === "remove" && body.length > 1) {
    u.items.splice(1 + Math.floor(r() * body.length), 1);
    return true;
  }
  if (op === "reorder" && body.length > 1) {
    const i = 1 + Math.floor(r() * (body.length - 1));
    const t = u.items[i] as Item;
    u.items[i] = u.items[i + 1] as Item;
    u.items[i + 1] = t;
    return JSON.stringify(u.items[i]) !== JSON.stringify(u.items[i + 1]);
  }
  return false;
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export interface Style {
  /** Formatting-only variation: extra whitespace, attribute order, wrappers, comments. */
  cosmetic?: boolean;
}

export function renderSpec(m: Model, style: Style = {}): string {
  const lines = ["---", "dsl: 2.0", "lang: en", "---"];
  if (style.cosmetic) lines.push("", "<!-- reviewed by design -->", "");
  for (const u of m.units) {
    lines.push(`::: CARD :::{: #${u.id} }`);
    if (style.cosmetic) lines.push("  <!-- keep this card compact -->");
    for (const it of u.items) {
      const l =
        it.role === "heading"
          ? `## ${it.label}`
          : it.role === "button"
            ? `[ ${it.label} ](#${it.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")})`
            : it.role === "link"
              ? `[${it.label}](${it.href})`
              : it.role === "textbox"
                ? `[ text: ${it.label} ]`
                : `[ ] ${it.label}`;
      lines.push(style.cosmetic ? `  ${l}` : l);
    }
    lines.push("--- END ---", style.cosmetic ? "" : "");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

let uid = 0;
export function renderHtml(m: Model, style: Style = {}): string {
  const out: string[] = ["<main>"];
  for (const u of m.units) {
    out.push(
      style.cosmetic
        ? `  <div class="wrap"><section class="card shadow" data-mdui-anchor="${u.id}">`
        : `<section data-mdui-anchor="${u.id}">`,
    );
    for (const it of u.items) {
      const id = `f${uid++}`;
      switch (it.role) {
        case "heading":
          out.push(`<h2>${esc(it.label)}</h2>`);
          break;
        case "button":
          out.push(
            style.cosmetic
              ? `<button   type="button"\n   class="btn">  ${esc(it.label)}  </button>`
              : `<button>${esc(it.label)}</button>`,
          );
          break;
        case "link":
          out.push(
            style.cosmetic
              ? `<a class="lnk" href="${it.href}">${esc(it.label)}</a>`
              : `<a href="${it.href}">${esc(it.label)}</a>`,
          );
          break;
        case "textbox":
          out.push(
            style.cosmetic
              ? `<label for="${id}">${esc(it.label)}</label><input id="${id}" type="text">`
              : `<input type="text" aria-label="${esc(it.label)}">`,
          );
          break;
        default:
          out.push(`<label><input type="checkbox"> ${esc(it.label)}</label>`);
      }
    }
    out.push(style.cosmetic ? "  </section></div>" : "</section>");
  }
  out.push("</main>");
  return out.join("\n") + "\n";
}

export function renderTsx(m: Model, style: Style = {}): string {
  const out = ["export function Screen() {", "  return (", "    <>"];
  for (const u of m.units) {
    out.push(
      `      {/* ui:anchor ${u.id} */}`,
      style.cosmetic ? `      <Card className="p-4" variant="outlined">` : "      <Card>",
    );
    for (const it of u.items) {
      switch (it.role) {
        case "heading":
          out.push(`        <h2>{"${it.label}"}</h2>`);
          break;
        case "button":
          out.push(
            style.cosmetic
              ? `        <Button variant="primary" onClick={() => go()}>${it.label}</Button>`
              : `        <Button>${it.label}</Button>`,
          );
          break;
        case "link":
          out.push(`        <a href="${it.href}">${it.label}</a>`);
          break;
        case "textbox":
          out.push(`        <Input aria-label="${it.label}" />`);
          break;
        default:
          out.push(`        <label><input type="checkbox" /> ${it.label}</label>`);
      }
    }
    out.push("      </Card>");
  }
  out.push("    </>", "  );", "}");
  return out.join("\n") + "\n";
}
