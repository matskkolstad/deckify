#!/usr/bin/env python3
"""Opprett Deckify-dashbord via config-flowen (samme vei som UI-en bruker).

  python3 tools/add_dashboard.py "Deckify" deckify
  python3 tools/add_dashboard.py "Soverom" soverom-deck soverom
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ["HASS_URL"].rstrip("/")
TOK = os.environ["HASS_TOKEN"]


def api(method: str, path: str, body=None):
    req = urllib.request.Request(
        URL + path, method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + TOK,
                 "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path} -> {e.code}: {e.read()[:400].decode()}")


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    title, url_path = sys.argv[1], sys.argv[2]
    areas = sys.argv[3:]

    # finn område-id-ene fra navn
    area_ids = []
    if areas:
        reg = api("GET", "/api/states")  # fallback hvis registeret ikke er åpent
        del reg
        # områderegisteret ligger ikke i REST; bruk slug-gjetning
        area_ids = [a.lower().replace(" ", "_") for a in areas]

    flow = api("POST", "/api/config/config_entries/flow", {"handler": "deckify"})
    fid = flow["flow_id"]
    res = api("POST", f"/api/config/config_entries/flow/{fid}", {
        "title": title,
        "url_path": url_path,
        "icon": "mdi:view-dashboard-variant",
        "areas": area_ids,
        "show_in_sidebar": True,
        "require_admin": False,
    })
    if res.get("type") == "create_entry":
        print(f"OK: /{url_path} -> entry {res['result']['entry_id']}")
        return 0
    print("Flowen stoppet:", json.dumps(res, indent=2, ensure_ascii=False)[:800])
    return 1


sys.exit(main())
