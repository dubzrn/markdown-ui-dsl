/**
 * `mdui preview <spec>`: a local preview server (T-041). Re-renders on every save and pushes a reload over server-sent
 * events; a toolbar toggles style, theme, state and viewport width. Binds to 127.0.0.1 only and serves one spec.
 */
import { createServer, type Server } from "node:http";
import { existsSync, mkdirSync, readFileSync, watch, writeFileSync, type FSWatcher } from "node:fs";
import { dirname, resolve } from "node:path";
import { analyze, parse } from "@mdui/core";
import { render } from "@mdui/render";
import { UsageError, type Args } from "./args.js";
import type { Io } from "./io.js";

export interface PreviewOptions {
  spec: string;
  port?: number;
  /** Called with a line of log text (default: ignored). */
  log?: (s: string) => void;
}
export interface Preview {
  url: string;
  port: number;
  close(): Promise<void>;
}

const STYLES = ["sketch", "clean", "wireframe"] as const;
const THEMES = ["auto", "light", "dark"] as const;
const WIDTHS = [
  ["320", "Phone 320"],
  ["768", "Tablet 768"],
  ["1024", "Laptop 1024"],
  ["", "Full"],
] as const;

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const pick = <T extends string>(v: string | null, ok: readonly T[], d: T): T =>
  (ok as readonly string[]).includes(v ?? "") ? (v as T) : d;

/** Source text of the spec and the included files it reads (to watch). */
function renderFrame(
  spec: string,
  q: URLSearchParams,
): { html: string; deps: string[]; error?: string } {
  const root = dirname(spec);
  const deps: string[] = [spec];
  try {
    const src = readFileSync(spec, "utf8");
    const doc = parse(src);
    const a = analyze(doc, {
      file: spec.split("/").pop() ?? spec,
      readFile: (p) => {
        const abs = resolve(root, p);
        if (!abs.startsWith(root) || !existsSync(abs)) return undefined;
        deps.push(abs);
        return readFileSync(abs, "utf8");
      },
    });
    const includes = new Map(
      a.includes.flatMap((i) =>
        i.path !== undefined && i.doc !== undefined ? [[i.path, i.doc] as const] : [],
      ),
    );
    const state = q.get("state");
    const html = render(doc, {
      style: pick(q.get("style"), STYLES, "clean"),
      theme: pick(q.get("theme"), THEMES, "auto"),
      includes,
      ...(state !== null && /^[\w-]{1,40}$/.test(state) ? { state } : {}),
    });
    return { html, deps };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      html: `<!doctype html><meta charset="utf-8"><pre style="color:#b00020;padding:1rem">Cannot render ${esc(spec)}: ${esc(msg)}</pre>`,
      deps,
      error: msg,
    };
  }
}

const RELOAD = `<script>(()=>{const es=new EventSource("/__events");es.onmessage=()=>location.reload();})()</script>`;

function shell(q: URLSearchParams, title: string): string {
  const style = pick(q.get("style"), STYLES, "clean");
  const theme = pick(q.get("theme"), THEMES, "auto");
  const width = q.get("width") ?? "";
  const state = q.get("state") ?? "";
  const frameQs = new URLSearchParams({
    style,
    theme,
    ...(state !== "" ? { state } : {}),
  }).toString();
  const opt = (list: readonly string[], cur: string): string =>
    list.map((v) => `<option value="${v}"${v === cur ? " selected" : ""}>${v}</option>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)} · mdui preview</title>
<style>body{margin:0;font:14px system-ui;background:#eef0f3;color:#14141a}header{display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;padding:.5rem .75rem;background:#fff;border-bottom:1px solid #d0d4da}
label{display:flex;gap:.3rem;align-items:center}select,input{font:inherit}main{padding:1rem;display:flex;justify-content:center}iframe{border:1px solid #c7ccd3;background:#fff;height:calc(100vh - 90px);max-width:100%;width:${width === "" ? "100%" : `${Number(width) || 0}px`}}</style></head>
<body><header role="toolbar" aria-label="Preview controls">
<strong>${esc(title)}</strong>
<label>Style <select id="style">${opt(STYLES, style)}</select></label>
<label>Theme <select id="theme">${opt(THEMES, theme)}</select></label>
<label>State <input id="state" value="${esc(state)}" placeholder="default" size="10"></label>
<label>Viewport <select id="width">${WIDTHS.map(([v, l]) => `<option value="${v}"${v === width ? " selected" : ""}>${l}</option>`).join("")}</select></label>
</header><main><iframe id="frame" title="Rendered wireframe" src="/frame?${esc(frameQs)}"></iframe></main>
<script>
const f=document.getElementById("frame");
function apply(){const p=new URLSearchParams();for(const k of ["style","theme","state","width"]){const v=document.getElementById(k).value;if(v)p.set(k,v)}
history.replaceState(null,"","/?"+p);const fp=new URLSearchParams(p);fp.delete("width");f.src="/frame?"+fp;f.style.width=p.get("width")?p.get("width")+"px":"100%"}
for(const k of ["style","theme","state","width"])document.getElementById(k).addEventListener("change",apply);
</script></body></html>`;
}

export function startPreview(o: PreviewOptions): Promise<Preview> {
  const spec = resolve(o.spec);
  if (!existsSync(spec)) return Promise.reject(new Error(`no such file: ${o.spec}`));
  const log = o.log ?? ((): void => undefined);
  const clients = new Set<{ write(s: string): void }>();
  let watchers: FSWatcher[] = [];
  let watched = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const rewatch = (deps: string[]): void => {
    const key = [...new Set(deps)].sort().join("\n");
    if (key === watched) return;
    watched = key;
    for (const w of watchers) w.close();
    watchers = [...new Set(deps)].flatMap((d) => {
      try {
        return [
          watch(d, () => {
            // editors save by write+rename: debounce a burst into one reload
            clearTimeout(timer);
            timer = setTimeout(() => {
              log(`changed: ${d}`);
              for (const c of clients) c.write("data: reload\n\n");
            }, 20);
          }),
        ];
      } catch {
        return [];
      }
    });
  };
  rewatch(renderFrame(spec, new URLSearchParams()).deps);

  const server: Server = createServer((req, res) => {
    const u = new URL(req.url ?? "/", "http://127.0.0.1");
    const headers = {
      "cache-control": "no-store",
      "content-security-policy": "default-src 'self' 'unsafe-inline'; frame-src 'self'",
    };
    if (u.pathname === "/__events") {
      res.writeHead(200, {
        ...headers,
        "content-type": "text/event-stream",
        connection: "keep-alive",
      });
      res.write(": connected\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    if (u.pathname === "/frame") {
      const r = renderFrame(spec, u.searchParams);
      rewatch(r.deps);
      res.writeHead(200, { ...headers, "content-type": "text/html; charset=utf-8" });
      res.end(
        r.html.includes("</body>")
          ? r.html.replace("</body>", `${RELOAD}</body>`)
          : r.html + RELOAD,
      );
      return;
    }
    if (u.pathname === "/") {
      res.writeHead(200, { ...headers, "content-type": "text/html; charset=utf-8" });
      res.end(shell(u.searchParams, spec.split("/").pop() ?? spec));
      return;
    }
    res.writeHead(404, headers);
    res.end("not found");
  });
  return new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(o.port ?? 0, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      ok({
        url: `http://127.0.0.1:${port}/`,
        port,
        close: () =>
          new Promise<void>((done) => {
            clearTimeout(timer);
            for (const w of watchers) w.close();
            for (const c of clients) (c as unknown as { end(): void }).end();
            server.close(() => done());
            server.closeAllConnections?.();
          }),
      });
    });
  });
}

