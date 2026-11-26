/* Deckify — start.js
 * Layouten «Startskjerm»: stor klokke, dato, vær og hjemstatus øverst,
 * og under det ett informativt kvadrat per rom — lys på, temperatur,
 * fuktighet og det som ellers er verdt et øyekast. Ingen scenebrikker.
 */
import {
  h, ICON, clamp, fmtNum, isDead, shortName, domainOf, truncate,
  WEATHER_ICON, WEATHER_TEXT, lightColor,
} from "./core.js?v=2.4.1";
import { ic, anyTile } from "./controls.js?v=2.4.1";
import { appleTVs } from "./appletv.js?v=2.4.1";
import { weatherIcon, weatherText } from "./weather.js?v=2.4.1";
import { dateString, timeString, onboarding } from "./views.js?v=2.4.1";

const nval = (ctx, eid) => {
  const st = eid ? ctx.hass.states[eid] : null;
  if (!st || isDead(st)) return null;
  const v = Number(st.state);
  return isFinite(v) ? v : null;
};

/* ------------------------------------------------------------- toppdel */

function hero(ctx, model) {
  const { store } = ctx;
  const w = ctx.weather && ctx.weather.ok ? ctx.weather : null;
  const out = nval(ctx, ctx.cfg.outdoorTemp);
  const agendaN = ctx.agenda?.todayCount ?? 0;
  const todoN = ctx.agenda?.todoPending ?? 0;
  const todoOver = ctx.agenda?.todoOverdue ?? 0;
  const n = model.lightsOn.length;

  const people = store.get("showPeople") ? personDots(ctx) : "";
  const att = ctx.attention || { urgent: 0, action: 0 };

  return `
  <div class="startHero">
    <div class="startClockCol">
      <div class="datestr">${h(dateString(ctx.now))}</div>
      <div class="startClock mono">${timeString(ctx.now, store.get("clock24"), false)}</div>
      <div class="startStatus">
        ${h(n === 0 ? "Alle lys er av"
            : `${n} ${n === 1 ? "lys" : "lys"} på i ${model.roomsWithLightOn} ${model.roomsWithLightOn === 1 ? "rom" : "rom"}`)}
      </div>
      <div class="allbtns" style="margin-top:14px">
        <div class="abtn" data-act="allon">${ic(ICON.lightOn)}<span>Skru alt på</span></div>
        <div class="abtn solid" data-act="alloff">${ic(ICON.power)}<span>Skru alt av</span></div>
      </div>
    </div>

    <div class="startSide">
      ${w ? `
      <div class="startWeather" data-act="overlay" data-o="weather">
        ${ic(weatherIcon(w.state), "bigwi")}
        <div>
          <div class="startTemp">${fmtNum(w.temperature, 0)}°</div>
          <div class="sub">${h(weatherText(w.state))}${
            out != null ? ` · ute ${fmtNum(out, 0)}°` : ""}${
            w.kilde ? ` · ${h(w.kilde)}` : ""}</div>
        </div>
      </div>` : ""}

      <div class="startChips">
        ${store.get("showAgenda") ? `
          <div class="startChip" data-act="overlay" data-o="calendar">
            ${ic(ICON.calendar)}
            <span>${agendaN ? `${agendaN} i dag` : "Ingen avtaler"}</span>
          </div>
          <div class="startChip ${todoOver ? "warn" : ""}" data-act="overlay" data-o="todo">
            ${ic(ICON.todo)}
            <span>${todoN ? `${todoN} gjøremål` : "Lista er tom"}</span>
          </div>` : ""}
        ${people}
        <div class="startChip" data-act="search">${ic("mdi:magnify")}<span>Søk</span></div>
        ${appleTVs(ctx).length ? `<div class="startChip" data-act="appletv">
          ${ic("mdi:apple")}<span>Apple TV</span></div>` : ""}
        ${att.action ? `<div class="startChip ${att.urgent ? "warn" : ""}"
          data-act="nav" data-v="attention">${ic("mdi:bell-badge-outline")}
          <span>${att.urgent ? `${att.urgent} haster` : `${att.action} trenger tilsyn`}</span></div>` : ""}
        <div class="startChip" data-act="overlay" data-o="settings">${ic(ICON.cog)}<span>Innstillinger</span></div>
      </div>
    </div>
  </div>`;
}

