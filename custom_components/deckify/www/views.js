/* Deckify — views.js
 * Header, de fire layoutene, og sidene Hjem / Rom / Media / Sikkerhet.
 */
import {
  h, ICON, WEATHER_ICON, WEATHER_TEXT, fmtNum, isDead, domainOf, nameOf,
  shortName, clamp,
} from "./core.js?v=2.3.0";
import {
  roomTile, deviceTile, deviceBig, mediaTile, securityTile, securityAlerts,
  climateTile, powerTile, sceneChip, listGroup, listRow,
  stateText, supportsBig, ic, isCardOn, anyTile, cardWrap,
} from "./controls.js?v=2.3.0";
import { weatherIcon, weatherText } from "./weather.js?v=2.3.0";
import { quickRow, HOME_CHIPS, roomChipScope } from "./quick.js?v=2.3.0";

const NB_DAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
const NB_MON = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];

export function dateString(d) {
  return `${NB_DAYS[d.getDay()]} ${d.getDate()}. ${NB_MON[d.getMonth()]}`;
}

export function timeString(d, c24, secs) {
  const hh = c24 ? String(d.getHours()).padStart(2, "0") : String(((d.getHours() + 11) % 12) + 1);
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = secs ? ":" + String(d.getSeconds()).padStart(2, "0") : "";
  const ap = c24 ? "" : `<span class="ampm">${d.getHours() < 12 ? "AM" : "PM"}</span>`;
  return `${hh}:${mm}${ss}${ap}`;
}

/* ---------------------------------------------------------------- header */

export function header(ctx, model) {
  const { hass, store } = ctx;
  const now = ctx.now;
  const c24 = store.get("clock24");
  const w = ctx.cfg.weatherEntity ? hass.states[ctx.cfg.weatherEntity] : null;
  const agendaN = ctx.agenda?.todayCount ?? 0;
  const todoN = ctx.agenda?.todoPending ?? 0;
  const todoOver = ctx.agenda?.todoOverdue ?? 0;

  const agendaBtns = store.get("showAgenda") ? `
    <div class="hdrbtns">
      <div class="rbtn" data-act="overlay" data-o="calendar">${ic(ICON.calendar)}
        ${agendaN ? `<span class="badge">${agendaN}</span>` : ""}</div>
      <div class="rbtn" data-act="overlay" data-o="todo">${ic(ICON.todo)}
        ${todoN ? `<span class="badge ${todoOver ? "red" : ""}">${todoN}</span>` : ""}</div>
    </div>` : "";

  const weather = store.get("showWeather") && w ? `
    <div class="wpill" data-act="overlay" data-o="weather">
      ${ic(WEATHER_ICON[w.state] || "mdi:weather-cloudy")}
      <span class="t">${fmtNum(w.attributes.temperature, 0)}°</span>
      <span class="c">${h(WEATHER_TEXT[w.state] || w.state)}</span>
    </div>` : "";

  const people = store.get("showPeople") ? peopleHtml(ctx) : "";

  return `
  <header>
    <div class="clockwrap">
      <div class="datestr">${h(dateString(now))}</div>
      <div class="clockrow">
        <div class="clock mono">${timeString(now, c24, store.get("showSeconds"))}</div>
        ${agendaBtns}
      </div>
    </div>
    <div class="hdrright">
      ${weather}${people}
      <div class="rbtn" data-act="search" title="Søk" aria-label="Søk">${ic("mdi:magnify")}</div><div class="rbtn" data-act="overlay" data-o="settings" title="Innstillinger" aria-label="Innstillinger">${ic(ICON.cog)}</div>
    </div>
  </header>`;
}

function peopleHtml(ctx) {
  const { hass } = ctx;
  const ids = Object.keys(hass.states).filter((e) => e.startsWith("person."));
  if (!ids.length) return "";
  const av = ids.slice(0, 5).map((e) => {
    const st = hass.states[e];
    const nm = st.attributes.friendly_name || e;
    const pic = st.attributes.entity_picture;
    const home = st.state === "home";
    const init = nm.trim()[0]?.toUpperCase() || "?";
    const bg = pic ? `background-image:url('${h(pic)}')` : `background:${pickAvatarColor(nm)}`;
    return `<div class="avatar" style="${bg}" title="${h(nm)}">${pic ? "" : h(init)}
      <span class="dot ${home ? "" : "away"}"></span></div>`;
  }).join("");
  return `<div class="people">${av}</div>`;
}

function pickAvatarColor(name) {
  const cols = ["#f5b731", "#4ec9a0", "#7aa6f0", "#e98fbf", "#f0845c", "#a98ff0"];
  let s = 0;
  for (const c of name) s = (s + c.charCodeAt(0)) % 997;
  return cols[s % cols.length];
}

/* ----------------------------------------------------------- hjemstatus */

