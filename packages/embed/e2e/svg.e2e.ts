// T-094: generated SVGs parse with a real XML parser and load as images, in both colour schemes. Needs Chromium: `pnpm test:e2e`.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { parse } from "@vrillabs/mdui-core";
import { chromium, type Browser } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderSvg } from "../src/index.js";

const exe = ["/opt/pw-browsers/chromium", process.env["CHROMIUM_PATH"] ?? ""].find(
  (p) => p !== "" && existsSync(p),
);
const dir = new URL("../../../examples/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".ui.md"));

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch(exe !== undefined ? { executablePath: exe } : {});
});
afterAll(async () => void (await browser?.close()));

describe("generated SVG in a real browser", () => {
  for (const style of ["wireframe", "clean", "sketch"] as const)
    for (const f of files)
      it(`${f} · ${style}`, async () => {
        const svg = renderSvg(parse(readFileSync(new URL(f, dir), "utf8")), { style });
        const page = await browser.newPage();
        const res = await page.evaluate(async (s) => {
          const err = new DOMParser()
            .parseFromString(s, "image/svg+xml")
            .querySelector("parsererror");
          const img = new Image();
          const loaded = await new Promise<boolean>((ok) => {
            img.onload = () => ok(true);
            img.onerror = () => ok(false);
            img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(s)))}`;
          });
          return {
            parseError: err?.textContent ?? null,
            loaded,
            w: img.naturalWidth,
            h: img.naturalHeight,
          };
        }, svg);
        expect(res.parseError).toBeNull();
        expect(res.loaded).toBe(true);
        expect(res.w).toBeGreaterThan(100);
        expect(res.h).toBeGreaterThan(20);
        await page.close();
      });
});
