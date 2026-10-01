# Spec Oracle (NOV-02)

Does the app actually match the spec? The Oracle compiles a `.ui.md` into the **accessibility tree it should produce**, reads the live page's real accessibility tree through Playwright's ARIA snapshot, matches the two, and reports per-node verdicts with a weighted **Fidelity Score**.

```bash
mdui verify login.ui.md --url http://localhost:3000/login --min-fidelity 0.95
mdui verify login.ui.md --html build/login.html --baseline oracle.baseline.json --write-baseline   # once
mdui verify login.ui.md --html build/login.html --baseline oracle.baseline.json                    # in CI
```

Needs the optional peer dependency `playwright-core` and a Chromium (`--chromium path` or `CHROMIUM_PATH`). Exit 0 when the score and constraints pass, 1 otherwise, 2 for usage errors.

## Mapping (spec to expected role)
| Spec | Role and name |
|---|---|
| `[ Buy ](#a)` | `button "Buy"` |
| `[Docs](/d)` | `link "Docs"` |
| `[ text: Email ]{: label="Email address" }` | `textbox "Email address"` (without `label=`, the placeholder is the name; `inputName: "none"` expects no name) |
| `[x] Agree` / `( ) Pick` / `[on] Dark` / `[v] Size {…}` | `checkbox` / `radio` / `switch` / `combobox` with the label as name |
| `[ IMG: Logo ]` | `img "Logo"` |
| `#`..`######` | `heading` with level |
| `HEADER` / `FOOTER` / `MODAL` | `banner` / `contentinfo` / `dialog` |
| `\|[ A ]\| B \|` | `tablist` with `tab "A"`, `tab "B"` |
| list, table | `list`, `table` |
| plain text line | `text` (weight 1) |
| `REGION` | the expected tree of one state (default `default`; `--state` picks another) |

Weights: interactive 3, heading 2, landmark 2, text 1. Fidelity = sum(weight x present) / sum(weight x expected).

## Matching
- **Order-aware subset** by default: extra page elements are fine, the spec's order must hold. Strict mode (`--strict`) reports extras and cannot reach 100% with any.
- Verdicts: `present`, `missing`, `role-mismatch` (right name, wrong role: a `div` styled as a button), `name-mismatch`, `order-mismatch`. Each carries the spec line.
- Names compare after whitespace and case folding; `--name-match loose` accepts containment. Text lines match by containment in a paragraph (apps wrap and join lines).
- Own matcher rather than Playwright's native template matching because that is order-sensitive; ours supports order-insensitive regions (`unorderedLines`).
- Generic wrappers (`generic`, `group`, `row`, ...) are ignored, so wrapping, classes, styles and decoration never change the score.

## Baselines
`--write-baseline` records the current score and the known divergences; later runs fail on any *new* non-present node or a lower score. `--min-fidelity` is an absolute floor. Pin the Chromium version in CI: accessible-name computation can differ between browser versions.

## Post-code constraints (T-080)
When the spec declares `constraints:`, these are verified on the live page and reported at the spec line of the node concerned: `every-input-labelled` (accessible names), `heading-order`, `landmarks-present` (banner/contentinfo/dialog the spec declares), `help-reachable`, and `tap-target` (measured with `getBoundingClientRect`, default 44 px).

## Benchmark (evals/NOV-02.md)
10 apps (every project example and SDD sample, rendered by `@mdui/render`), 240 seeded mutations (24 per app, 11 kinds: removed or renamed controls, a button turned into a div, lost heading semantics, changed heading levels, an unlabelled input, rewritten text, swapped controls, a removed landmark), and 240 semantic-preserving refactors (wrappers, classes, whitespace, attribute order, inline styles, decoration). Result: **recall 98.8%, false positives 0%, slowest screen 49 ms** (targets: >= 90%, <= 5%, <= 5 s). `node scripts/eval-nov02.mjs --check` in CI.

The apps are produced by this project's renderer, so they are closer to their specs than hand-written code would be, and the mutations are textual edits of that HTML. The benchmark shows the matcher separates semantic changes from refactors; it is not a measurement on third-party applications. No Flutter/native adapter.

## What running the Oracle on the renderer found
Dogfooding the Oracle against `@mdui/render` exposed real defects, now fixed: a toggle's accessible name included its state ("Dark: on"; the state belongs in `aria-checked`), and a top-of-page HEADER or bottom FOOTER was rendered inside `<main>` where it is not a `banner`/`contentinfo` landmark. Known remaining divergence: a spec whose HEADER is not at the top (e.g. `responsive-layout.ui.md`) still renders it inside the page, so that example scores 97.7%.
