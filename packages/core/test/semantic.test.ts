import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyze, parse } from "../src/index.js";

interface Fixture {
  id: string;
  input: string;
  file?: string;
  files?: Record<string, string>;
  expect: { diagnostics: { code: string; line: number }[] };
}
const fixtures = JSON.parse(
  readFileSync(new URL("../../spec/conformance/v2/semantic.json", import.meta.url), "utf8"),
) as Fixture[];

describe("semantic conformance (T-022/T-023/T-025/T-026)", () => {
  it("has at least 60 fixtures", () => expect(fixtures.length).toBeGreaterThanOrEqual(60));
  it.each(fixtures.map((f) => [f.id, f] as const))("%s", (_id, f) => {
    const doc = parse(f.input);
    expect(doc.diagnostics.map((d) => d.code)).toEqual([]);
    const reads: string[] = [];
    const files = f.files;
    const r = analyze(doc, {
      ...(f.file !== undefined ? { file: f.file } : {}),
      ...(files !== undefined
        ? {
            readFile: (p: string): string | undefined => {
              reads.push(p);
              return files[p];
            },
          }
        : {}),
    });
    expect(r.diagnostics.map((d) => ({ code: d.code, line: d.span.start.line }))).toEqual(
      f.expect.diagnostics,
    );
    // sandbox: a path that leaves the root is never handed to readFile
    for (const p of reads) expect(p.startsWith("..") || p.startsWith("/")).toBe(false);
  });
});
