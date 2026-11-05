#!/usr/bin/env python3
"""Dump et ekte HA-øyeblikksbilde som JS kan mate inn i kortet (testing)."""
import json, os, subprocess, sys, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
WS = os.path.join(os.path.dirname(HERE), "ha_ws.py")

def ws(cmd):
    out = subprocess.run([sys.executable, WS, json.dumps(cmd)], capture_output=True, text=True)
    txt = out.stdout.strip()
    for line in (txt, *txt.splitlines()[::-1]):
        try:
            d = json.loads(line)
            return d.get("result", d)
        except Exception:
            continue
    raise SystemExit("WS parse fail: " + txt[:300] + out.stderr[:300])

URL = os.environ["HASS_URL"].rstrip("/"); TOK = os.environ["HASS_TOKEN"]
req = urllib.request.Request(URL + "/api/states", headers={"Authorization": "Bearer " + TOK})
states = json.loads(urllib.request.urlopen(req, timeout=30).read())

areas = ws({"type": "config/area_registry/list"})
devices = ws({"type": "config/device_registry/list"})
ents = ws({"type": "config/entity_registry/list"})

snap = {
    "states": {s["entity_id"]: {"entity_id": s["entity_id"], "state": s["state"],
                                "attributes": s["attributes"]} for s in states},
    "areas": {a["area_id"]: {"area_id": a["area_id"], "name": a["name"], "icon": a.get("icon")} for a in areas},
    "devices": {d["id"]: {"area_id": d.get("area_id"), "name": d.get("name_by_user") or d.get("name")} for d in devices},
    "entities": {e["entity_id"]: {"entity_id": e["entity_id"], "device_id": e.get("device_id"),
                                  "area_id": e.get("area_id"), "name": e.get("name"),
                                  "entity_category": e.get("entity_category"),
                                  "hidden": bool(e.get("hidden_by")),
                                  "platform": e.get("platform")}
                 for e in ents if not e.get("disabled_by")},
}
p = os.path.join(HERE, ".chk", "snapshot.json")
os.makedirs(os.path.dirname(p), exist_ok=True)
json.dump(snap, open(p, "w"), ensure_ascii=False)
print("skrev", p, len(snap["states"]), "states,", len(snap["entities"]), "entities,", len(snap["areas"]), "areas")
