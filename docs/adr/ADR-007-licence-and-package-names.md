# ADR-007: Licence and npm package names

Status: Accepted · Date: 2026-10-02 · Decided by: the repository owner (instruction in the working session) · Closes assumption A3

## Decision

1. **Licence.** The repository is licensed under the **VRIL LABS Open Source License v1.0** (text copied verbatim from
   <https://github.com/VRIL-LABS/open-source-license-v1>, VLABS, LLC as Licensor), in `LICENSE`.
2. **Upstream notice kept.** The project derives from `MegaByteMark/markdown-ui-dsl`, published under MIT. MIT requires its copyright and
   permission notice to stay with the work, so it is reproduced unchanged in `NOTICE` together with a pointer to
   `THIRD_PARTY_NOTICES.md` and `THIRD_PARTY_LICENSES/` (files copied from other projects keep their own licences, for example the
   Apache-2.0 A2UI schemas).
3. **Attribution.** The licence's section 4(a) notice is shown in the README (top and licence section) and in the docs-site footer.
4. **npm metadata.** Packages declare `"license": "SEE LICENSE IN LICENSE"`: the text is not an OSI-approved or SPDX-identified licence, so
   no SPDX id is claimed. `prepack` copies `LICENSE` and `NOTICE` into every tarball (`scripts/copy-license.mjs`), because the licence
   requires a copy with every distribution.
5. **Package names.** The npm scope the owner controls is `@vrillabs`. `@mdui/*` was never owned by this project, so the packages are
   published as **`@vrillabs/mdui-<name>`** (`-core`, `-spec`, `-lint`, `-render`, `-cli`, …). CLI binaries keep their names (`mdui`,
   `mdui-mcp`). Closes assumption A2.

## Consequences

* The licence is more restrictive than MIT in one way that matters to downstream users: it makes attribution to VRIL LABS a condition of
  every permission, and breach of that condition ends the licence (section 12). Users should read it; the README says so.
* Section 4(a)3 asks for the notice to be visible to end users of software built on this work. That obligation falls on those users, not on
  this repository.
* Contributions are accepted under the same licence (section 8).
* Vendored third-party skills and files are not relicensed. Three skills (`accessibility`, `web-quality-audit`, `best-practices`) declare MIT
  in frontmatter only; their upstream licence is still unverified and is listed in `docs/GA_CHECKLIST.md`.
* The licence text names VLABS, LLC as copyright holder. If another person or entity holds copyright in contributions, that is for the
  owner to settle with them; this ADR does not.
* This is a working decision recorded by an engineer, not legal advice.
