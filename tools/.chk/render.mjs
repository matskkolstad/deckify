/* Deckify render-røyktest.
 *
 * Bygger modellen og rendrer ALLE visninger mot et ekte HA-øyeblikksbilde.
 * Flagger output som inneholder `undefined`, `[object Object]` eller `NaN%`.
 *
 * Viktig forskjell fra den gamle harnessen: `cfg` bygges nå med
 * `resolveConfig` fra et TOMT serveroppsett, slik at testen faktisk kjører
 * autooppdagelsen — det er den som skal erstatte all hardkodingen.
 */
import fs from "node:fs";
import * as core from "./core.mjs";
import * as views from "./views.mjs";
import * as ov from "./overlays.mjs";
import * as se from "./settings.mjs";
import * as md from "./media.mjs";
import * as ctr from "./controls.mjs";
import { CSS } from "./styles.mjs";
import * as dt from "./detail.mjs";
import * as pg from "./pages.mjs";
import * as sta from "./start.mjs";
import * as sch from "./search.mjs";
import * as atv from "./appletv.mjs";
import * as att from "./attention.mjs";
import * as cards from "./cards.mjs";
import * as sv from "./saver.mjs";

const snap = JSON.parse(fs.readFileSync(new URL("./snapshot.json", import.meta.url)));

const hass = {
  states: snap.states, areas: snap.areas, devices: snap.devices, entities: snap.entities,
  config: { latitude: 59.9, longitude: 10.75 },
  callService: async () => {}, callWS: async () => ({}), callApi: async () => [],
};

/* Tomt serveroppsett = nytt dashbord rett etter installasjon. */
const SERVER = {
  /* Hovedsuiten kjører MED autofyll, slik at alle visningene faktisk får
     innhold å rendre. Den tomme tilstanden testes eksplisitt nederst. */
  auto_fill: true, per_device: false,
  version: 1, title: "Deckify", areas: [], exclude: [], exclude_platforms: [],
  exclude_patterns: [], assign: {}, rename: {}, as_light: [],
  confirm: ["siren.", "lock."], sensors: {}, calendars: null,
  scenes: { pinned: [], max: 10, auto: true, strip_area_prefix: true },
  plants: null, machines: null, power_devices: null, deeplinks: [],
  security_actions: [], battery_warn: 25, ui: {},
  order: {}, hidden: {}, big: {}, seps: {}, cards: {},
};

const cfg = core.resolveConfig(hass, SERVER, {});

const CARDS = {};        /* per-kort-overstyringer i testen */
const store = {
  server: SERVER, writable: true, entryId: "test_entry",
  data: { ...core.DEFAULTS, layout: "start" },
  get(k) { return this.data[k]; },
  set(k, v) { this.data[k] = v; },
  patch(o) { Object.assign(this.data, o); },
  orderFor(scope, ids) { return ids; },
  setOrder() {},
  isHidden() { return false; },
  hiddenCount() { return 0; },
  unhideAll() {},
  rawCardCfg(scope, id) { return (CARDS[scope] || {})[id] || {}; },
  cardCfg(scope, id) { return { ...core.DEFAULT_CARD, ...this.rawCardCfg(scope, id) }; },
  setCardCfg(scope, id, p) {
    CARDS[scope] = CARDS[scope] || {};
    CARDS[scope][id] = { ...(CARDS[scope][id] || {}), ...p };
  },
  cardSize(scope, id) { return this.rawCardCfg(scope, id).size || (this._bigAll ? "2x2" : "1x1"); },
  setCardSize(scope, id, size) { this.setCardCfg(scope, id, { size }); },
  isBig(scope, id) { return this.cardSize(scope, id) === "2x2"; },
  toggleBig() {},
  queueSave() {},
  async patchServer() { return true; },
  async resetAll() { return true; },
};

const model = core.buildModel(hass, cfg, store);