export function statusRow(ctx, model) {
  const n = model.lightsOn.length;
  const txt = n === 0 ? "Alle lys er av"
    : `${n} ${n === 1 ? "lys" : "lys"} på i ${model.roomsWithLightOn} ${model.roomsWithLightOn === 1 ? "rom" : "rom"}`;
  return `
  <div class="statusrow">
    <div class="statustext">
      <div class="lbl">Hjemstatus</div>
      <div class="h1" style="margin-top:3px">${h(txt)}</div>
    </div>
    ${quickRow(ctx, model, HOME_CHIPS, null)}
  </div>`;
}

/* -------------------------------------------------------------- scener */

export function visibleScenes(ctx, model, scope = "scenes") {
  const all = [...model.looseScenes, ...model.rooms.flatMap((r) => r.scenes)];
  const saved = ctx.store.data.order[scope];
  const pinned = (ctx.cfg.scenesPinned || []).filter((e) => all.includes(e));
  const max = ctx.cfg.maxScenes || 10;
  let ids;
  if (saved && saved.length) {
    /* Lagret rekkefølge er fasiten. Men scener som har dukket opp SIDEN
       sist legges til på slutten — ellers blir stripa stille utdatert i det
       øyeblikket Mats lager eller døper om en scene i Hue-appen. Skjulte
       scener filtreres bort nederst, så noe som er fjernet med − blir borte. */
    ids = saved.filter((e) => all.includes(e));
    if (ctx.cfg.scenesAuto && ctx.cfg.autoFill) {
      const fresh = all.filter((e) => !ids.includes(e));
      ids = [...ids, ...fresh];
    }
  } else if (ctx.cfg.autoFill) {
    ids = [...pinned, ...all.filter((e) => !pinned.includes(e))];
  } else {
    /* Tomt dashbord: bare det som er festet i innstillingene. */
    ids = pinned;
  }
  /* Taket gjelder OGSÅ i redigeringsmodus: med 63 Hue-scener fylte stripa
     hele skjermen og dyttet kortene ut av syne. Scener legges til og fjernes
     i velgeren («Scener»-knappen), ikke ved å rulle gjennom alt. */
  const vis = ids.filter((e) => !ctx.store.isHidden(scope, e));
  return vis.slice(0, max || vis.length);
}

export function sceneStrip(ctx, model, scope = "scenes") {
  const ids = visibleScenes(ctx, model, scope);
  if (!ids.length && !ctx.edit) return "";
  const chips = ids.map((e) => sceneChip(ctx, e, null, scope)).join("");
  const add = ctx.edit ? `<div class="chip dashed" data-act="addscenes">${ic(ICON.plus)}<span>Legg til scener</span></div>` : "";
  const total = [...model.looseScenes, ...model.rooms.flatMap((r) => r.scenes)].length;
  return `
  <div class="scenes" data-dropzone="${h(scope)}">
    <div class="lbl">Scener <span style="opacity:.6">${ids.length}${
      total > ids.length ? " av " + total : ""}</span></div>
    <div class="scenestrip">${chips}${add}</div>
  </div>`;
}

/* --------------------------------------------------------- hjemmegrid */

export function homeTileIds(ctx, model) {
  const ids = model.rooms.map((r) => "room:" + r.id);
  ids.push("sys:security", "sys:climate");
  if (ctx.cfg.powerSensor) ids.push("sys:power");
  for (const r of model.rooms)
    for (const e of r.controls)
      if (domainOf(e) === "media_player" && ["playing", "paused", "buffering"].includes(ctx.hass.states[e]?.state))
        ids.push("media:" + e);
  return ids;
}

/** Synlige kort på Hjem: lagret rekkefølge vinner, ellers standardlista. */
/**
 * Tegner et rutenett der "sep:"-oppføringer bryter opp i navngitte grupper.
 * Hver gruppe er sin egen dropzone, så dra-og-slipp fungerer innad og
 * på tvers. `render(id)` lager selve kortet.
 */
export function gridWithSeps(ctx, ids, scope, render, gridCls = "grid") {
  const blocks = [];
  let cur = { sep: null, ids: [] };
  for (const id of ids) {
    if (id.startsWith("sep:")) { blocks.push(cur); cur = { sep: id, ids: [] }; }
    else cur.ids.push(id);
  }
  blocks.push(cur);

  const parts = blocks
    .filter((b, i) => b.ids.length || b.sep || i === 0)
    .map((b) => `
      ${b.sep ? separatorEl(ctx, b.sep, scope) : ""}
      <div class="${gridCls}" data-dropzone="${h(scope)}">
        ${b.ids.map((id) => cardWrap(ctx, scope, id, render(id))).join("")}
      </div>`);

  return parts.join("") + (ctx.edit ? `
    <div class="addsep" data-act="addsep" data-scope="${h(scope)}">
      ${ic("mdi:format-horizontal-align-center")}Legg til en gruppe</div>` : "");
}

