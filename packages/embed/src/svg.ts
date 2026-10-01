/**
 * SVG renderer (T-094a). Lays a document out in a fixed-width column and emits a self-contained SVG: real `<text>`
 * (no outlined glyphs, no external fonts or images), `<title>`/`<desc>`, one small `<style>` block, deterministic output.
 * The layout model is deliberately simple (estimated text metrics, equal-width rows and grids): it is a picture of the
 * wireframe, not a browser. Use `@mdui/render` when exact layout matters.
 */
import type { BlockNode, Document, InlineNode } from "@mdui/core";

export type SvgStyle = "wireframe" | "clean" | "sketch";
export interface SvgOptions {
  style?: SvgStyle;
  /** `auto` follows `prefers-color-scheme` inside the SVG. */
  theme?: "auto" | "light" | "dark";
  /** Which STATE of each REGION to draw (default `default`, then the first). */
  state?: string;
  width?: number;
  title?: string;
  includes?: Map<string, Document>;
}

interface Item {
  w: number;
  h: number;
  draw: (x: number, y: number) => string;
  /** Natural width for items that should not stretch in a ROW. */
  nat?: number;
}

const FONT = 14;
const LH = 20;
const GAP = 12;
const PAD = 16;

const n1 = (v: number): string => String(Math.round(v * 10) / 10);
/** XML 1.0 forbids most control characters even when escaped; drop them. */
const stripControls = (s: string): string =>
  Array.from(s)
    .filter((c) => {
      const k = c.codePointAt(0) as number;
      return k === 9 || k === 10 || k === 13 || (k >= 32 && k !== 0xfffe && k !== 0xffff);
    })
    .join("");
export const escapeXml = (s: string): string =>
  stripControls(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

function charW(c: string): number {
  if (c === " ") return 0.28;
  if ("il.,;:'|!tfjI()[]{}".includes(c)) return 0.3;
  if ("mwMW@%".includes(c)) return 0.85;
  if (/[A-Z]/.test(c)) return 0.65;
  if (/[0-9]/.test(c)) return 0.55;
  if (/[ᄀ-ᇿ⺀-꓏가-힣豈-﫿︰-﹯＀-｠\u{1f300}-\u{1faff}]/u.test(c)) return 1;
  return 0.55;
}
export function textWidth(s: string, size = FONT, bold = false, mono = false): number {
  let w = 0;
  for (const c of s) w += mono ? 0.6 : charW(c);
  return w * size * (bold ? 1.06 : 1);
}
function wrap(s: string, width: number, size = FONT, bold = false, mono = false): string[] {
  const out: string[] = [];
  for (const para of s.split("\n")) {
    let cur = "";
    for (const word of para.split(/(\s+)/)) {
      if (word === "") continue;
      if (cur !== "" && textWidth(cur + word, size, bold, mono) > width && word.trim() !== "") {
        out.push(cur.trimEnd());
        cur = word.trimStart();
      } else cur += word;
    }
    out.push(cur.trimEnd());
  }
  return out.length === 0 ? [""] : out;
}

// ------------------------------------------------------------------ shapes (deterministic wobble for the sketch style)

function rng(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1000) / 1000 - 0.5;
  };
}
class Painter {
  constructor(readonly style: SvgStyle) {}
  private r(): number {
    return this.style === "clean" ? 6 : 0;
  }
  rect(x: number, y: number, w: number, h: number, cls: string, radius = this.r()): string {
    if (this.style !== "sketch")
      return `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}"${radius > 0 ? ` rx="${radius}"` : ""} class="${cls}"/>`;
    const j = rng(Math.round(x * 7 + y * 13 + w * 17 + h * 19));
    const p = (px: number, py: number): string => `${n1(px + j() * 3)} ${n1(py + j() * 3)}`;
    return `<path d="M${p(x, y)} L${p(x + w, y)} L${p(x + w, y + h)} L${p(x, y + h)} Z" class="${cls}"/>`;
  }
  line(x1: number, y1: number, x2: number, y2: number, cls = "l"): string {
    return `<path d="M${n1(x1)} ${n1(y1)}L${n1(x2)} ${n1(y2)}" class="${cls}"/>`;
  }
  circle(cx: number, cy: number, r: number, cls: string): string {
    return `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r)}" class="${cls}"/>`;
  }
}

class Ctx {
  state: string;
  includes: Map<string, Document>;
  depth = 0;
  texts: string[] = [];
  constructor(
    readonly o: Required<Pick<SvgOptions, "style" | "state">> & { includes: Map<string, Document> },
    readonly p: Painter,
  ) {
    this.state = o.state;
    this.includes = o.includes;
  }
}

