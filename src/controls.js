/* Deckify — controls.js
 * Kortene: små fliser, doble kort med kontroller, listerader, scenebrikker.
 */
import {
  h, ICON, isOn, isDead, domainOf, nameOf, shortName, entityIcon, clamp, titleCase,
  lightColor, LIGHT_SWATCHES, CT_STOPS, kelvinToRgb, fmtNum, mmss, WEATHER_ICON,
  BINARY_ICON, SENSOR_ICON, fullNameOf, CARD_SIZES, relTime, areaIdOf,
  sceneName as coreSceneName,
} from "./core.js?v=2.0.1";

const ic = (name, cls = "") => `<ha-icon class="${cls}" icon="${h(name)}"></ha-icon>`;

/* ------------------------------------------- per-kort navn/ikon/info */

/** Navnet kortet skal vise — brukerens overstyring vinner. */
export function cardName(ctx, eid, scope, id, roomName) {
  const c = scope ? ctx.store.cardCfg(scope, id || eid) : null;
  if (c?.name) return c.name;
  return shortName(nameOf(ctx.hass, ctx.cfg, eid), roomName);
}

/** Ikonet kortet skal vise — brukerens overstyring vinner. */
export function cardIcon(ctx, eid, scope, id) {
  const c = scope ? ctx.store.cardCfg(scope, id || eid) : null;
  if (c?.icon) return c.icon;
  return entityIcon(ctx.hass.states[eid], eid, ctx.cfg);
}

/** Finn en søsterentitet på samme fysiske enhet med gitt enhetsklasse. */
function sibling(hass, eid, deviceClass, domain = "sensor") {
  const did = hass.entities?.[eid]?.device_id;
  if (!did) return null;
  for (const e of Object.keys(hass.entities || {})) {
    if (hass.entities[e].device_id !== did) continue;
    if (domainOf(e) !== domain) continue;
    if (hass.states[e]?.attributes?.device_class === deviceClass) return e;
  }
  return null;
}

function sibValue(hass, eid, dc, suffix) {
  const s = sibling(hass, eid, dc);
  if (!s || isDead(hass.states[s])) return null;
  const st = hass.states[s];
  return fmtNum(st.state, 1) + " " + (st.attributes.unit_of_measurement || suffix || "");
}

/**
 * Den lille teksten under navnet. `auto` er den gamle oppførselen;
 * resten er valgene brukeren kan gjøre i kortinnstillingene.
 */
export function cardInfoText(ctx, eid, scope, id) {
  const mode = scope ? ctx.store.cardCfg(scope, id || eid).info : "auto";
  const { hass } = ctx;
  const st = hass.states[eid];
  if (!mode || mode === "auto") return stateText(ctx, eid);
  if (mode === "none") return "";
  if (!st) return "Mangler";
  switch (mode) {
    case "state": return titleCase(String(st.state));
    case "temperature": return sibValue(hass, eid, "temperature", "\u00b0") || stateText(ctx, eid);
    case "humidity": return sibValue(hass, eid, "humidity", "%") || stateText(ctx, eid);
    case "power": return sibValue(hass, eid, "power", "W") || stateText(ctx, eid);
    case "energy": return sibValue(hass, eid, "energy", "kWh") || stateText(ctx, eid);
    case "battery": return sibValue(hass, eid, "battery", "%") || stateText(ctx, eid);
    case "changed": return relTime(st.last_changed);
    case "area": return hass.areas?.[areaIdOf(hass, eid)]?.name || "Uten rom";
    default: return stateText(ctx, eid);
  }
}

/* ------------------------------------------------------ tilstandstekst */

export function stateText(ctx, eid) {
  const { hass } = ctx;
  const st = hass.states[eid];
  if (!st) return "Mangler";
  if (isDead(st)) return "Utilgjengelig";
  const d = domainOf(eid);
  switch (d) {
    case "light": {
      if (st.state !== "on") return "Av";
      const b = st.attributes.brightness;
      return b != null ? Math.round((b / 255) * 100) + " %" : "På";
    }
    case "switch": case "input_boolean":
      return st.state === "on" ? "På" : "Av";
    case "cover": {
      const p = st.attributes.current_position;
      if (st.state === "open") return p != null && p < 100 ? p + " % åpen" : "Åpen";
      if (st.state === "closed") return "Lukket";
      if (st.state === "opening") return "Åpner …";
      if (st.state === "closing") return "Lukker …";
      return st.state;
    }
    case "climate": {
      if (st.state === "off") return "Av";
      const t = st.attributes.temperature;
      const cur = st.attributes.current_temperature;
      const act = { heating: "Varmer", cooling: "Kjøler", idle: "Venter", off: "Av", drying: "Tørker", fan: "Vifte" }[st.attributes.hvac_action] || "";
      return `${t != null ? fmtNum(t, 1) + "°" : ""}${cur != null ? " · nå " + fmtNum(cur, 1) + "°" : ""}${act ? " · " + act : ""}`;
    }
    case "fan":
      return st.state === "on" ? (st.attributes.percentage != null ? st.attributes.percentage + " %" : "På") : "Av";
    case "humidifier":
      return st.state === "on" ? (st.attributes.humidity != null ? "Mål " + st.attributes.humidity + " %" : "På") : "Av";
    case "media_player": {
      const m = { playing: "Spiller", paused: "Pauset", idle: "Ledig", off: "Av", standby: "Hvilemodus", buffering: "Laster" }[st.state] || st.state;
      const t = st.attributes.media_title;
      return t ? t : m;
    }
    case "vacuum":
      return { cleaning: "Støvsuger", docked: "I dokken", returning: "På vei hjem", paused: "Pauset", idle: "Ledig", error: "Feil" }[st.state] || st.state;
    case "lock": return st.state === "locked" ? "Låst" : "Ulåst";
    case "siren": return st.state === "on" ? "PÅ" : "Av";
    case "script": return st.state === "on" ? "Kjører" : "Kjør";
    default: return st.state;
  }
}

