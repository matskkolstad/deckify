/* Deckify — cards.js
 * Kortinnstillinger: størrelse, hvilken info kortet viser, hvilke
 * handlinger trykk/hold/dobbelttrykk gjør, navn, ikon og farge.
 *
 * Alt lagres per (scope, kortId) i dashbordets serveroppsett, så det følger
 * brukeren mellom nettbrett, telefon og PC — og kan også endres fra
 * integrasjonens innstillinger.
 */
import {
  h, ICON, CARD_SIZES, INFO_MODES, CARD_ACTIONS, CARD_COLORS, DEFAULT_CARD,
  domainOf, nameOf, fullNameOf, entityIcon,
} from "./core.js?v=2.5.0";
import { ic } from "./controls.js?v=2.5.0";
import { sheet } from "./overlays.js?v=2.5.0";

/** Entitets-id-en et kort-id peker på, hvis noen. */
export function cardEntity(id) {
  if (!id) return null;
  if (id.startsWith("dev:")) return id.slice(4);
  if (id.startsWith("media:")) return id.slice(6);
  if (id.startsWith("room:") || id.startsWith("sys:") || id.startsWith("sep:")) return null;
  return id.includes(".") ? id : null;
}

/** Hvilke handlinger som gir mening for dette kortet. */
function actionsFor(eid) {
  const d = eid ? domainOf(eid) : null;
  return CARD_ACTIONS.filter((a) => {
    if (a.id === "run") return ["scene", "script", "button", "input_button", "automation"].includes(d);
    if (a.id === "toggle") return !!d && d !== "sensor" && d !== "binary_sensor" && d !== "camera";
    if (a.id === "detail" || a.id === "more-info") return !!eid;
    return true;
  });
}

function chipRow(act, key, options, cur, extra = "") {
  return `<div class="pickrow">${options.map((o) => `
    <div class="pick ${cur === o.id ? "sel" : ""}" data-act="${h(act)}"
         data-k="${h(key)}" data-v="${h(o.id)}">
      ${o.icon ? ic(o.icon) : ""}<span>${h(o.label)}</span></div>`).join("")}${extra}</div>`;
}

function textRow(key, label, value, placeholder) {
  return `<div class="setsec">
    <h4>${h(label)}</h4>
    <input class="txtin" data-cardinput="${h(key)}" value="${h(value || "")}"
      placeholder="${h(placeholder || "")}" autocomplete="off" spellcheck="false">
  </div>`;
}

/**
 * Selve arket. `ctx.cardCfg` er { scope, id } satt av klikkhandleren.
 */
