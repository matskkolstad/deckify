/* Deckify — pages.js
 * To ekstra sider jeg la til fordi dataene allerede finnes i HA-en:
 *   Energi — effekt nå, strømpris, døgnkurve og hvilke apparater som trekker.
 *   Hus    — temperatur/fukt per rom, planter som vil ha vann, svake
 *            batterier, og vaskemaskin/oppvask med tid igjen.
 */
import {
  h, ICON, clamp, domainOf, nameOf, deviceNameOf, shortName, isDead, fmtNum, relTime,
} from "./core.js?v=2.2.1";
import { ic, stateText } from "./controls.js?v=2.2.1";
import { sparkline } from "./detail.js?v=2.2.1";

const num = (ctx, eid) => {
  const st = ctx.hass.states[eid];
  if (!st || isDead(st)) return null;
  const v = Number(st.state);
  return isFinite(v) ? v : null;
};

/* =========================================================== ENERGI */

export function viewEnergy(ctx, model, header) {
  const { hass } = ctx;
  const c = ctx.cfg;
  const now = num(ctx, c.powerSensor);
  const price = num(ctx, c.priceSensor);
  const next = num(ctx, c.priceNext);
  const low = num(ctx, c.priceLow);
  const high = num(ctx, c.priceHigh);
  const total = num(ctx, c.energySensor);

  /* kostnad per time ved dagens forbruk */
  const perHour = now != null && price != null ? (now / 1000) * price : null;
  const band = price != null && low != null && high != null && high > low
    ? (price - low) / (high - low) : null;
  const bandTxt = band == null ? "" : band < 0.34 ? "billig nå" : band < 0.67 ? "middels" : "dyrt nå";
  const bandCol = band == null ? "" : band < 0.34 ? "#3fbf76" : band < 0.67 ? "#f5b731" : "#f04438";

  /* apparater, sortert etter effekt */
  const apps = (c.powerDevices || []).map((e) => ({ eid: e, w: num(ctx, e) }))
    .filter((x) => x.w != null).sort((a, b) => b.w - a.w);
  const sumApps = apps.reduce((s, x) => s + x.w, 0);
  const rest = now != null ? Math.max(0, now - sumApps) : null;

  const appCards = apps.map((x) => {
    const st = hass.states[x.eid];
    const active = x.w > 5;
    const share = now ? clamp((x.w / now) * 100, 0, 100) : 0;
    return `
    <div class="card ${active ? "on" : ""}" data-act="detail" data-e="${h(x.eid)}">
      <div class="top"><div class="ic">${ic(ICON.bolt)}</div></div>
      <div class="bottom">
        <div class="nm">${h(deviceNameOf(hass, ctx.cfg, x.eid))}</div>
        <div class="st">${fmtNum(x.w, x.w < 10 ? 1 : 0)} W${active ? ` · ${fmtNum(share, 0)} %` : ""}</div>
        <div class="minibar"><i style="width:${share}%"></i></div>
      </div>
    </div>`;
  }).join("");

  const priceCells = (ctx.priceHistory || []).length ? priceChart(ctx) : "";

  return `
    ${header}
    <div class="statusrow">
      <div class="statustext">
        <div class="lbl">Energi</div>
        <div class="h1" style="margin-top:3px">${now != null ? fmtNum(now, 0) + " W nå" : "Ingen måling"}</div>
        <div class="sub" style="margin-top:4px">
          ${price != null ? `${fmtNum(price, 2)} kr/kWh` : ""}
          ${perHour != null ? ` · ${fmtNum(perHour, 2)} kr/time` : ""}
          ${bandTxt ? ` · <b style="color:${bandCol}">${bandTxt}</b>` : ""}
        </div>
      </div>
    </div>

    <div class="grid" style="grid-auto-rows:168px">
      <div class="card info ${band != null && band > 0.67 ? "alarm" : band != null && band < 0.34 ? "on" : ""}"
           data-act="detail" data-e="${h(c.priceSensor || "")}">
        <div class="lblrow"><div class="ic">${ic("mdi:cash")}</div><div class="lbl">Strømpris</div></div>
        <div class="big num">${price != null ? fmtNum(price, 2) : "–"}</div>
        <div class="st" style="margin-top:2px">kr/kWh${next != null ? ` · neste time ${fmtNum(next, 2)}` : ""}</div>
      </div>
      <div class="card info" data-act="detail" data-e="${h(c.powerSensor || "")}">
        <div class="lblrow"><div class="ic">${ic(ICON.bolt)}</div><div class="lbl">Effekt nå</div></div>
        <div class="big num">${now != null ? fmtNum(now, 0) : "–"}</div>
        <div class="st" style="margin-top:2px">watt${rest != null ? ` · ${fmtNum(rest, 0)} W umålt` : ""}</div>
      </div>
      <div class="card info">
        <div class="lblrow"><div class="ic">${ic("mdi:chart-box-outline")}</div><div class="lbl">Døgnet</div></div>
        <div class="big num">${low != null && high != null ? fmtNum(low, 2) : "–"}</div>
        <div class="st" style="margin-top:2px">
          lavest${high != null ? ` · høyest ${fmtNum(high, 2)}` : ""}</div>
      </div>
      <div class="card info" data-act="detail" data-e="${h(c.energySensor || "")}">
        <div class="lblrow"><div class="ic">${ic("mdi:counter")}</div><div class="lbl">Måler</div></div>
        <div class="big num" style="font-size:28px">${total != null ? fmtNum(total, 0) : "–"}</div>
        <div class="st" style="margin-top:2px">kWh totalt</div>
      </div>
    </div>

    ${priceCells ? `<div class="lbl" style="margin-top:24px">Strømpris siste døgn</div>${priceCells}` : ""}

    ${c.powerSensor ? `<div class="lbl" style="margin-top:22px">Forbruk siste 6 timer</div>
      <div class="lgroup" style="padding:16px">${sparkline(ctx, c.powerSensor)}</div>` : ""}

    ${appCards ? `<div class="lbl" style="margin-top:24px">Apparater</div>
      <div class="grid">${appCards}</div>` : ""}`;
}

