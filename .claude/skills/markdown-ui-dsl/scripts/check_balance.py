#!/usr/bin/env python3
"""Dependency-free block-balance check for .ui.md files: every opener needs a `--- END ---`.

Usage: python3 check_balance.py file.ui.md [...]   (exit 1 on imbalance)
Skips fenced code and HTML comments. Heuristic: it only counts openers/closers.
"""
import re
import sys

# Openers: `::: NAME args :::` (named blocks, DSL 2.0 arguments allowed), `||| COLUMN |||`, `=== ROW ===`, each optionally
# followed by a DSL 2.0 attribute list `{: #id .class key=value }`.
ATTRS = r"(?:\s*\{:[^}]*\})?"
OPEN = re.compile(r"^\s*(?:[-*+]\s+|\d+\.\s+)?(?::::\s+\S.*?\s+:::|\|\|\|\s+\w+\s+\|\|\||===\s+\w+\s+===)" + ATTRS + r"\s*$")
CLOSE = re.compile(r"^\s*--- END(?: [\w-]+)? ---\s*$")  # typed closers (`--- END GRID ---`) are DSL 2.0


def check(path: str) -> int:
    depth, in_fence, in_comment, problems = 0, False, False, 0
    with open(path, encoding="utf-8") as fh:
        for n, line in enumerate(fh, 1):
            s = line.strip()
            if in_comment:
                in_comment = "-->" not in s
                continue
            if s.startswith("<!--") and "-->" not in s:
                in_comment = True
                continue
            if s.startswith("```"):
                in_fence = not in_fence
                continue
            if in_fence:
                continue
            if OPEN.match(line):
                depth += 1
            elif CLOSE.match(line):
                depth -= 1
                if depth < 0:
                    print(f"{path}:{n}: stray `--- END ---`")
                    depth, problems = 0, problems + 1
    if depth > 0:
        print(f"{path}: {depth} block(s) never closed")
        problems += 1
    return problems


if __name__ == "__main__":
    sys.exit(1 if sum(check(p) for p in sys.argv[1:]) else 0)
