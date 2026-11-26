import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import * as core from "../tools/.chk/core.mjs";
import * as att from "../tools/.chk/attention.mjs";
import * as ctr from "../tools/.chk/controls.mjs";
import * as views from "../tools/.chk/views.mjs";
import * as settings from "../tools/.chk/settings.mjs";
import { CSS } from "../tools/.chk/styles.mjs";

const snap = JSON.parse(fs.readFileSync(new URL("./fixtures/snapshot.json", import.meta.url)));
const hass = {
  states: snap.states,
  areas: snap.areas,
  devices: snap.devices,
  entities: snap.entities,
  config: { latitude: 59.9, longitude: 10.75 },
  callService: async () => {},
  callWS: async () => ({}),
  callApi: async () => [],
};
const SERVER = {
  auto_fill: true, per_device: false, version: 1, title: "Deckify", areas: [],
  exclude: [], exclude_platforms: [], exclude_patterns: [], assign: {}, rename: {},
  as_light: [], confirm: ["siren.", "lock."], sensors: {}, calendars: null,
  scenes: { pinned: [], max: 10, auto: true, strip_area_prefix: true },
  plants: null, machines: null, power_devices: null, deeplinks: [],
  security_actions: [], battery_warn: 25, ui: {},
  order: {}, hidden: {}, big: {}, seps: {}, cards: {},
};
const cfg = core.resolveConfig(hass, SERVER, {});
const store = {
  server: SERVER, writable: true, perDevice: false, entryId: "test",
  data: { ...core.DEFAULTS, layout: "grid" },
  get(k) { return this.data[k]; },
  isHidden() { return false; },
  cardCfg() { return core.DEFAULT_CARD; },
  cardSize() { return "1x1"; },
  isBig() { return false; },
};
const model = core.buildModel(hass, cfg, store);

test("globale sikkerhetsvarsler", () => {
  const smoke = "binary_sensor.smoke_uten_rom";
  assert.ok(model.securityAll.some((x) => x.eid === smoke));
  const issues = att.collectIssues({ hass, cfg }, model);
  assert.ok(issues.some((i) => i.eid === smoke && i.lvl === 3 && /Uten rom/.test(i.sub)));
  assert.ok(ctr.securityAlerts({ hass, cfg }, model).some((a) => a.eid === smoke));
});

test("knapp bruker button.press", async () => {
  const calls = [];
  await core.toggleEntity(
    { callService: async (d, s, data) => calls.push([d, s, data]) },
    "button.test"
  );
  assert.deepEqual(calls[0], ["button", "press", { entity_id: "button.test" }]);
});

test("Nullstill layout sender bare layout-scope", async () => {
  const ws = [];
  const st = new core.Store(
    { callWS: async (msg) => { ws.push(msg); return { config: {} }; } },
    { entryId: "e", instance: "e" }
  );
  st.writable = true;
  st.data = { ...core.DEFAULTS, order: { home: ["x"] } };
  await st.resetLayout();
  assert.equal(ws.at(-1).scope, "layout");
});

test("ugyldig regex og tom kalenderliste", () => {
  const bad = core.resolveConfig(hass, { ...SERVER, exclude_patterns: ["["] }, {});
  assert.equal(bad.excludeRe, null);
  assert.equal(bad.excludeReInvalid, true);
  const none = core.resolveConfig(hass, { ...SERVER, calendars: [] }, {});
  assert.deepEqual(none.calendars, []);
});

test("show_unavailable har én kilde", () => {
  const statesOff = {
    ...hass.states,
    "light.stue_tak": { ...hass.states["light.stue_tak"], state: "unavailable" },
  };
  const h = { ...hass, states: statesOff };
  const hide = core.resolveConfig(h, { ...SERVER, show_unavailable: false }, {});
  const show = core.resolveConfig(h, { ...SERVER, show_unavailable: true }, {});
  assert.ok(!core.buildModel(h, hide, store).rooms[0].controls.includes("light.stue_tak"));
  assert.ok(core.buildModel(h, show, store).rooms[0].controls.includes("light.stue_tak"));

  const ctx = {
    hass: h, cfg: hide, store, version: "test", now: new Date(),
    accent: "#f5b731", cardColor: "#f2e8d0", layout: "grid", view: "home",
    edit: false, canEdit: true, canWrite: true, setSec: "home",
    agenda: { todayCount: 0, todoPending: 0, todoOverdue: 0, todoItems: [] },
    calendar: { events: [], calendars: [] }, model,
    isDefaultPanel: false, attention: { total: 0, urgent: 0, action: 0 },
  };
  assert.match(settings.settingsSheet(ctx, model), /data-k="show_unavailable"/);
});

test("tjenestefeil og config-feil gir kontrollert fallback", async () => {
  const failed = await core.callSvc(
    { callService: async () => { throw new Error("nei"); } },
    "light", "turn_on", { entity_id: "light.x" }
  );
  assert.equal(failed, false);

  let call = 0;
  const st = new core.Store({
    callWS: async () => {
      call++;
      if (call === 1) return { entry_id: "e", writable: true, config: { ui: { accent: "sand" } } };
      throw new Error("midlertidig nede");
    },
  }, { entryId: "e", instance: "e" });
  await st.load();
  await st.load();
  assert.ok(st.loadError);
  assert.equal(st.data.accent, "sand");
});

test("onboarding, skjermsparer og lat enhetsliste", () => {
  assert.equal(core.DEFAULTS.saverSec, 300);
  assert.match(CSS, /100dvh/);
  assert.match(CSS, /prefers-reduced-motion/);
  assert.match(CSS, /\.hd\.cardmode #dock\{position:absolute/);
  assert.match(views.onboarding({ store, canEdit: true, canWrite: true }), /data-act="autofill"/);
  assert.doesNotMatch(views.onboarding(
    { store: { ...store, writable: false }, canEdit: false, canWrite: false }), /data-act="autofill"/);
  assert.equal(model.addable, model.addable);
  assert.ok(model.addable.length > 0);
});

test("header bruker værreserven når enheten er nede", () => {
  const states = {
    ...hass.states,
    "weather.home": { ...hass.states["weather.home"], state: "unavailable" },
  };
  const ctx = {
    hass: { ...hass, states }, cfg: { ...cfg, weatherEntity: "weather.home" }, store,
    now: new Date(), agenda: { todayCount: 0, todoPending: 0, todoOverdue: 0, todoItems: [] },
    weather: { ok: true, state: "sunny", temperature: 11, kilde: "Open-Meteo" },
  };
  const html = views.header(ctx, model);
  assert.match(html, /11/);
  assert.match(html, /Open-Meteo/);
  assert.doesNotMatch(html, /unavailable/);
});