/** brukes i korthjørnet (temperatur, volum, posisjon …) */
function cornerText(ctx, eid) {
  const st = ctx.hass.states[eid];
  if (!st) return "";
  const d = domainOf(eid);
  if (d === "media_player" && st.attributes.volume_level != null && isOn(st))
    return Math.round(st.attributes.volume_level * 100) + " %";
  if (d === "climate" && st.attributes.current_temperature != null)
    return fmtNum(st.attributes.current_temperature, 1) + "°";
  return "";
}

export function isCardOn(ctx, eid) {
  const st = ctx.hass.states[eid];
  if (!st || isDead(st)) return false;
  const d = domainOf(eid);
  if (d === "cover") return st.state === "open" || st.state === "opening";
  if (d === "climate") return st.state !== "off";
  if (d === "media_player") return ["playing", "paused", "buffering", "on"].includes(st.state);
  if (d === "vacuum") return ["cleaning", "returning", "paused"].includes(st.state);
  if (d === "lock") return st.state === "unlocked";
  return isOn(st);
}

/* ----------------------------------------------------- redigerings-dekor */

export function editDeco(ctx, id, canBig, scope) {
  if (!ctx.edit) return "";
  const sc = scope ? ` data-scope="${h(scope)}"` : "";
  return (
    `<div class="rm" data-act="hide" data-id="${h(id)}"${sc}>${ic(ICON.minus)}</div>` +
    /* Tannhjulet åpner kortinnstillingene: størrelse, info, handlinger,
       ikon, navn og farge. Alle kort får det, også de faste systemkortene. */
    `<div class="cog" data-act="cardcfg" data-id="${h(id)}"${sc} title="Innstillinger for kortet">${ic("mdi:tune-variant")}</div>` +
    (canBig ? `<div class="bigtog" data-act="big" data-id="${h(id)}">${ic(ICON.expand)}</div>` : "") +
    /* Dra-håndtak. På touch er dette eneste vei inn i et drag: nettleseren
       avbryter pekeren så snart den bestemmer seg for å rulle, så et
       langtrykk på selve kortet kan ikke vinne over rullingen. Håndtaket
       har touch-action:none og eier dermed bevegelsen. Med mus kan man
       fortsatt dra hvor som helst på kortet. */
    `<div class="grip" title="Dra for å flytte">${ic("mdi:drag")}</div>`
  );
}

/* ----------------------------------------------------- kortdekorasjon */

/**
 * Legger klasser/attributter på kortets ROTNODE etter at renderfunksjonen
 * har gjort sitt. Størrelsen er en rutenettklasse (`w2`/`h2`) og hører
 * derfor hjemme på rotnoden, der editDeco ikke kommer til.
 *
 * Strengkirurgi er med vilje: alle flisrenderere returnerer én ytre
 * `<div class="card …">`, og å endre signaturen på tolv funksjoner for
 * dette ville vært mye mer å ta feil av.
 */
export function decorate(html, cls, attrs, style) {
  if (!html) return html;
  const lt = html.indexOf("<");
  if (lt < 0) return html;
  const gt = html.indexOf(">", lt);
  if (gt < 0) return html;
  let open = html.slice(lt, gt);
  if (cls) {
    open = /\sclass="/.test(open)
      ? open.replace(/class="([^"]*)"/, (m, c) => `class="${c} ${cls}"`)
      : open + ` class="${cls}"`;
  }
  /* Et nytt style-attributt ved siden av et som finnes fra før blir
     stilltiende ignorert av nettleseren — slå dem sammen i stedet. */
  if (style) {
    open = /\sstyle="/.test(open)
      ? open.replace(/style="([^"]*)"/, (m, c) => `style="${c};${style}"`)
      : open + ` style="${style}"`;
  }
  if (attrs) open += " " + attrs;
  return html.slice(0, lt) + open + html.slice(gt);
}

/** Pakker en ferdig flis med størrelse, identitet og eventuell egen farge. */
export function cardWrap(ctx, scope, id, html) {
  if (!html) return html;
  const cfg = ctx.store.cardCfg(scope, id);
  const size = CARD_SIZES.find((s) => s.id === cfg.size) || CARD_SIZES[0];
  const cls = [size.cls, cfg.color ? "tinted" : ""].filter(Boolean).join(" ");
  const attrs = `data-cardid="${h(id)}" data-cardscope="${h(scope)}"`;
  const style = cfg.color ? `--cardon:${cfg.color};--tint:${cfg.color}` : "";
  return decorate(html, cls, attrs, style);
}

/* --------------------------------------------------------------- romkort */

export function roomTile(ctx, room) {
  const { hass } = ctx;
  const on = room.lightsOn > 0;
  const total = room.lightIds.length;
  const dots = room.lightIds.slice(0, 6).map((e) => {
    const lit = hass.states[e]?.state === "on";
    const col = lit ? lightColor(hass.states[e], ctx.accent) : "";
    return `<i class="${lit ? "lit" : ""}"${lit && col ? ` style="background:${col}"` : ""}></i>`;
  }).join("");
  const temp = room.temp && hass.states[room.temp] ? fmtNum(hass.states[room.temp].state, 0) + "°" : "";
  const sub = total ? `${room.lightsOn} av ${total} på` : `${room.controls.length} enheter`;
  return `
  <div class="card ${on ? "on" : ""}" data-act="room" data-r="${h(room.id)}">
    ${editDeco(ctx, "room:" + room.id, false)}
    <div class="top">
      <div class="ic">${ic(room.icon)}</div>
      ${total ? `<div class="pw" data-act="roomtoggle" data-r="${h(room.id)}">${ic(ICON.power)}</div>` : ""}
    </div>
    <div class="bottom">
      <div class="nm">${h(room.name)}</div>
      <div class="st">${h(sub)}</div>
      ${total ? `<div class="dots">${dots}</div>` : ""}
    </div>
    ${temp ? `<div class="corner">${h(temp)}</div>` : ""}
  </div>`;
}

