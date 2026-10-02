# Generation grammars (NOV-03)

`@vrillabs/mdui-grammar` turns the language, the component catalog, the directive tokens and the data model into a grammar a constrained-decoding engine can enforce while a model writes a `.ui.md` file. `mdui grammar` emits it as **Lark**, **GBNF** or a catalog-specialised **JSON Schema** of the AST.

```bash
mdui grammar --format lark  --catalog shop.catalog.yaml --max-depth 4 > ui.lark
mdui grammar --format gbnf  --dsl 1 > ui-v1.gbnf
mdui grammar --format json-schema --catalog shop.catalog.yaml > ast.json
```

## What the grammar guarantees

| Guarantee | How |
|---|---|
| Every container is closed | containers nest recursively: an opener without its closer, or an orphan closer, is not derivable |
| 2.0 typed closers match | one rule per kind: `--- END CARD ---` only closes a CARD (E1004 impossible); untyped `--- END ---` stays valid |
| Closed world (2.0) | `[ UPPER: … ]` only for catalog widgets, `::: NAME … :::` only for catalog containers, anywhere a line or text can start (also inside text and list items) |
| Prop shapes | positional/named arguments, enums, numbers, booleans and data paths follow the catalog schema; built-in widgets follow the parser's own rules |
| `STATE` only in `REGION` | structural, so E1303 cannot occur |
| Nesting bound | `--max-depth N` unrolls the recursion |
| Token / data enumeration | `--tokens` limits directive names; `--data` limits `{{ path }}` and `EACH`/`IF` paths (and bans other `{` in text) |

## What it does not guarantee

A context-free grammar cannot express these; run `mdui lint` on the output as always:

- **Unique `#id`s**: the generation profile therefore omits `#id` attributes (the recogniser still accepts them).
- **Semantic and value rules**: frontmatter values, table width, breakpoint/token *values*, attribute values, accessibility, contrast. The conformance suite lists the invalid fixtures the grammar still accepts in `packages/grammar/test/accepted-invalid.json`; every structural class (unclosed, orphan, mismatched typed closer, unknown container) is rejected.
- **`builtins:` for inline forms**: a closed catalog restricts widgets and containers, not the generic `[ label ]` / checkbox / toggle / dropdown forms.
- **A bare `<!-- … --->` comment ending in three dashes** is not accepted by the recogniser (rare).
- The grammar describes LF-normalised text; CRLF is normalised before recognition.
- It is a **canonical subset** for generation (for example a paragraph cannot begin with `|`, `=`, `:` or `#`); the `recognize` profile used in tests is a superset that accepts every valid conformance fixture.

## Parity with the reference parser

`node scripts/grammar-parity.mjs` (nightly in CI, 100,000 strings per DSL version): every generated string parses with **zero errors** under `@vrillabs/mdui-core`, and a sample is accepted by the Earley recogniser. Local result for this revision: 2 × 100,000 strings, 0 problems.

| Check | Result |
|---|---|
| Valid conformance fixtures accepted (v1 valid, v2 valid, v2 block-valid) | 132 / 132 |
| Structurally invalid fixtures rejected | all (allow-list holds only semantic/value cases) |
| Catalog grammar: 1,500 generated documents lint clean with the catalog | 0 errors |

## Size, against A2UI Express

The task asks to record shape and size next to A2UI's `Express.g4` (a function-call expression language; `reference/protocols/a2ui/…/Express.g4`). **They are not equivalent**: Express describes expressions, ours a whole line-and-block document, so the numbers are for orientation only.

| | Express.g4 | mdui v1 (Lark) | mdui 2.0 default catalog (Lark) |
|---|---|---|---|
| lines | 169 | 26 | 56 |
| bytes | 3,757 | 3,952 | 14,951 |

## Engine matrix

Run `python3 scripts/engine-smoke.py` (needs `pip install lark llguidance tokenizers`; llama.cpp via `LLAMA_GBNF_VALIDATOR`). Corpus: 25 generated 2.0 documents the grammar must accept and 7 broken ones it must refuse (unclosed block, orphan closer, mismatched typed closer, unknown widget, unknown container, half-closed nesting, STATE outside REGION). Grammar options: `--max-depth 3`. Measured on this revision:

| Engine | Grammar | Result | Notes |
|---|---|---|---|
| Lark 1.3.1 (Python, Earley, dynamic lexer) | Lark | PASS, 25/25 accepted, 7/7 refused | slow: minutes for 32 documents; a reference engine, not a decoding backend |
| llguidance 1.9.1 (Rust; used by constrained-decoding servers) | Lark | PASS, 25/25 accepted, 7/7 refused | emulated byte-level decoding; broken documents are refused at the first offending byte |
| llama.cpp (`test-gbnf-validator` built from the source vendored in `llama-cpp-python` 0.3.36) | GBNF | PASS, 25/25 accepted, 7/7 refused | llama.cpp's own parser and matcher |
| llguidance 1.9.1, GBNF import | GBNF | NOTE, not a failure | llguidance converts GBNF to its lexer-based Lark dialect, which cannot resolve the ambiguity between nested indentation and closers that llama.cpp's scannerless matcher handles; use the Lark grammar with llguidance |
| xgrammar (PyPI, current at test time) | GBNF | PASS, 25/25 accepted, 7/7 refused | xgrammar's own EBNF parser, compiler and matcher, driven token by token over a byte-level vocabulary |
| vLLM, SGLang, TGI, Outlines (the serving layers) | **not verified** | | not installed here (GPU/model weights). These servers delegate constrained decoding to engines such as xgrammar and llguidance, which are tested above, but the server-side integration (grammar passing, tokenizer handling, sampling) was not run |
| Hosted APIs (OpenAI custom-tool grammars and similar) | **not verified** | | no access here. Hosted grammar conformance is reported as imperfect, so the rule is "strong constraint, always re-validate with `mdui lint`" |

Two interoperability bugs were found by running real engines and fixed: Lark rejects empty terminals (`""`), so the Lark emitter turns epsilon into optional groups; and GBNF only supports a few escapes, so `-` and `^` inside character classes are written as `\x2D` and `\x5E`.

## Limits of this evidence

- The smoke test checks that an engine's **matcher** accepts the grammar and the generated documents and refuses broken ones. No language model was run, so nothing here shows that a model writes *better* documents under the constraint; that is the T-061 benchmark and needs model access and the T-063 eval rubric.
- Hosted engines (OpenAI custom-tool grammars and similar) were not tested. Research reports their grammar conformance as imperfect, so for hosted engines the rule is **"strong constraint, always re-validate"** with `mdui lint`.
