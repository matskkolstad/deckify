#!/usr/bin/env python3
"""Sett Deckify-versjonen i manifest.json, const.py, DK_VER og alle ?v=-importer.

Versjonen er del av modul-URL-en (`core.js?v=2.0.1`), så to ulike `?v=` er
TO FORSKJELLIGE moduler for nettleseren. Derfor må ALLE filer bumpes samtidig
— en fil som beholder gammel `?v=` laster en utdatert core.js og feiler med
«does not provide an export named X». Skriptet lister mappa selv, nettopp for
at en ny fil ikke skal kunne glemmes.

Bruk:  python3 tools/bump.py            # patch +1
       python3 tools/bump.py 2.1.0      # eksplisitt
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
CC = os.path.join(ROOT, "custom_components", "deckify")
MANIFEST = os.path.join(CC, "manifest.json")
CONST = os.path.join(CC, "const.py")


def main() -> int:
    man = json.load(open(MANIFEST, encoding="utf-8"))
    cur = man["version"]

    if len(sys.argv) > 1:
        new = sys.argv[1]
    else:
        parts = cur.split(".")
        parts[-1] = str(int(parts[-1]) + 1)
        new = ".".join(parts)

    # manifest
    man["version"] = new
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(man, f, indent=2, ensure_ascii=False)
        f.write("\n")

    # const.py
    s = open(CONST, encoding="utf-8").read()
    assert re.search(r'VERSION\s*=\s*"', s), "VERSION ikke funnet i const.py"
    # merk: s2 == s når versjonen allerede stemmer — det er ikke en feil
    s2 = re.sub(r'(VERSION\s*=\s*")[^"]+(")', r"\g<1>" + new + r"\g<2>", s, count=1)
    open(CONST, "w", encoding="utf-8").write(s2)

    # frontend: DK_VER + alle ?v=
    files = sorted(f for f in os.listdir(SRC) if f.endswith(".js") and not f.startswith("."))
    touched = 0
    for fn in files:
        p = os.path.join(SRC, fn)
        s = open(p, encoding="utf-8").read()
        s2 = re.sub(r"(\.js\?v=)[0-9][0-9A-Za-z.\-]*", r"\g<1>" + new, s)
        s2 = re.sub(r'(DK_VER\s*=\s*")[^"]+(")', r"\g<1>" + new + r"\g<2>", s2)
        if s2 != s:
            open(p, "w", encoding="utf-8").write(s2)
            touched += 1

    # sanity: ingen fil skal ha en annen ?v= enn den nye
    bad = []
    for fn in files:
        s = open(os.path.join(SRC, fn), encoding="utf-8").read()
        for m in re.finditer(r"\.js\?v=([0-9][0-9A-Za-z.\-]*)", s):
            if m.group(1) != new:
                bad.append(f"{fn}: ?v={m.group(1)}")
    if bad:
        print("FEIL — blandede versjoner:", *bad, sep="\n  ")
        return 1

    print(f"{cur} -> {new}  ({touched}/{len(files)} filer, {len(files)} moduler)")
    return 0


sys.exit(main())
