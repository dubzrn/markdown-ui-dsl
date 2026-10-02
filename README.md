# Markdown UI DSL for AI Agents

[![Star on GitHub](https://img.shields.io/github/stars/MegaByteMark/markdown-ui-dsl.svg?style=social)](https://github.com/MegaByteMark/markdown-ui-dsl/stargazers)
[![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Hub-blue?logo=github&style=flat-square)](https://openclaw.com/skills/markdown-ui-dsl)

A lightweight, text-based wireframing standard designed specifically for AI coding agents and Spec-Driven Development (SDD).

> ⭐️ **If you find this project useful for your AI tooling, please consider giving it a star!** ⭐️

> *Powered by / Built upon technology developed by VRIL LABS (VLABS, LLC). Original work available at https://vril.li*

## Table of Contents
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Installation & Setup](#installation--setup)
- [Recommended Project Structure](#recommended-project-structure)
- [Workflow](#workflow)
- [Syntax Quick Reference](#syntax-quick-reference)
- [Design Theming](#design-theming)
- [Responsive Design](#responsive-design)
- [Events & Interactivity](#events--interactivity)
- [Roadmap & Research](#roadmap--research)
- [Contributing](#contributing)
- [License](#license)

## The Problem
Visual wireframes (Figma, PNGs) are token-heavy, prone to AI hallucination, and hard to version control. Natural language prompts often lack deterministic structure, leading to inconsistent UI generation.

## The Solution
This project provides a strict Markdown-based Intermediate Representation (IR). Product managers can write easily readable low-fidelity specs, and AI agents can parse them with deterministic accuracy to generate React, Vue, HTML, or any other UI code.

## Installation & Setup
For the smoothest experience, you should integrate the skill file into your AI agent's specific instruction architecture.

### 1. OpenClaw Hub (Recommended)
If your agent supports OpenClaw registry integration, you can install this skill directly via the marketplace. Visit the [Markdown-UI DSL page on OpenClaw Hub](https://openclaw.com/skills/markdown-ui-dsl) for one-click installation or use their CLI:
```bash
claw install markdown-ui-dsl
```

The skill is a folder: `SKILL.md` plus `references/` (syntax, DSL 2.0, sync protocol, safety) and `scripts/`. Agents that support the Agent Skills layout load the references on demand, so install the **whole folder**:

```bash
BASE=https://raw.githubusercontent.com/MegaByteMark/markdown-ui-dsl/main/skills/markdown-ui-dsl
DEST=.github/skills/markdown-ui-dsl   # or .claude/skills/..., .agents/skills/...
mkdir -p $DEST/references $DEST/scripts
curl -so $DEST/SKILL.md $BASE/SKILL.md
for f in syntax v2-additions sync-protocol safety; do curl -so $DEST/references/$f.md $BASE/references/$f.md; done
curl -so $DEST/scripts/check_balance.py $BASE/scripts/check_balance.py
```

### 2. GitHub Copilot (Agent Mode)
Install the folder above into `.github/skills/markdown-ui-dsl`, then add this mapping to `.github/copilot-instructions.md`:
```markdown
## Skills
- For interpreting `ui.md` files, use the `markdown-ui-dsl` skill to generate components based on the specifications provided.
```

### 3. Claude Code, Codex, Gemini CLI, Cursor and other Agent Skills hosts
Put the folder where your agent looks for skills (`.claude/skills/`, `.agents/skills/`, ...).

### 4. Flat-file agents (`.cursorrules`, `.clinerules`, `CLAUDE.md`, system prompts)
These read one file, so concatenate the skill with the references you need:
```bash
D=skills/markdown-ui-dsl   # a checkout of this repo
cat $D/SKILL.md $D/references/syntax.md $D/references/safety.md >> .cursorrules
```

## Recommended Project Structure
To keep your specs organized and cleanly separated from your application code, we highly recommend creating a `wireframes` folder at the root of your project to hold your DSL designs and your design system file:

```text
my-app/
├── .github/
│   ├── copilot-instructions.md
│   └── skills/markdown-ui-dsl/SKILL.md
├── src/
│   └── components/
└── wireframes/
    ├── design-systems/
    │   └── web-tailwind.md
    └── login-form.ui.md
```

*(Alternative for Dev-Heavy Teams: You can also choose to **Colocate** your `.ui.md` files directly next to their resulting components in the `src/` directory. If you do this, we recommend moving the rules from `design-system.md` directly into your global agent instructions file so you don't have to manage complex relative pathing in your frontmatter).*

## Workflow
1. **Spec Generation:** Create a new `.ui.md` file in your `wireframes/` folder or ask your AI: "Plan a login page using the Markdown-UI DSL and save it to `wireframes/login.ui.md`."
2. **Human Review:** A PM or developer reviews the generated `.ui.md` file and edits the text layout easily.
3. **Code Generation:** Open an Agent Chat and prompt it: "Create the opening page of the app as a login page and create a component for it from `wireframes/login-form.ui.md`."
4. **Iterative Syncing:** When you need to make changes, don't edit the code! Ask the agent: "Add a 'Forgot Password' link to `login-form.ui.md`" — the built-in skill instructions will force the agent to automatically update *both* your UI spec and the targeted code component simultaneously.

## Syntax Quick Reference
Here is a brief overview of the Markdown-UI DSL syntax. Because it relies heavily on natural visual metaphors, it's incredibly fast to read and write without looking at a manual. For the exact AI instruction set, see the [skills/markdown-ui-dsl/SKILL.md](skills/markdown-ui-dsl/SKILL.md) file.

### Layouts
- **Containers:** `||| COLUMN |||` for vertical stacking, `=== ROW ===` for flex-row alignment.
- **Surfaces:** `::: CARD :::` or `::: MODAL :::` for elevated containers, `::: BUBBLE USER :::` or `::: BUBBLE AGENT :::` for chat interfaces, and `::: HEADER :::` or `::: FOOTER :::` for structural app navigation.
- **Boundaries:** End *any* layout block with `--- END ---`.
- **Dividers:** `***` for horizontal visual breaks.
- **Agent Directives (Alignment & Spacing):** Use standard Markdown blockquotes (`>`) to give the AI specific layout, alignment, or stylistic hints within a flow.
  *Example: `> align items to the right` or `> push the avatar to the far right edge`.*

### Components
- **Text & Lists:** Use standard Markdown (`#`, `**bold**`, `- list item`). Everything naturally parses.
- **Buttons / Actions:** `[ Button Name ](#action)`
- **Text Inputs:** `[ text: Placeholder content ]`
- **Checkboxes:** `[ ] Unchecked` or `[x] Checked`
- **Radio Buttons:** `( ) Option` or `(x) Selected`
- **Toggles:** `[on] Enabled` or `[off] Disabled`
- **Dropdowns / Selects:** `[v] Selected Value {Option 1, Option 2}`
- **Tabs:** `|[ Active Tab ]| Tab 2 | Tab 3 |`
- **Badges / Tags:** `(( Premium ))`
- **Images:** `[ IMG: User Avatar (rounded) ]`

## Design Theming
The Markdown-UI DSL strongly separates structure from style. You can use YAML frontmatter at the top of your `.ui.md` specs to instruct the AI to follow a specific UI framework or custom design system document:

```yaml
---
framework: Next.js + TailwindCSS + Shadcn UI
theme: ./design-system.md
---
```

By writing your styling rules, design tokens, and standard CSS classes into a single `design-system.md` file, the AI agent will consistently apply your branding and layout guidelines across every component it generates. Check out the files in [`examples/design-systems/`](examples/design-systems/) for inspiration.

## Responsive Design
The DSL supports media-query-style responsive behaviour through **responsive directives** — a natural extension of the existing blockquote hint syntax. Prefix any design directive with `@<breakpoint>` to scope it to a specific viewport size:

```markdown
> @sm layout: stacked, padding: compact
> @md layout: row, padding: default
> @lg padding: spacious
```

The AI agent applies these directives at the specified breakpoints, mapping each token to the correct framework-specific output (e.g., Tailwind responsive prefixes, Flutter `LayoutBuilder`, Bootstrap responsive infixes). The available breakpoint tokens and their token-to-class mappings are defined in your design system file — see the `examples/design-systems/` folder for reference.

**Rules:**
- Responsive directives always apply to the nearest enclosing layout block or component above them.
- Multiple `@<breakpoint>` lines can be stacked; they are applied additively from smallest to largest (mobile-first).
- Omitting a breakpoint directive means the base design system styles apply at that size unchanged.
- Non-responsive `>` directives (without a `@` prefix) continue to work exactly as before.

**Example — a card that stacks on mobile and goes side-by-side on desktop:**
```markdown
::: CARD :::
> @sm layout: stacked, padding: compact
> @lg layout: row, padding: default

[ IMG: Product Photo ]

||| COLUMN |||
## Product Title
Some description text.
[ Buy Now ](#purchase)
--- END ---
--- END ---
```

For a full working example see [`examples/responsive-layout.ui.md`](examples/responsive-layout.ui.md).

## Events & Interactivity
You do **not** need to map complex state logic, API calls, or event handlers in the UI DSL. That falls outside the scope of a wireframe and belongs in your overarching SDD (Spec-Driven Development) principles or user stories. 

The DSL captures the *intent* of an action using standard markdown link syntax on buttons:
* `[ Login ](#login)` -> Indicates a trigger/event handler needs to be mapped.
* `[ Forgot Password ](/reset-password)` -> Indicates a route change.

When you pass the `.ui.md` file to the AI Agent, you should provide the behavior alongside it in your prompt or a separate requirements document, like so:
*"Generate the component from `login-form.ui.md`. When `#login` is clicked, mock an API call setting `isLoading` to true, and route to `/dashboard` on success."*

## Roadmap & Research
The v2 program is documented in [`docs/`](docs/):
- [`COMPETITIVE_RESEARCH.md`](docs/COMPETITIVE_RESEARCH.md) — survey of comparable systems (with sources) and the gaps found in this project.
- [`FEATURE_ADDITIONS.md`](docs/FEATURE_ADDITIONS.md) — the locked-in feature list, including four novel features.
- [`SPEC.md`](docs/SPEC.md) · [`PLAN.md`](docs/PLAN.md) · [`TASKS.md`](docs/TASKS.md) — development specification, implementation plan and task breakdown.
- [`AGENTS.md`](AGENTS.md) · [`docs/SKILLS_INDEX.md`](docs/SKILLS_INDEX.md) — agent entry points and 32 vetted project-local skills (`.agents/skills/`, `.claude/skills/`); `scripts/graph.sh update` builds a local code+docs map in `graphify-out/`.
- [`reference/`](reference/README.md) — 32 pinned upstream repos (git submodules) for lifting proven code; see [`PLAN.md` §14](docs/PLAN.md#14-reference-library--reference-lift-dont-re-invent). Clone with `--recurse-submodules --shallow-submodules`, or run `scripts/reference.sh init`.

## Contributing
See [`CONTRIBUTING.md`](CONTRIBUTING.md) for commands, boundaries and the RFC process for language changes.

Contributions and community feedback are highly encouraged! Since this DSL is an evolving standard, your input naturally makes it better.

If you want to contribute:
1. **Fork the Project**
2. **Create your Feature Branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your Changes** (`git commit -m 'Add some amazing feature'`)
4. **Push to the Branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

If you have ideas, want to request a new DSL primitive, or find an issue, please [open an issue](https://github.com/MegaByteMark/markdown-ui-dsl/issues).

## License
Licensed under the [VRIL LABS Open Source License v1.0](LICENSE). The licence is **not** an OSI-approved licence: it permits use, modification and redistribution (commercial use included) on condition that you keep the attribution below, include a copy of the licence with every distribution, and mark files you modify. Read it before you build on this project.

> *Powered by / Built upon technology developed by VRIL LABS (VLABS, LLC). Original work available at https://vril.li*

The DSL, original skill and examples derive from [MegaByteMark/markdown-ui-dsl](https://github.com/MegaByteMark/markdown-ui-dsl), published under the MIT licence; that copyright and permission notice is retained in [NOTICE](NOTICE). Third-party files keep their own licences ([THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).