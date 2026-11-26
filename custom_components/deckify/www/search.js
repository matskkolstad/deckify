/* Deckify — search.js
 * Globalt søk: finn og styr hvilken som helst entitet uten å lete
 * gjennom rom og sider. Treffer navn, rom, type og entitets-id.
 */
import {
  h, ICON, isOn, isDead, domainOf, nameOf, fullNameOf, shortName, entityIcon,
  DOMAIN_LABEL, fmtNum, matchScore,
} from "./core.js?v=2.4.1";
import { ic, stateText } from "./controls.js?v=2.4.1";
import { sheet } from "./overlays.js?v=2.4.1";

/** Entiteter som er verdt å søke i — samme liste som enhetsvelgeren. */
export function searchResults(ctx, model, raw) {
  const q = (raw || "").trim().toLowerCase();
  if (!q) return [];
  const { hass } = ctx;
  const out = [];
  for (const it of model.addable) {
    const name = fullNameOf(hass, ctx.cfg, it.eid);
    const s = matchScore(q, name, it.area, it.eid, it.domain);
    if (s > 0) out.push({ ...it, name, s });
  }
  /* rom er også søkbare */
  for (const r of model.rooms) {
    const s = matchScore(q, r.name, null, r.id, "room");
    if (s > 0) out.push({ eid: "room:" + r.id, name: r.name, area: null,
      domain: "room", room: r, s: s + 50 });
  }
  out.sort((a, b) => b.s - a.s || a.name.localeCompare(b.name, "nb"));
  return out.slice(0, 60);
}

/* Scener/skript lagrer siste kjøretidspunkt i state — vis det som «sist
   kjørt for N timer siden», ikke som et rått ISO-tidsstempel. */
function subState(ctx, eid, d) {
  const st = ctx.hass.states[eid];
  if (!st) return "";
  if (["scene", "script", "button", "input_button"].includes(d)) {
    const t = Date.parse(st.state);
    if (!isFinite(t)) return "";
    const m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) return "kjørt nå";
    if (m < 60) return "kjørt for " + m + " min siden";
    const h2 = Math.floor(m / 60);
    if (h2 < 24) return "kjørt for " + h2 + " t siden";
    const dd = Math.floor(h2 / 24);
    return "kjørt for " + dd + (dd === 1 ? " dag" : " dager") + " siden";
  }
  return stateText(ctx, eid);
}

function resultRow(ctx, it) {
  const { hass } = ctx;
  if (it.domain === "room") {
    const r = it.room;
    return `
    <div class="srow" data-act="searchroom" data-r="${h(r.id)}">
      <div class="ic">${ic(r.icon)}</div>
      <div class="txt"><div class="nm">${h(r.name)}</div>
        <div class="st">Rom · ${r.lightsOn} av ${r.lightIds.length} lys på</div></div>
      ${ic("mdi:chevron-right", "chev")}
    </div>`;
  }
  const st = hass.states[it.eid];
  const d = it.domain;
  const on = isOn(st);
  /* En scene/skript/knapp som aldri har vært kjørt har state «unknown».
     Den er fullt brukbar — ikke merk den som utilgjengelig. */
  const fireAndForget = ["scene", "script", "button", "input_button"].includes(d);
  const dead = fireAndForget ? st?.state === "unavailable" : isDead(st);
  const toggleable = ["light", "switch", "input_boolean", "fan", "siren",
    "humidifier", "automation"].includes(d);
  const pressable = ["scene", "script", "button", "input_button"].includes(d);

  return `
  <div class="srow ${on ? "on" : ""} ${dead ? "dead" : ""}"
       data-act="${hass.entities?.[it.eid]?.platform === "apple_tv" ? "appletv" : "searchopen"}"
       data-e="${h(it.eid)}">
    <div class="ic">${ic(entityIcon(st, it.eid, ctx.cfg))}</div>
    <div class="txt">
      <div class="nm">${h(it.name)}</div>
      <div class="st">${h([DOMAIN_LABEL[d] || d, it.area,
        dead ? "utilgjengelig" : subState(ctx, it.eid, d)].filter(Boolean).join(" · "))}</div>
    </div>
    ${!dead && toggleable ? `
      <div class="sw ${on ? "on" : ""}" data-act="searchtoggle" data-e="${h(it.eid)}">
        <i></i></div>`
    : !dead && pressable ? `
      <div class="sgo" data-act="searchtoggle" data-e="${h(it.eid)}">Kjør</div>`
    : ic("mdi:chevron-right", "chev")}
  </div>`;
}

/* Når søkefeltet er tomt: vis noe nyttig i stedet for ingenting. */
function suggestions(ctx, model) {
  const recent = (ctx.store.data.recent || [])
    .filter((e) => ctx.hass.states[e]).slice(0, 6);
  const on = [];
  for (const r of model.rooms)
    for (const e of r.lightIds)
      if (ctx.hass.states[e]?.state === "on")
        on.push({ eid: e, name: fullNameOf(ctx.hass, ctx.cfg, e),
                  area: r.name, domain: "light" });

  const blocks = [];
  if (recent.length) blocks.push(`
    <div class="setsec"><h4>Sist brukt</h4>
      ${recent.map((e) => resultRow(ctx, {
        eid: e, name: fullNameOf(ctx.hass, ctx.cfg, e),
        area: null, domain: domainOf(e) })).join("")}</div>`);
  if (on.length) blocks.push(`
    <div class="setsec"><h4>Lys som står på <span style="opacity:.5">${on.length}</span></h4>
      ${on.slice(0, 10).map((x) => resultRow(ctx, x)).join("")}
      ${on.length ? `<div class="srow act" data-act="alloff">
        <div class="ic">${ic(ICON.power)}</div>
        <div class="txt"><div class="nm">Skru av alle lys</div></div></div>` : ""}</div>`);
  if (!blocks.length) blocks.push(`
    <div class="empty">${ic("mdi:magnify")}Søk etter lys, rom, sensorer, scener …</div>`);
  return blocks.join("");
}

export function searchSheet(ctx, model) {
  const q = ctx.searchQ || "";
  const res = searchResults(ctx, model, q);
  const body = `
    <div class="pickhead">
      <div class="pickfield">
        ${ic("mdi:magnify", "pfic")}
        <input id="searchq" placeholder="Søk i hele huset …" value="${h(q)}"
          autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search">
        ${q ? `<div class="pfx" data-act="searchclear">${ic(ICON.close)}</div>` : ""}
      </div>
      ${q ? `<div class="sub pickcount">
        ${res.length ? `${res.length} treff` : "Ingen treff"}</div>` : ""}
    </div>
    ${q
      ? (res.length
          ? `<div class="setsec">${res.map((r) => resultRow(ctx, r)).join("")}</div>`
          : `<div class="empty">${ic("mdi:magnify-close")}Fant ingenting som
             heter «${h(q)}».</div>`)
      : suggestions(ctx, model)}`;
  return sheet("Søk", body, "wide");
}