function priceChart(ctx) {
  const d = ctx.priceHistory || [];
  if (d.length < 2) return "";
  const vals = d.map((p) => p.v);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo || 1;
  const cur = vals[vals.length - 1];
  const bars = d.map((p, i) => {
    const frac = (p.v - lo) / span;
    const col = frac < 0.34 ? "#3fbf76" : frac < 0.67 ? "#f5b731" : "#f04438";
    const hh = new Date(p.t).getHours();
    return `<div class="pbar" title="${hh}:00 · ${fmtNum(p.v, 2)} kr">
      <i style="height:${18 + frac * 72}%;background:${col}"></i>
      ${i % 4 === 0 ? `<span>${String(hh).padStart(2, "0")}</span>` : "<span></span>"}
    </div>`;
  }).join("");
  return `<div class="lgroup" style="padding:16px 14px 10px">
    <div class="pricebars">${bars}</div>
    <div class="sub" style="margin-top:8px;font-size:11.5px">
      Nå ${fmtNum(cur, 2)} kr/kWh · døgnets spenn ${fmtNum(lo, 2)}–${fmtNum(hi, 2)}</div>
  </div>`;
}

/* ============================================================== HUS */

export function viewHouse(ctx, model, header) {
  const { hass } = ctx;
  const c = ctx.cfg;

  /* --- klima per rom --- */
  const roomCards = model.rooms.map((r) => {
    const t = r.temp ? num(ctx, r.temp) : null;
    const hu = r.hum ? num(ctx, r.hum) : null;
    if (t == null && hu == null) return "";
    const warm = t != null ? clamp((t - 15) / 12, 0, 1) : 0.5;
    return `
    <div class="card" data-act="detail" data-e="${h(r.temp || r.hum)}">
      <div class="top">
        <div class="ic" style="background:${t == null ? "" :
          `rgba(${Math.round(90 + warm * 150)},${Math.round(130 - warm * 50)},${Math.round(220 - warm * 150)},.85)`};color:#fff">
          ${ic(r.icon)}</div>
      </div>
      <div class="bottom">
        <div class="nm">${h(r.name)}</div>
        <div class="st">${hu != null ? fmtNum(hu, 0) + " % fukt" : ""}</div>
      </div>
      ${t != null ? `<div class="corner" style="font-size:24px;font-weight:600">${fmtNum(t, 1)}°</div>` : ""}
    </div>`;
  }).join("");

  const out = c.outdoorTemp ? num(ctx, c.outdoorTemp) : null;
  const outHum = c.outdoorHum ? num(ctx, c.outdoorHum) : null;

  /* --- planter --- */
  const plants = (c.plants || []).map((p) => ({
    ...p, moist: num(ctx, p.moisture), temp: p.temp ? num(ctx, p.temp) : null,
    dryFlag: p.dry ? hass.states[p.dry]?.state === "on" : null,
  })).filter((p) => p.moist != null).sort((a, b) => a.moist - b.moist);

  const plantCards = plants.map((p) => {
    const dry = p.dryFlag || p.moist < (p.threshold ?? 25);
    const col = dry ? "#f0845c" : p.moist > 70 ? "#4aa3ff" : "#3fbf76";
    return `
    <div class="card ${dry ? "alarm" : ""}" data-act="detail" data-e="${h(p.moisture)}">
      <div class="top"><div class="ic" style="background:${col};color:#fff">
        ${ic(dry ? "mdi:watering-can-outline" : "mdi:sprout-outline")}</div></div>
      <div class="bottom">
        <div class="nm">${h(p.name)}</div>
        <div class="st">${dry ? "Vil ha vann" : "Jordfukt OK"}${p.temp != null ? ` · ${fmtNum(p.temp, 0)}°` : ""}</div>
        <div class="minibar"><i style="width:${clamp(p.moist, 0, 100)}%;background:${col}"></i></div>
      </div>
      <div class="corner">${fmtNum(p.moist, 0)} %</div>
    </div>`;
  }).join("");
  const thirsty = plants.filter((p) => p.dryFlag || p.moist < (p.threshold ?? 25)).length;

  /* --- maskiner --- */
  const machines = (c.machines || []).map((m) => {
    const st = hass.states[m.state];
    if (!st) return "";
    const running = hass.states[m.running]?.state === "on" ||
      !["off", "unavailable", "unknown", "idle"].includes(st.state);
    const prog = num(ctx, m.progress);
    const left = num(ctx, m.remaining);
    const phase = hass.states[m.phase]?.state;
    const prgTxt = running
      ? `${prog != null ? fmtNum(prog, 0) + " %" : ""}${left ? ` · ${fmtNum(left, 0)} min igjen` : ""}`
      : "Ikke i gang";
    return `
    <div class="card ${running ? "on" : ""}" data-act="detail" data-e="${h(m.power || m.state)}">
      <div class="top"><div class="ic">${ic(m.icon)}</div></div>
      <div class="bottom">
        <div class="nm">${h(m.name)}</div>
        <div class="st">${h(prgTxt)}${phase && phase !== "unknown" && running ? " · " + h(phase) : ""}</div>
        ${running && prog != null ? `<div class="minibar"><i style="width:${clamp(prog, 0, 100)}%"></i></div>` : ""}
      </div>
    </div>`;
  }).join("");

  /* --- batterier --- */
  const seen = new Set();
  const batts = [];
  for (const [eid, reg] of Object.entries(hass.entities || {})) {
    if (!eid.startsWith("sensor.")) continue;
    const st = hass.states[eid];
    if (!st || st.attributes?.device_class !== "battery") continue;
    if (c.exclude.has(eid) || (c.excludeRe && c.excludeRe.test(eid))) continue;
    if (c.excludePlatforms.has(reg.platform)) continue;
    const v = num(ctx, eid);
    if (v == null) continue;
    /* én rad per fysisk enhet. HA lager ofte doble batterisensorer, og
       mobilappen registrerer seg på nytt med ny device_id — så dedupliser
       på navn også, ikke bare på device_id. */
    const aid = reg.area_id || hass.devices?.[reg.device_id]?.area_id;
    const label = deviceNameOf(hass, ctx.cfg, eid);
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    batts.push({ eid, v, label, area: hass.areas?.[aid]?.name });
  }
  batts.sort((a, b) => a.v - b.v);
  const lowBatt = batts.filter((b) => b.v <= (c.batteryWarn ?? 25));
  const battRows = batts.slice(0, 18).map((b) => {
    const col = b.v <= 10 ? "#f04438" : b.v <= 25 ? "#f5b731" : "rgba(255,255,255,.3)";
    return `
    <div class="lrow" data-act="detail" data-e="${h(b.eid)}">
      <div class="ic">${ic(b.v <= 10 ? "mdi:battery-alert-variant-outline"
        : b.v <= 40 ? "mdi:battery-30" : "mdi:battery")}</div>
      <div class="txt">
        <div class="nm">${h(shortName(b.label, b.area))}</div>
        <div class="st">${h(b.area || "")}</div>
        <div class="minibar" style="height:8px;margin-top:6px">
          <i style="width:${clamp(b.v, 0, 100)}%;background:${col}"></i></div>
      </div>
      <span class="st" style="font-size:15px;font-weight:600">${fmtNum(b.v, 0)} %</span>
    </div>`;
  }).join("");

  return `
    ${header}
    <div class="statusrow">
      <div class="statustext">
        <div class="lbl">Huset</div>
        <div class="h1" style="margin-top:3px">${
          thirsty ? `${thirsty} ${thirsty === 1 ? "plante" : "planter"} vil ha vann`
          : lowBatt.length ? `${lowBatt.length} svake batterier`
          : "Alt ser bra ut"}</div>
        <div class="sub" style="margin-top:4px">
          ${out != null ? `Ute ${fmtNum(out, 1)}°` : ""}${outHum != null ? ` · ${fmtNum(outHum, 0)} % fukt` : ""}
          ${lowBatt.length && thirsty ? ` · ${lowBatt.length} svake batterier` : ""}
        </div>
      </div>
    </div>

    ${roomCards ? `<div class="lbl" style="margin-top:22px">Temperatur og fukt</div>
      <div class="grid">${roomCards}</div>` : ""}

    ${machines ? `<div class="lbl" style="margin-top:24px">Maskiner</div>
      <div class="grid">${machines}</div>` : ""}

    ${plantCards ? `<div class="lbl" style="margin-top:24px">Planter</div>
      <div class="grid">${plantCards}</div>` : ""}

    ${battRows ? `<div class="lbl" style="margin-top:24px">Batterier
        ${lowBatt.length ? `<span style="color:#ff9c93">· ${lowBatt.length} under ${c.batteryWarn ?? 25} %</span>` : ""}</div>
      <div class="battgrid">${battRows}</div>` : ""}`;
}