const text = (x: number, y: number, s: string, cls = "t", size = FONT, extra = ""): string =>
  `<text x="${n1(x)}" y="${n1(y)}"${size !== FONT ? ` font-size="${size}"` : ""} class="${cls}"${extra}>${escapeXml(s)}</text>`;

// ------------------------------------------------------------------ inline

interface Run {
  w: number;
  draw: (x: number, y: number) => string;
  h: number;
  /** Words can wrap and are merged into one `<text>` per line; boxes cannot. */
  words?: { s: string; cls: string; size: number };
}

function inlineRuns(nodes: InlineNode[], ctx: Ctx, width: number): Run[] {
  const out: Run[] = [];
  const wordsOf = (s: string, cls: string, size = FONT, bold = false, mono = false): void => {
    for (const w of s.split(/(\s+)/)) {
      if (w === "") continue;
      const ww = textWidth(w, size, bold, mono);
      out.push({ w: ww, h: LH, words: { s: w, cls, size }, draw: () => "" });
    }
  };
  const box = (w: number, h: number, draw: Run["draw"]): void => void out.push({ w, h, draw });
  const p = ctx.p;
  const labelOf = (n: { attrs?: { props: Record<string, string | true> } }): string | undefined => {
    const l = n.attrs?.props["label"];
    return typeof l === "string" ? l : undefined;
  };
  const walk = (ns: InlineNode[], bold: boolean, em: boolean): void => {
    for (const n of ns) {
      switch (n.kind) {
        case "text":
          ctx.texts.push(n.value);
          wordsOf(n.value, `${bold ? "b " : ""}${em ? "i " : ""}t`.trim(), FONT, bold);
          break;
        case "strong":
          walk(n.children, true, em);
          break;
        case "em":
          walk(n.children, bold, true);
          break;
        case "code":
          wordsOf(n.value, "t c", FONT, false, true);
          break;
        case "binding":
          wordsOf(`{{ ${n.path} }}`, "t c", FONT, false, true);
          break;
        case "button": {
          ctx.texts.push(`button ${n.label}`);
          const w = textWidth(n.label, FONT, true) + 28;
          const primary = n.attrs?.props["primary"] === true;
          box(
            w,
            32,
            (x, y) =>
              p.rect(x, y, w, 32, primary ? "bp" : "bx") +
              text(
                x + w / 2,
                y + 21,
                n.label,
                primary ? "b pt" : "b t",
                FONT,
                ' text-anchor="middle"',
              ),
          );
          break;
        }
        case "link": {
          ctx.texts.push(`link ${n.label}`);
          const w = textWidth(n.label);
          box(
            w,
            LH,
            (x, y) => text(x, y + 15, n.label, "a u") + p.line(x, y + 18, x + w, y + 18, "la"),
          );
          break;
        }
        case "input": {
          const label = labelOf(n);
          ctx.texts.push(`input ${label ?? n.placeholder}`);
          const w = Math.min(Math.max(180, textWidth(n.placeholder) + 24), Math.max(180, width));
          const h = 32 + (label !== undefined ? 18 : 0);
          box(
            w,
            h,
            (x, y) =>
              (label !== undefined ? text(x, y + 13, label, "m", 12) : "") +
              p.rect(x, y + (label !== undefined ? 18 : 0), w, 32, "bx") +
              text(x + 10, y + (label !== undefined ? 18 : 0) + 21, n.placeholder, "m"),
          );
          break;
        }
        case "image": {
          ctx.texts.push(`image ${n.description}`);
          const w = Math.min(Math.max(96, textWidth(n.description) + 24), width);
          const h = 64;
          box(
            w,
            h,
            (x, y) =>
              p.rect(x, y, w, h, "bx") +
              p.line(x, y, x + w, y + h, "ls") +
              p.line(x + w, y, x, y + h, "ls") +
              `<rect x="${n1(x + 6)}" y="${n1(y + 22)}" width="${n1(w - 12)}" height="20" class="bgf"/>` +
              text(x + w / 2, y + 37, n.description, "m", 12, ' text-anchor="middle"'),
          );
          break;
        }
        case "badge": {
          const w = textWidth(n.label, 12) + 18;
          box(
            w,
            22,
            (x, y) =>
              `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="22" rx="11" class="bx"/>` +
              text(x + w / 2, y + 15, n.label, "t", 12, ' text-anchor="middle"'),
          );
          break;
        }
        case "checkbox":
        case "radio":
        case "toggle": {
          const on = n.kind === "toggle" ? n.on : n.checked;
          ctx.texts.push(`${n.kind} ${n.label} ${on ? "on" : "off"}`);
          const w = textWidth(n.label) + (n.kind === "toggle" ? 48 : 26);
          box(w, 24, (x, y) => {
            if (n.kind === "toggle")
              return (
                `<rect x="${n1(x)}" y="${n1(y + 3)}" width="36" height="18" rx="9" class="${on ? "bp" : "bx"}"/>` +
                p.circle(x + (on ? 27 : 9), y + 12, 6, on ? "bg0" : "fl") +
                text(x + 44, y + 17, n.label)
              );
            const mark =
              n.kind === "radio"
                ? p.circle(x + 9, y + 12, 8, "bx") + (on ? p.circle(x + 9, y + 12, 4, "fk") : "")
                : p.rect(x + 1, y + 3, 16, 16, "bx", 2) +
                  (on ? `<path d="M${n1(x + 4)} ${n1(y + 11)}l4 4 7-8" class="l"/>` : "");
            return mark + text(x + 26, y + 17, n.label);
          });
          break;
        }
        case "dropdown": {
          ctx.texts.push(`dropdown ${n.label}`);
          const w = Math.max(140, textWidth(n.label) + 44);
          box(
            w,
            32,
            (x, y) =>
              p.rect(x, y, w, 32, "bx") +
              text(x + 10, y + 21, n.label) +
              `<path d="M${n1(x + w - 22)} ${n1(y + 13)}l6 6 6-6" class="l"/>`,
          );
          break;
        }
        case "use":
          box(
            Math.min(width, 200),
            28,
            (x, y) =>
              `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(Math.min(width, 200))}" height="28" class="bx ds"/>` +
              text(x + 8, y + 18, `include: ${n.path}`, "m", 12),
          );
          break;
        case "component": {
          const s = n.raw === "" ? n.name : `${n.name}: ${n.raw}`;
          const w = Math.min(width, textWidth(s) + 20);
          box(
            w,
            28,
            (x, y) =>
              `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="28" class="bx ds"/>` +
              text(x + 10, y + 19, s, "m"),
          );
          break;
        }
        case "widget":
          widgetRun(n, ctx, width, box, wordsOf);
          break;
      }
    }
  };
  walk(nodes, false, false);
  return out;
}

