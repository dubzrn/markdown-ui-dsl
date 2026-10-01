#!/usr/bin/env python3
"""Reference runner stub (T-013): proves the corpus is language-neutral.

    python3 run.py -- <command ...>

<command> reads one document on stdin and prints JSON {"diagnostics":[{"code","line"}...], "outline": "..."} on stdout.
Exit code 1 if any fixture fails."""
import json, os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
cmd = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else None
if not cmd:
    sys.exit(__doc__)
failed = total = 0
for name in ("valid.json", "invalid.json"):
    for fx in json.load(open(os.path.join(here, "..", "v1", name), encoding="utf-8")):
        total += 1
        out = json.loads(subprocess.run(cmd, input=fx["input"], capture_output=True, text=True, check=True).stdout)
        ok = out["diagnostics"] == fx["expect"]["diagnostics"]
        if "outline" in fx["expect"]:
            ok = ok and out["outline"] == fx["expect"]["outline"]
        if not ok:
            failed += 1
            print("FAIL", fx["id"])
print(f"{total - failed}/{total} passed")
sys.exit(1 if failed else 0)
