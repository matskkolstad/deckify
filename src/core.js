/* Deckify — core.js
 * Modell, hjelpefunksjoner, lagring og paletter.
 * Bygget for Home Assistant. Ingen HACS-avhengighet.
 */

export const DK_VER = "2.4.0";

/* Basis-URL for modulene. Integrasjonen serverer dem fra /deckify_files/,
   men kortet skal også fungere hvis noen legger filene et annet sted — så
   stien løses fra modulens egen plassering i stedet for å hardkodes. */
export const BASE = new URL(".", import.meta.url).href;

/* ---------------------------------------------------------------- utils */

export const h = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const uid = () => Math.random().toString(36).slice(2, 10);

export const isOn = (st) =>
  !!st && !["off", "unavailable", "unknown", "idle", "standby", "docked", "closed",
            "not_home", "locked", "disarmed"].includes(st.state);

export const isDead = (st) => !st || st.state === "unavailable" || st.state === "unknown";

export const domainOf = (eid) => String(eid).split(".")[0];

export function fmtNum(v, dec = 0) {
  const n = Number(v);
  if (!isFinite(n)) return "–";
  return n.toLocaleString("nb-NO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function titleCase(s) {
  s = String(s || "").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Korter en streng til maks n tegn og avslutter med «…» hvis noe ble kappet
 *  — aldri midt i et ord uten varsel slik rå .slice(0,n) gjør. */
export function truncate(s, n) {
  const str = String(s ?? "");
  return str.length > n ? str.slice(0, Math.max(0, n - 1)).trimEnd() + "…" : str;
}

/** Kort, menneskelig navn: fjerner romprefiks og enhetsnavn-støy. */
export function shortName(name, roomName) {
  let n = String(name || "").trim();
  if (roomName) {
    const r = roomName.trim();
    const re = new RegExp("^" + r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\-–]+", "i");
    const n2 = n.replace(re, "");
    if (n2.length > 1) n = n2;
  }
  n = n.replace(/\s+/g, " ").trim();
  return titleCase(n);
}

export function relTime(iso) {
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return "";
  const d = Math.round((Date.now() - t) / 1000);
  if (d < 60) return "nå";
  if (d < 3600) return Math.floor(d / 60) + " min siden";
  if (d < 86400) return Math.floor(d / 3600) + " t siden";
  return Math.floor(d / 86400) + " d siden";
}

export function mmss(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ":" + String(s).padStart(2, "0");
}

/** Relativ tid på norsk: «nå», «3 min siden», «2 t siden», «5 d siden». */
export function relativeTime(iso, now) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return "";
  const n = (now instanceof Date ? now.getTime() : Date.now());
  const sec = Math.max(0, Math.round((n - t) / 1000));
  if (sec < 60) return "nå";
  const min = Math.round(sec / 60);
  if (min < 60) return min + " min siden";
  const hr = Math.round(min / 60);
  if (hr < 24) return hr + " t siden";
  const d = Math.round(hr / 24);
  if (d < 14) return d + " d siden";
  return Math.round(d / 7) + " uker siden";
}

/* --------------------------------------------------------------- icons */

export const ICON = {
  light: "mdi:lightbulb-outline", lightOn: "mdi:lightbulb",
  power: "mdi:power", plug: "mdi:power-plug-outline",
  cover: "mdi:blinds-horizontal", climate: "mdi:thermostat",
  media: "mdi:speaker", tv: "mdi:television", fan: "mdi:fan",
  vacuum: "mdi:robot-vacuum", lock: "mdi:lock", unlock: "mdi:lock-open-variant",
  humidifier: "mdi:air-humidifier", siren: "mdi:bullhorn-outline",
  scene: "mdi:palette-outline", script: "mdi:play-outline",
  shield: "mdi:shield-check-outline", alert: "mdi:shield-alert-outline",
  thermo: "mdi:thermometer", drop: "mdi:water-percent",
  calendar: "mdi:calendar-blank-outline", todo: "mdi:format-list-checks",
  cog: "mdi:cog-outline", pencil: "mdi:pencil-outline", check: "mdi:check",
  close: "mdi:close", plus: "mdi:plus", minus: "mdi:minus",
  home: "mdi:home-outline", rooms: "mdi:view-grid-outline",
  prev: "mdi:skip-previous", next: "mdi:skip-next",
  play: "mdi:play", pause: "mdi:pause", shuffle: "mdi:shuffle-variant",
  repeat: "mdi:repeat", repeatOne: "mdi:repeat-once", repeatOff: "mdi:repeat-off",
  up: "mdi:chevron-up", down: "mdi:chevron-down", left: "mdi:chevron-left",
  right: "mdi:chevron-right", stop: "mdi:stop",
  door: "mdi:door-open", motion: "mdi:motion-sensor", smoke: "mdi:smoke-detector-variant",
  leak: "mdi:water-alert-outline", camera: "mdi:cctv", bolt: "mdi:flash-outline",
  expand: "mdi:arrow-top-right-bottom-left", person: "mdi:account",
};

export const BINARY_ICON = {
  door: "mdi:door-open", window: "mdi:window-open-variant", opening: "mdi:door-open",
  garage_door: "mdi:garage-open", motion: "mdi:motion-sensor", occupancy: "mdi:motion-sensor",
  presence: "mdi:home-account", smoke: "mdi:smoke-detector-variant", gas: "mdi:gas-cylinder",
  moisture: "mdi:water-alert-outline", problem: "mdi:alert-circle-outline",
  battery: "mdi:battery-alert", connectivity: "mdi:wifi", running: "mdi:play-circle-outline",
  tamper: "mdi:shield-alert-outline", vibration: "mdi:vibrate", sound: "mdi:ear-hearing",
  cold: "mdi:snowflake", heat: "mdi:thermometer-high", light: "mdi:white-balance-sunny",
  lock: "mdi:lock", safety: "mdi:shield-check-outline", update: "mdi:package-up",
  plug: "mdi:power-plug-outline", power: "mdi:flash-outline", carbon_monoxide: "mdi:molecule-co",
};

export const SENSOR_ICON = {
  temperature: "mdi:thermometer", humidity: "mdi:water-percent",
  illuminance: "mdi:brightness-5", pressure: "mdi:gauge",
  atmospheric_pressure: "mdi:gauge", power: "mdi:flash-outline",
  energy: "mdi:counter", current: "mdi:current-ac", voltage: "mdi:sine-wave",
  battery: "mdi:battery", pm25: "mdi:blur", pm10: "mdi:blur",
  carbon_dioxide: "mdi:molecule-co2", carbon_monoxide: "mdi:molecule-co",
  moisture: "mdi:water-percent", signal_strength: "mdi:wifi",
  timestamp: "mdi:clock-outline", duration: "mdi:timer-outline",
  monetary: "mdi:cash", gas: "mdi:meter-gas", water: "mdi:water",
  speed: "mdi:speedometer", wind_speed: "mdi:weather-windy",
  precipitation: "mdi:weather-rainy", aqi: "mdi:air-filter", enum: "mdi:format-list-bulleted",
};

export const AREA_ICON = {
  stue: "mdi:sofa-outline", kjokken: "mdi:silverware-fork-knife",
  soverom: "mdi:bed-outline", inngang: "mdi:coat-rack", bad: "mdi:shower-head",
  trappen: "mdi:stairs", gang: "mdi:coat-rack", ute: "mdi:tree-outline",
  kontor: "mdi:desk", barnerom: "mdi:teddy-bear",
};

export function guessAreaIcon(name) {
  const n = String(name || "").toLowerCase();
  if (/stue|living/.test(n)) return AREA_ICON.stue;
  if (/kj[øo]kken|kitchen/.test(n)) return AREA_ICON.kjokken;
  if (/maries|petras|barn/.test(n)) return AREA_ICON.barnerom;
  if (/soverom|bed/.test(n)) return AREA_ICON.soverom;
  if (/inngang|gang|hall/.test(n)) return AREA_ICON.inngang;
  if (/bad|bath|dusj/.test(n)) return AREA_ICON.bad;
  if (/trapp|stair/.test(n)) return AREA_ICON.trappen;
  if (/ute|hage|balkong|garden/.test(n)) return AREA_ICON.ute;
  if (/kontor|office/.test(n)) return AREA_ICON.kontor;
  return "mdi:home-outline";
}

export function entityIcon(st, eid, cfg) {
  const d = domainOf(eid);
  const dc = st?.attributes?.device_class;
  /* Brukerens eget valg vinner: først kortinnstillingen (cfg.icons), så
     ikonet entiteten faktisk har i HA, deretter våre egne gjetninger. */
  if (cfg?.icons?.[eid]) return cfg.icons[eid];
  if (cfg?.asLight?.has(eid)) return ICON.light;
  switch (d) {
    case "light": return ICON.light;
    case "switch": case "input_boolean":
      if (dc === "outlet") return ICON.plug;
      return ICON.plug;
    case "cover": return ICON.cover;
    case "climate": return ICON.climate;
    case "fan": return ICON.fan;
    case "humidifier": return ICON.humidifier;
    case "vacuum": return ICON.vacuum;
    case "lock": return ICON.lock;
    case "siren": return ICON.siren;
    case "script": return ICON.script;
    case "scene": return ICON.scene;
    case "media_player":
      if (dc === "tv") return ICON.tv;
      if (dc === "receiver") return "mdi:audio-video";
      return ICON.media;
    case "binary_sensor": return BINARY_ICON[dc] || "mdi:checkbox-blank-circle-outline";
    case "sensor":
      return SENSOR_ICON[dc] || (st?.attributes?.unit_of_measurement ? "mdi:gauge" : "mdi:information-outline");
    case "button": case "input_button": return "mdi:gesture-tap-button";
    case "number": case "input_number": return "mdi:tune-variant";
    case "select": case "input_select": return "mdi:form-dropdown";
    case "text": case "input_text": return "mdi:form-textbox";
    case "person": return ICON.person;
    case "device_tracker": return "mdi:crosshairs-gps";
    case "camera": return ICON.camera;
    case "weather": return "mdi:weather-partly-cloudy";
    case "calendar": return ICON.calendar;
    case "todo": return ICON.todo;
    case "update": return "mdi:package-up";
    case "automation": return "mdi:robot-outline";
    case "sun": return "mdi:white-balance-sunny";
    case "water_heater": return "mdi:water-boiler";
    case "lawn_mower": return "mdi:robot-mower-outline";
    case "valve": return "mdi:pipe-valve";
    case "event": return "mdi:gesture-double-tap";
    default: return "mdi:help-circle-outline";
  }
}

/* --------------------------------------------------- weather iconography */

export const WEATHER_ICON = {
  "clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy",
  fog: "mdi:weather-fog", hail: "mdi:weather-hail",
  lightning: "mdi:weather-lightning", "lightning-rainy": "mdi:weather-lightning-rainy",
  partlycloudy: "mdi:weather-partly-cloudy", pouring: "mdi:weather-pouring",
  rainy: "mdi:weather-rainy", snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny",
  windy: "mdi:weather-windy", "windy-variant": "mdi:weather-windy-variant",
  exceptional: "mdi:alert-circle-outline",
};

export const WEATHER_TEXT = {
  "clear-night": "Klarvær", cloudy: "Skyet", fog: "Tåke", hail: "Hagl",
  lightning: "Torden", "lightning-rainy": "Torden og regn",
  partlycloudy: "Delvis skyet", pouring: "Kraftig regn", rainy: "Regn",
  snowy: "Snø", "snowy-rainy": "Sludd", sunny: "Sol", windy: "Vind",
  "windy-variant": "Vind", exceptional: "Uvær",
};

/* ------------------------------------------------------------- palettes */

/* 14 kortfarger — mykt lysende flater for påslåtte kort */
export const CARD_COLORS = [
  { id: "cream",   name: "Krem",      hex: "#f2e8d0" },
  { id: "sand",    name: "Sand",      hex: "#ecdcbe" },
  { id: "linen",   name: "Lin",       hex: "#e7ddcb" },
  { id: "stone",   name: "Stein",     hex: "#ded8cd" },
  { id: "ice",     name: "Is",        hex: "#d8e4ec" },
  { id: "sky",     name: "Himmel",    hex: "#cfe0ef" },
  { id: "mist",    name: "Dis",       hex: "#dcdfe8" },
  { id: "lilac",   name: "Lilla",     hex: "#e0daee" },
  { id: "rose",    name: "Rose",      hex: "#f0dade" },
  { id: "peach",   name: "Fersken",   hex: "#f6ddcb" },
  { id: "mint",    name: "Mynte",     hex: "#d6e8dc" },
  { id: "sage",    name: "Salvie",    hex: "#dde3d3" },
  { id: "pearl",   name: "Perle",     hex: "#f0f0ee" },
  { id: "slate",   name: "Skifer",    hex: "#cdd4da" },
];

/* 12 aksentfarger — ikonbrikker, prikker, slidere */
export const ACCENT_COLORS = [
  { id: "amber",   name: "Rav",       hex: "#f5b731" },
  { id: "orange",  name: "Oransje",   hex: "#f59021" },
  { id: "tangerine", name: "Mandarin", hex: "#f2742c" },
  { id: "coral",   name: "Korall",    hex: "#f1604b" },
  { id: "rose",    name: "Rose",      hex: "#ee5f84" },
  { id: "pink",    name: "Rosa",      hex: "#e85fc0" },
  { id: "violet",  name: "Fiolett",   hex: "#9a6ef0" },
  { id: "indigo",  name: "Indigo",    hex: "#5a7cf0" },
  { id: "azure",   name: "Asur",      hex: "#2fa8f0" },
  { id: "teal",    name: "Turkis",    hex: "#1fc0ae" },
  { id: "green",   name: "Grønn",     hex: "#3fbf76" },
  { id: "lime",    name: "Lime",      hex: "#9ad42c" },
];

/* Bakgrunner. Hver har en "kald" (alt av) og "varm" (mye på) variant som
   krysstones etter hvor mye lys som er på hjemme. */
export const BACKGROUNDS = [
  {
    id: "plomme", name: "Plomme",
    off: ["#3c1f36", "#271428", "#140b14"],
    on:  ["#6b3357", "#3d1d33", "#190e17"],
  },
  {
    id: "natt", name: "Natt",
    off: ["#1b2742", "#111a2e", "#070b14"],
    on:  ["#2b4573", "#17243f", "#080d18"],
  },
  {
    id: "skog", name: "Skog",
    off: ["#15332e", "#0d2220", "#060f0e"],
    on:  ["#1f5348", "#123330", "#071513"],
  },
  {
    id: "soloppgang", name: "Soloppgang",
    off: ["#3a2032", "#271726", "#110a12"],
    on:  ["#8a4436", "#4a2230", "#1a0d14"],
  },
  {
    id: "grafitt", name: "Grafitt",
    off: ["#2a2a2e", "#1c1c20", "#0d0d10"],
    on:  ["#3e3e45", "#26262b", "#101013"],
  },
  {
    id: "kobber", name: "Kobber",
    off: ["#3a2a22", "#241a16", "#100b09"],
    on:  ["#6d4328", "#3b2419", "#16100b"],
  },
  /* --- lyse temaer ---------------------------------------------------
     `light: true` snur tekst- og flatefargene (.hd.light i styles.js).
     Uten den klassen blir hvit tekst på lys bakgrunn uleselig. */
  {
    id: "dagslys", name: "Dagslys", light: true,
    off: ["#ffffff", "#f3f1ec", "#e6e2da"],
    on:  ["#fffdf7", "#f8f2e4", "#ece3cf"],
  },
  {
    id: "lin", name: "Lin", light: true,
    off: ["#faf6ef", "#efe8dc", "#ded4c4"],
    on:  ["#fdf8ec", "#f5ebd8", "#e7d9bf"],
  },
  {
    id: "tare", name: "Tåke", light: true,
    off: ["#f4f6f8", "#e8ecf1", "#d7dde5"],
    on:  ["#f8fafc", "#edf1f6", "#dde4ec"],
  },
  {
    id: "fersken", name: "Fersken", light: true,
    off: ["#fdf2ec", "#f6e5dc", "#e9d2c5"],
    on:  ["#fff4ea", "#fbe6d4", "#f0d5bc"],
  },
];

/** Er dette et lyst tema? Styrer `.hd.light`. */
export function isLightBg(bgId) {
  return !!(BACKGROUNDS.find((x) => x.id === bgId) || {}).light;
}

export function bgCss(bgId, warmth) {
  const b = BACKGROUNDS.find((x) => x.id === bgId) || BACKGROUNDS[0];
  const t = clamp(warmth, 0, 1);
  const mix = (a, c) => {
    const p = (x) => [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)];
    const A = p(a), C = p(c);
    const r = A.map((v, i) => Math.round(v + (C[i] - v) * t));
    return "#" + r.map((v) => v.toString(16).padStart(2, "0")).join("");
  };
  const c0 = mix(b.off[0], b.on[0]);
  const c1 = mix(b.off[1], b.on[1]);
  const c2 = mix(b.off[2], b.on[2]);
  return (
    `radial-gradient(128% 96% at 26% 8%, ${c0} 0%, ${c1} 44%, ${c2} 100%),` +
    `radial-gradient(70% 60% at 88% 96%, ${c0}55 0%, ${c2}00 70%)`
  );
}

