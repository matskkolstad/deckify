/* Deckify — media.js
 * Høyttalergruppering, per-medlem volum og en generisk medieutforsker.
 *
 * Utforskeren bruker HAs `media_player/browse_media` + `media_player.play_media`.
 * Det betyr at den viser mediefavoritter og Radio Browser i dag, og hele
 * Music Assistant-biblioteket automatisk den dagen MA-integrasjonen kobles
 * til — uten at kortet må endres.
 */
import {
  h, ICON, clamp, domainOf, nameOf, shortName, isDead, fmtNum, mmss, areaIdOf,
} from "./core.js?v=2.4.2";
import { ic, mediaPos, stateText } from "./controls.js?v=2.4.2";
import { sheet } from "./overlays.js?v=2.4.2";
import { appleTVs } from "./appletv.js?v=2.4.2";

/* ------------------------------------------------------- grupper/spillere */

/** Alle styrbare mediaspillere i modellen, med rom. */
/** Apple TV fortjener sin egen fjernkontroll, ikke den generiske spilleren. */
function atvAct(ctx, eid) {
  return ctx.hass.entities?.[eid]?.platform === "apple_tv" ? "appletv" : "player";
}

export const MEDIA_SCOPE = "media";

/**
 * Spillerne mediasiden skal vise.
 *
 * Med autofyll av er den LAGREDE lista fasiten — ellers fylles siden av
 * atten mediaspillere på et dashbord brukeren nettopp har startet tomt.
 * Alle oppdagede spillere er fortsatt tilgjengelige i enhetsvelgeren.
 */
export function allPlayers(ctx, model) {
  const found = [];
  for (const r of model.rooms)
    for (const e of r.controls)
      if (domainOf(e) === "media_player") found.push({ eid: e, room: r.name });

  const saved = ctx.store.data.order[MEDIA_SCOPE];
  if (!ctx.cfg.autoFill) {
    const list = (saved || []).filter((e) => ctx.hass.states[e]);
    return list.map((e) => found.find((p) => p.eid === e) ||
      { eid: e, room: ctx.hass.areas?.[areaIdOf(ctx.hass, e)]?.name || null });
  }
  if (!saved) return found;
  const keep = saved.filter((e) => ctx.hass.states[e]);
  return [...keep.map((e) => found.find((p) => p.eid === e) || { eid: e, room: null }),
          ...found.filter((p) => !keep.includes(p.eid))];
}

/** Høyttalere som kan grupperes (støtter join/unjoin). */
export function groupable(ctx, model) {
  return allPlayers(ctx, model).filter(({ eid }) => {
    const st = ctx.hass.states[eid];
    if (!st || isDead(st)) return false;
    return Array.isArray(st.attributes.group_members) ||
      (st.attributes.supported_features & 524288) > 0; /* GROUPING */
  });
}

/** Grupper slik de faktisk er nå: [{leader, members:[eid]}] */
export function currentGroups(ctx, model) {
  const seen = new Set();
  const groups = [];
  for (const { eid } of groupable(ctx, model)) {
    const st = ctx.hass.states[eid];
    const gm = st.attributes.group_members || [];
    if (gm.length < 2) continue;
    const leader = gm[0];
    if (seen.has(leader)) continue;
    seen.add(leader);
    groups.push({ leader, members: gm });
  }
  return groups;
}

export function groupLabel(ctx, members) {
  return members.map((e) => nameOf(ctx.hass, ctx.cfg, e)).join(" + ");
}

/* ----------------------------------------------------------- mediaside */

/** Fjernkontrollrad for Apple TV. Uten denne finnes fjernkontrollen bare i
 *  Startskjerm-layouten, og er i praksis utilgjengelig på de andre. */
function atvRow(ctx) {
  const tvs = appleTVs(ctx);
  if (!tvs.length) return "";
  return `
    <div class="lbl" style="margin-top:24px">Fjernkontroller</div>
    <div class="scenestrip" style="margin-top:9px">
      ${tvs.map((t) => `<div class="chip" data-act="appletv" data-e="${h(t.media)}">
        ${ic("mdi:apple")}<span>${h(t.name)}</span></div>`).join("")}
    </div>`;
}

