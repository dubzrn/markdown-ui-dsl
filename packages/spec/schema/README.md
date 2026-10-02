# AST JSON Schema

`ast.schema.json` describes the JSON form of `@mdui/core`'s `Document`. It is **generated** by `scripts/gen-ast-schema.mjs`
(`--check` runs in CI) and validated against every conformance fixture and example (`packages/core/test/schema.test.ts`).

- `$id` encodes the DSL version (`…/ast-2.0.schema.json`). One schema covers 1.x and 2.0 documents; the `dsl` property says which.
- **Breaking-change policy:** removing a node kind or property, or changing a property's type, is breaking ⇒ new `$id` version
  and a `CHANGELOG` entry. Adding an optional property or a new node kind is additive (minor).
- Property order and `lineStarts` are informational; consumers must not depend on them.
- Zod is deliberately not used (ADR-002: no runtime dependencies in `@mdui/spec`); the schema is the contract and the tests keep the parser honest.
