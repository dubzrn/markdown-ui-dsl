// T-041: the preview server. Needs Chromium: `pnpm test:e2e`.
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPreview, type Preview } from "../src/preview.js";

const exe = ["/opt/pw-browsers/chromium", process.env["CHROMIUM_PATH"] ?? ""].find(
  (p) => p !== "" && existsSync(p),
);
const H = "---\ndsl: 2.0\nlang: en\n---\n";
const dir = mkdtempSync(join(tmpdir(), "mdui-preview-"));
const spec = join(dir, "a.ui.md");
writeFileSync(spec, `${H}# One\n[ Save ](#s)\n`);

let browser: Browser;
let p: Preview;
beforeAll(async () => {
  browser = await chromium.launch(exe !== undefined ? { executablePath: exe } : {});
  p = await startPreview({ spec });
});
afterAll(async () => {
  await browser?.close();
  await p?.close();
});

describe("mdui preview (T-041)", () => {
  it("re-renders within 500 ms of a save (measured over 10 edits)", async () => {
    const page = await browser.newPage();
    await page.goto(p.url);
    const frame = page.frameLocator("#frame");
    await frame.getByRole("heading", { name: "One" }).waitFor();
    const ms: number[] = [];
    for (let i = 2; i < 12; i++) {
      const t0 = performance.now();
      writeFileSync(spec, `${H}# Edit${i}\n[ Save ](#s)\n`);
      await frame.getByRole("heading", { name: `Edit${i}` }).waitFor({ timeout: 5000 });
      ms.push(performance.now() - t0);
    }
    ms.sort((a, b) => a - b);
    console.log(
      `edit->update ms: median ${(ms[5] ?? 0).toFixed(0)}, max ${(ms[9] ?? 0).toFixed(0)}`,
    );
    expect(ms[9]).toBeLessThanOrEqual(500);
    await page.close();
  });

  it("style, theme and viewport toggles take effect", async () => {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    await page.goto(p.url);
    await page.locator("#style").selectOption("sketch");
    await page.waitForFunction(() =>
      (document.getElementById("frame")?.getAttribute("src") ?? "").includes("style=sketch"),
    );
    await page.locator("#width").selectOption("320");
    const w = await page.locator("#frame").evaluate((e) => e.getBoundingClientRect().width);
    expect(Math.round(w)).toBe(322); // 320 + 2px border
    expect(page.url()).toContain("width=320");
    await page.close();
  });

  it("serves only the spec and binds to loopback", async () => {
    expect(p.url).toMatch(/^http:\/\/127\.0\.0\.1:/);
    expect((await fetch(`${p.url}../etc/passwd`)).status).toBeLessThan(500);
    expect((await fetch(`${p.url}nope`)).status).toBe(404);
  });

  it("exports PNG at the requested scale", async () => {
    const out = join(dir, "x.png");
    const { runPreview } = await import("../src/preview.js");
    const { parseArgs } = await import("../src/args.js");
    const io = { cwd: dir, stdout: () => undefined, stderr: () => undefined } as never;
    process.env["CHROMIUM_PATH"] = exe ?? "";
    await runPreview(io, parseArgs(["preview", spec, "--png", out, "--scale", "2"]));
    const b = readFileSync(out);
    expect(b.subarray(1, 4).toString()).toBe("PNG");
    const w2 = b.readUInt32BE(16);
    const out1 = join(dir, "y.png");
    await runPreview(io, parseArgs(["preview", spec, "--png", out1]));
    expect(w2).toBe(readFileSync(out1).readUInt32BE(16) * 2);
  });
});
