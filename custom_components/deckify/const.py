"""Konstanter for Deckify."""

from __future__ import annotations

DOMAIN = "deckify"

# Må følge manifest.json — brukes til cache-busting av frontend-modulene.
VERSION = "2.3.0"

# URL-en de statiske frontend-filene serveres på.
STATIC_URL = f"/{DOMAIN}_files"
PANEL_COMPONENT = "deckify-panel"

# --- config entry -----------------------------------------------------------
CONF_URL_PATH = "url_path"
CONF_TITLE = "title"
CONF_ICON = "icon"
CONF_SIDEBAR = "show_in_sidebar"
CONF_ADMIN = "require_admin"

DEFAULT_ICON = "mdi:view-dashboard-variant"
DEFAULT_TITLE = "Deckify"

# --- lagringsnøkler ---------------------------------------------------------
STORE_KEY = f"{DOMAIN}.config"
STORE_VERSION = 1

EVENT_UPDATED = f"{DOMAIN}_updated"

# --- sider dashbordet kan vise ---------------------------------------------
PAGES = [
    "start",
    "home",
    "rooms",
    "media",
    "house",
    "energy",
    "security",
    "attention",
]

PAGE_LABELS = {
    "start": "Startskjerm",
    "home": "Hjem",
    "rooms": "Rom",
    "media": "Media",
    "house": "Huset",
    "energy": "Energi",
    "security": "Sikkerhet",
    "attention": "Trenger tilsyn",
}

# Sensorbindinger som kan settes manuelt. Står de tomme, finner frontend
# dem selv ut fra enhetsklasser og integrasjoner.
SENSOR_SLOTS: dict[str, tuple[str, list[str]]] = {
    "weather": ("Værenhet", ["weather"]),
    "climate": ("Termostat for klimakortet", ["climate"]),
    "outdoor_temp": ("Utetemperatur", ["sensor"]),
    "outdoor_hum": ("Luftfuktighet ute", ["sensor"]),
    "power": ("Totalt strømforbruk (W)", ["sensor"]),
    "energy": ("Energimåler (kWh)", ["sensor"]),
    "price": ("Strømpris nå", ["sensor"]),
    "price_next": ("Strømpris neste time", ["sensor"]),
    "price_low": ("Laveste pris i døgnet", ["sensor"]),
    "price_high": ("Høyeste pris i døgnet", ["sensor"]),
    "todo": ("Gjøremålsliste", ["todo"]),
    "alarm_flag": ("Hjelpebryter: alarm aktiv", ["input_boolean"]),
}

# Standardoppsettet et nytt dashbord får. Alt som er tomt betyr
# «finn det ut selv» — ingenting er hardkodet mot Mats' enheter.
def default_config(title: str = DEFAULT_TITLE) -> dict:
    """Tomt, selvoppdagende standardoppsett."""
    return {
        "version": 1,
        "title": title,
        # Et nytt dashbord er TOMT. Brukeren legger til rom, kort og
        # enheter selv; alt blir oppdaget og tilbudt i velgeren, men
        # ingenting vises uinvitert. Slås dette på, fyller Deckify seg selv
        # og tar inn nye enheter automatisk.
        "auto_fill": False,
        # False = samme oppsett på alle skjermer (lagres på tjeneren).
        # True  = hver skjerm har sitt eget oppsett (lagres i nettleseren).
        "per_device": False,
        # [] = alle områder
        "areas": [],
        # Bare Hjem til å begynne med. Resten skrus på under
        # Innstillinger -> Sider, eller i dashbordets egen navigasjonsside.
        # Et tomt dashbord skal ikke ha sju faner fulle av ting du ikke har
        # bedt om.
        "pages": ["home"],
        # modellfiltre
        "exclude": [],
        "exclude_platforms": [],
        "exclude_patterns": [],
        "assign": {},
        "rename": {},
        "as_light": [],
        "confirm": ["siren.", "lock."],
        "show_unavailable": False,
        # sensorbindinger (auto når tom)
        "sensors": {},
        "calendars": None,
        # scener
        "scenes": {"pinned": [], "max": 10, "auto": True, "strip_area_prefix": True},
        # auto-oppdagede lister kan overstyres
        "plants": None,
        "machines": None,
        "power_devices": None,
        "deeplinks": [],
        "security_actions": [],
        "battery_warn": 25,
        # utseende (delt mellom brukere)
        "ui": {},
        # redigerbart oppsett
        "order": {},
        "hidden": {},
        "big": {},
        "seps": {},
        "cards": {},
    }
