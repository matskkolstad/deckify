/* Deckify — overlays.js
 * Kalender, gjøremål, værvarsel, full mediaspiller, enhetsvelger, bekreftelse.
 */
import {
  h, ICON, WEATHER_ICON, WEATHER_TEXT, fmtNum, mmss, clamp, domainOf,
  nameOf, fullNameOf, shortName, isDead, entityIcon, DOMAIN_LABEL, matchScore,
} from "./core.js?v=2.3.0";
import { ic, mediaPos, stateText, isCardOn } from "./controls.js?v=2.3.0";

const NB_DAY_SHORT = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];
const NB_DAY_HDR = ["MAN", "TIR", "ONS", "TOR", "FRE", "LØR", "SØN"];
const NB_MON = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];

const CAL_COLORS = ["#4a90d9", "#d9534f", "#5cb85c", "#b07ad9", "#e0923c", "#39b3b3"];

/* ------------------------------------------------------------- værvarsel */

export function weatherSheet(ctx) {
  const { hass } = ctx;
  const eid = ctx.cfg.weatherEntity;
  const st = eid ? hass.states[eid] : null;
  /* Når HA-enheten er nede eller mangler, kommer alt fra Open-Meteo i stedet. */
  const wd = ctx.weather || {};
  if (!st && !wd.ok)
    return sheet("Værvarsel", `<div class="empty">Ingen værtjeneste funnet.</div>`);

  const live = st && !isDead(st);
  const a = live ? st.attributes : {
    temperature: wd.temperature, humidity: wd.humidity,
    wind_speed: wd.wind, wind_speed_unit: "km/t",
    pressure: wd.pressure, apparent_temperature: wd.apparent,
  };
  const hourly = (ctx.forecast?.hourly?.length ? ctx.forecast.hourly : wd.hourly) || [];
  const daily = (ctx.forecast?.daily?.length ? ctx.forecast.daily : wd.daily) || [];
  const sun = hass.states["sun.sun"];
  const rise = sun?.attributes?.next_rising || wd.sunrise;
  const set = sun?.attributes?.next_setting || wd.sunset;
  const hhmm = (iso) => iso ? new Date(iso).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" }) : "–";

  const today = daily[0];
  const tags = [
    today?.precipitation_probability != null ? `${ic("mdi:weather-rainy")}Nedbør ${Math.round(today.precipitation_probability)} %` : null,
    a.humidity != null ? `${ic("mdi:water-percent")}Fukt ${Math.round(a.humidity)} %` : null,
    a.wind_speed != null ? `${ic("mdi:weather-windy")}Vind ${fmtNum(a.wind_speed, 1)} ${a.wind_speed_unit || "km/t"}` : null,
    a.pressure != null ? `${ic("mdi:gauge")}${fmtNum(a.pressure, 0)} hPa` : null,
    `${ic("mdi:weather-sunset-up")}Opp ${hhmm(rise)}`,
    `${ic("mdi:weather-sunset-down")}Ned ${hhmm(set)}`,
  ].filter(Boolean).map((t) => `<div class="wtag">${t}</div>`).join("");

  const hours = hourly.slice(0, 24).map((f, i) => {
    const d = new Date(f.datetime);
    return `<div class="hourcell">
      <div class="hh">${i === 0 ? "Nå" : String(d.getHours()).padStart(2, "0") + ":00"}</div>
      ${ic(WEATHER_ICON[f.condition] || "mdi:weather-cloudy")}
      <div class="tt">${fmtNum(f.temperature, 0)}°</div>
      ${f.precipitation_probability != null ? `<div class="pp">${Math.round(f.precipitation_probability)} %</div>` : ""}
    </div>`;
  }).join("");

  const lows = daily.map((d) => d.templow).filter((v) => v != null);
  const highs = daily.map((d) => d.temperature).filter((v) => v != null);
  const gmin = lows.length ? Math.min(...lows) : 0;
  const gmax = highs.length ? Math.max(...highs) : 1;
  const span = Math.max(1, gmax - gmin);

  const days = daily.slice(0, 7).map((f, i) => {
    const d = new Date(f.datetime);
    const lo = f.templow ?? f.temperature;
    const hi = f.temperature;
    const l = ((lo - gmin) / span) * 100, r = ((hi - gmin) / span) * 100;
    return `<div class="dayrow">
      <span>${i === 0 ? "I dag" : h(NB_DAY_SHORT[d.getDay()])}</span>
      ${ic(WEATHER_ICON[f.condition] || "mdi:weather-cloudy")}
      <span class="pp">${f.precipitation_probability != null ? Math.round(f.precipitation_probability) + " %" : ""}</span>
      <span style="display:flex;align-items:center;gap:9px">
        <span class="lo" style="min-width:30px">${fmtNum(lo, 0)}°</span>
        <span class="tband" style="flex:1"><i style="left:${l}%;right:${100 - r}%"></i></span>
      </span>
      <span class="hi">${fmtNum(hi, 0)}°</span>
    </div>`;
  }).join("");

  const body = `
    <div class="wnow">
      ${ic(WEATHER_ICON[(live ? st.state : wd.state)] || "mdi:weather-cloudy", "wi")}
      <div>
        <div class="deg">${fmtNum(a.temperature, 0)}°</div>
      </div>
      <div style="margin-left:4px">
        <div style="font-size:17px;font-weight:600">${h(WEATHER_TEXT[(live ? st.state : wd.state)] || (live ? st.state : wd.state))}</div>
        <div class="sub">${today ? `Høy ${fmtNum(today.temperature, 0)}° · lav ${fmtNum(today.templow, 0)}°` : ""}</div>
      </div>
    </div>
    <div class="wtags">${tags}</div>
    <div class="lbl" style="margin-top:16px">Neste timer</div>
    <div class="hours">${hours || `<div class="sub">Laster …</div>`}</div>
    <div class="lbl" style="margin-top:14px">Neste 7 dager</div>
    <div class="days">${days || `<div class="sub">Laster …</div>`}</div>
    <div class="sub" style="margin-top:14px;font-size:11px">Kilde: ${h(nameOf(hass, ctx.cfg, eid))}</div>`;
  return sheet("Værvarsel", body);
}