function personDots(ctx) {
  const ids = Object.keys(ctx.hass.states).filter((e) => e.startsWith("person."));
  if (!ids.length) return "";
  return ids.slice(0, 4).map((e) => {
    const st = ctx.hass.states[e];
    const home = st.state === "home";
    const nm = st.attributes.friendly_name || e;
    const pic = st.attributes.entity_picture;
    return `<div class="startChip" data-act="detail" data-e="${h(e)}">
      ${pic ? `<span class="pdot" style="background-image:url('${h(pic)}')"></span>`
            : ic(ICON.person)}
      <span>${h(nm.split(" ")[0])} ${home ? "hjemme" : "borte"}</span></div>`;
  }).join("");
}

/* -------------------------------------------------------- romkvadrater */

/** Plukker de 2–3 mest interessante tilleggene for et rom. */
function roomFacts(ctx, room) {
  const { hass } = ctx;
  const facts = [];
  const t = room.temp ? nval(ctx, room.temp) : null;
  const hu = room.hum ? nval(ctx, room.hum) : null;
  if (hu != null) facts.push({ icon: ICON.drop, text: fmtNum(hu, 0) + " %", key: "h" });

  /* åpne dører/vinduer og aktive farer veier tyngst */
  for (const e of room.security) {
    const st = hass.states[e];
    if (!st || st.state !== "on") continue;
    const dc = st.attributes.device_class;
    if (["smoke", "gas"].includes(dc))
      facts.unshift({ icon: ICON.smoke, text: "RØYK", bad: true, key: e });
    else if (dc === "moisture")
      facts.unshift({ icon: ICON.leak, text: "Vann", bad: true, key: e });
    else if (["door", "window", "opening"].includes(dc))
      facts.push({ icon: ICON.door, text: "Åpen", warn: true, key: e });
    else if (["motion", "occupancy", "presence"].includes(dc))
      facts.push({ icon: ICON.motion, text: "Bevegelse", key: e });
  }

  /* media som spiller, og klima som varmer */
  for (const e of room.controls) {
    const st = hass.states[e];
    if (!st) continue;
    const d = domainOf(e);
    if (d === "media_player" && ["playing", "buffering"].includes(st.state))
      facts.push({ icon: ICON.media, text: st.attributes.media_title
        ? truncate(st.attributes.media_title, 18) : "Spiller", key: e });
    else if (d === "climate" && st.state !== "off" && st.attributes.temperature != null)
      facts.push({ icon: ICON.climate, text: fmtNum(st.attributes.temperature, 0) + "°", key: e });
    else if (d === "cover" && (st.state === "open" || st.state === "opening"))
      facts.push({ icon: ICON.cover, text: (st.attributes.current_position ?? 100) + " %", key: e });
    else if (d === "vacuum" && ["cleaning", "returning"].includes(st.state))
      facts.push({ icon: ICON.vacuum, text: "Rydder", key: e });
  }
  return facts;
}

function roomSquare(ctx, room) {
  const { hass } = ctx;
  const on = room.lightsOn > 0;
  const total = room.lightIds.length;
  const facts = roomFacts(ctx, room);
  const bad = facts.some((f) => f.bad);
  const t = room.temp ? nval(ctx, room.temp) : null;

  const dots = room.lightIds.slice(0, 8).map((e) => {
    const lit = hass.states[e]?.state === "on";
    const col = lit ? lightColor(hass.states[e], ctx.accent) : "";
    return `<i class="${lit ? "lit" : ""}"${lit && col ? ` style="background:${col}"` : ""}></i>`;
  }).join("");

  const factHtml = facts.slice(0, 4).map((f) => `
    <span class="sfact ${f.bad ? "bad" : f.warn ? "warn" : ""}">
      ${ic(f.icon)}<b>${h(f.text)}</b></span>`).join("");

  return `
  <div class="card startRoom ${bad ? "alarm" : on ? "on" : ""}" data-act="room" data-r="${h(room.id)}">
    ${ctx.edit ? `<div class="rm" data-act="hide" data-id="room:${h(room.id)}" data-scope="start">${ic(ICON.minus)}</div>
      <div class="cog" data-act="cardcfg" data-id="room:${h(room.id)}" data-scope="start">${ic("mdi:tune-variant")}</div>` : ""}
    <div class="top">
      <div class="ic">${ic(room.icon)}</div>
      <div class="startTopRight">
        ${t != null ? `<span class="startRoomTemp">${fmtNum(t, 1)}°</span>` : ""}
        ${total ? `<div class="pw" data-act="roomtoggle" data-r="${h(room.id)}">${ic(ICON.power)}</div>` : ""}
      </div>
    </div>
    <div class="startRoomName">${h(room.name)}</div>
    <div class="startRoomLights">
      ${total ? `${room.lightsOn} av ${total} lys på` : `${room.controls.length} enheter`}
      ${total ? `<span class="dots">${dots}</span>` : ""}
    </div>
    <div class="sfacts">${factHtml}</div>
  </div>`;
}

