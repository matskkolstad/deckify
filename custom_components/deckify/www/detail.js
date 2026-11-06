/* Deckify — detail.js
 * Detaljpanel per enhet. Erstatter HAs more-info-dialog med et ark som
 * følger Deckifys design og samler ALT du kan gjøre med enheten:
 * lysstyrke, farge, effekter, romscener, timer, kilde, gruppe, historikk.
 */
import {
  h, ICON, clamp, domainOf, nameOf, shortName, isDead, isOn, fmtNum, mmss, relativeTime,
  lightColor, LIGHT_SWATCHES, kelvinToRgb, WEATHER_ICON,
} from "./core.js?v=2.2.1";
import { ic, stateText, isCardOn, mediaPos } from "./controls.js?v=2.2.1";
import { sheet } from "./overlays.js?v=2.2.1";

const HVAC_LABEL = { heat: "Varme", cool: "Kjøling", auto: "Auto", heat_cool: "Auto",
                     dry: "Tørke", fan_only: "Vifte", off: "Av" };
const PRESET_LABEL = { none: "Ingen", away: "Borte", comfort: "Komfort", home: "Hjemme",
                       sleep: "Natt", eco: "Øko", boost: "Boost", activity: "Aktiv" };
const TIMERS = [5, 15, 30, 60];

/* --------------------------------------------------------------- toppdel */

