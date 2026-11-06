#!/usr/bin/env python3
"""Bygg: kopier frontend fra src/ til integrasjonens www/-mappe.

`?v=`-cachebusteren STRIPPES IKKE. Den statiske ruten serveres med lange
cache-hoder, og `?v=` er del av modul-URL-en — så den er nettopp det som gjør
at nettleseren henter ny kode etter en oppdatering. Derfor er dist en ren
kopi, og `bump.py` sørger for at alle filene har samme versjon.
"""

from __future__ import annotations

import filecmp
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
WWW = os.path.join(ROOT, "custom_components", "deckify", "www")
# Fontene ligger allerede ferdig i www/fonts/ og trengs bare hvis du vil
# bytte dem. Sett DECKIFY_FONTS til en mappe med .woff2-filene.
FONTS_SRC = os.environ.get("DECKIFY_FONTS", os.path.join(WWW, "fonts"))


def main() -> int:
    ver = json.load(open(os.path.join(ROOT, "custom_components", "deckify",
                                      "manifest.json"), encoding="utf-8"))["version"]
    os.makedirs(WWW, exist_ok=True)
    os.makedirs(os.path.join(WWW, "fonts"), exist_ok=True)

    names = sorted(f for f in os.listdir(SRC) if f.endswith(".js"))
    if "deckify.js" not in names:
        print("FEIL: src/deckify.js mangler")
        return 1

    # versjonskontroll: ALLE ?v= må være like, ellers laster en modul en
    # utdatert core.js og feiler med «does not provide an export named X»
    seen: set[str] = set()
    for fn in names:
        s = open(os.path.join(SRC, fn), encoding="utf-8").read()
        seen |= set(re.findall(r"\.js\?v=([0-9][0-9A-Za-z.\-]*)", s))
    if len(seen) > 1 or (seen and ver not in seen):
        print(f"FEIL: blandede/feil ?v= i src: {sorted(seen)} (manifest {ver})")
        print("Kjør: python3 tools/bump.py " + ver)
        return 1

    copied = 0
    for fn in names:
        a, b = os.path.join(SRC, fn), os.path.join(WWW, fn)
        if not os.path.exists(b) or not filecmp.cmp(a, b, shallow=False):
            shutil.copy2(a, b)
            copied += 1

    # rydd bort moduler som er slettet i src
    for fn in os.listdir(WWW):
        if fn.endswith(".js") and fn not in names:
            os.remove(os.path.join(WWW, fn))
            print("  fjernet utdatert " + fn)

    for fn in ("figtree-latin.woff2", "figtree-latin-ext.woff2"):
        a = os.path.join(FONTS_SRC, fn)
        b = os.path.join(WWW, "fonts", fn)
        if os.path.exists(a) and (not os.path.exists(b) or
                                  not filecmp.cmp(a, b, shallow=False)):
            shutil.copy2(a, b)
            copied += 1

    total = sum(os.path.getsize(os.path.join(WWW, f))
                for f in os.listdir(WWW) if f.endswith(".js"))
    print(f"bygget v{ver}: {len(names)} moduler ({total // 1024} KB), "
          f"{copied} fil(er) oppdatert -> custom_components/deckify/www/")
    return 0


sys.exit(main())