function widgetRun(
  n: Extract<InlineNode, { kind: "widget" }>,
  ctx: Ctx,
  width: number,
  box: (w: number, h: number, d: Run["draw"]) => void,
  words: (s: string, cls: string) => void,
): void {
  const p = ctx.p;
  const a = n.args;
  const lab =
    typeof n.attrs?.props["label"] === "string" ? (n.attrs.props["label"] as string) : undefined;
  switch (n.widget) {
    case "slider": {
      const m = /^(-?[\d.]+)\.\.(-?[\d.]+)$/.exec(a.positional[0] ?? "");
      const lo = Number(m?.[1] ?? 0);
      const hi = Number(m?.[2] ?? 100);
      const v = Number(a.named["value"] ?? lo);
      const w = Math.min(220, width);
      const t = hi > lo ? Math.min(Math.max((v - lo) / (hi - lo), 0), 1) : 0;
      ctx.texts.push(`slider ${lab ?? ""} ${lo}..${hi}`);
      box(
        w,
        28,
        (x, y) =>
          `<rect x="${n1(x)}" y="${n1(y + 12)}" width="${n1(w)}" height="4" rx="2" class="fl"/>` +
          p.circle(x + t * w, y + 14, 8, "bx") +
          text(x, y + 8, `${lo}`, "m", 10) +
          text(x + w, y + 8, `${hi}`, "m", 10, ' text-anchor="end"'),
      );
      break;
    }
    case "progress": {
      const v = Math.min(Math.max(Number.parseInt(n.raw, 10) || 0, 0), 100);
      const w = Math.min(220, width);
      ctx.texts.push(`progress ${v}%`);
      box(
        w,
        20,
        (x, y) =>
          `<rect x="${n1(x)}" y="${n1(y + 6)}" width="${n1(w)}" height="8" rx="4" class="fl"/><rect x="${n1(x)}" y="${n1(y + 6)}" width="${n1((w * v) / 100)}" height="8" rx="4" class="bp"/>`,
      );
      break;
    }
    case "chart": {
      const s = `${a.positional[0] ?? "chart"} chart${a.positional[1] !== undefined ? `: ${a.positional[1]}` : ""}`;
      ctx.texts.push(s);
      const w = Math.min(280, width);
      box(
        w,
        120,
        (x, y) =>
          p.rect(x, y, w, 120, "bx") +
          [0, 1, 2, 3]
            .map(
              (i) =>
                `<rect x="${n1(x + 24 + i * 40)}" y="${n1(y + 90 - (i % 2 === 0 ? 40 : 65))}" width="24" height="${i % 2 === 0 ? 40 : 65}" class="fl"/>`,
            )
            .join("") +
          text(x + w / 2, y + 112, s, "m", 11, ' text-anchor="middle"'),
      );
      break;
    }
    case "stat": {
      const [l, v, ...r] = a.positional;
      ctx.texts.push(`${l ?? ""} ${v ?? ""}`);
      box(
        Math.max(100, textWidth(l ?? "", 12) + 8, textWidth(v ?? "", 24, true) + 8),
        52,
        (x, y) =>
          text(x, y + 13, l ?? "", "m", 12) +
          text(x, y + 40, `${v ?? ""}${r.length > 0 ? ` ${r.join(" ")}` : ""}`, "b t", 24),
      );
      break;
    }
    case "skeleton": {
      const rows = Math.min(Math.max(Number.parseInt(a.named["rows"] ?? "3", 10) || 3, 1), 20);
      const w = Math.min(width, 280);
      box(w, rows * 20, (x, y) =>
        Array.from(
          { length: rows },
          (_, i) =>
            `<rect x="${n1(x)}" y="${n1(y + i * 20 + 3)}" width="${n1(i === rows - 1 ? w * 0.6 : w)}" height="12" rx="4" class="fl"/>`,
        ).join(""),
      );
      break;
    }
    case "avatar": {
      ctx.texts.push(`avatar ${n.raw}`);
      box(
        40,
        40,
        (x, y) =>
          p.circle(x + 20, y + 20, 20, "bx") +
          text(
            x + 20,
            y + 25,
            (
              n.raw
                .split(/\s+/)
                .map((s) => s[0] ?? "")
                .join("")
                .slice(0, 2) || "?"
            ).toUpperCase(),
            "b t",
            14,
            ' text-anchor="middle"',
          ),
      );
      break;
    }
    case "icon":
      box(
        24,
        24,
        (x, y) =>
          p.circle(x + 12, y + 12, 10, "bx") +
          text(
            x + 12,
            y + 16,
            (a.positional[0] ?? "?").slice(0, 1).toUpperCase(),
            "m",
            11,
            ' text-anchor="middle"',
          ),
      );
      break;
    case "date": {
      const w = 160;
      box(
        w,
        32,
        (x, y) =>
          p.rect(x, y, w, 32, "bx") +
          text(
            x + 10,
            y + 21,
            /^\d{4}-\d{2}-\d{2}$/.test(n.raw.trim())
              ? n.raw.trim()
              : n.raw.trim() === "range"
                ? "start – end"
                : "yyyy-mm-dd",
            "m",
          ),
      );
      ctx.texts.push(`date ${lab ?? n.raw}`);
      break;
    }
    case "file":
      ctx.texts.push(`file ${n.raw}`);
      box(
        textWidth(n.raw || "Choose file", FONT, true) + 28,
        32,
        (x, y) =>
          p.rect(x, y, textWidth(n.raw || "Choose file", FONT, true) + 28, 32, "bx") +
          text(x + 14, y + 21, n.raw || "Choose file", "b t"),
      );
      break;
    default:
      // crumbs, stepper, pager, menubar: a line of text with separators
      words(n.raw.replace(/\*/g, ""), "t");
      ctx.texts.push(`${n.widget} ${n.raw}`);
  }
}

