# Sync, Oracle, grammars and constraints

Four features go beyond a wireframe format. Each has a reference page and a measured evaluation; the evaluations state what they do and do not show.

## NOV-01: Spec ↔ code sync

Keeps a spec and the code that implements it from drifting. Anchors (`{: #id }`, or `~xxxxxx` ids kept in a `.ui.lock`) pair spec nodes with code nodes; a three-way classifier labels each pair `clean`, `spec-ahead`, `code-ahead`, `converged`, `conflict`, `orphan-spec` or `orphan-code`.

```bash
mdui sync plan login.ui.md --code src/Login.tsx      # read-only
mdui sync apply login.ui.md --code src/Login.tsx --confirm   # writes; refuses without --confirm, verifies by re-extraction
```

Writes go through a journaled, root-confined atomic writer. Details and limits: [Sync](../SYNC.md), [measurements](../../evals/NOV-01.md).

## NOV-02: Spec Oracle

Checks a *running* page against the spec: the spec's expected accessibility tree is matched to Chromium's ARIA snapshot and a Fidelity Score is reported.

```bash
mdui verify login.ui.md --url http://localhost:5173 --min-fidelity 0.95
```

On the project's own ten rendered screens it detected 237 of 240 seeded mutations with 0 false positives on semantics-preserving refactors; those apps are this project's own renderings, so it is not a measurement on third-party code. See [Oracle](../ORACLE.md).

## NOV-03: Generation grammars

`mdui grammar` emits Lark, GBNF or a catalog-specialised JSON Schema so a constrained-decoding engine can only produce valid files.

```bash
mdui grammar --format gbnf --catalog shop.catalog.yaml > ui.gbnf
```

Grammar correctness is tested against Lark, llguidance, xgrammar and llama.cpp. **There is no measured result yet that constrained decoding makes models write better specs**: the benchmark harness exists and has not been run against a model. See [Grammars](../GRAMMAR.md) and [Evals](../EVALS.md).

## NOV-04: Constraints

Declare design rules in frontmatter and have them checked as lint rules (rule ids `constraint-*`), with waivers that need a reason.

```markdown
> waive: form-fields reason="Checkout legally needs nine fields"
```

See [Constraints](../CONSTRAINTS.md).