export function cardConfigSheet(ctx, model) {
  const t = ctx.cardCfg;
  if (!t) return "";
  const { scope, id } = t;
  const cfg = ctx.store.cardCfg(scope, id);
  const raw = ctx.store.rawCardCfg(scope, id);
  const eid = cardEntity(id);
  const st = eid ? ctx.hass.states[eid] : null;

  let title = id;
  let sub = "";
  if (eid && st) {
    title = fullNameOf(ctx.hass, ctx.cfg, eid);
    sub = eid;
  } else if (id.startsWith("room:")) {
    const r = model.rooms.find((x) => x.id === id.slice(5));
    title = r ? r.name : id;
    sub = "Romkort";
  } else if (id.startsWith("sys:")) {
    const LBL = { "sys:security": "Sikkerhet", "sys:climate": "Klima", "sys:power": "Strøm" };
    title = LBL[id] || id;
    sub = "Systemkort";
  }

  const sizes = CARD_SIZES.map((s) => `
    <div class="sizepick ${cfg.size === s.id ? "sel" : ""}" data-act="cardset"
         data-k="size" data-v="${h(s.id)}" title="${h(s.label)}">
      <i class="box s${h(s.id)}"></i><span>${h(s.label)}</span></div>`).join("");

  const acts = actionsFor(eid);
  const colors = [{ id: "", label: "Standard", hex: null }]
    .concat(CARD_COLORS.map((c) => ({ id: c.hex, label: c.name, hex: c.hex })));
  const colorRow = `<div class="swrow">${colors.map((c) => `
    <div class="sw ${(cfg.color || "") === c.id ? "sel" : ""}" data-act="cardset"
         data-k="color" data-v="${h(c.id)}" title="${h(c.label)}"
         style="${c.hex ? `background:${h(c.hex)}` : "background:transparent;border-style:dashed"}">
      ${!c.hex ? ic("mdi:cancel") : ""}</div>`).join("")}</div>`;

  const needNav = cfg.tap === "navigate" || cfg.hold === "navigate" || cfg.dbl === "navigate";
  const needSvc = cfg.tap === "service" || cfg.hold === "service" || cfg.dbl === "service";

  const body = `
  <div class="setpane cardcfg">
    <div class="cardcfghead">
      <div class="ic">${ic(cfg.icon || (st ? entityIcon(st, eid, ctx.cfg) : "mdi:card-outline"))}</div>
      <div class="txt"><b>${h(title)}</b><span>${h(sub)}</span></div>
    </div>

    <div class="setsec">
      <h4>Størrelse</h4>
      <p>Hvor mange ruter kortet tar i rutenettet.</p>
      <div class="sizerow">${sizes}</div>
    </div>

    <div class="setsec">
      <h4>Info under navnet</h4>
      <p>Hva den lille teksten skal vise.</p>
      ${chipRow("cardset", "info", INFO_MODES, cfg.info)}
    </div>

    <div class="setsec">
      <h4>Når du trykker</h4>
      ${chipRow("cardset", "tap", acts, cfg.tap)}
    </div>

    <div class="setsec">
      <h4>Når du holder inne</h4>
      ${chipRow("cardset", "hold", acts, cfg.hold)}
    </div>

    <div class="setsec">
      <h4>Dobbelttrykk</h4>
      ${chipRow("cardset", "dbl", acts, cfg.dbl)}
    </div>

    ${needNav ? textRow("navigate", "Gå til", cfg.navigate, "/lovelace/0 eller rooms") : ""}
    ${needSvc ? textRow("service", "Tjeneste", cfg.service, "light.turn_on") : ""}
    ${needSvc ? textRow("service_data", "Tjenestedata (JSON)", cfg.service_data, '{"brightness_pct": 40}') : ""}

    ${textRow("name", "Eget navn", cfg.name, st ? nameOf(ctx.hass, ctx.cfg, eid) : "")}
    ${textRow("icon", "Eget ikon", cfg.icon, "mdi:lightbulb")}

    <div class="setsec">
      <h4>Farge når kortet er på</h4>
      ${colorRow}
    </div>

    <div class="setsec">
      <h4>Bekreftelse</h4>
      <div class="optrow" data-act="cardset" data-k="confirm" data-v="${cfg.confirm ? "" : "1"}">
        <div class="ot"><b>Spør før handling</b><span>Nyttig for sirener, låser og alt som ikke tåler et bomklikk.</span></div>
        <div class="sw-toggle ${cfg.confirm ? "on" : ""}"><i></i></div>
      </div>
    </div>

    <div class="setsec">
      <h4>Kortet</h4>
      <div class="btnrow">
        <div class="btn" data-act="hide" data-id="${h(id)}" data-scope="${h(scope)}">
          ${ic(ICON.minus)}Skjul kortet</div>
        <div class="btn ${Object.keys(raw).length ? "danger" : ""}" data-act="cardreset"
             data-id="${h(id)}" data-scope="${h(scope)}">
          ${ic("mdi:restore")}Nullstill kortet</div>
      </div>
      ${Object.keys(raw).length
        ? `<p>${Object.keys(raw).length} innstilling${Object.keys(raw).length === 1 ? "" : "er"} er endret.</p>`
        : `<p>Kortet bruker standardinnstillingene.</p>`}
    </div>
  </div>`;

  return sheet("Innstillinger for kortet", body, "cardcfgsheet");
}

/** Standardverdiene — eksporteres for testharnessen. */
export { DEFAULT_CARD };
