"""Deckify — hjemdashbord som Home Assistant-integrasjon.

Hva integrasjonen gjør:

* serverer frontend-modulene fra sin egen mappe (`/deckify_files/...`), så
  brukeren aldri trenger å registrere en Lovelace-ressurs manuelt;
* registrerer `custom:deckify-card` for alle dashbord via
  `frontend.add_extra_js_url`, slik at kortet også kan brukes i et vanlig
  Lovelace-dashbord;
* oppretter **ett sidemenypunkt per config entry** — det er slik man får
  flere Deckify-dashbord ved siden av hverandre;
* lagrer oppsettet for hvert dashbord på tjenersiden og eksponerer det over
  WebSocket, slik at redigering i dashbordet og i integrasjonens
  innstillinger er samme sannhet.
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .const import (
    CONF_ADMIN,
    CONF_ICON,
    CONF_SIDEBAR,
    CONF_TITLE,
    CONF_URL_PATH,
    DEFAULT_ICON,
    DEFAULT_TITLE,
    DOMAIN,
    PANEL_COMPONENT,
    STATIC_URL,
    VERSION,
)
from .store import DeckifyStore
from .websocket import async_register_websocket_api

_LOGGER = logging.getLogger(__name__)

type DeckifyConfigEntry = ConfigEntry

#: Modul-URL med versjon, så nettleseren ikke serverer gammel kode etter
#: en oppdatering. Hele poenget med `?v=` er cache-busting — se README.
MODULE_URL = f"{STATIC_URL}/deckify.js?v={VERSION}"
#: Liten registreringsmodul for `custom:deckify-card`. Den laster den tunge
#: dashbordmodulen først når kortet faktisk brukes.
CARD_URL = f"{STATIC_URL}/register.js?v={VERSION}"

DATA_STORE = f"{DOMAIN}_store"
DATA_SETUP = f"{DOMAIN}_setup_done"

# Deckify settes bare opp via config entries (ett dashbord per entry). Uten
# denne erklærer hassfest at `async_setup` mangler et skjema.
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Engangsoppsett: statiske filer, kortregistrering og WebSocket-API."""
    await _async_setup_shared(hass)
    return True


async def _async_setup_shared(hass: HomeAssistant) -> DeckifyStore:
    """Gjør det som bare skal gjøres én gang, uansett antall dashbord."""
    if (store := hass.data.get(DATA_STORE)) is not None:
        return store

    store = DeckifyStore(hass)
    await store.async_load()
    hass.data[DATA_STORE] = store

    www = Path(__file__).parent / "www"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(www), cache_headers=True)]
    )

    # Gjør `custom:deckify-card` tilgjengelig i alle Lovelace-dashbord uten
    # at brukeren må legge inn en ressurs for hånd. register.js er bevisst
    # liten; selve dashbordmodulen lastes først når kortet brukes.
    frontend.add_extra_js_url(hass, CARD_URL)

    async_register_websocket_api(hass)
    _LOGGER.debug("Deckify %s klar — modul på %s", VERSION, MODULE_URL)
    return store


def _panel_kwargs(entry: ConfigEntry) -> dict:
    opts = {**entry.data, **entry.options}
    title = opts.get(CONF_TITLE) or DEFAULT_TITLE
    in_sidebar = opts.get(CONF_SIDEBAR, True)
    return {
        "frontend_url_path": opts[CONF_URL_PATH],
        "sidebar_title": title,
        "sidebar_icon": opts.get(CONF_ICON) or DEFAULT_ICON,
        "require_admin": bool(opts.get(CONF_ADMIN, False)),
        "show_in_sidebar": bool(in_sidebar),
        "config": {
            "entry_id": entry.entry_id,
            "title": title,
            "version": VERSION,
            "base": STATIC_URL,
        },
    }


def _register_panel(hass: HomeAssistant, entry: ConfigEntry, update: bool) -> None:
    """Registrer (eller oppdater) sidemenypunktet for ett dashbord.

    `panel_custom.async_register_panel` mangler `show_in_sidebar`, så vi
    bygger `_panel_custom`-blokka selv — ellers kan ikke brukeren skjule et
    dashbord fra sidemenyen uten å slette det.
    """
    kwargs = _panel_kwargs(entry)
    config = dict(kwargs.pop("config"))
    config["_panel_custom"] = {
        "name": PANEL_COMPONENT,
        "embed_iframe": False,
        "trust_external": False,
        "module_url": MODULE_URL,
        # Deckify tegner helskjerm og håndterer sikre soner selv.
        "handle_safe_area": True,
    }
    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        config=config,
        update=update,
        **kwargs,
    )


async def async_setup_entry(hass: HomeAssistant, entry: DeckifyConfigEntry) -> bool:
    """Sett opp ett Deckify-dashbord."""
    store = await _async_setup_shared(hass)

    opts = {**entry.data, **entry.options}
    url_path = opts.get(CONF_URL_PATH)
    if not url_path:
        _LOGGER.error("Config entry %s mangler url_path", entry.entry_id)
        return False

    await store.async_init_entry(entry.entry_id)

    # Rom valgt i oppsettsveiviseren legges inn i lagringen én gang, og
    # fjernes så fra options — ellers ville de blitt skrevet tilbake hver
    # gang integrasjonen lastes og overstyrt senere endringer.
    if "areas_seed" in entry.options:
        seed = entry.options.get("areas_seed") or []
        if seed:
            await store.async_patch(entry.entry_id, {"areas": seed})
        new_opts = {k: v for k, v in entry.options.items() if k != "areas_seed"}
        hass.config_entries.async_update_entry(entry, options=new_opts)
        opts = {**entry.data, **new_opts}

    # Tittelen skal følge det brukeren har satt i integrasjonen.
    if (title := opts.get(CONF_TITLE)) and store.get(entry.entry_id).get("title") != title:
        await store.async_patch(entry.entry_id, {"title": title})

    exists = frontend.async_panel_exists(hass, url_path)
    if exists:
        panels = hass.data.get("frontend_panels", {})
        owner = getattr(panels.get(url_path), "config", None) or {}
        if owner.get("entry_id") not in (None, entry.entry_id):
            _LOGGER.error(
                "Kan ikke registrere Deckify på /%s — stien er i bruk", url_path
            )
            return False
    _register_panel(hass, entry, update=exists)

    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    return True


async def _async_update_listener(hass: HomeAssistant, entry: DeckifyConfigEntry) -> None:
    """Innstillingene ble endret — bytt sidemenypunkt og last dashbordet på nytt."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: DeckifyConfigEntry) -> bool:
    """Fjern sidemenypunktet, men behold oppsettet."""
    url_path = {**entry.data, **entry.options}.get(CONF_URL_PATH)
    if url_path:
        frontend.async_remove_panel(hass, url_path, warn_if_unknown=False)
    return True


async def async_remove_entry(hass: HomeAssistant, entry: DeckifyConfigEntry) -> None:
    """Dashbordet ble slettet — kast oppsettet også."""
    if (store := hass.data.get(DATA_STORE)) is not None:
        await store.async_remove(entry.entry_id)


async def async_migrate_entry(hass: HomeAssistant, entry: DeckifyConfigEntry) -> bool:
    """Ingen migreringer ennå."""
    return True
