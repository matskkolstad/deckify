/* Deckify — settings.js
 * Innstillinger med levende forhåndsvisning: layout, utseende, hjem, rom,
 * navigasjon, egne sider og system.
 */
import {
  h, ICON, CARD_COLORS, ACCENT_COLORS, BACKGROUNDS, bgCss, nameOf, shortName,
} from "./core.js?v=2.4.0";
import { ic } from "./controls.js?v=2.4.0";
import { SAVER_DELAYS } from "./saver.js?v=2.4.0";

const LAYOUTS = [
  { id: "start", name: "Startskjerm", desc: "Stor klokke, vær og ett informativt kvadrat per rom. Best som førsteskjerm.", prev: "start" },
  { id: "grid", name: "Rutenett", desc: "Kort side ved side som fyller skjermen.", prev: [[1, 1, 1], [1, 1, 1]] },
  { id: "sidebar", name: "Sidekolonne", desc: "Klokke, status og rom i en kolonne. Best på liggende nettbrett.", prev: "sidebar" },
  { id: "list", name: "Liste", desc: "Rader med brytere, gruppert per rom.", prev: "list" },
  { id: "focus", name: "Fokus", desc: "Ett rom per skjerm, i stor skrift. Sveip sidelengs.", prev: "focus" },
];

function layoutPreview(kind) {
  if (kind === "start")
    return `<div class="lprev" style="flex-direction:column;gap:5px">
      <i style="width:62%;height:16px"></i>
      <div style="display:flex;gap:4px;flex:1">
        <i style="flex:1"></i><i style="flex:1"></i><i style="flex:1"></i></div></div>`;
  if (kind === "sidebar")
    return `<div class="lprev"><i style="width:26%"></i><i style="flex:1"></i></div>`;
  if (kind === "list")
    return `<div class="lprev" style="flex-direction:column;gap:4px">
      <i style="height:9px"></i><i style="height:9px"></i><i style="height:9px"></i><i style="height:9px"></i></div>`;
  if (kind === "focus")
    return `<div class="lprev" style="align-items:center;justify-content:center">
      <i style="width:52%;height:22px"></i></div>`;
  return `<div class="lprev" style="flex-wrap:wrap;gap:4px">
    ${Array.from({ length: 6 }, () => `<i style="width:calc(33.3% - 3px);height:19px"></i>`).join("")}</div>`;
}

const SECTIONS = [
  { id: "layout", name: "Layout", icon: "mdi:view-dashboard-outline" },
  { id: "deck", name: "Dashbord", icon: "mdi:tune" },
  { id: "look", name: "Utseende", icon: "mdi:palette-outline" },
  { id: "home", name: "Hjem", icon: "mdi:home-outline" },
  { id: "rooms", name: "Rom", icon: "mdi:view-grid-outline" },
  { id: "nav", name: "Navigasjon", icon: "mdi:compass-outline" },
  { id: "system", name: "System", icon: "mdi:cog-outline" },
];

/** Fjern data-act fra alt unntatt det som faktisk kan lagres uten admin.
 *  Brukes til å gjøre innstillingene ærlige for ikke-administratorer: en
 *  bryter som ser aktiv ut, men aldri lagres, er verre enn en død bryter. */
function withoutActions(html, keep = []) {
  const keepSet = new Set(keep);
  return html.replace(/<[^>]*\sdata-act="([^"]+)"[^>]*>/g, (tag, act) => {
    if (keepSet.has(act)) return tag;
    if (act === "settoggle" && /data-k="(?:hideSidebar|hideHeader)"/.test(tag))
      return tag;
    return tag.replace(/\sdata-act="[^"]*"/, "");
  });
}