export function visibleHomeTiles(ctx, model, scope = "home") {
  const base = homeTileIds(ctx, model);
  const saved = ctx.store.data.order[scope];
  let ids;
  if (saved) {
    const picked = saved.filter((i) => i.startsWith("dev:") || i.startsWith("sep:")
                                      || base.includes(i));
    /* Med autofyll tas nye rom og aktive spillere med av seg selv. Uten det
       er den lagrede lista fasiten — da skal ingenting dukke opp uinvitert. */
    ids = ctx.cfg.autoFill
      ? [...picked, ...base.filter((i) => !picked.includes(i))]
      : picked;
  } else {
    /* Ingen lagret rekkefølge = nytt dashbord. Tomt med vilje. */
    ids = ctx.cfg.autoFill ? base : [];
  }
  return ids.filter((i) => !ctx.store.isHidden(scope, i));
}

/** Navngitt skillelinje som deler en skjerm i grupper. */
export function separatorEl(ctx, id, scope) {
  const title = (ctx.store.data.seps || {})[id] || "";
  if (ctx.edit) {
    return `<div class="sep edit" data-sep="${h(id)}">
      <input class="septxt" data-sepinput="${h(id)}" value="${h(title)}"
        placeholder="Navn på gruppen" autocomplete="off">
      <div class="seprm" data-act="delsep" data-id="${h(id)}" data-scope="${h(scope)}">
        ${ic(ICON.minus)}</div>
    </div>`;
  }
  if (!title) return "";
  return `<div class="sep"><span>${h(title)}</span></div>`;
}

function renderHomeTile(ctx, model, id) {
  if (id.startsWith("sep:")) return "";          /* håndteres av gridWithSeps */
  if (id.startsWith("room:")) {
    const r = model.rooms.find((x) => x.id === id.slice(5));
    return r ? roomTile(ctx, r) : "";
  }
  if (id === "sys:security") return securityTile(ctx, model);
  if (id === "sys:climate") return climateTile(ctx, model);
  if (id === "sys:power") return powerTile(ctx);
  if (id.startsWith("media:")) {
    const eid = id.slice(6);
    const room = model.rooms.find((r) => r.controls.includes(eid));
    /* Oppslaget må bruke samme id som knappen skriver, ellers lagres
       størrelsen under "media:…" mens rendringen leter etter "…". */
    return mediaTile(ctx, eid, room?.name, ctx.store.isBig("home", id), id);
  }
  if (id.startsWith("dev:")) {
    const eid = id.slice(4);
    if (!ctx.hass.states[eid]) return "";
    const room = model.rooms.find((r) => r.controls.includes(eid));
    return anyTile(ctx, eid, room?.name, id, ctx.store.isBig("home", id));
  }
  return "";
}

/** Førstegangsskjerm: et tomt dashbord skal ikke være en blindvei. */
export function onboarding(ctx) {
  const canFill = !!ctx.store.writable;
  const canEdit = !!ctx.canEdit;
  return `<div class="onboard">
    <div class="ic">${ic("mdi:home-lightning-bolt-outline")}</div>
    <div class="h1">Kom i gang</div>
    <p>Dashbordet er tomt med vilje. La Deckify fylle det fra Home Assistant,
       eller bygg din egen oversikt med akkurat de rommene og enhetene du vil.</p>
    <div class="btns">
      ${canFill ? `<div class="btn primary" data-act="autofill">${ic("mdi:auto-fix")}Fyll automatisk</div>` : ""}
      ${canEdit ? `<div class="btn" data-act="editnow">${ic(ICON.pencil)}Bygg selv</div>` : ""}
      ${!canFill && !canEdit ? `<div class="sub">En administrator må fylle dashbordet eller legge til kort.</div>` : ""}
    </div>
  </div>`;
}

export function homeGrid(ctx, model) {
  const ids = visibleHomeTiles(ctx, model);
  const body = gridWithSeps(ctx, ids, "home",
    (id) => renderHomeTile(ctx, model, id), "grid rooms");
  const add = ctx.edit
    ? `<div class="grid rooms">${missingTiles(ctx, model, "home", ids)}${
        addCard("Legg til enheter", "adddevices", "home")}</div>`
    : "";
  const empty = !ids.length && !ctx.edit ? onboarding(ctx) : "";
  return body + add + empty;
}

/** Lesbart navn for en kort-id (rom, systemkort, media, entitet). */
export function tileLabel(ctx, model, id) {
  if (id.startsWith("room:")) {
    const r = model.rooms.find((x) => x.id === id.slice(5));
    return r ? r.name : id.slice(5);
  }
  if (id === "sys:security") return "Sikkerhet";
  if (id === "sys:climate") return "Klima";
  if (id === "sys:power") return "Strøm";
  if (id.startsWith("media:")) return nameOf(ctx.hass, ctx.cfg, id.slice(6));
  if (id.startsWith("dev:")) return nameOf(ctx.hass, ctx.cfg, id.slice(4));
  return nameOf(ctx.hass, ctx.cfg, id);
}

function tileIcon(ctx, model, id) {
  if (id.startsWith("room:")) {
    const r = model.rooms.find((x) => x.id === id.slice(5));
    return r ? r.icon : ICON.rooms;
  }
  if (id === "sys:security") return ICON.shield || "mdi:shield-outline";
  if (id === "sys:climate") return ICON.climate;
  if (id === "sys:power") return "mdi:flash-outline";
  return "mdi:plus";
}