/** Flow runs into lines of at most `width`; returns the drawn item. */
function flow(runs: Run[], width: number): Item {
  const lines: { items: { r: Run; x: number }[]; h: number }[] = [];
  let cur: { items: { r: Run; x: number }[]; h: number } = { items: [], h: 0 };
  let x = 0;
  for (const r of runs) {
    const gap = cur.items.length > 0 && !r.words ? 8 : 0;
    if (
      cur.items.length > 0 &&
      x + gap + r.w > width + 0.5 &&
      !(r.words !== undefined && r.words.s.trim() === "")
    ) {
      lines.push(cur);
      cur = { items: [], h: 0 };
      x = 0;
    }
    if (cur.items.length === 0 && r.words !== undefined && r.words.s.trim() === "") continue;
    const g = cur.items.length > 0 && !r.words ? 8 : 0;
    cur.items.push({ r, x: x + g });
    x += g + r.w;
    cur.h = Math.max(cur.h, r.h);
  }
  if (cur.items.length > 0) lines.push(cur);
  const h = lines.reduce((s, l) => s + l.h + 4, 0) - (lines.length > 0 ? 4 : 0);
  const nat = Math.min(
    width,
    Math.max(
      0,
      ...lines.map((l) =>
        l.items.length === 0
          ? 0
          : (l.items[l.items.length - 1] as { r: Run; x: number }).x +
            (l.items[l.items.length - 1] as { r: Run; x: number }).r.w,
      ),
    ),
  );
  return {
    w: width,
    h: Math.max(h, 0),
    nat,
    draw: (ox, oy) => {
      let y = oy;
      let s = "";
      for (const l of lines) {
        for (let i = 0; i < l.items.length; i++) {
          const { r, x: ix } = l.items[i] as { r: Run; x: number };
          if (r.words === undefined) {
            s += r.draw(ox + ix, y + (l.h - r.h) / 2);
            continue;
          }
          const parts: { s: string; cls: string }[] = [{ s: r.words.s, cls: r.words.cls }];
          let j = i + 1;
          while (j < l.items.length) {
            const nx = (l.items[j] as { r: Run }).r.words;
            if (nx === undefined) break;
            const last = parts[parts.length - 1] as { s: string; cls: string };
            if (nx.cls === last.cls) last.s += nx.s;
            else parts.push({ s: nx.s, cls: nx.cls });
            j++;
          }
          i = j - 1;
          const lastPart = parts[parts.length - 1] as { s: string; cls: string };
          lastPart.s = lastPart.s.trimEnd();
          if (parts.every((q) => q.s.trim() === "")) continue;
          // one <text> per line, styled runs as <tspan>s: the browser spaces them, so estimated widths cannot make them overlap
          const ty = y + (l.h - r.h) / 2 + 15;
          s +=
            parts.length === 1
              ? text(ox + ix, ty, parts[0]?.s ?? "", parts[0]?.cls ?? "t", r.words.size)
              : `<text x="${n1(ox + ix)}" y="${n1(ty)}" class="t" xml:space="preserve">${parts.map((q) => (q.cls === "t" ? escapeXml(q.s) : `<tspan class="${q.cls}">${escapeXml(q.s)}</tspan>`)).join("")}</text>`;
        }
        y += l.h + 4;
      }
      return s;
    },
  };
}