export function settingsSheet(ctx, model) {
  const sec = ctx.setSec || "layout";
  const canWrite = !!ctx.canWrite;
  const nav = SECTIONS.map((s) => `
    <div class="navitem ${sec === s.id ? "sel" : ""}" data-act="setsec" data-s="${h(s.id)}">
      ${ic(s.icon)}<span>${h(s.name)}</span></div>`).join("");

  let pane = "";
  if (sec === "layout") pane = paneLayout(ctx);
  else if (sec === "deck") pane = paneDeck(ctx, model);
  else if (sec === "look") pane = paneLook(ctx, model);
  else if (sec === "home") pane = paneHome(ctx, model);
  else if (sec === "rooms") pane = paneRooms(ctx, model);
  else if (sec === "nav") pane = paneNav(ctx, model);
  else pane = paneSystem(ctx, model);

  if (!canWrite) {
    /* Layoutvalg og kioskbrytere lagres på denne enheten. Alt som krever
       server-skriving fjernes, i stedet for å se ut som det virker. */
    pane = withoutActions(pane, ["setlayout", "defaultpanel"]);
    pane = `<div class="setsec"><p>Du er ikke administrator. Layoutvalg og
      skjermvalg lagres på denne enheten, men resten av innstillingene kan
      bare leses.</p></div>${pane}`;
  }

  return `<div class="scrim" data-act="closeoverlay"></div>
  <div class="sheet full">
    <div class="sheethead">
      <div style="flex:1">
        <div class="lbl">Deckify ${h(ctx.version)}</div>
        <div class="h2" style="margin-top:2px">Innstillinger</div>
        <div class="sub">Utseende, hjem og navigasjon. Ordne hvert skjermbilde med Rediger-knappen.</div>
      </div>
      <div class="xbtn" data-act="closeoverlay">${ic(ICON.close)}</div>
    </div>
    <div class="setwrap">
      <div class="setnav">${nav}</div>
      <div class="setpane">${pane}</div>
    </div>
  </div>`;
}

/* ---------------------------------------------------------------- layout */

function paneLayout(ctx) {
  const cur = ctx.store.get("layout");
  const cards = LAYOUTS.map((l) => `
    <div class="lcard ${cur === l.id ? "sel" : ""}" data-act="setlayout" data-l="${h(l.id)}">
      ${layoutPreview(l.prev)}
      <b>${h(l.name)}</b><span>${h(l.desc)}</span>
    </div>`).join("");
  return `
  <div class="setsec">
    <h4>Ordne skjermen</h4>
    <p>Dra kort for \u00e5 flytte, trykk \u2212 for \u00e5 skjule, og pilen for dobbel st\u00f8rrelse.
       Gjelder skjermen du st\u00e5r p\u00e5 \u2014 hvert rom og hver side har sin egen rekkef\u00f8lge.</p>
    ${ctx.canEdit
      ? `<div class="btn primary" data-act="editnow">${ic(ICON.pencil)}Rediger denne skjermen</div>`
      : `<p class="sub">Redigering av rekkefølge og kort krever administrator.</p>`}
  </div>
  <div class="setsec">
    <h4>Layout</h4>
    <p>Rekkefølgen og de skjulte kortene du setter gjelder i alle fem. Media, Sikkerhet, Scener og egne sider følger valget. Lagres per enhet.</p>
    <div class="layoutcards">${cards}</div>
  </div>`;
}

/* -------------------------------------------------------------- utseende */

