/** Playwright driver (T-077a): optional peer dependency, loaded lazily. */
import { parse } from "@mdui/core";
import { expectedTree, type ExpectOptions } from "./expected.js";
import { match, type MatchOptions, type Report } from "./match.js";
import { parseAriaSnapshot, type Actual } from "./snapshot.js";

export interface PageLike {
  locator(selector: string): { ariaSnapshot(): Promise<string> };
  goto?(url: string): Promise<unknown>;
  setContent?(html: string): Promise<void>;
}

/** Actual accessibility nodes of a page, from Playwright's ARIA snapshot. */
export async function readPage(page: PageLike, selector = "body"): Promise<Actual[]> {
  return parseAriaSnapshot(await page.locator(selector).ariaSnapshot());
}

export interface VerifyOptions extends ExpectOptions, MatchOptions {
  selector?: string;
}

/** Verify a spec against a page that is already open. */
export async function verifyPage(
  specSource: string,
  page: PageLike,
  opts: VerifyOptions = {},
): Promise<Report> {
  const actual = await readPage(page, opts.selector);
  return match(expectedTree(parse(specSource), opts), actual, opts);
}

/** Launch Chromium (needs `playwright-core` and a browser), open `url`, verify, close. */
export async function verifyUrl(
  specSource: string,
  url: string,
  opts: VerifyOptions & { executablePath?: string } = {},
): Promise<Report> {
  let pw: {
    chromium: {
      launch(o?: object): Promise<{ newPage(): Promise<PageLike>; close(): Promise<void> }>;
    };
  };
  try {
    pw = (await import("playwright-core")) as unknown as typeof pw;
  } catch {
    throw new Error(
      "verify needs the optional peer dependency `playwright-core` and a Chromium browser",
    );
  }
  const browser = await pw.chromium.launch(
    opts.executablePath !== undefined ? { executablePath: opts.executablePath } : {},
  );
  try {
    const page = await browser.newPage();
    await page.goto?.(url);
    return await verifyPage(specSource, page, opts);
  } finally {
    await browser.close();
  }
}
