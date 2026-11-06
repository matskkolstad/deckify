/* Deckify — attention.js
 * «Trenger tilsyn»: alt i huset som ber om en handling, samlet ett sted.
 * Sortert etter hvor mye det haster, ikke etter hvilket rom det står i.
 */
import {
  h, ICON, isDead, domainOf, nameOf, fullNameOf, deviceNameOf, shortName,
  entityIcon, fmtNum,
} from "./core.js?v=2.2.1";
import { ic } from "./controls.js?v=2.2.1";

const num = (hass, eid) => {
  const st = eid ? hass.states[eid] : null;
  if (!st || isDead(st)) return null;
  const v = Number(st.state);
  return isFinite(v) ? v : null;
};

const AGO = (iso) => {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "nå";
  if (m < 60) return m + " min";
  const t = Math.floor(m / 60);
  if (t < 24) return t + " t";
  const d = Math.floor(t / 24);
  return d + (d === 1 ? " dag" : " dager");
};

/* nivå 3 = haster, 2 = bør ses på, 1 = til info */
export function collectIssues(ctx, model) {
  const { hass, cfg } = ctx;
  const out = [];

  /* --- farer: røyk, gass, vannlekkasje ------------------------------- */
  for (const r of model.rooms)
    for (const e of r.security) {
      const st = hass.states[e];
      if (st?.state !== "on") continue;
      const dc = st.attributes.device_class;
      if (["smoke", "gas", "carbon_monoxide"].includes(dc))
        out.push({ lvl: 3, icon: ICON.smoke, kind: "Alarm",
          title: nameOf(hass, cfg, e), sub: r.name + " · utløst " + AGO(st.last_changed),
          eid: e });
      else if (dc === "moisture")
        out.push({ lvl: 3, icon: ICON.leak, kind: "Vann",
          title: nameOf(hass, cfg, e), sub: r.name + " · siden " + AGO(st.last_changed),
          eid: e });
    }

  /* --- åpne dører og vinduer ----------------------------------------- */
  for (const r of model.rooms)
    for (const e of r.security) {
      const st = hass.states[e];
      if (st?.state !== "on") continue;
      const dc = st.attributes.device_class;
      if (!["door", "window", "opening", "garage_door"].includes(dc)) continue;
      const mins = (Date.now() - new Date(st.last_changed).getTime()) / 60000;
      out.push({ lvl: mins > 20 ? 2 : 1, icon: ICON.door,
        kind: dc === "window" ? "Vindu" : "Dør",
        title: nameOf(hass, cfg, e), sub: r.name + " · åpen i " + AGO(st.last_changed),
        eid: e });
    }

  /* --- tomme batterier ------------------------------------------------ */
  const warn = cfg.batteryWarn ?? 25;
  const seenBatt = new Set();
  for (const [eid, reg] of Object.entries(hass.entities || {})) {
    if (!eid.startsWith("sensor.")) continue;
    const st = hass.states[eid];
    if (st?.attributes?.device_class !== "battery") continue;
    if (cfg.excludePlatforms.has(reg.platform)) continue;
    const v = num(hass, eid);
    if (v == null || v > warn) continue;
    const label = deviceNameOf(hass, cfg, eid);
    if (seenBatt.has(label.toLowerCase())) continue;
    seenBatt.add(label.toLowerCase());
    out.push({ lvl: v <= 5 ? 3 : v <= 15 ? 2 : 1,
      icon: v <= 10 ? "mdi:battery-alert-variant-outline" : "mdi:battery-low",
      kind: "Batteri", title: label, sub: fmtNum(v, 0) + " % igjen", eid });
  }

  /* --- planter som vil ha vann ---------------------------------------- */
  for (const p of cfg.plants || []) {
    const m = num(hass, p.moisture);
    const dry = hass.states[p.dry]?.state === "on";
    if (m == null && !dry) continue;
    if (!dry && m > (p.threshold ?? 20)) continue;
    out.push({ lvl: 2, icon: "mdi:watering-can-outline", kind: "Plante",
      title: p.name, sub: m != null ? fmtNum(m, 0) + " % jordfukt" : "trenger vann",
      eid: p.moisture });
  }

  /* --- maskiner som er ferdige ---------------------------------------- */
  for (const mch of cfg.machines || []) {
    const running = hass.states[mch.running]?.state === "on";
    const doneSt = mch.done ? hass.states[mch.done] : null;
    if (doneSt?.state === "on")
      out.push({ lvl: 2, icon: mch.icon, kind: "Maskin",
        title: mch.name, sub: "ferdig — kan tømmes", eid: mch.running });
    else if (running) {
      const left = num(hass, mch.remaining);
      out.push({ lvl: 1, icon: mch.icon, kind: "Maskin", title: mch.name,
        sub: left ? fmtNum(left, 0) + " min igjen" : "kjører", eid: mch.running });
    }
  }

  /* --- enheter som har falt ut ----------------------------------------
     Bare EKTE enheter: en entitet uten device_id er som regel en mal- eller
     hjelpesensor (Nordpool, Elvia, statistikk), og at den står `unavailable`
     i noen minutter er støy, ikke noe Mats skal se på. De telles opp i én
     samlerad i stedet for å fylle siden med 50 rader. */
  const deadDev = new Map();
  let deadHelpers = 0;
  for (const it of model.addable) {
    const st = hass.states[it.eid];
    if (!st || st.state !== "unavailable") continue;
    const reg = hass.entities?.[it.eid];
    if (!reg?.device_id) { deadHelpers++; continue; }
    const key = reg.device_id;
    const label = deviceNameOf(hass, cfg, it.eid);
    if (!deadDev.has(key))
      deadDev.set(key, { label, area: it.area, since: st.last_changed, n: 0,
                         eid: it.eid });
    deadDev.get(key).n++;
  }
  for (const d of deadDev.values())
    out.push({ lvl: 1, icon: "mdi:lan-disconnect", kind: "Frakoblet",
      title: d.label,
      sub: [d.area, "borte i " + AGO(d.since),
            d.n > 1 ? d.n + " entiteter" : null].filter(Boolean).join(" · "),
      eid: d.eid, dim: true });
  if (deadHelpers)
    out.push({ lvl: 0, icon: "mdi:function-variant", kind: "Hjelpere",
      title: deadHelpers + " hjelpesensorer uten data",
      sub: "mal-/statistikksensorer uten egen enhet — vanligvis ufarlig",
      eid: null, dim: true });

  /* --- oppdateringer --------------------------------------------------- */
  for (const eid of Object.keys(hass.states)) {
    if (!eid.startsWith("update.")) continue;
    const st = hass.states[eid];
    if (st.state !== "on") continue;
    out.push({ lvl: 1, icon: "mdi:package-up", kind: "Oppdatering",
      title: nameOf(hass, cfg, eid),
      sub: st.attributes.latest_version
        ? `${st.attributes.installed_version || "?"} → ${st.attributes.latest_version}`
        : "ny versjon", eid, dim: true });
  }

  out.sort((a, b) => b.lvl - a.lvl || a.kind.localeCompare(b.kind, "nb"));
  return out;
}