function paneLook(ctx, model) {
  const s = ctx.store;
  const card = CARD_COLORS.find((c) => c.id === s.get("card")) || CARD_COLORS[0];
  const acc = ACCENT_COLORS.find((c) => c.id === s.get("accent")) || ACCENT_COLORS[0];

  const preview = `
    <div style="display:grid;place-items:center;padding:22px 0 26px">
      <div class="card on" style="width:208px;height:158px;background:${card.hex};color:#221d19;position:relative;pointer-events:none">
        <div class="top">
          <div class="ic" style="background:${acc.hex};color:#2a2008">${ic(ICON.light)}</div>
          <div class="pw" style="background:rgba(0,0,0,.07);color:#221d19">${ic(ICON.power)}</div>
        </div>
        <div class="bottom">
          <div class="nm">Stue</div>
          <div class="st" style="color:rgba(34,29,25,.52)">75 %</div>
          <div class="bar" style="margin-top:8px;height:22px;background:rgba(34,29,25,.1)">
            <div class="fill" style="width:75%;background:${acc.hex}"></div></div>
        </div>
      </div>
    </div>`;

  const cardSw = CARD_COLORS.map((c) => `
    <div class="cswatch ${c.id === card.id ? "sel" : ""}" style="background:${c.hex}"
         title="${h(c.name)}" data-act="setcard" data-c="${h(c.id)}">
      ${c.id === card.id ? ic(ICON.check) : ""}</div>`).join("");

  const accSw = ACCENT_COLORS.map((c) => `
    <div class="cswatch ${c.id === acc.id ? "sel" : ""}" style="background:${c.hex}"
         title="${h(c.name)}" data-act="setaccent" data-c="${h(c.id)}">
      ${c.id === acc.id ? ic(ICON.check) : ""}</div>`).join("");

  const bgCells = BACKGROUNDS.map((b) => `
    <div class="bgcell ${s.get("background") === b.id ? "sel" : ""}"
         style="background:${bgCss(b.id, 0.45)}" data-act="setbg" data-b="${h(b.id)}">
      <span class="n">${h(b.name)}</span></div>`).join("");

  return `
  ${preview}
  <div class="setsec">
    <h4>Kortfarge</h4><p>Myk flate på kort som er på.</p>
    <div class="swatchrow">${cardSw}</div>
  </div>
  <div class="setsec">
    <h4>Aksentfarge</h4><p>Sterk farge på ikoner, prikker, slidere og tellere.</p>
    <div class="swatchrow">${accSw}</div>
  </div>
  <div class="setsec">
    <h4>Bakgrunn</h4><p>Endrer seg med lyset hjemme.</p>
    <div class="bgrow">${bgCells}</div>
    ${toggleRow(ctx, "bgAuto", "Varm opp bakgrunnen", "Bakgrunnen blir varmere jo flere lys som er på.")}
  </div>
  <div class="setsec">
    <h4>Lesbarhet</h4><p>Skru på hvis tekst og kortkanter flyter sammen med bakgrunnen.</p>
    ${toggleRow(ctx, "hiContrast", "Høy kontrast",
      "Tettere kortflater, tydeligere kanter og sterkere sekundærtekst.")}
  </div>`;
}

/* ------------------------------------------------------------------ hjem */