export function viewMediaPage(ctx, model, header) {
  const { hass } = ctx;
  const players = allPlayers(ctx, model);
  const active = players.filter((p) => ["playing", "paused", "buffering"].includes(hass.states[p.eid]?.state));
  const idle = players.filter((p) => !active.includes(p));
  const groups = currentGroups(ctx, model);

  const bigCards = active.map((p) => playerStrip(ctx, p.eid, p.room)).join("");

  const groupRow = groups.length ? `
    <div class="lbl" style="margin-top:24px">Grupper</div>
    <div class="scenestrip" style="margin-top:9px">
      ${groups.map((g) => `
        <div class="chip" data-act="groupsheet" data-e="${h(g.leader)}">
          ${ic("mdi:speaker-multiple")}<span>${h(groupLabel(ctx, g.members))}</span>
        </div>`).join("")}
      <div class="chip" data-act="ungroupall">${ic("mdi:link-variant-off")}<span>Løs opp alle</span></div>
    </div>` : "";

  /* foretrekk en ekte høyttaler (grupperbar) framfor TV/Apple TV */
  const spk = groupable(ctx, model);
  const spkActive = spk.find((p) => ["playing", "paused", "buffering"].includes(hass.states[p.eid]?.state));
  const tgt = (spkActive || spk[0] || active[0] || players[0])?.eid || null;
  const quick = quickPlayRow(ctx, tgt);

  return `
    ${header}
    <div class="statusrow">
      <div class="statustext">
        <div class="lbl">Media</div>
        <div class="h1" style="margin-top:3px">${h(active.length
          ? `${active.length} ${active.length === 1 ? "spiller" : "spillere"} i gang`
          : "Ingenting spilles av")}</div>
      </div>
      <div class="allbtns">
        <div class="abtn" data-act="groupsheet" data-e="${h(tgt || "")}">
          ${ic("mdi:speaker-multiple")}<span>Grupper</span></div>
        <div class="abtn solid" data-act="browse" data-e="${h(tgt || "")}">
          ${ic("mdi:playlist-music-outline")}<span>Start musikk</span></div>
      </div>
    </div>
    ${atvRow(ctx)}
    ${players.length ? quick : ""}
    ${groupRow}
    ${!players.length ? `<div class="empty">${ic("mdi:speaker-off")}Ingen høyttalere lagt inn ennå —
      trykk Rediger og «Legg til enheter».</div>` : ""}
    ${active.length ? `<div class="grid" style="grid-auto-rows:168px">${bigCards}</div>` : ""}
    ${ctx.edit ? `<div class="grid" style="margin-top:18px">
      <div class="card addcard" data-act="adddevices" data-scope="${h(MEDIA_SCOPE)}">
        <div class="inner"><div class="ic">${ic(ICON.plus)}</div><span>Legg til høyttalere</span></div></div>
      </div>` : ""}
    ${idle.length ? `<div class="lbl" style="margin-top:24px">Høyttalere</div>
      <div class="grid">${idle.map((p) => speakerTile(ctx, p.eid, p.room)).join("")}</div>` : ""}
    ${!players.length && ctx.cfg.autoFill
      ? `<div class="empty">${ic(ICON.media)}Ingen mediaspillere funnet.</div>` : ""}`;
}

/** Favorittstripe — ett trykk starter musikk. */
function quickPlayRow(ctx, tgt) {
  const favs = ctx.media?.favorites || [];
  if (!favs.length) return "";
  const on = ctx.browseTarget || tgt;
  return `
    <div class="scenes">
      <div class="lbl">Hurtigvalg${on ? ` <span style="opacity:.6">\u00b7 spiller p\u00e5 ${h(nameOf(ctx.hass, ctx.cfg, on))}</span>` : ""}</div>
      <div class="scenestrip">
        ${favs.slice(0, 10).map((f) => `
          <div class="chip" data-act="quickplay" data-id="${h(f.id)}" data-t="${h(f.type)}">
            ${ic(f.icon || "mdi:music")}<span>${h(f.title)}</span>
          </div>`).join("")}
      </div>
    </div>`;
}

/** Bred spillerstripe med omslag, progresjon, transport og gruppeknapp. */
export function playerStrip(ctx, eid, roomName) {
  const { hass } = ctx;
  const st = hass.states[eid];
  const a = st.attributes;
  const playing = ["playing", "buffering"].includes(st.state);
  const art = a.entity_picture;
  const src = a.source || "";
  const spotify = /spotify/i.test(src) || /spotify/i.test(a.media_content_id || "");
  const dur = a.media_duration;
  const pos = mediaPos(st);
  const pct = dur ? clamp((pos / dur) * 100, 0, 100) : 0;
  const gm = a.group_members || [];
  const grouped = gm.length > 1;
  const nm = nameOf(hass, ctx.cfg, eid);
  const vol = a.volume_level != null ? Math.round(a.volume_level * 100) : null;

  return `
  <div class="card media big w2" data-act="${atvAct(ctx, eid)}" data-e="${h(eid)}">
    ${art ? `<div class="art" style="background-image:url('${h(art)}')"></div>` : ""}
    <div class="shade"></div>
    <div class="inner">
      <div class="srcline ${spotify ? "" : "generic"}">
        ${ic(spotify ? "mdi:spotify" : ICON.media)}
        <span>${h(spotify ? "Spotify" : src || "Media")} · ${h(grouped ? groupLabel(ctx, gm) : nm)}</span>
      </div>
      <div style="margin-top:auto">
        <div class="nm" style="font-size:17px">${h(a.media_title || nm)}</div>
        ${a.media_artist ? `<div class="st">${h(a.media_artist)}</div>` : ""}
        <div class="prog"><i style="width:${pct}%"></i></div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
          <div class="transport" style="margin:0;flex:1;justify-content:flex-start">
            <div class="tb" data-act="mp" data-e="${h(eid)}" data-s="media_previous_track">${ic(ICON.prev)}</div>
            <div class="tb main" data-act="mp" data-e="${h(eid)}" data-s="media_play_pause">${ic(playing ? ICON.pause : ICON.play)}</div>
            <div class="tb" data-act="mp" data-e="${h(eid)}" data-s="media_next_track">${ic(ICON.next)}</div>
          </div>
          <div class="tb" data-act="groupsheet" data-e="${h(eid)}"
               style="width:32px;height:32px;border-radius:16px;background:rgba(255,255,255,.14);
                      display:grid;place-items:center;cursor:pointer">${ic("mdi:speaker-multiple")}</div>
          ${vol != null ? `<span class="st" style="font-variant-numeric:tabular-nums">${vol} %</span>` : ""}
        </div>
      </div>
    </div>
  </div>`;
}

