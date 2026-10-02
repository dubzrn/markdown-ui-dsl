# Anchored three-way sync (NOV-01)

`mdui sync` keeps a `.ui.md` spec and the code that implements it honest as both change. It compares three states per **anchor**: the last agreed state (`.ui.lock`), the spec now, and the code now.

```bash
mdui sync plan  login.ui.md --code src/LoginForm.tsx,public/login.html      # read-only
mdui sync apply login.ui.md --code src/LoginForm.tsx --confirm              # writes spec patch + lock, atomically
mdui sync relink old-anchor new-anchor
mdui sync recover                                                            # roll back an interrupted apply
```

## Anchors
A *sync unit* is a CARD, MODAL, HEADER, FOOTER, REGION, DRAWER, PANEL, GROUP, CALLOUT, TOAST, ACCORDION, or any block with `{: #id }`. An explicit id is the anchor. Others get a generated `~xxxxxx` anchor, kept across edits by tree matching against the lock (same kind, item similarity >= 0.5, deterministic tie-break). Code carries the anchor as `data-mdui-anchor="name"`, or a `ui:anchor name` comment (HTML `<!-- -->`, TSX `// …` or `{/* … */}`) before the unit's root element.

## What is compared
A unit's **semantic fingerprint**: the ordered items a user can see or operate (role, accessible label, link target, heading level). Formatting, attribute order, class names and wrapper elements do not change it. HTML labels come from `aria-label`, `<label for>`, wrapping `<label>`, `alt`, `placeholder`, text; TSX is read only for the anchored elements (string literals and props; dynamic expressions are not interpreted). A component map (`--map`) tells the TSX adapter which components are buttons, inputs, and so on.

## Classes
| Class | Meaning | Action |
|---|---|---|
| `clean` | nothing changed | none |
| `spec-ahead` | spec changed | edit the code; the plan JSON (`toCode`) is the hand-off |
| `code-ahead` | code changed | `apply` patches the spec with minimal line edits |
| `converged` | both changed to the same thing | lock updated |
| `conflict` | both changed differently | choose: `--resolve anchor=code` (spec updated) or `=spec` (edit the code) |
| `orphan-spec` | spec unit has no code | generate it |
| `orphan-code` | code unit not in spec | `--resolve anchor=adopt` (adds it to the spec) or `=ignore` |

## Safety
- `apply` refuses without `--confirm`, a CLI flag; text in a spec or code file can never supply it.
- The new spec is **verified by re-extraction** before it is written; a unit that cannot be patched minimally is left untouched and reported.
- Writes go through a journal: every target's previous content is stored first, and a failed write restores all of them. A tampered journal cannot write outside the project root; paths outside the root are refused.
- The lock is written only with the spec it describes. Unknown lock versions are refused.

## Evaluation
- Classifier: 400 generated cases (10 scenarios, mutations on spec, code, both, formatting only, HTML and TSX): **888/888 per-anchor decisions correct**, confusion matrix in [`evals/NOV-01.md`](../evals/NOV-01.md). Target was >= 95% over >= 200 cases.
- Apply: 1,100 generated cases of apply then re-extract: patched units equal the code, every other unit is byte-identical, comments survive, apply is idempotent.
- Limits: the generated screens are small (headings, buttons, links, text inputs, checkboxes). Real code with conditional rendering, loops and component indirection is not interpreted; units that cannot be summarised show up as `unmapped` or fall back to a conflict a person resolves. No rendered-accessibility-tree extraction yet (arrives with the Oracle, T-076/T-077). No Dart/Razor adapters.