function paneHome(ctx, model) {
  const s = ctx.store;
  const hiddenHome = s.data.hidden["home"] || [];
  const hiddenScenes = s.data.hidden["scenes"] || [];
  return `
  <div class="setsec">
    <h4>Toppen</h4>
    ${toggleRow(ctx, "showWeather", "Værpille", "Temperatur og forhold, med fullt varsel ett trykk unna.")}
    ${toggleRow(ctx, "showAgenda", "Kalender og gjøremål", "Knapper ved klokka med antall for i dag.")}
    ${toggleRow(ctx, "showPeople", "Personer", "Viser hvem som er hjemme.")}
    ${toggleRow(ctx, "clock24", "24-timers klokke", "Av gir AM/PM.")}
    ${toggleRow(ctx, "showSeconds", "Vis sekunder", "")}
  </div>
  <div class="setsec">
    <h4>Scener</h4>
    ${toggleRow(ctx, "scenesOnTop", "Scener øverst", "Scenestripen kommer før enhetene i alle layouter.")}
    <div class="optrow">
      <div class="ot"><b>Skjulte scener</b><span>${hiddenScenes.length} skjult</span></div>
      <div class="btn" data-act="unhide" data-scope="scenes">Vis alle igjen</div>
    </div>
  </div>
  <div class="setsec">
    <h4>Hjem-skjermen</h4>
    <div class="optrow">
      <div class="ot"><b>Skjulte kort</b><span>${hiddenHome.length} skjult på Hjem</span></div>
      <div class="btn" data-act="unhide" data-scope="home">Vis alle igjen</div>
    </div>
    <div class="optrow" data-act="cfgtoggle" data-k="show_unavailable"
         data-v="${ctx.cfg.showUnavailable ? "" : "1"}">
      <div class="ot"><b>Vis utilgjengelige enheter</b><span>Enheter uten kontakt vises nedtonet i stedet for å skjules.</span></div>
      <div class="sw-toggle ${ctx.cfg.showUnavailable ? "on" : ""}"><i></i></div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------- rom */

function paneRooms(ctx, model) {
  const rows = model.rooms.map((r) => {
    const hidden = (ctx.store.data.hidden["home"] || []).includes("room:" + r.id);
    const hiddenDev = (ctx.store.data.hidden["room:" + r.id] || []).length;
    return `<div class="optrow">
      <div class="ic" style="width:34px;height:34px;border-radius:17px;background:rgba(255,255,255,.1);display:grid;place-items:center">${ic(r.icon)}</div>
      <div class="ot"><b>${h(r.name)}</b>
        <span>${r.controls.length} enheter · ${r.scenes.length} scener${hiddenDev ? ` · ${hiddenDev} skjult` : ""}</span></div>
      ${hiddenDev ? `<div class="btn" data-act="unhide" data-scope="room:${h(r.id)}">Vis alle</div>` : ""}
      <div class="sw-toggle ${hidden ? "" : "on"}" data-act="hide" data-id="room:${h(r.id)}" data-scope="home"><i></i></div>
    </div>`;
  }).join("");
  return `
  <div class="setsec">
    <h4>Rom på Hjem</h4><p>Slå av et rom for å skjule kortet. Ingenting slettes.</p>
    ${rows}
  </div>`;
}

/* ------------------------------------------------------------ navigasjon */

function paneNav(ctx, model) {
  const saverSec = ctx.store.get("saverSec") || 0;
  const pages = ctx.store.get("dockPages") || [];
  const rows = pages.length ? pages.map((p) => `
    <div class="optrow">
      <div class="ic" style="width:34px;height:34px;border-radius:17px;background:rgba(255,255,255,.1);display:grid;place-items:center">${ic(p.icon || "mdi:star-outline")}</div>
      <div class="ot"><b>${h(p.name)}</b><span>${p.entities.length} enheter</span></div>
      <div class="btn" data-act="editpage" data-p="${h(p.id)}">Endre</div>
      <div class="btn danger" data-act="delpage" data-p="${h(p.id)}">${ic(ICON.close)}</div>
    </div>`).join("") : `<div class="sub" style="padding:10px 0">Ingen egne sider ennå.</div>`;

  /* Sidene ligger i serveroppsettet (samme liste som integrasjonens
     «Sider»-side), ikke i en lokal skjul-liste. Da er listen positiv:
     ingenting vises før du har skrudd det på. */
  const DOCK_ALL = [
    ["home", "Hjem", "Rom, scener og kortene du legger inn selv."],
    ["rooms", "Rom", "Ett rom av gangen med alle enhetene i rommet."],
    ["media", "Media", "Høyttalere, grupper, favoritter og fjernkontroller."],
    ["house", "Huset", "Temperatur, maskiner, planter og batterier."],
    ["energy", "Energi", "Strømpris og forbruk."],
    ["security", "Sikkerhet", "Røyk, lekkasje, dører og bevegelse."],
    ["attention", "Trenger tilsyn", "Alt som ber om en handling."],
  ];
  const activePages = ctx.cfg.pages || [];
  const dockRows = DOCK_ALL.map(([k, label, desc]) => {
    const on = activePages.includes(k);
    return `<div class="optrow" data-act="pagetoggle" data-k="${h(k)}" data-v="${on ? "" : "1"}">
      <div class="ot"><b>${h(label)}</b><span>${h(desc)}</span></div>
      <div class="sw-toggle ${on ? "on" : ""}"><i></i></div>
    </div>`;
  }).join("");

  return `
  <div class="setsec">
    <h4>Sider i menylinja</h4><p>Skru på de sidene du vil ha. De analytiske
      sidene (Huset, Energi, Sikkerhet, Trenger tilsyn) fyller seg selv med
      det de finner — derfor er de av til å begynne med.</p>
    ${dockRows}
  </div>
  <div class="setsec">
    <h4>Egne sider</h4><p>Lag sider med akkurat de enhetene du vil. De havner i docken og følger layouten.</p>
    ${rows}
    <div class="btn primary" style="margin-top:12px" data-act="newpage">${ic(ICON.plus)}Ny side</div>
  </div>
  <div class="setsec">
    <h4>Skjerm</h4>
    ${toggleRow(ctx, "hideSidebar", "Skjul Home Assistants sidemeny", "Lagres per enhet – fint på veggnettbrettet.")}
    ${toggleRow(ctx, "hideHeader", "Skjul Home Assistants topplinje", "Gir full skjerm. Lagres per enhet.")}
  </div>
  <div class="setsec">
    <h4>Skjermsparer</h4>
    <p>Stor klokke med dagens dato når ingen rører skjermen. Ett trykk vekker
       den. Følger bakgrunnen og fargene du har valgt.</p>
    <div class="optrow">
      <div class="ot"><b>Starter etter</b><span>Gjelder alle skjermer.</span></div>
      <div class="seg">
        ${SAVER_DELAYS.map((o) => `<div class="s ${saverSec === o.s ? "sel" : ""}"
          data-act="setsaver" data-m="${o.s}">${h(o.label)}</div>`).join("")}
      </div>
    </div>
    ${saverSec ? `
      ${toggleRow(ctx, "saverWeather", "Vær", "Temperatur og forhold akkurat nå.")}
      ${toggleRow(ctx, "saverStatus", "Hjemstatus", "Hvor mange lys som står på.")}
      ${toggleRow(ctx, "saverMedia", "Spilles nå", "Vises bare når noe faktisk spilles.")}
      ${toggleRow(ctx, "saverAgenda", "Neste hendelse", "Fra kalenderne dashbordet bruker.")}
      <div class="optrow">
        <div class="ot"><b>Varsler</b><span>Røyk, lekkasje og åpne dører vises alltid — de kan ikke skrus av.</span></div>
      </div>` : ""}
  </div>
  <div class="setsec">
    <h4>Startskjerm</h4><p>Åpne Deckify med én gang du går inn i Home Assistant.</p>
    <div class="optrow">
      <div class="ot"><b>Deckify som startside</b><span>${ctx.isDefaultPanel ? "Aktiv nå" : "Ikke aktiv"}</span></div>
      <div class="sw-toggle ${ctx.isDefaultPanel ? "on" : ""}" data-act="defaultpanel"><i></i></div>
    </div>
  </div>`;
}

/* ---------------------------------------------------------------- system */

function paneSystem(ctx, model) {
  const s = ctx.store;
  const cals = ctx.cfg.calendars || [];
  const selCals = s.get("calendars") ?? cals;
  const calPicks = cals.map((e) => `
    <div class="pick ${selCals.includes(e) ? "sel" : ""}" data-act="togglecal" data-e="${h(e)}">
      ${ic(selCals.includes(e) ? ICON.check : ICON.plus)}<span>${h(nameOf(ctx.hass, ctx.cfg, e))}</span></div>`).join("");

  const todos = Object.keys(ctx.hass.states).filter((e) => e.startsWith("todo."));
  const selTodo = s.get("todoList") || ctx.cfg.todoEntity;
  const todoPicks = todos.map((e) => `
    <div class="pick ${selTodo === e ? "sel" : ""}" data-act="settodo" data-e="${h(e)}">
      ${ic(ICON.todo)}<span>${h(nameOf(ctx.hass, ctx.cfg, e))}</span></div>`).join("");

  const nDev = model.rooms.reduce((n, r) => n + r.controls.length, 0);
  const nSce = model.rooms.reduce((n, r) => n + r.scenes.length, 0) + model.looseScenes.length;

  return `
  <div class="setsec">
    <h4>Kalendere</h4><p>Velg hvilke som vises ved klokka og i månedsvisningen.</p>
    <div class="pickrow">${calPicks || `<span class="sub">Ingen kalendere funnet.</span>`}</div>
  </div>
  <div class="setsec">
    <h4>Gjøremålsliste</h4>
    <div class="pickrow">${todoPicks || `<span class="sub">Ingen lister funnet.</span>`}</div>
  </div>
  <div class="setsec">
    <h4>Oppsett</h4>
    <div class="optrow"><div class="ot"><b>Rom</b><span>${model.rooms.length} områder fra Home Assistant</span></div></div>
    <div class="optrow"><div class="ot"><b>Enheter</b><span>${nDev} styrbare enheter</span></div></div>
    <div class="optrow"><div class="ot"><b>Scener</b><span>${nSce} scener</span></div></div>
    <div class="optrow"><div class="ot"><b>Versjon</b><span>Deckify ${h(ctx.version)} · lokal, ingen sky</span></div></div>
  </div>
  <div class="setsec">
    <h4>Nullstill</h4>
    <p>Nullstill layout setter rekkefølge, skjulte kort, størrelser, grupper og
       kortinnstillinger tilbake. Rom, sensorer, sider, farger, scener og filtre
       beholdes.</p>
    ${ctx.canEdit ? `<div class="btn danger" data-act="reset">${ic("mdi:restore")}Nullstill layout</div>` : ""}
    ${ctx.store.writable ? `
      <p style="margin-top:14px">${ctx.store.perDevice
        ? "Nullstill alt nullstiller denne skjermens lokale oppsett."
        : "Nullstill alt sletter også romvalg, sensorvalg, filtre, sider, scener, farger og egne sider for alle skjermer."}</p>
      <div class="btn danger" data-act="resetall">${ic("mdi:delete-outline")}Nullstill alt</div>` : ""}
  </div>`;
}

/* ------------------------------------------------------------- hjelpere */

/* ------------------------------------------------------------- dashbord */

/**
 * Oppsettet som ligger på tjenersiden: rom, scener og filtre. Dette er de
 * samme verdiene integrasjonens innstillingssider skriver, så de to kan
 * ikke komme i utakt — begge går via `store.patchServer`.
 */
function paneDeck(ctx, model) {
  const srv = ctx.store.server || {};
  const ro = !ctx.store.writable;
  const areas = Object.entries(ctx.hass.areas || {})
    .map(([id, a]) => ({ id, name: a.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "nb"));
  const chosen = srv.areas || [];
  const areaPicks = areas.map((a) => {
    const on = !chosen.length || chosen.includes(a.id);
    return `<div class="pick ${on ? "sel" : ""}" data-act="cfgarea" data-id="${h(a.id)}">
      ${ic(on ? ICON.check : ICON.plus)}<span>${h(a.name)}</span></div>`;
  }).join("");

  const autoFill = srv.auto_fill === true;
  const perDev = srv.per_device === true;
  const sc = srv.scenes || {};
  const nScenes = model.rooms.reduce((n, r) => n + r.scenes.length, 0) + model.looseScenes.length;
  const maxOpts = [6, 8, 10, 14, 20, 0].map((n) => `
    <div class="pick ${(sc.max ?? 10) === n ? "sel" : ""}" data-act="cfgnum"
         data-k="scenes.max" data-v="${n}">
      <span>${n === 0 ? "Alle" : n}</span></div>`).join("");

  const excl = srv.exclude || [];
  const exclRows = excl.length ? excl.map((e) => `
    <div class="optrow">
      <div class="ot"><b>${h(nameOf(ctx.hass, ctx.cfg, e))}</b><span>${h(e)}</span></div>
      <div class="btn" data-act="cfgunexclude" data-e="${h(e)}">${ic("mdi:undo")}Ta inn igjen</div>
    </div>`).join("") : `<p>Ingenting er utelatt. Trykk − på et kort for å skjule det på én side, eller bruk integrasjonens innstillinger for å fjerne en entitet helt.</p>`;

  const sens = ctx.cfg;
  const manual = srv.sensors || {};
  const sensRow = (label, key, eid) => `<div class="optrow"><div class="ot">
    <b>${h(label)}</b><span>${eid ? h(eid) : "ikke funnet"}</span></div>
    <span class="sub">${manual[key] ? "valgt" : "auto"}</span></div>`;

  const body = `
  <div class="setsec">
    <h4>Oppførsel</h4>
    <div class="optrow" data-act="cfgtoggle" data-k="auto_fill" data-v="${autoFill ? "" : "1"}">
      <div class="ot"><b>Fyll dashbordet automatisk</b><span>${autoFill
        ? "På: alle rom og kort legges inn av seg selv, og nye enheter dukker opp automatisk."
        : "Av: dashbordet starter tomt, og du legger til rom, kort og enheter selv."}</span></div>
      <div class="sw-toggle ${autoFill ? "on" : ""}"><i></i></div>
    </div>
    <div class="optrow" data-act="cfgtoggle" data-k="per_device" data-v="${perDev ? "" : "1"}">
      <div class="ot"><b>Eget oppsett per skjerm</b><span>${perDev
        ? "På: denne skjermen har sitt eget oppsett, lagret i nettleseren."
        : "Av: samme oppsett på alle enheter, lagret på tjeneren."}</span></div>
      <div class="sw-toggle ${perDev ? "on" : ""}"><i></i></div>
    </div>
  </div>
  <div class="setsec">
    <h4>Rom</h4>
    <p>Hvilke områder dashbordet dekker. Er alle valgt, dukker nye rom opp av seg selv.</p>
    <div class="pickrow">${areaPicks || `<span class="sub">Ingen områder i Home Assistant.</span>`}</div>
  </div>
  <div class="setsec">
    <h4>Scener</h4>
    <p>${nScenes} scener oppdaget. Døper du dem om i Hue-appen, følger dashbordet etter uten at du trenger å gjøre noe.</p>
    <div class="pickrow" style="margin-bottom:12px">${maxOpts}</div>
    <div class="optrow" data-act="cfgtoggle" data-k="scenes.strip_area_prefix">
      <div class="ot"><b>Kort scenenavn</b><span>Fjern romnavnet, slik at «Stue Stue Slapp av» blir «Slapp av».</span></div>
      <div class="sw-toggle ${sc.strip_area_prefix !== false ? "on" : ""}"><i></i></div>
    </div>
    <div class="optrow" data-act="cfgtoggle" data-k="scenes.auto">
      <div class="ot"><b>Oppdag nye scener</b><span>Legg nye scener til i stripa automatisk.</span></div>
      <div class="sw-toggle ${sc.auto !== false ? "on" : ""}"><i></i></div>
    </div>
  </div>
  <div class="setsec">
    <h4>Utelatte entiteter</h4>
    ${exclRows}
  </div>
  <div class="setsec">
    <h4>Sensorer som er funnet</h4>
    <p>Står noe feil, kan du velge sensor manuelt i integrasjonens innstillinger.</p>
    ${sensRow("Vær", "weather", sens.weatherEntity)}
    ${sensRow("Totalt strømforbruk", "power", sens.powerSensor)}
    ${sensRow("Strømpris", "price", sens.priceSensor)}
    ${sensRow("Utetemperatur", "outdoor_temp", sens.outdoorTemp)}
    ${sensRow("Gjøremål", "todo", sens.todoEntity)}
    <div class="optrow"><div class="ot"><b>Planter</b><span>${sens.plants.length} funnet</span></div></div>
    <div class="optrow"><div class="ot"><b>Maskiner</b><span>${sens.machines.length} funnet</span></div></div>
    <div class="optrow"><div class="ot"><b>Kalendere</b><span>${(sens.calendars || []).length} funnet</span></div></div>
  </div>
  <div class="setsec">
    <h4>Lagring</h4>
    <div class="optrow"><div class="ot"><b>Dashbord</b><span>${
      ctx.store.entryId ? h(ctx.store.entryId) : "ikke koblet til integrasjonen"}</span></div></div>
    <div class="optrow"><div class="ot"><b>Oppsett lagres</b><span>${
      ctx.store.perDevice ? "i denne nettleseren (eget oppsett per skjerm)"
        : ctx.store.writable ? "på tjeneren, delt mellom alle brukere og skjermer"
                             : "bare lokalt i denne nettleseren"}</span></div></div>
  <div class="setsec">
    <h4>Globale innstillinger</h4>
    <p>Sensorer, regex-filtre, bekreftelsesregler og flere avanserte valg
       ligger i integrasjonens egne innstillinger.</p>
    <div class="btn" data-act="openintegration">${ic(ICON.cog)}Åpne integrasjonens innstillinger</div>
  </div>`;

  return ro ? withoutActions(body) : body;
}

function toggleRow(ctx, key, title, desc) {
  const on = !!ctx.store.get(key);
  return `<div class="optrow">
    <div class="ot"><b>${h(title)}</b>${desc ? `<span>${h(desc)}</span>` : ""}</div>
    <div class="sw-toggle ${on ? "on" : ""}" data-act="settoggle" data-k="${h(key)}"><i></i></div>
  </div>`;
}
