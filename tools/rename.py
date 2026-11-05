#!/usr/bin/env python3
"""Engangs-omdøping HomeDeck -> Deckify i src/.

Kjøres én gang. Erstatninger gjøres i rekkefølge, mest spesifikk først.
Lagringsnøklene i core.js (`homedeck` / `homedeck.device`) er bevisst
UNNTATT her og håndteres manuelt, slik at Mats' lagrede oppsett overlever.
"""
import os
import re
import sys

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src")

# (mønster, erstatning) — rene strengbytter, ikke regex
SUBS = [
    ("./homedeck.js", "./deckify.js"),
    ("homedeck-card", "deckify-card"),
    ("HomeDeckCard", "DeckifyCard"),
    ("HD_VER", "DK_VER"),
    ("HOMEDECK", "DECKIFY"),
    ("[HomeDeck]", "[Deckify]"),
    ("HomeDeck", "Deckify"),
    ("homeDeck", "deckify"),
]

# Linjer som IKKE skal røres (lagringsnøkler med bakoverkompatibilitet)
SKIP_LINE = re.compile(r'ud:\s*"homedeck|ls:\s*"homedeck|"homedeck:"|"homedeck\.device')


def main():
    changed = 0
    for fn in sorted(os.listdir(SRC)):
        if not fn.endswith(".js"):
            continue
        p = os.path.join(SRC, fn)
        with open(p, encoding="utf-8") as f:
            lines = f.readlines()
        out = []
        hits = 0
        for ln in lines:
            if SKIP_LINE.search(ln):
                out.append(ln)
                continue
            new = ln
            for a, b in SUBS:
                if a in new:
                    new = new.replace(a, b)
            if new != ln:
                hits += 1
            out.append(new)
        if hits:
            with open(p, "w", encoding="utf-8") as f:
                f.writelines(out)
            changed += 1
            print(f"{fn}: {hits} linjer")
    # resterende 'homedeck' i gjenværende tekst skal bare være lagringsnøkler
    left = []
    for fn in sorted(os.listdir(SRC)):
        if not fn.endswith(".js"):
            continue
        with open(os.path.join(SRC, fn), encoding="utf-8") as f:
            for i, ln in enumerate(f, 1):
                if re.search(r"homedeck|HomeDeck|HD_VER", ln, re.I):
                    left.append(f"{fn}:{i}: {ln.rstrip()[:110]}")
    print(f"\n{changed} filer endret. Gjenstående treff ({len(left)}):")
    for l in left:
        print("  " + l)
    # filnavn
    old = os.path.join(SRC, "homedeck.js")
    if os.path.exists(old):
        os.rename(old, os.path.join(SRC, "deckify.js"))
        print("\nhomedeck.js -> deckify.js")
    return 0


sys.exit(main())