/** Kort sammendrag til startskjermen og docken. */
export function attentionCount(ctx, model) {
  const all = collectIssues(ctx, model);
  return {
    total: all.filter((i) => i.lvl > 0).length,
    urgent: all.filter((i) => i.lvl === 3).length,
    action: all.filter((i) => i.lvl >= 2).length,
  };
}

function row(it) {
  return `
  <div class="arow lvl${it.lvl} ${it.dim ? "dim" : ""}"
       data-act="detail" data-e="${h(it.eid)}">
    <div class="ic">${ic(it.icon)}</div>
    <div class="txt">
      <div class="nm">${h(it.title)}</div>
      <div class="st">${h(it.sub)}</div>
    </div>
    <div class="kind">${h(it.kind)}</div>
  </div>`;
}

export function viewAttention(ctx, model) {
  const all = collectIssues(ctx, model);
  const urgent = all.filter((i) => i.lvl === 3);
  const soon = all.filter((i) => i.lvl === 2);
  /* nivå 1 er en blanding: en nettopp åpnet dør hører ikke hjemme under
     «frakoblet», så del på type og ikke bare på hastegrad */
  const offline = all.filter((i) => i.lvl === 1 && i.kind === "Frakoblet");
  const info = all.filter((i) => i.lvl === 1 && i.kind !== "Frakoblet");
  const minor = all.filter((i) => i.lvl === 0);
  /* lange lister foldes sammen, ellers må man scrolle forbi 50 rader */
  const expanded = ctx.store.data.attExpand === true;
  const CAP = 8;

  if (!all.some((i) => i.lvl > 0)) return `
    <div class="lbl">Trenger tilsyn</div>
    <div class="allgood">
      ${ic("mdi:check-circle-outline")}
      <div class="t">Alt er i orden</div>
      <div class="s">Ingen åpne dører, tomme batterier eller enheter som er borte.</div>
    </div>`;

  const sec = (title, list, cls, cap) => {
    if (!list.length) return "";
    const show = cap && !expanded ? list.slice(0, CAP) : list;
    const rest = list.length - show.length;
    return `
    <div class="lbl ${cls}" style="margin-top:22px">${h(title)}
      <span style="opacity:.5;font-weight:600">${list.length}</span></div>
    <div class="alist">${show.map(row).join("")}</div>
    ${rest > 0 ? `<div class="morebtn" data-act="attexpand">
      ${ic("mdi:chevron-down")}Vis ${rest} til</div>` : ""}
    ${cap && expanded && list.length > CAP ? `<div class="morebtn" data-act="attcollapse">
      ${ic("mdi:chevron-up")}Vis færre</div>` : ""}`;
  };

  return `
    <div class="lbl">Trenger tilsyn</div>
    <div class="sub" style="margin-top:4px">${
      urgent.length ? `${urgent.length} haster` :
      soon.length ? `${soon.length} bør ses på` : "ingenting som haster"}</div>
    ${sec("Haster", urgent, "crit")}
    ${sec("Bør ses på", soon, "")}
    ${sec("Verdt å vite", info, "")}
    ${sec("Frakoblede enheter", offline, "", true)}
    ${sec("Småtterier", minor, "")}`;
}
