/* Deckify — deckify.js
 * Hovedkortet: tilstand, rendering, hendelser, datahenting.
 *
 * Et Deckify-inspirert dashbord skrevet fra bunnen for Mats' Home Assistant.
 * Ingen HACS-avhengighet, ingen sky — alt skjer lokalt i HA.
 */
import {
  instanceOf, resolveConfig, BASE,
  DK_VER, h as hEsc, h, ICON, clamp, domainOf, isOn, isDead, nameOf, buildModel, Store,
  bgCss, bgBase, isLightBg, CARD_COLORS, ACCENT_COLORS, callSvc, toggleEntity, fireEvent, deepQuery,
  LIGHT_SWATCHES,
} from "./core.js?v=2.3.0";
import { cardConfigSheet, cardEntity } from "./cards.js?v=2.3.0";
import { CSS } from "./styles.js?v=2.3.0";
import {
  viewHomeGrid, viewHomeList, viewHomeSidebar, viewHomeFocus, viewRooms,
  viewMedia, viewSecurity, viewCustom, dock, visibleScenes, visibleHomeTiles,
  visibleRoomTiles, header,
} from "./views.js?v=2.3.0";
import { saverView } from "./saver.js?v=2.3.0";
import {
  weatherSheet, calendarSheet, todoSheet, playerSheet, pickerSheet, confirmSheet,
} from "./overlays.js?v=2.3.0";
import { settingsSheet } from "./settings.js?v=2.3.0";
import { morph } from "./morph.js?v=2.3.0";
import {
  viewMediaPage, groupSheet, browseSheet, groupable, allPlayers, currentGroups,
} from "./media.js?v=2.3.0";
import { detailSheet } from "./detail.js?v=2.3.0";
import { viewEnergy, viewHouse } from "./pages.js?v=2.3.0";
import { viewStart } from "./start.js?v=2.3.0";
import { appleTVSheet, appleTVs, isAppleTV } from "./appletv.js?v=2.3.0";
import { weatherData } from "./weather.js?v=2.3.0";
import { searchSheet } from "./search.js?v=2.3.0";
import { viewAttention, attentionCount } from "./attention.js?v=2.3.0";
import { ic } from "./controls.js?v=2.3.0";
import { quickIds, chipRoomOf, quickLabel } from "./quick.js?v=2.3.0";

console.info(`%c DECKIFY %c ${DK_VER} `,
  "background:#f5b731;color:#2a2008;font-weight:700;border-radius:3px 0 0 3px",
  "background:#3c1f36;color:#fff;border-radius:0 3px 3px 0");

const HOLD_MS = 450;

/* Oppsettet kortet kjører på i de millisekundene før serveroppsettet er
   hentet. Tomt og trygt — buildModel tåler alle disse. */
const FALLBACK_CFG = {
  entryId: null, title: "Deckify", areas: [], exclude: new Set(), excludeRe: null,
  assign: {}, rename: {}, icons: {}, asLight: new Set(), excludePlatforms: new Set(),
  confirmPrefix: ["siren.", "lock."],
  weatherEntity: null, climateEntity: null, outdoorTemp: null, outdoorHum: null,
  powerSensor: null, energySensor: null, priceSensor: null, priceNext: null,
  priceLow: null, priceHigh: null, todoEntity: null, alarmFlag: null,
  calendars: [], powerDevices: [], scenesPinned: [], scenesAuto: true,
  maxScenes: 10, stripAreaPrefix: true, securityActions: [], deeplinks: [],
  batteryWarn: 25, plants: [], machines: [], featured: [],
  pages: ["start", "home", "rooms", "media", "house", "energy", "security", "attention"],
};

/* Elementtyper som kan dras i redigeringsmodus. */
const DRAGGABLE = ["card", "chip", "lrow"];

/* Domener der et vanlig trykk skal slå av/på. Alt annet åpner detaljpanelet;
   knapper trykkes med button.press. */
const TOGGLE_DOMAINS = new Set([
  "light", "switch", "input_boolean", "cover", "climate", "fan", "humidifier",
  "media_player", "lock", "vacuum", "siren", "script", "scene", "automation",
  "water_heater",
]);

/* Norske navn på fjernkontrollkommandoene, til tilbakemeldingen. */
const ATV_LABEL = {
  menu: "Tilbake", home: "TV", top_menu: "Hjem", play_pause: "Spill/pause",
  skip_forward: "Spol fram", skip_backward: "Spol tilbake",
  volume_up: "Volum opp", volume_down: "Volum ned", suspend: "Hvile",
  wakeup: "Vekk", turn_off: "Slå av", turn_on: "Slå på",
};

class DeckifyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._st = {
      view: "home", roomSel: null, sidebarSel: "overview", focusPage: 0,
      overlay: null, edit: false, collapsed: new Set(), drag: {},
      calMonth: new Date(), calSel: null, setSec: "layout",
      pickerScope: null, pickerMode: null, pickerQ: "", pickerDomain: null,
      atvSel: null,
      searchQ: "",
      playerEid: null, confirm: null, saverOn: false,
      groupLeader: null, browseTarget: null, detailEid: null, detailRoom: null,
    };
    this._cache = {};
    this._forecast = { hourly: [], daily: [] };
    this._agenda = { todayCount: 0, todoPending: 0, todoOverdue: 0, todoItems: [] };
    this._calendar = { events: [], calendars: [] };
    this._media = { favorites: [] };
    this._browse = { node: null, stack: [], loading: false, error: null };
    this._history = {};
    this._priceHistory = [];
    this._timers = {};
    this._busy = false;
    this._lastInput = Date.now();
    this._unsub = [];
    this._forecastUnsub = [];
    this._forecastEntity = null;
    this._active = false;
    this._cfgSub = false;
    this._cfgGen = 0;
    this._forecastGen = 0;
    this._svcListener = null;
    this._popListener = null;
    this._keyListener = null;
    this._visListener = null;
    this._kioskT = null;
    this._kioskSb = false;
    this._hideHeaderEl = null;
    this._kioskStyle = null;
  }

  /* ------------------------------------------------------------- config */

  setConfig(config) {
    const c = config || {};
    this._rawConfig = c;
    /* Panelet sender entry_id; et kort i et vanlig Lovelace-dashbord gjør
       det ikke, og slås da opp på URL-stien i stedet. */
    this._entryId = c.entry_id || null;
    this._isPanel = !!c.panel;
    this._instance = instanceOf(c.instance || c.entry_id || null);
    /* Midlertidig oppsett helt til serveroppsettet er hentet i _boot(). */
    this._cfg = { ...FALLBACK_CFG, title: c.title || "Deckify" };
    this._cache = {};
    /* Et Lovelace-kort kan få ny YAML uten å lastes på nytt. Da må cfg og
       visningen bygges på nytt, ellers står det gamle kortet igjen. */
    if (this._booted && this._store) {
      this._applyServerConfig();
      this._render();
    }
  }

  getCardSize() { return 20; }
  static getStubConfig() { return {}; }

  /* --------------------------------------------------------------- hass */

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._boot();
    else this._scheduleRender();
  }
  get hass() { return this._hass; }

  async _boot() {
    if (this._booting || this._booted) return;
    this._booting = true;
    this._store = new Store(this._hass, {
      instance: this._instance,
      entryId: this._entryId,
      urlPath: (() => {
        try { return location.pathname.split("/").filter(Boolean)[0] || null; }
        catch (e) { return null; }
      })(),
    });
    await this._store.load();
    /* Kortet kan ha blitt flyttet ut av DOM-en mens oppsettet ble hentet. */
    if (!this.isConnected) { this._booting = false; return; }

    this._applyServerConfig();
    this._applyUrl();
    this._build();
    this._render();
    this._booted = true;
    this._booting = false;
    this._startTimers();
    this._subscribeConfig();
    this._refreshDataSources();
    this._applyKiosk();
    if (this._store.loadError) {
      this._toast("Kunne ikke hente Deckify-oppsettet. Sjekk at integrasjonen er lastet.");
    }
  }

  /** Bygg `_cfg` på nytt fra serveroppsettet + kortets YAML + autooppdagelse. */
  _applyServerConfig() {
    this._cfg = resolveConfig(this._hass, this._store.server, this._rawConfig);
    this._cfg.instance = this._instance;
    this._cache = {};

    if (this._cfg.excludeReInvalid && !this._warnedExclude) {
      this._warnedExclude = true;
      this._toast("Et av filterene er ugyldig og ble ignorert");
    } else if (!this._cfg.excludeReInvalid) {
      this._warnedExclude = false;
    }

    /* Når oppsettet endres, må værabonnement, kalender og gjøremål følge
       med. Uten dette fortsatte dashbordet å abonnere på den gamle
       værenheten helt til siden ble lastet på nytt. */
    if (this._booted && this._active) this._refreshDataSources();
  }

  /** Lytt etter endringer gjort et annet sted — i integrasjonens
      innstillinger, eller fra en annen nettleser. Uten dette viser
      veggnettbrettet gammelt oppsett til siden lastes på nytt. */
  _subscribeConfig() {
    if (!this._hass?.connection || this._cfgSub) return;
    this._cfgSub = true;
    const gen = ++this._cfgGen;
    const self = this;
    this._hass.connection.subscribeEvents((ev) => {
      if (gen !== this._cfgGen) return;
      const id = ev?.data?.entry_id;
      if (id && this._store.entryId && id !== this._store.entryId) return;
      clearTimeout(this._cfgT);
      this._cfgT = setTimeout(async () => {
        await this._store.load();
        this._applyServerConfig();
        this._render();
        if (this._store.loadError) {
          this._toast("Kunne ikke oppdatere Deckify-oppsettet");
        }
      }, 350);
    }, "deckify_updated").then(
      function (unsub) {
        /* Rakk elementet å bli frakoblet mens abonnementet ble opprettet? */
        if (gen !== self._cfgGen || !self._cfgSub) {
          try { unsub(); } catch (e) {}
          return;
        }
        self._unsub.push(unsub);
      },
      () => { if (gen === this._cfgGen) this._cfgSub = false; },
    );
  }

  _startTimers() {
    this._active = true;
    if (!this._tick) this._tick = setInterval(() => this._onTick(), 1000);
    if (!this._dataTimer) {
      this._dataTimer = setInterval(() => {
        this._loadCalendar(); this._loadTodo(); this._loadPriceHistory();
        this._loadFavorites();
        this._history = {};
      }, 5 * 60 * 1000);
    }
    if (!this._ro) {
      this._ro = new ResizeObserver(() => this._scheduleRender());
      try { this._ro.observe(this); } catch (e) {}
    }
    if (!this._svcListener) {
      this._svcListener = (e) => {
        const d = e.detail || {};
        const ent = d.data?.entity_id;
        const label = Array.isArray(ent)
          ? `${ent.length} enheter`
          : ent ? nameOf(this._hass, this._cfg, ent) : "";
        this._toast(`Kunne ikke utføre ${d.service || "handlingen"}${label ? " på " + label : ""}`);
      };
      window.addEventListener("deckify-service-error", this._svcListener);
    }
    if (!this._popListener) {
      this._popListener = () => {
        this._applyUrl();
        this._st.overlay = null;
        this._render();
      };
      window.addEventListener("popstate", this._popListener);
    }
    if (!this._keyListener) {
      this._keyListener = (e) => this._onKey(e);
      window.addEventListener("keydown", this._keyListener);
    }
    if (!this._visListener) {
      this._visListener = () => {
        if (!document.hidden) this._lastInput = Date.now();
      };
      document.addEventListener("visibilitychange", this._visListener);
    }
  }

  _stopTimers() {
    this._active = false;
    clearInterval(this._tick); this._tick = null;
    clearInterval(this._dataTimer); this._dataTimer = null;
    try { this._ro?.disconnect(); } catch (e) {}
    this._ro = null;
    if (this._svcListener) {
      window.removeEventListener("deckify-service-error", this._svcListener);
      this._svcListener = null;
    }
    if (this._popListener) {
      window.removeEventListener("popstate", this._popListener);
      this._popListener = null;
    }
    if (this._keyListener) {
      window.removeEventListener("keydown", this._keyListener);
      this._keyListener = null;
    }
    if (this._visListener) {
      document.removeEventListener("visibilitychange", this._visListener);
      this._visListener = null;
    }
    clearTimeout(this._cfgT); this._cfgT = null;
    clearTimeout(this._kioskT); this._kioskT = null;
    clearTimeout(this._toastT); this._toastT = null;
    this._st.toast = null;

    /* Ikke la kioskvalgene henge igjen på Home Assistant etter at panelet
       er forlatt. */
    if (this._kioskSb) {
      const ha = document.querySelector("home-assistant");
      if (ha) fireEvent(ha, "hass-dock-sidebar", { dock: "auto" });
      try { fireEvent(window, "hass-dock-sidebar", { dock: "auto" }); } catch (e) {}
      this._kioskSb = false;
    }
    if (this._hideHeaderEl) {
      try { this._hideHeaderEl.style.removeProperty("display"); } catch (e) {}
      this._hideHeaderEl = null;
    }
    if (this._kioskStyle) {
      try { this._kioskStyle.textContent = ""; } catch (e) {}
      this._kioskStyle = null;
    }

    this._clearForecast();
    for (const u of this._unsub) { try { u(); } catch (e) {} }
    this._unsub = [];
    this._cfgSub = false;
    this._cfgGen++;
    try { this._store?.flush?.(); } catch (e) {}
  }

  _resume() {
    if (!this._booted || !this._hass) return;
    this._startTimers();
    this._subscribeConfig();
    this._refreshDataSources();
    this._applyKiosk();
    this._render();
  }

  _refreshDataSources() {
    if (!this._active) return;
    this._subscribeForecast();
    this._loadCalendar();
    this._loadTodo();
    this._loadPriceHistory();
    this._loadFavorites();
  }

  connectedCallback() {
    if (this._hass && !this._root) { this._boot(); return; }
    if (this._booted) this._resume();
  }

  disconnectedCallback() {
    this._stopTimers();
  }

  /* --------------------------------------------------------------- build */

  _build() {
    const sr = this.shadowRoot;
    this._cache = {};
    sr.innerHTML = `<style>${CSS}</style>
      <div class="hd" id="hd">
        <div id="bg"></div>
        <div id="shell"><div id="body"></div></div>
        <div id="dockwrap"></div>
        <div id="overlay"></div>
        <div id="toast"></div>
        <div id="saver"></div>
      </div>`;
    this._root = sr.getElementById("hd");
    this._bgEl = sr.getElementById("bg");
    this._bodyEl = sr.getElementById("body");
    this._dockEl = sr.getElementById("dockwrap");
    this._ovEl = sr.getElementById("overlay");
    this._saverEl = sr.getElementById("saver");
    this._toastEl = sr.getElementById("toast");

    this._root.addEventListener("click", (e) => this._onClick(e));
    this._root.addEventListener("pointerdown", (e) => this._onPointerDown(e), { passive: false });
    this._root.addEventListener("input", (e) => this._onInput(e));
    for (const ev of ["pointerdown", "keydown", "wheel", "touchstart"])
      this._root.addEventListener(ev, () => this._wake(), { passive: true, capture: true });
    this._root.addEventListener("touchstart", (e) => this._touchStart(e), { passive: true });
    this._root.addEventListener("touchend", (e) => this._touchEnd(e), { passive: true });
  }

  /* -------------------------------------------------------------- render */

  _scheduleRender() {
    if (this._busy) return;
    clearTimeout(this._rt);
    this._rt = setTimeout(() => this._render(), 120);
  }

  _ctx(model) {
    const s = this._store;
    const card = CARD_COLORS.find((c) => c.id === s.get("card")) || CARD_COLORS[0];
    const acc = ACCENT_COLORS.find((c) => c.id === s.get("accent")) || ACCENT_COLORS[0];
    return {
      hass: this._hass, cfg: this._cfg, store: s, version: DK_VER,
      now: new Date(), accent: acc.hex, cardColor: card.hex,
      layout: this._phone && s.get("layout") === "sidebar" ? "grid" : s.get("layout"),
      view: this._st.view, edit: this._st.edit,
      canEdit: s.writable || s.perDevice,
      canWrite: s.writable || s.perDevice,
      roomSel: this._st.roomSel, sidebarSel: this._st.sidebarSel,
      focusPage: this._st.focusPage, collapsed: this._st.collapsed,
      drag: this._st.drag, forecast: this._forecast, agenda: this._agenda,
      calendar: this._calendar, calMonth: this._st.calMonth, calSel: this._st.calSel,
      setSec: this._st.setSec, playerEid: this._st.playerEid,
      pickerScope: this._st.pickerScope, pickerMode: this._st.pickerMode,
      pickerQ: this._st.pickerQ, pickerDomain: this._st.pickerDomain,
      scopeIds: this._st.scopeIds,
      confirm: this._st.confirm, isDefaultPanel: this._isDefaultPanel(),
      cardCfg: this._st.cardCfgT,
      media: this._media, browse: this._browse, editScope: this._currentScope(),
      searchQ: this._st.searchQ, attention: this._attention(model),
      atvSel: this._st.atvSel,
      visibleScopes: this._st.edit ? this._visibleScopes() : null,
      weather: this._weather(),
      groupLeader: this._st.groupLeader, browseTarget: this._st.browseTarget,
      detailEid: this._st.detailEid, detailRoom: this._st.detailRoom,
      history: this._history, priceHistory: this._priceHistory, timers: this._timers,
      model,
    };
  }

  _render() {
    if (!this._hass || !this._store || !this._root) return;
    /* Aldri skriv om DOM-en midt i en dra-operasjon: morph gjenbruker noder
       etter indeks, så en render her ville tilbakestilt rekkefølgen og
       lagret feil resultat. Klokketikken traff dette hvert sekund. */
    if (this._busy) { this._pendingRender = true; return; }
    const w = this.clientWidth || window.innerWidth;
    const phone = w > 0 && w < 640;
    if (phone !== this._phone) { this._phone = phone; this._cache.body = null; this._cache.dock = null; }

    const model = buildModel(this._hass, this._cfg, this._store);
    this._model = model;
    const ctx = this._ctx(model);

    /* CSS-variabler */
    this._root.style.setProperty("--accent", ctx.accent);
    this._root.style.setProperty("--cardon", ctx.cardColor);
    this._root.classList.toggle("edit", !!this._st.edit);
    this._root.classList.toggle("embedded", true);
    this._root.classList.toggle("phone", phone);
    /* Høy kontrast gjør kortflatene tettere og teksten sterkere — nødvendig
       på de lyse og de mest lavkontrast-bakgrunnene. */
    this._root.classList.toggle("hicon", !!this._store.get("hiContrast"));

    /* bakgrunn */
    const warm = this._store.get("bgAuto") ? model.warmth : 0.35;
    const bgId = this._store.get("background");
    const bg = bgCss(bgId, warm);
    if (bg !== this._cache.bg) {
      this._bgEl.style.background = bg;
      /* Mal også VERTSELEMENTET, slik at et område som ligger utenfor .hd
         (panelet er høyere enn innholdet, eller man scroller forbi) aldri
         viser Home Assistants hvite bakgrunn. */
      const base = bgBase(bgId, warm);
      this.style.background = base;
      try { this.parentNode?.host?.style?.setProperty("--deckify-bg", base); } catch (e) {}
      this._cache.bg = bg;
    }
    /* Lyse temaer snur tekst- og flatefargene. */
    const light = isLightBg(bgId);
    if (light !== this._cache.light) {
      this._root.classList.toggle("light", light);
      this._cache.light = light;
    }

    /* hovedinnhold */
    const html = this._viewHtml(ctx, model);
    if (html !== this._cache.body) { morph(this._bodyEl, html); this._cache.body = html; }

    const dh = this._st.view === "home" && ctx.layout === "focus" && false ? "" : dock(ctx, model);
    if (dh !== this._cache.dock) { morph(this._dockEl, dh); this._cache.dock = dh; }

    /* overlegg */
    const oh = this._overlayHtml(ctx, model);
    if (oh !== this._cache.ov) {
      const wasOpen = !!this._cache.ov;
      morph(this._ovEl, oh);
      this._ovEl.classList.toggle("open", !!oh);
      this._cache.ov = oh;
      if (!wasOpen && oh) {
        const q = this._ovEl.querySelector("#pickq");
        const target = q || this._ovEl.querySelector('[data-act="closeoverlay"]')
          || this._ovEl.querySelector("input, [tabindex]");
        if (target) {
          if (!target.hasAttribute("tabindex") && !q) target.setAttribute("tabindex", "0");
          try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
        }
        if (q) q.setSelectionRange(q.value.length, q.value.length);
      }
    }

    /* varseltekst */
    const th = this._st.toast ? `<div class="toastbox">${hEsc(this._st.toast)}</div>` : "";
    if (th !== this._cache.toast) { morph(this._toastEl, th); this._cache.toast = th; }

    /* skjermsparer */
    const sh = this._st.saverOn ? saverView(ctx, model) : "";
    if (sh !== this._cache.saver) { morph(this._saverEl, sh); this._cache.saver = sh; }
    this._saverEl.classList.toggle("on", !!this._st.saverOn);
    /* Skjermspareren skal følge temaet, ikke være en nesten svart plate:
       samme gradient som dashbordet, bare uten innholdet oppå. */
    if (this._st.saverOn && this._cache.bg) this._saverEl.style.background = this._cache.bg;
    this._a11y();
    this._syncUrl(false);
  }

  /** Gjør klikkbare data-act-elementer tilgjengelige for tastatur. */
  _a11y() {
    if (!this._root) return;
    for (const el of this._root.querySelectorAll("[data-act]")) {
      if (["INPUT", "TEXTAREA", "BUTTON", "A", "SELECT"].includes(el.tagName)) continue;
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
      if (!el.hasAttribute("role")) el.setAttribute("role", "button");
    }
  }

  _viewHtml(ctx, model) {
    const v = this._st.view;
    if (v === "home") {
      const l = ctx.layout;
      if (l === "start") return viewStart(ctx, model);
      if (l === "sidebar") return viewHomeSidebar(ctx, model);
      if (l === "list") return viewHomeList(ctx, model);
      if (l === "focus") return viewHomeFocus(ctx, model);
      return viewHomeGrid(ctx, model);
    }
    if (v === "rooms") return viewRooms(ctx, model);
    if (v === "media") return viewMediaPage(ctx, model, header(ctx, model));
    if (v === "security") return viewSecurity(ctx, model);
    if (v === "attention") return header(ctx, model) + viewAttention(ctx, model);
    if (v === "energy") return viewEnergy(ctx, model, header(ctx, model));
    if (v === "house") return viewHouse(ctx, model, header(ctx, model));
    if (v.startsWith("page:")) {
      const p = (this._store.get("dockPages") || []).find((x) => "page:" + x.id === v);
      return p ? viewCustom(ctx, model, p) : `<div class="empty">Siden finnes ikke.</div>`;
    }
    return viewHomeGrid(ctx, model);
  }

  /** Tilsyn-telleren går gjennom alle entiteter — cache den i 20 s. */
  /* Vær med Open-Meteo-reserve. Cachet i weather.js; her holder vi bare
     styr på at en vellykket reservehenting utløser én ny tegning. */
  _weather() {
    const base = { hass: this._hass, cfg: this._cfg };
    return weatherData({ ...base,
      forecastHourly: this._forecast?.hourly, forecastDaily: this._forecast?.daily },
      () => { this._cache.body = null; this._cache.head = null; this._render(); });
  }

  _attention(model) {
    const now = Date.now();
    if (this._attCache && now - this._attCache.t < 20000) return this._attCache.v;
    let v = { total: 0, urgent: 0, action: 0 };
    try { v = attentionCount(this._ctxBare(model), model); } catch (e) {}
    this._attCache = { t: now, v };
    return v;
  }

  /* Minimal ctx til tellingen — unngår uendelig rekursjon via _ctx(). */
  _ctxBare(model) {
    return { hass: this._hass, cfg: this._cfg, store: this._store };
  }

  _overlayHtml(ctx, model) {
    switch (this._st.overlay) {
      case "weather": return weatherSheet(ctx);
      case "calendar": return calendarSheet(ctx);
      case "todo": return todoSheet(ctx);
      case "settings": return settingsSheet(ctx, model);
      case "player": return playerSheet(ctx);
      case "picker": return pickerSheet(ctx, model);
      case "confirm": return confirmSheet(ctx);
      case "group": return groupSheet(ctx, model);
      case "browse": return browseSheet(ctx, model);
      case "detail": return detailSheet(ctx, model);
      case "search": return searchSheet(ctx, model);
      case "appletv": return appleTVSheet(ctx, model);
      case "cardcfg": return cardConfigSheet(ctx, model);
      default: return "";
    }
  }

  /* ---------------------------------------------------------------- tick */

  _onTick() {
    if (document.hidden) return;
    const sec = this._store?.get("showSeconds");
    /* Sekunder. `saverSec` erstattet den gamle minutt-nøkkelen nettopp fordi
       30 sekunder ikke kunne uttrykkes i hele minutter. */
    const saverSec = this._store?.get("saverSec") || 0;
    if (saverSec && this._isPanel && !this._st.saverOn && !this._st.edit &&
        !this._st.overlay && Date.now() - this._lastInput > saverSec * 1000) {
      this._st.saverOn = true;
    }
    /* klokka og spillerposisjon må oppdateres selv uten tilstandsendring */
    if (this._st.saverOn || sec || this._st.overlay === "player" || new Date().getSeconds() === 0)
      this._render();
  }

  _wake() {
    this._lastInput = Date.now();
    if (this._st.saverOn) { this._st.saverOn = false; this._render(); }
  }

  /* ----------------------------------------------------------- datakilder */

  _clearForecast() {
    this._forecastGen++;
    for (const u of this._forecastUnsub) { try { u(); } catch (e) {} }
    this._forecastUnsub = [];
    this._forecastEntity = null;
    this._forecast = { hourly: [], daily: [] };
  }

  async _subscribeForecast() {
    const eid = this._cfg.weatherEntity;
    if (eid === this._forecastEntity && this._forecastUnsub.length) return;
    this._clearForecast();
    const gen = this._forecastGen;
    this._forecastEntity = eid;
    if (!eid || !this._hass?.connection || !this._active) return;
    for (const type of ["hourly", "daily"]) {
      try {
        const un = await this._hass.connection.subscribeMessage(
          (msg) => {
            if (gen !== this._forecastGen || this._cfg.weatherEntity !== eid) return;
            this._forecast[type] = msg.forecast || [];
            if (this._st.overlay === "weather") this._render();
          },
          { type: "weather/subscribe_forecast", forecast_type: type, entity_id: eid }
        );
        if (gen !== this._forecastGen || !this._active || this._cfg.weatherEntity !== eid) {
          try { un(); } catch (e) {}
          return;
        }
        this._forecastUnsub.push(un);
      } catch (e) { console.warn("[Deckify] værvarsel", type, e); }
    }
  }

  async _loadCalendar() {
    const saved = this._store?.get("calendars");
    const cals = saved === null || saved === undefined ? this._cfg.calendars : saved;
    if (!cals?.length) {
      this._calendar = { events: [], calendars: [] };
      this._agenda.todayCount = 0;
      this._render();
      return;
    }
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const events = [];
    for (const c of cals) {
      try {
        const res = await this._hass.callApi("GET",
          `calendars/${c}?start=${from.toISOString()}&end=${to.toISOString()}`);
        for (const e of res || []) {
          const allDay = !!e.start?.date;
          events.push({
            cal: c, calName: nameOf(this._hass, this._cfg, c),
            summary: e.summary || "(uten navn)",
            start: e.start?.dateTime || e.start?.date,
            end: e.end?.dateTime || e.end?.date,
            allDay, location: e.location || "",
          });
        }
      } catch (err) { console.warn("[Deckify] kalender", c, err); }
    }
    this._calendar = { events, calendars: cals };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tm = new Date(today); tm.setDate(tm.getDate() + 1);
    this._agenda.todayCount = events.filter((e) => {
      const s = new Date(e.start);
      return s >= today && s < tm;
    }).length;
    this._render();
  }

  async _loadTodo() {
    const eid = this._store?.get("todoList") ?? this._cfg.todoEntity;
    if (!eid) {
      this._agenda.todoItems = [];
      this._agenda.todoPending = 0;
      this._agenda.todoOverdue = 0;
      this._render();
      return;
    }
    try {
      const res = await this._hass.callWS({ type: "todo/item/list", entity_id: eid });
      const items = res?.items || [];
      this._agenda.todoItems = items;
      const now = new Date();
      const pend = items.filter((i) => i.status !== "completed");
      this._agenda.todoPending = pend.length;
      this._agenda.todoOverdue = pend.filter((i) => i.due && new Date(i.due) < now).length;
      this._render();
    } catch (e) { console.warn("[Deckify] gjøremål", e); }
  }

  /* --------------------------------------------------------------- kiosk */

  _isDefaultPanel() {
    try { return this._hass.defaultPanel === this._panelPath(); } catch (e) { return false; }
  }
  _panelPath() {
    const p = location.pathname.split("/").filter(Boolean);
    return p[0] || "lovelace";
  }

  _applyKiosk() {
    const hideSb = this._store.get("hideSidebar");
    const hideHd = this._store.get("hideHeader");

    /* «auto» gir sidemenyen tilbake til HAs egen oppførsel når brukeren
       skrur kioskvalget av. Uten dette ble sidefeltet stående skjult. */
    if (hideSb) {
      fireEvent(this, "hass-dock-sidebar", { dock: "always_hidden" });
      this._kioskSb = true;
    } else if (this._kioskSb) {
      fireEvent(this, "hass-dock-sidebar", { dock: "auto" });
      this._kioskSb = false;
    }

    const apply = () => {
      if (!this._active) return;
      const host = document.querySelector("home-assistant")?.shadowRoot;
      const header = deepQuery(host, "app-header");
      if (header) {
        if (hideHd) header.style.setProperty("display", "none", "important");
        else header.style.removeProperty("display");
        if (hideHd) this._hideHeaderEl = header;
        else if (this._hideHeaderEl === header) this._hideHeaderEl = null;
      }
      const root = deepQuery(host, "hui-root");
      const sr = root?.shadowRoot;
      if (sr) {
        let st = sr.getElementById("deckify-kiosk");
        if (!st) {
          st = document.createElement("style");
          st.id = "deckify-kiosk";
          sr.appendChild(st);
        }
        st.textContent = hideHd
          ? ".header, app-header, .toolbar { display:none !important } #view { min-height:100vh !important; padding-top:0 !important }"
          : "";
        this._kioskStyle = st;
      }
      return !!(header || sr);
    };
    if (apply()) return;
    clearTimeout(this._kioskT);
    this._kioskT = setTimeout(() => { this._kioskT = null; apply(); }, 1200);
  }

  /* ------------------------------------------------------------ hendelser */

  _onKey(e) {
    if (e.key === "Escape" && this._st.overlay) {
      this._st.overlay = null;
      this._st.pickerQ = "";
      this._st.confirm = null;
      this._render();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      const active = this.shadowRoot.activeElement;
      if (active?.dataset?.act &&
          !["INPUT", "TEXTAREA", "BUTTON", "A", "SELECT"].includes(active.tagName)) {
        e.preventDefault();
        active.click();
        return;
      }
    }
    if (e.key !== "Tab" || !this._st.overlay) return;
    const nodes = [...this._ovEl.querySelectorAll(
      '[data-act],input,textarea,button,select,[tabindex="0"]'
    )].filter((el) => !el.disabled && el.getClientRects().length);
    if (!nodes.length) return;
    const active = this.shadowRoot.activeElement;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (!active || !this._ovEl.contains(active)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  _onInput(e) {
    const t = e.target;
    if (!t) return;
    if (t.id === "pickq") {
      this._st.pickerQ = t.value;
      clearTimeout(this._pq);
      this._pq = setTimeout(() => this._render(), 180);
    } else if (t.dataset && t.dataset.sepinput) {
      const id = t.dataset.sepinput;
      this._store.patch({ seps: { ...(this._store.data.seps || {}), [id]: t.value } });
      return;                      /* ingen render — ville stjålet fokus */
    } else if (t.dataset?.cardinput) {
      /* Som gruppenavn: lagre uten å rendre, ellers mister feltet fokus
         midt i et ord. Morph beholder INPUT-noden, så teksten står. */
      const tgt = this._st.cardCfgT;
      if (tgt) {
        const k = t.dataset.cardinput;
        this._store.setCardCfg(tgt.scope, tgt.id, { [k]: t.value.trim() || null });
        this._cache.body = null;
      }
      return;
    } else if (t.id === "searchq") {
      this._st.searchQ = t.value;
      clearTimeout(this._sq);
      this._sq = setTimeout(() => this._render(), 110);
    }
  }

  _touchStart(e) { this._tsX = e.touches[0]?.clientX; this._tsY = e.touches[0]?.clientY; }
  _touchEnd(e) {
    if (this._st.edit || this._st.overlay) return;
    if (this._store.get("layout") !== "focus" || this._st.view !== "home") return;
    const x = e.changedTouches[0]?.clientX, y = e.changedTouches[0]?.clientY;
    if (this._tsX == null || x == null) return;
    const dx = x - this._tsX, dy = y - this._tsY;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) {
      this._focusPage(dx < 0 ? 1 : -1);
    }
  }

  /* --------------------------------------------------------------- ruting */

  /** Hash-URL for gjeldende visning. Hash brukes fordi panelet allerede eier
      stien sin; vi vil ikke kollidere med Home Assistants egen ruter. */
  _urlForState() {
    const v = this._st.view;
    if (v === "home") {
      const layout = this._store.get("layout");
      if (layout === "sidebar" && this._st.sidebarSel &&
          this._st.sidebarSel !== "overview")
        return "#/sidebar/" + encodeURIComponent(this._st.sidebarSel);
      if (layout === "focus")
        return "#/focus/" + encodeURIComponent(String(this._st.focusPage || 0));
      return "";
    }
    if (v === "rooms")
      return "#/rooms" + (this._st.roomSel
        ? "/" + encodeURIComponent(this._st.roomSel) : "");
    if (v.startsWith("page:"))
      return "#/page/" + encodeURIComponent(v.slice(5));
    return "#/" + encodeURIComponent(v);
  }

  /** Les hash-URLen og sett visning/rom før første render. */
  _applyUrl() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean).map((p) => {
      try { return decodeURIComponent(p); } catch (e) { return p; }
    });
    const route = parts[0] || "home";
    if (route === "rooms") {
      this._st.view = "rooms";
      this._st.roomSel = parts[1] || null;
    } else if (route === "page" && parts[1]) {
      this._st.view = "page:" + parts[1];
    } else if (route === "sidebar") {
      this._st.view = "home";
      this._st.sidebarSel = parts[1] || "overview";
    } else if (route === "focus") {
      this._st.view = "home";
      this._st.focusPage = clamp(Number(parts[1]) || 0, 0, 999);
    } else if (["home", "media", "security", "attention", "energy", "house"].includes(route)) {
      this._st.view = route;
    } else if (route === "start") {
      this._st.view = "home";
    } else {
      this._st.view = "home";
    }
    this._st.edit = false;
  }

  _syncUrl(push = false) {
    if (!this._store) return;
    const hash = this._urlForState();
    if ((location.hash || "") === hash) return;
    try {
      const url = hash || (location.pathname + location.search);
      if (push) history.pushState(null, "", url);
      else history.replaceState(null, "", url);
    } catch (e) {}
  }

  _focusPage(d) {
    const n = (this._model?.rooms.length || 0) + 1;
    this._st.focusPage = clamp((this._st.focusPage || 0) + d, 0, n - 1);
    this._syncUrl(true);
    this._render();
  }

  _onPointerDown(e) {
    const path = e.composedPath();
    const slider = path.find((n) => n.dataset?.slider);
    if (slider) { e.preventDefault(); return this._sliderDrag(e, slider); }

    if (this._st.edit) {
      const node = path.find((n) => n.classList && DRAGGABLE.some((cl) =>
        n.classList.contains(cl)) &&
        !n.classList.contains("addcard") && !n.classList.contains("dashed") &&
        !n.classList.contains("addrow") && !n.classList.contains("head"));
      const ctl = path.find((n) => ["hide", "big", "cardcfg", "adddevices", "addscenes",
        "addchips", "toggleedit", "unhide", "resetorder", "overlay"].includes(n.dataset?.act));
      /* ingen preventDefault her — dra starter først etter 8 px, så
         trykk på − og pil-knappene fungerer som vanlige klikk */
      const handle = path.find((n) => n.classList?.contains("grip"));
      /* Med finger må man ta i håndtaket; ellers skal sveipet rulle siden. */
      if (e.pointerType === "touch" && !handle) return;
      if (node && !ctl) return this._dragCard(e, node, { handle: !!handle });
      return;
    }

    /* kort med dra-slider: horisontal dra = juster, trykk = toggle,
       langtrykk = detaljpanel. Vertikal bevegelse scroller siden. */
    const sldCard = path.find((n) => n.dataset?.cardslider);
    const tapCard = path.find((n) => n.dataset?.act === "tap" || n.dataset?.act === "player");
    if (!sldCard && !tapCard) return;

    const eid = (sldCard || tapCard).dataset.e;
    const kind = sldCard?.dataset?.cardslider;
    const startX = e.clientX, startY = e.clientY;
    let mode = null;                 /* null -> "slide" | "hold" */
    this._holdFired = false;

    const holdTgt = this._cardTargetOf(path);
    const holdCfg = holdTgt ? this._store.cardCfg(holdTgt.scope, holdTgt.id) : null;

    const holdT = setTimeout(() => {
      if (mode) return;
      mode = "hold";
      this._holdFired = true;
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (x) {}
      if (holdCfg && holdCfg.hold && holdCfg.hold !== "default") {
        this._runCardAct(holdCfg, "hold", eid);
      } else {
        this._openDetail(eid);
      }
    }, HOLD_MS);

    const valueAt = (ev) => {
      const r = sldCard.getBoundingClientRect();
      return clamp(((ev.clientX - r.left) / r.width) * 100, 0, 100);
    };

    const paint = (v) => {
      const bar = sldCard.querySelector(".minibar i");
      if (bar) bar.style.width = v + "%";
      const tag = sldCard.querySelector(".dragval");
      if (tag) {
        tag.textContent = this._sliderLabel(eid, kind, v);
        tag.classList.add("show");
      }
    };

    const move = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!mode) {
        if (kind && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
          mode = "slide";
          clearTimeout(holdT);
          this._busy = true;
          sldCard.classList.add("sliding");
          sldCard.setPointerCapture?.(e.pointerId);
        } else if (Math.abs(dx) + Math.abs(dy) > 14) {
          clearTimeout(holdT);      /* scroll/drag et annet sted */
          mode = "cancel";
        }
      }
      if (mode === "slide") { ev.preventDefault(); paint(valueAt(ev)); }
    };

    const up = (ev) => {
      clearTimeout(holdT);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (mode === "slide") {
        const v = valueAt(ev);
        sldCard.classList.remove("sliding");
        const tag = sldCard.querySelector(".dragval");
        if (tag) setTimeout(() => tag.classList.remove("show"), 700);
        this._commitCardSlider(eid, kind, v);
        this._busy = false;
        this._holdFired = true;                 /* hindre toggle på slipp */
        setTimeout(() => { this._holdFired = false; this._render(); }, 500);
      }
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  _sliderLabel(eid, kind, v) {
    if (kind === "settemp") {
      const a = this._hass.states[eid]?.attributes || {};
      const min = a.min_temp ?? 5, max = a.max_temp ?? 35;
      const step = a.target_temp_step || 0.5;
      const t = min + (max - min) * (v / 100);
      return (Math.round(t / step) * step).toFixed(step < 1 ? 1 : 0) + "°";
    }
    return Math.round(v) + " %";
  }

  _commitCardSlider(eid, kind, v) {
    const H = this._hass;
    switch (kind) {
      case "brightness":
        if (v < 2) callSvc(H, "light", "turn_off", { entity_id: eid });
        else callSvc(H, "light", "turn_on", { entity_id: eid, brightness_pct: Math.round(v) });
        break;
      case "cover":
        callSvc(H, "cover", "set_cover_position", { entity_id: eid, position: Math.round(v) });
        break;
      case "fanpct":
        callSvc(H, "fan", "set_percentage", { entity_id: eid, percentage: Math.round(v) });
        break;
      case "humidity":
        callSvc(H, "humidifier", "set_humidity", { entity_id: eid, humidity: Math.round(v) });
        break;
      case "volume":
        callSvc(H, "media_player", "volume_set", { entity_id: eid, volume_level: clamp(v / 100, 0, 1) });
        break;
      case "settemp": {
        const a = H.states[eid]?.attributes || {};
        const min = a.min_temp ?? 5, max = a.max_temp ?? 35;
        const step = a.target_temp_step || 0.5;
        const t = Math.round((min + (max - min) * (v / 100)) / step) * step;
        callSvc(H, "climate", "set_temperature", { entity_id: eid, temperature: t });
        break;
      }
      default: break;
    }
  }

  /** Les en punktbanet nøkkel i serveroppsettet, f.eks. "scenes.max". */
  _readPath(path) {
    let node = this._store.server || {};
    for (const part of String(path).split(".")) {
      if (node == null) return undefined;
      node = node[part];
    }
    return node;
  }

  /** Skriv en punktbanet nøkkel i serveroppsettet. */
  async _patchPath(path, value) {
    const parts = String(path).split(".");
    const patch = {};
    let node = patch;
    for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]] = {};
    node[parts[parts.length - 1]] = value;
    await this._store.patchServer(patch);
    this._applyServerConfig();
  }

  /** Kortet (med scope og id) som et klikk stammer fra, hvis noe. */
  _cardTargetOf(path) {
    const n = path.find((x) => x?.dataset?.cardid);
    if (!n) return null;
    return { scope: n.dataset.cardscope || this._currentScope(), id: n.dataset.cardid };
  }

  /** Standard trykk, med kortets egen trykkhandling når den er satt. */
  _tapDefault(cc, eid) {
    if (cc && cc.tap && cc.tap !== "default") return this._runCardAct(cc, "tap", eid);
    if (!eid) return;
    const d = domainOf(eid);
    if (d === "media_player") {
      /* En Apple TV er en fjernkontroll, ikke en høyttaler — full spiller
         gir ingen mening der. Fjernkontrollen lå tidligere BARE som en brikke
         i Startskjerm-layouten, så den var i praksis utilgjengelig. */
      if (isAppleTV(this, eid)) {
        this._st.atvSel = eid; this._st.overlay = "appletv"; this._render(); return;
      }
      this._st.playerEid = eid; this._st.overlay = "player"; this._render(); return;
    }
    /* Knapper har press, ikke toggle. */
    if (d === "button" || d === "input_button") {
      callSvc(this._hass, d, "press", { entity_id: eid });
      this._toast("Trykket " + nameOf(this._hass, this._cfg, eid));
      return;
    }
    /* Sensorer, valg, tallverdier og lignende har ingen av/på-tjeneste.
       Da er detaljpanelet det eneste fornuftige svaret på et trykk. */
    if (!TOGGLE_DOMAINS.has(d)) return this._openDetail(eid);
    if (this._needsConfirm(eid)) return this._askConfirm(eid);
    toggleEntity(this._hass, eid);
  }

  /** Utfør en kortinnstilt handling. */
  _runCardAct(cc, kind, eid) {
    const act = cc[kind];
    if (!act || act === "none") return;
    const go = () => {
      switch (act) {
        case "toggle": toggleEntity(this._hass, eid); break;
        case "detail": this._openDetail(eid); break;
        case "more-info": fireEvent(this, "hass-more-info", { entityId: eid }); break;
        case "run": {
          const dom = domainOf(eid);
          const p = dom === "scene" ? callSvc(this._hass, "scene", "turn_on", { entity_id: eid })
            : dom === "script" ? callSvc(this._hass, "script", "turn_on", { entity_id: eid })
            : dom === "automation" ? callSvc(this._hass, "automation", "trigger", { entity_id: eid })
            : callSvc(this._hass, dom, "press", { entity_id: eid });
          p.then((ok) => {
            if (ok) this._toast("Kjørte " + nameOf(this._hass, this._cfg, eid));
          });
          break;
        }
        case "navigate": this._navigate(cc.navigate); break;
        case "service": {
          const svc = String(cc.service || "");
          const [dom, name] = svc.split(".");
          if (!dom || !name) { this._toast("Ugyldig tjeneste: " + svc); break; }
          let data = {};
          if (cc.service_data) {
            try { data = JSON.parse(cc.service_data); }
            catch (err) { this._toast("Tjenestedata er ikke gyldig JSON"); break; }
          }
          if (eid && !data.entity_id) data.entity_id = eid;
          callSvc(this._hass, dom, name, data)
            .then((ok) => { if (ok) this._toast(svc + " sendt"); });
          break;
        }
        default: break;
      }
    };
    if (cc.confirm) {
      this._st.confirm = {
        title: "Er du sikker?",
        text: eid ? nameOf(this._hass, this._cfg, eid) : "Denne handlingen krever bekreftelse.",
        ok: "Ja, gjør det", run: go,
      };
      this._st.overlay = "confirm";
      this._render();
      return;
    }
    go();
  }

  /** «Gå til»: en HA-sti, eller en side inne i Deckify. */
  _navigate(target) {
    const t = String(target || "").trim();
    if (!t) return;
    if (t.startsWith("/")) {
      history.pushState(null, "", t);
      fireEvent(window, "location-changed", { replace: false });
      return;
    }
    if (t.startsWith("room:")) {
      this._st.view = "rooms"; this._st.roomSel = t.slice(5);
    } else {
      this._st.view = t;
    }
    this._st.overlay = null;
    this._syncUrl(true);
    this._render();
  }

  /* async fordi noen handlinger lagrer til tjeneren før de tegner på nytt.
     MERK: `node --check` godtar `await` i en ikke-async metode så snart fila
     inneholder `import` (den parses som modul med top-level await) —
     nettleseren gjør det IKKE. Derfor er dette fanget av check_imports.py. */
  async _onClick(e) {
    this._wake();
    const path = e.composedPath();
    /* klikk som stammer fra en slider skal ikke også åpne kortet */
    if (path.some((n) => n.dataset?.slider)) { e.stopPropagation(); return; }
    const node = path.find((n) => n.dataset && n.dataset.act);
    if (!node) return;
    const a = node.dataset.act;
    /* i redigeringsmodus styrer man ikke enheter ved et uhell */
    if (this._st.edit && ["tap", "toggle", "player", "scene", "roomtoggle", "room",
        "roomon", "roomoff", "allon", "alloff", "mp", "cover", "vac", "hvac",
        "temp", "detail", "secaction", "quickplay", "browse", "groupsheet"].includes(a)) {
      e.stopPropagation();
      return;
    }
    const d = node.dataset;
    e.stopPropagation();

    switch (a) {
      /* --- navigasjon --- */
      case "nav":
        this._st.view = d.v; this._st.edit = false;
        this._syncUrl(true); this._render();
        if (d.v === "energy") {
          if (this._cfg.powerSensor) this._loadHistory(this._cfg.powerSensor);
          this._loadPriceHistory();
        }
        break;
      case "room":
        this._st.view = "rooms"; this._st.roomSel = d.r;
        this._syncUrl(true); this._render(); break;
      case "selroom":
        this._st.roomSel = d.r; this._syncUrl(true); this._render(); break;
      case "sbnav":
        this._st.sidebarSel = d.r; this._syncUrl(true); this._render(); break;
      case "focusroom": {
        const i = this._model.rooms.findIndex((r) => r.id === d.r);
        this._st.focusPage = i + 1;
        this._syncUrl(true); this._render(); break;
      }
      case "focuspage": this._focusPage(Number(d.d)); break;
      case "collapse": {
        const s = this._st.collapsed;
        s.has(d.r) ? s.delete(d.r) : s.add(d.r);
        this._render(); break;
      }

      /* --- enhetsstyring --- */
      case "tap": {
        if (this._holdFired) { this._holdFired = false; break; }
        clearTimeout(this._holdT);
        const eid = d.e;
        const tgt = this._cardTargetOf(path);
        const cc = tgt ? this._store.cardCfg(tgt.scope, tgt.id) : null;

        /* Dobbelttrykk koster 320 ms ventetid på første trykk, så vi gjør
           det BARE for kort der brukeren faktisk har satt en handling. */
        if (cc && cc.dbl && cc.dbl !== "none") {
          const key = tgt.scope + "|" + tgt.id;
          if (this._dblKey === key && Date.now() - (this._dblT0 || 0) < 320) {
            clearTimeout(this._dblTimer);
            this._dblKey = null;
            this._runCardAct(cc, "dbl", eid);
            break;
          }
          this._dblKey = key;
          this._dblT0 = Date.now();
          clearTimeout(this._dblTimer);
          this._dblTimer = setTimeout(() => {
            this._dblKey = null;
            this._tapDefault(cc, eid);
          }, 320);
          break;
        }
        this._tapDefault(cc, eid);
        break;
      }
      case "toggle":
        if (this._needsConfirm(d.e)) { this._askConfirm(d.e); break; }
        toggleEntity(this._hass, d.e); break;
      case "more": this._openDetail(d.e); break;
      case "secaction": {
        const run = () => callSvc(this._hass,
          domainOf(d.e) === "input_boolean" ? "input_boolean" : "input_button",
          domainOf(d.e) === "input_boolean" ? "turn_on" : "press", { entity_id: d.e })
          .then((ok) => { if (ok) this._toast(d.title + " sendt"); });
        if (d.confirm) {
          this._st.confirm = {
            title: d.title + "?",
            text: "Dette lager faktisk lyd i sirener og høyttalere i noen sekunder.",
            ok: "Kjør testen", run,
          };
          this._st.overlay = "confirm"; this._render();
        } else {
          run();
        }
        break;
      }
      case "qrun": {
        const dom = domainOf(d.e);
        if (dom === "script") callSvc(this._hass, "script", "turn_on", { entity_id: d.e });
        else if (dom === "automation") callSvc(this._hass, "automation", "trigger", { entity_id: d.e });
        else callSvc(this._hass, dom, "press", { entity_id: d.e });
        node.classList.add("flash");
        setTimeout(() => node.classList.remove("flash"), 700);
        this._remember(d.e);
        break;
      }
      case "scene": {
        callSvc(this._hass, "scene", "turn_on", { entity_id: d.e });
        node.classList.add("flash");
        setTimeout(() => node.classList.remove("flash"), 700);
        break;
      }
      case "roomtoggle": {
        const r = this._model.rooms.find((x) => x.id === d.r);
        if (r?.lightIds.length)
          callSvc(this._hass, "homeassistant", r.lightsOn ? "turn_off" : "turn_on", { entity_id: r.lightIds });
        break;
      }
      case "roomon": case "roomoff": {
        const r = this._model.rooms.find((x) => x.id === d.r);
        if (r?.lightIds.length)
          callSvc(this._hass, "homeassistant", a === "roomon" ? "turn_on" : "turn_off", { entity_id: r.lightIds });
        break;
      }
      case "allon": case "alloff": {
        const ids = this._model.allLights;
        if (ids.length) callSvc(this._hass, "homeassistant", a === "allon" ? "turn_on" : "turn_off", { entity_id: ids });
        break;
      }
      case "lightcolor": {
        const rgb = hexToRgb(d.c);
        callSvc(this._hass, "light", "turn_on", { entity_id: d.e, rgb_color: rgb });
        break;
      }
      case "cover": {
        const svc = { open: "open_cover", close: "close_cover", stop: "stop_cover" }[d.s];
        callSvc(this._hass, "cover", svc, { entity_id: d.e }); break;
      }
      case "hvac":
        callSvc(this._hass, "climate", "set_hvac_mode", { entity_id: d.e, hvac_mode: d.m }); break;
      case "temp": {
        const st = this._hass.states[d.e];
        const cur = st?.attributes?.temperature ?? 20;
        const step = st?.attributes?.target_temp_step || 0.5;
        const delta = Number(d.d) < 0 ? -Math.max(step, 0.5) : Math.max(step, 0.5);
        const next = clamp(Math.round((cur + delta) * 2) / 2,
          st?.attributes?.min_temp ?? 5, st?.attributes?.max_temp ?? 35);
        callSvc(this._hass, "climate", "set_temperature", { entity_id: d.e, temperature: next });
        break;
      }
      case "vac":
        callSvc(this._hass, "vacuum", d.s, { entity_id: d.e }); break;
      case "mp":
        callSvc(this._hass, "media_player", d.s, { entity_id: d.e }); break;
      case "vol": {
        const st = this._hass.states[d.e];
        const v = clamp((st?.attributes?.volume_level ?? 0.3) + Number(d.d) / 100, 0, 1);
        callSvc(this._hass, "media_player", "volume_set", { entity_id: d.e, volume_level: v });
        break;
      }
      case "shuffle": {
        const st = this._hass.states[d.e];
        callSvc(this._hass, "media_player", "shuffle_set", { entity_id: d.e, shuffle: !st?.attributes?.shuffle });
        break;
      }
      case "repeat": {
        const st = this._hass.states[d.e];
        const cur = st?.attributes?.repeat || "off";
        const next = cur === "off" ? "all" : cur === "all" ? "one" : "off";
        callSvc(this._hass, "media_player", "repeat_set", { entity_id: d.e, repeat: next });
        break;
      }
      case "player": this._st.playerEid = d.e; this._st.overlay = "player"; this._render(); break;
      case "selplayer": this._st.playerEid = d.e; this._render(); break;

      /* --- overlegg --- */
      case "overlay":
        this._st.overlay = d.o;
        if (d.o === "calendar") { this._st.calMonth = new Date(); this._st.calSel = new Date().toISOString(); }
        this._render(); break;
      case "closeoverlay":
        this._st.overlay = null; this._st.pickerQ = ""; this._render(); break;
      case "calmonth": {
        const m = new Date(this._st.calMonth);
        m.setMonth(m.getMonth() + Number(d.d));
        this._st.calMonth = m; this._render(); break;
      }
      case "caltoday":
        this._st.calMonth = new Date(); this._st.calSel = new Date().toISOString(); this._render(); break;
      case "calday":
        this._st.calSel = d.d; this._render(); break;
      case "todotoggle": {
        const eid = this._store.get("todoList") || this._cfg.todoEntity;
        const item = this._agenda.todoItems.find((i) => i.uid === d.uid);
        if (!item) break;
        callSvc(this._hass, "todo", "update_item", {
          entity_id: eid, item: item.uid,
          status: item.status === "completed" ? "needs_action" : "completed",
        }).then(() => setTimeout(() => this._loadTodo(), 500));
        break;
      }

      /* --- redigering --- */
      case "toggleedit":
        if (!this._store.writable && !this._store.perDevice) {
          this._toast("Bare administratorer kan redigere dashbordet");
          break;
        }
        this._st.edit = !this._st.edit; this._render(); break;
      case "editnow":
        if (!this._store.writable && !this._store.perDevice) {
          this._toast("Bare administratorer kan redigere dashbordet");
          break;
        }
        this._st.edit = true; this._st.overlay = null; this._render(); break;
      case "search":
        this._st.overlay = "search"; this._st.searchQ = "";
        this._render();
        this._focusSearch(0);
        break;
      case "searchopen":
        this._st.overlay = "detail"; this._st.detailEid = d.e;
        this._remember(d.e); this._render(); break;
      case "searchtoggle": {
        e.stopPropagation();
        const dom = d.e.split(".")[0];
        const svc = ["scene"].includes(dom) ? ["scene", "turn_on"]
          : ["script"].includes(dom) ? ["script", "turn_on"]
          : ["button", "input_button"].includes(dom) ? [dom, "press"]
          : ["homeassistant", "toggle"];
        callSvc(this._hass, svc[0], svc[1], { entity_id: d.e });
        this._remember(d.e);
        this._toast(nameOf(this._hass, this._cfg, d.e));
        break;
      }
      case "addsep": {
        const sc = d.scope || this._currentScope();
        const id = "sep:" + Math.random().toString(36).slice(2, 9);
        const cur = this._scopeListRaw(sc);
        this._store.setOrder(sc, [...cur, id]);
        this._store.patch({ seps: { ...(this._store.data.seps || {}), [id]: "" } });
        this._cache.body = null; this._render();
        setTimeout(() => {
          const i = this.shadowRoot.querySelector(`[data-sepinput="${id}"]`);
          if (i) i.focus();
        }, 80);
        break;
      }
      case "delsep": {
        const sc = d.scope || this._currentScope();
        const cur = this._scopeListRaw(sc).filter((x) => x !== d.id);
        this._store.setOrder(sc, cur);
        const seps = { ...(this._store.data.seps || {}) };
        delete seps[d.id];
        this._store.patch({ seps });
        this._cache.body = null; this._render();
        break;
      }
      case "attexpand":
        this._store.patch({ attExpand: true }); this._cache.body = null;
        this._render(); break;
      case "attcollapse":
        this._store.patch({ attExpand: false }); this._cache.body = null;
        this._render(); break;
      case "appletv":
        this._st.overlay = "appletv";
        this._st.atvSel = d.e || this._st.atvSel || null;
        this._render(); break;
      case "atvsel":
        this._st.atvSel = d.e; this._cache.ov = null; this._render(); break;
      case "atvcmd": {
        if (!d.e) { this._toast("Ingen fjernkontroll koblet til"); break; }
        callSvc(this._hass, "remote", "send_command", { entity_id: d.e, command: d.v });
        /* ingen toast på navigasjon — det ville blinke ved hvert trykk */
        if (!["up", "down", "left", "right", "select"].includes(d.v))
          this._toast(ATV_LABEL[d.v] || d.v);
        break;
      }
      case "atvapp":
        callSvc(this._hass, "media_player", "select_source", { entity_id: d.e, source: d.v })
          .then((ok) => { if (ok) this._toast("Starter " + d.v); });
        break;
      case "atvlink": {
        const link = (this._cfg.deeplinks || [])[Number(d.i)];
        if (!link) break;
        callSvc(this._hass, "media_player", "play_media", {
          entity_id: d.e, media_content_type: "url", media_content_id: link.url,
        }).then((ok) => { if (ok) this._toast("Åpner " + link.name); });
        break;
      }
      case "searchroom":
        this._st.overlay = null; this._st.view = "rooms";
        this._st.roomSel = d.r; this._cache.body = null;
        this._syncUrl(true); this._render(); break;
      case "resetorder": {
        const scopes = this._visibleScopes();
        const o = { ...this._store.data.order };
        const hd = { ...this._store.data.hidden };
        const bg = { ...this._store.data.big };
        for (const sc of scopes) { delete o[sc]; delete hd[sc]; delete bg[sc]; }
        const sc = scopes[0];
        this._store.patch({ order: o, hidden: hd, big: bg });
        if (sc === "home" || sc === "start") {
          const o2 = { ...this._store.data.order }; delete o2["scenes"];
          const h2 = { ...this._store.data.hidden }; delete h2["scenes"];
          this._store.patch({ order: o2, hidden: h2 });
        }
        this._cache.body = null;
        this._toast("Rekkefølgen er nullstilt");
        break;
      }
      case "hide": {
        const scope = d.scope || this._currentScope();
        /* Scener MÅ skjules via `hidden`, ikke ved å fjernes fra
           rekkefølgen: autooppdagelsen legger nye scener til på slutten, og
           ville derfor hentet den tilbake med én gang. */
        if (scope === "home" && this._store.data.order["home"]) {
          const cur = visibleHomeTiles(this._ctx(this._model), this._model, scope);
          if (d.id.startsWith("dev:")) this._store.setOrder(scope, cur.filter((x) => x !== d.id));
          else this._store.toggleHidden(scope, d.id);
        } else {
          this._store.toggleHidden(scope, d.id);
        }
        /* Skjuler man kortet fra kortinnstillingene, skal arket lukkes. */
        if (this._st.overlay === "cardcfg") { this._st.overlay = null; this._st.cardCfgT = null; }
        this._cache.body = null;
        this._render(); break;
      }
      case "big":
        this._store.toggleBig(d.scope || this._currentScope(), d.id); this._render(); break;

      /* --- kortinnstillinger --- */
      case "cardcfg": {
        this._st.cardCfgT = { scope: d.scope || this._currentScope(), id: d.id };
        this._st.overlay = "cardcfg";
        this._render(); break;
      }
      case "cardset": {
        const t = this._st.cardCfgT;
        if (!t) break;
        let v = d.v;
        if (d.k === "confirm") v = v === "1";
        if (d.k === "size") this._store.setCardSize(t.scope, t.id, v);
        else this._store.setCardCfg(t.scope, t.id, { [d.k]: v === "" ? null : v });
        this._cache.body = null;
        this._render(); break;
      }
      case "cardreset": {
        const sc = d.scope || this._currentScope();
        const all = { ...(this._store.data.cards || {}) };
        const m = { ...(all[sc] || {}) };
        delete m[d.id];
        all[sc] = m;
        this._store.data.cards = all;
        const big = { ...(this._store.data.big[sc] || {}) };
        delete big[d.id];
        this._store.data.big = { ...this._store.data.big, [sc]: big };
        this._store.queueSave();
        this._cache.body = null;
        this._render();
        this._toast("Kortet er nullstilt");
        break;
      }
      case "unhide":
        for (const sc of this._visibleScopes()) this._store.unhideAll(sc);
        this._cache.body = null; this._render();
        this._toast("Skjulte elementer er hentet fram igjen");
        break;
      case "addtile": {
        /* Legg et rom-, system- eller mediakort inn i et skop. Brukes når
           dashbordet starter tomt og enhetsvelgeren ikke dekker romkort. */
        const sc = d.scope || this._currentScope();
        const cur = this._store.data.order[sc]
          || (sc === "home" ? visibleHomeTiles(this._ctx(this._model), this._model) : []);
        if (!cur.includes(d.id)) this._store.setOrder(sc, [...cur, d.id]);
        if (this._store.isHidden(sc, d.id)) this._store.toggleHidden(sc, d.id);
        this._cache.body = null;
        this._render(); break;
      }
      case "adddevices":
        this._openPicker(d.scope, "devices"); break;
      case "addchips":
        this._openPicker(d.scope, "devices"); break;
      case "addscenes":
        this._openPicker("scenes", "scenes"); break;
      case "pickdomain":
        this._st.pickerDomain = d.d || null; this._render(); break;
      case "pickclear":
        this._st.pickerQ = ""; this._render();
        setTimeout(() => {
          const q = this._ovEl?.querySelector("#pickq");
          if (q) q.focus();
        }, 40);
        break;
      case "searchclear":
        this._st.searchQ = ""; this._render(); this._focusSearch(0); break;
      case "pick": {
        const scope = this._st.pickerScope;
        const ctx = this._ctx(this._model);
        /* «start:summary» blander faste systemkort og enheter i samme rekkefølge-
           liste; ikke la _scopeList (som bare returnerer enhetene) overskrive den. */
        if (scope === "start:summary") {
          const cur = this._store.data.order[scope] || [];
          const has = cur.includes(d.e);
          const next = has ? cur.filter((x) => x !== d.e) : [...cur, d.e];
          if (this._store.isHidden(scope, d.e)) this._store.toggleHidden(scope, d.e);
          this._store.setOrder(scope, next);
          this._refreshScopeIds();
          this._cache.body = null;
          this._render(); break;
        }
        const cur = this._scopeList(scope);
        /* I hurtigvalgsraden finnes den samme entiteten i to former: som
           automatisk avlesning («pill:sensor.bad_temp») og som brikke
           brukeren har lagt til selv («sensor.bad_temp»). De må telle som
           ÉN, ellers legger et trykk på en sensor som allerede står der
           bare på en duplikat i stedet for å fjerne den. */
        if (scope.startsWith("chips:") && cur.includes("pill:" + d.e)) {
          this._store.setOrder(scope, cur.filter((x) => x !== "pill:" + d.e));
          this._store.toggleHidden(scope, "pill:" + d.e);
          this._refreshScopeIds();
          this._cache.body = null;
          this._render(); break;
        }
        /* på Hjem får entiteter prefiks «dev:» for å skilles fra romkort */
        const id = scope === "home" ? "dev:" + d.e : d.e;
        const has = cur.includes(id);
        const next = has ? cur.filter((x) => x !== id) : [...cur, id];
        if (this._store.isHidden(scope, id)) this._store.toggleHidden(scope, id);
        this._store.setOrder(scope, next);
        this._refreshScopeIds();
        this._cache.body = null;
        this._render(); break;
      }

      /* --- dashbordoppsett (speiler integrasjonens innstillinger) --- */
      case "cfgarea": {
        const all = Object.keys(this._hass.areas || {});
        const cur = (this._store.server?.areas || []);
        /* Tom liste betyr «alle». Fjerner man ett rom må lista derfor
           først materialiseres, ellers ville den fortsatt betydd alle. */
        const base = cur.length ? cur : all;
        const next = base.includes(d.id) ? base.filter((x) => x !== d.id) : [...base, d.id];
        /* Er alt valgt igjen, gå tilbake til «alle» så nye rom dukker opp selv. */
        const val = next.length === all.length ? [] : next;
        await this._store.patchServer({ areas: val });
        this._applyServerConfig();
        this._render(); break;
      }
      case "pagetoggle": {
        const all = ["start", "home", "rooms", "media", "house", "energy",
                     "security", "attention"];
        const cur = this._cfg.pages || [];
        const on = d.v === "1";
        /* behold den faste rekkefølgen, uansett hvilken vei man skrur */
        const next = all.filter((p) => on ? (cur.includes(p) || p === d.k)
                                          : (cur.includes(p) && p !== d.k));
        await this._store.patchServer({ pages: next.length ? next : ["home"] });
        this._applyServerConfig();
        if (!next.includes(this._st.view)) this._st.view = "home";
        this._cache.body = null; this._cache.dock = null;
        this._render(); break;
      }
      case "cfgnum": {
        await this._patchPath(d.k, Number(d.v));
        this._render(); break;
      }
      case "cfgtoggle": {
        /* data-v gir eksplisitt ny verdi — nødvendig for flagg som er AV
           som standard, der `undefined` ikke kan tolkes som «på». */
        const next = d.v !== undefined ? d.v === "1" : !(this._readPath(d.k) !== false);
        await this._patchPath(d.k, next);
        if (d.k === "per_device") {
          /* Slår man av eget oppsett per enhet, skal skjermen følge det
             delte igjen med én gang — ikke vise sin gamle lokale kopi. */
          if (!next) this._store.clearLocalLayout();
          await this._store.load();
          this._applyServerConfig();
        }
        this._cache.body = null;
        this._render(); break;
      }
      case "cfgunexclude": {
        const cur = (this._store.server?.exclude || []).filter((x) => x !== d.e);
        await this._store.patchServer({ exclude: cur });
        this._applyServerConfig();
        this._render();
        this._toast("Entiteten er tatt inn igjen"); break;
      }
      case "openintegration":
        this._navigate("/config/integrations/integration/deckify");
        break;
      case "autofill": {
        if (!this._store.writable) {
          this._toast("Bare administratorer kan fylle dashbordet");
          break;
        }
        await this._store.patchServer({ auto_fill: true });
        this._applyServerConfig();
        this._st.view = "home";
        this._st.edit = false;
        this._syncUrl(true);
        this._cache.body = null; this._cache.dock = null;
        this._render();
        this._toast(this._model?.rooms.length
          ? "Dashbordet er fylt automatisk"
          : "Fant ingen rom i Home Assistant — legg til rom først");
        break;
      }

      /* --- innstillinger --- */
      case "setsec": this._st.setSec = d.s; this._render(); break;
      case "setlayout": this._store.set("layout", d.l); this._render(); break;
      case "setcard": this._store.set("card", d.c); this._render(); break;
      case "setaccent": this._store.set("accent", d.c); this._render(); break;
      case "setbg": this._store.set("background", d.b); this._render(); break;
      case "settoggle": {
        const k = d.k;
        this._store.set(k, !this._store.get(k));
        if (k === "hideSidebar" || k === "hideHeader") this._applyKiosk();
        this._render(); break;
      }
      case "setsaver":
        this._store.set("saverSec", Number(d.m));
        this._lastInput = Date.now();          /* ikke start med én gang */
        this._render(); break;
      case "docktoggle": {
        const cur = new Set(this._store.get("dockHidden") || []);
        cur.has(d.k) ? cur.delete(d.k) : cur.add(d.k);
        this._store.set("dockHidden", [...cur]);
        if (cur.has(this._st.view)) this._st.view = "home";
        this._cache.dock = null; this._render(); break;
      }
      case "togglecal": {
        const cur = new Set(this._store.get("calendars") ?? this._cfg.calendars);
        cur.has(d.e) ? cur.delete(d.e) : cur.add(d.e);
        this._store.set("calendars", [...cur]);
        this._loadCalendar(); this._render(); break;
      }
      case "settodo":
        this._store.set("todoList", d.e); this._loadTodo(); this._render(); break;
      case "defaultpanel": {
        const want = this._isDefaultPanel() ? "lovelace" : this._panelPath();
        this._hass.callWS({ type: "frontend/get_user_data", key: "core" })
          .catch(() => ({ value: {} }))
          .then((r) => this._hass.callWS({
            type: "frontend/set_user_data", key: "core",
            value: { ...((r && r.value) || {}), defaultPanel: want },
          }))
          .then(() => { try { this._hass.defaultPanel = want; } catch (e) {} this._render(); })
          .catch((e) => console.warn("[Deckify] startskjerm", e));
        break;
      }
      case "newpage": {
        const pages = [...(this._store.get("dockPages") || [])];
        pages.push({ id: Math.random().toString(36).slice(2, 8), name: "Ny side " + (pages.length + 1), icon: "mdi:star-outline", entities: [] });
        this._store.set("dockPages", pages); this._render(); break;
      }
      case "delpage": {
        const pages = (this._store.get("dockPages") || []).filter((p) => p.id !== d.p);
        this._store.set("dockPages", pages);
        if (this._st.view === "page:" + d.p) this._st.view = "home";
        this._render(); break;
      }
      case "editpage":
        if (!this._store.writable && !this._store.perDevice) {
          this._toast("Bare administratorer kan redigere egne sider");
          break;
        }
        this._st.view = "page:" + d.p; this._st.overlay = null; this._st.edit = true;
        this._syncUrl(true); this._render(); break;
      case "reset": {
        if (!this._store.writable && !this._store.perDevice) {
          this._toast("Bare administratorer kan nullstille layouten");
          break;
        }
        this._st.confirm = {
          title: "Nullstille layouten?",
          text: "Rekkefølge, skjulte kort, størrelser, grupper og kortinnstillinger settes tilbake. Rom, sensorer, sider, farger, scener og filtre beholdes.",
          ok: "Nullstill layout", run: async () => {
            const ok = await this._store.resetLayout();
            this._st.overlay = null;
            this._st.edit = false;
            if (!ok) { this._toast("Kunne ikke nullstille layouten"); this._render(); return; }
            await this._store.load();
            this._applyServerConfig();
            this._render();
            this._toast("Layouten er nullstilt");
          },
        };
        this._st.overlay = "confirm"; this._render(); break;
      }
      case "resetall": {
        if (!this._store.writable && !this._store.perDevice) {
          this._toast("Bare administratorer kan nullstille dashbordet");
          break;
        }
        const local = this._store.perDevice;
        this._st.confirm = {
          title: "Nullstille hele dashbordet?",
          text: local
            ? "Dette nullstiller denne skjermens lokale oppsett: romvalg, sensorvalg, filtre, sider, scener, farger og egne sider. Enhetene i Home Assistant røres ikke."
            : "Dette sletter romvalg, sensorvalg, filtre, sider, scener, farger og egne sider for alle skjermer. Enhetene i Home Assistant røres ikke.",
          ok: "Nullstill alt", run: async () => {
            const ok = await this._store.resetAll();
            this._st.overlay = null;
            this._st.edit = false;
            if (!ok) { this._toast("Kunne ikke nullstille dashbordet"); this._render(); return; }
            await this._store.load();
            this._applyServerConfig();
            this._render();
            this._toast("Dashbordet er nullstilt");
          },
        };
        this._st.overlay = "confirm"; this._render(); break;
      }
      case "confirmyes": {
        const c = this._st.confirm;
        this._st.overlay = null; this._st.confirm = null;
        this._render();
        if (c?.run) c.run();
        break;
      }


      /* --- detaljpanel og kontroller der inne --- */
      case "detail": this._openDetail(d.e); break;
      case "moreinfo": this._st.overlay = null; this._render(); this._moreInfo(d.e); break;
      case "history":
        this._st.overlay = null; this._render();
        try { history.pushState(null, "", `/history?entity_id=${encodeURIComponent(d.e)}`);
              window.dispatchEvent(new CustomEvent("location-changed")); } catch (e) {}
        break;
      case "setbri":
        callSvc(this._hass, "light", "turn_on", { entity_id: d.e, brightness_pct: Number(d.v) });
        break;
      case "lighteffect":
        callSvc(this._hass, "light", "turn_on", { entity_id: d.e, effect: d.v }); break;
      case "coverpos":
        callSvc(this._hass, "cover", "set_cover_position",
          { entity_id: d.e, position: Number(d.v) }); break;
      case "preset":
        callSvc(this._hass, "climate", "set_preset_mode", { entity_id: d.e, preset_mode: d.m }); break;
      case "climatefan":
        callSvc(this._hass, "climate", "set_fan_mode", { entity_id: d.e, fan_mode: d.m }); break;
      case "fanpreset":
        callSvc(this._hass, domainOf(d.e), "set_preset_mode", { entity_id: d.e, preset_mode: d.m }); break;
      case "oscillate": {
        const st = this._hass.states[d.e];
        callSvc(this._hass, "fan", "oscillate",
          { entity_id: d.e, oscillating: !st?.attributes?.oscillating }); break;
      }
      case "fandir":
        callSvc(this._hass, "fan", "set_direction", { entity_id: d.e, direction: d.m }); break;
      case "vacspeed":
        callSvc(this._hass, "vacuum", "set_fan_speed", { entity_id: d.e, fan_speed: d.m }); break;
      case "selectopt":
        callSvc(this._hass, "select", "select_option", { entity_id: d.e, option: d.m }); break;
      case "timer": {
        const min = Number(d.m);
        this._setTimer(d.e, min);
        this._toast(`${nameOf(this._hass, this._cfg, d.e)} slås av om ${min} min`);
        break;
      }
      case "timeroff":
        this._clearTimer(d.e);
        this._toast("Timer avbrutt");
        break;

      /* --- media: grupper og utforsker --- */
      case "groupsheet":
        if (!d.e) break;
        this._st.groupLeader = d.e; this._st.overlay = "group"; this._render(); break;
      case "groupmember": {
        const leader = d.l, eid = d.e;
        const st = this._hass.states[leader];
        const members = (st?.attributes?.group_members || [leader]).slice();
        if (members.includes(eid)) {
          callSvc(this._hass, "media_player", "unjoin", { entity_id: eid });
        } else {
          callSvc(this._hass, "media_player", "join",
            { entity_id: leader, group_members: [...members.filter((x) => x !== leader), eid] });
        }
        setTimeout(() => this._render(), 1200);
        break;
      }
      case "groupall": {
        const leader = d.l;
        const all = groupable(this._ctx(this._model), this._model)
          .map((p) => p.eid).filter((e) => e !== leader);
        if (all.length) callSvc(this._hass, "media_player", "join",
          { entity_id: leader, group_members: all });
        setTimeout(() => this._render(), 1500);
        break;
      }
      case "ungroup": {
        const st = this._hass.states[d.l];
        const members = (st?.attributes?.group_members || []).filter((e) => e !== d.l);
        if (members.length) callSvc(this._hass, "media_player", "unjoin", { entity_id: members });
        setTimeout(() => this._render(), 1500);
        break;
      }
      case "ungroupall": {
        const gs = currentGroups(this._ctx(this._model), this._model);
        const ids = [...new Set(gs.flatMap((g) => g.members))];
        if (ids.length) callSvc(this._hass, "media_player", "unjoin", { entity_id: ids });
        setTimeout(() => this._render(), 1500);
        break;
      }
      case "browse":
        this._st.browseTarget = d.e || this._defaultTarget();
        this._st.overlay = "browse";
        this._browseRoot();
        break;
      case "browsetarget":
        this._st.browseTarget = d.e; this._render(); break;
      case "browsehome": this._browseRoot(); break;
      case "browseinto":
        this._browseInto(d.id, d.t, d.title); break;
      case "browseup": {
        const i = Number(d.i);
        const entry = this._browse.stack[i];
        this._browse.stack = this._browse.stack.slice(0, i);
        this._browseLoad(entry.id, entry.type, entry.title, false);
        break;
      }
      case "playitem":
        this._playMedia(d.id, d.t, d.title); break;
      case "quickplay":
        this._playMedia(d.id, d.t, null); break;

      default: break;
    }
  }



  /* --------------------------------------------------- detaljpanel */

  _openDetail(eid) {
    if (!eid) return;
    const d = domainOf(eid);
    this._st.detailEid = eid;
    this._st.detailRoom = this._st.view === "rooms" ? this._st.roomSel
      : (this._store.get("layout") === "sidebar" && this._st.sidebarSel !== "overview"
         ? this._st.sidebarSel : null);
    this._st.overlay = "detail";
    this._render();
    /* historikk trengs for sensor-/effektgrafen */
    if (d === "sensor") this._loadHistory(eid);
    else if (d === "switch" || d === "input_boolean") {
      const p = this._powerOf(eid);
      if (p) this._loadHistory(p);
    }
  }

  _powerOf(eid) {
    const did = this._hass.entities?.[eid]?.device_id;
    if (!did) return null;
    for (const [e2, r2] of Object.entries(this._hass.entities || {}))
      if (r2.device_id === did && e2.startsWith("sensor.") &&
          this._hass.states[e2]?.attributes?.device_class === "power") return e2;
    return null;
  }

  /* -------------------------------------------------------- historikk */

  async _loadHistory(eid, hours = 6, points = 90) {
    if (!eid || this._history[eid]) return;
    this._history[eid] = null;
    const start = new Date(Date.now() - hours * 3600e3).toISOString();
    try {
      const res = await this._hass.callApi("GET",
        `history/period/${start}?filter_entity_id=${encodeURIComponent(eid)}` +
        `&minimal_response&no_attributes`);
      const raw = (res && res[0]) || [];
      const pts = [];
      for (const r of raw) {
        const v = Number(r.state);
        if (!isFinite(v)) continue;
        pts.push({ t: new Date(r.last_changed || r.last_updated).getTime(), v });
      }
      /* jevn nedsampling til ~points punkter */
      let out = pts;
      if (pts.length > points) {
        const step = pts.length / points;
        out = [];
        for (let i = 0; i < points; i++) {
          const a = Math.floor(i * step), b = Math.floor((i + 1) * step);
          const slice = pts.slice(a, Math.max(b, a + 1));
          const avg = slice.reduce((s, x) => s + x.v, 0) / slice.length;
          out.push({ t: slice[0].t, v: avg });
        }
      }
      this._history = { ...this._history, [eid]: out };
    } catch (e) {
      console.warn("[Deckify] historikk", eid, e);
      this._history = { ...this._history, [eid]: [] };
    }
    this._render();
  }

  /** Strømpris siste døgn, én verdi per time. */
  async _loadPriceHistory() {
    const eid = this._cfg.priceSensor;
    if (!eid) {
      if (this._priceHistory.length) { this._priceHistory = []; this._render(); }
      return;
    }
    const start = new Date(Date.now() - 24 * 3600e3).toISOString();
    try {
      const res = await this._hass.callApi("GET",
        `history/period/${start}?filter_entity_id=${encodeURIComponent(eid)}` +
        `&minimal_response&no_attributes`);
      const raw = (res && res[0]) || [];
      const byHour = new Map();
      for (const r of raw) {
        const v = Number(r.state);
        if (!isFinite(v)) continue;
        const t = new Date(r.last_changed || r.last_updated);
        t.setMinutes(0, 0, 0);
        byHour.set(t.getTime(), v);
      }
      this._priceHistory = [...byHour.entries()].sort((a, b) => a[0] - b[0])
        .map(([t, v]) => ({ t, v }));
      this._render();
    } catch (e) { console.warn("[Deckify] prishistorikk", e); }
  }

  /* ------------------------------------------------------------ timere */

  _setTimer(eid, min) {
    this._clearTimer(eid);
    const until = Date.now() + min * 60000;
    this._timers = { ...this._timers, [eid]: until };
    this._timerHandles = this._timerHandles || {};
    this._timerHandles[eid] = setTimeout(() => {
      callSvc(this._hass, "homeassistant", "turn_off", { entity_id: eid });
      this._clearTimer(eid);
      this._toast(`${nameOf(this._hass, this._cfg, eid)} slått av`);
    }, min * 60000);
    this._render();
  }

  _clearTimer(eid) {
    if (this._timerHandles?.[eid]) clearTimeout(this._timerHandles[eid]);
    if (this._timerHandles) delete this._timerHandles[eid];
    const t = { ...this._timers };
    delete t[eid];
    this._timers = t;
    this._render();
  }

  /* ------------------------------------------------- media: hjelpemetoder */

  _defaultTarget() {
    if (this._st.browseTarget && this._hass.states[this._st.browseTarget])
      return this._st.browseTarget;
    const ctx = this._ctx(this._model);
    const ps = groupable(ctx, this._model);
    const active = ps.find((p) => ["playing", "buffering"]
      .includes(this._hass.states[p.eid]?.state))
      || ps.find((p) => this._hass.states[p.eid]?.state === "paused");
    return (active || ps[0])?.eid || null;
  }

  async _browseWS(eid, type, id) {
    const msg = { type: "media_player/browse_media", entity_id: eid };
    if (type) msg.media_content_type = type;
    if (id != null) msg.media_content_id = id;
    return this._hass.callWS(msg);
  }

  _browseRoot() {
    this._browse = { node: null, stack: [], loading: true, error: null };
    this._render();
    this._browseLoad(null, null, null, false);
  }

  _browseInto(id, type, title) {
    const cur = this._browse.node;
    if (cur) {
      this._browse.stack = [...this._browse.stack, {
        id: cur.media_content_id ?? null, type: cur.media_content_type ?? null,
        title: cur.title || "Start",
      }];
    }
    this._browseLoad(id, type, title, true);
  }

  async _browseLoad(id, type, title, push) {
    const eid = this._st.browseTarget || this._defaultTarget();
    if (!eid) { this._browse = { node: null, stack: [], loading: false, error: "Ingen spiller valgt." }; this._render(); return; }
    this._browse = { ...this._browse, loading: true, error: null };
    this._render();
    try {
      const node = await this._browseWS(eid, type, id);
      this._browse = { ...this._browse, node, loading: false, error: null };
    } catch (e) {
      this._browse = { ...this._browse, loading: false,
        error: "Kunne ikke hente innholdet: " + (e?.message || e) };
    }
    this._render();
  }

  _playMedia(id, type, title) {
    const eid = this._st.browseTarget || this._defaultTarget();
    if (!eid || !id) return;
    callSvc(this._hass, "media_player", "play_media", {
      entity_id: eid, media_content_id: id, media_content_type: type || "music",
    }).then((ok) => {
      if (!ok) return;
      this._toast(`Spiller${title ? " \u00ab" + title + "\u00bb" : ""} p\u00e5 ${nameOf(this._hass, this._cfg, eid)}`);
      this._st.overlay = null;
      setTimeout(() => this._render(), 1500);
    });
    this._render();
  }

  _toast(text) {
    this._st.toast = text;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { this._st.toast = null; this._render(); }, 3200);
    this._render();
  }

  /** Sonos-favoritter (og tilsvarende hos andre spillere) til hurtigvalg. */
  async _loadFavorites() {
    const eid = this._defaultTarget();
    if (!eid) {
      if (this._media.favorites.length) { this._media = { favorites: [] }; this._render(); }
      return;
    }
    const ICONS = {
      "object.container.playlistContainer": "mdi:playlist-music",
      "object.item.audioItem.audioBroadcast": "mdi:radio",
      "object.item.audioItem.musicTrack": "mdi:music-note",
    };
    try {
      const root = await this._browseWS(eid, null, null);
      const favNode = (root.children || []).find((c) => c.media_content_type === "favorites");
      if (!favNode) return;
      const favs = await this._browseWS(eid, favNode.media_content_type, favNode.media_content_id ?? "");
      const out = [];
      for (const folder of favs.children || []) {
        if (!folder.can_expand) {
          out.push({ id: folder.media_content_id, type: folder.media_content_type,
                     title: folder.title, icon: "mdi:music" });
          continue;
        }
        const sub = await this._browseWS(eid, folder.media_content_type, folder.media_content_id);
        for (const it of sub.children || [])
          out.push({ id: it.media_content_id, type: it.media_content_type, title: it.title,
                     icon: ICONS[folder.media_content_id] || "mdi:music" });
      }
      this._media = { favorites: out };
      this._render();
    } catch (e) { console.warn("[Deckify] favoritter", e); }
  }

  /* -------------------------------------------------- bekreftelse / info */

  _needsConfirm(eid) {
    return (this._cfg.confirmPrefix || []).some((p) => eid.startsWith(p));
  }

  _askConfirm(eid) {
    const nm = nameOf(this._hass, this._cfg, eid);
    const st = this._hass.states[eid];
    const on = isOn(st);
    this._st.confirm = {
      title: on ? `Skru av ${nm}?` : `Skru på ${nm}?`,
      text: "Denne enheten spør alltid først, så ingenting skjer ved et uhell.",
      ok: on ? "Skru av" : "Skru på",
      run: () => toggleEntity(this._hass, eid),
    };
    this._st.overlay = "confirm";
    this._render();
  }

  _moreInfo(eid) {
    if (!eid) return;
    fireEvent(this, "hass-more-info", { entityId: eid });
  }

  /* --------------------------------------------------------- skjul/velg */

  _currentScope() {
    const v = this._st.view;
    if (v === "home") {
      const l = this._store.get("layout");
      if (l === "start") return "start";
      if (l === "sidebar" && this._st.sidebarSel !== "overview")
        return "room:" + this._st.sidebarSel;
      return "home";
    }
    if (v === "rooms") return "room:" + (this._st.roomSel || this._model?.rooms[0]?.id);
    if (v.startsWith("page:")) return v;
    return v;
  }

  _openPicker(scope, mode) {
    this._st.pickerScope = scope || this._currentScope();
    this._st.pickerMode = mode;
    this._st.pickerQ = "";
    this._st.pickerDomain = null;
    this._refreshScopeIds();
    this._st.overlay = "picker";
    this._render();
  }

  /** Alle skop som er synlige på skjermen akkurat nå.
      Liste-layouten har ett per rom, så redigeringsverktøyene må jobbe på
      hele settet og ikke bare på `_currentScope()`. */
  _visibleScopes() {
    const sr = this.shadowRoot;
    const found = sr
      ? [...sr.querySelectorAll("[data-dropzone]")].map((e) => e.dataset.dropzone)
      : [];
    const set = new Set(found.filter(Boolean));
    set.add(this._currentScope());
    return [...set];
  }

  /** Som _scopeList, men beholder skillelinjer — brukes når vi skriver tilbake. */
  _scopeListRaw(scope) {
    const saved = this._store.data.order[scope];
    if (saved) return [...saved];
    return this._scopeList(scope);
  }

  /** Synlige id-er i et skop, i rekkefølge. */
  _scopeList(scope) {
    const ctx = this._ctx(this._model);
    const m = this._model;
    if (this._st.pickerMode === "scenes") return visibleScenes(ctx, m, scope);
    if (scope === "home") return visibleHomeTiles(ctx, m, scope);
    if (scope === "start:summary")
      return (this._store.data.order[scope] || []).filter((id) => !id.startsWith("sys:") &&
        !this._store.isHidden(scope, id));
    if (scope === "start")
      return (this._store.data.order["start"] || m.rooms.map((r) => "room:" + r.id))
        .filter((i) => !this._store.isHidden("start", i));
    if (scope.startsWith("room:")) {
      const r = m.rooms.find((x) => x.id === scope.slice(5));
      return r ? visibleRoomTiles(ctx, r) : [];
    }
    /* Hurtigvalgsraden er et skop som alle andre: rekkefølge, skjuling og
       dra-og-slipp går gjennom nøyaktig samme maskineri som kortene. */
    if (scope.startsWith("chips:"))
      return quickIds(ctx, m, scope, chipRoomOf(m, scope));
    if (scope.startsWith("page:")) {
      const p = (this._store.get("dockPages") || []).find((x) => "page:" + x.id === scope);
      return (this._store.data.order[scope] || p?.entities || [])
        .filter((e) => !this._store.isHidden(scope, e));
    }
    return [];
  }

  /** Lagrer de sist brukte entitetene, så søket kan foreslå dem. */
  /** Søkefeltet tegnes asynkront, OG nettleseren nullstiller fokus når
      klikket som åpnet arket er ferdigbehandlet. Prøv derfor til fokus
      faktisk sitter, ikke bare til feltet finnes. */
  _focusSearch(n) {
    if (this._st.overlay !== "search") return;
    const sr = this.shadowRoot;
    const i = sr && sr.getElementById("searchq");
    if (i) {
      if (sr.activeElement === i) return;              /* sitter allerede */
      i.focus({ preventScroll: true });
      try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) {}
      if (sr.activeElement === i && n > 0) return;
    }
    if (n < 14) setTimeout(() => this._focusSearch(n + 1), 45);
  }

  _remember(eid) {
    if (!eid || eid.startsWith("room:")) return;
    const cur = (this._store.data.recent || []).filter((x) => x !== eid);
    cur.unshift(eid);
    this._store.patch({ recent: cur.slice(0, 12) });
  }

  _refreshScopeIds() {
    const scope = this._st.pickerScope;
    if (!this._model || !scope) return;
    this._st.scopeIds = this._scopeList(scope)
      .map((i) => i.startsWith("dev:") ? i.slice(4)
                : i.startsWith("pill:") ? i.slice(5) : i)
      .filter((i) => !i.startsWith("room:") && !i.startsWith("sys:") &&
                     !i.startsWith("media:") && !i.startsWith("act:"));
  }

  /* ---------------------------------------------------------- slidere */

  _sliderDrag(e, el) {
    const kind = el.dataset.slider;
    const eid = el.dataset.e;
    this._busy = true;
    el.setPointerCapture?.(e.pointerId);
    const rect = () => el.getBoundingClientRect();

    const valueAt = (ev) => {
      const r = rect();
      if (kind === "cover") return clamp(100 - ((ev.clientY - r.top) / r.height) * 100, 0, 100);
      return clamp(((ev.clientX - r.left) / r.width) * 100, 0, 100);
    };

    const paint = (v) => {
      if (kind === "brightness" || kind === "fanpct" || kind === "humidity") {
        const f = el.querySelector(".fill"), t = el.querySelector(".pctl");
        if (f) f.style.width = v + "%";
        if (t) t.textContent = Math.round(v) + " %";
      } else if (kind === "cover") {
        const f = el.querySelector(".vfill"), t = el.querySelector(".vpct");
        if (f) f.style.height = (100 - v) + "%";
        if (t) t.textContent = Math.round(v) + " %";
      } else if (kind === "ct") {
        const k = el.querySelector(".knob2");
        if (k) k.style.left = v + "%";
      } else if (kind === "seek") {
        const i = el.querySelector("i");
        if (i) i.style.width = v + "%";
      }
    };

    let last = valueAt(e);
    paint(last);
    const move = (ev) => { last = valueAt(ev); paint(last); };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      this._commitSlider(kind, eid, last, el);
      this._busy = false;
      setTimeout(() => this._render(), 400);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  _commitSlider(kind, eid, v, el) {
    const H = this._hass;
    if (kind === "brightness") {
      if (v < 2) callSvc(H, "light", "turn_off", { entity_id: eid });
      else callSvc(H, "light", "turn_on", { entity_id: eid, brightness_pct: Math.round(v) });
    } else if (kind === "ct") {
      const min = Number(el.dataset.min) || 2000, max = Number(el.dataset.max) || 6500;
      callSvc(H, "light", "turn_on", { entity_id: eid, color_temp_kelvin: Math.round(min + (max - min) * (v / 100)) });
    } else if (kind === "cover") {
      callSvc(H, "cover", "set_cover_position", { entity_id: eid, position: Math.round(v) });
    } else if (kind === "fanpct") {
      callSvc(H, "fan", "set_percentage", { entity_id: eid, percentage: Math.round(v) });
    } else if (kind === "humidity") {
      callSvc(H, "humidifier", "set_humidity", { entity_id: eid, humidity: Math.round(v) });
    } else if (kind === "seek") {
      const dur = Number(el.dataset.dur) || 0;
      if (dur) callSvc(H, "media_player", "media_seek", { entity_id: eid, seek_position: Math.round((v / 100) * dur) });
    }
  }

  /* ----------------------------------------------------- dra for å flytte */

  _dragCard(e, node, opts = {}) {
    const zone = node.closest("[data-dropzone]");
    if (!zone) return;
    const scope = zone.dataset.dropzone;
    if (!scope) return;

    let startX = e.clientX, startY = e.clientY;    /* justeres etter hvert bytte, se under */
    let active = false;
    const pid = e.pointerId;
    /* Med finger skal et vanlig sveip rulle siden, ellers blir et langt
       dashbord umulig å bla i mens man redigerer. Draget armeres derfor av
       et langtrykk — som på iOS — med mindre man tar i et dra-håndtak.
       Med mus holder 8 piksler. */
    const touch = e.pointerType === "touch";
    let armed = !touch || !!opts.handle;
    let holdT = null;                       /* beholdt for ryddefunksjonen */

    const items = () => [...zone.children].filter((c) =>
      DRAGGABLE.some((cl) => c.classList.contains(cl)) &&
      !c.classList.contains("addcard") && !c.classList.contains("dashed") &&
      !c.classList.contains("addrow") && !c.classList.contains("head"));

    const begin = () => {
      active = true;
      this._busy = true;
      node.classList.add("dragging");
      node.style.willChange = "transform";
      try { node.setPointerCapture(pid); } catch (x) {}
      if (navigator.vibrate) try { navigator.vibrate(8); } catch (x) {}
    };



    /* rull siden når man drar mot kanten */
    let scrollDir = 0;
    const autoScroll = () => {
      if (!active) return;
      if (scrollDir) window.scrollBy(0, scrollDir * 14);
      this._scrollRaf = requestAnimationFrame(autoScroll);
    };

    const move = (ev) => {
      if (!armed) {
        /* fingeren beveget seg før langtrykket slo til: dette er en rulling */
        if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 12) {
          clearTimeout(holdT);
          finish(false);
        }
        return;
      }
      if (!active) {
        if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 8) return;
        begin();
        this._scrollRaf = requestAnimationFrame(autoScroll);
      }
      ev.preventDefault();

      /* kortet henger fysisk under fingeren hele veien — ikke bare et
         plutselig bytte av DOM-plass uten visuell tilbakemelding.
         scale(1.04) her i stedet for i CSS, siden inline transform
         ellers ville overstyrt klassens løftede utseende helt. */
      node.style.transform = `translate(${ev.clientX - startX}px, ${ev.clientY - startY}px) scale(1.04)`;

      const vh = window.innerHeight;
      scrollDir = ev.clientY < 90 ? -1 : ev.clientY > vh - 90 ? 1 : 0;

      /* bytt plass med kortet under pekeren */
      for (const other of items()) {
        if (other === node) continue;
        const r = other.getBoundingClientRect();
        if (ev.clientX > r.left && ev.clientX < r.right &&
            ev.clientY > r.top && ev.clientY < r.bottom) {
          /* Kort ligger side om side, så der avgjør X. Listerader stables
             loddrett, så der må Y avgjøre. */
          const before = node.getBoundingClientRect();
          if (node.classList.contains("lrow")) {
            const mid = r.top + r.height / 2;
            if (ev.clientY < mid) other.before(node); else other.after(node);
          } else {
            const mid = r.left + r.width / 2;
            if (ev.clientX < mid) other.before(node); else other.after(node);
          }
          const after = node.getBoundingClientRect();
          /* grid-posisjonen hoppet når DOM-rekkefølgen endret seg —
             korriger referansepunktet slik at translate() ikke hopper med */
          startX += after.left - before.left;
          startY += after.top - before.top;
          node.style.transform = `translate(${ev.clientX - startX}px, ${ev.clientY - startY}px) scale(1.04)`;
          break;
        }
      }
    };

    const finish = (commit) => {
      clearTimeout(holdT);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      cancelAnimationFrame(this._scrollRaf);
      scrollDir = 0;
      node.classList.remove("armed");
      if (!active) return;                       /* var bare et trykk eller en rulling */
      node.classList.remove("dragging");
      node.style.transform = "";
      node.style.willChange = "";
      const ids = items().map((c) => this._idOf(c)).filter(Boolean);
      this._busy = false;
      if (commit && ids.length) this._store.setOrder(scope, ids);
      this._cache.body = null;
      this._render();
    };

    const up = () => finish(true);

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  _idOf(el) {
    /* cardWrap skriver id-en rett på rotnoden — mest pålitelig. */
    if (el.dataset?.cardid) return el.dataset.cardid;
    const rm = el.querySelector(".rm");
    if (rm?.dataset?.id) return rm.dataset.id;
    return el.dataset?.e || el.dataset?.r || null;
  }
}