/* --------------------------------------------------------- sammendrag */

const SUMMARY_SCOPE = "start:summary";

function rm(ctx, id) {
  return ctx.edit
    ? `<div class="rm" data-act="hide" data-id="${h(id)}" data-scope="${SUMMARY_SCOPE}">${ic(ICON.minus)}</div>
       <div class="cog" data-act="cardcfg" data-id="${h(id)}" data-scope="${SUMMARY_SCOPE}">${ic("mdi:tune-variant")}</div>`
    : "";
}

/** Systemkortene i Oversikt: id -> {cls, act, v, body}. Returnerer bare de som er
 *  relevante akkurat nå (planter/maskin/media/batteri vises kun når de har noe å vise). */
function summarySysCards(ctx, model) {
  const c = ctx.cfg;
  const out = {};

  /* sikkerhet */
  const alerts = [];
  for (const r of model.rooms)
    for (const e of r.security) {
      const st = ctx.hass.states[e];
      if (!st || st.state !== "on") continue;
      const dc = st.attributes.device_class;
      if (["motion", "occupancy", "presence"].includes(dc)) continue;
      alerts.push({ e, r: r.name, dc });
    }
  const flag = c.alarmFlag ? ctx.hass.states[c.alarmFlag] : null;
  const alarm = flag?.state === "on" || alerts.some((a) => ["smoke", "gas", "moisture"].includes(a.dc));
  out["sys:security"] = { cls: alarm ? "alarm" : "", act: "nav", v: "security", body: `
      <div class="lblrow"><div class="ic">${ic(alarm ? ICON.alert : ICON.shield)}</div>
        <div class="lbl">Sikkerhet</div></div>
      <div class="big" style="font-size:${alerts.length ? 24 : 26}px">${
        alerts.length ? h(alerts.length + (alerts.length === 1 ? " varsel" : " varsler")) : "Alt trygt"}</div>
      <div class="st" style="margin-top:2px">${alerts.length
        ? h(alerts.slice(0, 2).map((a) => a.r).join(", ")) : "ingen åpne dører"}</div>` };

  /* strøm */
  const pw = nval(ctx, c.powerSensor);
  const pr = nval(ctx, c.priceSensor);
  const lo = nval(ctx, c.priceLow), hi = nval(ctx, c.priceHigh);
  const band = pr != null && lo != null && hi != null && hi > lo ? (pr - lo) / (hi - lo) : null;
  out["sys:power"] = { cls: band != null && band > 0.67 ? "alarm" : "", act: "nav", v: "energy", body: `
      <div class="lblrow"><div class="ic">${ic(ICON.bolt)}</div><div class="lbl">Strøm</div></div>
      <div class="big num">${pw != null ? fmtNum(pw, 0) : "–"}<span style="font-size:14px;opacity:.6"> W</span></div>
      <div class="st" style="margin-top:2px">${pr != null ? fmtNum(pr, 2) + " kr/kWh" : ""}${
        band == null ? "" : band < 0.34 ? " · billig" : band > 0.67 ? " · dyrt" : ""}</div>` };

  /* planter som vil ha vann */
  const thirsty = (c.plants || []).filter((p) => {
    const m = nval(ctx, p.moisture);
    return m != null && (m < (p.threshold ?? 20) ||
      ctx.hass.states[p.dry]?.state === "on");
  });
  if ((c.plants || []).length) out["sys:plants"] = { cls: thirsty.length ? "on" : "", act: "nav", v: "house", body: `
      <div class="lblrow"><div class="ic">${ic(thirsty.length ? "mdi:watering-can-outline" : "mdi:sprout-outline")}</div>
        <div class="lbl">Planter</div></div>
      <div class="big" style="font-size:26px">${thirsty.length ? h(thirsty.length + " tørre") : "Alle OK"}</div>
      <div class="st" style="margin-top:2px">${thirsty.length
        ? h(thirsty.slice(0, 2).map((p) => p.name).join(", ")) : `${c.plants.length} overvåket`}</div>` };

  /* maskiner som kjører */
  const running = (c.machines || []).filter((m) =>
    ctx.hass.states[m.running]?.state === "on");
  if (running.length) out["sys:machines"] = { cls: "on", act: "nav", v: "house", body: `
      <div class="lblrow"><div class="ic">${ic(running[0].icon)}</div><div class="lbl">Maskin</div></div>
      <div class="big" style="font-size:22px">${h(running[0].name)}</div>
      <div class="st" style="margin-top:2px">${(() => {
        const left = nval(ctx, running[0].remaining);
        const prog = nval(ctx, running[0].progress);
        return left ? `${fmtNum(left, 0)} min igjen` : prog != null ? `${fmtNum(prog, 0)} %` : "i gang";
      })()}</div>` };

  /* Apple TV — fjernkontrollen ett trykk unna også fra startskjermen.
     Denne layouten viser ingen mediekort, så uten dette fantes det ingen
     vei inn til kontrollen i det hele tatt. */
  for (const tv of appleTVs(ctx)) {
    const tst = ctx.hass.states[tv.media];
    const live = tst && !isDead(tst) && tst.state !== "off";
    const app = tst?.attributes?.app_name;
    const title = tst?.attributes?.media_title;
    out["atv:" + tv.media] = {
      cls: live && tst.state === "playing" ? "on" : "", act: "appletv",
      e: tv.media, body: `
      <div class="lblrow"><div class="ic">${ic("mdi:apple")}</div>
        <div class="lbl">${h(tv.name)}</div></div>
      <div class="big" style="font-size:${title ? 18 : 24}px">${
        h(title ? truncate(title, 26) : live ? (app || "På") : "Av")}</div>
      <div class="st" style="margin-top:2px">${
        h(live && title && app ? app : "Trykk for fjernkontroll")}</div>` };
  }

  /* media som spiller */
  const playing = [];
  for (const r of model.rooms)
    for (const e of r.controls)
      if (domainOf(e) === "media_player" &&
          ctx.hass.entities?.[e]?.platform !== "apple_tv" &&
          ["playing", "buffering"].includes(ctx.hass.states[e]?.state))
        playing.push({ e, r: r.name });
  if (playing.length) {
    const st = ctx.hass.states[playing[0].e];
    out["sys:media"] = { cls: "on", act: "nav", v: "media", body: `
      <div class="lblrow"><div class="ic">${ic(ICON.media)}</div><div class="lbl">Spiller</div></div>
      <div class="big" style="font-size:20px">${h(truncate(st.attributes.media_title || "Musikk", 26))}</div>
      <div class="st" style="margin-top:2px">${h(playing.map((p) => p.r).join(", "))}</div>` };
  }

  /* svake batterier */
  const warn = c.batteryWarn ?? 25;
  const seen = new Set();
  let lowN = 0;
  for (const [eid, reg] of Object.entries(ctx.hass.entities || {})) {
    if (!eid.startsWith("sensor.")) continue;
    const st = ctx.hass.states[eid];
    if (st?.attributes?.device_class !== "battery") continue;
    if (c.excludePlatforms.has(reg.platform)) continue;
    const v = nval(ctx, eid);
    if (v == null || v > warn) continue;
    const key = (reg.device_id || eid);
    if (seen.has(key)) continue;
    seen.add(key);
    lowN++;
  }
  if (lowN) out["sys:battery"] = { cls: "", act: "nav", v: "house", body: `
      <div class="lblrow"><div class="ic">${ic("mdi:battery-alert-variant-outline")}</div>
        <div class="lbl">Batteri</div></div>
      <div class="big" style="font-size:26px">${lowN} svake</div>
      <div class="st" style="margin-top:2px">under ${warn} %</div>` };

  return out;
}