function head(ctx, eid, roomName) {
  const { hass } = ctx;
  const st = hass.states[eid];
  const on = isCardOn(ctx, eid);
  const d = domainOf(eid);
  const nm = nameOf(hass, ctx.cfg, eid);
  const col = d === "light" && on ? lightColor(st, ctx.accent) : null;
  const changed = st ? relativeTime(st.last_changed, ctx.now) : "";
  return `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:4px">
      <div class="ic" style="width:54px;height:54px;${col ? `background:${col};color:#2a2008` : ""}">
        ${ic(d === "light" ? ICON.light : ICON.home)}</div>
      <div style="flex:1;min-width:0">
        <div class="h2" style="font-size:20px">${h(nm)}</div>
        <div class="sub">${h(roomName ? roomName + " · " : "")}${h(stateText(ctx, eid))}${
          changed ? h(" · " + changed) : ""}</div>
      </div>
      ${isDead(st) ? "" : `<div class="sw-toggle ${on ? "on" : ""}" data-act="toggle" data-e="${h(eid)}"><i></i></div>`}
    </div>`;
}

function sect(title, body, value) {
  if (!body) return "";
  return `<div class="dsec">
    <div class="lblrow2"><span class="lbl">${h(title)}</span>
      ${value ? `<span class="dval">${h(value)}</span>` : ""}</div>
    ${body}</div>`;
}

/** Bred slider. Verdien vises i seksjonsetiketten, ikke oppå baren. */
function bigSlider(kind, eid, val, extra = "") {
  return `
    <div class="bar tall" data-slider="${kind}" data-e="${h(eid)}" ${extra}>
      <div class="fill" style="width:${clamp(val, 0, 100)}%"></div>
    </div>`;
}

/* ------------------------------------------------------------------ lys */

function lightDetail(ctx, eid, roomName, model) {
  const { hass } = ctx;
  const st = hass.states[eid];
  const a = st.attributes;
  const on = st.state === "on";
  const bri = a.brightness != null ? Math.round((a.brightness / 255) * 100) : (on ? 100 : 0);
  const modes = a.supported_color_modes || [];
  const canColor = modes.some((m) => ["hs", "rgb", "rgbw", "rgbww", "xy"].includes(m));
  const canCt = modes.includes("color_temp");
  const minK = a.min_color_temp_kelvin || 2000, maxK = a.max_color_temp_kelvin || 6500;
  const curK = a.color_temp_kelvin;
  const ctPos = curK ? clamp(((curK - minK) / (maxK - minK)) * 100, 0, 100) : 50;
  const curRgb = a.rgb_color;

  const presets = [
    { n: "Full", b: 100 }, { n: "Lesing", b: 70 }, { n: "Dempet", b: 35 }, { n: "Nattlys", b: 8 },
  ].map((p) => `<div class="pick ${Math.abs(bri - p.b) < 4 && on ? "sel" : ""}"
      data-act="setbri" data-e="${h(eid)}" data-v="${p.b}">${h(p.n)}</div>`).join("");

  const swatches = canColor ? LIGHT_SWATCHES.map((c) => {
    const sel = curRgb && "#" + curRgb.map((v) => v.toString(16).padStart(2, "0")).join("") === c.toLowerCase();
    return `<div class="sw" style="background:${c};width:38px;height:38px${sel ? ";border-color:rgba(0,0,0,.5)" : ""}"
      data-act="lightcolor" data-e="${h(eid)}" data-c="${c}"></div>`;
  }).join("") : "";

  const ctbar = canCt ? `
    <div class="ctbar" style="height:30px" data-slider="ct" data-e="${h(eid)}"
         data-min="${minK}" data-max="${maxK}">
      <div class="knob2" style="left:${ctPos}%;height:34px;top:-2px"></div>
    </div>
    <div class="sub" style="margin-top:5px;font-size:11.5px">
      ${curK ? fmtNum(curK, 0) + " K" : `${minK}–${maxK} K`}</div>` : "";

  const effects = (a.effect_list || []).filter((x) => x && x !== "None");
  const effHtml = effects.length ? effects.map((x) => `
    <div class="pick ${a.effect === x ? "sel" : ""}" data-act="lighteffect" data-e="${h(eid)}" data-v="${h(x)}">
      ${ic(EFFECT_ICON[x] || "mdi:auto-fix")}${h(effectName(x))}</div>`).join("") : "";

  /* scener i samme rom styrer ofte dette lyset */
  const room = model.rooms.find((r) => r.id === ctx.detailRoom) ||
               model.rooms.find((r) => r.controls.includes(eid));
  const scenes = (room?.scenes || []).slice(0, 10);
  const sceneHtml = scenes.length ? scenes.map((e) => `
    <div class="pick" data-act="scene" data-e="${h(e)}">
      ${ic(ICON.scene)}<span>${h(shortName(hass.states[e]?.attributes?.friendly_name || e, room.name))}</span>
    </div>`).join("") : "";

  return head(ctx, eid, roomName) +
    sect("Lysstyrke", bigSlider("brightness", eid, on ? bri : 0) +
      `<div class="pickrow" style="margin-top:9px">${presets}</div>`, on ? bri + " %" : "Av") +
    sect(canCt ? "Fargetemperatur" : "", ctbar) +
    sect(canColor ? "Farge" : "", swatches ? `<div class="swatches">${swatches}</div>` : "") +
    sect(effects.length ? "Effekt" : "", effHtml ? `<div class="pickrow">${effHtml}</div>` : "") +
    sect(scenes.length ? "Scener i " + room.name : "", sceneHtml ? `<div class="pickrow">${sceneHtml}</div>` : "") +
    timerSect(ctx, eid);
}

/* --------------------------------------------------------------- timer */

function timerSect(ctx, eid) {
  const t = (ctx.timers || {})[eid];
  const left = t ? Math.max(0, Math.round((t - Date.now()) / 1000)) : 0;
  const body = left > 0
    ? `<div class="pickrow">
         <div class="pick sel">${ic("mdi:timer-sand")}<span>Slås av om ${mmss(left)}</span></div>
         <div class="pick" data-act="timeroff" data-e="${h(eid)}">${ic(ICON.close)}<span>Avbryt</span></div>
       </div>`
    : `<div class="pickrow">${TIMERS.map((m) => `
        <div class="pick" data-act="timer" data-e="${h(eid)}" data-m="${m}">
          ${ic("mdi:timer-outline")}<span>${m} min</span></div>`).join("")}</div>`;
  return sect("Slå av automatisk", body);
}

/* ------------------------------------------------------------ gardin */

function coverDetail(ctx, eid, roomName) {
  const st = ctx.hass.states[eid];
  const a = st.attributes;
  const feat = a.supported_features || 0;
  const pos = a.current_position ?? (st.state === "open" ? 100 : 0);
  const tilt = a.current_tilt_position;

  const presets = [100, 75, 50, 25, 0].map((p) => `
    <div class="pick ${Math.abs(pos - p) < 3 ? "sel" : ""}" data-act="coverpos" data-e="${h(eid)}" data-v="${p}">
      ${p === 0 ? "Lukket" : p === 100 ? "Helt åpen" : p + " %"}</div>`).join("");

  return head(ctx, eid, roomName) +
    sect("Posisjon", bigSlider("cover", eid, pos) +
      `<div class="pickrow" style="margin-top:9px">${presets}</div>`, Math.round(pos) + " % åpen") +
    sect("Styr", `<div class="pickrow">
      <div class="pick" data-act="cover" data-e="${h(eid)}" data-s="open">${ic(ICON.up)}<span>Åpne</span></div>
      <div class="pick" data-act="cover" data-e="${h(eid)}" data-s="stop">${ic(ICON.stop)}<span>Stopp</span></div>
      <div class="pick" data-act="cover" data-e="${h(eid)}" data-s="close">${ic(ICON.down)}<span>Lukk</span></div>
    </div>`) +
    sect(tilt != null && (feat & 16) ? "Lameller" : "",
      tilt != null && (feat & 16) ? bigSlider("tilt", eid, tilt) : "",
      tilt != null ? Math.round(tilt) + " %" : "");
}

/* ------------------------------------------------------------- klima */

function climateDetail(ctx, eid, roomName) {
  const st = ctx.hass.states[eid];
  const a = st.attributes;
  const on = st.state !== "off";
  const t = a.temperature, cur = a.current_temperature;
  const min = a.min_temp ?? 5, max = a.max_temp ?? 35;
  const step = a.target_temp_step || 0.5;
  const frac = t != null ? clamp((t - min) / (max - min), 0, 1) : 0;
  const R = 52, C = 2 * Math.PI * R, arc = C * 0.75;
  const col = a.hvac_action === "cooling" ? "#4aa3ff" : "#f5853a";

  const ring = `
    <div style="display:flex;align-items:center;gap:20px">
      <div class="ring" style="width:132px;height:132px">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="${R}" fill="none" stroke="rgba(255,255,255,.14)"
            stroke-width="9" stroke-linecap="round" stroke-dasharray="${arc} ${C}"></circle>
          <circle cx="60" cy="60" r="${R}" fill="none" stroke="${col}" stroke-width="9"
            stroke-linecap="round" stroke-dasharray="${arc * frac} ${C}"></circle>
        </svg>
        <div class="rtxt" style="font-size:32px">${t != null ? fmtNum(t, step < 1 ? 1 : 0) + "°" : "–"}</div>
      </div>
      <div style="flex:1">
        <div class="sub">${cur != null ? "Måler " + fmtNum(cur, 1) + "° nå" : ""}</div>
        <div class="sub">${a.current_humidity != null ? fmtNum(a.current_humidity, 0) + " % fukt" : ""}</div>
        <div style="display:flex;gap:10px;margin-top:12px">
          <div class="pmbtn" style="height:48px;border-radius:24px;background:rgba(255,255,255,.1)"
               data-act="temp" data-e="${h(eid)}" data-d="-0.5">${ic(ICON.minus)}</div>
          <div class="pmbtn" style="height:48px;border-radius:24px;background:rgba(255,255,255,.1)"
               data-act="temp" data-e="${h(eid)}" data-d="0.5">${ic(ICON.plus)}</div>
        </div>
      </div>
    </div>`;

  const modes = (a.hvac_modes || []).map((m) => `
    <div class="pick ${st.state === m ? "sel" : ""}" data-act="hvac" data-e="${h(eid)}" data-m="${h(m)}">
      ${h(HVAC_LABEL[m] || m)}</div>`).join("");
  const presets = (a.preset_modes || []).map((m) => `
    <div class="pick ${a.preset_mode === m ? "sel" : ""}" data-act="preset" data-e="${h(eid)}" data-m="${h(m)}">
      ${h(PRESET_LABEL[m] || m)}</div>`).join("");
  const fans = (a.fan_modes || []).map((m) => `
    <div class="pick ${a.fan_mode === m ? "sel" : ""}" data-act="climatefan" data-e="${h(eid)}" data-m="${h(m)}">
      ${h(m)}</div>`).join("");

  return head(ctx, eid, roomName) +
    sect("Måltemperatur", ring +
      `<div style="margin-top:14px">${bigSlider("settemp", eid, frac * 100)}</div>`,
      t != null ? fmtNum(t, step < 1 ? 1 : 0) + "°" : "–") +
    sect(modes ? "Modus" : "", modes ? `<div class="pickrow">${modes}</div>` : "") +
    sect(presets ? "Forhåndsvalg" : "", presets ? `<div class="pickrow">${presets}</div>` : "") +
    sect(fans ? "Vifte" : "", fans ? `<div class="pickrow">${fans}</div>` : "");
}

/* -------------------------------------------------------------- vifte */

function fanDetail(ctx, eid, roomName) {
  const st = ctx.hass.states[eid];
  const a = st.attributes;
  const d = domainOf(eid);
  const on = isOn(st);
  const val = d === "fan" ? (a.percentage ?? (on ? 100 : 0)) : (a.humidity ?? 50);
  const presets = (a.preset_modes || []).map((m) => `
    <div class="pick ${a.preset_mode === m ? "sel" : ""}" data-act="fanpreset" data-e="${h(eid)}" data-m="${h(m)}">
      ${h(m)}</div>`).join("");
  const osc = a.oscillating != null ? `
    <div class="optrow"><div class="ot"><b>Svinger</b></div>
      <div class="sw-toggle ${a.oscillating ? "on" : ""}" data-act="oscillate" data-e="${h(eid)}"><i></i></div>
    </div>` : "";
  const dir = a.direction ? `<div class="pickrow">
      ${["forward", "reverse"].map((x) => `<div class="pick ${a.direction === x ? "sel" : ""}"
        data-act="fandir" data-e="${h(eid)}" data-m="${x}">${x === "forward" ? "Fram" : "Revers"}</div>`).join("")}
    </div>` : "";

  return head(ctx, eid, roomName) +
    sect(d === "fan" ? "Hastighet" : "Målfuktighet",
      bigSlider(d === "fan" ? "fanpct" : "humidity", eid, val), Math.round(val) + " %") +
    sect(presets ? "Modus" : "", presets ? `<div class="pickrow">${presets}</div>` : "") +
    sect(osc || dir ? "Mer" : "", osc + dir);
}

/* ----------------------------------------------------------- støvsuger */

function vacuumDetail(ctx, eid, roomName) {
  const st = ctx.hass.states[eid];
  const a = st.attributes;
  const batt = a.battery_level;
  const speeds = (a.fan_speed_list || []).map((x) => `
    <div class="pick ${a.fan_speed === x ? "sel" : ""}" data-act="vacspeed" data-e="${h(eid)}" data-m="${h(x)}">
      ${h(x)}</div>`).join("");
  return head(ctx, eid, roomName) +
    sect("Styr", `<div class="pickrow">
      <div class="pick" data-act="vac" data-e="${h(eid)}" data-s="start">${ic(ICON.play)}<span>Start</span></div>
      <div class="pick" data-act="vac" data-e="${h(eid)}" data-s="pause">${ic(ICON.pause)}<span>Pause</span></div>
      <div class="pick" data-act="vac" data-e="${h(eid)}" data-s="return_to_base">${ic("mdi:home-import-outline")}<span>Til dokken</span></div>
      <div class="pick" data-act="vac" data-e="${h(eid)}" data-s="locate">${ic("mdi:map-marker-radius")}<span>Finn</span></div>
    </div>`) +
    sect(speeds ? "Sugestyrke" : "", speeds ? `<div class="pickrow">${speeds}</div>` : "") +
    sect(batt != null ? "Batteri" : "",
      batt != null ? `<div class="minibar" style="height:14px"><i style="width:${batt}%"></i></div>
        <div class="sub" style="margin-top:5px">${batt} %</div>` : "");
}

/* ----------------------------------------------------------- bryter */

function switchDetail(ctx, eid, roomName, model) {
  const { hass } = ctx;
  const reg = hass.entities?.[eid];
  const did = reg?.device_id;
  /* finn effekt/energi fra samme fysiske enhet */
  let power = null, energy = null, current = null, voltage = null;
  if (did) {
    for (const [e2, r2] of Object.entries(hass.entities || {})) {
      if (r2.device_id !== did || !e2.startsWith("sensor.")) continue;
      const dc = hass.states[e2]?.attributes?.device_class;
      if (dc === "power") power = e2;
      else if (dc === "energy") energy = e2;
      else if (dc === "current") current = e2;
      else if (dc === "voltage") voltage = e2;
    }
  }
  const pill = (eid2, label, dec = 1) => {
    const s2 = hass.states[eid2];
    if (!s2 || isDead(s2)) return "";
    return `<div class="sensorpill">${ic(ICON.bolt)}<span>${h(label)}</span>
      <b>${fmtNum(s2.state, dec)} ${h(s2.attributes.unit_of_measurement || "")}</b></div>`;
  };
  const meas = [pill(power, "Effekt", 1), pill(energy, "Energi", 1),
                pill(current, "Strøm", 2), pill(voltage, "Spenning", 0)].filter(Boolean).join("");

  return head(ctx, eid, roomName) +
    sect(meas ? "Måling" : "", meas ? `<div class="sensorrow">${meas}</div>` : "") +
    (power ? sect("Siste 6 timer", sparkline(ctx, power)) : "") +
    timerSect(ctx, eid);
}

/* ------------------------------------------------------------ sensor */

export function sparkline(ctx, eid) {
  const data = (ctx.history || {})[eid];
  if (!data) return `<div class="sub">Laster historikk …</div>`;
  if (!data.length) return `<div class="sub">Ingen historikk.</div>`;
  const vals = data.map((p) => p.v);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo || 1;
  const W = 600, H = 90;
  const pts = data.map((p, i) => {
    const x = (i / Math.max(1, data.length - 1)) * W;
    const y = H - ((p.v - lo) / span) * (H - 10) - 5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const unit = ctx.hass.states[eid]?.attributes?.unit_of_measurement || "";
  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"
         style="width:100%;height:90px;display:block">
      <polyline points="${pts.join(" ")}" fill="none" stroke="var(--accent)"
        stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"
        vector-effect="non-scaling-stroke"></polyline>
      <polyline points="0,${H} ${pts.join(" ")} ${W},${H}" fill="var(--accent)"
        opacity=".14" stroke="none"></polyline>
    </svg>
    <div style="display:flex;justify-content:space-between;margin-top:4px">
      <span class="sub" style="font-size:11.5px">lav ${fmtNum(lo, 1)} ${h(unit)}</span>
      <span class="sub" style="font-size:11.5px">høy ${fmtNum(hi, 1)} ${h(unit)}</span>
    </div>`;
}

