import test from "node:test";
import assert from "node:assert/strict";

globalThis.HTMLElement = class {
  constructor() { this.isConnected = true; this.style = {}; }
  attachShadow() { this.shadowRoot = {}; return this.shadowRoot; }
};
globalThis.customElements = {
  _defs: {},
  get(n) { return this._defs[n]; },
  define(n, c) { this._defs[n] = c; },
};
globalThis.document = {
  createElement() {
    return {
      innerHTML: "", content: { childNodes: [] }, style: {},
      setAttribute() {}, removeAttribute() {}, hasAttribute() { return false; },
      appendChild() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    };
  },
  addEventListener() {}, removeEventListener() {},
  querySelector() { return null; }, hidden: false,
};
globalThis.location = { hash: "", pathname: "/deckify", search: "" };
globalThis.history = {
  pushState(_a, _b, url) { location.hash = String(url).startsWith("#") ? String(url) : ""; },
  replaceState(_a, _b, url) { location.hash = String(url).startsWith("#") ? String(url) : ""; },
};
globalThis.window = globalThis;
globalThis.window.addEventListener = () => {};
globalThis.window.removeEventListener = () => {};
globalThis.window.dispatchEvent = () => true;
globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o?.detail; } };

await import("../tools/.chk/deckify.mjs");
const Card = customElements.get("deckify-card");

test("hash-ruting leser og skriver visning", () => {
  assert.ok(Card, "deckify-card ble ikke definert");
  const c = new Card();
  c._store = { get: (k) => (k === "layout" ? "sidebar" : undefined) };
  c._st.view = "home";
  c._st.sidebarSel = "stue";
  assert.equal(c._urlForState(), "#/sidebar/stue");

  c._st.view = "rooms";
  c._st.roomSel = "stue";
  assert.equal(c._urlForState(), "#/rooms/stue");

  c._st.view = "page:min-side";
  assert.equal(c._urlForState(), "#/page/min-side");

  location.hash = "#/rooms/bad";
  c._applyUrl();
  assert.equal(c._st.view, "rooms");
  assert.equal(c._st.roomSel, "bad");

  location.hash = "#/page/min-side";
  c._applyUrl();
  assert.equal(c._st.view, "page:min-side");

  location.hash = "#/media";
  c._applyUrl();
  assert.equal(c._st.view, "media");

  location.hash = "#/focus/2";
  c._applyUrl();
  assert.equal(c._st.view, "home");
  assert.equal(c._st.focusPage, 2);

  location.hash = "";
  c._st.view = "media";
  c._syncUrl(true);
  assert.equal(location.hash, "#/media");

  const c2 = new Card();
  c2.setConfig({ dashboard: "deckify" });
  assert.equal(c2._dashboard, "deckify");
  assert.equal(c2._instance, "deckify");

  const c3 = new Card();
  c3._hass = { userData: { defaultPanel: "deckify" } };
  assert.equal(c3._isDefaultPanel(), true);
  c3._hass = { userData: { defaultPanel: "lovelace" } };
  assert.equal(c3._isDefaultPanel(), false);
});