/** Oversikt-raden: systemkortene (skjulbare/omrokkerbare) pluss enheter
 *  lagt til via «Legg til enheter». Rekkefølge/skjul deles i scope «start:summary». */
function summary(ctx, model) {
  const sys = summarySysCards(ctx, model);
  const hidden = ctx.store.data.hidden[SUMMARY_SCOPE] || [];
  const order = ctx.store.data.order[SUMMARY_SCOPE];
  /* Tomt dashbord: systemkortene kommer ikke av seg selv. */
  const sysIds = Object.keys(sys).filter((id) => !hidden.includes(id) &&
    (ctx.cfg.autoFill || (order || []).includes(id)));
  const devIds = (order || []).filter((id) => !id.startsWith("sys:") && !hidden.includes(id) &&
    ctx.hass.states[id]);

  let ids;
  if (order) {
    const known = new Set([...sysIds, ...devIds]);
    ids = [...order.filter((id) => known.has(id)), ...sysIds.filter((id) => !order.includes(id))];
  } else {
    ids = [...sysIds, ...devIds];
  }

  const cards = ids.map((id) => {
    if (sys[id]) return `
      <div class="card info ${sys[id].cls}" data-act="${sys[id].act}"${
        sys[id].e ? ` data-e="${h(sys[id].e)}"` : ""}${
        sys[id].v ? ` data-v="${h(sys[id].v)}"` : ""}>
        ${rm(ctx, id)}
        ${sys[id].body}
      </div>`;
    return anyTile(ctx, id, null, id, false, SUMMARY_SCOPE);
  }).join("");

  const SYS_LBL = { "sys:security": "Sikkerhet", "sys:climate": "Klima", "sys:power": "Strøm" };
  const missing = ctx.edit
    ? Object.keys(sys).filter((id) => !ids.includes(id) && !hidden.includes(id)).map((id) => `
        <div class="card addcard" data-act="addtile" data-id="${h(id)}" data-scope="${SUMMARY_SCOPE}">
          <div class="inner"><div class="ic">${ic(ICON.plus)}</div>
            <span>${h(SYS_LBL[id] || id)}</span></div></div>`).join("")
    : "";
  const add = ctx.edit
    ? `<div class="card addcard" data-act="adddevices" data-scope="${SUMMARY_SCOPE}">
        <div class="inner"><div class="ic">${ic(ICON.plus)}</div><span>Legg til enheter</span></div></div>`
    : "";

  return cards + missing + add;
}

