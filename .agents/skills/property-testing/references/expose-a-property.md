# Expose a property when there seems to be none

Read this when the function under test seems to have no property to assert. Part of the
`property-testing` skill; the method and the tooling are in `SKILL.md`.

"No algebraic shape" is usually a fact about how the code is arranged, not about what it does.
These rearrangements expose a property, strongest first. Each one changes production code to
make a test possible, so it is the owner's decision: suggest the change once, name the property
it unlocks, and take the answer either way.

1. **Extract the pure core.** A function that fetches, calculates and saves has a property in
   the middle and no way to reach it. Move the calculation into a function that takes values
   and returns a value; keep the fetch and the save in a two-line wrapper with example tests.
   The core now supports invariants (a total never negative, never above the undiscounted
   sum), monotonicity, an oracle. The same move applies to anything whose observable is a side
   effect: build the message, the request, the query object, then send it.
2. **Add the missing inverse.** A one-way serializer has no round-trip by definition. A decoder
   written only for the test unlocks the strongest property in the catalog, and a serializer
   nobody can read back is usually a latent bug rather than a design.
3. **Structured value plus a renderer.** A string built by concatenation has nothing to assert
   beyond "contains a substring". Split the value from its rendering; render and parse become a
   round-trip, and that is where escaping and quoting bugs live.
4. **Return a value instead of mutating.** An in-place mutation destroys the input before you
   can compare against it. A copying wrapper is enough for the test to have something to hold.
5. **Inject the dependency.** A function reading a global, a module constant or the
   environment can be tested only at whatever those happen to be. Pass the bound in as a
   parameter and the generator can drive it to zero, to one and to the maximum, where
   validators actually break.
6. **Make arrival order an input.** Startup and coordination logic that reacts to "dependency
   X is ready" callbacks scattered across modules has no property to assert. Gather it into
   one function that takes the sequence of readiness events and returns the resulting state;
   now "the same state for every order of arrival" is a property, and the section below tests
   it.

Do not suggest this when the property it would unlock is only "no crash", when the module needs
wholesale restructuring (say that once, plainly, instead of twenty suggestions on one file),
or when the change breaks a public API without a compatible variant. After any refactor run the
existing tests and say you did.