function sensorDetail(ctx, eid, roomName) {
  const st = ctx.hass.states[eid];
  const a = st.attributes;
  const unit = a.unit_of_measurement || "";
  return `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">
      <div class="ic" style="width:54px;height:54px">${ic(ICON.thermo)}</div>
      <div style="flex:1">
        <div class="h2" style="font-size:20px">${h(nameOf(ctx.hass, ctx.cfg, eid))}</div>
        <div class="sub">${h(roomName || "")}</div>
      </div>
      <div style="font-size:34px;font-weight:600;font-variant-numeric:tabular-nums">
        ${isDead(st) ? "–" : fmtNum(st.state, 1)}<span style="font-size:17px;opacity:.6"> ${h(unit)}</span></div>
    </div>
    ${sect("Siste 6 timer", sparkline(ctx, eid))}`;
}

/* ------------------------------------------------------------ generisk */

function genericDetail(ctx, eid, roomName) {
  const st = ctx.hass.states[eid];
  const opts = st.attributes?.options;
  const d = domainOf(eid);
  const sel = d === "select" && opts ? `<div class="pickrow">${opts.map((o) => `
    <div class="pick ${st.state === o ? "sel" : ""}" data-act="selectopt" data-e="${h(eid)}" data-m="${h(o)}">
      ${h(o)}</div>`).join("")}</div>` : "";
  return head(ctx, eid, roomName) + sect(sel ? "Valg" : "", sel);
}

