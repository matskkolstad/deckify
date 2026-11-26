"""WebSocket-API for Deckify.

Frontend henter og lagrer oppsettet her. Lesing er åpen for alle innloggede
brukere (veggnettbrettet kjører som en vanlig bruker), mens all skriving
krever administrator — ellers kunne kioskbrukeren bygget om dashbordet.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback

from .const import (
    CONF_ADMIN,
    CONF_ICON,
    CONF_SIDEBAR,
    CONF_TITLE,
    CONF_URL_PATH,
    DEFAULT_ICON,
    DOMAIN,
    VERSION,
)

DATA_STORE = f"{DOMAIN}_store"


def _store(hass: HomeAssistant):
    return hass.data.get(DATA_STORE)


def _entry(hass: HomeAssistant, entry_id: str) -> ConfigEntry | None:
    entry = hass.config_entries.async_get_entry(entry_id)
    if entry is None or entry.domain != DOMAIN:
        return None
    return entry


def _entry_info(entry: ConfigEntry) -> dict[str, Any]:
    opts = {**entry.data, **entry.options}
    return {
        "entry_id": entry.entry_id,
        "url_path": opts.get(CONF_URL_PATH),
        "title": opts.get(CONF_TITLE) or entry.title,
        "icon": opts.get(CONF_ICON) or DEFAULT_ICON,
        "show_in_sidebar": bool(opts.get(CONF_SIDEBAR, True)),
        "require_admin": bool(opts.get(CONF_ADMIN, False)),
    }


@callback
def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Registrer alle Deckify-kommandoer."""
    websocket_api.async_register_command(hass, ws_get_config)
    websocket_api.async_register_command(hass, ws_save_config)
    websocket_api.async_register_command(hass, ws_patch_config)
    websocket_api.async_register_command(hass, ws_reset_config)
    websocket_api.async_register_command(hass, ws_list_dashboards)


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/config",
        vol.Optional("entry_id"): vol.Any(str, None),
        vol.Optional("url_path"): vol.Any(str, None),
    }
)
@callback
def ws_get_config(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Hent oppsettet for ett dashbord.

    Kortet kjenner som regel sin `entry_id` fra panelkonfigurasjonen, men et
    kort som ligger i et vanlig Lovelace-dashbord kjenner bare URL-stien —
    derfor godtar vi begge.
    """
    store = _store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Deckify er ikke lastet")
        return

    entry = None
    if msg.get("entry_id"):
        entry = _entry(hass, msg["entry_id"])
    elif msg.get("url_path"):
        for cand in hass.config_entries.async_entries(DOMAIN):
            if {**cand.data, **cand.options}.get(CONF_URL_PATH) == msg["url_path"]:
                entry = cand
                break

    if entry is None:
        # Ukjent dashbord: svar med standardoppsettet, så kortet kan vise noe
        # fornuftig i stedet for å feile. Lagring er da ikke mulig.
        connection.send_result(
            msg["id"],
            {"entry_id": None, "config": store.get("__none__"), "version": VERSION,
             "writable": False, "entry": None},
        )
        return

    connection.send_result(
        msg["id"],
        {
            "entry_id": entry.entry_id,
            "entry": _entry_info(entry),
            "config": store.get(entry.entry_id),
            "version": VERSION,
            "writable": connection.user.is_admin,
        },
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/config/save",
        vol.Required("entry_id"): str,
        vol.Required("config"): dict,
    }
)
@websocket_api.async_response
async def ws_save_config(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Erstatt hele oppsettet."""
    store = _store(hass)
    if store is None or _entry(hass, msg["entry_id"]) is None:
        connection.send_error(msg["id"], "not_found", "Ukjent Deckify-dashbord")
        return
    cfg = await store.async_set(msg["entry_id"], msg["config"])
    connection.send_result(msg["id"], {"config": cfg})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/config/patch",
        vol.Required("entry_id"): str,
        vol.Required("patch"): dict,
    }
)
@websocket_api.async_response
async def ws_patch_config(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Slå sammen en delvis endring — brukes av redigeringsmodus."""
    store = _store(hass)
    if store is None or _entry(hass, msg["entry_id"]) is None:
        connection.send_error(msg["id"], "not_found", "Ukjent Deckify-dashbord")
        return
    cfg = await store.async_patch(msg["entry_id"], msg["patch"])
    connection.send_result(msg["id"], {"config": cfg})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/config/reset",
        vol.Required("entry_id"): str,
        vol.Optional("scope", default="layout"): vol.In(["layout", "all"]),
    }
)
@websocket_api.async_response
async def ws_reset_config(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Nullstill layouten, eller hele dashbordet med scope=all."""
    store = _store(hass)
    if store is None or _entry(hass, msg["entry_id"]) is None:
        connection.send_error(msg["id"], "not_found", "Ukjent Deckify-dashbord")
        return
    if msg.get("scope", "layout") == "all":
        cfg = await store.async_reset(msg["entry_id"])
    else:
        cfg = await store.async_reset_layout(msg["entry_id"])
    connection.send_result(msg["id"], {"config": cfg})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/dashboards"})
@callback
def ws_list_dashboards(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Alle Deckify-dashbord — gir kortet en innebygd dashbordbytter."""
    connection.send_result(
        msg["id"],
        [_entry_info(e) for e in hass.config_entries.async_entries(DOMAIN)],
    )
