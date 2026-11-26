/* Deckify — saver.js
 *
 * Skjermspareren. En stor klokke midt på skjermen med dagens dato under, og
 * en rad med glanseinfo som brukeren selv velger innholdet i.
 *
 * To ting som var feil i den gamle versjonen:
 *
 * 1. Den lå med `background:rgba(8,4,10,.88)` — nesten svart, uansett tema.
 *    Nå males den med SAMME gradient som dashbordet (`bgCss`), så et lyst
 *    tema får en lys skjermsparer og teksten følger `.hd.light`.
 * 2. Forsinkelsen var i HELE MINUTTER, så «etter 30 sekunder» var umulig.
 *    `saverSec` er sekunder.
 *
 * Klokka driver dessuten sakte rundt (`saverdrift`): på et veggnettbrett som
 * står på hele døgnet brenner en statisk klokke seg inn i panelet.
 */
import {
  h, ICON, fmtNum, domainOf, nameOf, isDead,
} from "./core.js?v=2.4.3";
import { ic } from "./controls.js?v=2.4.3";
import { weatherIcon, weatherText } from "./weather.js?v=2.4.3";
import { dateString, timeString } from "./views.js?v=2.4.3";

/** Valgene i Innstillinger → Skjerm → Skjermsparer. 0 = av. */
export const SAVER_DELAYS = [
  { s: 0, label: "Av" },
  { s: 30, label: "30 sek" },
  { s: 60, label: "1 min" },
  { s: 120, label: "2 min" },
  { s: 300, label: "5 min" },
  { s: 600, label: "10 min" },
  { s: 1800, label: "30 min" },
];

const ALERT_TEXT = {
  smoke: "RØYK", gas: "GASS", carbon_monoxide: "KULLOS", moisture: "VANNLEKKASJE",
  door: "Dør åpen", window: "Vindu åpent", opening: "Åpen", garage_door: "Garasje åpen",
};

/** Neste hendelse som ikke er ferdig ennå, innenfor det nærmeste døgnet. */
function nextEvent(ctx) {
  const evs = ctx.calendar?.events || [];
  const now = Date.now();
  const soon = now + 36 * 3600e3;
  let best = null;
  for (const e of evs) {
    const t = Date.parse(e.start);
    if (!isFinite(t)) continue;
    const end = Date.parse(e.end);
    if (isFinite(end) && end < now) continue;
    if (t > soon) continue;
    if (!best || t < best.t) best = { t, e };
  }
  if (!best) return null;
  const d = new Date(best.t);
  const today = new Date(now);
  const sameDay = d.toDateString() === today.toDateString();
  const when = best.e.allDay
    ? (sameDay ? "I dag" : "I morgen")
    : (sameDay ? timeString(d, true, false) : "I morgen " + timeString(d, true, false));
  return { when, title: best.e.summary || "Hendelse" };
}

/** Spilleren som faktisk lager lyd akkurat nå, hvis noen. */
function nowPlaying(ctx, model) {
  for (const r of model.rooms) {
    for (const e of r.controls) {
      if (domainOf(e) !== "media_player") continue;
      const st = ctx.hass.states[e];
      if (st?.state !== "playing") continue;
      const a = st.attributes;
      const title = a.media_title || a.media_content_id;
      if (!title) continue;
      const sub = [a.media_artist, a.media_album_name].filter(Boolean)[0];
      return { title: String(title), sub: sub ? String(sub) : r.name };
    }
  }
  return null;
}

/** Ting som bør vekke deg selv om skjermen sover. */
function alerts(ctx, model) {
  const out = [];
  const list = model.securityAll
    || model.rooms.flatMap((r) => r.security.map((e) => ({ eid: e, area: r.name })));
  for (const it of list) {
    const e = it.eid;
    const st = ctx.hass.states[e];
    if (!st) continue;
    const dc = st.attributes?.device_class;
    if (["motion", "occupancy", "presence"].includes(dc)) continue;
    const txt = ALERT_TEXT[dc];
    if (!txt) continue;
    const crit = ["smoke", "gas", "carbon_monoxide", "moisture"].includes(dc);
    const room = it.area || "Uten rom";
    if (isDead(st)) {
      if (crit) out.push({
        txt: txt + " – frakoblet", room, crit,
        icon: dc === "moisture" ? ICON.leak : ICON.smoke,
      });
      continue;
    }
    if (st.state !== "on") continue;
    out.push({
      txt, room, crit,
      icon: crit ? (dc === "moisture" ? ICON.leak : ICON.smoke) : ICON.door,
    });
  }
  /* kritisk først, og aldri mer enn tre — dette er en skjermsparer */
  out.sort((a, b) => (b.crit ? 1 : 0) - (a.crit ? 1 : 0));
  return out.slice(0, 3);
}

export function saverView(ctx, model) {
  const s = ctx.store;
  const rows = [];

  if (s.get("saverWeather")) {
    const w = ctx.weather && ctx.weather.ok ? ctx.weather : null;
    if (w) rows.push(`<div class="si">${ic(weatherIcon(w.state))}
      <span><b>${fmtNum(w.temperature, 0)}°</b> ${h(weatherText(w.state))}</span></div>`);
  }

  if (s.get("saverStatus")) {
    const n = model.lightsOn.length;
    rows.push(`<div class="si">${ic(n ? ICON.lightOn : ICON.power)}
      <span>${n ? `<b>${n}</b> ${n === 1 ? "lys på" : "lys på"}` : "Alt er av"}</span></div>`);
  }

  if (s.get("saverMedia")) {
    const m = nowPlaying(ctx, model);
    if (m) rows.push(`<div class="si">${ic(ICON.media)}
      <span><b>${h(m.title)}</b> ${h(m.sub)}</span></div>`);
  }

  if (s.get("saverAgenda")) {
    const ev = nextEvent(ctx);
    if (ev) rows.push(`<div class="si">${ic(ICON.calendar)}
      <span><b>${h(ev.when)}</b> ${h(ev.title)}</span></div>`);
  }

  /* Varsler kan ikke skrus av. En skjermsparer som skjuler at røykvarsleren
     går er verre enn ingen skjermsparer. */
  const al = alerts(ctx, model).map((a) => `
    <div class="sa ${a.crit ? "crit" : ""}">${ic(a.icon)}
      <span>${h(a.txt)} · ${h(a.room)}</span></div>`).join("");

  return `
    <div class="saverinner">
      <div class="sc mono">${timeString(ctx.now, s.get("clock24"), false)}</div>
      <div class="sd">${h(dateString(ctx.now))}</div>
      ${rows.length ? `<div class="sinfo">${rows.join("")}</div>` : ""}
      ${al ? `<div class="salerts">${al}</div>` : ""}
    </div>
    <div class="shint">${ic("mdi:gesture-tap")}<span>Trykk for å vekke</span></div>`;
}
