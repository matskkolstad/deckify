"""Tester for serverlagret oppsett uten å starte Home Assistant.

Testen laster const.py og store.py som en liten pakke, og erstatter
homeassistant.helpers.storage.Store med en minneimplementasjon. Da kan
merge- og nullstillingslogikken testes i CI uten HA-avhengigheter.
"""
from __future__ import annotations

import asyncio
import importlib.util
import pathlib
import sys
import types
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
CC = ROOT / "custom_components" / "deckify"
PKG = "deckify_store_test"

pkg = types.ModuleType(PKG)
pkg.__path__ = [str(CC)]
sys.modules[PKG] = pkg

ha = types.ModuleType("homeassistant")
ha_core = types.ModuleType("homeassistant.core")
ha_core.HomeAssistant = object
ha_core.callback = lambda fn: fn
ha_helpers = types.ModuleType("homeassistant.helpers")
ha_storage = types.ModuleType("homeassistant.helpers.storage")


class MemoryStore:
    """Minimal erstatning for HAs Store."""

    def __init__(self, hass, version, key):
        self._data = None

    async def async_load(self):
        return self._data

    async def async_save(self, data):
        self._data = data


ha_storage.Store = MemoryStore
sys.modules["homeassistant"] = ha
sys.modules["homeassistant.core"] = ha_core
sys.modules["homeassistant.helpers"] = ha_helpers
sys.modules["homeassistant.helpers.storage"] = ha_storage


def _load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(f"{PKG}.{name}", CC / filename)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


const = _load("const", "const.py")
store_mod = _load("store", "store.py")


class FakeBus:
    def __init__(self):
        self.events = []

    def async_fire(self, *args):
        self.events.append(args)


class FakeHass:
    def __init__(self):
        self.bus = FakeBus()


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.hass = FakeHass()
        self.store = store_mod.DeckifyStore(self.hass)
        asyncio.run(self.store.async_load())

    def test_defaults_are_applied_to_old_entries(self):
        asyncio.run(self.store.async_init_entry("e", {"title": "Gammelt"}))
        cfg = self.store.get("e")
        self.assertEqual(cfg["title"], "Gammelt")
        self.assertIn("pages", cfg)
        self.assertEqual(cfg["pages"], ["home"])

    def test_reset_layout_keeps_configuration(self):
        asyncio.run(self.store.async_init_entry("e", {
            "areas": ["stue"],
            "sensors": {"power": "sensor.power"},
            "pages": ["home", "energy"],
            "exclude": ["sensor.støy"],
            "order": {"home": ["room:stue"]},
            "hidden": {"home": ["dev:sensor.x"]},
            "big": {"home": {"dev:sensor.x": True}},
            "cards": {"home": {"dev:sensor.x": {"size": "2x2"}}},
            "seps": {"sep:a": "Gruppe"},
        }))
        asyncio.run(self.store.async_reset_layout("e"))
        cfg = self.store.get("e")
        self.assertEqual(cfg["areas"], ["stue"])
        self.assertEqual(cfg["sensors"], {"power": "sensor.power"})
        self.assertEqual(cfg["pages"], ["home", "energy"])
        self.assertEqual(cfg["exclude"], ["sensor.støy"])
        for key in ("order", "hidden", "big", "cards", "seps"):
            self.assertEqual(cfg[key], {}, key)
        self.assertTrue(self.hass.bus.events)

    def test_merge_replaces_layout_keys(self):
        merged = store_mod._merge(
            {"order": {"home": ["a"]}, "areas": ["stue"]},
            {"order": {}, "areas": ["bad"]},
        )
        self.assertEqual(merged["order"], {})
        self.assertEqual(merged["areas"], ["bad"])


if __name__ == "__main__":
    unittest.main()