/* ------------------------------------------------------------ enhetskort */

export function deviceTile(ctx, eid, roomName, cardId, scope) {
  const { hass } = ctx;
  const st = hass.states[eid];
  const on = isCardOn(ctx, eid);
  const dead = isDead(st);
  const d = domainOf(eid);
  const nm = cardName(ctx, eid, scope, cardId || eid, roomName);

  if (d === "media_player") return mediaTile(ctx, eid, roomName, false, cardId, scope);

  const iconName = cardIcon(ctx, eid, scope, cardId || eid);
  const iconStyle = d === "light" && on ? ` style="background:${lightColor(st, ctx.accent)}"` : "";
  const corner = cornerText(ctx, eid);
  const sl = sliderInfo(ctx, eid);
  const level = sl ? (ctx.drag?.[eid] != null ? ctx.drag[eid] : sl.value) : null;

  /* dragbar nivåstripe — hele kortet er sliderflate */
  const strip = sl
    ? `<div class="minibar grab"><i style="width:${clamp(level, 0, 100)}%;${
        on && d === "light" ? `background:${lightColor(st, ctx.accent)}` : ""}"></i></div>`
    : "";

  return `
  <div class="card ${on ? "on" : ""} ${dead ? "dead" : ""} ${sl ? "sld" : ""}"
       data-act="tap" data-e="${h(eid)}"${sl ? ` data-cardslider="${h(sl.kind)}"` : ""}>
    ${editDeco(ctx, cardId || eid, supportsBig(ctx, eid), scope)}
    <div class="top">
      <div class="ic"${iconStyle}>${ic(iconName)}</div>
      ${quickBtn(ctx, eid, d)}
    </div>
    <div class="bottom">
      <div class="nm">${h(nm)}</div>
      <div class="st">${h(cardInfoText(ctx, eid, scope, cardId || eid))}</div>
      ${strip}
    </div>
    ${corner ? `<div class="corner">${h(corner)}</div>` : ""}
    ${sl ? `<div class="dragval"></div>` : ""}
  </div>`;
}

/** Hva en dra-bevegelse over kortet skal styre, og nåværende verdi 0–100. */
export function sliderInfo(ctx, eid) {
  const st = ctx.hass.states[eid];
  if (!st || isDead(st)) return null;
  const d = domainOf(eid);
  const a = st.attributes;
  const feat = a.supported_features || 0;
  if (d === "light") {
    if (!(feat & 1) && a.supported_color_modes &&
        !a.supported_color_modes.some((m) => m !== "onoff")) return null;
    return { kind: "brightness",
             value: st.state === "on" && a.brightness != null ? (a.brightness / 255) * 100 : (st.state === "on" ? 100 : 0) };
  }
  if (d === "cover" && (feat & 4))
    return { kind: "cover", value: a.current_position ?? (st.state === "open" ? 100 : 0) };
  if (d === "fan" && (feat & 1))
    return { kind: "fanpct", value: st.state === "on" ? (a.percentage ?? 100) : 0 };
  if (d === "humidifier")
    return { kind: "humidity", value: a.humidity ?? 50 };
  if (d === "media_player" && a.volume_level != null)
    return { kind: "volume", value: a.volume_level * 100 };
  if (d === "climate" && a.temperature != null) {
    const min = a.min_temp ?? 5, max = a.max_temp ?? 35;
    return { kind: "settemp", value: ((a.temperature - min) / (max - min)) * 100,
             min, max, step: a.target_temp_step || 0.5 };
  }
  return null;
}

/** Liten ekstraknapp oppe til høyre der det gir mening. */
function quickBtn(ctx, eid, d) {
  const st = ctx.hass.states[eid];
  if (isDead(st)) return "";
  if (d === "cover") {
    const open = st.state === "open" || st.state === "opening";
    return `<div class="pw" data-act="cover" data-e="${h(eid)}" data-s="${open ? "close" : "open"}">
      ${ic(open ? ICON.down : ICON.up)}</div>`;
  }
  if (d === "vacuum") {
    const run = ["cleaning", "returning"].includes(st.state);
    return `<div class="pw" data-act="vac" data-e="${h(eid)}" data-s="${run ? "return_to_base" : "start"}">
      ${ic(run ? "mdi:home-import-outline" : ICON.play)}</div>`;
  }
  if (d === "script" || d === "scene")
    return `<div class="pw" data-act="toggle" data-e="${h(eid)}">${ic(ICON.play)}</div>`;
  return `<div class="pw" data-act="toggle" data-e="${h(eid)}">${ic(ICON.power)}</div>`;
}

/* Domener som deviceTile håndterer som "kontroll". Resten får infoTile. */
const CONTROLLISH = new Set(["light", "switch", "input_boolean", "cover", "climate",
  "fan", "humidifier", "media_player", "lock", "vacuum", "siren", "script",
  "scene", "water_heater", "valve", "lawn_mower"]);

