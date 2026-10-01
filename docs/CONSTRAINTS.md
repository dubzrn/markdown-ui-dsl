# UX constraint contracts (NOV-04)

Declare what a screen must satisfy; `mdui lint` checks it on the spec (and, for flows, on the navigation graph) **before any code exists**. A constraint is a contract: its rule stays silent until you declare it.

```yaml
---
dsl: 2.0
constraints:
  max-primary-actions: 1
  form-fields: { max: 7 }
  every-input-labelled: true
  heading-order: strict
---
```

Declare it in frontmatter (per screen), in `mdui.config.json` (`"constraints": { … }`, project-wide), or for one region with a hint: `> constraint: max-primary-actions=2`. The nearest declaration wins.

| Constraint | Checks | Code | Default severity |
|---|---|---|---|
| `max-primary-actions` | primary actions (`{: primary }`) per region (default 1) | W5301 | warn |
| `form-fields` | inputs, checkboxes, radios, toggles, dropdowns, slider/date/file per region (default 7) | W5302 | warn |
| `flow-depth` | steps from `start` to each terminal screen (default 3) | W5303 | warn |
| `back-path-exists` | every non-start, non-terminal screen can get back to `start` | W5304 | warn |
| `destructive-needs-confirm` | a `{: destructive }` button opens a MODAL (target is the modal's `#id`) or declares `undo` | W5305 | warn |
| `no-dead-ends` | every non-terminal screen has an outgoing transition | W5306 | warn |
| `states-required` | data-bound REGIONs define the listed STATEs (default loading, empty, error) | W5307 | warn |
| `error-recovery-message` | an `error` STATE contains a button or link | W5308 | warn |
| `unique-primary-per-modal` | each MODAL has exactly one primary action | W5309 | warn |
| `max-nav-items` | header links, tabs and menubar items (default 7) | W5310 | warn |
| `help-reachable` | a link or button labelled help, support, contact or FAQ | W5311 | warn |
| `every-input-labelled` | text inputs carry `label=` (a placeholder is not a label) | E5321 | **error** |
| `heading-order` | no skipped heading levels; strict: the first heading is level 1 | E5322 | **error** |
| `tap-target` | declared `size=` is at least N px (default 44); the measured check is post-code (Oracle, T-080) | E5323 | **error** |

Unknown names are E5331, bad values E5332. Each rule is a lint rule `constraint-<name>`, so severities are tunable in config (`"rules": { "constraint-heading-order": "warn" }`). Thresholds are configurable defaults, not universal usability truth.

The flow rules (`flow-depth`, `back-path-exists`, `no-dead-ends`) run on `type: flow` documents and use the navigation graph of `## Screens` / `## Transitions`.

## Waivers

```md
::: CARD :::
> waive: form-fields reason="Checkout legally needs nine fields"
```

A waiver suppresses that constraint inside its enclosing region (or the whole document at top level) and is recorded. A waiver needs a `reason` and a known constraint (E5333); one that suppressed nothing is reported (I5334) so it can be removed. Removing a waiver brings the diagnostic back. `mdui lint --audit-waivers` lists every waiver with its reason and how many diagnostics it suppressed. (Recording waivers in `.ui.lock` arrives with the lock format, T-072.)

## Evaluation

`node scripts/eval-nov04.mjs` (CI: `--check`) runs 31 seeded-violation specs and 15 clean specs; results in [`evals/NOV-04.md`](../evals/NOV-04.md): recall 31/31, 0 false positives. The fixtures are small hand-written specs (one construct per rule); they show each rule fires and stays quiet where it should, not behaviour on arbitrary real screens.
