# Getting started

This repository is **pre-release**: nothing is published to npm yet, so you run the tools from a checkout.

```bash
pnpm install
pnpm build
alias mdui="node $PWD/packages/cli/dist/bin.js"
```

## 1. Write a screen

Save this as `login.ui.md`. The `dsl: 2.0` line turns on attributes, widgets, bindings, includes and flows; without it the file is plain DSL 1.x.

````markdown
---
dsl: 2.0
lang: en
title: Login
---

::: CARD :::
# Welcome Back
[ text: Email Address ]{: label="Email address" required }
[ text: Password ]{: label="Password" type=password required }
[x] Remember me
[ Login ](#login){: primary }
--- END ---
````

The same screen, drawn by `mdui svg login.ui.md --style sketch`:

```mdui style=sketch
::: CARD :::
# Welcome Back
[ text: Email Address ]{: label="Email address" required }
[ text: Password ]{: label="Password" type=password required }
[x] Remember me
[ Login ](#login){: primary }
--- END ---
```

## 2. Check it

```bash
mdui validate login.ui.md        # syntax and structure
mdui lint login.ui.md            # accessibility, semantics, tokens, safety, constraints
mdui lint login.ui.md --fix      # verified auto-fixes only
mdui rules                       # every rule with its WCAG 2.2 criterion
```

Exit codes: `0` clean, `1` diagnostics at or above `--fail-on`, `2` usage error, `3` internal error. Every diagnostic has a page under [Diagnostic codes](site:diagnostics/index.html).

## 3. See it

```bash
mdui preview login.ui.md                  # local server, live reload, style/theme/state/viewport toggles
mdui render login.ui.md --out login.html  # semantic, accessible HTML
mdui svg login.ui.md --out login.svg      # self-contained SVG
mdui preview login.ui.md --png login.png --scale 2   # needs the optional playwright-core
```

Or use the [playground](site:playground.html): everything runs in the page.

## 4. Hand it to an agent or another format

```bash
mdui export login.ui.md --to a2ui          # A2UI v1.0 messages
mdui export login.ui.md --to json-render   # json-render spec + catalog
mdui prompt                                # the instructions an agent needs (see the skill in skills/markdown-ui-dsl)
mdui stats login.ui.md                     # size and structure
```

Exporters print one warning per construct that does not map one-to-one; see [Exporters](../EXPORT.md).

## 5. Put it in a README

```bash
mdui embed README.md --write --out-dir docs/img   # turns mdui fences into generated SVG images
```

See [Embedding](../EMBED.md).

## Where next

* [Novel features](novel-features.md): sync, the Spec Oracle, constrained generation, constraints.
* [SPEC](../SPEC.md): requirements and syntax.
* [Skill reference](../../skills/markdown-ui-dsl/SKILL.md): what an agent is told.
