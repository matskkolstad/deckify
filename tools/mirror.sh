#!/usr/bin/env bash
# Speil src/*.js til tools/.chk/*.mjs slik at node kan importere dem.
# Mappa listes opp selv — en håndholdt filliste her betyr at node tester
# gammel kode mens nettleseren kjører ny.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/tools/.chk"
# Slett BARE speilede moduler — et blankt `rm *.mjs` tok med render.mjs,
# og da forsvant selve testen.
for f in "$ROOT"/src/*.js; do rm -f "$ROOT/tools/.chk/$(basename "$f" .js).mjs"; done
n=0
for f in "$ROOT"/src/*.js; do
  b="$(basename "$f" .js)"
  sed 's/\.js?v=[0-9][0-9A-Za-z.\-]*"/.mjs"/g' "$f" > "$ROOT/tools/.chk/$b.mjs"
  n=$((n+1))
done
# ingen .mjs skal fortsatt importere ".js"
if grep -l '\.js"' "$ROOT"/tools/.chk/*.mjs >/dev/null 2>&1; then
  echo "FEIL: en .mjs importerer fortsatt .js:"
  grep -n '\.js"' "$ROOT"/tools/.chk/*.mjs
  exit 1
fi
echo "speilet $n moduler"