/* ------------------------------------------------------------- kalender */

export function calendarSheet(ctx) {
  const month = ctx.calMonth || new Date();
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startDow = (first.getDay() + 6) % 7;            // mandag = 0
  const start = new Date(first); start.setDate(1 - startDow);
  const cells = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sel = ctx.calSel ? new Date(ctx.calSel) : today;
  sel.setHours(0, 0, 0, 0);

  const evs = ctx.calendar?.events || [];
  const calIdx = {};
  (ctx.calendar?.calendars || []).forEach((c, i) => { calIdx[c] = i; });

  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i); d.setHours(0, 0, 0, 0);
    const dayEvs = evs.filter((e) => sameDay(e.start, d));
    const isToday = d.getTime() === today.getTime();
    const isSel = d.getTime() === sel.getTime();
    const dim = d.getMonth() !== month.getMonth();
    cells.push(`
      <div class="calcell ${dim ? "dim" : ""} ${isToday ? "today" : ""} ${isSel ? "sel" : ""}"
           data-act="calday" data-d="${d.toISOString()}">
        <div class="dn">${d.getDate()}</div>
        ${dayEvs.slice(0, 3).map((e) => {
          const c = CAL_COLORS[(calIdx[e.cal] ?? 0) % CAL_COLORS.length];
          return `<div class="ev" style="border-color:${c};background:${c}33">${h(e.summary)}</div>`;
        }).join("")}
        ${dayEvs.length > 3 ? `<div class="ev" style="border-color:transparent;opacity:.6">+${dayEvs.length - 3} til</div>` : ""}
      </div>`);
  }

  const selEvs = evs.filter((e) => sameDay(e.start, sel))
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  const agenda = selEvs.length ? selEvs.map((e) => {
    const c = CAL_COLORS[(calIdx[e.cal] ?? 0) % CAL_COLORS.length];
    const allDay = e.allDay;
    const t = allDay ? "Hele dagen"
      : `${fmtT(e.start)} – ${fmtT(e.end)}`;
    return `<div class="agitem" style="border-color:${c};background:${c}22">
      <span class="cal" style="color:${c}">${h(e.calName)}</span>
      <div class="t">${h(e.summary)}</div>
      <div class="m">${ic("mdi:clock-outline")}${h(t)}</div>
      ${e.location ? `<div class="m">${ic("mdi:map-marker-outline")}${h(e.location)}</div>` : ""}
    </div>`;
  }).join("") : `<div class="sub" style="padding:10px 0">Ingen hendelser denne dagen.</div>`;

  const body = `
    <div class="callayout">
      <div>
        <div class="calgrid">${NB_DAY_HDR.map((d) => `<div class="calhd">${d}</div>`).join("")}</div>
        <div class="calgrid">${cells.join("")}</div>
      </div>
      <div class="calside">
        <div class="lbl">${sel.getTime() === today.getTime() ? "I dag" : h(NB_DAY_HDR[(sel.getDay() + 6) % 7])}</div>
        <div class="h2" style="margin:3px 0 14px">${sel.getDate()}. ${h(NB_MON[sel.getMonth()])}</div>
        ${agenda}
      </div>
    </div>`;

  const head = `
    <div class="sheethead">
      <div class="xbtn" data-act="calmonth" data-d="-1" title="Forrige måned" aria-label="Forrige måned">${ic(ICON.left)}</div>
      <div class="h2" style="flex:1">${h(NB_MON[month.getMonth()][0].toUpperCase() + NB_MON[month.getMonth()].slice(1))} ${month.getFullYear()}</div>
      <div class="xbtn" data-act="calmonth" data-d="1" title="Neste måned" aria-label="Neste måned">${ic(ICON.right)}</div>
      <div class="btn" data-act="caltoday">I dag</div>
      <div class="xbtn" data-act="closeoverlay" title="Lukk" aria-label="Lukk">${ic(ICON.close)}</div>
    </div>`;
  return `<div class="scrim" data-act="closeoverlay"></div>
    <div class="sheet full" role="dialog" aria-modal="true" aria-label="Kalender" tabindex="-1">${head}${body}</div>`;
}

