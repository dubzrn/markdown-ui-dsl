# Reviewing existing property tests

Read this when asked whether existing property tests assert anything real. Part of the
`property-testing` skill; the method and the tooling are in `SKILL.md`.

A property test can pass for years while asserting nothing. Find them (`@given(` and
`from hypothesis`, or `fc.assert` and `fc.property`) and check each against this list, worst
first. Report every issue with its severity; do not decide on the author's behalf that a
medium one is not worth mentioning.

| Issue | Severity | How it shows up |
| --- | --- | --- |
| Tautological | critical | True regardless of the implementation |
| Vacuous | critical | Preconditions discard nearly everything, or contradict each other |
| No assertion | high | The body calls the function and stops |
| Reimplementation | high | The assertion recomputes the function's own logic |
| Weaker property available | medium | Length checked, ordering not |
| Over-filtered | medium | Stacked preconditions where a generator constraint belongs |
| Settings | low | A handful of runs, or a tight deadline on an expensive generator |

Compare each test against the checklist above and name the strongest property the code supports
but the suite does not assert; "checks the length, never the order" is the common case. Also
flag floating-point equality without a tolerance, assertions on set or map iteration order, and
anything reading the clock: these flake, get blamed on the library, and get deleted.