// ------------------------------------------------------------------ blocks

const empty: Item = { w: 0, h: 0, draw: () => "" };

function stack(items: Item[], gap = GAP): Item {
  const vis = items.filter((i) => i.h > 0);
  const h = vis.reduce((s, i) => s + i.h, 0) + Math.max(0, vis.length - 1) * gap;
  return {
    w: Math.max(0, ...vis.map((i) => i.w)),
    h,
    draw: (x, y) => {
      let cy = y;
      let s = "";
      for (const i of vis) {
        s += i.draw(x, cy);
        cy += i.h + gap;
      }
      return s;
    },
  };
}

function hrow(kids: BlockNode[], ctx: Ctx, width: number): Item {
  const built = kids.filter((k) => !["comment", "hint", "directive"].includes(k.kind));
  if (built.length === 0) return empty;
  const gap = GAP;
  const probes = built.map((k) => block(k, ctx, width));
  const isNat = (k: BlockNode, it: Item): boolean =>
    (k.kind === "line" || k.kind === "heading") && it.nat !== undefined;
  const natW = probes.map((it, i) => (isNat(built[i] as BlockNode, it) ? (it.nat as number) : 0));
  const flexCount = probes.filter((it, i) => !isNat(built[i] as BlockNode, it)).length;
  const fixed = natW.reduce((s, v) => s + v, 0) + gap * (built.length - 1);
  const flexW = flexCount > 0 ? Math.max(60, (width - fixed) / flexCount) : 0;
  const items = built.map((k, i) =>
    block(k, ctx, isNat(k, probes[i] as Item) ? (natW[i] as number) + 1 : flexW),
  );
  const h = Math.max(...items.map((i) => i.h));
  return {
    w: width,
    h,
    draw: (x, y) => {
      let cx = x;
      let s = "";
      for (const i of items) {
        s += i.draw(cx, y);
        cx += i.w + gap;
      }
      return s;
    },
  };
}

function boxed(
  kids: BlockNode[],
  ctx: Ctx,
  width: number,
  cls: string,
  pad = PAD,
  radius?: number,
): Item {
  const inner = stack(
    kids
      .filter((k) => !["comment", "hint", "directive"].includes(k.kind))
      .map((k) => block(k, ctx, width - 2 * pad)),
  );
  const h = inner.h + 2 * pad;
  return {
    w: width,
    h,
    draw: (x, y) => ctx.p.rect(x, y, width, h, cls, radius) + inner.draw(x + pad, y + pad),
  };
}

