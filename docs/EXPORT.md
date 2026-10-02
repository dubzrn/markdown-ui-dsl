# Exporters (T-090, T-091)

`mdui export <spec> --to a2ui|json-render [--state s] [--out file] [--strict]` writes JSON to stdout (or `--out`) and
prints one line per construct that did not map one-to-one to stderr (`file:line kind construct: message`).
`--strict` turns any warning into exit 1. Programmatic use: `exportA2ui(doc, opts)` and `exportJsonRender(doc, opts)`
from `@mdui/export` (depends only on `@mdui/core`; the schema validators are dev dependencies).

Warning kinds: **degraded** (nearest equivalent used), **dropped** (nothing exported), **synthesized** (the exporter
had to invent something the DSL does not say, such as an empty image URL). Comments and `> hint:` lines are author
notes, not UI, and are not exported (and not warned about). Everything else is reported.

## A2UI v1.0 (T-090)

Pinned to google/A2UI commit `102ec1a04975` (the upstream README still calls v1.0 "a candidate for becoming
stable"). Output is `createSurface` + `updateComponents` (+ `updateDataModel` when the spec binds data) against the
**basic catalog**. The vendored schemas are in `packages/export/schemas/a2ui-1.0/`; every message produced for every
shipped example is validated against them in `packages/export/test/a2ui.test.ts`.

| DSL | A2UI | Note |
|---|---|---|
| root | `Column` with id `root` | |
| `COLUMN` / `ROW` | `Column` / `Row` | |
| `CARD` | `Card` + inner `Column` | |
| `MODAL` | `Modal` | **synthesized**: a `Button` "Open" is added as the required trigger |
| `HEADER` / `FOOTER`, bubbles | `Row` / `Card` | degraded: no landmark semantics |
| heading | `Text` with `#`s | degraded: no heading level in the catalog |
| text, `**`, `*`, code | `Text` (Markdown) | |
| `[ Button ](#id)` | `Button` + `event` action named `id` | `primary` → variant |
| `[Link](https://…)` | borderless `Button` + `openUrl` | relative targets become a `navigate` event (degraded) |
| `[ text: … ]` | `TextField` | `type=password` → `obscured`, `number` → `number` |
| `[x]` / `[on]` | `CheckBox` | toggle is degraded |
| `( )` | single-option `ChoicePicker` | degraded |
| `[v] A {x, y}` | `ChoicePicker` (mutually exclusive) | `{dynamic: …}` exports no options (degraded) |
| `[ IMG: … ]`, avatar | `Image` (empty `url`) | synthesized |
| `SLIDER`, `DATE`, `ICON` | `Slider`, `DateTimeInput`, `Icon` | icons outside the catalog set become text |
| `{{ path }}` | `{path: "/json/pointer"}` or `formatString` | placeholders (`""`) in `updateDataModel` |
| `GRID cols=n` | `Column` of `Row`s | degraded |
| `REGION`/`STATE` | the chosen state's body (`--state`) | other states **dropped** (warned) |
| `EACH`, `IF` | body exported once | degraded: not bound |
| tabs, table, list | `Row` of Buttons, Rows of `Text`, `Row`s with a marker | degraded |
| `CHART`, `STAT`, `PROGRESS`, `CRUMBS`, … | text / Rows | degraded; `SKELETON` dropped |
| breakpoint directives | | **dropped** (warned) |

## json-render (T-091)

json-render has no fixed component set, so the output is `{ spec, catalog }`: a flat element map
(`root`, `elements`, seed `state`) and the catalog it assumes (`mdui`: 25 components, 3 actions: `navigate`,
`submit`, `openUrl`). Element keys are stable (`e1`, `e2`, … in document order). Validated with json-render's own
`validateSpec` from `@json-render/core@0.21.0` (Apache-2.0, dev dependency) with orphan checking on, for every example.

| DSL | json-render |
|---|---|
| bindings | `{$state: "/a/b"}`, `{$template: "Hi ${/a/b}"}`, `{$item: "field"}` inside `EACH` |
| `EACH row in rows` | `repeat: {statePath: "/rows"}`; state seeded with `[]` (the validator requires an array) |
| `IF path` / `IF !path` | `visible: {$state}` / `{$state, not: true}` |
| `REGION` + `STATE` | every STATE exported with `visible: {$state: "/ui/<region>", eq: "<state>"}`; default seeded |
| buttons | `on.press` actions `submit` / `navigate` / `openUrl` |
| widgets without a component | `Placeholder` (degraded, warned) |

## Not verified

* The A2UI output has not been rendered by an upstream renderer, and the json-render output has not been rendered by
  an application: only schema/structure validation is automated. Both are listed as manual checks in T-090/T-091.
* The `mdui` json-render catalog is this project's choice, not a published catalog.
* `[use]` includes are resolved by the CLI; unresolved ones are dropped with a warning.
