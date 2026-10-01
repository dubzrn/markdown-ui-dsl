# Project-local agent skills

32 skills pinned in `.agents/skills-manifest.json` (identical copies in `.agents/skills/` and `.claude/skills/`). Index, routing table and vetting protocol: [`docs/SKILLS_INDEX.md`](../../docs/SKILLS_INDEX.md). Manage with `python3 scripts/skills.py`.

**Third-party skills are untrusted until vetted.** Do not hand-edit vendored skills (hashes are verified); our own skill is edited in `skills/markdown-ui-dsl/` and propagated with `skills.py sync`.
