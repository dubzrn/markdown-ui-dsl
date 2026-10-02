import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VERSION } from "../src/index.js";

const pkg = (
  p: string,
): {
  version: string;
  license: string;
  publishConfig: Record<string, unknown>;
  repository: { url: string };
} => JSON.parse(readFileSync(new URL(`../../${p}/package.json`, import.meta.url), "utf8"));

describe("release metadata (T-098)", () => {
  it("the version the CLI prints is the version in its package.json", () => {
    expect(VERSION).toBe(pkg("cli").version);
  });
  it("every package declares the licence file, public access, provenance and the GitHub repository", () => {
    for (const p of [
      "catalog",
      "cli",
      "core",
      "embed",
      "export",
      "grammar",
      "lint",
      "mcp",
      "oracle",
      "render",
      "spec",
      "sync",
      "tokens",
      "tools",
    ]) {
      const j = pkg(p);
      expect(j.license, p).toBe("SEE LICENSE IN LICENSE");
      expect(j.publishConfig, p).toEqual({ access: "public", provenance: true });
      expect(j.repository.url, p).toBe("https://github.com/dubzrn/markdown-ui-dsl.git");
      expect(j.version, p).toBe(pkg("core").version);
    }
  });
});
