#!/usr/bin/env bash
# Reproducible wrapper around graphify (PyPI package "graphifyy", CLI "graphify"; Apache-2.0, https://github.com/Graphify-Labs/graphify).
# Builds/updates the project code+docs map in graphify-out/ with NO LLM and NO network use after install.
#
#   scripts/graph.sh update            rebuild graphify-out/ (AST for code + structural extraction for Markdown)
#   scripts/graph.sh query "<question>"   BFS over the graph (scoped subgraph; much smaller than grep output)
#   scripts/graph.sh path "<A>" "<B>"     shortest path between two nodes
#   scripts/graph.sh explain "<X>"        plain-language explanation of a node and its neighbours
#   scripts/graph.sh god-nodes            most-connected nodes (architectural hubs)
#   scripts/graph.sh any <graphify args>  pass-through
#
# The tool is installed into an ignored venv (.tools/graphify-venv) at a PINNED version. Third-party code: bump the pin
# deliberately (read the changelog), never auto-update. .graphifyignore keeps vendored/third-party trees out of the map.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
PIN="graphifyy==0.9.73"
VENV=".tools/graphify-venv"
if [ ! -x "$VENV/bin/graphify" ]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q --disable-pip-version-check "$PIN"
fi
g() { "$VENV/bin/graphify" "$@"; }
cmd="${1:-update}"; shift || true
case "$cmd" in
  update)    g update . ;;
  query|path|explain|god-nodes|affected) g "$cmd" "$@" ;;
  any)       g "$@" ;;
  *)         sed -n '2,13p' "$0" ;;
esac
