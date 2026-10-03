// Dogfooding (T-040): the rendered output itself must pass axe-core. Run with `pnpm test:e2e` (needs Chromium).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { parse } from "@vrillabs/mdui-core";
import { chromium, type Browser } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { render, type StyleName } from "../src/index.js";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const exe = ["/opt/pw-browsers/chromium", process.env["CHROMIUM_PATH"] ?? ""].find(
  (p) => p !== "" && existsSync(p),
);

const examples = new URL("../../../examples/", import.meta.url);
const files = readdirSync(examples).filter((f) => f.endsWith(".ui.md"));

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch(exe !== undefined ? { executablePath: exe } : {});
});
afterAll(async () => void (await browser?.close()));

const styles: StyleName[] = ["wireframe", "clean", "sketch"];
describe("rendered examples pass axe-core", () => {
  for (const style of styles)
    for (const scheme of ["light", "dark"] as const)
      for (const f of files)
        it(`${f} · ${style} · ${scheme}`, async () => {
          const page = await browser.newPage({ colorScheme: scheme });
          await page.setContent(
            render(parse(readFileSync(new URL(f, examples), "utf8")), { style }),
          );
          await page.addScriptTag({ path: axePath });
          const result = await page.evaluate(async () => {
            // @ts-expect-error axe is injected into the page
            const r = await window.axe.run(document, {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
              },
              // `page-has-heading-one` is a property of the wireframe's content, not of the renderer;
              // the lint rule `single-h1` covers it (T-032).
              rules: { "page-has-heading-one": { enabled: false } },
            });
            return r.violations.map((v: { id: string; nodes: { html: string }[] }) => ({
              id: v.id,
              nodes: v.nodes.slice(0, 2).map((n) => n.html.slice(0, 140)),
            }));
          });
          await page.close();
          expect(result).toEqual([]);
        });
});
