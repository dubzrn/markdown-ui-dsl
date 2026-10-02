#!/usr/bin/env python3
"""Project-local agent-skill manager (stdlib only).

Skills live in two identical folders so every agent finds them:
    .agents/skills/   (Agent Skills open standard location: Codex, Cursor, Gemini CLI, Copilot, ...)
    .claude/skills/   (Claude Code)
The manifest `.agents/skills-manifest.json` pins every skill's source, commit, licence and tree hash.

    python3 scripts/skills.py install [--cache DIR] [--only NAME ...]   copy pinned skills into both folders
    python3 scripts/skills.py verify                                    folders identical + tree hashes match the manifest
    python3 scripts/skills.py validate                                  Agent Skills limits (name/description/length) for every skill
    python3 scripts/skills.py audit                                     list executable/script files and risky patterns for review
    python3 scripts/skills.py sync                                      re-copy skills/markdown-ui-dsl (our own skill, source of truth)

Third-party skills are UNTRUSTED CODE/INSTRUCTIONS until reviewed: adding one means reading its SKILL.md and every
bundled script, recording the commit, licence and hash in the manifest, and running `audit` (see docs/SKILLS_INDEX.md).
"""
import hashlib, json, os, re, shutil, subprocess, sys

ROOT = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()
MANIFEST = os.path.join(ROOT, ".agents", "skills-manifest.json")
TARGETS = [os.path.join(ROOT, ".agents"), os.path.join(ROOT, ".claude")]  # each gets skills/ and references/
IGNORE = {".git", "__pycache__", "node_modules", ".DS_Store"}


def load():
    return json.load(open(MANIFEST))


def tree_hash(path):
    h = hashlib.sha256()
    for dp, dn, fn in os.walk(path):
        dn[:] = sorted(d for d in dn if d not in IGNORE)
        for f in sorted(fn):
            if f in IGNORE:
                continue
            p = os.path.join(dp, f)
            h.update(os.path.relpath(p, path).encode() + b"\0")
            h.update(open(p, "rb").read() + b"\0")
    return h.hexdigest()


def copy_tree(src, dst):
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns(*IGNORE))