function blocksOf(kids: BlockNode[], ctx: Ctx, width: number): Item {
  return stack(
    kids
      .filter((k) => !["comment", "hint", "directive"].includes(k.kind))
      .map((k) => block(k, ctx, width)),
  );
}

function block(n: BlockNode, ctx: Ctx, width: number): Item {
  const p = ctx.p;
  switch (n.kind) {
    case "column":
      return blocksOf(n.children, ctx, width);
    case "row":
      return hrow(n.children, ctx, width);
    case "card":
      return boxed(n.children, ctx, width, "bx");
    case "modal": {
      const b = boxed(n.children, ctx, Math.min(width, 440), "bx mo");
      ctx.texts.push("dialog");
      return { ...b, w: width, draw: (x, y) => b.draw(x + (width - b.w) / 2, y) };
    }
    case "header":
    case "footer": {
      ctx.texts.push(n.kind === "header" ? "header" : "footer");
      return boxed(n.children, ctx, width, "bx fl", 12, 0);
    }
    case "bubble-user":
    case "bubble-agent": {
      const user = n.kind === "bubble-user";
      const b = boxed(
        n.children,
        ctx,
        Math.min(width * 0.75, width),
        user ? "bx fl" : "bx",
        10,
        14,
      );
      return { ...b, w: width, draw: (x, y) => b.draw(user ? x + width - b.w : x, y) };
    }
    case "heading": {
      const size = [28, 24, 20, 18, 16, 14][n.level - 1] ?? 14;
      ctx.texts.push(`heading ${n.text}`);
      const lines = wrap(n.text, width, size, true);
      const lh = Math.round(size * 1.3);
      return {
        w: width,
        h: lines.length * lh,
        nat: Math.min(width, Math.max(...lines.map((l) => textWidth(l, size, true)))),
        draw: (x, y) => lines.map((l, i) => text(x, y + i * lh + size, l, "b t", size)).join(""),
      };
    }
    case "line":
      return flow(inlineRuns(n.inline, ctx, width), width);
    case "divider": {
      return {
        w: width,
        h: 16,
        draw: (x, y) =>
          n.label === undefined
            ? p.line(x, y + 8, x + width, y + 8)
            : p.line(x, y + 8, x + width / 2 - textWidth(n.label) / 2 - 8, y + 8) +
              text(x + width / 2, y + 12, n.label, "m", FONT, ' text-anchor="middle"') +
              p.line(x + width / 2 + textWidth(n.label) / 2 + 8, y + 8, x + width, y + 8),
      };
    }
    case "code": {
      const lines = n.text.split("\n").flatMap((l) => wrap(l, width - 24, 13, false, true));
      const h = lines.length * 18 + 16;
      return {
        w: width,
        h,
        draw: (x, y) =>
          p.rect(x, y, width, h, "bx fl", 4) +
          lines.map((l, i) => text(x + 12, y + 20 + i * 18, l, "t c", 13)).join(""),
      };
    }
    case "tabs": {
      let cx = 0;
      const tabs = n.tabs.map((t) => {
        const w = textWidth(t.label, FONT, t.active) + 28;
        const r = { x: cx, w, t };
        cx += w + 4;
        return r;
      });
      ctx.texts.push(`tabs ${n.tabs.map((t) => t.label).join(", ")}`);
      return {
        w: width,
        h: 34,
        draw: (x, y) =>
          p.line(x, y + 33, x + width, y + 33) +
          tabs
            .map(
              ({ x: tx, w, t }) =>
                (t.active ? p.rect(tx + x, y + 2, w, 31, "bx tb") : "") +
                text(
                  tx + x + w / 2,
                  y + 22,
                  t.label,
                  t.active ? "b t" : "m",
                  FONT,
                  ' text-anchor="middle"',
                ),
            )
            .join(""),
      };
    }
    case "table": {
      const cols = Math.max(n.header.length, ...n.rows.map((r) => r.length));
      const cw = width / Math.max(cols, 1);
      const rows = [n.header, ...n.rows];
      const lay = rows.map((r, ri) => {
        const cells = Array.from({ length: cols }, (_, ci) =>
          wrap(r[ci] ?? "", cw - 16, FONT, ri === 0),
        );
        return { cells, h: Math.max(...cells.map((c) => c.length)) * LH + 12 };
      });
      ctx.texts.push(`table ${n.header.join(", ")}`);
      const h = lay.reduce((s, r) => s + r.h, 0);
      return {
        w: width,
        h,
        draw: (x, y) => {
          let cy = y;
          let s = "";
          lay.forEach((r, ri) => {
            s += p.rect(x, cy, width, r.h, ri === 0 ? "bx fl" : "bx", 0);
            r.cells.forEach((c, ci) => {
              const al = n.align[ci];
              const tx =
                al === "right"
                  ? x + (ci + 1) * cw - 8
                  : al === "center"
                    ? x + ci * cw + cw / 2
                    : x + ci * cw + 8;
              s += c
                .map((l, li) =>
                  text(
                    tx,
                    cy + 6 + 15 + li * LH,
                    l,
                    ri === 0 ? "b t" : "t",
                    FONT,
                    al === "right"
                      ? ' text-anchor="end"'
                      : al === "center"
                        ? ' text-anchor="middle"'
                        : "",
                  ),
                )
                .join("");
            });
            cy += r.h;
          });
          return s;
        },
      };
    }
    case "list": {
      const items = n.children.map((it, i) => {
        const inner = flow(inlineRuns(it.inline, ctx, width - 22), width - 22);
        const kids = blocksOf(it.children, ctx, width - 22);
        const body = stack([inner, kids], 4);
        return { body, mark: it.ordered ? `${i + 1}.` : "•" };
      });
      const h =
        items.reduce((s, i) => s + Math.max(i.body.h, LH), 0) + Math.max(0, items.length - 1) * 4;
      return {
        w: width,
        h,
        draw: (x, y) => {
          let cy = y;
          let s = "";
          for (const i of items) {
            s += text(x, cy + 15, i.mark) + i.body.draw(x + 22, cy);
            cy += Math.max(i.body.h, LH) + 4;
          }
          return s;
        },
      };
    }
    case "block":
      return named(n, ctx, width);
    case "hint":
    case "comment":
    case "directive":
      return empty;
  }
}