/**
 * Stiplede «legg til»-fliser for kort som FINNES men ikke er lagt inn.
 *
 * Et nytt dashbord er tomt med vilje, og da må rom- og systemkort kunne
 * legges inn et sted. Enhetsvelgeren dekker entiteter, men ikke romkort —
 * derfor denne, rett i rutenettet i stedet for i et nytt modalvindu.
 */
export function missingTiles(ctx, model, scope, shown) {
  if (!ctx.edit) return "";
  const have = new Set(shown);
  const miss = homeTileIds(ctx, model).filter((i) => !have.has(i) &&
    !ctx.store.isHidden(scope, i));
  if (!miss.length) return "";
  return miss.map((id) => `
    <div class="card addcard" data-act="addtile" data-id="${h(id)}" data-scope="${h(scope)}">
      <div class="inner"><div class="ic">${ic(tileIcon(ctx, model, id))}</div>
        <span>${h(tileLabel(ctx, model, id))}</span></div></div>`).join("");
}

function addCard(label, act, scope) {
  return `<div class="card addcard" data-act="${act}" data-scope="${h(scope)}">
    <div class="inner"><div class="ic">${ic(ICON.plus)}</div><span>${h(label)}</span></div></div>`;
}

/* ------------------------------------------------------------- layouter */

export function viewHomeGrid(ctx, model) {
  return `
    ${header(ctx, model)}
    ${ctx.edit ? `<div class="edithint">Dra for å flytte. Trykk − for å skjule, og pilen for å gjøre kortet dobbelt.</div>` : ""}
    ${statusRow(ctx, model)}
    ${ctx.store.get("scenesOnTop") ? sceneStrip(ctx, model) : ""}
    ${homeGrid(ctx, model)}
    ${ctx.store.get("scenesOnTop") ? "" : sceneStrip(ctx, model)}`;
}

export function viewHomeList(ctx, model) {
  const groups = model.rooms
    .filter((r) => r.controls.length || ctx.edit)
    .map((r) => listGroup(ctx, r, ctx.edit ? false : ctx.collapsed.has(r.id),
                          visibleRoomTiles(ctx, r))).join("");
  const empty = !groups && !ctx.edit ? onboarding(ctx) : "";
  return `
    ${header(ctx, model)}
    ${statusRow(ctx, model)}
    ${sceneStrip(ctx, model)}
    <div class="listcols">${groups}</div>
    ${empty}`;
}

export function viewHomeSidebar(ctx, model) {
  const { store } = ctx;
  const now = ctx.now;
  const homeIds = visibleHomeTiles(ctx, model);
  /* Et tomt «Oversikt» er bare støy: har brukeren ikke lagt noe der, skal
     verken menyvalget eller siden vises — men den må komme tilbake så snart
     man går inn i redigeringsmodus, ellers er den umulig å fylle. */
  const showOverview = ctx.edit || homeIds.length > 0 ||
    visibleScenes(ctx, model).length > 0;
  const sel = showOverview ? (ctx.sidebarSel || "overview")
    : (ctx.sidebarSel && ctx.sidebarSel !== "overview"
       ? ctx.sidebarSel : model.rooms[0]?.id || "overview");

  const navRooms = model.rooms.map((r) => `
    <div class="navitem ${sel === r.id ? "sel" : ""}" data-act="sbnav" data-r="${h(r.id)}">
      ${ic(r.icon)}<span>${h(r.name)}</span>
      ${r.lightsOn ? `<span class="cnt">${r.lightsOn}</span>` : ""}
    </div>`).join("");

  const agendaN = ctx.agenda?.todayCount ?? 0;
  const todoN = ctx.agenda?.todoPending ?? 0;

  const body = sel === "overview"
    ? `<div class="lbl">Deckify</div>
       <div class="h1" style="margin:3px 0 0">Oversikt</div>
       ${sceneStrip(ctx, model)}
       ${homeGrid(ctx, model)}`
    : roomBody(ctx, model, model.rooms.find((r) => r.id === sel));

  return `
  <div class="sbwrap">
    <div class="sidebar">
      <div class="datestr">${h(dateString(now))}</div>
      <div class="clock mono" style="font-size:44px">${timeString(now, store.get("clock24"), false)}</div>
      <div class="hdrbtns" style="margin-top:10px">
        <div class="rbtn" data-act="overlay" data-o="calendar">${ic(ICON.calendar)}${agendaN ? `<span class="badge">${agendaN}</span>` : ""}</div>
        <div class="rbtn" data-act="overlay" data-o="todo">${ic(ICON.todo)}${todoN ? `<span class="badge">${todoN}</span>` : ""}</div>
      </div>
      <div class="divider"></div>
      <div class="lbl">Hjemstatus</div>
      <div class="h2" style="margin:4px 0 12px;font-size:19px">${h(model.lightsOn.length ? `${model.lightsOn.length} lys på hjemme` : "Alle lys er av")}</div>
      ${quickRow(ctx, model, HOME_CHIPS, null, { column: true })}
      <div class="divider"></div>
      <div class="navlist">
        ${showOverview ? `<div class="navitem ${sel === "overview" ? "sel" : ""}" data-act="sbnav" data-r="overview">${ic(ICON.home)}<span>Oversikt</span></div>` : ""}
        ${navRooms}
      </div>
    </div>
    <div class="sbmain">
      <header style="margin-bottom:10px">
        <div style="flex:1"></div>
        <div class="hdrright">
          ${store.get("showWeather") ? weatherPill(ctx) : ""}
          ${store.get("showPeople") ? peopleHtml(ctx) : ""}
          <div class="rbtn" data-act="search" title="Søk" aria-label="Søk">${ic("mdi:magnify")}</div><div class="rbtn" data-act="overlay" data-o="settings" title="Innstillinger" aria-label="Innstillinger">${ic(ICON.cog)}</div>
        </div>
      </header>
      ${body}
    </div>
  </div>`;
}