/** `--scale 2` (device scale factor) or `--scale 1280x800` (viewport). */
export function parseScale(v: string | undefined): {
  factor: number;
  width?: number;
  height?: number;
} {
  if (v === undefined) return { factor: 1 };
  const wh = /^(\d{2,5})x(\d{2,5})$/.exec(v);
  if (wh) return { factor: 1, width: Number(wh[1]), height: Number(wh[2]) };
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 8)
    throw new UsageError("--scale must be a number in (0, 8] or WxH, e.g. 2 or 1280x800");
  return { factor: n };
}

/** `--dpi 192` means a device scale factor of 192/96. */
export function dpiFactor(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 24 || n > 768)
    throw new UsageError("--dpi must be between 24 and 768");
  return n / 96;
}

export async function runPreview(io: Io, args: Args): Promise<number> {
  const [file, ...extra] = args.positional;
  if (file === undefined || extra.length > 0)
    throw new UsageError("preview takes exactly one file");
  const abs = resolve(io.cwd, file);
  const f = args.flags;
  if (f.png === undefined) {
    const port = f.port === undefined ? 0 : Number(f.port);
    if (!Number.isInteger(port) || port < 0 || port > 65535)
      throw new UsageError("--port must be 0-65535");
    const p = await startPreview({ spec: abs, port, log: (s) => io.stderr(`${s}\n`) });
    io.stdout(`mdui preview: ${p.url}  (watching ${file}; Ctrl-C to stop)\n`);
    await new Promise<void>((done) => {
      process.once("SIGINT", () => void p.close().then(done));
      process.once("SIGTERM", () => void p.close().then(done));
    });
    return 0;
  }
  const scale = parseScale(f.scale);
  const factor = dpiFactor(f.dpi) ?? scale.factor;
  const p = await startPreview({ spec: abs });
  const q = new URLSearchParams({
    style: f.style ?? "clean",
    theme: f.theme ?? "auto",
    ...(f.state !== undefined ? { state: f.state } : {}),
  });
  let pw: {
    chromium: {
      launch(
        o?: object,
      ): Promise<{ newPage(o?: object): Promise<unknown>; close(): Promise<void> }>;
    };
  };
  try {
    pw = (await import("playwright-core")) as unknown as typeof pw;
  } catch {
    await p.close();
    throw new UsageError(
      "--png needs the optional dependency `playwright-core` (npm i -D playwright-core) and a Chromium browser",
    );
  }
  const exe = f.chromium ?? process.env["CHROMIUM_PATH"];
  const browser = await pw.chromium.launch(exe !== undefined ? { executablePath: exe } : {});
  try {
    const page = (await browser.newPage({
      viewport: { width: scale.width ?? 1024, height: scale.height ?? 768 },
      deviceScaleFactor: factor,
    })) as {
      goto(u: string): Promise<unknown>;
      screenshot(o: object): Promise<Buffer>;
    };
    await page.goto(`${p.url}frame?${q}`);
    const png = await page.screenshot({ fullPage: true });
    mkdirSync(dirname(resolve(io.cwd, f.png)), { recursive: true });
    writeFileSync(resolve(io.cwd, f.png), png);
    io.stdout(`${f.png} (${png.length} bytes, scale ${factor})\n`);
  } finally {
    await browser.close();
    await p.close();
  }
  return 0;
}