console.log("=== AUTOOPPDAGELSE");
console.log(` vær           ${cfg.weatherEntity || "-"}`);
console.log(` effekt        ${cfg.powerSensor || "-"}`);
console.log(` energi        ${cfg.energySensor || "-"}`);
console.log(` pris          ${cfg.priceSensor || "-"}  (neste ${cfg.priceNext || "-"})`);
console.log(` ute           ${cfg.outdoorTemp || "-"} / ${cfg.outdoorHum || "-"}`);
console.log(` gjøremål      ${cfg.todoEntity || "-"}`);
console.log(` kalendere     ${(cfg.calendars || []).length}`);
console.log(` planter       ${cfg.plants.length}`);
console.log(` maskiner      ${cfg.machines.length}  ${cfg.machines.map((m) => m.name).join(", ")}`);
console.log(` apparateffekt ${cfg.powerDevices.length}`);

console.log("\n=== MODELL");
for (const r of model.rooms) {
  console.log(` ${r.name.padEnd(16)} ${String(r.controls.length).padStart(2)} enheter  ` +
    `${String(r.lightsOn)}/${r.lightIds.length} lys på  ${r.scenes.length} scener  ` +
    `${r.security.length} sikkerhet  ${r.cameras.length} kam  temp=${r.temp || "-"}`);
}
console.log(` løse scener: ${model.looseScenes.length}, lys totalt ${model.allLights.length}, på ${model.lightsOn.length}`);

/* --- scenenavn: regresjonstest for Hue-dobbeltnavnene ----------------- */
console.log("\n=== SCENENAVN");
const sceneIds = [...model.rooms.flatMap((r) => r.scenes), ...model.looseScenes];
let nameBad = 0;
for (const eid of sceneIds.slice(0, 12)) {
  const area = hass.areas[core.areaIdOf(hass, eid)]?.name || null;
  const short = core.sceneName(hass, cfg, eid, area);
  const long = core.sceneName(hass, cfg, eid, null, { withArea: true });
  const raw = hass.states[eid].attributes.friendly_name;
  const dup = area && short.toLowerCase().startsWith(area.toLowerCase() + " ");
  if (!short || dup) { nameBad++; console.log(`  FEIL ${eid}: ${raw} -> ${short}`); }
  else console.log(`  ${raw.padEnd(40)} -> ${short.padEnd(22)} | ${long}`);
}
if (nameBad) console.log(`  ${nameBad} scenenavn ble ikke vasket`);

const mkCtx = (over = {}) => ({
  hass, cfg, store, version: "test", now: new Date(), accent: "#f5b731", cardColor: "#f2e8d0",
  layout: store.get("layout"), view: "home", edit: false, roomSel: model.rooms[0].id,
  sidebarSel: "overview", focusPage: 0, collapsed: new Set(), drag: {},
  forecast: { hourly: [{ datetime: new Date().toISOString(), temperature: 7, condition: "rainy", precipitation_probability: 40 }],
              daily: [{ datetime: new Date().toISOString(), temperature: 9, templow: 3, condition: "cloudy", precipitation_probability: 20 }] },
  weather: { ok: true, state: "cloudy", temperature: 4, humidity: 80, wind: 5, pressure: 1010, hourly: [], daily: [] },
  agenda: { todayCount: 2, todoPending: 3, todoOverdue: 1, todoItems: [{ uid: "1", summary: "Melk", status: "needs_action", due: null }] },
  calendar: { events: [{ cal: (cfg.calendars || [])[0] || "calendar.x", calName: "Privat", summary: "Test", start: new Date().toISOString(), end: new Date().toISOString(), allDay: false, location: "" }], calendars: cfg.calendars },
  calMonth: new Date(), calSel: new Date().toISOString(), setSec: "layout",
  playerEid: Object.keys(hass.states).find((e) => e.startsWith("media_player.")),
  pickerScope: "home", pickerMode: "devices", pickerQ: "", pickerDomain: null,
  searchQ: "", attention: { total: 3, urgent: 1, action: 2 },
  scopeIds: [], editScope: "home",
  confirm: { title: "x", text: "y", ok: "z" }, isDefaultPanel: false,
  cardCfg: null, dashboards: null,
  media: { favorites: [{ id: "FV:2/1", type: "favorite_item_id", title: "NRK P3", icon: "mdi:radio" }] },
  browse: { node: { title: "Sonos", can_play: false, children: [
      { title: "Favorites", media_class: "directory", media_content_type: "favorites", media_content_id: "", can_expand: true, can_play: false },
      { title: "NRK P3", media_class: "track", media_content_type: "favorite_item_id", media_content_id: "FV:2/1", can_play: true, can_expand: false, thumbnail: "/x.jpg" }] },
    stack: [{ id: null, type: null, title: "Start" }], loading: false, error: null },
  groupLeader: Object.keys(hass.states).find((e) => e.startsWith("media_player.")),
  browseTarget: Object.keys(hass.states).find((e) => e.startsWith("media_player.")),
  detailEid: null, detailRoom: null, timers: {},
  history: { [cfg.powerSensor || "x"]: [{ t: Date.now() - 3600e3, v: 1200 }, { t: Date.now(), v: 3100 }] },
  priceHistory: Array.from({ length: 24 }, (_, i) => ({ t: Date.now() - (23 - i) * 3600e3, v: 1.6 + Math.sin(i / 3) * 0.4 })),
  model, ...over,
});