function named(n: Extract<BlockNode, { kind: "block" }>, ctx: Ctx, width: number): Item {
  const args = n.args.trim();
  const p = ctx.p;
  switch (n.name) {
    case "grid": {
      const cols = Math.min(
        Math.max(Number.parseInt(/cols=(\d+)/.exec(args)?.[1] ?? "2", 10), 1),
        12,
      );
      const cw = (width - GAP * (cols - 1)) / cols;
      const kids = n.children
        .filter((k) => !["comment", "hint", "directive"].includes(k.kind))
        .map((k) => block(k, ctx, cw));
      const rows: Item[][] = [];
      for (let i = 0; i < kids.length; i += cols) rows.push(kids.slice(i, i + cols));
      const rh = rows.map((r) => Math.max(...r.map((k) => k.h)));
      const h = rh.reduce((s, v) => s + v, 0) + Math.max(0, rows.length - 1) * GAP;
      return {
        w: width,
        h,
        draw: (x, y) =>
          rows
            .map((r, ri) =>
              r
                .map((k, ci) =>
                  k.draw(x + ci * (cw + GAP), y + rh.slice(0, ri).reduce((s, v) => s + v + GAP, 0)),
                )
                .join(""),
            )
            .join(""),
      };
    }
    case "region": {
      const states = n.children.filter(
        (c): c is Extract<BlockNode, { kind: "block" }> => c.kind === "block" && c.name === "state",
      );
      const chosen =
        states.find((s) => s.args.trim() === ctx.state) ??
        states.find((s) => s.args.trim() === "default") ??
        states[0];
      const rest = n.children.filter((c) => !(c.kind === "block" && c.name === "state"));
      return blocksOf([...rest, ...(chosen?.children ?? [])], ctx, width);
    }
    case "state":
      return empty;
    case "panel": {
      const title = /^"([^"]*)"/.exec(args)?.[1] ?? args.replace(/\bopen\b/, "").trim();
      ctx.texts.push(`panel ${title}`);
      const inner = blocksOf(n.children, ctx, width - 2 * PAD);
      const h = 36 + (inner.h > 0 ? inner.h + PAD : 0);
      return {
        w: width,
        h,
        draw: (x, y) =>
          p.rect(x, y, width, h, "bx") +
          text(x + PAD, y + 23, `▾ ${title}`, "b t") +
          inner.draw(x + PAD, y + 36),
      };
    }
    case "group": {
      const title = /^"([^"]*)"/.exec(args)?.[1] ?? args;
      const inner = blocksOf(n.children, ctx, width - 2 * PAD);
      const h = inner.h + 2 * PAD + 8;
      return {
        w: width,
        h,
        draw: (x, y) =>
          p.rect(x, y + 8, width, h - 8, "bx") +
          `<rect x="${n1(x + 10)}" y="${n1(y)}" width="${n1(textWidth(title, 12) + 10)}" height="16" class="bgf"/>` +
          text(x + 15, y + 12, title, "m", 12) +
          inner.draw(x + PAD, y + PAD + 8),
      };
    }
    case "drawer":
    case "toast":
    case "tooltip":
    case "callout":
    case "empty":
    case "tree":
      return boxed(
        n.children,
        ctx,
        width,
        n.name === "empty" || n.name === "tooltip" ? "bx ds" : "bx fl",
        12,
        4,
      );
    default:
      return blocksOf(n.children, ctx, width);
  }
}