function sameDay(iso, d) {
  const a = new Date(iso); a.setHours(0, 0, 0, 0);
  return a.getTime() === d.getTime();
}
function fmtT(iso) {
  return new Date(iso).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
}

/* ------------------------------------------------------------- gjøremål */

export function todoSheet(ctx) {
  const items = ctx.agenda?.todoItems || [];
  const now = new Date();
  const rows = items.length ? items.map((it) => {
    const done = it.status === "completed";
    const due = it.due ? new Date(it.due) : null;
    const over = due && !done && due < now;
    const dueTxt = due
      ? (due.toDateString() === now.toDateString() ? "I dag"
        : due.toLocaleDateString("nb-NO", { day: "numeric", month: "short" }))
      : "";
    return `<div class="todoitem ${done ? "done" : ""} ${over ? "over" : ""}">
      <div class="cbox ${done ? "done" : ""}" data-act="todotoggle" data-uid="${h(it.uid)}">${done ? ic(ICON.check) : ""}</div>
      <div class="t">${h(it.summary)}</div>
      ${dueTxt ? `<div class="due">${h(dueTxt)}</div>` : ""}
    </div>`;
  }).join("") : `<div class="empty">${ic(ICON.check)}Ingenting står igjen.</div>`;
  const name = ctx.cfg.todoEntity ? nameOf(ctx.hass, ctx.cfg, ctx.cfg.todoEntity) : "Gjøremål";
  return sheet(name, rows);
}

/* -------------------------------------------------------- full spiller */