const checks = [];
const run = (name, fn) => {
  try {
    const out = fn();
    if (typeof out !== "string") throw new Error("ikke en streng");
    if (out.length < 40) throw new Error("mistenkelig kort: " + out.length);
    if (/undefined|\[object Object\]|NaN%/.test(out)) {
      const m = out.match(/.{0,60}(undefined|\[object Object\]|NaN%).{0,60}/);
      throw new Error("mistenkelig innhold: " + m[0].replace(/\s+/g, " "));
    }
    checks.push([name, "OK", out.length]);
  } catch (e) {
    checks.push([name, "FEIL: " + e.message, 0]);
  }
};

run("start", () => sta.viewStart(mkCtx({ layout: "start" }), model));
run("tilsyn", () => att.viewAttention(mkCtx(), model));
run("tilsyn/antall", () => "x".repeat(60) + JSON.stringify(att.attentionCount(mkCtx(), model)));
run("appletv", () => atv.appleTVSheet(mkCtx(), model));
run("sok/tom", () => sch.searchSheet(mkCtx(), model));
run("sok/lys", () => sch.searchSheet(mkCtx({ searchQ: "lys" }), model));
run("sok/tull", () => sch.searchSheet(mkCtx({ searchQ: "zzzqqq" }), model));
run("start/edit", () => sta.viewStart(mkCtx({ layout: "start", edit: true }), model));
run("home/grid", () => views.viewHomeGrid(mkCtx({ layout: "grid" }), model));
run("home/list", () => views.viewHomeList(mkCtx({ layout: "list" }), model));
run("home/sidebar", () => views.viewHomeSidebar(mkCtx({ layout: "sidebar" }), model));
run("home/focus", () => views.viewHomeFocus(mkCtx({ layout: "focus" }), model));
run("home/focus+rom", () => views.viewHomeFocus(mkCtx({ layout: "focus", focusPage: 1 }), model));
run("rooms", () => views.viewRooms(mkCtx({ view: "rooms" }), model));
run("rooms/sidebar", () => views.viewRooms(mkCtx({ view: "rooms", layout: "sidebar" }), model));
run("media", () => md.viewMediaPage(mkCtx({ view: "media" }), model, views.header(mkCtx(), model)));
run("ov/group", () => md.groupSheet(mkCtx(), model));
run("ov/browse", () => md.browseSheet(mkCtx(), model));
run("security", () => views.viewSecurity(mkCtx({ view: "security" }), model));
run("energi", () => pg.viewEnergy(mkCtx({ view: "energy" }), model, views.header(mkCtx(), model)));
run("huset", () => pg.viewHouse(mkCtx({ view: "house" }), model, views.header(mkCtx(), model)));
run("dock", () => views.dock(mkCtx(), model));
run("saver", () => sv.saverView(mkCtx(), model));
run("scenestripe", () => views.sceneStrip(mkCtx(), model));
run("ov/weather", () => ov.weatherSheet(mkCtx()));
run("ov/calendar", () => ov.calendarSheet(mkCtx()));
run("ov/todo", () => ov.todoSheet(mkCtx()));
run("ov/player", () => ov.playerSheet(mkCtx()));
run("ov/picker", () => ov.pickerSheet(mkCtx(), model));
run("ov/picker-filter", () => ov.pickerSheet(mkCtx({ pickerDomain: "sensor" }), model));
run("ov/picker-scener", () => ov.pickerSheet(mkCtx({ pickerMode: "scenes" }), model));
run("ov/confirm", () => ov.confirmSheet(mkCtx()));
for (const s of ["layout", "deck", "look", "home", "rooms", "nav", "system"])
  run("set/" + s, () => se.settingsSheet(mkCtx({ setSec: s }), model));

