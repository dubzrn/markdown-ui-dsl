#!/usr/bin/env python3
"""Example gate (T-003): every examples/**/*.ui.md must have balanced containers. An independent cross-check of `mdui validate`.
Understands DSL 2.0: named blocks with arguments (`::: GRID cols=3 :::`), attribute lists after an opener (`{: #id }`) and typed
closers (`--- END GRID ---`, which must match the innermost open block). Exit 1 on any imbalance."""
import re, sys, glob

ATTRS = r"(?:\s*\{:[^}]*\})?"
OPEN = re.compile(r"^\s*(?:[-*+]\s+|\d+\.\s+)?(?:\|\|\|\s+(?P<col>\w+)\s+\|\|\||===\s+(?P<row>\w+)\s+===|:::\s+(?P<named>\S.*?)\s+:::)" + ATTRS + r"\s*$")
CLOSE = re.compile(r"^\s*--- END(?: (?P<kind>[\w-]+))? ---\s*$")
# the first word of the opener is what a typed closer names (`BUBBLE USER` closes with `END BUBBLE`)
bad = 0
for f in sorted(glob.glob("examples/**/*.ui.md", recursive=True)):
    stack, fence, comment = [], False, False
    for n, line in enumerate(open(f, encoding="utf-8"), 1):
        s = line.strip()
        if comment:
            comment = "-->" not in s
            continue
        if s.startswith("<!--") and "-->" not in s:
            comment = True
            continue
        if s.startswith("```"):
            fence = not fence
        if fence:
            continue
        c = CLOSE.match(line)
        if c:
            if not stack:
                print(f"{f}:{n}: extra --- END ---"); bad += 1
            else:
                kind, at = stack.pop()
                if c.group("kind") and c.group("kind").upper() != kind:
                    print(f"{f}:{n}: --- END {c.group('kind')} --- closes {kind} opened at line {at}"); bad += 1
            continue
        o = OPEN.match(line)
        if o:
            name = o.group("col") or o.group("row") or o.group("named").split()[0]
            stack.append((name.upper(), n))
    for kind, at in stack:
        print(f"{f}:{at}: unclosed {kind}"); bad += 1
print(f"example gate: {bad} problem(s)")
sys.exit(1 if bad else 0)
