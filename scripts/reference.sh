#!/usr/bin/env bash
# Reference-repository helper for markdown-ui-dsl.
#
#   scripts/reference.sh init [group|all]      check out reference submodules (shallow); groups: dsl protocols tokens sdd verification
#   scripts/reference.sh status                pinned commit, date and detected licence for every reference repo
#   scripts/reference.sh licenses              licence table only
#   scripts/reference.sh find <regex> [group]  search reference code (ripgrep/grep), skipping VCS and build dirs
#   scripts/reference.sh sparse                apply sparse-checkout patterns to large repos (e.g. playwright)
#   scripts/reference.sh update <path>         fetch the latest default-branch commit of one reference repo (stages the new pin; review before committing)
#   scripts/reference.sh lift <src> <dest> [--allow-unknown] [--allow-copyleft]
#                                              copy a file/dir out of reference/ into the project AND append a provenance entry
#                                              to THIRD_PARTY_NOTICES.md (source repo, commit, licence, date). Refuses unknown licences.
#
# Rules (see reference/README.md): reference/ is READ-ONLY; code is lifted by copying (never edited in place);
# every lift is logged; copyleft (MPL/GPL/AGPL/LGPL) lifts need maintainer sign-off (SPEC section 7: "Ask first").
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
REF="reference"
NOTICES="THIRD_PARTY_NOTICES.md"

die() { echo "error: $*" >&2; exit 2; }

detect_license() { # $1 = repo dir
  local f head
  for f in "$1"/LICENSE "$1"/LICENSE.md "$1"/LICENSE.txt "$1"/LICENCE "$1"/COPYING "$1"/LICENSE-MIT "$1"/license; do
    [ -f "$f" ] || continue
    head="$(head -n 40 "$f" | tr '[:upper:]' '[:lower:]')"
    case "$head" in
      *"mozilla public license"*)        echo "MPL-2.0"; return;;
      *"apache license"*)                echo "Apache-2.0"; return;;
      *"gnu affero"*)                    echo "AGPL"; return;;
      *"gnu lesser general"*)            echo "LGPL"; return;;
      *"gnu general public"*)            echo "GPL"; return;;
      *"bsd 3-clause"*|*"redistributions of source code must retain"*) echo "BSD"; return;;
      *"isc license"*)                   echo "ISC"; return;;
      *"permission is hereby granted, free of charge"*) echo "MIT"; return;;
      *"creative commons"*)              echo "CC"; return;;
      *"w3c software and document license"*) echo "W3C"; return;;
      *"the unlicense"*|*"public domain"*) echo "Unlicense/PD"; return;;
    esac
    echo "UNRECOGNISED($(basename "$f"))"; return
  done
  local d=""
  d="$(grep -m1 '"license"' "$1/package.json" "$1"/packages/*/package.json 2>/dev/null | head -1 | sed 's/.*"license"[^"]*"\([^"]*\)".*/\1/')"
  [ -n "$d" ] && echo "NONE (declared $d in package.json; no LICENSE file)" || echo "NONE"
}

repo_of() { # $1 = path inside reference/ -> echo submodule root path
  local p="$1"
  while [ "$p" != "." ] && [ "$p" != "/" ]; do
    if git config -f .gitmodules --get "submodule.$p.path" >/dev/null 2>&1; then echo "$p"; return; fi
    p="$(dirname "$p")"
  done
  return 1
}

group_paths() { # $1 = group|all
  if [ "${1:-all}" = "all" ]; then git config -f .gitmodules --get-regexp '^submodule\..*\.path$' | awk '{print $2}'
  else git config -f .gitmodules --get-regexp '^submodule\..*\.path$' | awk '{print $2}' | grep "^$REF/$1/"; fi
}