/* --- kortinnstillinger ------------------------------------------------ */
const firstLight = model.rooms.flatMap((r) => r.lightIds)[0];
const firstRoom = "room:" + model.rooms[0].id;
run("kortcfg/lys", () => cards.cardConfigSheet(
  mkCtx({ cardCfg: { scope: "home", id: "dev:" + firstLight } }), model));
run("kortcfg/rom", () => cards.cardConfigSheet(
  mkCtx({ cardCfg: { scope: "home", id: firstRoom } }), model));
run("kortcfg/system", () => cards.cardConfigSheet(
  mkCtx({ cardCfg: { scope: "home", id: "sys:security" } }), model));
run("kortcfg/tjeneste", () => {
  store.setCardCfg("home", "dev:" + firstLight, { tap: "service", service: "light.turn_on" });
  const out = cards.cardConfigSheet(mkCtx({ cardCfg: { scope: "home", id: "dev:" + firstLight } }), model);
  delete CARDS.home["dev:" + firstLight];
  return out;
});

run("storrelse", () => {
  const id = "dev:" + firstLight;
  store.setCardCfg("home", id, { size: "2x1" });
  const html = ctr.cardWrap(mkCtx(), "home", id, ctr.anyTile(mkCtx(), firstLight, "Stue", id, false, "home"));
  delete CARDS.home[id];
  if (!/class="[^"]*\bw2\b/.test(html)) throw new Error("mangler w2-klasse");
  if (!/data-cardid="/.test(html)) throw new Error("mangler data-cardid");
  return html;
});

run("infomodus", () => {
  const id = "dev:" + firstLight;
  const a = ctr.cardInfoText(mkCtx(), firstLight, "home", id);
  store.setCardCfg("home", id, { info: "area" });
  const b = ctr.cardInfoText(mkCtx(), firstLight, "home", id);
  delete CARDS.home[id];
  if (a === b) throw new Error("info-modus hadde ingen virkning");
  return "auto=" + a + " area=" + b + " ".repeat(40);
});

for (const lay of ["start", "grid", "sidebar", "list", "focus"]) {
  run("edit/" + lay, () => {
    const c = mkCtx({ edit: true, layout: lay });
    const html = lay === "start" ? sta.viewStart(c, model)
      : lay === "grid" ? views.viewHomeGrid(c, model)
      : lay === "sidebar" ? views.viewHomeSidebar(c, model)
      : lay === "list" ? views.viewHomeList(c, model)
      : views.viewHomeFocus(c, model);
    if (!/data-dropzone=/.test(html)) throw new Error("ingen dropzone");
    if (!/data-act="hide"/.test(html)) throw new Error("ingen skjul-knapp");
    if (!/data-act="cardcfg"/.test(html)) throw new Error("ingen tannhjul");
    return html;
  });
}

for (const [lbl, eid] of [
  ["lys", model.rooms.flatMap((r) => r.lightIds)[0]],
  ["media", Object.keys(hass.states).find((e) => e.startsWith("media_player."))],
  ["sensor", cfg.powerSensor],
  ["binary", Object.keys(hass.states).find((e) => e.startsWith("binary_sensor."))],
  ["person", Object.keys(hass.states).find((e) => e.startsWith("person."))],
  ["weather", cfg.weatherEntity],
  ["sol", "sun.sun"],
]) if (eid) run("kort/" + lbl, () => ctr.anyTile(mkCtx(), eid, "Stue", null, false, "home"));