/** Kort for sensorer, knapper, personer, kameraer, vær, valg … */
export function infoTile(ctx, eid, roomName, cardId, scope) {
  const { hass } = ctx;
  const st = hass.states[eid];
  const d = domainOf(eid);
  const nm = shortName(fullNameOf(hass, ctx.cfg, eid), roomName);
  const dead = isDead(st);
  const a = st?.attributes || {};

  if (d === "camera") return cameraTile(ctx, eid, roomName, cardId, scope);

  const icon = entityIcon(st, eid, ctx.cfg);
  let value = "", unit = "", on = false, danger = false, sub = roomName || "";

  if (d === "sensor") {
    const n = Number(st?.state);
    value = dead ? "–" : (isFinite(n) ? fmtNum(n, Math.abs(n) >= 100 ? 0 : 1) : String(st.state));
    unit = a.unit_of_measurement || "";
    sub = nm;
  } else if (d === "binary_sensor") {
    on = st?.state === "on";
    const dc = a.device_class;
    value = dead ? "–" : (BIN_TEXT[dc] || BIN_TEXT._default)[on ? 1 : 0];
    danger = on && ["smoke", "gas", "moisture", "problem", "safety", "tamper",
                    "carbon_monoxide"].includes(dc);
    sub = nm;
  } else if (d === "person" || d === "device_tracker") {
    on = st?.state === "home";
    value = on ? "Hjemme" : st?.state === "not_home" ? "Borte" : titleCase(st?.state || "");
    sub = nm;
  } else if (d === "weather") {
    on = false;
    value = a.temperature != null ? fmtNum(a.temperature, 0) + "°" : "–";
    sub = nm;
  } else if (d === "number" || d === "input_number") {
    value = dead ? "–" : fmtNum(st.state, 1);
    unit = a.unit_of_measurement || "";
    sub = nm;
  } else if (d === "select" || d === "input_select") {
    value = dead ? "–" : titleCase(st.state);
    sub = nm;
  } else if (d === "button" || d === "input_button") {
    value = "Trykk";
    sub = nm;
  } else if (d === "todo") {
    value = dead ? "–" : st.state;
    unit = "igjen";
    sub = nm;
  } else if (d === "automation") {
    on = st?.state === "on";
    value = on ? "Aktiv" : "Av";
    sub = nm;
  } else {
    value = dead ? "–" : titleCase(String(st.state).slice(0, 14));
    sub = nm;
  }

  const act = ["button", "input_button", "script", "scene"].includes(d) ? "toggle" : "tap";
  const big = String(value).length > 5 ? 22 : 30;

  return `
  <div class="card info ${danger ? "alarm" : on ? "on" : ""} ${dead ? "dead" : ""}"
       data-act="${act}" data-e="${h(eid)}">
    ${editDeco(ctx, cardId || eid, false, scope)}
    <div class="lblrow">
      <div class="ic">${ic(icon)}</div>
      <div class="lbl">${h(DOM_LBL[d] || d)}</div>
    </div>
    <div class="big" style="font-size:${big}px">${h(value)}${
      unit ? `<span style="font-size:14px;opacity:.6"> ${h(unit)}</span>` : ""}</div>
    <div class="st" style="margin-top:2px">${h(sub)}</div>
  </div>`;
}

const BIN_TEXT = {
  door: ["Lukket", "Åpen"], window: ["Lukket", "Åpent"], opening: ["Lukket", "Åpen"],
  garage_door: ["Lukket", "Åpen"], motion: ["Rolig", "Bevegelse"],
  occupancy: ["Ingen", "Noen her"], presence: ["Borte", "Hjemme"],
  smoke: ["OK", "RØYK"], gas: ["OK", "GASS"], moisture: ["Tørt", "VANN"],
  problem: ["OK", "Feil"], battery: ["OK", "Svakt"], connectivity: ["Nede", "Tilkoblet"],
  running: ["Stoppet", "Kjører"], tamper: ["OK", "Tuklet"], cold: ["Normal", "Kaldt"],
  heat: ["Normal", "Varmt"], light: ["Mørkt", "Lyst"], lock: ["Låst", "Ulåst"],
  safety: ["Trygt", "Fare"], update: ["Oppdatert", "Ny versjon"],
  plug: ["Utkoblet", "Tilkoblet"], power: ["Av", "På"],
  _default: ["Av", "På"],
};

const DOM_LBL = {
  sensor: "Måling", binary_sensor: "Status", person: "Person",
  device_tracker: "Sporing", weather: "Vær", number: "Verdi", input_number: "Verdi",
  select: "Valg", input_select: "Valg", button: "Knapp", input_button: "Knapp",
  todo: "Liste", calendar: "Kalender", automation: "Automasjon", sun: "Sol",
  text: "Tekst", input_text: "Tekst",
};