/* -------------------------------------------------------------- ark */

/* Hue-effektene heter «candle», «sparkle» osv. i API-et. Oversett dem,
   ellers står det engelsk stikkordsalat midt i et norsk grensesnitt. */
const EFFECT_NAME = {
  off: "Av", candle: "Levende lys", fire: "Peis", prism: "Prisme",
  sparkle: "Glitter", opal: "Opal", glisten: "Skimmer",
  underwater: "Under vann", cosmos: "Kosmos", sunbeam: "Solstråle",
  enchant: "Fortryllet", sunrise: "Soloppgang", sunset: "Solnedgang",
  colorloop: "Fargeløkke", rainbow: "Regnbue", random: "Tilfeldig",
};

const EFFECT_ICON = {
  off: "mdi:close", candle: "mdi:candle", fire: "mdi:fireplace",
  prism: "mdi:triangle-outline", sparkle: "mdi:shimmer", opal: "mdi:circle-opacity",
  glisten: "mdi:white-balance-sunny", underwater: "mdi:waves", cosmos: "mdi:star-four-points",
  sunbeam: "mdi:weather-sunny", enchant: "mdi:auto-fix", sunrise: "mdi:weather-sunset-up",
  sunset: "mdi:weather-sunset-down", colorloop: "mdi:looks", rainbow: "mdi:looks",
};