// ------------------------------------------------------------------ document

const CSS = (style: SvgStyle, theme: "auto" | "light" | "dark"): string => {
  const light =
    "--b:#fff;--f:#1b1b1f;--l:#666;--m:#ececf0;--mt:#5c5c66;--p:#2b4cc2;--pt:#fff;--a:#1d4ed8";
  const dark =
    "--b:#14141a;--f:#ececf1;--l:#8a8a9a;--m:#262631;--mt:#a8a8b8;--p:#6d8cff;--pt:#0b0b10;--a:#8fb0ff";
  const fam =
    style === "sketch"
      ? `"Segoe Print","Bradley Hand","Chalkboard SE","Comic Sans MS",cursive`
      : style === "wireframe"
        ? `Arial,Helvetica,sans-serif`
        : `system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
  const vars = (v: string): string => v.replace(/--(\w+):/g, "--$1:");
  return (
    `svg{${vars(theme === "dark" ? dark : light)};font-family:${fam};font-size:${FONT}px}` +
    (theme === "auto" ? `@media (prefers-color-scheme:dark){svg{${vars(dark)}}}` : "") +
    `.bg{fill:var(--b)}.bgf{fill:var(--b)}.bg0{fill:var(--b)}.t{fill:var(--f)}.m{fill:var(--mt)}.a{fill:var(--a)}.pt{fill:var(--pt)}.b{font-weight:600}.i{font-style:italic}.u{}.c{font-family:ui-monospace,Menlo,Consolas,monospace}` +
    `.bx{fill:none;stroke:var(--l);stroke-width:${style === "sketch" ? 2 : 1}}.bx.fl,.fl{fill:var(--m)}.bx.bp,.bp{fill:var(--p);stroke:var(--p)}.fk{fill:var(--f)}.l{stroke:var(--l);fill:none;stroke-width:${style === "sketch" ? 2 : 1.5}}.ls{stroke:var(--l);stroke-width:1;opacity:.5}.la{stroke:var(--a);stroke-width:1}.ds{stroke-dasharray:5 3}.mo{stroke-width:2}.tb{fill:var(--b)}`
  );
};

/** Plain text of the drawing, for `<desc>`. */
function descOf(ctx: Ctx): string {
  const s = ctx.texts
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("; ");
  return s.length > 600 ? `${s.slice(0, 597)}...` : s;
}

export function renderSvg(doc: Document, opts: SvgOptions = {}): string {
  const style = opts.style ?? "clean";
  const theme = opts.theme ?? "auto";
  const width = Math.min(Math.max(opts.width ?? 640, 240), 1600);
  const ctx = new Ctx(
    { style, state: opts.state ?? "default", includes: opts.includes ?? new Map() },
    new Painter(style),
  );
  const first = doc.body.find((b) => b.kind === "heading");
  const title =
    opts.title ??
    (typeof doc.meta["title"] === "string" ? doc.meta["title"] : undefined) ??
    (first?.kind === "heading" ? first.text : undefined) ??
    "Wireframe";
  const body = blocksOf(doc.body, ctx, width - 2 * PAD);
  const h = Math.ceil(body.h + 2 * PAD);
  const inner = body.draw(PAD, PAD);
  const lang = typeof doc.meta["lang"] === "string" ? doc.meta["lang"] : "en";
  const desc = descOf(ctx);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" role="img" aria-labelledby="t d" lang="${escapeXml(lang)}">` +
    `<title id="t">${escapeXml(title)}</title><desc id="d">${escapeXml(desc === "" ? title : desc)}</desc>` +
    `<style>${CSS(style, theme)}</style><rect width="${width}" height="${h}" class="bg"/>${inner}</svg>\n`
  );
}
