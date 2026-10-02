import { describe, expect, it } from "vitest";
import { supportedVersions } from "../src/index.js";

describe("@mdui/core scaffold", () => {
  it("re-exports spec versions", () => {
    expect(supportedVersions).toContain("1.0");
    expect(supportedVersions).toContain("2.0");
  });
});