export function playerSheet(ctx) {
  const { hass } = ctx;
  const eid = ctx.playerEid;
  const st = eid ? hass.states[eid] : null;
  if (!st) return sheet("Spiller", `<div class="empty">Fant ikke spilleren.</div>`);
  const a = st.attributes;
  const playing = ["playing", "buffering"].includes(st.state);
  const art = a.entity_picture;
  const dur = a.media_duration || 0;
  const pos = mediaPos(st);
  const pct = dur ? clamp((pos / dur) * 100, 0, 100) : 0;
  const src = a.source || "";
  const spotify = /spotify/i.test(src) || /spotify/i.test(a.media_content_id || "");
  const vol = a.volume_level != null ? Math.round(a.volume_level * 100) : null;
  const feat = a.supported_features || 0;

  const siblings = Object.keys(hass.states).filter((e) =>
    domainOf(e) === "media_player" && hass.states[e].attributes.device_class === a.device_class &&
    !isDead(hass.states[e]) && !ctx.cfg.excludePlatforms.has(hass.entities?.[e]?.platform));
  const group = a.group_members || [];
  const spk = siblings.slice(0, 10).map((e) => {
    const inGroup = group.includes(e);
    const sel = e === eid;
    return `<div class="spkbtn ${sel ? "sel" : ""}" data-act="selplayer" data-e="${h(e)}">
      ${ic(inGroup ? "mdi:speaker-multiple" : ICON.media)}
      <span>${h(nameOf(hass, ctx.cfg, e))}</span></div>`;
  }).join("");

  const body = `
    <div class="player">
      ${art ? `<div class="cover" style="background-image:url('${h(art)}')"></div>`
            : `<div class="cover ph">${ic(ICON.media)}</div>`}
      <div class="srcline ${spotify ? "" : "generic"}" style="margin-top:16px">
        ${ic(spotify ? "mdi:spotify" : ICON.media)}<span>${h(spotify ? "Spotify" : src || "Media")} · ${h(nameOf(hass, ctx.cfg, eid))}</span>
      </div>
      <div class="ttl">${h(a.media_title || nameOf(hass, ctx.cfg, eid))}</div>
      <div class="art2">${h([a.media_artist, a.media_album_name].filter(Boolean).join(" · "))}</div>
      <div class="pbar">
        <div class="prog" style="height:5px" data-slider="seek" data-e="${h(eid)}" data-dur="${dur}">
          <i style="width:${pct}%"></i></div>
        <div class="ptimes"><span>${mmss(pos)}</span><span>${dur ? "−" + mmss(dur - pos) : ""}</span></div>
      </div>
      <div class="big-transport">
        <div class="tb" data-act="mp" data-e="${h(eid)}" data-s="media_previous_track">${ic(ICON.prev)}</div>
        <div class="tb main" data-act="mp" data-e="${h(eid)}" data-s="media_play_pause">${ic(playing ? ICON.pause : ICON.play)}</div>
        <div class="tb" data-act="mp" data-e="${h(eid)}" data-s="media_next_track">${ic(ICON.next)}</div>
      </div>
      <div class="row2">
        <div style="display:flex;gap:10px">
          <div class="tb" style="width:40px;height:40px;border-radius:20px;background:rgba(255,255,255,.1);display:grid;place-items:center;cursor:pointer${group.length > 1 ? ";background:#fff;color:#1a1218" : ""}"
               data-act="groupsheet" data-e="${h(eid)}">${ic("mdi:speaker-multiple")}</div>
          <div class="tb" style="width:40px;height:40px;border-radius:20px;background:rgba(255,255,255,.1);display:grid;place-items:center;cursor:pointer"
               data-act="browse" data-e="${h(eid)}">${ic("mdi:playlist-music-outline")}</div>
          <div class="tb" style="width:40px;height:40px;border-radius:20px;background:rgba(255,255,255,.1);display:grid;place-items:center;cursor:pointer;${a.shuffle ? "background:#fff;color:#1a1218" : ""}"
               data-act="shuffle" data-e="${h(eid)}">${ic(ICON.shuffle)}</div>
          <div class="tb" style="width:40px;height:40px;border-radius:20px;background:rgba(255,255,255,.1);display:grid;place-items:center;cursor:pointer;${a.repeat && a.repeat !== "off" ? "background:#fff;color:#1a1218" : ""}"
               data-act="repeat" data-e="${h(eid)}">${ic(a.repeat === "one" ? ICON.repeatOne : ICON.repeat)}</div>
        </div>
        ${vol != null ? `
        <div class="volpill">
          <div class="vb" data-act="vol" data-e="${h(eid)}" data-d="-5">${ic(ICON.minus)}</div>
          <div class="vt">${vol} %</div>
          <div class="vb" data-act="vol" data-e="${h(eid)}" data-d="5">${ic(ICON.plus)}</div>
        </div>` : ""}
      </div>
      ${spk ? `<div class="spk">${spk}</div>` : ""}
    </div>`;

  return `<div class="scrim" data-act="closeoverlay"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Spiller" tabindex="-1" style="position:relative;overflow:hidden">
      ${art ? `<div class="playerbg" style="background-image:url('${h(art)}')"></div>` : ""}
      <div style="position:relative;z-index:1">
        <div class="sheethead"><div style="flex:1"></div>
          <div class="xbtn" data-act="closeoverlay" title="Lukk" aria-label="Lukk">${ic(ICON.close)}</div></div>
        ${body}
      </div>
    </div>`;
}

