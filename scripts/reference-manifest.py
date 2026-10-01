#!/usr/bin/env python3
"""Regenerate reference/README.md from reference/manifest.json and the checked-out submodules.

Computes pinned commit, commit date, licence and on-disk size for every reference repo, checks that every
path named in a "lift" entry exists, and writes the manifest table into reference/README.md between
the markers <!-- MANIFEST:BEGIN --> and <!-- MANIFEST:END -->.

    python3 scripts/reference-manifest.py          # rewrite the table
    python3 scripts/reference-manifest.py --check  # fail (exit 1) if a cited path is missing or the table is stale
"""
import json, os, re, subprocess, sys

ROOT = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()
REF = os.path.join(ROOT, "reference")
README = os.path.join(REF, "README.md")
BEGIN, END = "<!-- MANIFEST:BEGIN -->", "<!-- MANIFEST:END -->"


def git(repo, *args):
    return subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True).stdout.strip()


def licence(repo):
    for name in ("LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "COPYING", "LICENSE-MIT", "license"):
        p = os.path.join(repo, name)
        if os.path.isfile(p):
            head = open(p, errors="ignore").read(2500).lower()
            for needle, ident in (("mozilla public license", "MPL-2.0"), ("apache license", "Apache-2.0"),
                                  ("gnu affero", "AGPL"), ("gnu lesser general", "LGPL"), ("gnu general public", "GPL"),
                                  ("redistributions of source code must retain", "BSD"), ("bsd 3-clause", "BSD-3-Clause"),
                                  ("isc license", "ISC"), ("permission is hereby granted, free of charge", "MIT"),
                                  ("creative commons", "CC"), ("w3c software and document license", "W3C")):
                if needle in head:
                    return ident
            return f"UNRECOGNISED ({name})"
    return "NONE FOUND" + declared(repo)


def declared(repo):
    """Licence *declared* without a LICENSE file (package.json or README) — informational; lifts still need sign-off."""
    import glob
    for pj in [os.path.join(repo, "package.json")] + sorted(glob.glob(os.path.join(repo, "packages", "*", "package.json"))):
        try:
            lic = json.load(open(pj)).get("license")
        except Exception:
            continue
        if isinstance(lic, str):
            return f" (declared {lic} in package.json)"
    rd = os.path.join(repo, "README.md")
    if os.path.isfile(rd):
        m = re.search(r"^#+\s*licen[sc]e\s*\n+\s*([A-Za-z0-9.\- ]{2,30})", open(rd, errors="ignore").read(), re.I | re.M)
        if m:
            return f" (README says {m.group(1).strip()})"
    return ""


def size_mb(repo):
    total = 0
    for dp, dn, fn in os.walk(repo):
        if ".git" in dn:
            dn.remove(".git")
        for f in fn:
            try:
                total += os.path.getsize(os.path.join(dp, f))
            except OSError:
                pass
    return total / 1_000_000


def first_path(item):
    """Extract the leading path token(s) of a lift entry ('src/a + src/b (note)' -> ['src/a','src/b'])."""
    head = re.split(r"\s[—(–]\s|\s\(", item)[0]
    toks = [t.strip().rstrip(",") for t in re.split(r"\s\+\s|,\s*", head)]
    return [t for t in toks if re.match(r"^[\w.@\-/*]+$", t) and ("/" in t or "." in t)]


def main():
    check = "--check" in sys.argv
    man = json.load(open(os.path.join(REF, "manifest.json")))
    rows, problems = [], []
    for r in man["repos"]:
        d = os.path.join(REF, r["path"])
        if not os.path.exists(os.path.join(d, ".git")):
            problems.append(f"{r['path']}: submodule not initialised (run scripts/reference.sh init)")
            rows.append(f"| `reference/{r['path']}` | {r['repo']} | _not initialised_ | | | | | |")
            continue
        for item in r["lift"]:
            for t in first_path(item):
                if "*" in t:
                    continue
                if not os.path.exists(os.path.join(d, t)) and not r.get("sparse"):
                    problems.append(f"{r['path']}: cited path not found: {t}")
                if r.get("sparse") and not os.path.exists(os.path.join(d, t)):
                    problems.append(f"{r['path']}: cited path not in sparse checkout: {t}")
        sha = git(d, "rev-parse", "--short=10", "HEAD")
        date = git(d, "log", "-1", "--format=%cs")
        lift = "<br>".join(r["lift"]).replace("|", "\\|")
        tasks = ", ".join(r["tasks"])
        sparse = " _(sparse)_" if r.get("sparse") else ""
        rows.append(f"| `reference/{r['path']}`{sparse} | [{r['repo']}](https://github.com/{r['repo']}) | `{sha}` · {date} | {licence(d)} | {size_mb(d):.0f} MB | {r['role']} | {lift} | {tasks} |")
    table = ["| Path | Upstream | Pin · date | Licence | Size | What it is | Lift / study first | Used by tasks |",
             "|---|---|---|---|---|---|---|---|"] + rows
    excl = ["", "**Deliberately not vendored** (and why):", ""] + [f"- **{e['name']}** — {e['why']}" for e in man["excluded"]]
    block = "\n".join([BEGIN] + table + excl + [END])
    text = open(README).read()
    new = re.sub(re.escape(BEGIN) + r".*?" + re.escape(END), lambda m: block, text, flags=re.S)
    if check:
        if new != text:
            problems.append("reference/README.md manifest table is stale")
    else:
        open(README, "w").write(new)
    for p in problems:
        print("WARN", p)
    print(f"{len(rows)} repos; {len(problems)} problem(s)")
    sys.exit(1 if (check and problems) else 0)


main()
