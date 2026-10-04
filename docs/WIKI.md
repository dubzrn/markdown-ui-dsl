# The GitHub Wiki

The wiki is **generated** from this repository; edit `docs/` (or `examples/`), never the wiki itself.

| Piece | Where |
|---|---|
| Builder | `scripts/build-wiki.mjs` (`pnpm wiki:check` verifies links, anchors and image formats; `pnpm wiki:build` writes `wiki-out/`) |
| Deploy | `.github/workflows/wiki.yml`: deploys only from `main` (push touching docs, examples, the banner or the builder, or a manual run). Pull requests and manual runs from other branches build and check only, so a feature branch can never overwrite the published wiki |
| Pages | the table at the top of the script (`PAGES`) maps each doc to a wiki page and a sidebar section |
| Banner | `docs/img/wiki-banner.png` (converted from the supplied WebP; wikis do not display WebP) is copied to `images/banner.png` and shown at the top of Home |
| Images | every `mdui` fence and `docs/img/*.svg` becomes a PNG in `images/`, plus `Gallery` (all examples × 3 styles) and `Architecture` |

Rules from GitHub's wiki documentation that the builder follows: a wiki is its own Git repository (`<repo>.wiki.git`) and only its default branch is live; the file name is the page title and `.md` selects the Markdown renderer; `_Sidebar.md` and `_Footer.md` fill the sidebar and footer; **only PNG, JPEG and GIF images are displayed** (hence the rasterising); page names avoid `\ / : * ? " < > |`; the soft limit is 5,000 files.

## One-time setup (needs a person)

1. Settings → Features → tick **Wikis**. Optionally tick *Restrict editing to collaborators only*, since the deploy overwrites manual edits anyway.
2. Open the **Wiki** tab and click **Create the first page** (save anything). GitHub creates `<repo>.wiki.git` only then; the workflow cannot do it.
3. Actions → **Wiki** → *Run workflow* (leave *dry run* off). Later pushes to `main` deploy automatically.

Until step 2 is done, a push to `main` still builds and checks everything, then ends **green with a warning** and a checklist in the run summary; a manual run fails so you know nothing was deployed.

The footer carries the VRIL LABS attribution required by `LICENSE` §4(a).