function effectName(x) {
  if (EFFECT_NAME[x]) return EFFECT_NAME[x];
  return String(x).charAt(0).toUpperCase() + String(x).slice(1).replace(/_/g, " ");
}

export function detailSheet(ctx, model) {
  const eid = ctx.detailEid;
  const { hass } = ctx;
  const st = eid ? hass.states[eid] : null;
  if (!st) return sheet("Enhet", `<div class="empty">Fant ikke enheten.</div>`);

  const room = model.rooms.find((r) => r.controls.includes(eid) ||
    r.security.includes(eid) || r.sensors.includes(eid));
  const roomName = room?.name;
  const d = domainOf(eid);

  let body;
  if (d === "light") body = lightDetail(ctx, eid, roomName, model);
  else if (d === "cover") body = coverDetail(ctx, eid, roomName);
  else if (d === "climate") body = climateDetail(ctx, eid, roomName);
  else if (d === "fan" || d === "humidifier") body = fanDetail(ctx, eid, roomName);
  else if (d === "vacuum") body = vacuumDetail(ctx, eid, roomName);
  else if (d === "switch" || d === "input_boolean") body = switchDetail(ctx, eid, roomName, model);
  else if (d === "sensor") body = sensorDetail(ctx, eid, roomName);
  else body = genericDetail(ctx, eid, roomName);

  const foot = `
    <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:18px;
                border-top:1px solid rgba(255,255,255,.08);padding-top:14px">
      <div class="btn" data-act="moreinfo" data-e="${h(eid)}">
        ${ic("mdi:information-outline")}Home Assistant</div>
      <div class="btn" data-act="history" data-e="${h(eid)}">
        ${ic("mdi:chart-line")}Historikk</div>
    </div>`;

  return sheet(nameOf(hass, ctx.cfg, eid), body + foot);
}