function speakerTile(ctx, eid, roomName) {
  const { hass } = ctx;
  const st = hass.states[eid];
  const dead = isDead(st);
  const gm = st?.attributes?.group_members || [];
  return `
  <div class="card ${dead ? "dead" : ""}" data-act="${atvAct(ctx, eid)}" data-e="${h(eid)}">
    <div class="top">
      <div class="ic">${ic(st?.attributes?.device_class === "tv" ? ICON.tv : ICON.media)}</div>
      ${dead ? "" : `<div class="pw" data-act="browse" data-e="${h(eid)}">${ic(ICON.play)}</div>`}
    </div>
    <div class="bottom">
      <div class="nm">${h(nameOf(hass, ctx.cfg, eid))}</div>
      <div class="st">${h(roomName || "")}${gm.length > 1 ? " · gruppert" : ""}</div>
      ${!dead ? `<div class="minibar"><i style="width:${Math.round((st.attributes.volume_level || 0) * 100)}%"></i></div>` : ""}
    </div>
  </div>`;
}

/* -------------------------------------------------------- grupperingsark */

export function groupSheet(ctx, model) {
  const { hass } = ctx;
  const leader = ctx.groupLeader;
  const st = leader ? hass.states[leader] : null;
  if (!st) return sheet("Grupper høyttalere", `<div class="empty">Velg en høyttaler først.</div>`);

  const members = st.attributes.group_members || [leader];
  const cands = groupable(ctx, model);

  const rows = cands.map(({ eid, room }) => {
    const ms = hass.states[eid];
    const inGroup = members.includes(eid);
    const isLeader = eid === leader;
    const vol = ms.attributes.volume_level != null ? Math.round(ms.attributes.volume_level * 100) : null;
    return `
    <div class="lrow" style="cursor:default">
      <div class="ic" ${inGroup ? `style="background:var(--accent);color:#2a2008"` : ""}>
        ${ic(isLeader ? "mdi:speaker-wireless" : ICON.media)}</div>
      <div class="txt">
        <div class="nm">${h(nameOf(hass, ctx.cfg, eid))}${isLeader ? " · leder" : ""}</div>
        <div class="st">${h(room || "")}${vol != null ? ` · ${vol} %` : ""}</div>
        ${inGroup && vol != null ? `
          <div class="bar" style="height:22px;margin-top:7px"
               data-slider="membervol" data-e="${h(eid)}">
            <div class="fill" style="width:${vol}%"></div>
            <div class="pctl">${vol} %</div>
          </div>` : ""}
      </div>
      ${isLeader ? `<span class="st">Leder</span>`
        : `<div class="sw-toggle ${inGroup ? "on" : ""}" data-act="groupmember"
                data-e="${h(eid)}" data-l="${h(leader)}"><i></i></div>`}
    </div>`;
  }).join("");

  const body = `
    <p class="sub" style="margin:0 0 14px">
      Lyden følger lederen. Skru på en høyttaler for å ta den med i gruppa,
      og juster hver høyttaler for seg.</p>
    <div class="lgroup">${rows}</div>
    <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:16px">
      <div class="btn" data-act="groupall" data-l="${h(leader)}">${ic("mdi:select-all")}Alle høyttalere</div>
      <div class="btn" data-act="ungroup" data-l="${h(leader)}">${ic("mdi:link-variant-off")}Løs opp gruppa</div>
      <div class="btn primary" data-act="browse" data-e="${h(leader)}">${ic("mdi:playlist-music-outline")}Start musikk</div>
    </div>`;
  return sheet(`Grupper · ${nameOf(hass, ctx.cfg, leader)}`, body);
}