function weatherPill(ctx) {
  const w = ctx.weather;
  if (!w || !w.ok) return "";
  return `<div class="wpill" data-act="overlay" data-o="weather">
    ${ic(weatherIcon(w.state))}
    <span class="t">${fmtNum(w.temperature, 0)}°</span>
    <span class="c">${h(weatherText(w.state))}${
      w.kilde ? ` · ${h(w.kilde)}` : ""}</span></div>`;
}

export function viewHomeFocus(ctx, model) {
  const pages = ["home", ...model.rooms.map((r) => r.id)];
  const i = clamp(ctx.focusPage || 0, 0, pages.length - 1);
  const w = ctx.weather && ctx.weather.ok ? ctx.weather : null;
  const agendaN = ctx.agenda?.todayCount ?? 0;
  const todoN = ctx.agenda?.todoPending ?? 0;

  let inner;
  if (pages[i] === "home") {
    const chips = model.rooms.map((r) => `
      <div class="roomtab ${r.lightsOn ? "sel" : ""}" data-act="focusroom" data-r="${h(r.id)}">
        ${ic(r.icon)}<span>${h(r.name)}</span>${r.lightsOn ? `<span class="cnt">${r.lightsOn}</span>` : ""}
      </div>`).join("");
    inner = `
      <div class="datestr">${h(dateString(ctx.now))}</div>
      <div class="focusclock mono">${timeString(ctx.now, ctx.store.get("clock24"), false)}</div>
      <div class="focusmeta">
        ${w ? `<span style="font-size:17px">${fmtNum(w.temperature, 0)}° · ${h(weatherText(w.state))}</span>` : ""}
        <span style="font-size:17px">${h(model.lightsOn.length ? model.lightsOn.length + " lys på hjemme" : "Alle lys er av")}</span>
        <div class="hdrbtns">
          <div class="rbtn" data-act="overlay" data-o="calendar">${ic(ICON.calendar)}${agendaN ? `<span class="badge">${agendaN}</span>` : ""}</div>
          <div class="rbtn" data-act="overlay" data-o="todo">${ic(ICON.todo)}${todoN ? `<span class="badge">${todoN}</span>` : ""}</div>
        </div>
      </div>
      ${sceneStrip(ctx, model)}
      <div class="roomrail" style="margin-top:20px">${chips}</div>`;
  } else {
    const r = model.rooms.find((x) => x.id === pages[i]);
    inner = r ? `
      <div class="lbl">${h(r.lightsOn ? r.lightsOn + " lys på" : "Alt er av")}</div>
      <div class="focusclock mono" style="font-size:clamp(44px,7vw,86px);margin-top:4px">${h(r.name)}</div>
      ${quickRow(ctx, model, roomChipScope(r.id), r)}
      ${roomGrid(ctx, r)}` : "";
  }

  const dots = pages.map((_, k) => `<span class="dot ${k === i ? "sel" : ""}"></span>`).join("");
  return `
  <div style="position:absolute;top:var(--pad);right:var(--pad);z-index:5">
    <div class="rbtn" data-act="search" title="Søk" aria-label="Søk">${ic("mdi:magnify")}</div><div class="rbtn" data-act="overlay" data-o="settings" title="Innstillinger" aria-label="Innstillinger">${ic(ICON.cog)}</div>
  </div>
  <div class="focuswrap">
    ${inner}
    <div class="pager">
      <div class="pbtn" data-act="focuspage" data-d="-1">${ic(ICON.left)}</div>
      ${dots}
      <div class="pbtn" data-act="focuspage" data-d="1">${ic(ICON.right)}</div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------ romvisning */

export function visibleRoomTiles(ctx, room) {
  const scope = "room:" + room.id;
  const saved = ctx.store.data.order[scope];
  let ids;
  if (saved) {
    const keep = saved.filter((e) => ctx.hass.states[e]);
    ids = ctx.cfg.autoFill
      ? [...keep, ...room.controls.filter((e) => !keep.includes(e))]
      : keep;
  } else ids = ctx.cfg.autoFill ? room.controls : [];
  return ids.filter((e) => !ctx.store.isHidden(scope, e));
}

export function roomGrid(ctx, room) {
  const scope = "room:" + room.id;
  const ids = visibleRoomTiles(ctx, room);
  const cards = gridWithSeps(ctx, ids, scope,
    (e) => anyTile(ctx, e, room.name, null, ctx.store.isBig(scope, e), scope));
  const add = ctx.edit
    ? `<div class="grid">${addCard("Legg til enheter", "adddevices", scope)}</div>` : "";
  if (!ids.length && !add)
    return `<div class="empty">${ic(ICON.home)}${ctx.cfg.autoFill
      ? "Ingen enheter i dette rommet."
      : "Ingen enheter lagt inn her ennå — trykk Rediger."}</div>`;
  return cards + add;
}

export function roomBody(ctx, model, room) {
  if (!room) return `<div class="empty">Fant ikke rommet.</div>`;
  /* Som alt annet: med autofyll av vises bare scenene brukeren har lagt inn. */
  const roomScope = "room:" + room.id;
  const sceneOrder = ctx.store.data.order["scenes:" + room.id];
  const scenePool = ctx.cfg.autoFill ? room.scenes
    : (sceneOrder || []).filter((e) => room.scenes.includes(e));
  const scenes = scenePool.filter((e) => !ctx.store.isHidden(roomScope, e));
  const chips = scenes.length ? `
    <div class="scenes"><div class="lbl">Scener</div>
      <div class="scenestrip">${scenes.slice(0, ctx.edit ? 24 : 8).map((e) => sceneChip(ctx, e, room.name, "room:" + room.id)).join("")}</div></div>` : "";
  const cams = room.cameras.length ? `
    <div class="grid" style="grid-auto-rows:auto;margin-top:14px">
      ${room.cameras.map((e) => cameraCard(ctx, e, room.name)).join("")}
    </div>` : "";
  return `
    <div class="lbl">${h(room.lightIds.length ? `${room.lightsOn} av ${room.lightIds.length} lys på` : `${room.controls.length} enheter`)}</div>
    <div class="h1" style="margin:3px 0 0">${h(room.name)}</div>
    ${quickRow(ctx, model, roomChipScope(room.id), room)}
    ${chips}
    ${roomGrid(ctx, room)}
    ${cams}`;
}

function cameraCard(ctx, eid, roomName) {
  const st = ctx.hass.states[eid];
  const pic = st?.attributes?.entity_picture;
  return `<div class="camwrap" style="grid-column:span 2" data-act="more" data-e="${h(eid)}">
    ${pic ? `<img src="${h(pic)}" alt="">` : ""}
    <div class="cl">${h(shortName(nameOf(ctx.hass, ctx.cfg, eid), roomName))}</div></div>`;
}

export function viewRooms(ctx, model) {
  const sel = ctx.roomSel || model.rooms[0]?.id;
  const room = model.rooms.find((r) => r.id === sel);
  const rail = model.rooms.map((r) => `
    <div class="roomtab ${r.id === sel ? "sel" : ""}" data-act="selroom" data-r="${h(r.id)}">
      ${ic(r.icon)}<span>${h(r.name)}</span>
      ${r.lightsOn ? `<span class="cnt">${r.lightsOn}</span>` : ""}
    </div>`).join("");

  if (ctx.layout === "sidebar") {
    const nav = model.rooms.map((r) => `
      <div class="navitem ${r.id === sel ? "sel" : ""}" data-act="selroom" data-r="${h(r.id)}">
        ${ic(r.icon)}<span>${h(r.name)}</span>${r.lightsOn ? `<span class="cnt">${r.lightsOn}</span>` : ""}
      </div>`).join("");
    return `
    <div class="sbwrap">
      <div class="sidebar">
        <div class="lbl">Rom</div>
        <div class="navlist">${nav}</div>
      </div>
      <div class="sbmain">
        <header style="margin-bottom:10px"><div style="flex:1"></div>
          <div class="hdrright">${weatherPill(ctx)}<div class="rbtn" data-act="search" title="Søk" aria-label="Søk">${ic("mdi:magnify")}</div><div class="rbtn" data-act="overlay" data-o="settings" title="Innstillinger" aria-label="Innstillinger">${ic(ICON.cog)}</div></div>
        </header>
        ${roomBody(ctx, model, room)}
      </div>
    </div>`;
  }
  if (ctx.layout === "list") {
    return `
      ${header(ctx, model)}
      <div class="roomrail" style="margin-top:18px">${rail}</div>
      <div class="listcols">${room
        ? listGroup(ctx, room, false, visibleRoomTiles(ctx, room)) : ""}</div>`;
  }
  return `
    ${header(ctx, model)}
    <div class="roomrail" style="margin-top:18px">${rail}</div>
    <div style="margin-top:18px">${roomBody(ctx, model, room)}</div>`;
}

/* ----------------------------------------------------------- mediaside */

export function viewMedia(ctx, model) {
  const { hass } = ctx;
  const players = [];
  for (const r of model.rooms)
    for (const e of r.controls)
      if (domainOf(e) === "media_player") players.push({ eid: e, room: r.name });
  const active = players.filter((p) => ["playing", "paused", "buffering"].includes(hass.states[p.eid]?.state));
  const idle = players.filter((p) => !active.includes(p));

  const bigCards = active.map((p) => mediaTile(ctx, p.eid, p.room, true)).join("");
  const smallCards = idle.map((p) => deviceTile(ctx, p.eid, p.room)).join("");

  return `
    ${header(ctx, model)}
    <div class="lbl" style="margin-top:22px">Media</div>
    <div class="h1" style="margin-top:3px">${h(active.length ? `${active.length} ${active.length === 1 ? "spiller" : "spillere"} i gang` : "Ingenting spilles av")}</div>
    ${active.length ? `<div class="grid" style="grid-auto-rows:150px">${bigCards}</div>` : ""}
    ${idle.length ? `<div class="lbl" style="margin-top:24px">Ledige</div><div class="grid">${smallCards}</div>` : ""}
    ${!players.length ? `<div class="empty">${ic(ICON.media)}Ingen mediaspillere funnet.</div>` : ""}`;
}

/* ------------------------------------------------------- sikkerhetsside */

const SEC_GROUPS = [
  { key: "smoke", dcs: ["smoke", "gas", "carbon_monoxide"], label: "Røyk, gass og kullos", icon: ICON.smoke, on: "RØYK", off: "OK" },
  { key: "leak", dcs: ["moisture"], label: "Lekkasje", icon: ICON.leak, on: "VANN", off: "Tørt" },
  { key: "door", dcs: ["door", "window", "opening", "garage_door"], label: "Dører og vinduer", icon: ICON.door, on: "Åpen", off: "Lukket" },
  { key: "motion", dcs: ["motion", "occupancy", "presence"], label: "Bevegelse", icon: ICON.motion, on: "Bevegelse", off: "Rolig" },
];

function securityActions(ctx) {
  const acts = ctx.cfg.securityActions || [];
  const rows = acts.filter((a) => ctx.hass.states[a.entity]).map((a) => `
    <div class="chip" data-act="secaction" data-e="${h(a.entity)}"
         data-confirm="${a.confirm ? "1" : ""}" data-title="${h(a.title)}"
         style="${a.danger ? "border-color:rgba(240,68,56,.45);color:#ff9c93" : ""}">
      ${ic(a.icon || "mdi:bell-ring-outline")}<span>${h(a.title)}</span></div>`).join("");
  if (!rows) return "";
  return `<div class="scenes"><div class="lbl">Røykalarm · test og stopp</div>
    <div class="scenestrip">${rows}</div></div>`;
}

export function viewSecurity(ctx, model) {
  const { hass } = ctx;
  const alerts = securityAlerts(ctx, model);
  /* Global sikkerhetsliste: også sensorer uten område og sensorer i rom som
     er valgt bort fra dette dashbordet. */
  const all = model.securityAll
    ? model.securityAll.map((x) => ({ eid: x.eid, room: x.area || "Uten rom" }))
    : model.rooms.flatMap((r) => r.security.map((e) => ({ eid: e, room: r.name })));

  const groups = SEC_GROUPS.map((g) => {
    const items = all.filter((x) => g.dcs.includes(hass.states[x.eid]?.attributes?.device_class));
    if (!items.length) return "";
    const cards = items.map((x) => {
      const st = hass.states[x.eid];
      const on = st?.state === "on";
      const danger = on && ["smoke", "leak"].includes(g.key);
      return `
      <div class="card ${danger ? "alarm" : on ? "on" : ""}" data-act="more" data-e="${h(x.eid)}">
        <div class="top"><div class="ic">${ic(g.icon)}</div></div>
        <div class="bottom">
          <div class="nm">${h(shortName(nameOf(hass, ctx.cfg, x.eid), x.room))}</div>
          <div class="st">${h(x.room)} · ${h(isDead(st) ? "Utilgjengelig" : on ? g.on : g.off)}</div>
        </div>
      </div>`;
    }).join("");
    return `<div class="lbl" style="margin-top:22px">${h(g.label)}</div><div class="grid">${cards}</div>`;
  }).join("");

  const cams = model.rooms.flatMap((r) => r.cameras.map((e) => ({ eid: e, room: r.name })));
  const camHtml = cams.length ? `
    <div class="lbl" style="margin-top:24px">Kameraer</div>
    <div class="grid" style="grid-auto-rows:auto">
      ${cams.map((c) => cameraCard(ctx, c.eid, c.room)).join("")}
    </div>` : "";

  return `
    ${header(ctx, model)}
    <div class="lbl" style="margin-top:22px">Sikkerhet</div>
    <div class="h1" style="margin-top:3px">${alerts.length ? h(alerts.length + " aktive varsler") : "Alt er trygt"}</div>
    ${alerts.length ? `<div class="sensorrow">${alerts.map((a) =>
        `<div class="sensorpill" style="border-color:#f04438;color:#ff9c93" data-act="more" data-e="${h(a.eid)}">
          ${ic(ICON.alert)}<b>${h(shortName(nameOf(hass, ctx.cfg, a.eid), a.room))}</b>${a.offline ? `<span> · frakoblet</span>` : ""}</div>`).join("")}</div>` : ""}
    ${securityActions(ctx)}
    ${groups}
    ${camHtml}`;
}

/* ----------------------------------------------------------- egne sider */

export function viewCustom(ctx, model, page) {
  const scope = "page:" + page.id;
  const saved = ctx.store.data.order[scope] || page.entities || [];
  const ids = saved.filter((e) => ctx.hass.states[e] && !ctx.store.isHidden(scope, e));
  const cards = ids.map((e) => {
    const room = model.rooms.find((r) => r.controls.includes(e));
    return cardWrap(ctx, scope, e,
      anyTile(ctx, e, room?.name, null, ctx.store.isBig(scope, e), scope));
  }).join("");
  const add = ctx.edit ? addCard("Legg til enheter", "adddevices", scope) : "";
  return `
    ${header(ctx, model)}
    <div class="lbl" style="margin-top:22px">Egen side</div>
    <div class="h1" style="margin-top:3px">${h(page.name)}</div>
    <div class="grid" data-dropzone="${h(scope)}">${cards}${add}</div>
    ${!cards && !add ? `<div class="empty">${ic(ICON.plus)}Tom side – trykk Rediger for å legge til enheter.</div>` : ""}`;
}

/* ---------------------------------------------------------------- dock */

const DOCK_DEF = {
  home: { label: "Hjem", icon: ICON.home },
  rooms: { label: "Rom", icon: ICON.rooms },
  media: { label: "Media", icon: "mdi:play-box-outline" },
  house: { label: "Huset", icon: "mdi:home-thermometer-outline" },
  energy: { label: "Energi", icon: "mdi:flash-outline" },
  security: { label: "Sikkerhet", icon: ICON.shield },
  attention: { label: "Tilsyn", icon: "mdi:bell-badge-outline" },
};

export function dockItems(ctx) {
  const want = ctx.store.get("dockOrder") || ctx.cfg.pages ||
    ["home", "rooms", "media", "house", "energy", "security", "attention"];
  const hidden = ctx.store.get("dockHidden") || [];
  const items = want.filter((k) => DOCK_DEF[k] && !hidden.includes(k))
    .map((k) => ({ id: k, ...DOCK_DEF[k] }));
  for (const p of ctx.store.get("dockPages") || [])
    items.push({ id: "page:" + p.id, label: p.name, icon: p.icon || "mdi:star-outline" });
  return items;
}

export function dock(ctx, model) {
  const items = dockItems(ctx);

  if (ctx.edit) {
    const scope = ctx.editScope || "home";
    /* tell skjulte i ALLE skop som vises, ikke bare det aktive */
    const nHidden = (ctx.visibleScopes || [scope])
      .reduce((n, sc) => n + ctx.store.hiddenCount(sc), 0);
    const canScenes = ["home", "start"].includes(ctx.view) ||
      ctx.view === "rooms" || scope.startsWith("room:");
    return `<div id="edittoolbar">
      <div class="ebtn" data-act="adddevices" data-scope="${h(scope)}">
        ${ic(ICON.plus)}<span>Legg til enheter</span></div>
      ${canScenes ? `<div class="ebtn" data-act="addscenes">
        ${ic(ICON.scene)}<span>Scener</span></div>` : ""}
      ${nHidden ? `<div class="ebtn" data-act="unhide" data-scope="${h(scope)}">
        ${ic("mdi:eye-outline")}<span>Vis ${nHidden} skjulte</span></div>` : ""}
      <div class="ebtn" data-act="resetorder" data-scope="${h(scope)}">
        ${ic("mdi:restore")}<span>Nullstill</span></div>
      <div class="ebtn done" data-act="toggleedit">${ic(ICON.check)}<span>Ferdig</span></div>
    </div>`;
  }
  const att = ctx.attention || { urgent: 0, action: 0 };
  const editFab = ctx.canEdit ? `<div id="editfab" data-act="toggleedit">
    ${ic(ICON.pencil)}<span class="t">Rediger</span></div>` : "";
  return `<div id="dock">${items.map((i) => `
    <div class="dockitem ${ctx.view === i.id ? "sel" : ""}" data-act="nav" data-v="${h(i.id)}">
      ${ic(i.icon)}${i.id === "attention" && att.action
        ? `<b class="badge ${att.urgent ? "crit" : ""}">${att.urgent || att.action}</b>` : ""}
      <span class="t">${h(i.label)}</span></div>`).join("")}</div>
  ${editFab}`;
}

/* ------------------------------------------------------------ skjermsparer */

/* Skjermspareren bor nå i saver.js. */