function cameraTile(ctx, eid, roomName, cardId, scope) {
  const st = ctx.hass.states[eid];
  const pic = st?.attributes?.entity_picture;
  return `
  <div class="card" style="padding:0;overflow:hidden" data-act="tap" data-e="${h(eid)}">
    ${editDeco(ctx, cardId || eid, false, scope)}
    ${pic ? `<img src="${h(pic)}" alt="" style="position:absolute;inset:0;width:100%;
      height:100%;object-fit:cover">` : ""}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(8,4,10,.8))"></div>
    <div style="position:relative;z-index:1;margin-top:auto;padding:14px">
      <div class="nm" style="color:#fff">${h(shortName(nameOf(ctx.hass, ctx.cfg, eid), roomName))}</div>
    </div>
  </div>`;
}

/** Velger riktig korttype for en vilkårlig entitet. */
export function anyTile(ctx, eid, roomName, cardId, big = false, scope) {
  if (!ctx.hass.states[eid]) return "";
  const d = domainOf(eid);
  if (!CONTROLLISH.has(d)) return infoTile(ctx, eid, roomName, cardId, scope);
  if (big && supportsBig(ctx, eid)) return deviceBig(ctx, eid, roomName, cardId);
  return deviceTile(ctx, eid, roomName, cardId, scope);
}

export function supportsBig(ctx, eid) {
  const d = domainOf(eid);
  return ["light", "cover", "climate", "media_player", "fan", "humidifier", "vacuum"].includes(d);
}

/* ------------------------------------------------------------ store kort */

export function deviceBig(ctx, eid, roomName, cardId) {
  const d = domainOf(eid);
  if (d === "light") return bigLight(ctx, eid, roomName, cardId);
  if (d === "cover") return bigCover(ctx, eid, roomName, cardId);
  if (d === "climate") return bigClimate(ctx, eid, roomName, cardId);
  if (d === "media_player") return mediaTile(ctx, eid, roomName, true, cardId);
  if (d === "fan") return bigFan(ctx, eid, roomName, cardId);
  if (d === "humidifier") return bigFan(ctx, eid, roomName, cardId);
  if (d === "vacuum") return bigVacuum(ctx, eid, roomName, cardId);
  return deviceTile(ctx, eid, roomName, cardId);
}

function bigLight(ctx, eid, roomName, cardId) {
  const { hass } = ctx;
  const st = hass.states[eid];
  const on = st?.state === "on";
  const nm = shortName(nameOf(hass, ctx.cfg, eid), roomName);
  const bri = ctx.drag?.[eid] != null ? ctx.drag[eid]
    : (st?.attributes?.brightness != null ? Math.round((st.attributes.brightness / 255) * 100) : 0);
  const modes = st?.attributes?.supported_color_modes || [];
  const canColor = modes.some((m) => ["hs", "rgb", "rgbw", "rgbww", "xy"].includes(m));
  const canCt = modes.includes("color_temp");
  const curRgb = st?.attributes?.rgb_color;
  const curK = st?.attributes?.color_temp_kelvin;
  const minK = st?.attributes?.min_color_temp_kelvin || 2000;
  const maxK = st?.attributes?.max_color_temp_kelvin || 6500;
  const ctPos = curK ? clamp(((curK - minK) / (maxK - minK)) * 100, 0, 100) : 50;

  const sw = canColor ? `<div class="swatches">${LIGHT_SWATCHES.map((c) => {
    const sel = curRgb && rgbHex(curRgb) === c.toLowerCase() ? " sel" : "";
    return `<div class="sw${sel}" style="background:${c}" data-act="lightcolor" data-e="${h(eid)}" data-c="${c}"></div>`;
  }).join("")}</div>` : "";

  const ctb = canCt ? `<div class="ctbar" data-slider="ct" data-e="${h(eid)}" data-min="${minK}" data-max="${maxK}">
      <div class="knob2" style="left:${ctPos}%"></div></div>` : "";

  return `
  <div class="card big w2 h2 ${on ? "on" : ""}" data-act="more" data-e="${h(eid)}">
    ${editDeco(ctx, cardId || eid, true)}
    <div class="top">
      <div class="ic"${on ? ` style="background:${lightColor(st, ctx.accent)}"` : ""}>${ic(ICON.light)}</div>
      <div class="pw" data-act="toggle" data-e="${h(eid)}">${ic(ICON.power)}</div>
    </div>
    <div style="margin-top:10px">
      <div class="bar" data-slider="brightness" data-e="${h(eid)}">
        <div class="fill" style="width:${on ? bri : 0}%;background:${on ? lightColor(st, ctx.accent) : "var(--accent)"}"></div>
        <div class="pctl">${on ? bri + " %" : "Av"}</div>
      </div>
      ${sw}${ctb}
    </div>
    <div class="bottom" style="margin-top:auto;padding-top:10px">
      <div class="nm">${h(nm)}</div>
      <div class="st">${h(stateText(ctx, eid))}</div>
    </div>
  </div>`;
}

function rgbHex(rgb) {
  return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
}

function bigCover(ctx, eid, roomName, cardId) {
  const { hass } = ctx;
  const st = hass.states[eid];
  const open = st?.state === "open" || st?.state === "opening";
  const pos = ctx.drag?.[eid] != null ? ctx.drag[eid] : (st?.attributes?.current_position ?? (open ? 100 : 0));
  const nm = shortName(nameOf(hass, ctx.cfg, eid), roomName);
  return `
  <div class="card big w2 h2 ${open ? "on" : ""}" data-act="more" data-e="${h(eid)}">
    ${editDeco(ctx, cardId || eid, true)}
    <div class="top">
      <div class="ic">${ic(ICON.cover)}</div>
    </div>
    <div class="coverwrap">
      <div class="vbar" data-slider="cover" data-e="${h(eid)}">
        <div class="vfill" style="height:${100 - pos}%"></div>
        <div class="vpct">${Math.round(pos)} %</div>
      </div>
      <div class="vbtns">
        <div class="pw" data-act="cover" data-e="${h(eid)}" data-s="open">${ic(ICON.up)}</div>
        <div class="pw" data-act="cover" data-e="${h(eid)}" data-s="stop">${ic(ICON.stop)}</div>
        <div class="pw" data-act="cover" data-e="${h(eid)}" data-s="close">${ic(ICON.down)}</div>
      </div>
    </div>
    <div class="bottom" style="margin-top:auto;padding-top:10px">
      <div class="nm">${h(nm)}</div>
      <div class="st">${h(stateText(ctx, eid))}</div>
    </div>
  </div>`;
}

const HVAC_LABEL = { heat: "Varme", cool: "Kjøling", auto: "Auto", heat_cool: "Auto", dry: "Tørke", fan_only: "Vifte", off: "Av" };

function bigClimate(ctx, eid, roomName, cardId) {
  const { hass } = ctx;
  const st = hass.states[eid];
  const on = st && st.state !== "off";
  const nm = shortName(nameOf(hass, ctx.cfg, eid), roomName);
  const t = st?.attributes?.temperature;
  const cur = st?.attributes?.current_temperature;
  const min = st?.attributes?.min_temp ?? 10;
  const max = st?.attributes?.max_temp ?? 30;
  const frac = t != null ? clamp((t - min) / (max - min), 0, 1) : 0;
  const R = 36, C = 2 * Math.PI * R, arc = C * 0.75;
  const col = st?.attributes?.hvac_action === "cooling" ? "#4aa3ff" : "#f5853a";
  const modes = (st?.attributes?.hvac_modes || []).filter((m) => m !== "off");

  return `
  <div class="card big w2 h2 ${on ? "on" : ""}" data-act="more" data-e="${h(eid)}">
    ${editDeco(ctx, cardId || eid, true)}
    <div class="climwrap">
      <div class="ring">
        <svg viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="${R}" fill="none" stroke="rgba(128,128,128,.22)" stroke-width="7"
            stroke-linecap="round" stroke-dasharray="${arc} ${C}"></circle>
          <circle cx="40" cy="40" r="${R}" fill="none" stroke="${col}" stroke-width="7"
            stroke-linecap="round" stroke-dasharray="${arc * frac} ${C}"></circle>
        </svg>
        <div class="rtxt">${t != null ? fmtNum(t, 0) + "°" : "–"}</div>
      </div>
      <div class="climright">
        <div class="nm">${h(nm)}</div>
        <div class="st">${cur != null ? fmtNum(cur, 1) + "° nå" : ""} ${on ? "· " + (HVAC_LABEL[st.state] || st.state) : "· Av"}</div>
        <div class="modes">
          ${modes.map((m) => `<div class="mbtn ${st.state === m ? "sel" : ""}" data-act="hvac" data-e="${h(eid)}" data-m="${h(m)}">${h(HVAC_LABEL[m] || m)}</div>`).join("")}
          <div class="mbtn ${st?.state === "off" ? "sel" : ""}" data-act="hvac" data-e="${h(eid)}" data-m="off">Av</div>
        </div>
        <div class="plusminus">
          <div class="pmbtn" data-act="temp" data-e="${h(eid)}" data-d="-0.5">${ic(ICON.minus)}</div>
          <div class="pmbtn" data-act="temp" data-e="${h(eid)}" data-d="0.5">${ic(ICON.plus)}</div>
        </div>
      </div>
    </div>
  </div>`;
}

function bigFan(ctx, eid, roomName, cardId) {
  const { hass } = ctx;
  const st = hass.states[eid];
  const on = isOn(st);
  const d = domainOf(eid);
  const nm = shortName(nameOf(hass, ctx.cfg, eid), roomName);
  const val = ctx.drag?.[eid] != null ? ctx.drag[eid]
    : (d === "fan" ? (st?.attributes?.percentage ?? (on ? 100 : 0)) : (st?.attributes?.humidity ?? 50));
  return `
  <div class="card big w2 h2 ${on ? "on" : ""}" data-act="more" data-e="${h(eid)}">
    ${editDeco(ctx, cardId || eid, true)}
    <div class="top">
      <div class="ic">${ic(d === "fan" ? ICON.fan : ICON.humidifier)}</div>
      <div class="pw" data-act="toggle" data-e="${h(eid)}">${ic(ICON.power)}</div>
    </div>
    <div style="margin-top:12px">
      <div class="bar" data-slider="${d === "fan" ? "fanpct" : "humidity"}" data-e="${h(eid)}">
        <div class="fill" style="width:${val}%"></div>
        <div class="pctl">${Math.round(val)} %</div>
      </div>
    </div>
    <div class="bottom" style="margin-top:auto;padding-top:10px">
      <div class="nm">${h(nm)}</div>
      <div class="st">${h(stateText(ctx, eid))}</div>
    </div>
  </div>`;
}

function bigVacuum(ctx, eid, roomName, cardId) {
  const { hass } = ctx;
  const st = hass.states[eid];
  const on = ["cleaning", "returning"].includes(st?.state);
  const nm = shortName(nameOf(hass, ctx.cfg, eid), roomName);
  const batt = st?.attributes?.battery_level;
  return `
  <div class="card big w2 h2 ${on ? "on" : ""}" data-act="more" data-e="${h(eid)}">
    ${editDeco(ctx, cardId || eid, true)}
    <div class="top">
      <div class="ic">${ic(ICON.vacuum)}</div>
      ${batt != null ? `<div class="corner" style="position:static">${batt} %</div>` : ""}
    </div>
    <div class="modes" style="margin-top:14px">
      <div class="mbtn" data-act="vac" data-e="${h(eid)}" data-s="start">Start</div>
      <div class="mbtn" data-act="vac" data-e="${h(eid)}" data-s="pause">Pause</div>
      <div class="mbtn" data-act="vac" data-e="${h(eid)}" data-s="return_to_base">Til dokken</div>
    </div>
    <div class="bottom" style="margin-top:auto">
      <div class="nm">${h(nm)}</div>
      <div class="st">${h(stateText(ctx, eid))}</div>
    </div>
  </div>`;
}

/* ----------------------------------------------------------- mediakort */

export function mediaTile(ctx, eid, roomName, big = false, cardId, scope) {
  /* Apple TV har en egen fjernkontroll — den er langt mer nyttig enn
     den generiske spilleren. */
  const isATV = ctx.hass.entities?.[eid]?.platform === "apple_tv";
  const { hass } = ctx;
  const st = hass.states[eid];
  const playing = ["playing", "buffering"].includes(st?.state);
  const active = ["playing", "paused", "buffering"].includes(st?.state);
  const nm = shortName(nameOf(hass, ctx.cfg, eid), roomName);
  const title = st?.attributes?.media_title;
  const artist = st?.attributes?.media_artist || st?.attributes?.media_series_title || "";
  const art = st?.attributes?.entity_picture;
  const src = st?.attributes?.source || "";
  const spotify = /spotify/i.test(src) || /spotify/i.test(st?.attributes?.media_content_id || "");
  const dur = st?.attributes?.media_duration;
  const pos = mediaPos(st);
  const pct = dur ? clamp((pos / dur) * 100, 0, 100) : 0;

  if (!active) {
    return `
    <div class="card ${isDead(st) ? "dead" : ""}" data-act="more" data-e="${h(eid)}">
      ${editDeco(ctx, cardId || eid, true, scope)}
      <div class="top">
        <div class="ic">${ic(entityIcon(st, eid, ctx.cfg))}</div>
        <div class="pw" data-act="toggle" data-e="${h(eid)}">${ic(ICON.power)}</div>
      </div>
      <div class="bottom">
        <div class="nm">${h(nm)}</div>
        <div class="st">${h(stateText(ctx, eid))}</div>
      </div>
    </div>`;
  }

  const at = st.attributes || {};
  const vol = at.volume_level != null ? Math.round(at.volume_level * 100) : null;
  const gm = at.group_members || [];
  return `
  <div class="card media ${big ? "big w2" : ""} ${vol != null ? "sld" : ""}"
       data-act="${isATV ? "appletv" : "player"}" data-e="${h(eid)}"${vol != null ? ` data-cardslider="volume"` : ""}>
    ${editDeco(ctx, cardId || eid, true, scope)}
    ${art ? `<div class="art" style="background-image:url('${h(art)}')"></div>` : ""}
    <div class="shade"></div>
    <div class="inner">
      <div class="srcline ${spotify ? "" : "generic"}">
        ${ic(spotify ? "mdi:spotify" : ICON.media)}<span>${h(spotify ? "Spotify" : src || "Media")} · ${h(nm)}</span>
      </div>
      <div style="margin-top:auto">
        <div class="nm" style="font-size:${big ? 17 : 14.5}px">${h(title || nm)}</div>
        ${artist ? `<div class="st">${h(artist)}</div>` : ""}
        <div class="prog"><i style="width:${pct}%"></i></div>
        <div class="transport">
          <div class="tb" data-act="mp" data-e="${h(eid)}" data-s="media_previous_track">${ic(ICON.prev)}</div>
          <div class="tb main" data-act="mp" data-e="${h(eid)}" data-s="media_play_pause">${ic(playing ? ICON.pause : ICON.play)}</div>
          <div class="tb" data-act="mp" data-e="${h(eid)}" data-s="media_next_track">${ic(ICON.next)}</div>
          ${gm.length > 1 ? `<div class="tb" data-act="groupsheet" data-e="${h(eid)}">${ic("mdi:speaker-multiple")}</div>` : ""}
        </div>
        ${vol != null ? `<div class="minibar grab" style="margin-top:7px">
          <i style="width:${vol}%;background:#fff"></i></div>` : ""}
      </div>
    </div>
    ${vol != null ? `<div class="dragval"></div>` : ""}
  </div>`;
}

export function mediaPos(st) {
  if (!st) return 0;
  const p = st.attributes?.media_position;
  if (p == null) return 0;
  const upd = st.attributes?.media_position_updated_at;
  if (st.state === "playing" && upd) {
    return p + (Date.now() - new Date(upd).getTime()) / 1000;
  }
  return p;
}

/* ------------------------------------------------- info-kort (status) */

export function securityTile(ctx, model) {
  const alerts = securityAlerts(ctx, model);
  const monitored = model.rooms.reduce((n, r) => n + r.security.length, 0);
  const bad = alerts.length > 0;
  return `
  <div class="card info ${bad ? "alarm" : ""}" data-act="nav" data-v="security">
    ${editDeco(ctx, "sys:security", false)}
    <div class="lblrow">
      <div class="ic">${ic(bad ? ICON.alert : ICON.shield)}</div>
      <div class="lbl">Sikkerhet</div>
    </div>
    <div class="big">${bad ? h(alerts.length + (alerts.length === 1 ? " varsel" : " varsler")) : "Alt er trygt"}</div>
    <div class="st" style="margin-top:4px">${monitored} overvåkede punkter</div>
  </div>`;
}

export function securityAlerts(ctx, model) {
  const out = [];
  const flag = ctx.cfg.alarmFlag ? ctx.hass.states[ctx.cfg.alarmFlag] : null;
  if (flag && flag.state === "on")
    out.push({ eid: ctx.cfg.alarmFlag, room: "Hjemme", dc: "smoke" });
  for (const r of model.rooms) {
    for (const e of r.security) {
      const st = ctx.hass.states[e];
      if (!st || st.state !== "on") continue;
      const dc = st.attributes.device_class;
      if (["motion", "occupancy", "presence"].includes(dc)) continue;
      out.push({ eid: e, room: r.name, dc });
    }
  }
  return out;
}

export function climateTile(ctx, model) {
  const { hass } = ctx;
  const eid = ctx.cfg.climateEntity;
  const st = eid ? hass.states[eid] : null;
  const out = ctx.cfg.outdoorTemp ? hass.states[ctx.cfg.outdoorTemp] : null;
  const indoor = st?.attributes?.current_temperature;
  const on = st && st.state !== "off";
  return `
  <div class="card info ${on ? "on" : ""}" data-act="more" data-e="${h(eid || "")}">
    ${editDeco(ctx, "sys:climate", false)}
    <div class="lblrow">
      <div class="ic" ${on ? "" : ""}>${ic(ICON.thermo)}</div>
      <div class="lbl">Klima</div>
    </div>
    <div class="big num">${indoor != null ? fmtNum(indoor, 0) + "°" : "–"}</div>
    <div class="st" style="margin-top:2px">${h(st ? stateText(ctx, eid) : "")}${out ? " · ute " + fmtNum(out.state, 0) + "°" : ""}</div>
  </div>`;
}

export function powerTile(ctx) {
  const { hass } = ctx;
  const p = ctx.cfg.powerSensor ? hass.states[ctx.cfg.powerSensor] : null;
  const price = ctx.cfg.priceSensor ? hass.states[ctx.cfg.priceSensor] : null;
  if (!p && !price) return "";
  return `
  <div class="card info" data-act="more" data-e="${h(ctx.cfg.powerSensor || ctx.cfg.priceSensor)}">
    ${editDeco(ctx, "sys:power", false)}
    <div class="lblrow">
      <div class="ic">${ic(ICON.bolt)}</div>
      <div class="lbl">Strøm</div>
    </div>
    <div class="big num">${p && !isDead(p) ? fmtNum(p.state, 0) + " W" : "–"}</div>
    <div class="st" style="margin-top:2px">${price && !isDead(price) ? fmtNum(price.state, 2) + " kr/kWh" : ""}</div>
  </div>`;
}

/* --------------------------------------------------------- scenebrikker */

export function sceneChip(ctx, eid, roomName, scope = "scenes") {
  const nm = sceneName(ctx, eid, roomName);
  return `<div class="chip" data-act="scene" data-e="${h(eid)}">
    ${editDeco(ctx, eid, false, scope)}${ic(ICON.scene)}<span>${h(nm)}</span></div>`;
}

/**
 * Scenenavn. Inne i et rom vises bare «Dimmet»; i den globale stripa
 * «Stue \u00b7 Dimmet», slik at åtte scener med samme navn kan skilles.
 * Selve navnevaskingen ligger i core.js (sceneName).
 */
export function sceneName(ctx, eid, roomName) {
  return coreSceneName(ctx.hass, ctx.cfg, eid, roomName, { withArea: !roomName });
}

/* ------------------------------------------------------------ listerader */

export function listRow(ctx, eid, roomName, scope) {
  const { hass } = ctx;
  const st = hass.states[eid];
  const on = isCardOn(ctx, eid);
  const nm = shortName(fullNameOf(hass, ctx.cfg, eid), roomName);
  const d = domainOf(eid);
  const toggleable = !isDead(st) && d !== "media_player" && d !== "vacuum";

  /* I redigeringsmodus byttes bryteren ut med skjul + dra-håndtak, slik at
     rader kan flyttes og skjules på samme måte som kort. */
  if (ctx.edit) {
    return `
    <div class="lrow editing" data-e="${h(eid)}">
      <div class="rm" data-act="hide" data-id="${h(eid)}" data-scope="${h(scope || "")}">
        ${ic(ICON.minus)}</div>
      <div class="ic"${d === "light" && on ? ` style="background:${lightColor(st, ctx.accent)}"` : ""}>${ic(entityIcon(st, eid, ctx.cfg))}</div>
      <div class="txt"><div class="nm">${h(nm)}</div><div class="st">${h(stateText(ctx, eid))}</div></div>
      <div class="grip">${ic("mdi:drag-horizontal-variant")}</div>
    </div>`;
  }

  const rowAct = ctx.hass.entities?.[eid]?.platform === "apple_tv" ? "appletv" : "more";
  return `
  <div class="lrow" data-act="${rowAct}" data-e="${h(eid)}">
    <div class="ic"${d === "light" && on ? ` style="background:${lightColor(st, ctx.accent)}"` : ""}>${ic(entityIcon(st, eid, ctx.cfg))}</div>
    <div class="txt"><div class="nm">${h(nm)}</div><div class="st">${h(stateText(ctx, eid))}</div></div>
    ${toggleable
      ? `<div class="sw-toggle ${on ? "on" : ""}" data-act="toggle" data-e="${h(eid)}"><i></i></div>`
      : `<div class="pw" data-act="toggle" data-e="${h(eid)}">${ic(ICON.power)}</div>`}
  </div>`;
}

export function listGroup(ctx, room, collapsed, ids) {
  const scope = "room:" + room.id;
  const list = ids || room.controls.filter((e) => !ctx.store.isHidden(scope, e));
  const rows = list.map((e) => listRow(ctx, e, room.name, scope)).join("");
  const on = room.lightsOn > 0;
  const add = ctx.edit ? `
    <div class="lrow addrow" data-act="adddevices" data-scope="${h(scope)}">
      <div class="ic">${ic(ICON.plus)}</div>
      <div class="txt"><div class="nm">Legg til i ${h(room.name)}</div></div>
    </div>` : "";
  return `
  <div class="lgroup ${collapsed ? "collapsed" : ""} ${ctx.edit ? "edit" : ""}">
    <div class="lrow head" ${ctx.edit ? "" : `data-act="collapse" data-r="${h(room.id)}"`}>
      <div class="ic" ${on ? `style="background:var(--accent);color:#2a2008"` : ""}>${ic(room.icon)}</div>
      <div class="txt">
        <div class="nm">${h(room.name)}</div>
        <div class="st">${room.lightIds.length ? `${room.lightsOn} av ${room.lightIds.length} på` : `${room.controls.length} enheter`}</div>
      </div>
      ${ic(ICON.down, "chev")}
      ${room.lightIds.length ? `<div class="sw-toggle ${on ? "on" : ""}" data-act="roomtoggle" data-r="${h(room.id)}"><i></i></div>` : ""}
    </div>
    <div class="lrows" data-dropzone="${h(scope)}">${rows}</div>
    ${add}
  </div>`;
}

/* ----------------------------------------------------------- sensorpiller */

export function sensorPills(ctx, room) {
  const { hass } = ctx;
  const out = [];
  if (room.temp && hass.states[room.temp])
    out.push(`<div class="sensorpill">${ic(ICON.thermo)}<b>${fmtNum(hass.states[room.temp].state, 1)}°</b></div>`);
  if (room.hum && hass.states[room.hum])
    out.push(`<div class="sensorpill">${ic(ICON.drop)}<b>${fmtNum(hass.states[room.hum].state, 0)} %</b></div>`);
  for (const e of room.security) {
    const st = hass.states[e];
    if (!st || isDead(st)) continue;
    const dc = st.attributes.device_class;
    const open = st.state === "on";
    const icon = { door: ICON.door, window: ICON.door, opening: ICON.door, motion: ICON.motion,
      occupancy: ICON.motion, smoke: ICON.smoke, moisture: ICON.leak }[dc];
    if (!icon) continue;
    const label = {
      door: open ? "Åpen" : "Lukket", window: open ? "Åpent" : "Lukket", opening: open ? "Åpen" : "Lukket",
      motion: open ? "Bevegelse" : "Rolig", occupancy: open ? "Bevegelse" : "Rolig",
      smoke: open ? "RØYK!" : "OK", moisture: open ? "LEKKASJE!" : "Tørt",
    }[dc];
    out.push(`<div class="sensorpill" data-act="more" data-e="${h(e)}" style="${open && ["smoke","moisture"].includes(dc) ? "border-color:#f04438;color:#ff9c93" : ""}">
      ${ic(icon)}<span>${h(shortName(nameOf(hass, ctx.cfg, e), room.name))}</span><b>${h(label)}</b></div>`);
  }
  return out.length ? `<div class="sensorrow">${out.join("")}</div>` : "";
}

export { ic };