/* ----------------------------------------------------------- visningen */

export function viewStart(ctx, model) {
  const scope = "start";
  const hidden = ctx.store.data.hidden[scope] || [];
  const order = ctx.store.data.order[scope];
  /* Uten autofyll vises bare rommene brukeren har lagt inn. */
  const pool = ctx.cfg.autoFill
    ? model.rooms
    : model.rooms.filter((r) => (order || []).includes("room:" + r.id));
  const rooms = pool.filter((r) => !hidden.includes("room:" + r.id));
  const sorted = order
    ? [...rooms].sort((a, b) => {
        const ia = order.indexOf("room:" + a.id), ib = order.indexOf("room:" + b.id);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      })
    : rooms;
  const missingRooms = ctx.edit
    ? model.rooms.filter((r) => !rooms.includes(r) && !hidden.includes("room:" + r.id)).map((r) => `
        <div class="card addcard" data-act="addtile" data-id="room:${h(r.id)}" data-scope="${scope}">
          <div class="inner"><div class="ic">${ic(r.icon)}</div><span>${h(r.name)}</span></div></div>`).join("")
    : "";

  const summaryHtml = summary(ctx, model);
  const roomsHtml = sorted.map((r) => roomSquare(ctx, r)).join("") + missingRooms;

  return `
    ${hero(ctx, model)}
    ${ctx.edit ? `<div class="edithint">Dra romrutene for å endre rekkefølgen, eller trykk − for å skjule et rom her.</div>` : ""}
    ${roomsHtml || ctx.edit ? `
      <div class="lbl" style="margin-top:26px">Rommene</div>
      <div class="startGrid" data-dropzone="${scope}">${roomsHtml}</div>` : ""}
    ${!sorted.length && !ctx.edit ? onboarding(ctx) : ""}
    ${summaryHtml || ctx.edit ? `
      <div class="lbl" style="margin-top:26px">Oversikt</div>
      ${ctx.edit ? `<div class="edithint">Dra for å flytte, trykk − for å skjule, eller legg til flere enheter.</div>` : ""}
      <div class="grid" style="margin-top:9px" data-dropzone="${SUMMARY_SCOPE}">${summaryHtml}</div>` : ""}`;
}
