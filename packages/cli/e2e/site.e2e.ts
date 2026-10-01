// T-092: the docs site and playground in a real browser, from file:// (no server). Needs Chromium: `pnpm test:e2e`.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = new URL("../../../", import.meta.url).pathname;
const exe = ["/opt/pw-browsers/chromium", process.env["CHROMIUM_PATH"] ?? ""].find(
  (p) => p !== "" && existsSync(p),
);
const axe = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const out = mkdtempSync(join(tmpdir(), "mdui-site-e2e-"));
const url = (p: string): string => `file://${join(out, p)}`;

let browser: Browser;
beforeAll(async () => {
  execFileSync("node", [join(root, "scripts/build-site.mjs"), "--out", out], {
    cwd: root,
    stdio: "pipe",
  });
  browser = await chromium.launch(exe !== undefined ? { executablePath: exe } : {});
}, 120_000);
afterAll(async () => void (await browser?.close()));

describe("playground (no server)", () => {
  it("parses, lints and previews, and updates fast", async () => {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (
        !r.url().startsWith("file:") &&
        !r.url().startsWith("about:") &&
        !r.url().startsWith("data:")
      )
        errors.push(`network request: ${r.url()}`);
    });
    await page.goto(url("playground.html"));
    await page.locator("#status").filter({ hasText: "diagnostic(s)" }).waitFor();
    const frame = page.frameLocator("iframe");
    await frame.getByRole("heading", { name: "Welcome Back" }).waitFor();
    await page.locator("#src").fill("::: CARD :::\n# Broken\n");
    await page
      .locator("#status")
      .filter({ hasText: /[1-9]\d* error/ })
      .waitFor();
    await page.getByRole("tab", { name: "Diagnostics" }).click();
    await page.locator("#p-diag").getByRole("link", { name: "E1001" }).waitFor();
    const ms = Number(await page.locator("#status").getAttribute("data-ms"));
    console.log(`playground update: ${ms} ms`);
    expect(ms).toBeLessThan(500);
    await page.getByRole("tab", { name: "SVG" }).click();
    expect(await page.locator("#p-svg svg title").textContent()).toBe("Broken");
    await page.getByRole("tab", { name: "A2UI" }).click();
    expect(await page.locator("#p-a2ui pre").textContent()).toContain("createSurface");
    expect(errors).toEqual([]);
    await page.close();
  });

  it("round-trips the source through the URL hash", async () => {
    const page = await browser.newPage();
    await page.goto(url("playground.html"));
    await page.locator("#src").fill("# Shared screen\n[ Go ](#go)\n");
    await page.waitForFunction(() => {
      try {
        return atob(decodeURIComponent(location.hash.slice(1))).includes("Shared");
      } catch {
        return false;
      }
    });
    const hash = await page.evaluate(() => location.hash);
    expect(hash.length).toBeGreaterThan(1);
    const p2 = await browser.newPage();
    await p2.goto(url("playground.html") + hash);
    expect(await p2.locator("#src").inputValue()).toBe("# Shared screen\n[ Go ](#go)\n");
    await page.close();
    await p2.close();
  });
});

describe("site", () => {
  it("search finds a diagnostic page and navigates to it", async () => {
    const page = await browser.newPage();
    await page.goto(url("index.html"));
    await page.locator("#q").fill("E1001");
    const hit = page.locator("#results a", { hasText: "E1001" }).first();
    await hit.waitFor();
    await hit.click();
    await page.waitForURL(/diagnostics\/E1001\.html/);
    expect(await page.locator("h1").textContent()).toContain("E1001");
    await page.close();
  });

  for (const scheme of ["light", "dark"] as const)
    for (const p of [
      "index.html",
      "playground.html",
      "diagnostics/index.html",
      "diagnostics/E1001.html",
      "docs/SPEC.html",
    ])
      it(`${p} passes axe-core (${scheme})`, async () => {
        const page = await browser.newPage({ colorScheme: scheme });
        await page.goto(url(p));
        await page.evaluate(axe);
        const v = await page.evaluate(async () => {
          const r = await (
            window as unknown as {
              axe: {
                run(
                  c: unknown,
                  o: unknown,
                ): Promise<{ violations: { id: string; nodes: { target: unknown }[] }[] }>;
              };
            }
          ).axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag22aa", "best-practice"] });
          return r.violations.map(
            (x) => `${x.id}: ${JSON.stringify(x.nodes.slice(0, 2).map((n) => n.target))}`,
          );
        });
        expect(v).toEqual([]);
        await page.close();
      });
});