for (const [lbl, eid] of [
  ["lys", model.rooms.flatMap((r) => r.lightIds)[0]],
  ["klima", Object.keys(hass.states).find((e) => e.startsWith("climate."))],
  ["gardin", Object.keys(hass.states).find((e) => e.startsWith("cover."))],
  ["sensor", cfg.powerSensor],
]) if (eid) run("detalj/" + lbl, () => dt.detailSheet(mkCtx({ detailEid: eid }), model));

store._bigAll = true;
run("rom/store-kort", () => model.rooms.map((r) => views.roomBody(mkCtx({ view: "rooms" }), model, r)).join(""));
store._bigAll = false;

/* --- tom førstegangstilstand --------------------------------------------
   Et nytt dashbord skal være HELT tomt: ingen rom, ingen systemkort, ingen
   scener — bare «legg til»-fliser i redigeringsmodus. */
const emptyServer = { ...SERVER, auto_fill: false };
const cfgEmpty = core.resolveConfig(hass, emptyServer, {});
const emptyStore = { ...store, server: emptyServer, perDevice: false,
  data: { ...core.DEFAULTS, layout: "grid" } };
const emptyCtx = (over = {}) => ({ ...mkCtx(), cfg: cfgEmpty, store: emptyStore, ...over });

run("tom/hjem", () => {
  const html = views.viewHomeGrid(emptyCtx({ layout: "grid" }), model);
  const cards = (html.match(/class="card[" ]/g) || []).length;
  if (cards) throw new Error(cards + " kort på et tomt dashbord");
  if (!/Kom i gang/.test(html)) throw new Error("mangler onboarding");
  return html;
});
run("tom/scener", () => {
  const ids = views.visibleScenes(emptyCtx(), model);
  if (ids.length) throw new Error(ids.length + " scener på et tomt dashbord");
  return "tomt".repeat(20);
});
run("tom/start", () => {
  const html = sta.viewStart(emptyCtx({ layout: "start" }), model);
  if (/class="card startRoom/.test(html)) throw new Error("romruter på et tomt dashbord");
  if (!/Kom i gang/.test(html)) throw new Error("mangler onboarding for rom");
  return html;
});
run("tom/edit-tilbyr-kort", () => {
  const html = views.viewHomeGrid(emptyCtx({ layout: "grid", edit: true }), model);
  const adds = (html.match(/data-act="addtile"/g) || []).length;
  if (adds < 3) throw new Error("bare " + adds + " legg-til-fliser");
  if (!/data-act="adddevices"/.test(html)) throw new Error("mangler enhetsvelger");
  return html;
});
run("tom/edit-start", () => {
  const html = sta.viewStart(emptyCtx({ layout: "start", edit: true }), model);
  if (!/data-act="addtile"/.test(html)) throw new Error("ingen rom å legge til");
  return html;
});
/* autofyll på = alt kommer av seg selv igjen */
run("autofyll/hjem", () => {
  const html = views.viewHomeGrid(mkCtx({ layout: "grid" }), model);
  if (!/class="card/.test(html)) throw new Error("autofyll ga ingen kort");
  return html;
});

run("tom/media", () => {
  const html = md.viewMediaPage(emptyCtx({ view: "media" }), model, "<div>h</div>");
  const cards = (html.match(/class="card[" ]/g) || []).length;
  if (cards) throw new Error(cards + " spillerkort på et tomt dashbord");
  if (!/Ingen høyttalere/.test(html)) throw new Error("mangler tom-tekst");
  return html;
});
run("appletv/inngang", () => {
  /* Fjernkontrollen l\u00e5 tidligere bare i Startskjerm-layouten. */
  const html = md.viewMediaPage(mkCtx({ view: "media" }), model, "<div>h</div>");
  const tvs = atv.appleTVs(mkCtx());
  if (tvs.length && !/data-act="appletv"/.test(html))
    throw new Error("ingen vei inn til fjernkontrollen");
  return html;
});
/* ---------------------------------------------------------- hurtigvalg
   Brikkeraden erstatter de gamle hardkodede «Skru alt av/på»-knappene og
   sensorpillene. Den må finnes i HVER layout, være sin egen dropzone, og i
   redigeringsmodus tilby både fjern-knapp, dra-håndtak og «legg til». */
run("hurtigvalg/hjem", () => {
  const html = views.viewHomeGrid(mkCtx({ layout: "grid" }), model);
  if (!/data-dropzone="chips:home"/.test(html)) throw new Error("ingen hurtigvalgsrad på Hjem");
  if (!/data-act="allon"/.test(html) || !/data-act="alloff"/.test(html))
    throw new Error("av/på-brikkene mangler");
  return html;
});
run("hurtigvalg/rom", () => {
  const r = model.rooms.find((x) => x.temp) || model.rooms[0];
  const html = views.roomBody(mkCtx({ view: "rooms", roomSel: r.id }), model, r);
  if (!new RegExp('data-dropzone="chips:room:' + r.id + '"').test(html))
    throw new Error("ingen hurtigvalgsrad i rommet " + r.id);
  if (r.temp && !new RegExp('data-e="' + r.temp + '"').test(html))
    throw new Error("temperaturbrikken mangler i " + r.id);
  return html;
});
run("hurtigvalg/edit", () => {
  const r = model.rooms.find((x) => x.temp) || model.rooms[0];
  const html = views.roomBody(mkCtx({ view: "rooms", roomSel: r.id, edit: true }), model, r);
  for (const need of ['data-act="addchips"', 'data-act="hide"', 'class="grip"'])
    if (!html.includes(need)) throw new Error("mangler " + need + " i redigeringsmodus");
  return html;
});
run("hurtigvalg/alle-layouter", () => {
  const out = [];
  for (const [n, fn] of [["grid", views.viewHomeGrid], ["list", views.viewHomeList],
                         ["sidebar", views.viewHomeSidebar]]) {
    const html = fn(mkCtx({ layout: n }), model);
    if (!/data-dropzone="chips:home"/.test(html))
      throw new Error("layout " + n + " mangler hurtigvalgsraden");
    out.push(n);
  }
  /* de gamle, uredigerbare knappene skal være helt borte */
  const grid = views.viewHomeGrid(mkCtx({ layout: "grid" }), model);
  if (/class="abtn"/.test(grid)) throw new Error("gammel .abtn henger igjen på Hjem");
  return "hurtigvalg i " + out.join(", ") + " ".repeat(30);
});

/* «Oversikt» skal ikke stå igjen som en tom overskrift. */
run("tom/ingen-oversikt", () => {
  const html = sta.viewStart(emptyCtx({ layout: "start" }), model);
  if (/>Oversikt</.test(html)) throw new Error("tom Oversikt-overskrift vises likevel");
  const sb = views.viewHomeSidebar(emptyCtx({ layout: "sidebar" }), model);
  if (/data-r="overview"/.test(sb)) throw new Error("tomt Oversikt-menyvalg vises likevel");
  const sbEdit = views.viewHomeSidebar(emptyCtx({ layout: "sidebar", edit: true }), model);
  if (!/data-r="overview"/.test(sbEdit))
    throw new Error("Oversikt kommer ikke tilbake i redigeringsmodus");
  return html;
});

/* Enhetsvelgeren: poengsatt søk, og en topp som ikke er hardkodet mørk. */
run("velger/sok", () => {
  const html = ov.pickerSheet(mkCtx({ pickerQ: "lys" }), model);
  if (!/class="pickrow2/.test(html)) throw new Error("ingen treff på «lys»");
  if (!/data-act="pickclear"/.test(html)) throw new Error("mangler tøm-knapp");
  const tull = ov.pickerSheet(mkCtx({ pickerQ: "zzzqqq" }), model);
  if (!/Fant ingenting/.test(tull)) throw new Error("tullesøk ga treff");
  return html;
});
run("velger/kontrast", () => {
  if (/\.pickhead\{[^}]*background:rgba\(22,16,24/.test(CSS))
    throw new Error("pickhead har fortsatt hardkodet mørk bakgrunn");
  if (!/--sheet-bg/.test(CSS)) throw new Error("mangler --sheet-bg");
  if (!CSS.includes(".hd.hicon{")) throw new Error("mangler høykontrast-blokken");
  /* ha-icon må bindes til ikonstørrelsen, ellers sitter glyfen for høyt */
  if (!/ha-icon\{[^}]*height:var\(--mdc-icon-size/.test(CSS))
    throw new Error("ha-icon er ikke bundet til --mdc-icon-size");
  return "kontrast- og sentreringsregler på plass".repeat(2);
});

/* ------------------------------------------------------------ skjermsparer
   Klokke + dato er obligatorisk; resten er brukerens valg. Forsinkelsen er
   SEKUNDER — den gamle minutt-nøkkelen kunne ikke uttrykke 30 sekunder. */
run("saver/innhold", () => {
  const html = sv.saverView(mkCtx(), model);
  for (const need of ['class="sc mono"', 'class="sd"', 'class="shint"'])
    if (!html.includes(need)) throw new Error("mangler " + need);
  return html;
});
run("saver/valgfritt-av", () => {
  const st = { ...store, data: { ...store.data, saverWeather: false,
    saverStatus: false, saverMedia: false, saverAgenda: false },
    get(k) { return this.data[k]; } };
  const html = sv.saverView({ ...mkCtx(), store: st }, model);
  if (/class="sinfo"/.test(html)) throw new Error("glanseraden vises selv om alt er av");
  if (!/class="sc mono"/.test(html)) throw new Error("klokka forsvant");
  return html + " ".repeat(40);
});
run("saver/forsinkelser", () => {
  const ids = sv.SAVER_DELAYS.map((o) => o.s);
  if (!ids.includes(0)) throw new Error("mangler «Av»");
  if (!ids.includes(30)) throw new Error("mangler 30 sekunder");
  if (core.DEFAULTS.screensaver !== undefined)
    throw new Error("den gamle minutt-nøkkelen henger igjen");
  if (typeof core.DEFAULTS.saverSec !== "number")
    throw new Error("saverSec mangler i DEFAULTS");
  if (core.Store.DEVICE_KEYS.includes("saverSec"))
    throw new Error("saverSec må være delt, ikke per enhet");
  if (!CSS.includes("@keyframes saverdrift"))
    throw new Error("mangler drift mot innbrenning");
  if (/#saver\{[^}]*background:rgba\(8,4,10/.test(CSS))
    throw new Error("skjermspareren har fortsatt hardkodet mørk bakgrunn");
  return "forsinkelser: " + ids.join(", ") + " sekunder".repeat(2);
});

run("lyst-tema", () => {
  if (!core.isLightBg("dagslys")) throw new Error("dagslys er ikke merket lyst");
  if (core.isLightBg("plomme")) throw new Error("plomme skal være mørkt");
  const base = core.bgBase("dagslys", 0);
  if (!/^#[0-9a-f]{6}$/.test(base)) throw new Error("bgBase ga " + base);
  if (!CSS.includes(".hd.light{")) throw new Error("mangler .hd.light-blokk");
  /* hver lys bakgrunn må ha light:true, ellers blir teksten uleselig */
  for (const b of core.BACKGROUNDS) {
    const lum = parseInt(b.off[1].slice(1, 3), 16);
    if (lum > 150 && !b.light) throw new Error(b.id + " er lys men mangler light:true");
    if (lum < 100 && b.light) throw new Error(b.id + " er mørk men har light:true");
  }
  return "lyse temaer: " + core.BACKGROUNDS.filter((b) => b.light).map((b) => b.id).join(", ");
});

if (typeof CSS !== "string" || CSS.length < 5000)
  throw new Error("CSS mangler eller er avkortet: " + typeof CSS + " " + (CSS || "").length);
/* CSS-klasser kan ikke starte med et siffer: `.box.1x1` er ugyldig og hele
   deklarasjonen forkastes stille av nettleseren. */
const badSel = CSS.match(/\.[0-9][A-Za-z0-9_-]*\s*\{/g);
if (badSel) throw new Error("ugyldige CSS-selektorer: " + badSel.join(" "));
console.log("\n CSS                OK  " + CSS.length + " tegn");

console.log("\n=== VISNINGER");
let bad = nameBad;
for (const [n, s, len] of checks) {
  if (s !== "OK") bad++;
  console.log(` ${n.padEnd(20)} ${s === "OK" ? "OK  " + len + " tegn" : s}`);
}
console.log(bad ? `\n${bad} FEIL` : "\nAlt rendret uten feil.");
process.exit(bad ? 1 : 0);