cmd="${1:-help}"; shift || true
case "$cmd" in
  init)
    g="${1:-all}"
    group_paths "$g" | xargs -r -n1 -P4 git submodule update --init --depth 1 --
    ;;
  status|licenses)
    printf '%-34s %-10s %-11s %s\n' PATH COMMIT DATE LICENCE
    group_paths all | while read -r p; do
      if [ -e "$p/.git" ]; then
        printf '%-34s %-10s %-11s %s\n' "$p" "$(git -C "$p" rev-parse --short HEAD)" "$(git -C "$p" log -1 --format=%cs)" "$(detect_license "$p")"
      else
        printf '%-34s %-10s %-11s %s\n' "$p" "(not init)" "-" "-"
      fi
    done
    ;;
  find)
    [ $# -ge 1 ] || die "usage: reference.sh find <regex> [group]"
    pat="$1"; dir="$REF${2:+/$2}"
    if command -v rg >/dev/null; then rg -n --hidden -g '!.git' -g '!node_modules' -g '!dist' -g '!*.lock' -g '!*.min.*' "$pat" "$dir" || true
    else grep -rnE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist "$pat" "$dir" || true; fi
    ;;
  sparse)
    # Large repos are checked out sparsely. Add entries as "path|pattern pattern ...".
    while IFS='|' read -r p pats; do
      [ -d "$p/.git" ] || [ -f "$p/.git" ] || continue
      git -C "$p" sparse-checkout init --cone >/dev/null
      # shellcheck disable=SC2086
      git -C "$p" sparse-checkout set $pats
      echo "sparse: $p -> $pats"
    done <<'EOF'
reference/verification/playwright|docs/src packages/injected/src packages/isomorphic
EOF
    ;;
  update)
    p="${1:-}"; [ -n "$p" ] || die "usage: reference.sh update <reference/path>"
    git config -f .gitmodules --get "submodule.$p.path" >/dev/null || die "$p is not a registered submodule"
    b="$(git -C "$p" symbolic-ref --short HEAD 2>/dev/null || echo HEAD)"
    git -C "$p" fetch --depth 1 origin "$b"
    git -C "$p" checkout -q FETCH_HEAD
    git add "$p"
    echo "staged new pin for $p: $(git -C "$p" rev-parse --short HEAD) — review, update reference/README.md, then commit"
    ;;
  lift)
    [ $# -ge 2 ] || die "usage: reference.sh lift <src-under-reference> <dest> [--allow-unknown] [--allow-copyleft]"
    src="${1%/}"; dest="$2"; shift 2
    allow_unknown=0; allow_copyleft=0
    for a in "$@"; do case "$a" in --allow-unknown) allow_unknown=1;; --allow-copyleft) allow_copyleft=1;; *) die "unknown flag $a";; esac; done
    case "$src" in "$REF"/*) ;; *) die "source must be under $REF/";; esac
    [ -e "$src" ] || die "no such path: $src"
    case "$dest" in "$REF"/*|/*|../*) die "destination must be a relative path inside the project, outside $REF/";; esac
    root="$(repo_of "$src")" || die "$src is not inside a registered reference repo"
    lic="$(detect_license "$root")"
    case "$lic" in
      NONE*|UNRECOGNISED*) [ $allow_unknown -eq 1 ] || die "licence of $root is $lic — read its LICENSE and re-run with --allow-unknown only after maintainer sign-off";;
      MPL-2.0|GPL|AGPL|LGPL) [ $allow_copyleft -eq 1 ] || die "$root is $lic (copyleft) — needs maintainer sign-off; re-run with --allow-copyleft once approved";;
    esac
    url="$(git config -f .gitmodules --get "submodule.$root.url")"; sha="$(git -C "$root" rev-parse HEAD)"
    mkdir -p "$(dirname "$dest")"
    if [ -d "$src" ]; then mkdir -p "$dest"; cp -R "$src"/. "$dest"/; else cp "$src" "$dest"; fi
    [ -f "$NOTICES" ] || printf '# Third-party notices\n\nCode copied from reference repositories. Appended by `scripts/reference.sh lift`; do not edit by hand.\n\n| Date | Destination | Source repo | Source path | Commit | Licence |\n|---|---|---|---|---|---|\n' > "$NOTICES"
    printf '| %s | `%s` | %s | `%s` | `%s` | %s |\n' "$(date -u +%F)" "$dest" "${url%.git}" "${src#"$root"/}" "${sha:0:12}" "$lic" >> "$NOTICES"
    echo "lifted $src -> $dest ($lic). Logged in $NOTICES."
    [ "$lic" = "Apache-2.0" ] && echo "note: Apache-2.0 — preserve any NOTICE file and mark modifications in the lifted files."
    echo "reminder: keep the upstream licence header in lifted files; improve it, don't just copy it (see reference/README.md 'Beat the wheel')."
    ;;
  help|*)
    sed -n '2,15p' "$0"
    ;;
esac