/** Én flat farge som matcher bunnen av gradienten.
 *  Brukes på vertselementet, der en gradient ikke kan strekkes riktig. */
export function bgBase(bgId, warmth) {
  const b = BACKGROUNDS.find((x) => x.id === bgId) || BACKGROUNDS[0];
  const t = clamp(warmth || 0, 0, 1);
  const p = (x) => [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)];
  const A = p(b.off[2]), C = p(b.on[2]);
  return "#" + A.map((v, i) => Math.round(v + (C[i] - v) * t))
    .map((v) => v.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------- settings */

export const DEFAULTS = {
  layout: "sidebar",         // grid | sidebar | list | focus   (enhetsspesifikk)
  card: "cream",
  accent: "amber",
  background: "plomme",
  bgAuto: true,
  clock24: true,
  showSeconds: false,
  /* Skjermsparer. SEKUNDER, ikke minutter - den gamle nøkkelen `screensaver`
     holdt minutter og kunne derfor ikke uttrykke «etter 30 sekunder».
     Delt mellom skjermene, slik at man setter den ett sted. */
  saverSec: 300,             // 0 = av
  saverWeather: true,
  saverStatus: true,
  saverMedia: true,
  saverAgenda: true,
  hideSidebar: false,
  hideHeader: false,
  hiContrast: false,         // tettere kortflater og sterkere tekst
  showWeather: true,
  showPeople: true,
  showAgenda: true,
  scenesOnTop: true,
  dockPages: [],             // egne sider
  dockHidden: [],            // sider slått av i menylinja
  order: {},                 // { "home": [ids], "room:<id>": [ids], ... }
  hidden: {},                // { "home": [ids], ... }
  big: {},                   // { "<scope>": { "<id>": true } }
  seps: {},                  // { "sep:<id>": "Gruppenavn" }
  cards: {},                 // { "<scope>": { "<id>": {size,info,tap,...} } }
  calendars: null,           // null = alle
  todoList: null,
};

/* ------------------------------------------------- kortinnstillinger */

/** Størrelser et kort kan ha. `cls` er rutenettklassene i styles.js. */
export const CARD_SIZES = [
  { id: "1x1", label: "Normal", cls: "", icon: "mdi:square-outline" },
  { id: "2x1", label: "Bred", cls: "w2", icon: "mdi:rectangle-outline" },
  { id: "1x2", label: "Høy", cls: "h2", icon: "mdi:rectangle-outline" },
  { id: "2x2", label: "Stor", cls: "w2 h2", icon: "mdi:square-rounded-outline" },
];

/** Hva den lille teksten under navnet skal vise. */
export const INFO_MODES = [
  { id: "auto", label: "Automatisk" },
  { id: "state", label: "Tilstand" },
  { id: "temperature", label: "Temperatur" },
  { id: "humidity", label: "Luftfuktighet" },
  { id: "power", label: "Effekt nå" },
  { id: "energy", label: "Energi i dag" },
  { id: "battery", label: "Batteri" },
  { id: "changed", label: "Sist endret" },
  { id: "area", label: "Rom" },
  { id: "none", label: "Ingenting" },
];

/** Handlinger et kort kan utføre. */
export const CARD_ACTIONS = [
  { id: "default", label: "Standard" },
  { id: "toggle", label: "Slå av/på" },
  { id: "detail", label: "Åpne detaljpanelet" },
  { id: "more-info", label: "Åpne HAs infovindu" },
  { id: "run", label: "Kjør (scene/skript)" },
  { id: "navigate", label: "Gå til en side" },
  { id: "service", label: "Kall en tjeneste" },
  { id: "none", label: "Ingenting" },
];

export const DEFAULT_CARD = {
  size: "1x1", info: "auto", tap: "default", hold: "default",
  dbl: "none", icon: null, name: null, color: null,
  navigate: null, service: null, service_data: null, confirm: false,
};

/* Flere Deckify-dashbord side om side.
   Oppsettet for hvert dashbord ligger på TJENERSIDEN, i integrasjonens egen
   lagring, og hentes over WebSocket. Dermed ser dashbordet likt ut for alle
   brukere og på alle skjermer, og integrasjonens innstillingssider og
   redigeringsmodus i dashbordet skriver til nøyaktig samme sted.
   Bare det som faktisk er enhetsspesifikt — layout, kioskbrytere og
   skjermsparer — ligger i nettleserens localStorage. */

export function instanceOf(cfgInstance) {
  if (cfgInstance) return String(cfgInstance);
  try {
    const seg = location.pathname.split("/").filter(Boolean)[0];
    return seg || "deckify";
  } catch (e) { return "deckify"; }
}

/** Nøkler som bare gjelder denne skjermen. */
const DEVICE_KEYS = ["layout", "hideSidebar", "hideHeader"];
/** Nøkler som ligger på rot i serveroppsettet, ikke under `ui`. */
const STRUCT_KEYS = ["order", "hidden", "big", "seps", "cards"];
/** Alt annet i DEFAULTS er utseende/valg som lagres under `ui`. */
const uiKeys = () => Object.keys(DEFAULTS)
  .filter((k) => !DEVICE_KEYS.includes(k) && !STRUCT_KEYS.includes(k));

function deepMerge(base, patch) {
  const out = { ...(base || {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    const cur = out[k];
    const mergeable = v && typeof v === "object" && !Array.isArray(v) &&
                      cur && typeof cur === "object" && !Array.isArray(cur);
    out[k] = mergeable ? deepMerge(cur, v) : v;
  }
  return out;
}

export class Store {
  constructor(hass, opts = {}) {
    this.hass = hass;
    this.instance = opts.instance || "deckify";
    this.entryId = opts.entryId || null;
    this.urlPath = opts.urlPath || null;
    const safe = String(this.instance).replace(/[^a-z0-9_-]/gi, "_").slice(0, 40);
    this.lsKey = "deckify.device:" + safe;
    /* Brukes bare når «eget oppsett per enhet» er slått på. */
    this.layoutKey = "deckify.layout:" + safe;
    this.perDevice = false;
    this.data = { ...DEFAULTS };
    this.server = null;        /* rått dashbordoppsett fra integrasjonen */
    this.writable = false;     /* false for ikke-admin og løse kort */
    this.ready = false;
    this.loadError = null;
    this._saveT = null;
  }

  static DEVICE_KEYS = DEVICE_KEYS;

  async load() {
    let res = null;
    this.loadError = null;
    try {
      res = await this.hass.callWS({
        type: "deckify/config",
        entry_id: this.entryId || null,
        url_path: this.entryId ? null : this.urlPath,
      });
    } catch (e) {
      /* Integrasjonen er ikke installert, eller kortet ligger i et vanlig
         Lovelace-dashbord uten egen entry. Da kjører vi på standardverdier
         og lagrer bare enhetsvalgene lokalt. */
      this.loadError = String(e?.message || e);
      console.warn("[Deckify] fikk ikke oppsettet fra integrasjonen:", e);
    }
    /* En forbigående WebSocket-feil skal ikke slette et oppsett som allerede
       er lastet. Behold det gamle og la neste vellykkede henting oppdatere. */
    if (this.loadError && this.server) return this.data;
    const srv = (res && res.config) || null;
    this.server = srv;
    if (res && res.entry_id) this.entryId = res.entry_id;
    this.writable = !!(res && res.writable && res.entry_id);
    this.ready = !!srv;

    let dev = {};
    try { dev = JSON.parse(localStorage.getItem(this.lsKey) || "{}"); } catch (e) { dev = {}; }

    const merged = { ...DEFAULTS };
    if (srv) {
      Object.assign(merged, srv.ui || {});
      for (const k of STRUCT_KEYS) if (srv[k]) merged[k] = srv[k];
    }

    /* «Eget oppsett per enhet»: det delte oppsettet er utgangspunktet, men
       denne skjermens egen kopi overstyrer det — og skrives aldri tilbake
       til tjeneren. Skrur man innstillingen av igjen, blir den lokale kopien
       bare liggende ubrukt, og alle enheter er like igjen. */
    this.perDevice = !!(srv && srv.per_device);
    if (this.perDevice) {
      let local = {};
      try { local = JSON.parse(localStorage.getItem(this.layoutKey) || "{}"); }
      catch (e) { local = {}; }
      for (const k of [...STRUCT_KEYS, ...uiKeys()])
        if (local[k] !== undefined) merged[k] = local[k];
    }

    for (const k of DEVICE_KEYS) if (dev[k] !== undefined) merged[k] = dev[k];
    this.data = merged;
    return this.data;
  }

  get(k) { return this.data[k]; }

  set(k, v) {
    this.data[k] = v;
    this.queueSave();
  }

  patch(obj) {
    Object.assign(this.data, obj);
    this.queueSave();
  }

  queueSave() {
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => this.save(), 400);
  }

  /** Skriv ventende endringer nå, f.eks. når elementet kobles fra. */
  async flush() {
    clearTimeout(this._saveT);
    this._saveT = null;
    await this.save();
  }

  async save() {
    const dev = {};
    for (const k of DEVICE_KEYS) dev[k] = this.data[k];
    try { localStorage.setItem(this.lsKey, JSON.stringify(dev)); } catch (e) {}

    if (this.perDevice) {
      const loc = {};
      for (const k of [...STRUCT_KEYS, ...uiKeys()]) loc[k] = this.data[k];
      try { localStorage.setItem(this.layoutKey, JSON.stringify(loc)); } catch (e) {}
      return;                      /* ingenting skrives til tjeneren */
    }

    if (!this.writable || !this.entryId) return;
    const ui = {};
    for (const k of uiKeys()) ui[k] = this.data[k];
    const patch = { ui };
    for (const k of STRUCT_KEYS) patch[k] = this.data[k];
    try {
      await this.hass.callWS({
        type: "deckify/config/patch", entry_id: this.entryId, patch,
      });
    } catch (e) { console.warn("[Deckify] kunne ikke lagre oppsettet:", e); }
  }

  /** Skriv rett i dashbordoppsettet: rom, filtre, sensorer, omdøpinger.
      Brukes av innstillingspanelet i dashbordet, og speiler det man ellers
      gjør i integrasjonens innstillinger. */
  async patchServer(patch) {
    this.server = deepMerge(this.server || {}, patch);
    if (!this.writable || !this.entryId) return false;
    try {
      const r = await this.hass.callWS({
        type: "deckify/config/patch", entry_id: this.entryId, patch,
      });
      if (r && r.config) this.server = r.config;
      return true;
    } catch (e) {
      console.warn("[Deckify] kunne ikke lagre dashbordoppsettet:", e);
      return false;
    }
  }

  /** Glem denne skjermens eget oppsett og følg det delte igjen. */
  clearLocalLayout() {
    try { localStorage.removeItem(this.layoutKey); } catch (e) {}
  }

  /** Nullstill bare layouten. Rom, sensorer, sider og utseende beholdes. */
  async resetLayout() {
    this.clearLocalLayout();
    if (this.perDevice) {
      this.data.order = {};
      this.data.hidden = {};
      this.data.big = {};
      this.data.seps = {};
      this.data.cards = {};
      await this.save();
      return true;
    }
    if (!this.writable || !this.entryId) return false;
    try {
      const r = await this.hass.callWS({
        type: "deckify/config/reset", entry_id: this.entryId, scope: "layout",
      });
      if (r && r.config) this.server = r.config;
      return true;
    } catch (e) {
      console.warn("[Deckify] kunne ikke nullstille layouten:", e);
      return false;
    }
  }

  async resetAll() {
    this.clearLocalLayout();
    /* Med eget oppsett per skjerm er serveroppsettet en felles mal. Da
       nullstiller vi bare denne skjermens lokale kopi, ikke alle andres. */
    if (this.perDevice) {
      this.data = { ...DEFAULTS };
      await this.save();
      return true;
    }
    if (!this.writable || !this.entryId) return false;
    try {
      const r = await this.hass.callWS({
        type: "deckify/config/reset", entry_id: this.entryId, scope: "all",
      });
      if (r && r.config) this.server = r.config;
      return true;
    } catch (e) {
      console.warn("[Deckify] kunne ikke nullstille dashbordet:", e);
      return false;
    }
  }

  /* --- rekkefølge / skjulte / størrelse, per "scope" --- */
  orderFor(scope, ids) {
    const saved = this.data.order[scope] || [];
    const out = [];
    for (const id of saved) if (ids.includes(id)) out.push(id);
    for (const id of ids) if (!out.includes(id)) out.push(id);
    return out;
  }
  setOrder(scope, ids) { this.data.order = { ...this.data.order, [scope]: ids }; this.queueSave(); }

  isHidden(scope, id) { return (this.data.hidden[scope] || []).includes(id); }
  toggleHidden(scope, id) {
    const cur = new Set(this.data.hidden[scope] || []);
    cur.has(id) ? cur.delete(id) : cur.add(id);
    this.data.hidden = { ...this.data.hidden, [scope]: [...cur] };
    this.queueSave();
  }
  hiddenCount(scope) { return (this.data.hidden[scope] || []).length; }
  unhideAll(scope) { this.data.hidden = { ...this.data.hidden, [scope]: [] }; this.queueSave(); }

  /* --- kortinnstillinger ------------------------------------------------ */

  /** Rå overstyringer for ett kort (bare det brukeren faktisk har endret). */
  rawCardCfg(scope, id) { return ((this.data.cards || {})[scope] || {})[id] || {}; }

  /** Ferdig utfylte kortinnstillinger, med standardverdier. */
  cardCfg(scope, id) { return { ...DEFAULT_CARD, ...this.rawCardCfg(scope, id) }; }

  setCardCfg(scope, id, patch) {
    const all = { ...(this.data.cards || {}) };
    const sc = { ...(all[scope] || {}) };
    const cur = { ...(sc[id] || {}), ...patch };
    /* Rydd bort alt som er likt standarden, ellers vokser lagringen med
       verdier som ikke betyr noe. */
    for (const k of Object.keys(cur)) {
      const v = cur[k];
      if (v == null || v === "" || v === DEFAULT_CARD[k]) delete cur[k];
    }
    if (Object.keys(cur).length) sc[id] = cur; else delete sc[id];
    all[scope] = sc;
    this.data.cards = all;
    this.queueSave();
  }

  cardSize(scope, id) {
    const c = this.rawCardCfg(scope, id);
    if (c.size) return c.size;
    /* Eldre oppsett lagret bare et av/på-flagg for «stort kort». */
    return (this.data.big[scope] || {})[id] ? "2x2" : "1x1";
  }

  setCardSize(scope, id, size) {
    this.setCardCfg(scope, id, { size });
    const big = { ...(this.data.big[scope] || {}) };
    if (size === "2x2") big[id] = true; else delete big[id];
    this.data.big = { ...this.data.big, [scope]: big };
    this.queueSave();
  }

  isBig(scope, id) { return this.cardSize(scope, id) === "2x2"; }

  /** Hurtigknappen i redigeringsmodus: normal <-> stor. */
  toggleBig(scope, id) {
    this.setCardSize(scope, id, this.isBig(scope, id) ? "1x1" : "2x2");
  }
}

/* ------------------------------------------------------- scenenavn */

/* Hue skriver romnavnet inn i både entitets-id og friendly_name, og HA legger
   på områdenavnet i tillegg. Resultatet er «Stue Stue Slapp av». Her kuttes
   gjentakelsen bort, slik at scenen heter «Slapp av» i rommet sitt og
   «Stue · Slapp av» i den globale stripa. */
export function sceneName(hass, cfg, eid, areaName, { withArea = false } = {}) {
  if (cfg?.rename?.[eid]) return cfg.rename[eid];
  const st = hass.states[eid];
  let name = st?.attributes?.friendly_name || hass.entities?.[eid]?.name || eid;
  const area = areaName || hass.areas?.[areaIdOf(hass, eid)]?.name || null;

  if (cfg?.stripAreaPrefix !== false) {
    /* 1. Gjentatt prefiks: «Maries Soverom Maries Soverom Dimmet».
          Finn den lengste innledningen som står to ganger etter hverandre. */
    const w = name.split(/\s+/);
    for (let k = Math.floor(w.length / 2); k >= 1; k--) {
      const a = w.slice(0, k).join(" ").toLowerCase();
      const b = w.slice(k, 2 * k).join(" ").toLowerCase();
      if (a === b) { name = w.slice(k).join(" "); break; }
    }
    /* 2. Rommets eget navn foran, med ordgrense. Ordgrensen er viktig:
          en Hue-sone som heter «Stue/Kjøkken» skal IKKE kuttes til
          «Kjøkken Dimmet» bare fordi rommet heter Stue. */
    if (area) {
      const esc = area.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const t = name.replace(new RegExp("^" + esc + "\\s+", "i"), "").trim();
      if (t) name = t;
    }
  }
  name = String(name).trim() || eid;
  if (withArea && area) return area + " \u00b7 " + name;
  return name;
}

/* ------------------------------------------------- autooppdagelse */

const AUTO_RE = {
  price: /(nord_?pool|strompris|electricity_price|energi_?pris|spot_?price).*(current|now|na|pris)?/i,
  priceNext: /(nord_?pool|strompris|electricity_price).*(next)/i,
  priceLow: /(nord_?pool|strompris|electricity_price).*(low)/i,
  priceHigh: /(nord_?pool|strompris|electricity_price).*(high)/i,
  soil: /(soil_moisture|jordfukt|moisture)$/i,
  dry: /(_dry|_torr)$/i,
  remaining: /(time_remaining|remaining_time|gjenstaende|tid_igjen)$/i,
  progress: /(progress|fremdrift)$/i,
  running: /(running|in_use|kjorer)$/i,
  machineState: /(_state|_status)$/i,
};

function statesWith(hass, domain, pred) {
  const out = [];
  for (const eid of Object.keys(hass.states)) {
    if (domainOf(eid) !== domain) continue;
    const st = hass.states[eid];
    const reg = hass.entities?.[eid];
    if (reg?.hidden || reg?.disabled_by) continue;
    if (pred(st, eid, reg)) out.push(eid);
  }
  return out;
}

const dcOf = (st) => st?.attributes?.device_class || null;
const unitOf = (st) => st?.attributes?.unit_of_measurement || "";

/**
 * Finner sensorene dashbordet trenger, uten at noe er hardkodet.
 * Alt brukeren har satt manuelt (cfg-sensors) vinner — dette er bare
 * utgangspunktet, og nye enheter blir plukket opp av seg selv.
 */
export function autoDetect(hass) {
  const out = {};

  const weather = statesWith(hass, "weather", () => true);
  out.weather = weather[0] || null;

  out.climate = statesWith(hass, "climate", (st) => !isDead(st))[0] || null;

  /* utetemperatur: sensor i et område som ser ut som utendørs, ellers navn */
  const temps = statesWith(hass, "sensor", (st) => dcOf(st) === "temperature" && !isDead(st));
  const outdoorish = (eid) => {
    const an = hass.areas?.[areaIdOf(hass, eid)]?.name || "";
    const nm = (hass.states[eid]?.attributes?.friendly_name || eid);
    return /ute|utendors|outdoor|hage|balkong|garden|terrasse/i.test(an + " " + nm);
  };
  /* Poengsett i stedet for `find`: den første treffende sensoren i
     iterasjonsrekkefølgen kan være en strømmåler som tilfeldigvis står i
     området «Ute». Et navn som faktisk sier «ute» skal vinne. */
  const outScore = (eid) => {
    const an = hass.areas?.[areaIdOf(hass, eid)]?.name || "";
    const nm = (hass.states[eid]?.attributes?.friendly_name || eid);
    let s = 0;
    if (/\bute\b|utendors|outdoor|uteluft/i.test(nm)) s += 10;
    if (/hage|balkong|garden|terrasse/i.test(nm)) s += 6;
    if (/ute|utendors|outdoor|hage|balkong|garden|terrasse/i.test(an)) s += 4;
    if (/str[øo]m|power|ovn|vask|oppvask|plante|r[øo]yk/i.test(nm)) s -= 8;
    return s;
  };
  const bestOutdoor = (list) => {
    const scored = list.map((e) => [e, outScore(e)]).filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1]);
    return scored.length ? scored[0][0] : null;
  };
  out.outdoor_temp = bestOutdoor(temps);
  const hums = statesWith(hass, "sensor", (st) => dcOf(st) === "humidity" && !isDead(st));
  out.outdoor_hum = bestOutdoor(hums);

  /* totaleffekt: den W-sensoren med flest «barn» under seg, ellers den med
     høyest verdi — et hovedmålerpunkt ligger alltid over apparatene */
  const powers = statesWith(hass, "sensor",
    (st) => dcOf(st) === "power" && /^k?W$/i.test(unitOf(st)) && !isDead(st));
  const score = (eid) => {
    const nm = (hass.states[eid]?.attributes?.friendly_name || eid).toLowerCase();
    let s = Number(hass.states[eid]?.state) || 0;
    if (/ovn|vask|oppvask|lampe|lys|tv|pc|kontakt|plug|plante|avfukter/.test(nm)) s -= 1e7;
    if (/str[øo]m|hovedmaler|main|hus|house|hjem|home|forbruk|consumption|grid/.test(nm)) s += 1e6;
    if (/total/.test(nm)) s += 1e5;
    return s;
  };
  out.power = powers.sort((a, b) => score(b) - score(a))[0] || null;
  /* Energimåler: en husmåler slår et enkelt apparat. */
  const energies = statesWith(hass, "sensor", (st) => dcOf(st) === "energy" && !isDead(st));
  const eScore = (eid) => {
    const nm = (hass.states[eid]?.attributes?.friendly_name || eid).toLowerCase();
    let s = Number(hass.states[eid]?.state) || 0;
    /* Apparatstraffen må dominere «total»-bonusen: «Vaskemaskin Total
       energi» inneholder begge, og er likevel ikke husmåleren. */
    if (/vask|oppvask|ovn|lampe|lys|tv|pc|kontakt|plug|avfukter|plante/.test(nm)) s -= 1e7;
    if (/str[øo]m|hovedmaler|main|hus|house|hjem|home|forbruk|consumption|import|grid/.test(nm)) s += 1e6;
    if (/total/.test(nm)) s += 1e5;
    return s;
  };
  out.energy = energies.sort((a, b) => eScore(b) - eScore(a))[0] || null;
  out.power_devices = powers.filter((e) => e !== out.power);

  /* strømpris */
  const monetary = statesWith(hass, "sensor",
    (st) => dcOf(st) === "monetary" || /kWh/i.test(unitOf(st)) && /\//.test(unitOf(st)));
  const priceLike = monetary.length ? monetary
    : statesWith(hass, "sensor", (st, eid) => AUTO_RE.price.test(eid));
  const pickPrice = (re) => priceLike.find((e) => re.test(e)) || null;
  out.price_next = pickPrice(AUTO_RE.priceNext);
  out.price_low = pickPrice(AUTO_RE.priceLow);
  out.price_high = pickPrice(AUTO_RE.priceHigh);
  out.price = priceLike.find(
    (e) => ![out.price_next, out.price_low, out.price_high].includes(e)) || null;

  out.todo = statesWith(hass, "todo", () => true)[0] || null;
  out.calendars = statesWith(hass, "calendar", () => true);
  out.alarm_flag = null;

  return out;
}

/** Planter: alle jordfuktsensorer, gruppert per enhet. */
export function autoPlants(hass, cfg) {
  const byDev = new Map();
  for (const eid of statesWith(hass, "sensor", (st, e) => AUTO_RE.soil.test(e) ||
      (dcOf(st) === "moisture" && unitOf(st) === "%"))) {
    const did = hass.entities?.[eid]?.device_id || eid;
    if (!byDev.has(did)) byDev.set(did, { moisture: eid });
  }
  const plants = [];
  for (const [did, rec] of byDev) {
    const sibs = Object.keys(hass.entities || {}).filter(
      (e) => hass.entities[e].device_id === did);
    const temp = sibs.find((e) => dcOf(hass.states[e]) === "temperature");
    const dry = sibs.find((e) => domainOf(e) === "binary_sensor" && AUTO_RE.dry.test(e));
    plants.push({
      name: deviceNameOf(hass, cfg, rec.moisture),
      moisture: rec.moisture, temp: temp || null, dry: dry || null, threshold: 20,
    });
  }
  plants.sort((a, b) => String(a.name).localeCompare(String(b.name), "nb"));
  return plants;
}

/** Maskiner: alt som har både «tid igjen» og «fremdrift» på samme enhet. */
export function autoMachines(hass, cfg) {
  const devs = new Map();
  for (const eid of Object.keys(hass.states)) {
    const did = hass.entities?.[eid]?.device_id;
    if (!did) continue;
    if (!devs.has(did)) devs.set(did, []);
    devs.get(did).push(eid);
  }
  const out = [];
  for (const [did, eids] of devs) {
    const remaining = eids.find((e) => AUTO_RE.remaining.test(e));
    if (!remaining) continue;
    const progress = eids.find((e) => AUTO_RE.progress.test(e) && domainOf(e) === "sensor");
    const running = eids.find((e) => domainOf(e) === "binary_sensor" && AUTO_RE.running.test(e));
    const state = eids.find((e) => domainOf(e) === "sensor" && AUTO_RE.machineState.test(e));
    const power = eids.find((e) => dcOf(hass.states[e]) === "power");
    const name = hass.devices?.[did]?.name_by_user || hass.devices?.[did]?.name || "Maskin";
    out.push({
      name,
      icon: /oppvask|dish/i.test(name) ? "mdi:dishwasher"
        : /t[øo]rk|dryer/i.test(name) ? "mdi:tumble-dryer" : "mdi:washing-machine",
      state: state || null, running: running || null, progress: progress || null,
      remaining, phase: null, power: power || null,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name, "nb"));
  return out;
}

/* --------------------------------------------------- oppsettsoppløsning */

/**
 * Slår sammen de tre kildene til ett ferdig `cfg`-objekt:
 *
 *   1. serveroppsettet fra integrasjonen (det brukeren redigerer),
 *   2. kortets YAML-config (for et kort lagt inn i et vanlig dashbord),
 *   3. autooppdagelse (alt som fortsatt står tomt).
 *
 * Poenget er at NULL sensorer, rom eller scener er hardkodet: står et felt
 * tomt, finner vi det ut fra HAs eget register hver gang kortet starter.
 * Døper du om Hue-scenene dine, følger dashbordet etter av seg selv.
 */
export function resolveConfig(hass, server, yaml = {}) {
  const srv = server || {};
  const y = yaml || {};
  const pick = (a, b, c) => (a !== undefined && a !== null && !(Array.isArray(a) && !a.length) ? a
    : (b !== undefined && b !== null && !(Array.isArray(b) && !b.length) ? b : c));
  /* Kalendere har en egen sammenslåing: en tom liste betyr «ingen», ikke
     «ikke satt». Den generelle pick() ville oversett [] og valgt alle. */
  const pickList = (a, b, c) => (a !== undefined && a !== null ? a
    : (b !== undefined && b !== null ? b : c));

  const sensors = { ...(srv.sensors || {}) };
  const auto = autoDetect(hass);
  const sens = (key, yamlKey) =>
    sensors[key] || y[yamlKey || key] || auto[key] || null;

  const scenes = srv.scenes || {};
  const areas = pick(srv.areas, y.areas, []);
  const exclude = pick(srv.exclude, y.exclude, []);
  const patterns = pick(srv.exclude_patterns, y.exclude_patterns, []);
  let excludeRe = null;
  let excludeReInvalid = false;
  if (patterns.length) {
    try {
      excludeRe = new RegExp(patterns.join("|"), "i");
    } catch (e) {
      excludeReInvalid = true;
      console.warn("[Deckify] ugyldig exclude-mønster ble ignorert:", e);
    }
  }

  const cfg = {
    entryId: srv.entry_id || null,
    title: srv.title || y.title || "Deckify",
    areas,
    exclude: new Set(exclude),
    excludeRe,
    excludeReInvalid,
    assign: { ...(y.assign || {}), ...(srv.assign || {}) },
    rename: { ...(y.rename || {}), ...(srv.rename || {}) },
    icons: { ...(y.icons || {}), ...(srv.icons || {}) },
    asLight: new Set(pick(srv.as_light, y.as_light, [])),
    excludePlatforms: new Set(pick(srv.exclude_platforms, y.exclude_platforms, [])),
    confirmPrefix: pick(srv.confirm, y.confirm, ["siren.", "lock."]),
    showUnavailable: srv.show_unavailable ?? y.show_unavailable ?? false,

    weatherEntity: sens("weather"),
    climateEntity: sens("climate"),
    outdoorTemp: sens("outdoor_temp"),
    outdoorHum: sens("outdoor_hum"),
    powerSensor: sens("power"),
    energySensor: sens("energy"),
    priceSensor: sens("price"),
    priceNext: sens("price_next"),
    priceLow: sens("price_low"),
    priceHigh: sens("price_high"),
    todoEntity: sens("todo"),
    alarmFlag: sens("alarm_flag"),
    calendars: pickList(srv.calendars, y.calendars, auto.calendars || []),
    powerDevices: pick(srv.power_devices, y.power_devices, auto.power_devices || []),

    scenesPinned: scenes.pinned || y.featured_scenes || [],
    scenesAuto: scenes.auto !== false,
    maxScenes: scenes.max ?? y.max_scenes ?? 10,
    stripAreaPrefix: scenes.strip_area_prefix !== false,

    securityActions: pick(srv.security_actions, y.security_actions, []),
    deeplinks: pick(srv.deeplinks, y.deeplinks, []),
    batteryWarn: srv.battery_warn ?? y.battery_warn ?? 25,
    pages: pick(srv.pages, y.pages, ["start", "home", "rooms", "media", "house", "energy", "security", "attention"]),
  };

  /* Planter og maskiner: oppdages med mindre brukeren har satt en egen liste. */
  cfg.plants = (srv.plants && srv.plants.length) ? srv.plants
    : (y.plants && y.plants.length) ? y.plants : autoPlants(hass, cfg);
  cfg.machines = (srv.machines && srv.machines.length) ? srv.machines
    : (y.machines && y.machines.length) ? y.machines : autoMachines(hass, cfg);

  /* Kompatibilitet: eldre kode leste `featured`. */
  cfg.featured = cfg.scenesPinned;

  /* Skal Deckify fylle dashbordet selv, eller starte tomt?
     Et nytt dashbord starter TOMT: ingenting vises før brukeren har lagt det
     til. Skrur man på autofyll, legges alle rom, kort og nye enheter inn av
     seg selv (slik det var før). Velgeren viser alt som er oppdaget uansett. */
  cfg.autoFill = srv.auto_fill === true;
  /* Hvert enkelt nettbrett/telefon kan ha sitt eget oppsett. */
  cfg.perDevice = srv.per_device === true;
  return cfg;
}

/* ---------------------------------------------------------------- model */

const PRIMARY_DOMAINS = new Set(["vacuum", "camera", "media_player", "siren", "climate", "humidifier", "lawn_mower", "water_heater"]);
const CHILD_DOMAINS = new Set(["switch", "select", "number", "button", "text", "time", "fan", "light"]);
const CONTROL_DOMAINS = new Set(["light", "switch", "input_boolean", "cover", "climate", "fan", "humidifier", "media_player", "lock", "vacuum", "siren", "script"]);
const SENSOR_DC_TEMP = new Set(["temperature"]);
/* Domener brukeren får legge til som egne kort. */
export const ADDABLE_DOMAINS = new Set([
  "light", "switch", "input_boolean", "cover", "climate", "fan", "humidifier",
  "media_player", "lock", "vacuum", "siren", "script", "scene", "button",
  "input_button", "number", "input_number", "select", "input_select",
  "sensor", "binary_sensor", "camera", "person", "device_tracker", "weather",
  "automation", "water_heater", "lawn_mower", "valve", "todo", "calendar",
  "text", "input_text", "sun",
]);

/* Etiketter til domenefiltrene i enhetsvelgeren. */
export const DOMAIN_LABEL = {
  light: "Lys", switch: "Brytere", input_boolean: "Hjelpere", cover: "Gardiner",
  climate: "Klima", fan: "Vifter", humidifier: "Fukt", media_player: "Media",
  lock: "Låser", vacuum: "Støvsugere", siren: "Sirener", script: "Skript",
  scene: "Scener", button: "Knapper", input_button: "Knapper",
  number: "Tallverdier", input_number: "Tallverdier", select: "Valg",
  input_select: "Valg", sensor: "Sensorer", binary_sensor: "Av/på-sensorer",
  camera: "Kameraer", person: "Personer", device_tracker: "Sporing",
  weather: "Vær", automation: "Automasjoner", water_heater: "Varmtvann",
  lawn_mower: "Gressklipper", valve: "Ventiler", todo: "Lister",
  calendar: "Kalendere", text: "Tekst", input_text: "Tekst", sun: "Sol",
};

/**
 * Poengsetting for fritekstsøk. Brukes BÅDE av det globale søket og av
 * enhetsvelgeren — de skal oppføre seg likt, og en ren `includes()` gjorde
 * velgeren ubrukelig: «lys» traff «Analyse» før «Taklys», og skrivefeil eller
 * ord i feil rekkefølge ga null treff.
 *
 * Reglene, sterkeste først: eksakt navn, navnet begynner på søket, et ORD i
 * navnet begynner på søket, navnet inneholder søket, område, domenenavn,
 * entitets-id. Flere ord i søket må ALLE treffe et sted (AND), slik at
 * «stue lys» finner taklyset i stua.
 */
export function matchScore(q, name, area, eid, domain) {
  const query = (q || "").trim().toLowerCase();
  if (!query) return 0;
  const words = query.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    let sum = 0;
    for (const w of words) {
      const s = matchScore(w, name, area, eid, domain);
      if (!s) return 0;
      sum += s;
    }
    return Math.round(sum / words.length) + 60;
  }
  const n = (name || "").toLowerCase();
  const a = (area || "").toLowerCase();
  const id = (eid || "").toLowerCase();
  if (n === query) return 1000;
  if (n.startsWith(query)) return 900 - n.length;
  const w = n.split(/[\s·\-_/]+/);
  if (w.some((x) => x.startsWith(query))) return 800 - n.length;
  if (n.includes(query)) return 600 - n.length;
  if (a.startsWith(query)) return 500;
  if (a.includes(query)) return 400;
  if ((DOMAIN_LABEL[domain] || "").toLowerCase().startsWith(query)) return 350;
  if (id.includes(query)) return 200;
  return 0;
}

const SECURITY_DC = new Set(["door", "window", "opening", "garage_door", "smoke", "gas", "carbon_monoxide", "moisture", "motion", "occupancy", "presence"]);

export function areaIdOf(hass, eid) {
  const e = hass.entities?.[eid];
  if (!e) return null;
  if (e.area_id) return e.area_id;
  if (e.device_id) return hass.devices?.[e.device_id]?.area_id || null;
  return null;
}

/**
 * Bygger hele hjemmemodellen fra HAs register.
 * cfg: { areas:[ids i rekkefølge], exclude:Set, assign:{eid:areaId},
 *        rename:{eid:navn}, asLight:Set, excludePlatforms:Set, confirm:Set }
 */
export function buildModel(hass, cfg, store) {
  const showDead = !!cfg.showUnavailable;
  const areas = hass.areas || {};
  const ents = hass.entities || {};
  const devs = hass.devices || {};

  /* enheter med en "primær" entitet -> barn-entiteter skjules */
  const devPrimary = new Set();
  for (const eid of Object.keys(ents)) {
    const did = ents[eid].device_id;
    if (did && PRIMARY_DOMAINS.has(domainOf(eid))) devPrimary.add(did);
  }

  const keep = (eid) => {
    const reg = ents[eid];
    if (!reg) return false;
    if (reg.hidden) return false;
    if (reg.entity_category) return false;
    if (cfg.exclude.has(eid)) return false;
    if (cfg.excludeRe && cfg.excludeRe.test(eid)) return false;
    if (cfg.excludePlatforms.has(reg.platform)) return false;
    const d = domainOf(eid);
    if (d === "remote") return false;
    if (reg.device_id && devPrimary.has(reg.device_id) && CHILD_DOMAINS.has(d)) {
      if (!PRIMARY_DOMAINS.has(d)) return false;
    }
    return true;
  };

  /* samle per område */
  const rooms = [];
  const areaIds = cfg.areas.length ? cfg.areas : Object.keys(areas);
  const bucket = {};
  for (const aid of areaIds) bucket[aid] = { controls: [], sensors: [], scenes: [], cameras: [], security: [] };

  const assignOf = (eid) => cfg.assign[eid] || areaIdOf(hass, eid);

  /* Sikkerhet er et unntak fra «bare valgte rom»: en røykvarsler uten område,
     eller i et rom brukeren har valgt bort, skal fortsatt kunne varsle.
     Denne listen brukes av «Trenger tilsyn», sikkerhetssiden og
     skjermspareren. */
  const securityAll = [];
  for (const eid of Object.keys(hass.states)) {
    if (domainOf(eid) !== "binary_sensor") continue;
    const st = hass.states[eid];
    const dc = st.attributes?.device_class;
    if (!SECURITY_DC.has(dc)) continue;
    const reg = ents[eid];
    if (reg?.hidden || reg?.entity_category) continue;
    if (cfg.exclude.has(eid)) continue;
    if (cfg.excludeRe && cfg.excludeRe.test(eid)) continue;
    if (cfg.excludePlatforms.has(reg?.platform)) continue;
    const aid = assignOf(eid);
    securityAll.push({
      eid, dc,
      areaId: aid || null,
      area: areas[aid]?.name || null,
    });
  }

  for (const eid of Object.keys(hass.states)) {
    const aid = assignOf(eid);
    if (!aid || !bucket[aid]) continue;
    const d = domainOf(eid);
    const st = hass.states[eid];

    if (d === "scene") {
      if (!cfg.exclude.has(eid)) bucket[aid].scenes.push(eid);
      continue;
    }
    if (d === "camera") {
      if (keep(eid) && !isDead(st)) bucket[aid].cameras.push(eid);
      continue;
    }
    if (d === "binary_sensor") {
      const dc = st.attributes?.device_class;
      if (SECURITY_DC.has(dc) && !ents[eid]?.entity_category && !ents[eid]?.hidden &&
          !cfg.exclude.has(eid) && !(cfg.excludeRe && cfg.excludeRe.test(eid)) &&
          !cfg.excludePlatforms.has(ents[eid]?.platform) &&
          (!isDead(st) || showDead))
        bucket[aid].security.push(eid);
      continue;
    }
    if (d === "sensor") {
      if (!ents[eid]?.entity_category && !ents[eid]?.hidden) bucket[aid].sensors.push(eid);
      continue;
    }
    if (!CONTROL_DOMAINS.has(d)) continue;
    if (!keep(eid)) continue;
    if (isDead(st) && !showDead) continue;
    bucket[aid].controls.push(eid);
  }

  /* Hue rom-/sonegrupper: dropp dem hvis rommet har egne, tilgjengelige lys */
  for (const aid of areaIds) {
    const b = bucket[aid];
    const lights = b.controls.filter((e) => domainOf(e) === "light");
    const groups = lights.filter((e) => hass.states[e]?.attributes?.is_hue_group);
    const singles = lights.filter((e) => !hass.states[e]?.attributes?.is_hue_group && !isDead(hass.states[e]));
    if (groups.length && singles.length) {
      b.controls = b.controls.filter((e) => !groups.includes(e));
    }
  }

  /* Velger brukeren rom selv, vises de han valgte — også tomme. Står lista
     tom («alle rom»), hopper vi over områder uten noe å vise: ellers fylles
     dashbordet av tomme ruter som «Test», «Ute» og «Soverom TV». Nye rom med
     innhold dukker fortsatt opp av seg selv. */
  const autoAreas = !(Array.isArray(cfg.areas) && cfg.areas.length);

  for (const aid of areaIds) {
    const a = areas[aid];
    if (!a) continue;
    const b = bucket[aid];
    if (autoAreas && !b.controls.length && !b.scenes.length &&
        !b.cameras.length && !b.security.length) continue;
    const name = a.name;

    /* sorter kontroller: lys -> brytere -> gardiner -> klima -> media -> resten */
    const rank = (e) => {
      const d = domainOf(e);
      if (d === "light" || cfg.asLight.has(e)) return 0;
      if (d === "switch" || d === "input_boolean") return 1;
      if (d === "cover") return 2;
      if (d === "climate" || d === "humidifier" || d === "fan") return 3;
      if (d === "media_player") return 4;
      return 5;
    };
    b.controls.sort((x, y) => rank(x) - rank(y) || nameOf(hass, cfg, x).localeCompare(nameOf(hass, cfg, y), "nb"));
    b.scenes.sort((x, y) => nameOf(hass, cfg, x).localeCompare(nameOf(hass, cfg, y), "nb"));

    const temp = pickSensor(hass, b.sensors, "temperature");
    const hum = pickSensor(hass, b.sensors, "humidity");

    const lightIds = b.controls.filter((e) => domainOf(e) === "light" || cfg.asLight.has(e));
    const lightsOn = lightIds.filter((e) => hass.states[e]?.state === "on");

    rooms.push({
      id: aid, name,
      icon: a.icon || guessAreaIcon(name),
      controls: b.controls, scenes: b.scenes, sensors: b.sensors,
      cameras: b.cameras, security: b.security,
      temp, hum, lightIds, lightsOn: lightsOn.length,
    });
  }

  /* scener uten område */
  /* «Løs» scene = scene uten område i det hele tatt. En scene som hører til
     et ekte område skal IKKE bli løs bare fordi dette dashbordet er begrenset
     til noen få rom — da hørte Stue-scenene hjemme på soveromsdashbordet. */
  const looseScenes = [];
  const restricted = Array.isArray(cfg.areas) && cfg.areas.length > 0;
  for (const eid of Object.keys(hass.states)) {
    if (domainOf(eid) !== "scene") continue;
    if (cfg.exclude.has(eid)) continue;
    const aid = assignOf(eid);
    if (aid && bucket[aid]) continue;              /* vises i sitt eget rom */
    if (aid && restricted && areas[aid]) continue; /* tilhører et bortvalgt rom */
    looseScenes.push(eid);
  }

  const allLights = rooms.flatMap((r) => r.lightIds);
  const lightsOn = allLights.filter((e) => hass.states[e]?.state === "on");

  /* Alt brukeren kan legge til manuelt — mye bredere enn `controls`.
     Diagnose-/konfig-entiteter og skjulte er fortsatt ute.

     Listen sorteres med nameOf() og er derfor den dyreste delen av modellen.
     Den bygges først når enhetsvelgeren, søket eller tilsynssiden faktisk
     spør etter den. Hver render skal ikke betale for den. */
  const buildAddable = () => {
    const addable = [];
    for (const eid of Object.keys(hass.states)) {
      const reg = ents[eid];
      const dd = domainOf(eid);
      if (!ADDABLE_DOMAINS.has(dd)) continue;
      if (cfg.exclude.has(eid)) continue;
      if (cfg.excludeRe && cfg.excludeRe.test(eid)) continue;
      if (reg) {
        if (reg.hidden || reg.disabled_by) continue;
        if (reg.entity_category && !cfg.allowDiagnostic) continue;
        if (cfg.excludePlatforms.has(reg.platform)) continue;
      }
      const aid = assignOf(eid);
      addable.push({ eid, domain: dd, area: areas[aid]?.name || null, areaId: aid || null });
    }
    addable.sort((a, b) =>
      (a.area || "ÿ").localeCompare(b.area || "ÿ", "nb") ||
      a.domain.localeCompare(b.domain) ||
      nameOf(hass, cfg, a.eid).localeCompare(nameOf(hass, cfg, b.eid), "nb"));
    return addable;
  };
  let addableCache = null;

  const model = {
    rooms, looseScenes, securityAll,
    allLights, lightsOn,
    roomsWithLightOn: rooms.filter((r) => r.lightsOn > 0).length,
    warmth: allLights.length ? lightsOn.length / allLights.length : 0,
  };
  Object.defineProperty(model, "addable", {
    enumerable: true,
    configurable: true,
    get() {
      if (!addableCache) addableCache = buildAddable();
      return addableCache;
    },
  });
  return model;
}

export function pickSensor(hass, ids, deviceClass) {
  let best = null, bestScore = -1;
  for (const e of ids) {
    const st = hass.states[e];
    if (!st || st.attributes?.device_class !== deviceClass) continue;
    if (isDead(st)) continue;
    /* foretrekk "vegg"/"rom"-sensorer framfor plante-/apparatsensorer */
    const n = (st.attributes.friendly_name || e).toLowerCase();
    let score = 10;
    if (/plante|plant/.test(n)) score -= 6;
    if (/r[øo]ykvarsler|smoke|vaskemaskin|oppvask|ovn|str[øo]m/.test(n)) score -= 4;
    if (/vegg|rom|hylle|aqara|temperatur/.test(n)) score += 2;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  return best;
}

/** Navnet på den fysiske enheten entiteten hører til (uten entitetssuffiks). */
export function deviceNameOf(hass, cfg, eid) {
  if (cfg?.rename?.[eid]) return cfg.rename[eid];
  const reg = hass.entities?.[eid];
  const dev = reg?.device_id ? hass.devices?.[reg.device_id] : null;
  const dn = dev?.name_by_user || dev?.name;
  if (dn) return dn;
  return nameOf(hass, cfg, eid);
}

/** Entydig navn: «Vaskemaskin · Effekt» når entitetsnavnet alene er vagt. */
export function fullNameOf(hass, cfg, eid) {
  if (cfg?.rename?.[eid]) return cfg.rename[eid];
  const ent = nameOf(hass, cfg, eid);
  const dev = deviceNameOf(hass, cfg, eid);
  if (!dev || dev === ent) return ent;
  /* HA setter ofte friendly_name = "<enhet> <entitet>" allerede */
  if (ent.toLowerCase().startsWith(dev.toLowerCase())) return ent;
  return dev + " · " + ent;
}

export function nameOf(hass, cfg, eid) {
  if (cfg?.rename?.[eid]) return cfg.rename[eid];
  const reg = hass.entities?.[eid];
  const st = hass.states[eid];
  return (reg?.name) || st?.attributes?.friendly_name || eid;
}

/* ------------------------------------------------------- lys-hjelpere */

export function lightColor(st, accentHex) {
  if (!st || st.state !== "on") return accentHex;
  const rgb = st.attributes?.rgb_color;
  if (rgb) return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  const k = st.attributes?.color_temp_kelvin;
  if (k) return kelvinToRgb(k);
  return accentHex;
}

export function kelvinToRgb(k) {
  k = clamp(k, 1800, 6800) / 100;
  let r, g, b;
  if (k <= 66) { r = 255; g = 99.47 * Math.log(k) - 161.12; }
  else { r = 329.7 * Math.pow(k - 60, -0.1332); g = 288.12 * Math.pow(k - 60, -0.0755); }
  if (k >= 66) b = 255;
  else if (k <= 19) b = 0;
  else b = 138.52 * Math.log(k - 10) - 305.04;
  const c = (v) => clamp(Math.round(v), 0, 255);
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

export const LIGHT_SWATCHES = [
  "#ff8a3d", "#ffd9a6", "#fff3dc", "#cfe6ff", "#8fc4ff",
  "#ff4d4d", "#ff6fae", "#c77dff", "#6f8cff", "#2fd6c4",
  "#49d76a", "#eaff6b",
];

export const CT_STOPS = [2000, 2700, 3400, 4100, 5000, 6500];

/* ------------------------------------------------------ service-kall */

export function callSvc(hass, domain, service, data) {
  const failed = (err) => {
    console.warn(`[Deckify] ${domain}.${service} feilet`, err);
    try {
      window.dispatchEvent(new CustomEvent("deckify-service-error", {
        detail: { domain, service, data, message: String(err?.message || err) },
      }));
    } catch (e) {}
    return false;
  };
  let p;
  try {
    p = hass.callService(domain, service, data);
  } catch (err) {
    return Promise.resolve(failed(err));
  }
  if (p && typeof p.then === "function") {
    return p.then(() => true, failed);
  }
  return Promise.resolve(p !== false);
}

export function toggleEntity(hass, eid) {
  const d = domainOf(eid);
  if (d === "scene") return callSvc(hass, "scene", "turn_on", { entity_id: eid });
  if (d === "script") return callSvc(hass, "script", "turn_on", { entity_id: eid });
  /* Knapper har press, ikke turn_on/turn_off. Uten denne grenen endte de i
     homeassistant.toggle, som ikke finnes for button/input_button. */
  if (d === "button" || d === "input_button")
    return callSvc(hass, d, "press", { entity_id: eid });
  if (d === "lock") {
    const st = hass.states[eid];
    return callSvc(hass, "lock", st?.state === "locked" ? "unlock" : "lock", { entity_id: eid });
  }
  if (d === "cover") {
    const st = hass.states[eid];
    return callSvc(hass, "cover", st?.state === "closed" ? "open_cover" : "close_cover", { entity_id: eid });
  }
  if (d === "media_player") {
    return callSvc(hass, "media_player", "toggle", { entity_id: eid });
  }
  if (d === "vacuum") {
    const st = hass.states[eid];
    return callSvc(hass, "vacuum", ["cleaning", "returning"].includes(st?.state) ? "return_to_base" : "start", { entity_id: eid });
  }
  if (d === "climate") {
    const st = hass.states[eid];
    const modes = st?.attributes?.hvac_modes || ["off"];
    const next = st?.state === "off" ? (modes.find((m) => m !== "off") || "heat") : "off";
    return callSvc(hass, "climate", "set_hvac_mode", { entity_id: eid, hvac_mode: next });
  }
  return callSvc(hass, "homeassistant", "toggle", { entity_id: eid });
}

/* ------------------------------------------------------- dom-hjelpere */

export function fireEvent(node, type, detail = {}) {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

/** Finn et element dypt i HAs shadow-DOM. */
export function deepQuery(root, selector, depth = 0) {
  if (!root || depth > 12) return null;
  try {
    const hit = root.querySelector ? root.querySelector(selector) : null;
    if (hit) return hit;
  } catch (e) {}
  const kids = root.querySelectorAll ? root.querySelectorAll("*") : [];
  for (const k of kids) {
    if (k.shadowRoot) {
      const r = deepQuery(k.shadowRoot, selector, depth + 1);
      if (r) return r;
    }
  }
  return null;
}
