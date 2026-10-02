# When a property test fails

Read this when a property test has failed and you must tell a wrong property from an
ambiguous spec from a real bug. Part of the `property-testing` skill; the method and the
tooling are in `SKILL.md`.

A failure means one of three things, and they need different responses: the property is wrong
(you asserted something the code never promised), the spec is ambiguous (behaviour at this
edge was never decided), or the code is wrong (a documented guarantee is violated). Telling
them apart is the work; skipping it is how property tests get a reputation for noise.

With the shrunk input in hand, ground the property in what the code actually promises, in
descending order of authority: an external specification (RFC, format definition), type
annotations, docstrings and contracts, existing tests, and last the function name. The name is
the weakest signal and the one most likely to mislead: plenty of functions called `normalize`
do something narrower than the word suggests.

| Symptom | Cause | Action |
| --- | --- | --- |
| Violates a documented guarantee | Code bug | Fix the code; pin the shrunk input as a permanent example |
| Input violates a documented precondition | Over-broad generator | Constrain the generator; not a bug |
| Property contradicts the docs or the types | Wrong property | Fix the property, and say so explicitly |
| Edge the spec never addresses | Ambiguous spec | Bring it to the owner as a decision, not as a bug |
| Disappears under realistic constraints | Test artifact | Fix the generator |
| Differs from a sibling function | Possible inconsistency | Raise it, flag the uncertainty |

Recurring patterns: a lone surrogate breaks a text round-trip, and whether that is a bug turns
on whether the format claims arbitrary strings or only valid UTF-8; a denormal float breaks a
numeric invariant, a genuine bug against a documented range and exactly the input no human
writes; equality without matching hash violates the language contract, no grounding needed;
an iterator that drops the last element is almost always real.

Replay with the seed and path only while debugging, then let them go. Fix the code, not the
property; if the property was wrong, say so and fix it, never weaken it quietly until it passes.
Report every finding with its classification attached, including the uncertain ones: "ambiguous
spec, needs your decision" is a finding, a suppressed one cannot be triaged by anyone.

Tell the owner what was found in product terms: which input, what the function did, what it
should have done. "On an empty list the chunking drops the tail" is a finding; the raw failure
output is not.
