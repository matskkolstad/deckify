#!/usr/bin/env bash
# Installer/oppdater Deckify-integrasjonen i Home Assistant (Oslo).
#
# scp virker ikke mot HAOS ("subsystem request failed"), så filene sendes som
# base64 over ssh. Alt under custom_components/deckify/ speiles.
#
# Bruk:  ./tools/deploy.sh            # bygg, sjekk og last opp
#        ./tools/deploy.sh --restart  # ... og start HA på nytt
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY="$HOME/.ssh/id_ed25519_plantasjen"
HOST="hassio@10.10.20.19"
DEST="/config/custom_components/deckify"
RESTART="${1:-}"

cd "$ROOT"

echo "== sjekker kode"
python3 tools/check_imports.py
./tools/mirror.sh >/dev/null
node tools/.chk/render.mjs >/tmp/deckify-render.log 2>&1 || {
  echo "AVBRUTT: render-røyktesten feilet"; tail -25 /tmp/deckify-render.log; exit 1; }
echo "   render-røyktest OK ($(grep -c ' OK  ' /tmp/deckify-render.log) visninger)"
python3 tools/build.py

VER=$(python3 -c "import json;print(json.load(open('custom_components/deckify/manifest.json'))['version'])")
echo "== laster opp Deckify $VER"

ssh -i "$KEY" "$HOST" "sudo -n mkdir -p $DEST/www/fonts $DEST/translations \
  && sudo -n chmod -R a+rX $DEST"

push() { # push <relativ sti under custom_components/deckify>
  local rel="$1" src="custom_components/deckify/$1"
  [ -f "$src" ] || { echo "  mangler $rel"; return; }
  base64 -w0 "$src" | ssh -i "$KEY" "$HOST" \
    "cat > /tmp/dk.b64 && base64 -d /tmp/dk.b64 > /tmp/dk.bin \
     && sudo -n cp /tmp/dk.bin $DEST/$rel && sudo -n chmod a+r $DEST/$rel \
     && rm -f /tmp/dk.b64 /tmp/dk.bin"
  printf '  ok %-34s %6d B\n' "$rel" "$(stat -c%s "$src")"
}

# Mappa listes opp selv: en ny modul eller oversettelse kan ikke glemmes.
( cd custom_components/deckify && find . -type f \
    \( -name '*.py' -o -name '*.json' -o -name '*.js' -o -name '*.woff2' \) \
    -printf '%P\n' | sort ) > /tmp/dk-files.txt
while read -r rel; do push "$rel"; done < /tmp/dk-files.txt

# fjern filer på serveren som ikke lenger finnes lokalt
# (HAOS har busybox-find uten -printf — bruk sed i stedet)
ssh -i "$KEY" "$HOST" "cd $DEST && find . -type f | sed 's|^\./||' | sort" > /tmp/dk-remote.txt
comm -13 /tmp/dk-files.txt /tmp/dk-remote.txt | while read -r rel; do
  [ -n "$rel" ] || continue
  echo "  sletter forelder $rel"
  ssh -i "$KEY" "$HOST" "sudo -n rm -f $DEST/$rel"
done

echo "== filer på serveren"
ssh -i "$KEY" "$HOST" "ls -la $DEST $DEST/www | head -40"

if [ "$RESTART" = "--restart" ]; then
  echo "== validerer konfigurasjon"
  set +u; . "$HOME/.hermes/.env"; set -u
  curl -s -X POST -H "Authorization: Bearer $HASS_TOKEN" \
    "$HASS_URL/api/config/core/check_config"
  echo
  echo "== starter Home Assistant på nytt"
  curl -s -X POST -H "Authorization: Bearer $HASS_TOKEN" \
    "$HASS_URL/api/services/homeassistant/restart" >/dev/null
  echo "   sendt — HA er nede i ca. 40-70 sekunder"
else
  echo
  echo "En NY integrasjon krever omstart av HA: ./tools/deploy.sh --restart"
fi
