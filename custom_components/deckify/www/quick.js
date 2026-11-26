/* Deckify — quick.js
 *
 * HURTIGVALG: den redigerbare brikkeraden som ligger øverst på Hjem og i
 * hvert rom. Tidligere var dette to hardkodede ting — «Skru alt på/av» i
 * statusraden og sensorpillene i rommet — som brukeren verken kunne fjerne,
 * flytte eller supplere. Nå er alt sammen ett skop som bruker nøyaktig samme
 * maskineri som kortene: `order[scope]`, `hidden[scope]`, dra-og-slipp via
 * `data-dropzone`, og enhetsvelgeren for å legge til nye.
 *
 * Skop:  «chips:home»  og  «chips:room:<romid>»
 *
 * Tre slags brikker:
 *   act:<navn>   innebygd handling (allon/alloff/roomon/roomoff)
 *   pill:<eid>   avlesning (temperatur, fukt, dør, bevegelse, røyk …)
 *   <eid>        brukerens egen brikke: trykk slår av/på, kjører eller åpner
 */
import {
  h, ICON, isDead, domainOf, nameOf, shortName, entityIcon, fmtNum,
} from "./core.js?v=2.5.0";
import { ic, editDeco, isCardOn, stateText } from "./controls.js?v=2.5.0";

export const HOME_CHIPS = "chips:home";

export function roomChipScope(roomId) { return "chips:room:" + roomId; }

/** Rommet et brikkeskop hører til, eller null for Hjem. */
export function chipRoomOf(model, scope) {
  if (!scope || !scope.startsWith("chips:room:")) return null;
  return model.rooms.find((r) => r.id === scope.slice(11)) || null;
}

/* ------------------------------------------------------------ standard */

/**
 * Brikkene et skop har før brukeren har rørt noe.
 *
 * Merk: disse gjelder UANSETT `auto_fill`. Et tomt dashbord skal starte uten
 * KORT, men «Skru alt av» og romtemperaturen er en del av rammeverket rundt
 * innholdet — fjernes de automatisk, ser dashbordet bare ødelagt ut, og
 * brukeren har ingen åpenbar vei til å få dem tilbake.
 */
export function quickDefaults(ctx, model, scope, room) {
  const out = [];
  if (scope === HOME_CHIPS) {
    if (model.allLights.length) out.push("act:allon", "act:alloff");
    return out;
  }
  if (!room) return out;
  if (room.lightIds.length) out.push("act:roomon", "act:roomoff");
  if (room.temp) out.push("pill:" + room.temp);
  if (room.hum) out.push("pill:" + room.hum);
  for (const e of room.security || []) out.push("pill:" + e);
  return out;
}

/** Finnes brikken fortsatt? En sensor kan være døpt om eller fjernet. */
function chipExists(ctx, model, id, room) {
  if (id.startsWith("act:")) {
    const a = id.slice(4);
    if (a === "allon" || a === "alloff") return model.allLights.length > 0;
    return !!(room && room.lightIds.length);
  }
  const eid = id.startsWith("pill:") ? id.slice(5) : id;
  return !!ctx.hass.states[eid];
}

/**
 * Synlige brikker i rekkefølge.
 *
 * Lagret rekkefølge er fasiten, men standardbrikker som har dukket opp SIDEN
 * sist (ny fuktsensor i rommet) legges til på slutten — ellers blir raden
 * stille utdatert. Det er trygt fordi «fjern» skriver til `hidden`, ikke til
 * rekkefølgen: en brikke brukeren har tatt bort kommer ikke tilbake.
 */
export function quickIds(ctx, model, scope, room) {
  const def = quickDefaults(ctx, model, scope, room);
  const saved = ctx.store.data.order[scope];
  let ids;
  if (saved) {
    ids = saved.filter((id) => chipExists(ctx, model, id, room));
    for (const d of def) if (!ids.includes(d)) ids.push(d);
  } else {
    ids = def;
  }
  return ids.filter((id) => !ctx.store.isHidden(scope, id));
}

/* ------------------------------------------------------------- brikker */

const ACTS = {
  allon:   { act: "allon",  icon: ICON.lightOn, label: "Skru alt på" },
  alloff:  { act: "alloff", icon: ICON.power,   label: "Skru alt av", solid: true },
  roomon:  { act: "roomon", icon: ICON.lightOn, label: "Skru på" },
  roomoff: { act: "roomoff", icon: ICON.power,  label: "Skru av", solid: true },
};

/** Lesbart navn på en brikke — brukes i velgeren og i «skjulte». */
export function quickLabel(ctx, id) {
  if (id.startsWith("act:")) return (ACTS[id.slice(4)] || {}).label || id;
  const eid = id.startsWith("pill:") ? id.slice(5) : id;
  return nameOf(ctx.hass, ctx.cfg, eid);
}

const SEC_LABEL = {
  door: ["Lukket", "Åpen"], window: ["Lukket", "Åpent"], opening: ["Lukket", "Åpen"],
  garage_door: ["Lukket", "Åpen"],
  motion: ["Rolig", "Bevegelse"], occupancy: ["Rolig", "Bevegelse"],
  presence: ["Borte", "Hjemme"],
  smoke: ["OK", "RØYK!"], gas: ["OK", "GASS!"], moisture: ["Tørt", "LEKKASJE!"],
};
const SEC_ICON = {
  door: ICON.door, window: ICON.door, opening: ICON.door, garage_door: ICON.door,
  motion: ICON.motion, occupancy: ICON.motion, presence: ICON.motion,
  smoke: ICON.smoke, gas: ICON.smoke, moisture: ICON.leak,
};

