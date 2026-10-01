#!/usr/bin/env python3
"""Example gate (T-003): every examples/**/*.ui.md must have balanced containers.
Replaced by `mdui validate` once T-027/T-028 land. Exit 1 on any imbalance."""
import re, sys, glob

OPEN = re.compile(r"^\s*(?:- )?(\|\|\| COLUMN \|\|\||=== ROW ===|::: (?:CARD|MODAL|HEADER|FOOTER|BUBBLE (?:USER|AGENT)) :::)\s*$")
CLOSE = re.compile(r"^\s*--- END ---\s*$")
bad = 0
for f in sorted(glob.glob("examples/**/*.ui.md", recursive=True)):
    depth, fence = 0, False
    for n, line in enumerate(open(f, encoding="utf-8"), 1):
        if line.lstrip().startswith("```"):
            fence = not fence
        if fence:
            continue
        if CLOSE.match(line):
            depth -= 1
            if depth < 0:
                print(f"{f}:{n}: extra --- END ---"); bad += 1; depth = 0
        elif OPEN.match(line):
            depth += 1
    if depth:
        print(f"{f}: {depth} unclosed container(s)"); bad += 1
print(f"example gate: {bad} problem(s)")
sys.exit(1 if bad else 0)
