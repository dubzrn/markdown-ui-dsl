#!/usr/bin/env python3
"""Conformance runner (protocol v1). Language-neutral: it only talks to your implementation over stdin/stdout.

    python3 run.py -- <command ...>             run every suite in manifest.json
    python3 run.py --suite block -- <command>   run one suite (block | inline | frontmatter | semantic)

For every fixture it writes ONE JSON request to <command>'s stdin and reads ONE JSON answer from stdout:

    request  {"suite": "block|inline|frontmatter|semantic", "input": "...", "v2": bool, "file": "...", "files": {...}}
    answer   block        {"diagnostics": [{"code","line"}...], "outline": "..."}
             inline       {"inline": [...nodes...], "issues": ["E1301", ...]}      (issues only compared for v2 fixtures)
             frontmatter  {"data": {...}, "issues": [{"code","line"}...]}
             semantic     {"parseDiagnostics": ["..."], "diagnostics": [{"code","line"}...]}   (parseDiagnostics must be empty)

Exit code 1 if any fixture fails or crashes. Prints per-suite and total counts and the manifest version."""
import json, os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.join(here, "..")
args = sys.argv[1:]
cmd = args[args.index("--") + 1:] if "--" in args else None
if not cmd:
    sys.exit(__doc__)
only = args[args.index("--suite") + 1] if "--suite" in args else None
manifest = json.load(open(os.path.join(root, "manifest.json"), encoding="utf-8"))
failed = total = 0
per = {}


def check(suite, fx, out, v2):
    exp = fx["expect"]
    if suite == "block":
        ok = out["diagnostics"] == exp["diagnostics"]
        return ok and ("outline" not in exp or out["outline"] == exp["outline"])
    if suite == "inline":
        ok = out["inline"] == exp["inline"]
        return ok and (not v2 or out["issues"] == exp["issues"])
    if suite == "frontmatter":
        return out["data"] == exp["data"] and out["issues"] == exp["issues"]
    if suite == "semantic":
        return out["parseDiagnostics"] == [] and out["diagnostics"] == exp["diagnostics"]
    raise SystemExit(f"unknown suite {suite}")


for entry in manifest["files"]:
    suite = entry["suite"]
    if only and suite != only:
        continue
    for fx in json.load(open(os.path.join(root, entry["path"]), encoding="utf-8")):
        total += 1
        per.setdefault(suite, [0, 0])
        per[suite][1] += 1
        req = {"suite": suite, "input": fx["input"], "v2": entry["path"].startswith("v2/")}
        for k in ("file", "files"):
            if k in fx:
                req[k] = fx[k]
        try:
            p = subprocess.run(cmd, input=json.dumps(req), capture_output=True, text=True, timeout=30)
            ok = p.returncode == 0 and check(suite, fx, json.loads(p.stdout), req["v2"])
        except Exception:  # crash, hang, bad JSON: the fixture fails
            ok = False
        if ok:
            per[suite][0] += 1
        else:
            failed += 1
            print("FAIL", entry["path"], fx["id"])
for s, (a, b) in per.items():
    print(f"  {s:<12} {a}/{b}")
print(f"{total - failed}/{total} passed (conformance bundle {manifest['version']}, protocol {manifest['protocol']})")
sys.exit(1 if failed else 0)