function hexToRgb(hex) {
  const s = hex.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

if (!customElements.get("deckify-card-inner")) {
  customElements.define("deckify-card-inner", DeckifyCard);
}
if (!customElements.get("deckify-card")) {
  customElements.define("deckify-card", DeckifyCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "deckify-card")) {
  window.customCards.push({
    type: "deckify-card",
    name: "Deckify",
    description: "Helskjerms hjemdashbord: rom, scener, media, sikkerhet, kalender og vær.",
    preview: false,
  });
}


/* ------------------------------------------------------------------ panel
 * Integrasjonen registrerer ett panel per dashbord. HA setter `panel`,
 * `hass`, `narrow` og `route` som egenskaper på elementet; vi trenger bare
 * de to første. Panelet er en tynn kappe rundt det vanlige kortet, slik at
 * det finnes ÉN kodebase for både sidemenypanel og Lovelace-kort.
 */
class DeckifyPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /* `height:100%` ga en boks på nøyaktig én skjermhøyde mens innholdet
       scrollet videre — under boksen så man Home Assistants egen (hvite)
       bakgrunn. Bruk min-height, og la kortet male bakgrunnen på seg selv. */
    this.shadowRoot.innerHTML =
      `<style>:host{display:block;min-height:100%;background:var(--deckify-bg,#140b14)}
       deckify-card{display:block;min-height:100vh}</style>`;
  }

  set hass(hass) {
    this._hass = hass;
    this._ensure();
    if (this._card) this._card.hass = hass;
  }
  get hass() { return this._hass; }

  set panel(panel) {
    this._panel = panel;
    this._ensure();
  }
  get panel() { return this._panel; }

  /* HA setter disse; Deckify måler bredden sin selv med ResizeObserver. */
  set narrow(v) { this._narrow = v; }
  set route(v) { this._route = v; }

  _ensure() {
    if (this._card || !this._hass || !this._panel) return;
    const card = document.createElement("deckify-card");
    const cfg = { ...(this._panel.config || {}), panel: true };
    delete cfg._panel_custom;
    card.setConfig(cfg);
    this.shadowRoot.appendChild(card);
    this._card = card;
    /* Panelet kan få `hass` før `panel`; da må kortet få tilstanden med én
       gang, ellers står det tomt til neste tilstandsendring. */
    if (this._hass) card.hass = this._hass;
  }
}

if (!customElements.get("deckify-panel")) {
  customElements.define("deckify-panel", DeckifyPanel);
}

export { DeckifyCard, DeckifyPanel };
