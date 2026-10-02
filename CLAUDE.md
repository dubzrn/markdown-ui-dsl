@AGENTS.md

## Claude Code specifics
- Skills are discovered from `.claude/skills/` (identical to `.agents/skills/`; keep them in sync with `python3 scripts/skills.py verify`). Start with `using-agent-skills`, then the routing table in `docs/SKILLS_INDEX.md`.
- graphify's optional `PreToolUse` hooks are **not** installed (they would run third-party code on every Bash/Grep/Read call and hard-code a local venv path). Use `scripts/graph.sh query "<question>"` explicitly.
- Built-in review skills (`/code-review`, `/security-review`, `/simplify`) complement the vendored `code-review-and-quality` and `security-and-hardening` skills.
