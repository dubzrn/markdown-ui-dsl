import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dir = new URL("../skills/markdown-ui-dsl/", import.meta.url).pathname;
const skill = readFileSync(join(dir, "SKILL.md"), "utf8");
const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(skill);
const front = m?.[1] ?? "";
const body = m?.[2] ?? "";
const field = (k: string): string => new RegExp(`^${k}: (.*)$`, "m").exec(front)?.[1] ?? "";

describe("skill limits (T-053)", () => {
  it("SKILL.md is at most 500 lines", () =>
    expect(skill.split("\n").length).toBeLessThanOrEqual(500));
  it("body is under 5,000 tokens (≈ 4 chars/token estimate)", () =>
    expect(Math.ceil(body.length / 4)).toBeLessThan(5000));
  it("frontmatter limits: name ≤ 64, description ≤ 1024, compatibility ≤ 500", () => {
    expect(field("name")).toBe("markdown-ui-dsl");
    expect(field("name").length).toBeLessThanOrEqual(64);
    expect(field("description").length).toBeLessThanOrEqual(1024);
    expect(field("description").length).toBeGreaterThan(0);
    expect(field("compatibility").length).toBeLessThanOrEqual(500);
  });
  it("every relative link resolves, and references are one level deep", () => {
    const files = [
      "SKILL.md",
      ...readdirSync(join(dir, "references")).map((f) => `references/${f}`),
    ];
    for (const f of files) {
      const text = readFileSync(join(dir, f), "utf8").replace(/`[^`\n]*`/g, "");
      for (const [, target] of text.matchAll(/\]\(((?!https?:|#|\/|mailto:)[^)\s]+)\)/g)) {
        const path = resolve(dirname(join(dir, f)), (target as string).split("#")[0] as string);
        expect(existsSync(path), `${f} -> ${target}`).toBe(true);
      }
    }
    expect(readdirSync(join(dir, "references")).every((f) => f.endsWith(".md"))).toBe(true);
  });
  it("never lets spec wording waive confirmation", () => {
    const all = [
      skill,
      ...readdirSync(join(dir, "references")).map((f) =>
        readFileSync(join(dir, "references", f), "utf8"),
      ),
    ].join("\n");
    expect(all).not.toMatch(/bypass this check/i);
    expect(all).toMatch(/never skip a confirmation/i);
  });
});