def source_dir(entry, cache):
    kind = entry["tier"]
    if kind == "project":
        return os.path.join(ROOT, entry["source_path"])
    if kind == "installed":
        p = entry["source_path"]
        if not os.path.isdir(p):
            raise SystemExit(f"installed-tier source not present on this machine: {p} (skip with --only)")
        return p
    # github tier: shallow clone pinned to the recorded commit
    repo = entry["source_repo"]
    d = os.path.join(cache, repo.replace("/", "_"))
    if not os.path.isdir(d):
        os.makedirs(cache, exist_ok=True)
        subprocess.check_call(["git", "init", "-q", d])
        subprocess.check_call(["git", "-C", d, "remote", "add", "origin", f"https://github.com/{repo}.git"])
    cur = subprocess.run(["git", "-C", d, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    if cur != entry["commit"]:
        subprocess.check_call(["git", "-C", d, "fetch", "-q", "--depth", "1", "origin", entry["commit"]])
        subprocess.check_call(["git", "-C", d, "checkout", "-q", "FETCH_HEAD"])
    return os.path.join(d, entry["source_path"])


def cmd_install(args):
    m = load()
    cache = os.path.join("/tmp", "mdui-skill-src")
    only = set()
    i = 0
    while i < len(args):
        if args[i] == "--cache":
            cache = args[i + 1]; i += 2
        elif args[i] == "--only":
            only |= set(args[i + 1:]); break
        else:
            i += 1
    for e in m["skills"]:
        if only and e["name"] not in only:
            continue
        src = source_dir(e, cache)
        got = tree_hash(src)
        if e.get("tree_sha256") and got != e["tree_sha256"] and e["tier"] != "project":
            raise SystemExit(f"{e['name']}: source hash {got[:12]} != manifest {e['tree_sha256'][:12]} (upstream changed or tampered)")
        for t in TARGETS:
            copy_tree(src, os.path.join(t, "skills", e["name"]))
        print("installed", e["name"])
    for r in m.get("shared_references", []):
        src = os.path.join(cache, r["source_repo"].replace("/", "_"), r["source_path"])
        if os.path.isdir(src) and (not only):
            for t in TARGETS:
                copy_tree(src, os.path.join(t, "references"))
            print("installed shared references")


def cmd_sync(_):
    m = load()
    for e in m["skills"]:
        if e["tier"] == "project":
            for t in TARGETS:
                copy_tree(os.path.join(ROOT, e["source_path"]), os.path.join(t, "skills", e["name"]))
            e["tree_sha256"] = tree_hash(os.path.join(ROOT, e["source_path"]))
            print("synced", e["name"], e["tree_sha256"][:12])
    json.dump(m, open(MANIFEST, "w"), indent=2, ensure_ascii=False); open(MANIFEST, "a").write("\n")


def cmd_verify(_):
    m = load(); bad = 0
    for e in m["skills"]:
        hs = []
        for t in TARGETS:
            p = os.path.join(t, "skills", e["name"])
            hs.append(tree_hash(p) if os.path.isdir(p) else None)
        if hs[0] is None or hs[0] != hs[1]:
            print("MISMATCH between .agents and .claude:", e["name"]); bad += 1
        elif hs[0] != e["tree_sha256"]:
            print("HASH != manifest:", e["name"], hs[0][:12], e["tree_sha256"][:12]); bad += 1
    listed = {e["name"] for e in m["skills"]}
    for t in TARGETS:
        d = os.path.join(t, "skills")
        for n in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if os.path.isdir(os.path.join(d, n)) and n not in listed:
                print("UNLISTED skill (not in manifest):", os.path.relpath(os.path.join(d, n), ROOT)); bad += 1
    print(f"{len(m['skills'])} skills checked; {bad} problem(s)")
    sys.exit(1 if bad else 0)


def frontmatter(path):
    t = open(path, errors="ignore").read()
    mm = re.match(r"^---\n(.*?)\n---\n(.*)$", t, re.S)
    if not mm:
        return None, t
    fm = {}
    for line in mm.group(1).split("\n"):
        k = re.match(r"^([A-Za-z_-]+):\s*(.*)$", line)
        if k:
            fm[k.group(1)] = k.group(2).strip().strip("'\"")
    return fm, mm.group(2)


def cmd_validate(_):
    problems = 0
    for t in TARGETS[:1]:
        d = os.path.join(t, "skills")
        for n in sorted(os.listdir(d)):
            p = os.path.join(d, n, "SKILL.md")
            if not os.path.isfile(p):
                continue
            fm, body = frontmatter(p)
            msgs = []
            if fm is None: msgs.append("no frontmatter")
            else:
                name = fm.get("name", ""); desc = fm.get("description", "")
                if name != n: msgs.append(f"name '{name}' != folder '{n}'")
                if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", name) or len(name) > 64: msgs.append("name violates spec (≤64, lowercase/digits/hyphens)")
                if desc and len(desc) > 1024: msgs.append(f"description {len(desc)} > 1024")
                if desc in ("", ">", "|", "|-", ">-"): pass  # folded YAML block scalar: length checked by skills-ref
            lines = len((body or "").split("\n"))
            warn = f"; SKILL.md body {lines} lines (> 500 recommended max)" if lines > 500 else ""
            if msgs: problems += 1
            print(("FAIL " if msgs else "ok   ") + n + ("  " + "; ".join(msgs) if msgs else "") + warn)
    sys.exit(1 if problems else 0)


RISK = re.compile(r"curl |wget |Invoke-WebRequest|/dev/tcp|base64 -d|\beval\(|os\.system|child_process|subprocess|sudo |ssh |scp |rm -rf|chmod \+x|ignore (all |any )?(previous|prior) instructions", re.I)


def cmd_audit(_):
    for n in sorted(os.listdir(os.path.join(TARGETS[0], "skills"))):
        d = os.path.join(TARGETS[0], "skills", n)
        if not os.path.isdir(d):
            continue
        exe = []
        for dp, dn, fn in os.walk(d):
            for f in fn:
                p = os.path.join(dp, f)
                if not f.endswith(".md") and f not in ("LICENSE", "LICENSE.txt", "LICENSE.md"):
                    exe.append(os.path.relpath(p, d))
        hits = []
        for dp, dn, fn in os.walk(d):
            for f in fn:
                p = os.path.join(dp, f)
                try:
                    for i, line in enumerate(open(p, errors="ignore"), 1):
                        if RISK.search(line):
                            hits.append(f"{os.path.relpath(p, d)}:{i}")
                except OSError:
                    pass
        if exe or hits:
            print(f"{n}: non-markdown files={exe[:6]}{'…' if len(exe) > 6 else ''} risky-pattern lines={len(hits)} {hits[:3]}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    {"install": cmd_install, "verify": cmd_verify, "validate": cmd_validate, "audit": cmd_audit, "sync": cmd_sync}.get(cmd, lambda a: print(__doc__))(sys.argv[2:])
