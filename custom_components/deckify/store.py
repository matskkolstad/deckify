"""Serverlagret oppsett for Deckify.

Ett dokument per config entry. Dette er den eneste sannheten for hvordan et
Deckify-dashbord ser ut: rekkefølge, skjulte kort, kortinnstillinger, filtre
og sensorbindinger. Både integrasjonens innstillinger og redigeringsmodus i
selve dashbordet skriver hit, slik at de to aldri kan komme i utakt.

Enhetsspesifikke valg (layout, kioskmodus, skjermsparer) ligger bevisst i
nettleserens localStorage og ikke her — de skal kunne være ulike på
veggnettbrettet og på telefonen.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store

from .const import DOMAIN, EVENT_UPDATED, STORE_KEY, STORE_VERSION, default_config

_LOGGER = logging.getLogger(__name__)


#: Strukturer frontend eier HELT og sender komplette. De må ERSTATTES, ikke
#: slås sammen: en rekursiv merge kan aldri fjerne en nøkkel, så et skop som
#: brukeren nullstiller («Nullstill rekkefølgen», eller en hurtigvalgsrad som
#: settes tilbake til standard) kom tilbake ved neste innlasting. Symptomet er
#: at endringen ser ut til å virke og så angrer seg selv.
REPLACE_KEYS = frozenset({"order", "hidden", "big", "seps", "cards"})

#: Nøklene som utgjør selve layouten. «Nullstill layout» rører bare disse;
#: rom, sensorer, filtre, sider og utseende beholdes.
LAYOUT_KEYS = frozenset({"order", "hidden", "big", "seps", "cards"})


def _merge(base: dict, patch: dict) -> dict:
    """Slå sammen rekursivt: dict union, alt annet overskrives.

    Frontend sender ofte bare det som er endret, så en flat `update()` ville
    slettet nabonøkler inne i f.eks. `sensors`. Unntaket er REPLACE_KEYS.
    """
    out = dict(base)
    for key, val in patch.items():
        if key in REPLACE_KEYS:
            out[key] = val
        elif isinstance(val, dict) and isinstance(out.get(key), dict):
            out[key] = _merge(out[key], val)
        else:
            out[key] = val
    return out


class DeckifyStore:
    """Holder oppsettet for alle Deckify-dashbord."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, STORE_VERSION, STORE_KEY)
        self._data: dict[str, Any] = {}
        self._loaded = False

    async def async_load(self) -> None:
        if self._loaded:
            return
        data = await self._store.async_load()
        self._data = data or {"entries": {}}
        self._data.setdefault("entries", {})
        self._loaded = True

    async def _async_save(self) -> None:
        await self._store.async_save(self._data)

    # --- oppslag ------------------------------------------------------------

    @callback
    def get(self, entry_id: str) -> dict[str, Any]:
        """Oppsettet for ett dashbord. Tomt dashbord får standardoppsettet."""
        cfg = self._data["entries"].get(entry_id)
        if cfg is None:
            return default_config()
        # Nye nøkler i en nyere versjon skal ikke mangle for gamle lagringer.
        return _merge(default_config(cfg.get("title", "Deckify")), cfg)

    @callback
    def has(self, entry_id: str) -> bool:
        return entry_id in self._data["entries"]

    # --- skriving -----------------------------------------------------------

    async def async_init_entry(self, entry_id: str, cfg: dict[str, Any] | None = None) -> dict:
        """Opprett oppsettet for et nytt dashbord hvis det ikke finnes."""
        if entry_id not in self._data["entries"]:
            self._data["entries"][entry_id] = cfg or default_config()
            await self._async_save()
        return self.get(entry_id)

    async def async_set(self, entry_id: str, cfg: dict[str, Any]) -> dict:
        """Erstatt hele oppsettet."""
        self._data["entries"][entry_id] = cfg
        await self._async_save()
        self._fire(entry_id)
        return self.get(entry_id)

    async def async_patch(self, entry_id: str, patch: dict[str, Any]) -> dict:
        """Slå sammen en delvis endring inn i oppsettet."""
        cur = self._data["entries"].get(entry_id) or default_config()
        self._data["entries"][entry_id] = _merge(cur, patch)
        await self._async_save()
        self._fire(entry_id)
        return self.get(entry_id)

    async def async_reset_layout(self, entry_id: str) -> dict:
        """Nullstill bare layouten for ett dashbord.

        Rom, sensorer, filtre, sider, scener og utseende er brukerens oppsett
        og skal overleve en «Nullstill layout». Bare rekkefølge, skjulte kort,
        størrelser, grupper og kortinnstillinger nullstilles.
        """
        cur = dict(self._data["entries"].get(entry_id) or default_config())
        for key in LAYOUT_KEYS:
            cur[key] = {}
        self._data["entries"][entry_id] = cur
        await self._async_save()
        self._fire(entry_id)
        return self.get(entry_id)

    async def async_reset(self, entry_id: str, keep_title: bool = True) -> dict:
        """Nullstill hele oppsettet (brukes av «Nullstill alt»)."""
        title = (self._data["entries"].get(entry_id) or {}).get("title", "Deckify")
        self._data["entries"][entry_id] = default_config(title if keep_title else "Deckify")
        await self._async_save()
        self._fire(entry_id)
        return self.get(entry_id)

    async def async_remove(self, entry_id: str) -> None:
        if self._data["entries"].pop(entry_id, None) is not None:
            await self._async_save()

    # --- varsling -----------------------------------------------------------

    @callback
    def _fire(self, entry_id: str) -> None:
        """Si til alle åpne nettlesere at oppsettet er endret.

        Uten dette ser et nettbrett som står på veggen gammelt oppsett helt
        til siden lastes på nytt.
        """
        self.hass.bus.async_fire(EVENT_UPDATED, {"entry_id": entry_id, "domain": DOMAIN})
