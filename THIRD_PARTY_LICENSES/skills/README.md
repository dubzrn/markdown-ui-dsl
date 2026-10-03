# Licences of vendored agent skills

Skills copied into `.agents/skills/` and `.claude/skills/` keep their upstream licences. Pins and hashes: `.agents/skills-manifest.json`; rationale and vetting: `docs/SKILLS_INDEX.md`.

| Skills | Upstream | Licence | Where the licence text is |
|---|---|---|---|
| spec-driven-development, planning-and-task-breakdown, incremental-implementation, test-driven-development, code-review-and-quality, code-simplification, constraint-driven-development, context-engineering, documentation-and-adrs, api-and-interface-design, source-driven-development, security-and-hardening, git-workflow-and-versioning, using-agent-skills, doubt-driven-development (+ shared `references/`) | https://github.com/addyosmani/agent-skills | MIT © 2025 Addy Osmani | `addyosmani_agent-skills.LICENSE` |
| verification-before-completion, systematic-debugging, dispatching-parallel-agents, using-git-worktrees, requesting-code-review, receiving-code-review, writing-skills | https://github.com/obra/superpowers | MIT © 2025 Jesse Vincent | `obra_superpowers.LICENSE` |
| property-testing | https://github.com/nyxandro/property-testing-skill | MIT © 2026 nyxandro | `nyxandro_property-testing-skill.LICENSE` |
| a11y-playwright-testing | https://github.com/fugazi/test-automation-skills-agents | MIT © 2026 Douglas Urrea Ocampo | `fugazi_test-automation-skills-agents.LICENSE` (also `LICENSE.txt` inside the skill) |
| webapp-testing | https://github.com/anthropics/skills | Apache-2.0 | `LICENSE.txt` inside the skill |
| skill-creator, mcp-builder, frontend-design | Anthropic example/public skills (installed in the authoring environment) | Apache-2.0 | `LICENSE.txt` inside each skill |
| accessibility, web-quality-audit, best-practices | "web-quality-skills" (installed in the authoring environment) | MIT **declared in SKILL.md frontmatter**; no copyright line or licence file shipped locally | — **verify upstream and add the notice before any public release** |
| markdown-ui-dsl | this repository (`skills/markdown-ui-dsl`) | VRIL LABS Open Source License v1.0 (upstream portions: MIT, see `NOTICE`) | `LICENSE`, `NOTICE` |
