# Releasing

Packages are published to npm under the `@vrillabs` scope by `.github/workflows/publish.yml`. Nothing has been published yet.

## What gets published

Every directory in `packages/` except `evals` (private): `@vrillabs/mdui-core`, `-spec`, `-catalog`, `-lint`, `-render`, `-tools`, `-tokens`, `-grammar`, `-sync`, `-oracle`, `-export`, `-embed`, `-mcp`, `-cli`. All share one version (currently `0.1.0`).
Each tarball carries `dist/`, `LICENSE` and `NOTICE` (added by `prepack`); `@vrillabs/mdui-spec` also ships `grammar/`, `schema/` and `conformance/`.

## One-time setup (owner)

1. The repository secret **`NPM_REGISTRY_TOKEN`** must be an npm **granular access token** with *read and write* permission on the `@vrillabs` packages (or scope) and, because CI cannot answer a one-time password, the option that lets it publish without 2FA. A token that needs an OTP fails with `EOTP`.
2. Provenance needs a public GitHub repository and publishing from GitHub-hosted runners (the workflow has `id-token: write`). npm checks that `repository.url` in each `package.json` matches the repository running the workflow (`https://github.com/dubzrn/markdown-ui-dsl.git`).
3. First publish of a scoped package must be `--access public` (the workflow passes it, and each package sets `publishConfig.access`).

## Cutting a release

1. Bump versions (all packages together) in a pull request: `pnpm changeset` then `pnpm changeset version`, or edit the `version` fields and `VERSION` / `SERVER_INFO` constants by hand (a test fails if the CLI and MCP versions disagree with their `package.json`). Regenerate the conformance manifest: `node scripts/gen-conformance-manifest.mjs`.
2. Merge. Then **dry run**: Actions → *Publish* → *Run workflow* with `dry_run` ticked (the default). It runs the full check, packs every package and shows what would be published.
3. Create a GitHub release whose tag is `v<version>` (for example `v0.1.0`). Publishing the release runs the workflow; it refuses a tag that does not match the package version. A version with a hyphen (`0.2.0-rc.1`) is published under the `next` dist-tag, anything else under `latest`.

## Checks before the publish step

`pnpm check` (schema, build, lint docs, typecheck, lint, format, tests), the conformance manifest check, the docs-site link check, and `scripts/clean-room-install.mjs`, which packs every package, installs the tarballs into an empty directory with npm, and runs the CLI and the MCP server from there.

## Not verified

* The workflow has not run: there is no way to use the token or the runner's OIDC identity from outside GitHub. Run the dry run first.
* Provenance generation itself (`NPM_CONFIG_PROVENANCE` plus `publishConfig.provenance`) is configured per the npm and GitHub documentation but untested.
* Installing from the registry (as opposed to from packed tarballs) is untested until the first publish.
* GitHub Actions in the workflow are pinned by tag, not commit SHA.
