"""Config flow for Deckify.

Hver config entry = ett Deckify-dashbord med eget sidemenypunkt. Vil man ha
flere dashbord, legger man integrasjonen til flere ganger.

Innstillingene (⚙ på integrasjonskortet) er delt i en meny, fordi alt i ett
skjema ble uleselig: generelt, rom, enheter, sensorer, sider, scener,
avansert og nullstilling.
"""

from __future__ import annotations

import re
from typing import Any

import voluptuous as vol

from homeassistant.components import frontend
from homeassistant.config_entries import (
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers import selector
from homeassistant.util import slugify

from .const import (
    CONF_ADMIN,
    CONF_ICON,
    CONF_SIDEBAR,
    CONF_TITLE,
    CONF_URL_PATH,
    DEFAULT_ICON,
    DEFAULT_TITLE,
    DOMAIN,
    PAGE_LABELS,
    PAGES,
    SENSOR_SLOTS,
)

DATA_STORE = f"{DOMAIN}_store"

URL_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{1,40}$")

# Stier frontend eller kjernen eier. Tar man en av dem, forsvinner
# originalen fra sidemenyen.
RESERVED = {
    "lovelace", "config", "developer-tools", "history", "logbook", "map",
    "media-browser", "profile", "todo", "energy", "calendar", "auth",
    "hassio", "my", "api", "static", "frontend_latest", "local",
}


def _area_options(hass) -> list[selector.SelectOptionDict]:
    from homeassistant.helpers import area_registry as ar

    reg = ar.async_get(hass)
    return [
        selector.SelectOptionDict(value=a.id, label=a.name)
        for a in sorted(reg.async_list_areas(), key=lambda x: x.name.lower())
    ]


class DeckifyConfigFlow(ConfigFlow, domain=DOMAIN):
    """Legg til et Deckify-dashbord."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        suggested = "deckify"
        if self._async_current_entries():
            suggested = f"deckify-{len(self._async_current_entries()) + 1}"

        if user_input is not None:
            title = (user_input.get(CONF_TITLE) or DEFAULT_TITLE).strip()
            url_path = (user_input.get(CONF_URL_PATH) or slugify(title)).strip().lower()

            if not URL_RE.match(url_path):
                errors[CONF_URL_PATH] = "invalid_url"
            elif url_path in RESERVED:
                errors[CONF_URL_PATH] = "reserved_url"
            elif frontend.async_panel_exists(self.hass, url_path):
                errors[CONF_URL_PATH] = "url_taken"
            else:
                await self.async_set_unique_id(url_path)
                self._abort_if_unique_id_configured()
                data = {
                    CONF_URL_PATH: url_path,
                    CONF_TITLE: title,
                    CONF_ICON: user_input.get(CONF_ICON) or DEFAULT_ICON,
                    CONF_SIDEBAR: user_input.get(CONF_SIDEBAR, True),
                    CONF_ADMIN: user_input.get(CONF_ADMIN, False),
                }
                # Rommene hører til Deckifys eget oppsett, ikke til entryen.
                # `areas_seed` plukkes opp av async_setup_entry og skrives
                # inn i lagringen, så options holder seg rene.
                return self.async_create_entry(
                    title=title,
                    data=data,
                    options={"areas_seed": user_input.get("areas") or []},
                )

        schema = vol.Schema(
            {
                vol.Required(CONF_TITLE, default=DEFAULT_TITLE): str,
                vol.Required(CONF_URL_PATH, default=suggested): str,
                vol.Optional(CONF_ICON, default=DEFAULT_ICON): selector.IconSelector(),
                vol.Optional("areas", default=[]): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=_area_options(self.hass),
                        multiple=True,
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Optional(CONF_SIDEBAR, default=True): bool,
                vol.Optional(CONF_ADMIN, default=False): bool,
            }
        )
        return self.async_show_form(
            step_id="user", data_schema=schema, errors=errors
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry) -> OptionsFlow:
        return DeckifyOptionsFlow()


class DeckifyOptionsFlow(OptionsFlow):
    """Innstillinger for et Deckify-dashbord."""

    # --- hjelpere -----------------------------------------------------------

    @property
    def _store(self):
        return self.hass.data.get(DATA_STORE)

    def _cfg(self) -> dict:
        store = self._store
        if store is None:
            from .const import default_config

            return default_config()
        return store.get(self.config_entry.entry_id)

    async def _patch(self, patch: dict) -> None:
        if (store := self._store) is not None:
            await store.async_patch(self.config_entry.entry_id, patch)

    def _done(self, reload: bool = False) -> ConfigFlowResult:
        """Avslutt flyten.

        Endrer vi bare Deckifys eget oppsett, holder det å lagre uendrede
        options — da fyrer oppdateringslytteren og panelet tegnes på nytt.
        """
        opts = dict(self.config_entry.options)
        opts.pop("areas_seed", None)
        if reload:
            opts["_rev"] = opts.get("_rev", 0) + 1
        return self.async_create_entry(title="", data=opts)

    # --- meny ---------------------------------------------------------------

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        return self.async_show_menu(
            step_id="init",
            menu_options=[
                "general",
                "behaviour",
                "areas",
                "entities",
                "sensors",
                "pages",
                "scenes",
                "advanced",
                "reset",
            ],
        )

    # --- generelt -----------------------------------------------------------

    async def async_step_general(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        cur = {**self.config_entry.data, **self.config_entry.options}
        if user_input is not None:
            title = (user_input.get(CONF_TITLE) or DEFAULT_TITLE).strip()
            await self._patch({"title": title})
            opts = dict(self.config_entry.options)
            opts.pop("areas_seed", None)
            opts.update(
                {
                    CONF_TITLE: title,
                    CONF_ICON: user_input.get(CONF_ICON) or DEFAULT_ICON,
                    CONF_SIDEBAR: user_input.get(CONF_SIDEBAR, True),
                    CONF_ADMIN: user_input.get(CONF_ADMIN, False),
                }
            )
            self.hass.config_entries.async_update_entry(
                self.config_entry, title=title
            )
            return self.async_create_entry(title="", data=opts)

        schema = vol.Schema(
            {
                vol.Required(CONF_TITLE, default=cur.get(CONF_TITLE, DEFAULT_TITLE)): str,
                vol.Optional(
                    CONF_ICON, default=cur.get(CONF_ICON) or DEFAULT_ICON
                ): selector.IconSelector(),
                vol.Optional(CONF_SIDEBAR, default=cur.get(CONF_SIDEBAR, True)): bool,
                vol.Optional(CONF_ADMIN, default=cur.get(CONF_ADMIN, False)): bool,
            }
        )
        return self.async_show_form(
            step_id="general",
            data_schema=schema,
            description_placeholders={"url": "/" + str(cur.get(CONF_URL_PATH, ""))},
        )

    # --- oppførsel -----------------------------------------------------------

    async def async_step_behaviour(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Automatisk utfylling, og felles eller eget oppsett per skjerm."""
        cfg = self._cfg()
        if user_input is not None:
            await self._patch(
                {
                    "auto_fill": bool(user_input.get("auto_fill", False)),
                    "per_device": bool(user_input.get("per_device", False)),
                }
            )
            return self._done(reload=True)

        schema = vol.Schema(
            {
                vol.Optional("auto_fill", default=cfg.get("auto_fill", False)): bool,
                vol.Optional("per_device", default=cfg.get("per_device", False)): bool,
            }
        )
        return self.async_show_form(step_id="behaviour", data_schema=schema)

    # --- rom ----------------------------------------------------------------

    async def async_step_areas(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        cfg = self._cfg()
        if user_input is not None:
            await self._patch({"areas": user_input.get("areas") or []})
            return self._done(reload=True)

        schema = vol.Schema(
            {
                vol.Optional("areas", default=cfg.get("areas") or []): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=_area_options(self.hass),
                        multiple=True,
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
            }
        )
        return self.async_show_form(step_id="areas", data_schema=schema)

    # --- enheter ------------------------------------------------------------

    async def async_step_entities(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        cfg = self._cfg()
        if user_input is not None:
            await self._patch(
                {
                    "exclude": user_input.get("exclude") or [],
                    "as_light": user_input.get("as_light") or [],
                    "confirm": user_input.get("confirm") or [],
                    "show_unavailable": user_input.get("show_unavailable", False),
                }
            )
            return self._done(reload=True)

        multi = selector.EntitySelector(
            selector.EntitySelectorConfig(multiple=True)
        )
        schema = vol.Schema(
            {
                vol.Optional("exclude", default=cfg.get("exclude") or []): multi,
                vol.Optional("as_light", default=cfg.get("as_light") or []): multi,
                vol.Optional(
                    "confirm", default=cfg.get("confirm") or []
                ): selector.TextSelector(
                    selector.TextSelectorConfig(multiple=True)
                ),
                vol.Optional(
                    "show_unavailable", default=cfg.get("show_unavailable", False)
                ): bool,
            }
        )
        return self.async_show_form(step_id="entities", data_schema=schema)

    # --- sensorer -----------------------------------------------------------

    async def async_step_sensors(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        cfg = self._cfg()
        cur = cfg.get("sensors") or {}
        if user_input is not None:
            sensors = {
                k: (v or None) for k, v in user_input.items() if k in SENSOR_SLOTS
            }
            patch: dict[str, Any] = {"sensors": sensors}
            if "calendars" in user_input:
                patch["calendars"] = user_input.get("calendars") or None
            if "power_devices" in user_input:
                patch["power_devices"] = user_input.get("power_devices") or None
            await self._patch(patch)
            return self._done(reload=True)

        fields: dict[Any, Any] = {}
        for key, (_label, domains) in SENSOR_SLOTS.items():
            fields[vol.Optional(key, description={"suggested_value": cur.get(key)})] = (
                selector.EntitySelector(
                    selector.EntitySelectorConfig(domain=domains)
                )
            )
        fields[
            vol.Optional(
                "calendars",
                description={"suggested_value": cfg.get("calendars") or []},
            )
        ] = selector.EntitySelector(
            selector.EntitySelectorConfig(domain=["calendar"], multiple=True)
        )
        fields[
            vol.Optional(
                "power_devices",
                description={"suggested_value": cfg.get("power_devices") or []},
            )
        ] = selector.EntitySelector(
            selector.EntitySelectorConfig(domain=["sensor"], multiple=True)
        )
        return self.async_show_form(step_id="sensors", data_schema=vol.Schema(fields))

    # --- sider --------------------------------------------------------------

    async def async_step_pages(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        cfg = self._cfg()
        if user_input is not None:
            pages = [p for p in PAGES if p in (user_input.get("pages") or [])]
            await self._patch({"pages": pages or ["home"]})
            return self._done(reload=True)

        schema = vol.Schema(
            {
                vol.Optional(
                    "pages", default=cfg.get("pages") or PAGES
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=[
                            selector.SelectOptionDict(value=p, label=PAGE_LABELS[p])
                            for p in PAGES
                        ],
                        multiple=True,
                        mode=selector.SelectSelectorMode.LIST,
                    )
                )
            }
        )
        return self.async_show_form(step_id="pages", data_schema=schema)

    # --- scener -------------------------------------------------------------

    async def async_step_scenes(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        cfg = self._cfg()
        cur = cfg.get("scenes") or {}
        if user_input is not None:
            await self._patch(
                {
                    "scenes": {
                        "pinned": user_input.get("pinned") or [],
                        "max": int(user_input.get("max", 10)),
                        "auto": user_input.get("auto", True),
                        "strip_area_prefix": user_input.get("strip_area_prefix", True),
                    }
                }
            )
            return self._done(reload=True)

        schema = vol.Schema(
            {
                vol.Optional(
                    "pinned", default=cur.get("pinned") or []
                ): selector.EntitySelector(
                    selector.EntitySelectorConfig(
                        domain=["scene", "script"], multiple=True
                    )
                ),
                vol.Optional("auto", default=cur.get("auto", True)): bool,
                vol.Optional("max", default=cur.get("max", 10)): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=0, max=40, step=1, mode=selector.NumberSelectorMode.BOX
                    )
                ),
                vol.Optional(
                    "strip_area_prefix", default=cur.get("strip_area_prefix", True)
                ): bool,
            }
        )
        return self.async_show_form(step_id="scenes", data_schema=schema)

    # --- avansert -----------------------------------------------------------

    async def async_step_advanced(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        cfg = self._cfg()
        errors: dict[str, str] = {}
        text_list = selector.TextSelector(selector.TextSelectorConfig(multiple=True))
        schema = vol.Schema(
            {
                vol.Optional(
                    "exclude_platforms", default=cfg.get("exclude_platforms") or []
                ): text_list,
                vol.Optional(
                    "exclude_patterns", default=cfg.get("exclude_patterns") or []
                ): text_list,
                vol.Optional(
                    "battery_warn", default=cfg.get("battery_warn", 25)
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=1, max=100, step=1, mode=selector.NumberSelectorMode.BOX
                    )
                ),
            }
        )

        if user_input is not None:
            patterns = user_input.get("exclude_patterns") or []
            for pattern in patterns:
                try:
                    re.compile(pattern)
                except re.error:
                    errors["exclude_patterns"] = "invalid_pattern"
                    break

            if not errors:
                await self._patch(
                    {
                        "exclude_platforms": user_input.get("exclude_platforms") or [],
                        "exclude_patterns": patterns,
                        "battery_warn": int(user_input.get("battery_warn", 25)),
                    }
                )
                return self._done(reload=True)

        return self.async_show_form(
            step_id="advanced", data_schema=schema, errors=errors
        )

    # --- nullstill ----------------------------------------------------------

    async def async_step_reset(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            if user_input.get("confirm") and (store := self._store) is not None:
                await store.async_reset_layout(self.config_entry.entry_id)
            return self._done(reload=True)
        return self.async_show_form(
            step_id="reset",
            data_schema=vol.Schema({vol.Required("confirm", default=False): bool}),
        )
