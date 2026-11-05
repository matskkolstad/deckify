/* Deckify — appletv.js
 * Full fjernkontroll for Apple TV: styrekors, knapperad, volum, appgrid og
 * dype lenker rett inn i en serie eller film.
 *
 * To entiteter per boks, begge fra plattformen `apple_tv`:
 *   media_player.<navn>  — tilstand, appliste (source_list), play_media
 *   remote.<navn>        — navigasjon via remote.send_command
 */
import {
  h, ICON, isDead, nameOf, fmtNum, mmss,
} from "./core.js?v=2.0.1";
import { ic } from "./controls.js?v=2.0.1";
import { sheet } from "./overlays.js?v=2.0.1";

/** Alle Apple TV-er, parret med sin remote-entitet. */
export function appleTVs(ctx) {
  const { hass } = ctx;
  const reg = hass.entities || {};
  const out = [];
  for (const [eid, r] of Object.entries(reg)) {
    if (r.platform !== "apple_tv" || !eid.startsWith("media_player.")) continue;
    if (!hass.states[eid]) continue;
    /* fjernkontrollen hører til samme fysiske enhet */
    const rem = Object.entries(reg).find(([e2, r2]) =>
      e2.startsWith("remote.") && r2.platform === "apple_tv" &&
      r2.device_id === r.device_id);
    out.push({
      media: eid,
      remote: rem ? rem[0] : null,
      name: nameOf(hass, ctx.cfg, eid),
      area: hass.areas?.[r.area_id || hass.devices?.[r.device_id]?.area_id]?.name || null,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name, "nb"));
  return out;
}

export function isAppleTV(ctx, eid) {
  return ctx.hass.entities?.[eid]?.platform === "apple_tv";
}

/* App-ikoner vi kjenner igjen på navn. Resten får en bokstavbrikke. */
const APP_ICON = {
  "Netflix": { i: "mdi:netflix", c: "#e50914" },
  "YouTube": { i: "mdi:youtube", c: "#ff0000" },
  "Disney+": { i: "mdi:star-circle", c: "#0c3e78" },
  "HBO Max": { i: "mdi:movie-open", c: "#5a24d6" },
  "Max": { i: "mdi:movie-open", c: "#5a24d6" },
  "Spotify": { i: "mdi:spotify", c: "#1db954" },
  "Apple TV": { i: "mdi:apple", c: "#333" },
  "TV": { i: "mdi:apple", c: "#333" },
  "Musikk": { i: "mdi:music", c: "#fa233b" },
  "Podkaster": { i: "mdi:podcast", c: "#9933cc" },
  "NRK TV": { i: "mdi:television-classic", c: "#0a7ec2" },
  "TV 2 Play": { i: "mdi:television-play", c: "#e3000f" },
  "Viaplay": { i: "mdi:play-circle", c: "#e4002b" },
  "Viafree": { i: "mdi:play-circle-outline", c: "#ff5a00" },
  "Amazon Prime Video": { i: "mdi:amazon", c: "#00a8e1" },
  "discovery+": { i: "mdi:compass", c: "#0077c8" },
  "Pluto TV": { i: "mdi:television", c: "#ffe600" },
  "Infuse": { i: "mdi:filmstrip", c: "#ff5f2e" },
  "App Store": { i: "mdi:apps", c: "#0d96f6" },
  "Arcade": { i: "mdi:gamepad-variant", c: "#ff2d55" },
  "Innstillinger": { i: "mdi:cog", c: "#8e8e93" },
  "Søk": { i: "mdi:magnify", c: "#5856d6" },
  "Bilder": { i: "mdi:image-multiple", c: "#ff9500" },
  "Altibox TV": { i: "mdi:television-box", c: "#00b5e2" },
  "Strim": { i: "mdi:television-shimmer", c: "#00c389" },
  "RiksTV": { i: "mdi:antenna", c: "#e2001a" },
  "Mosjon": { i: "mdi:run", c: "#a3ff00" },
};

/* Apper som sjelden er interessante på et veggnettbrett. */
const APP_SKIP = new Set(["Datamaskiner", "Art Legacy Live", "Artcast",
  "Art Channel", "Speedtest", "Gravitarium TV", "Sky Tripping", "Fvnction TV",
  "DISCO TV"]);

function appChip(ctx, tv, name) {
  const k = APP_ICON[name];
  const letter = name.replace(/[^A-Za-zÆØÅæøå0-9]/g, "").charAt(0).toUpperCase() || "?";
  return `
  <div class="appchip" data-act="atvapp" data-e="${h(tv.media)}" data-v="${h(name)}">
    <div class="appicon" style="background:${k ? k.c : "rgba(255,255,255,.12)"}">
      ${k ? ic(k.i) : `<b>${h(letter)}</b>`}
    </div>
    <span>${h(name)}</span>
  </div>`;
}

/* ------------------------------------------------------------- styrekors */

function dpad(tv) {
  const b = (act, icon, cls = "") =>
    `<div class="dbtn ${cls}" data-act="atvcmd" data-e="${h(tv.remote)}" data-v="${act}">
       ${ic(icon)}</div>`;
  return `
  <div class="dpad">
    ${b("up", "mdi:chevron-up", "up")}
    ${b("left", "mdi:chevron-left", "left")}
    <div class="dbtn mid" data-act="atvcmd" data-e="${h(tv.remote)}" data-v="select">
      <span>OK</span></div>
    ${b("right", "mdi:chevron-right", "right")}
    ${b("down", "mdi:chevron-down", "down")}
  </div>`;
}

/* ----------------------------------------------------------- nå spilles */

function nowPlaying(ctx, tv) {
  const st = ctx.hass.states[tv.media];
  if (!st || isDead(st)) return `
    <div class="atvnow off">${ic("mdi:power-sleep")}<span>Av eller utilgjengelig</span></div>`;
  const a = st.attributes;
  const app = a.app_name || a.source;
  const playing = ["playing", "buffering"].includes(st.state);
  const title = a.media_title;
  const sub = [a.media_series_title, a.media_season && `sesong ${a.media_season}`,
               a.media_episode && `episode ${a.media_episode}`].filter(Boolean).join(" · ")
               || a.media_artist || a.media_album_name || "";
  const pos = a.media_position, dur = a.media_duration;
  const pct = pos != null && dur ? Math.min(100, (pos / dur) * 100) : null;

  return `
  <div class="atvnow ${playing ? "on" : ""}">
    ${a.entity_picture
      ? `<div class="atvart" style="background-image:url('${h(a.entity_picture)}')"></div>`
      : `<div class="atvart ph">${ic(app && APP_ICON[app] ? APP_ICON[app].i : "mdi:apple")}</div>`}
    <div class="atvtxt">
      <div class="app">${h(app || "Apple TV")}${
        st.state === "off" ? " · av" : playing ? "" : st.state === "paused" ? " · pause" : ""}</div>
      <div class="ttl">${h(title || (st.state === "off" ? "Skjermen er av" : "Hjem"))}</div>
      ${sub ? `<div class="sub">${h(sub)}</div>` : ""}
      ${pct != null ? `
        <div class="atvbar"><i style="width:${pct.toFixed(1)}%"></i></div>
        <div class="atvtime"><span>${mmss(pos)}</span><span>${mmss(dur)}</span></div>` : ""}
    </div>
  </div>`;
}

/* ------------------------------------------------------------ dype lenker */

/** Snarveier rett inn i en serie eller film. Defineres i card-config.json. */
function deepLinks(ctx, tv) {
  const list = ctx.cfg.deeplinks || [];
  if (!list.length) return `
    <div class="setsec"><h4>Snarveier</h4>
      <div class="atvhint">${ic("mdi:link-variant")}
        <div>Ingen snarveier satt opp ennå. Legg dem i <code>deeplinks</code> i
        kortets oppsett — del en serie fra Netflix- eller Disney+-appen på
        telefonen, velg «Kopier lenke», og lim inn URL-en.</div></div></div>`;

  const chips = list.map((d, i) => {
    const k = APP_ICON[d.app] || null;
    return `
    <div class="dlink" data-act="atvlink" data-e="${h(tv.media)}" data-i="${i}"
         ${d.image ? `style="background-image:url('${h(d.image)}')"` : ""}>
      <div class="dlshade"></div>
      <div class="dlbody">
        <div class="dlapp" style="${k ? `background:${k.c}` : ""}">
          ${k ? ic(k.i) : ic("mdi:play")}</div>
        <div class="dltxt">
          <div class="nm">${h(d.name)}</div>
          ${d.app ? `<div class="st">${h(d.app)}</div>` : ""}
        </div>
      </div>
    </div>`;
  }).join("");
  return `<div class="setsec"><h4>Snarveier</h4>
    <div class="dlgrid">${chips}</div></div>`;
}

/* ----------------------------------------------------------------- arket */

export function appleTVSheet(ctx, model) {
  const tvs = appleTVs(ctx);
  if (!tvs.length)
    return sheet("Apple TV", `<div class="empty">${ic("mdi:apple")}Ingen Apple TV funnet.</div>`);

  const sel = tvs.find((t) => t.media === ctx.atvSel) || tvs[0];
  const st = ctx.hass.states[sel.media];
  const apps = (st?.attributes?.source_list || []).filter((x) => !APP_SKIP.has(x));

  const picker = tvs.length > 1 ? `
    <div class="pickrow" style="margin-bottom:14px">
      ${tvs.map((t) => `
        <div class="pick ${t.media === sel.media ? "sel" : ""}"
             data-act="atvsel" data-e="${h(t.media)}">
          ${ic("mdi:apple")}<span>${h(t.name)}</span></div>`).join("")}
    </div>` : "";

  const cmd = (act, icon, label, cls = "") =>
    `<div class="atvbtn ${cls}" data-act="atvcmd" data-e="${h(sel.remote)}" data-v="${act}">
       ${ic(icon)}${label ? `<span>${h(label)}</span>` : ""}</div>`;

  const body = `
    ${picker}
    ${nowPlaying(ctx, sel)}

    <div class="atvpad">
      ${dpad(sel)}
      <div class="atvside">
        ${cmd("menu", "mdi:arrow-u-left-top", "Tilbake")}
        ${cmd("home", "mdi:television", "TV")}
        ${cmd("top_menu", "mdi:home-outline", "Hjem")}
      </div>
    </div>

    <div class="atvrow">
      ${cmd("skip_backward", "mdi:rewind-10", "")}
      ${cmd("play_pause", "mdi:play-pause", "", "big")}
      ${cmd("skip_forward", "mdi:fast-forward-10", "")}
    </div>

    <div class="atvrow">
      ${cmd("volume_down", "mdi:volume-medium", "")}
      ${cmd("volume_up", "mdi:volume-high", "")}
      ${cmd("suspend", "mdi:power-sleep", "Hvile")}
    </div>

    ${deepLinks(ctx, sel)}

    <div class="setsec"><h4>Apper <span style="opacity:.5;font-weight:600">${apps.length}</span></h4>
      <div class="appgrid">${apps.map((a) => appChip(ctx, sel, a)).join("")}</div>
    </div>`;

  return sheet(sel.name, body, "wide");
}
