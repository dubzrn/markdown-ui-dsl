#!/usr/bin/env python3
"""Repo hygiene guards (T-006). Exit 1 on any violation.

  1. packages/** must not import from reference/** (reference is read-only study material; lift via scripts/reference.sh lift)
  2. every destination listed in THIRD_PARTY_NOTICES.md exists
  3. reference/manifest.json cited paths exist (delegates to scripts/reference-manifest.py --check; skipped if submodules uninitialised)
"""
import os, re, subprocess, sys

ROOT = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()
os.chdir(ROOT)
bad = 0

IMPORT = re.compile(r"""(?:from\s+|import\s*\(?\s*|require\(\s*)['"]([^'"]+)['"]""")
for dp, dn, fn in os.walk("packages"):
    dn[:] = [d for d in dn if d not in ("node_modules", "dist")]
    for f in fn:
        if not f.endswith((".ts", ".tsx", ".js", ".mjs", ".cjs", ".json")):
            continue
        p = os.path.join(dp, f)
        for n, line in enumerate(open(p, encoding="utf-8", errors="ignore"), 1):
            for spec in IMPORT.findall(line):
                if re.search(r"(^|/)reference/", spec):
                    print(f"{p}:{n}: imports from reference/: {spec}"); bad += 1

if os.path.isfile("THIRD_PARTY_NOTICES.md"):
    for line in open("THIRD_PARTY_NOTICES.md", encoding="utf-8"):
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) >= 6 and re.match(r"\d{4}-\d{2}-\d{2}", cells[0]):
            dest = cells[1].strip("`")
            if not os.path.exists(dest):
                print(f"THIRD_PARTY_NOTICES.md: destination missing: {dest}"); bad += 1

if os.path.exists("reference/dsl/markdoc/.git"):
    r = subprocess.run([sys.executable, "scripts/reference-manifest.py", "--check"], capture_output=True, text=True)
    sys.stdout.write(r.stdout)
    if r.returncode:
        bad += 1
else:
    print("reference/ not initialised — manifest check skipped (run scripts/reference.sh init)")

print(f"repo hygiene: {bad} problem(s)")
sys.exit(1 if bad else 0)