/* --------------------------------------------------------- medieutforsker */

const MEDIA_ICON = {
  directory: "mdi:folder-outline", album: "mdi:album", artist: "mdi:account-music",
  playlist: "mdi:playlist-music", track: "mdi:music-note", music: "mdi:music",
  genre: "mdi:guitar-acoustic", app: "mdi:apps", channel: "mdi:radio",
  podcast: "mdi:podcast", tv_show: "mdi:television-classic", movie: "mdi:movie-outline",
  video: "mdi:video-outline", season: "mdi:television-guide", url: "mdi:link-variant",
};

/* kilder som ikke har noe med musikk å gjøre */
const SKIP_SOURCES = [
  "media-source://camera", "media-source://image", "media-source://image_upload",
  "media-source://ai_task", "media-source://tts",
];
function usefulChildren(node) {
  const kids = node?.children || [];
  return kids.filter((c) => !SKIP_SOURCES.some((p) => String(c.media_content_id || "").startsWith(p)));
}

export function browseSheet(ctx, model) {
  const { hass } = ctx;
  const target = ctx.browseTarget;
  const node = ctx.browse?.node;
  const stack = ctx.browse?.stack || [];
  const loading = ctx.browse?.loading;
  const err = ctx.browse?.error;

  const players = groupable(ctx, model);
  const targetPicker = `
    <div class="pickrow" style="margin-bottom:14px">
      ${players.map(({ eid }) => {
        const gm = hass.states[eid]?.attributes?.group_members || [];
        const sel = eid === target;
        return `<div class="pick ${sel ? "sel" : ""}" data-act="browsetarget" data-e="${h(eid)}">
          ${ic(ICON.media)}<span>${h(nameOf(hass, ctx.cfg, eid))}${gm.length > 1 ? ` +${gm.length - 1}` : ""}</span>
        </div>`;
      }).join("")}
    </div>`;

  const crumbs = `
    <div class="scenestrip" style="margin-bottom:12px">
      <div class="chip" data-act="browsehome">${ic(ICON.home)}<span>Start</span></div>
      ${stack.slice(1).map((s, i) => `<div class="chip" data-act="browseup" data-i="${i + 1}">
        <span>${h(s.title)}</span></div>`).join("")}
      ${node && stack.length ? `<div class="chip" style="background:var(--cardon);color:var(--ink);border-color:transparent">
        <span>${h(node.title)}</span></div>` : ""}
    </div>`;

  let items;
  if (err) {
    items = `<div class="empty">${ic(ICON.alert)}${h(err)}</div>`;
  } else if (loading) {
    items = `<div class="empty">Laster …</div>`;
  } else if (!usefulChildren(node).length) {
    items = `<div class="empty">${ic("mdi:music-off")}Ingenting her.</div>`;
  } else {
    items = `<div class="grid" style="grid-auto-rows:auto;gap:10px;margin-top:0;
        grid-template-columns:repeat(auto-fill,minmax(min(100%,142px),1fr))">
      ${usefulChildren(node).map((c) => {
        const playable = c.can_play;
        const expand = c.can_expand;
        const thumb = c.thumbnail;
        return `
        <div class="card" style="aspect-ratio:1;padding:0;overflow:hidden"
             data-act="${expand ? "browseinto" : "playitem"}"
             data-id="${h(c.media_content_id || "")}" data-t="${h(c.media_content_type || "")}"
             data-title="${h(c.title || "")}">
          ${thumb ? `<div style="position:absolute;inset:0;background-image:url('${h(thumb)}');
              background-size:cover;background-position:center"></div>
            <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(8,4,10,.85))"></div>`
            : ""}
          <div style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;
                      justify-content:space-between;padding:12px">
            <div class="ic" style="${thumb ? "background:rgba(0,0,0,.42)" : ""}">
              ${ic(MEDIA_ICON[c.media_class] || (playable ? ICON.play : ICON.media))}</div>
            <div>
              <div class="nm" style="font-size:13.5px;white-space:normal;line-height:1.25;
                   max-height:2.6em;overflow:hidden">${h(c.title || "")}</div>
              ${expand && !playable ? `<div class="st" style="font-size:11.5px">Åpne</div>` : ""}
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>`;
  }

  const playAll = node?.can_play ? `
    <div class="btn primary" style="margin-bottom:12px" data-act="playitem"
         data-id="${h(node.media_content_id || "")}" data-t="${h(node.media_content_type || "")}"
         data-title="${h(node.title || "")}">${ic(ICON.play)}Spill «${h(node.title)}»</div>` : "";

  return sheet("Start musikk", targetPicker + crumbs + playAll + items, "wide");
}
