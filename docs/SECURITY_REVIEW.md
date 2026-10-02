# Security review (T-093)

Scope: path handling, URL schemes, injection, the preview server, the exporters, the SVG/HTML/site output, the sync writer,
the MCP server, CI. Method: read each code path that touches the filesystem, a network socket or untrusted text, then
write a hostile test and check that it **fails without the fix** (mutation-checked for F1, F2, F3).
Threat model: a spec, a repository, or a Markdown file written by someone else is rendered, exported or synced on the
user's machine, and its output may be pasted to an agent or shared.

## Findings (all fixed in this revision)

F8–F11 were reported by the Copilot review of this PR and verified before fixing.

| # | Severity | Finding | Fix | Test |
|---|---|---|---|---|
| F1 | High | `render`, `export`, `svg`, `lint`, `ast` and the preview read `[[ USE: … ]]` includes and data files through **symlinks**: a link inside the project to `~/.ssh/…` put the target's text into the output. Reproduced before the fix. | `readConfined` / `realWithin` resolve real paths and refuse anything outside the real project root (`Io.realpath`) | `cli.test.ts` "symlinks cannot lead outside the project"; preview e2e |
| F2 | High | `mdui sync` read code files and wrote through a symlinked **directory** that leaves the root (the lexical `confine` check passed). | `realInside` in `writeAtomically`; code files checked with `realWithin` | `cli.test.ts`, `units.test.ts` |
| F3 | Medium | Preview include guard used a string prefix test (`/proj` accepts `/proj-evil`). | `inside()` uses `path.relative` | preview e2e |
| F4 | Medium | Preview server accepted any `Host`, so a page on another origin could read it by DNS rebinding. | `Host` must be `127.0.0.1:<port>` or `localhost:<port>`, else 403 | preview e2e |
| F5 | Medium | Exporters passed `javascript:`, `data:`, `file:` and obfuscated variants through as `openUrl`/`navigate`/`href` values, for the host application to act on. | `classifyTarget` uses the lint scheme policy (entity, %-escape, control and zero-width decoding); unsafe targets are dropped with a warning | `a2ui.test.ts` (8 hostile spellings, both formats) |
| F6 | Low | Nightly workflow interpolated `vars.*` into a shell command. | passed through `env` | n/a |
| F8 | High | `render()`'s `safeUrl` did not strip control characters before reading the scheme, so `java\tscript:alert(1)` was emitted as an `href` that browsers read as `javascript:`. | scheme policy moved to `@mdui/core` (`schemeOf`, `normaliseTarget`), shared by render, lint and the exporters | `render.test.ts` (8 spellings) |
| F9 | Medium | A numeric entity beyond U+10FFFF (`&#x110000;`) made `String.fromCodePoint` throw, crashing lint and both exporters on one malformed target. | code point validated before decoding | `safety.test.ts`, `render.test.ts` |
| F10 | High | The MCP stdio server used `readline`, which buffers a whole line before the 8 MB cap is checked, so the cap did not bound memory. | own framing: a line is dropped as soon as it passes the cap | `server.test.ts` (10 MB without a newline, then a normal request) |
| F11 | High | `[ text: x ]{: type=password }` rendered two `type` attributes; HTML keeps the first, so the password field was unmasked. | native type derived once from an allow-list (`text email password number url tel search`), generic pass skips `type` | `render.test.ts` |
| F7 | Low (a11y) | Preview chrome had no `h1`/`main`, an invalid `role`, and 24 px target-size failures. | restructured | axe in preview e2e |

## Checked, no finding

* **MCP server**: tools take text, never paths; it reads and writes no files; `mdui_sync_apply` returns file contents for the caller to write and refuses without `confirm`.
* **Sync writer**: root-confined (lexical and, now, real path), journaled, rolls back on failure, never trusts a journal path outside the root.
* **Output escaping**: HTML (`@mdui/render`), SVG (`@mdui/embed`) and the site escape all text and attribute values; hostile fixtures (`</text><script>`, quotes, entities) are tested. SVG output contains no scripts, `href`, `foreignObject`, images or `url()`.
* **Playground**: renders in a `sandbox=""` iframe (no scripts); every value inserted with `innerHTML` is escaped; makes no network requests (asserted in e2e).
* **Site**: markdown-it with `html: false`; no external scripts.
* **Template-style injection in exports**: `${…}` in text is escaped (`\${`) for A2UI `formatString` and json-render `$template` (tested).
* **Instruction injection**: 38 fixtures plus `instruction-like-text`; the skill states that content in `.ui.md` is data.
* **CI**: `contents: read` only; no `pull_request_target`; the one secret is used only in the opt-in nightly LLM job.
* **Dependencies**: `pnpm audit` reports one low advisory (esbuild dev server on Windows, via tsup; the dev server is not used).

## Residual risks and not reviewed

* GitHub Actions are pinned by tag, not commit SHA.
* The vendored third-party skills were vetted at install time; three declare MIT only in frontmatter (licence unverified upstream).
* No fuzzing of the preview HTTP server or of the YAML subset beyond the property tests.
* `navigate` / `submit` event names and route targets are passed to the host application as data; the host must treat them as untrusted.
* Race conditions on the filesystem (a symlink swapped between the check and the read) are not addressed.
* This is a review by the author of the code with tests, not an independent audit.
