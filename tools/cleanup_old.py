#!/usr/bin/env python3
"""Rydd bort gamle HomeDeck-rester og sett opp Deckify helt på nytt.

Kjør med --dry for å bare se hva som ville skjedd.

Sikring: alt som slettes lagres først som JSON i ~/workspace/deckify-backup/.
"""

from __future__ import annotations

import datetime
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WS = os.path.join(os.path.expanduser("~"), "workspace", "ha_ws.py")
BACKUP = os.path.join(os.path.expanduser("~"), "workspace", "deckify-backup")
DRY = "--dry" in sys.argv


def ws(cmd: dict):
    out = subprocess.run([sys.executable, WS, json.dumps(cmd)],
                         capture_output=True, text=True)
    # ha_ws.py skriver en kommentarlinje først og deretter pen JSON
    txt = out.stdout
    start = txt.find("{")
    while start != -1:
        try:
            d = json.loads(txt[start:])
            if not d.get("success", True):
                raise SystemExit(f"WS-feil for {cmd['type']}: {d.get('error')}")
            return d.get("result")
        except json.JSONDecodeError:
            start = txt.find("{", start + 1)
    raise SystemExit("Klarte ikke tolke WS-svar: " + txt[:300] + out.stderr[:300])


def save(name: str, data) -> str:
    os.makedirs(BACKUP, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    p = os.path.join(BACKUP, f"{name}-{stamp}.json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return p


def main() -> int:
    print("== gamle Lovelace-ressurser")
    res = ws({"type": "lovelace/resources"}) or []
    stale = [r for r in res if "homedeck" in r["url"] or "deckify" in r["url"]]
    if stale:
        print("  sikkerhetskopi:", save("lovelace-resources", res))
    for r in stale:
        print(f"  {'(dry) ' if DRY else ''}sletter ressurs {r['url']}")
        if not DRY:
            ws({"type": "lovelace/resources/delete", "resource_id": r["id"]})
    if not stale:
        print("  ingen")

    print("== gamle dashbord")
    dash = ws({"type": "lovelace/dashboards/list"}) or []
    targets = []
    for d in dash:
        url = d.get("url_path") or ""
        if url.startswith(("home-deck", "homedeck", "deckify")):
            targets.append(d)
            continue
        # Et dashbord kan hete hva som helst og likevel inneholde kortet
        # (soverom-deck gjorde det) — avgjør på innholdet, ikke på navnet.
        try:
            cfg = ws({"type": "lovelace/config", "url_path": url})
        except SystemExit:
            continue
        if cfg and "homedeck-card" in json.dumps(cfg):
            targets.append(d)
    for d in targets:
        try:
            cfg = ws({"type": "lovelace/config", "url_path": d["url_path"]})
        except SystemExit:
            cfg = None
        print("  sikkerhetskopi:", save("dashboard-" + d["url_path"],
                                        {"dashboard": d, "config": cfg}))
        print(f"  {'(dry) ' if DRY else ''}sletter dashbord /{d['url_path']} ({d.get('title')})")
        if not DRY:
            ws({"type": "lovelace/dashboards/delete", "dashboard_id": d["id"]})
    if not targets:
        print("  ingen")

    print("\nFerdig. Gjenstår: start HA på nytt, legg til Deckify under")
    print("Innstillinger -> Enheter og tjenester -> Legg til integrasjon.")
    return 0


sys.exit(main())