/* ------------------------------------------------------- enhetsvelger */

export function pickerSheet(ctx, model) {
  const { hass } = ctx;
  const scope = ctx.pickerScope || "";
  const mode = ctx.pickerMode;              // "devices" | "scenes"
  const raw = (ctx.pickerQ || "").trim();
  const q = raw.toLowerCase();
  const domFilter = ctx.pickerDomain || null;
  const picked = new Set(ctx.scopeIds || []);
  const isChips = scope.startsWith("chips:");

  /* kandidater: scener -> bare scene-domenet, ellers alt som er lovlig */
  let items = mode === "scenes"
    ? model.addable.filter((x) => x.domain === "scene")
    : model.addable.filter((x) => x.domain !== "scene");

  /* domeneteller FØR filtrering, så knappene ikke forsvinner */
  const counts = {};
  for (const x of items) counts[x.domain] = (counts[x.domain] || 0) + 1;

  if (domFilter) items = items.filter((x) => x.domain === domFilter);

  /* Søket er poengsatt (samme funksjon som det globale søket), ikke en ren
     `includes`. Når man søker har gruppering på rom ingen verdi — da vil man
     ha de beste treffene øverst, ikke dem spredt over ni overskrifter. */
  let hits = null;
  if (q) {
    hits = [];
    for (const x of items) {
      const nm = fullNameOf(hass, ctx.cfg, x.eid);
      const sc = matchScore(q, nm, x.area, x.eid, x.domain);
      if (sc > 0) hits.push({ ...x, nm, sc: sc + (picked.has(x.eid) ? 40 : 0) });
    }
    hits.sort((a, b) => b.sc - a.sc || a.nm.localeCompare(b.nm, "nb"));
    hits = hits.slice(0, 120);
  }

  const row = (x, area) => {
    const on = picked.has(x.eid);
    const st = hass.states[x.eid];
    const nm = x.nm || fullNameOf(hass, ctx.cfg, x.eid);
    return `
    <div class="pickrow2 ${on ? "sel" : ""}" data-act="pick" data-e="${h(x.eid)}">
      <div class="ic">${ic(entityIcon(st, x.eid, ctx.cfg))}</div>
      <div class="txt">
        <div class="nm">${h(area ? shortName(nm, area) : nm)}</div>
        <div class="st">${h([DOMAIN_LABEL[x.domain] || x.domain,
          !area && x.area ? x.area : null,
          st?.attributes?.unit_of_measurement || null,
          isDead(st) ? "utilgjengelig" : null].filter(Boolean).join(" · "))}</div>
      </div>
      ${ic(on ? ICON.check : ICON.plus, on ? "okmark" : "addmark")}
    </div>`;
  };

  let body2;
  if (q) {
    body2 = hits.length
      ? `<div class="setsec"><h4>Treff <span style="opacity:.5;font-weight:600">${hits.length}</span></h4>
          <div class="pickgrid">${hits.map((x) => row(x, null)).join("")}</div></div>`
      : `<div class="empty">${ic("mdi:magnify-close")}Fant ingenting som heter «${h(raw)}».</div>`;
  } else {
    /* Uten søk: det som allerede er valgt øverst (lett å fjerne igjen),
       deretter alt gruppert på rom. */
    const chosen = items.filter((x) => picked.has(x.eid));
    const byArea = new Map();
    for (const x of items) {
      const k = x.area || "Uten rom";
      if (!byArea.has(k)) byArea.set(k, []);
      byArea.get(k).push(x);
    }
    const groups = [...byArea.entries()].map(([area, list]) => `
      <div class="setsec"><h4>${h(area)} <span style="opacity:.5;font-weight:600">${list.length}</span></h4>
        <div class="pickgrid">${list.map((x) => row(x, area)).join("")}</div></div>`).join("");
    const chosenBlock = chosen.length ? `
      <div class="setsec"><h4>Valgt <span style="opacity:.5;font-weight:600">${chosen.length}</span></h4>
        <div class="pickgrid">${chosen.map((x) => row(x, null)).join("")}</div></div>` : "";
    body2 = chosenBlock + (groups || `<div class="empty">${ic("mdi:magnify")}Ingen treff.</div>`);
  }

  const chips = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([dom, n]) => `
      <div class="pick ${domFilter === dom ? "sel" : ""}" data-act="pickdomain" data-d="${h(dom)}">
        ${ic(entityIcon(null, dom + ".x", ctx.cfg))}
        <span>${h(DOMAIN_LABEL[dom] || dom)}</span>
        <b style="opacity:.55;font-weight:600">${n}</b>
      </div>`).join("");

  const title = isChips ? "Legg til hurtigvalg"
    : mode === "scenes" ? "Legg til scener" : "Legg til enheter";

  /* Hele toppen er sammenklappbar på mobil: domenerekka rullet før den
     vokste nedover og dyttet treffene ut av skjermen. */
  const body = `
    <div class="pickhead">
      <div class="pickfield">
        ${ic("mdi:magnify", "pfic")}
        <input id="pickq" placeholder="${h(isChips ? "Søk etter en enhet …"
          : mode === "scenes" ? "Søk i scener …" : "Søk i alle enheter …")}"
          value="${h(ctx.pickerQ || "")}" autocomplete="off" autocorrect="off"
          spellcheck="false" enterkeyhint="search">
        ${raw ? `<div class="pfx" data-act="pickclear">${ic(ICON.close)}</div>` : ""}
      </div>
      <div class="pickrow">
        <div class="pick ${!domFilter ? "sel" : ""}" data-act="pickdomain" data-d="">
          ${ic("mdi:select-all")}<span>Alle</span></div>
        ${chips}
      </div>
      <div class="sub pickcount">
        ${picked.size} valgt${isChips ? " i denne raden" : " på denne skjermen"} ·
        trykk for å legge til eller fjerne
      </div>
    </div>
    ${body2}`;

  return sheet(title, body, "wide");
}

/* --------------------------------------------------------- bekreftelse */

export function confirmSheet(ctx) {
  const c = ctx.confirm;
  return `<div class="scrim" data-act="closeoverlay"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="${h(c.title)}" tabindex="-1" style="width:min(420px,92vw)">
    <div class="confirm">
      <div class="ic">${ic(ICON.alert)}</div>
      <div class="h2">${h(c.title)}</div>
      <div class="sub" style="margin-top:8px">${h(c.text)}</div>
      <div class="btns">
        <div class="btn" data-act="closeoverlay">Avbryt</div>
        <div class="btn primary" data-act="confirmyes">${h(c.ok || "Ja, gjør det")}</div>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------- rammeverk */

export function sheet(title, body, cls = "") {
  return `<div class="scrim" data-act="closeoverlay"></div>
  <div class="sheet ${cls}" role="dialog" aria-modal="true" aria-label="${h(title)}" tabindex="-1">
    <div class="sheethead">
      <div class="h2">${h(title)}</div>
      <div class="xbtn" data-act="closeoverlay" title="Lukk" aria-label="Lukk">${ic(ICON.close)}</div>
    </div>
    ${body}
  </div>`;
}