/** Innmaten i en avlesningsbrikke: ikon, (navn), verdi. */
function pillBody(ctx, eid, room) {
  const st = ctx.hass.states[eid];
  if (!st) return null;
  const dc = st.attributes.device_class;
  const unit = st.attributes.unit_of_measurement;

  if (domainOf(eid) === "binary_sensor" || SEC_LABEL[dc]) {
    const pair = SEC_LABEL[dc];
    const on = st.state === "on";
    const icon = SEC_ICON[dc] || entityIcon(st, eid, ctx.cfg);
    const label = pair ? pair[on ? 1 : 0] : (on ? "På" : "Av");
    const crit = on && ["smoke", "gas", "moisture"].includes(dc);
    const nm = shortName(nameOf(ctx.hass, ctx.cfg, eid), room?.name);
    return { icon, name: nm, value: label, crit };
  }

  /* temperatur/fukt uten navn — tallet taler for seg */
  if (dc === "temperature")
    return { icon: ICON.thermo, name: "", value: fmtNum(st.state, 1) + "°" };
  if (dc === "humidity")
    return { icon: ICON.drop, name: "", value: fmtNum(st.state, 0) + " %" };

  const num = Number(st.state);
  const value = isFinite(num) && unit
    ? fmtNum(st.state, Math.abs(num) >= 100 ? 0 : 1) + " " + unit
    : stateText(ctx, eid);
  return {
    icon: entityIcon(st, eid, ctx.cfg),
    name: shortName(nameOf(ctx.hass, ctx.cfg, eid), room?.name),
    value,
  };
}

const TOGGLE_DOMAINS = ["light", "switch", "input_boolean", "fan", "siren",
  "humidifier", "automation", "cover"];
const RUN_DOMAINS = ["script", "button", "input_button"];

/** Hvilken handling et trykk på en egendefinert brikke skal gjøre. */
export function quickAction(eid) {
  const d = domainOf(eid);
  if (d === "scene") return "scene";
  if (RUN_DOMAINS.includes(d)) return "qrun";
  if (d === "cover") return "more";
  if (TOGGLE_DOMAINS.includes(d)) return "toggle";
  return "more";
}

export function quickChip(ctx, model, scope, id, room) {
  const dec = editDeco(ctx, id, false, scope);

  if (id.startsWith("act:")) {
    const a = ACTS[id.slice(4)];
    if (!a) return "";
    const rr = (a.act === "roomon" || a.act === "roomoff")
      ? ` data-r="${h(room ? room.id : "")}"` : "";
    return `<div class="chip qa ${a.solid ? "solid" : ""}" data-act="${a.act}"${rr}>
      ${dec}${ic(a.icon)}<span>${h(a.label)}</span></div>`;
  }

  if (id.startsWith("pill:")) {
    const eid = id.slice(5);
    const b = pillBody(ctx, eid, room);
    if (!b) return "";
    return `<div class="chip qp ${b.crit ? "crit" : ""}" data-act="more" data-e="${h(eid)}">
      ${dec}${ic(b.icon)}${b.name ? `<span>${h(b.name)}</span>` : ""}<b>${h(b.value)}</b></div>`;
  }

  const eid = id;
  const st = ctx.hass.states[eid];
  if (!st) return "";
  const dead = isDead(st);
  const on = isCardOn(ctx, eid);
  const nm = shortName(nameOf(ctx.hass, ctx.cfg, eid), room?.name);
  const d = domainOf(eid);
  /* Avlesninger (sensor/binary_sensor) vises som en pille med verdi; alt som
     kan styres får navn pluss av/på-markering i selve brikken. */
  if (d === "sensor" || d === "binary_sensor") {
    const b = pillBody(ctx, eid, room);
    if (!b) return "";
    return `<div class="chip qp ${b.crit ? "crit" : ""}" data-act="more" data-e="${h(eid)}">
      ${dec}${ic(b.icon)}<span>${h(b.name || nm)}</span><b>${h(b.value)}</b></div>`;
  }
  const extra = ["scene", "script", "button", "input_button"].includes(d)
    ? "" : `<b>${h(stateText(ctx, eid))}</b>`;
  return `<div class="chip q ${on ? "on" : ""} ${dead ? "dead" : ""}"
    data-act="${quickAction(eid)}" data-e="${h(eid)}">
    ${dec}${ic(entityIcon(st, eid, ctx.cfg))}<span>${h(nm)}</span>${extra}</div>`;
}

/**
 * Hele raden. `column: true` stabler brikkene loddrett (sidepanelet).
 * Raden er sin egen dropzone, så dra-og-slipp fungerer uten mer kode.
 */
export function quickRow(ctx, model, scope, room, opts = {}) {
  const ids = quickIds(ctx, model, scope, room);
  const chips = ids.map((id) => quickChip(ctx, model, scope, id, room))
    .filter(Boolean).join("");
  /* «Legg til» står FØRST i redigeringsmodus. På telefon ruller raden
     sideveis, og en knapp bakerst i en rad med ti brikker er i praksis
     usynlig — det er den eneste veien til å legge inn egne hurtigvalg. */
  const add = ctx.edit
    ? `<div class="chip dashed" data-act="addchips" data-scope="${h(scope)}">
        ${ic(ICON.plus)}<span>Hurtigvalg</span></div>`
    : "";
  if (!chips && !add) return "";
  return `<div class="quickrow ${opts.column ? "col" : ""}"
    data-dropzone="${h(scope)}">${add}${chips}</div>`;
}
