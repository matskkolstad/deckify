/* Deckify — styles.js  (alt visuelt uttrykk) */

import { BASE } from "./core.js?v=2.3.0";

export const CSS = `
@font-face{font-family:'HDFigtree';font-style:normal;font-weight:300 800;font-display:swap;
  src:url(${BASE}fonts/figtree-latin.woff2) format('woff2');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2122,U+2212,U+FEFF,U+FFFD;}
@font-face{font-family:'HDFigtree';font-style:normal;font-weight:300 800;font-display:swap;
  src:url(${BASE}fonts/figtree-latin-ext.woff2) format('woff2');
  unicode-range:U+0100-02BA,U+1E00-1E9F,U+2020,U+20A0-20AB;}

:host{
  --r:22px; --r-sm:16px; --r-lg:28px;
  --accent:#f5b731;
  --cardon:#f2e8d0;
  --ink:#221d19;
  --ink-sub:rgba(34,29,25,.52);
  --off:rgba(255,255,255,.095);
  --off-hi:rgba(255,255,255,.155);
  --off-br:rgba(255,255,255,.13);
  --tx:#fff;
  --tx-sub:rgba(255,255,255,.62);
  --tx-dim:rgba(255,255,255,.42);
  --label:rgba(255,255,255,.52);
  --dock:rgba(28,18,26,.62);
  /* Fylt knapp («Skru alt av»). Må snus i lyse temaer, ellers er en hvit
     pille på kremhvit bakgrunn nesten usynlig. */
  --solid-bg:#fff;
  --solid-tx:#241d17;
  --sheet-bg:rgba(22,16,24,.97);
  --gap:14px;
  --pad:26px;
  display:block;
}
*,*::before,*::after{box-sizing:border-box}

/* HA setter størrelsen på <ha-svg-icon> INNE i <ha-icon>, ikke på ha-icon
   selv. Verten blir derfor så høy som linjehøyden (f.eks. 25.2 px rundt et
   22 px ikon), og glyfen havner et par piksler over midten i hver eneste
   sirkel og brikke. Det er nøyaktig det Mats så som «ikoner er ikke
   midtstilt». Her bindes verten til samme mål som ikonet. */
ha-icon{display:inline-flex;align-items:center;justify-content:center;
  width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);
  line-height:0;flex:0 0 auto;vertical-align:middle}

.hd{
  position:relative; width:100%; min-height:100vh;
  font-family:'HDFigtree',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  color:var(--tx); -webkit-font-smoothing:antialiased;
  overflow:hidden; user-select:none; -webkit-tap-highlight-color:transparent;
}
.hd.embedded{min-height:calc(100vh - 56px)}

#bg{position:absolute; inset:0; z-index:0; transition:background 2.4s ease}
#bg::after{content:'';position:absolute;inset:0;
  background:radial-gradient(90% 70% at 50% 110%, rgba(0,0,0,.35), transparent 70%)}

#shell{position:relative; z-index:1; display:flex; flex-direction:column;
  min-height:100vh; padding:var(--pad) var(--pad) 104px}
.hd.embedded #shell{min-height:calc(100vh - 56px)}

/* ------------------------------------------------------------ typografi */
.lbl{font-size:10.5px;letter-spacing:.15em;text-transform:uppercase;color:var(--label);font-weight:600}
.h1{font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.1}
.h2{font-size:22px;font-weight:600;letter-spacing:-.01em}
.sub{color:var(--tx-sub);font-size:13px}
.mono{font-variant-numeric:tabular-nums}

/* --------------------------------------------------------------- header */
header{display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap}
.clockwrap{flex:0 0 auto;min-width:230px}
.datestr{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--tx-sub);font-weight:600;margin-bottom:2px}
.clockrow{display:flex;align-items:center;gap:14px}
.clock{font-size:62px;line-height:1;font-weight:300;letter-spacing:-.035em;font-variant-numeric:tabular-nums}
.clock .ampm{font-size:26px;font-weight:400;margin-left:6px;opacity:.7}
.hdrbtns{display:flex;gap:8px;align-items:center}

.rbtn{position:relative;width:38px;height:38px;border-radius:50%;border:1px solid var(--off-br);
  background:var(--off);display:grid;place-items:center;cursor:pointer;color:var(--tx);
  backdrop-filter:blur(12px);transition:background .18s,transform .12s}
.rbtn:active{transform:scale(.93)}
.rbtn ha-icon{--mdc-icon-size:19px}
.rbtn .badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 5px;
  border-radius:9px;background:var(--accent);color:#231c10;font-size:11px;font-weight:700;
  display:grid;place-items:center;line-height:1}
.rbtn .badge.red{background:#f04438;color:#fff}

.hdrright{margin-left:auto;display:flex;align-items:center;gap:10px}
.wpill{display:flex;align-items:center;gap:9px;height:40px;padding:0 16px 0 13px;border-radius:21px;
  background:var(--off);border:1px solid var(--off-br);backdrop-filter:blur(12px);cursor:pointer;
  transition:background .18s}
.wpill:hover{background:var(--off-hi)}
.wpill ha-icon{--mdc-icon-size:21px;color:var(--accent)}
.wpill .t{font-size:17px;font-weight:600}
.wpill .c{font-size:12.5px;color:var(--tx-sub)}

.people{display:flex;align-items:center;padding-left:4px}
.avatar{width:36px;height:36px;border-radius:50%;margin-left:-9px;border:2px solid rgba(255,255,255,.18);
  display:grid;place-items:center;font-size:13px;font-weight:700;color:#2a2118;position:relative;
  background-size:cover;background-position:center}
.avatar .dot{position:absolute;bottom:-1px;right:-1px;width:11px;height:11px;border-radius:50%;
  border:2px solid rgba(20,12,18,.75);background:#3fbf76}
.avatar .dot.away{background:#8b8b8b}

/* ---------------------------------------------------------- hjemstatus */
.statusrow{display:flex;align-items:flex-end;gap:20px;margin-top:20px;flex-wrap:wrap}
.statustext{flex:1 1 auto;min-width:220px}
.allbtns{display:flex;gap:10px}
.abtn{display:flex;align-items:center;gap:8px;height:40px;padding:0 18px;border-radius:21px;cursor:pointer;
  font-size:14px;font-weight:600;border:1px solid var(--off-br);background:var(--off);color:var(--tx);
  backdrop-filter:blur(12px);transition:background .18s,transform .12s}
.abtn:active{transform:scale(.96)}
.abtn ha-icon{--mdc-icon-size:18px}
.abtn.solid{background:var(--solid-bg);color:var(--solid-tx);border-color:transparent}

/* -------------------------------------------------------------- scener */
.scenes{margin-top:22px}
.scenestrip{display:flex;gap:10px;flex-wrap:wrap;margin-top:9px}
.chip{display:flex;align-items:center;gap:8px;height:38px;padding:0 17px;border-radius:19px;
  background:var(--off);border:1px solid var(--off-br);backdrop-filter:blur(12px);
  font-size:13.5px;font-weight:500;cursor:pointer;color:var(--tx);white-space:nowrap;
  transition:background .18s,transform .12s;position:relative}
.chip:active{transform:scale(.95)}
.chip:hover{background:var(--off-hi)}
.chip ha-icon{--mdc-icon-size:17px;opacity:.75}
.chip.flash{background:var(--accent);color:#231c10;border-color:transparent}
.chip.dashed{border-style:dashed;opacity:.65}
.chip b{font-weight:650;font-variant-numeric:tabular-nums;color:var(--tx)}
.chip span{min-width:0;overflow:hidden;text-overflow:ellipsis}

/* ------------------------------------------------------- hurtigvalg
   Én redigerbar rad som har erstattet de gamle, hardkodede «Skru alt
   av/på»-knappene og sensorpillene. Alle brikkene er samme element, slik at
   dra-og-slipp, skjuling og enhetsvelgeren treffer dem uten særtilfeller. */
.quickrow{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-top:14px}
.quickrow.col{flex-direction:column;align-items:stretch;gap:8px;margin-top:0}
.quickrow.col .chip{justify-content:center}
.chip.qa{height:40px;font-weight:600;font-size:14px}
.hd .chip.qa.solid{background:var(--solid-bg);color:var(--solid-tx);
  border-color:transparent}
.hd .chip.qa.solid:hover{background:var(--solid-bg)}
.hd .chip.qa.solid ha-icon{opacity:1;color:var(--solid-tx)}
.hd .chip.qp{color:var(--tx-sub)}
.hd .chip.qp b{color:var(--tx)}
.hd .chip.qp.crit{border-color:#f04438;color:#ff9c93;background:rgba(240,68,56,.14)}
.hd .chip.qp.crit b{color:#ff9c93}
.hd .chip.q.on{background:var(--cardon);color:var(--ink);border-color:transparent}
.hd .chip.q.on b{color:var(--ink)}
.hd .chip.q.on ha-icon{opacity:1;color:var(--ink)}
.hd .chip.dead{opacity:.45}

/* --------------------------------------------------------------- grid */
.grid{display:grid;gap:var(--gap);margin-top:22px;
  grid-template-columns:repeat(auto-fill,minmax(min(100%,224px),1fr));
  grid-auto-rows:168px}
.grid.rooms{grid-auto-rows:168px}
.hd:not(.edit) .grid{grid-auto-flow:dense}
@media(max-width:1100px){.grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr));grid-auto-rows:146px}}
@media(max-width:760px){.grid{grid-template-columns:repeat(2,1fr);grid-auto-rows:138px}}

/* --------------------------------------------------------------- kort */
.card{position:relative;border-radius:var(--r);padding:16px 17px;overflow:hidden;cursor:pointer;
  background:var(--off);border:1px solid var(--off-br);backdrop-filter:blur(14px);
  display:flex;flex-direction:column;color:var(--tx);
  transition:background .25s,transform .14s,box-shadow .25s;
  grid-column:span 1;grid-row:span 1}
.card:active{transform:scale(.975)}
.card.on{background:var(--cardon);border-color:transparent;color:var(--ink);
  box-shadow:0 10px 30px -12px rgba(0,0,0,.45)}
.card.dead{opacity:.42}
.card.w2{grid-column:span 2}
.card.h2{grid-row:span 2}

.card .top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.ic{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;
  background:var(--off-hi);color:var(--tx);transition:background .25s,color .25s}
.ic ha-icon{--mdc-icon-size:22px}
.card.on .ic{background:var(--accent);color:#2a2008}
.pw{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;
  background:rgba(255,255,255,.10);color:var(--tx);cursor:pointer;transition:background .2s,transform .12s}
.pw:active{transform:scale(.88)}
.card.on .pw{background:rgba(0,0,0,.07);color:var(--ink)}
.pw ha-icon{--mdc-icon-size:19px}

.card .bottom{margin-top:auto;min-width:0}
.card .nm{font-size:16px;font-weight:600;letter-spacing:-.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card .st{font-size:13.5px;color:var(--tx-sub);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card.on .st{color:var(--ink-sub)}
.card.on .lbl{color:var(--ink-sub)}
.card .corner{position:absolute;right:17px;bottom:15px;font-size:13.5px;color:var(--tx-sub);font-variant-numeric:tabular-nums}
.card.on .corner{color:var(--ink-sub)}

.minibar{height:12px;border-radius:5px;background:rgba(255,255,255,.12);margin-top:8px;overflow:hidden}
.card.on .minibar{background:rgba(34,29,25,.10)}
.minibar i{display:block;height:100%;border-radius:5px;background:var(--accent);transition:width .25s}
.dots{display:flex;gap:5px;margin-top:7px}
.dots i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.22);display:block}
.card.on .dots i{background:rgba(34,29,25,.16)}
.dots i.lit{background:var(--accent)!important}

/* --- store kort (dobbel bredde) --- */
.card.big{padding:15px 16px}
.card.big .nm{font-size:17px}
.bar{position:relative;height:34px;border-radius:15px;background:rgba(255,255,255,.12);overflow:hidden;
  cursor:pointer;touch-action:none}
.card.on .bar{background:rgba(34,29,25,.10)}
.bar .fill{position:absolute;inset:0 auto 0 0;border-radius:15px;background:var(--accent);
  transition:width .18s ease}
/* En avslått enhet skal ikke ha en knallgul, full slider — avfukteren står
   på «Av» med målfuktighet 100 %, og kortet så ut som om den gikk for full
   maskin. Fyllet dempes når kortet ikke er på. */
.hd .card:not(.on) .bar .fill{background:var(--off-hi)}
.hd .card:not(.on) .bar .pctl{color:var(--tx-sub)}
.bar .knob{position:absolute;top:50%;transform:translate(-50%,-50%);width:4px;height:13px;border-radius:2px;
  background:rgba(0,0,0,.30)}
.bar .pctl{position:absolute;right:11px;top:50%;transform:translateY(-50%);font-size:12.5px;font-weight:700;
  color:var(--ink);font-variant-numeric:tabular-nums;mix-blend-mode:normal}
.swatches{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
.sw{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2px solid transparent;
  transition:transform .12s,border-color .15s}
.sw:active{transform:scale(.86)}
.sw.sel{border-color:rgba(0,0,0,.45)}
.ctbar{height:18px;border-radius:9px;margin-top:8px;cursor:pointer;touch-action:none;position:relative;
  background:linear-gradient(90deg,#ffab52,#ffd9a6,#fff3dc,#e8f1ff,#cfe3ff)}
.ctbar .knob2{position:absolute;top:-2px;width:8px;height:22px;border-radius:4px;background:#fff;
  box-shadow:0 1px 4px rgba(0,0,0,.4);transform:translateX(-50%)}

/* --- gardin --- */
.coverwrap{display:flex;gap:12px;align-items:stretch;margin-top:10px;flex:1}
.vbar{position:relative;flex:1;border-radius:var(--r-sm);background:rgba(255,255,255,.10);overflow:hidden;
  cursor:pointer;touch-action:none;min-height:56px}
.card.on .vbar{background:rgba(34,29,25,.10)}
.vbar .vfill{position:absolute;left:0;right:0;top:0;background:rgba(255,255,255,.22);transition:height .2s}
.card.on .vbar .vfill{background:rgba(34,29,25,.16)}
.vbar .vpct{position:absolute;right:9px;bottom:7px;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums}
.vbtns{display:flex;flex-direction:column;gap:6px}
.vbtns .pw{width:32px;height:32px}

/* --- klima-ring --- */
.climwrap{display:flex;gap:14px;align-items:center;margin-top:6px;flex:1}
.ring{width:104px;height:104px;flex:0 0 auto;position:relative}
.ring svg{width:100%;height:100%;transform:rotate(135deg)}
.ring .rtxt{position:absolute;inset:0;display:grid;place-items:center;font-size:26px;font-weight:700;
  font-variant-numeric:tabular-nums}
.climright{flex:1;min-width:0}
.modes{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.mbtn{height:28px;padding:0 13px;border-radius:14px;font-size:12.5px;font-weight:600;cursor:pointer;
  background:rgba(255,255,255,.10);color:var(--tx);display:grid;place-items:center}
.card.on .mbtn{background:rgba(34,29,25,.08);color:var(--ink)}
.mbtn.sel{background:#241d17;color:#fff}
.card.on .mbtn.sel{background:#241d17;color:#fff}
.plusminus{display:flex;gap:8px;margin-top:8px}
.pmbtn{flex:1;height:32px;border-radius:16px;display:grid;place-items:center;cursor:pointer;
  background:rgba(255,255,255,.10)}
.card.on .pmbtn{background:rgba(34,29,25,.07)}
.pmbtn ha-icon{--mdc-icon-size:18px}

/* --- media-kort --- */
.card.media{background:rgba(18,14,22,.55);border-color:rgba(255,255,255,.07);color:#fff}
.card.media .art{position:absolute;inset:0;background-size:cover;background-position:center;
  filter:blur(26px) saturate(1.5);opacity:.5;transform:scale(1.25)}
.card.media .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,6,12,.25),rgba(10,6,12,.82))}
.card.media .inner{position:relative;z-index:1;display:flex;flex-direction:column;height:100%}
.srcline{display:flex;align-items:center;gap:6px;font-size:10.5px;letter-spacing:.13em;font-weight:700;
  text-transform:uppercase;color:#1fd760}
.srcline.generic{color:var(--accent)}
.srcline ha-icon{--mdc-icon-size:14px}
.prog{height:4px;border-radius:2px;background:rgba(255,255,255,.22);overflow:hidden;margin-top:8px}
.prog i{display:block;height:100%;background:#fff;border-radius:2px}
.transport{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:8px}
.transport .tb{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;cursor:pointer;color:#fff}
.transport .tb.main{width:38px;height:38px;background:#fff;color:#1a1218}
.transport .tb ha-icon{--mdc-icon-size:18px}

/* --- sikkerhetskort / klimakort --- */
.card.info{cursor:pointer}
.card.info .lblrow{display:flex;align-items:center;gap:8px}
.card.info .lblrow .ic{width:34px;height:34px}
.card.info .lblrow .ic ha-icon{--mdc-icon-size:16px}
.card.info .big{font-size:28px;font-weight:600;line-height:1.12;letter-spacing:-.02em;margin-top:auto;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.card.info .big.num{font-size:40px;font-weight:600}
.card.alarm{background:rgba(240,68,56,.22);border-color:rgba(240,68,56,.4)}
.card.alarm .ic{background:#f04438;color:#fff}

/* ---------------------------------------------------------- listevisning */
.listcols{display:grid;gap:var(--gap);margin-top:22px;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));
  align-items:start}
.lgroup{border-radius:var(--r);background:var(--off);border:1px solid var(--off-br);backdrop-filter:blur(14px);
  overflow:hidden}
.lrow{display:flex;align-items:center;gap:12px;padding:11px 14px;cursor:pointer;
  border-top:1px solid rgba(255,255,255,.055)}
.lrow:first-child{border-top:none}
.lrow.head{padding:13px 14px;background:rgba(255,255,255,.04)}
.lrow .ic{width:32px;height:32px}
.lrow .ic ha-icon{--mdc-icon-size:17px}
.lrow .txt{flex:1;min-width:0}
.lrow .nm{font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lrow .st{font-size:12px;color:var(--tx-sub);margin-top:1px}
.lrow.head .nm{font-size:15.5px}
.sw-toggle{width:50px;height:29px;border-radius:15px;background:rgba(255,255,255,.17);position:relative;
  flex:0 0 auto;cursor:pointer;transition:background .2s}
.sw-toggle i{position:absolute;top:3px;left:3px;width:23px;height:23px;border-radius:50%;background:#fff;
  transition:left .2s cubic-bezier(.3,1.4,.5,1)}
.sw-toggle.on{background:var(--accent)}
.sw-toggle.on i{left:24px}
.lrow .chev{color:var(--tx-dim);--mdc-icon-size:18px;transition:transform .2s}
.lgroup.collapsed .lrow:not(.head){display:none}
.lgroup.collapsed .chev{transform:rotate(-90deg)}

/* --------------------------------------------------------- sidebar-layout */
.sbwrap{display:flex;gap:20px;align-items:flex-start;margin-top:0}
.sidebar{flex:0 0 268px;border-radius:var(--r-lg);background:rgba(255,255,255,.065);
  border:1px solid var(--off-br);backdrop-filter:blur(16px);padding:20px 16px;
  position:sticky;top:var(--pad);max-height:calc(100vh - 2*var(--pad) - 70px);overflow-y:auto}
.sidebar::-webkit-scrollbar{width:0}
.sbmain{flex:1;min-width:0}
.navlist{margin-top:14px;display:flex;flex-direction:column;gap:2px}
.navitem{display:flex;align-items:center;gap:11px;height:42px;padding:0 13px;border-radius:13px;
  cursor:pointer;font-size:14px;font-weight:600;color:var(--tx-sub);transition:background .16s,color .16s}
.navitem:hover{background:rgba(255,255,255,.06);color:var(--tx)}
.navitem.sel{background:#fff;color:#241d17}
.navitem ha-icon{--mdc-icon-size:18px}
.navitem .cnt{margin-left:auto;min-width:20px;height:20px;border-radius:10px;background:var(--accent);
  color:#241c0c;font-size:11.5px;font-weight:700;display:grid;place-items:center;padding:0 6px}
.navitem.sel .cnt{background:var(--accent)}
.divider{height:1px;background:rgba(255,255,255,.09);margin:14px 0}

/* ----------------------------------------------------------- fokuslayout */
.focuswrap{display:flex;flex-direction:column;min-height:72vh;justify-content:center}
.focusclock{font-size:clamp(72px,16vw,240px);font-weight:200;letter-spacing:-.055em;line-height:.92;
  font-variant-numeric:tabular-nums}
.focusmeta{display:flex;align-items:center;gap:16px;margin-top:14px;flex-wrap:wrap}
.pager{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:26px}
.pager .dot{width:7px;height:7px;border-radius:4px;background:rgba(255,255,255,.26);transition:width .2s}
.pager .dot.sel{width:22px;background:#fff}
.pbtn{width:32px;height:32px;border-radius:50%;background:var(--off);border:1px solid var(--off-br);
  display:grid;place-items:center;cursor:pointer;color:var(--tx)}

/* -------------------------------------------------------- rom-fanestripe */
.roomrail{display:flex;gap:9px;flex-wrap:wrap;margin-top:4px}
.roomtab{display:flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:20px;cursor:pointer;
  background:var(--off);border:1px solid var(--off-br);font-size:13.5px;font-weight:600;color:var(--tx);
  backdrop-filter:blur(12px);white-space:nowrap}
.roomtab.sel{background:var(--cardon);color:var(--ink);border-color:transparent}
.roomtab ha-icon{--mdc-icon-size:17px}
.roomtab .cnt{min-width:19px;height:19px;border-radius:10px;background:var(--accent);color:#241c0c;
  font-size:11px;font-weight:700;display:grid;place-items:center;padding:0 5px}

/* ----------------------------------------------------------------- dock */
#dock{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:40;
  display:flex;align-items:center;gap:4px;padding:6px;border-radius:26px;
  background:var(--dock);backdrop-filter:blur(22px) saturate(1.4);
  border:1px solid rgba(255,255,255,.10);box-shadow:0 16px 40px -14px rgba(0,0,0,.6)}
.dockitem{display:flex;align-items:center;gap:8px;height:40px;padding:0 17px;border-radius:20px;cursor:pointer;
  font-size:14px;font-weight:600;color:rgba(255,255,255,.7);transition:background .18s,color .18s}
.dockitem.sel{background:#fff;color:#241d17}
.dockitem ha-icon{--mdc-icon-size:18px}
@media(max-width:620px){.dockitem .t{display:none}.dockitem{padding:0 14px}}

#editfab{position:fixed;right:22px;bottom:18px;z-index:40;display:flex;align-items:center;gap:8px;
  height:46px;padding:0 20px;border-radius:23px;cursor:pointer;font-size:14px;font-weight:600;
  background:var(--dock);backdrop-filter:blur(22px);border:1px solid rgba(255,255,255,.10);color:var(--tx);
  box-shadow:0 16px 40px -14px rgba(0,0,0,.6)}
#editfab.active{background:#fff;color:#241d17;border-color:transparent}
@media(max-width:620px){#editfab{padding:0;width:46px;justify-content:center}#editfab .t{display:none}}

/* ------------------------------------------------------- redigeringsmodus */
.hd.edit .card,.hd.edit .chip{animation:jiggle .42s infinite}
.hd.edit .card:nth-child(2n){animation-delay:-.21s}
.hd.edit .chip:nth-child(2n){animation-delay:-.14s}
@keyframes jiggle{
  0%{transform:rotate(-.45deg) translate(0,0)}
  50%{transform:rotate(.45deg) translate(0,-1px)}
  100%{transform:rotate(-.45deg) translate(0,0)}
}
/* Redigeringsknappene lå på -8px, altså UTENFOR kortet — men .card har
   overflow:hidden, så minus-knappen ble klippet i to og var nesten umulig å
   treffe med finger. Scenebrikkene (.chip) klipper ikke, og der virket den
   derfor fint. Løsningen er å legge knappene INNENFOR kortkanten, én i hvert
   hjørne, og la brikkene beholde den gamle plasseringen. */
.rm{position:absolute;width:32px;height:32px;border-radius:50%;background:#f04438;
  color:#fff;display:grid;place-items:center;z-index:7;cursor:pointer;
  box-shadow:0 2px 10px rgba(0,0,0,.45)}
.rm::before{content:"";position:absolute;inset:-8px}  /* 48x48 px trefflate for finger */
.rm ha-icon{--mdc-icon-size:17px}
.chip .rm{top:-8px;left:-8px;width:28px;height:28px}
.chip .rm ha-icon{--mdc-icon-size:15px}
.card .rm{top:8px;left:8px}

.cog{position:absolute;width:30px;height:30px;border-radius:50%;
  background:rgba(255,255,255,.94);color:#241d17;display:grid;place-items:center;
  z-index:7;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.4)}
.cog::before{content:"";position:absolute;inset:-9px}
.cog ha-icon{--mdc-icon-size:17px}
.card .cog{top:8px;right:8px}
.chip .cog{display:none}            /* en brikke har ikke plass — og scener
                                       styres i HA/Hue, ikke per kort */
.lrow .cog{display:none}

.bigtog{position:absolute;right:8px;bottom:8px;width:30px;height:30px;border-radius:50%;background:#fff;
  color:#241d17;display:grid;place-items:center;z-index:7;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.4)}
.bigtog::before{content:"";position:absolute;inset:-8px}
.bigtog ha-icon{--mdc-icon-size:16px}

/* Hurtigknappen oppe til høyre ville ligget under tannhjulet, og et bomklikk
   der skrudde av lyset mens man ryddet. */
.hd.edit .card .pw{opacity:.2;pointer-events:none}
.hd.edit .card .corner{opacity:.35}
.card.tinted.on{box-shadow:0 10px 30px -12px rgba(0,0,0,.5)}
.card.ghost{opacity:.3}
.card.dragging{opacity:.9;transform:scale(1.04);z-index:10;box-shadow:0 20px 50px -10px rgba(0,0,0,.7)}
.edithint{font-size:13px;color:var(--tx-sub);margin-top:8px}
.addcard{border-style:dashed!important;border-width:1.5px!important;border-color:rgba(255,255,255,.25)!important;
  background:transparent!important;align-items:center;justify-content:center;animation:none!important}
.addcard .inner{display:flex;flex-direction:column;align-items:center;gap:7px;color:var(--tx-sub);font-size:13px;font-weight:600}
.addcard .ic{background:rgba(255,255,255,.1)}

/* -------------------------------------------------------------- overlays */
#overlay{position:fixed;inset:0;z-index:60;display:none}
#overlay.open{display:block}
.scrim{position:absolute;inset:0;background:rgba(8,4,10,.55);backdrop-filter:blur(7px);
  animation:fade .22s ease}
@keyframes fade{from{opacity:0}to{opacity:1}}
.sheet{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  width:min(640px,92vw);max-height:88vh;overflow-y:auto;border-radius:var(--r-lg);
  background:rgba(22,16,24,.93);border:1px solid rgba(255,255,255,.1);
  box-shadow:0 40px 90px -20px rgba(0,0,0,.8);padding:26px;animation:pop .24s cubic-bezier(.2,1.1,.4,1)}
.sheet.wide{width:min(1180px,96vw)}
.sheet.full{width:96vw;height:92vh;max-height:92vh;top:4vh;transform:translateX(-50%)}
@keyframes pop{from{opacity:0;transform:translate(-50%,-48%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.sheet::-webkit-scrollbar{width:6px}
.sheet::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:3px}
.sheethead{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.sheethead .h2{flex:1}
.xbtn{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.1);display:grid;place-items:center;
  cursor:pointer;color:var(--tx);flex:0 0 auto}
.xbtn ha-icon{--mdc-icon-size:19px}

/* vær-overlegg */
.wnow{display:flex;align-items:center;gap:16px;margin-bottom:6px}
.wnow .wi{--mdc-icon-size:54px;color:var(--accent)}
.wnow .deg{font-size:46px;font-weight:300;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.wtags{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px}
.wtag{height:30px;padding:0 13px;border-radius:15px;background:rgba(255,255,255,.08);font-size:12.5px;
  display:flex;align-items:center;gap:6px;color:var(--tx-sub)}
.hours{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-top:8px}
.hours::-webkit-scrollbar{height:0}
.hourcell{flex:0 0 auto;width:72px;border-radius:var(--r-sm);background:rgba(255,255,255,.055);
  border:1px solid rgba(255,255,255,.07);padding:10px 6px;text-align:center}
.hourcell .hh{font-size:11.5px;color:var(--tx-sub)}
.hourcell ha-icon{--mdc-icon-size:22px;margin:6px 0;color:rgba(255,255,255,.85)}
.hourcell .tt{font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}
.hourcell .pp{font-size:11px;color:#6fc3ff;font-weight:600;margin-top:2px}
.days{margin-top:8px}
.dayrow{display:grid;grid-template-columns:52px 28px 40px 1fr 40px;align-items:center;gap:10px;
  padding:7px 0;font-size:13.5px}
.dayrow ha-icon{--mdc-icon-size:19px;color:rgba(255,255,255,.8)}
.dayrow .pp{font-size:11px;color:#6fc3ff;font-weight:600}
.dayrow .lo{color:var(--tx-sub);text-align:right;font-variant-numeric:tabular-nums}
.dayrow .hi{font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.tband{height:6px;border-radius:3px;background:rgba(255,255,255,.1);position:relative;overflow:hidden}
.tband i{position:absolute;top:0;bottom:0;border-radius:3px;
  background:linear-gradient(90deg,#4aa3ff,#f5b731,#f57a31)}

/* kalender-overlegg */
.calgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.calhd{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--label);text-align:center;
  padding-bottom:6px;font-weight:700}
.calcell{min-height:84px;border-radius:11px;background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.06);padding:6px;overflow:hidden;cursor:pointer}
.calcell.dim{opacity:.32}
.calcell.sel{border-color:var(--accent);background:rgba(245,183,49,.08)}
.calcell .dn{font-size:13px;font-weight:600;margin-bottom:4px;display:inline-grid;place-items:center;
  width:22px;height:22px;border-radius:11px}
.calcell.today .dn{background:var(--accent);color:#241c0c}
.ev{font-size:10.5px;padding:2px 5px;border-radius:4px;margin-bottom:2px;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;border-left:2px solid}
.calside{border-radius:var(--r);background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);
  padding:18px;overflow-y:auto}
.agitem{border-radius:12px;padding:11px 13px;margin-bottom:9px;border-left:3px solid}
.agitem .t{font-size:14.5px;font-weight:600}
.agitem .m{font-size:12px;color:var(--tx-sub);margin-top:3px;display:flex;align-items:center;gap:5px}
.agitem .cal{font-size:11px;float:right;opacity:.75}
.callayout{display:grid;grid-template-columns:1fr 320px;gap:16px;height:calc(100% - 64px)}
@media(max-width:860px){.callayout{grid-template-columns:1fr}.calside{max-height:34vh}}

/* gjøremål */
.todoitem{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid rgba(255,255,255,.07)}
.todoitem:first-child{border-top:none}
.cbox{width:24px;height:24px;border-radius:12px;border:2px solid rgba(255,255,255,.3);cursor:pointer;
  flex:0 0 auto;display:grid;place-items:center}
.cbox.done{background:var(--accent);border-color:transparent;color:#241c0c}
.cbox ha-icon{--mdc-icon-size:15px}
.todoitem .t{flex:1;font-size:14.5px}
.todoitem.done .t{opacity:.45;text-decoration:line-through}
.todoitem .due{font-size:11.5px;color:var(--tx-sub)}
.todoitem.over .due{color:#ff7a6e;font-weight:600}

/* full spiller */
.player{display:flex;flex-direction:column;align-items:center;text-align:center}
.player .cover{width:min(300px,62vw);aspect-ratio:1;border-radius:26px;background-size:cover;
  background-position:center;box-shadow:0 30px 60px -20px rgba(0,0,0,.8);background-color:rgba(255,255,255,.06)}
.player .cover.ph{display:grid;place-items:center}
.player .cover.ph ha-icon{--mdc-icon-size:64px;color:rgba(255,255,255,.3)}
.player .ttl{font-size:27px;font-weight:700;margin-top:18px;letter-spacing:-.02em}
.player .art2{font-size:14.5px;color:var(--tx-sub);margin-top:4px}
.player .pbar{width:100%;margin-top:20px}
.player .ptimes{display:flex;justify-content:space-between;font-size:11.5px;color:var(--tx-sub);margin-top:6px;
  font-variant-numeric:tabular-nums}
.player .big-transport{display:flex;align-items:center;justify-content:center;gap:26px;margin-top:16px}
.player .big-transport .tb{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;cursor:pointer}
.player .big-transport .tb ha-icon{--mdc-icon-size:26px}
.player .big-transport .tb.main{width:66px;height:66px;background:#fff;color:#1a1218}
.player .big-transport .tb.main ha-icon{--mdc-icon-size:30px}
.player .row2{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:18px;gap:12px}
.volpill{display:flex;align-items:center;gap:10px;height:40px;padding:0 6px;border-radius:20px;
  background:rgba(255,255,255,.1)}
.volpill .vb{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;
  place-items:center;cursor:pointer}
.volpill .vt{font-size:13px;font-weight:600;min-width:40px;text-align:center;font-variant-numeric:tabular-nums}
.spk{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:18px}
.spkbtn{display:flex;align-items:center;gap:7px;height:36px;padding:0 15px;border-radius:18px;cursor:pointer;
  background:rgba(255,255,255,.1);font-size:13px;font-weight:600}
.spkbtn.sel{background:#fff;color:#1a1218}
.spkbtn ha-icon{--mdc-icon-size:16px}
.playerbg{position:absolute;inset:0;background-size:cover;background-position:center;filter:blur(60px) saturate(1.6);
  opacity:.55;transform:scale(1.3)}

/* innstillinger */
.setwrap{display:grid;grid-template-columns:210px 1fr;gap:18px;height:calc(100% - 66px)}
@media(max-width:800px){.setwrap{grid-template-columns:1fr}}
.setnav{display:flex;flex-direction:column;gap:3px}
.setpane{overflow-y:auto;padding-right:6px}
.setpane::-webkit-scrollbar{width:6px}
.setpane::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:3px}
.setsec{margin-bottom:26px}
.setsec h4{font-size:15px;font-weight:700;margin:0 0 3px}
.setsec p{font-size:12.5px;color:var(--tx-sub);margin:0 0 11px}
.swatchrow{display:flex;gap:9px;flex-wrap:wrap}
.cswatch{width:34px;height:34px;border-radius:50%;cursor:pointer;border:2px solid transparent;
  display:grid;place-items:center;transition:transform .12s}
.cswatch:active{transform:scale(.88)}
.cswatch.sel{border-color:#fff}
.cswatch ha-icon{--mdc-icon-size:16px;color:#241c0c}
.bgrow{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px}
.bgcell{height:72px;border-radius:14px;cursor:pointer;border:2px solid transparent;position:relative;overflow:hidden}
.bgcell.sel{border-color:#fff}
.bgcell .n{position:absolute;left:9px;bottom:7px;font-size:11.5px;font-weight:600;
  text-shadow:0 1px 4px rgba(0,0,0,.7)}
.optrow{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid rgba(255,255,255,.07)}
.optrow:first-of-type{border-top:none}
.optrow .ot{flex:1}
.optrow .ot b{display:block;font-size:14px;font-weight:600}
.optrow .ot span{font-size:12px;color:var(--tx-sub)}
.seg{display:flex;gap:4px;background:rgba(255,255,255,.07);padding:4px;border-radius:14px}
.seg .s{padding:7px 14px;border-radius:11px;font-size:13px;font-weight:600;cursor:pointer;color:var(--tx-sub)}
.seg .s.sel{background:#fff;color:#241d17}
.layoutcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
.lcard{border-radius:var(--r-sm);background:rgba(255,255,255,.05);border:2px solid transparent;padding:14px;
  cursor:pointer}
.lcard.sel{border-color:#fff;background:rgba(255,255,255,.1)}
.lcard b{font-size:14.5px;display:block}
.lcard span{font-size:12px;color:var(--tx-sub);display:block;margin-top:3px}
.lprev{height:58px;border-radius:9px;background:rgba(255,255,255,.07);margin-bottom:10px;padding:7px;
  display:flex;gap:4px}
.lprev i{background:rgba(255,255,255,.3);border-radius:3px;display:block}
.pickrow{display:flex;flex-wrap:wrap;gap:8px}
.hd.phone .pickrow{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;
  margin:0 calc(var(--pad) * -1);padding:2px var(--pad)}
.hd.phone .pickrow::-webkit-scrollbar{height:0}
.hd.phone .pickrow .pick{flex:0 0 auto}
.pick{display:flex;align-items:center;gap:7px;height:34px;padding:0 13px;border-radius:17px;cursor:pointer;
  background:rgba(255,255,255,.08);font-size:13px}
.pick.sel{background:#fff;color:#241d17}
.pick ha-icon{--mdc-icon-size:15px}
.btn{height:40px;padding:0 18px;border-radius:20px;background:rgba(255,255,255,.1);cursor:pointer;
  display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:var(--tx)}
.btn.primary{background:#fff;color:#241d17}
.btn.danger{background:rgba(240,68,56,.2);color:#ff9c93}
.btn ha-icon{--mdc-icon-size:17px}

/* bekreftelse */
.confirm{text-align:center}
.confirm .ic{width:62px;height:62px;margin:0 auto 16px;background:rgba(240,68,56,.18);color:#ff8d82}
.confirm .ic ha-icon{--mdc-icon-size:30px}
.confirm .btns{display:flex;gap:10px;justify-content:center;margin-top:20px}

/* skjermsparer */
/* ========================= SKJERMSPARER =========================
   Bakgrunnen settes fra JS til SAMME gradient som dashbordet, så et lyst
   tema gir en lys skjermsparer. Tidligere lå det en nesten svart plate her
   uansett tema. Et ::before-lag demper gradienten litt, så den store klokka
   fortsatt har nok kontrast. */
#saver{position:fixed;inset:0;z-index:90;display:none;align-items:center;
  justify-content:center;flex-direction:column;cursor:pointer;
  animation:fade .7s ease;overflow:hidden}
#saver.on{display:flex}
#saver::before{content:'';position:absolute;inset:0;
  background:radial-gradient(118% 88% at 50% 46%,transparent 30%,rgba(0,0,0,.45))}
.hd.light #saver::before{
  background:radial-gradient(118% 88% at 50% 46%,transparent 34%,rgba(44,34,22,.13))}

/* Klokka driver sakte rundt. Et veggnettbrett står på hele døgnet, og en
   helt statisk klokke brenner seg inn i panelet. */
#saver .saverinner{position:relative;z-index:1;display:flex;flex-direction:column;
  align-items:center;text-align:center;padding:0 var(--pad);
  animation:saverdrift 240s ease-in-out infinite alternate}
@keyframes saverdrift{
  0%{transform:translate(-1.6vw,-1.4vh)}
  50%{transform:translate(1.4vw,1.2vh)}
  100%{transform:translate(1.7vw,-1.1vh)}
}
#saver .sc{font-size:clamp(96px,19vw,280px);font-weight:200;letter-spacing:-.06em;
  line-height:.88;font-variant-numeric:tabular-nums;color:var(--tx)}
#saver .sd{font-size:clamp(14px,1.5vw,19px);letter-spacing:.2em;text-transform:uppercase;
  color:var(--tx-sub);margin-top:16px;font-weight:600}
#saver .sinfo{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:34px}
#saver .si{display:flex;align-items:center;gap:10px;height:44px;padding:0 20px;
  border-radius:22px;background:var(--off);border:1px solid var(--off-br);
  backdrop-filter:blur(14px);font-size:16px;font-weight:300;color:var(--tx-sub);
  max-width:min(92vw,430px)}
#saver .si ha-icon{--mdc-icon-size:22px;color:var(--accent)}
#saver .si span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#saver .si b{font-weight:650;color:var(--tx)}
#saver .salerts{display:flex;flex-direction:column;gap:9px;margin-top:22px;align-items:center}
#saver .sa{display:flex;align-items:center;gap:10px;height:42px;padding:0 20px;
  border-radius:21px;font-size:16px;font-weight:600;
  background:rgba(245,183,49,.18);border:1px solid rgba(245,183,49,.45);color:var(--tx)}
#saver .sa.crit{background:rgba(240,68,56,.26);border-color:#f04438;color:#fff}
#saver .sa ha-icon{--mdc-icon-size:21px}
#saver .shint{position:absolute;z-index:1;bottom:calc(26px + env(safe-area-inset-bottom,0px));
  display:flex;align-items:center;gap:9px;font-size:13px;color:var(--tx-sub);
  letter-spacing:.06em;opacity:.8}
#saver .shint ha-icon{--mdc-icon-size:18px}
.hd.phone #saver .sc{font-size:clamp(76px,24vw,180px)}
.hd.phone #saver .si{height:40px;font-size:14.5px;padding:0 15px}

/* tomt / feil */
.empty{padding:50px 20px;text-align:center;color:var(--tx-sub);font-size:14px}
.empty ha-icon{--mdc-icon-size:40px;opacity:.4;display:block;margin:0 auto 12px}

/* kamera */
.camwrap{border-radius:var(--r);overflow:hidden;background:#000;aspect-ratio:16/9;position:relative}
.camwrap img{width:100%;height:100%;object-fit:cover;display:block}
.camwrap::after{content:'';position:absolute;left:0;right:0;bottom:0;height:46%;
  background:linear-gradient(to top,rgba(0,0,0,.72),transparent);pointer-events:none}
/* Etiketten ligger oppå et svart kamerabilde og må være hvit UANSETT tema —
   den arvet --tx og ble mørk-på-svart i de lyse temaene. */
.hd .camwrap .cl{z-index:1;position:absolute;left:12px;bottom:10px;font-size:12.5px;
  font-weight:600;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.85)}

/* ------------------------------ dra-slider direkte på kortet ---------- */
.card.sld{touch-action:pan-y}
.card.sld .minibar.grab{cursor:ew-resize;height:14px}
.card.sliding{transform:none!important;box-shadow:0 0 0 2px var(--accent) inset}
.card .dragval{position:absolute;right:14px;top:14px;padding:5px 11px;border-radius:14px;
  background:rgba(0,0,0,.55);color:#fff;font-size:15px;font-weight:700;
  font-variant-numeric:tabular-nums;opacity:0;transition:opacity .14s;pointer-events:none;z-index:4}
.card .dragval.show{opacity:1}
.card.on .dragval{background:rgba(34,29,25,.72)}

/* ------------------------------ detaljpanel --------------------------- */
.dsec{margin-top:20px}
.dsec:first-of-type{margin-top:14px}
.dsec .lbl{margin-bottom:0}
.lblrow2{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:9px;gap:12px}
.dval{font-size:17px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--tx)}
.bar.tall{height:48px;border-radius:24px}
.bar.tall .fill{border-radius:24px}
.sheet .bar{background:rgba(255,255,255,.12)}
.sheet .bar .fill{background:var(--accent)}
.sheet .pick{height:38px}
.sheet .ring svg{transform:rotate(135deg)}
.sheet .pmbtn{background:rgba(255,255,255,.1)}

/* ------------------------------ prisgraf ------------------------------ */
.pricebars{display:flex;align-items:flex-end;gap:2px;height:118px}
.pbar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;
  height:100%;min-width:0}
.pbar i{display:block;width:100%;border-radius:3px 3px 0 0;min-height:4px}
.pbar span{font-size:9.5px;color:var(--tx-dim);margin-top:4px;height:12px;white-space:nowrap}

/* batterilista: flere kolonner, egne kort */
.battgrid{display:grid;gap:10px;margin-top:9px;
  grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))}
.battgrid .lrow{border:1px solid var(--off-br);border-radius:var(--r-sm);background:var(--off);
  backdrop-filter:blur(12px);border-top:1px solid var(--off-br)}

/* planter og batterier bruker .minibar med egne farger — ingen ekstra CSS */

/* ========================= STARTSKJERM ========================= */
.startHero{display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap}
.startClockCol{flex:1 1 420px;min-width:300px}
.startClock{font-size:clamp(78px,11vw,164px);font-weight:200;letter-spacing:-.055em;
  line-height:.92;margin-top:2px}
.startStatus{font-size:clamp(20px,2.4vw,30px);font-weight:600;letter-spacing:-.02em;margin-top:8px}
.startSide{flex:0 1 330px;display:flex;flex-direction:column;gap:14px;padding-top:6px}
.startWeather{display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:var(--r);
  background:var(--off);border:1px solid var(--off-br);backdrop-filter:blur(14px);cursor:pointer}
.startWeather .bigwi{--mdc-icon-size:52px;color:var(--accent)}
.startTemp{font-size:38px;font-weight:300;letter-spacing:-.03em;line-height:1;
  font-variant-numeric:tabular-nums}
.startChips{display:flex;flex-wrap:wrap;gap:9px}
.startChip{display:flex;align-items:center;gap:9px;height:42px;padding:0 16px;border-radius:21px;
  background:var(--off);border:1px solid var(--off-br);backdrop-filter:blur(12px);
  font-size:13.5px;font-weight:600;cursor:pointer;color:var(--tx)}
.startChip ha-icon{--mdc-icon-size:18px;opacity:.8}
.startChip.warn{border-color:rgba(240,68,56,.45);color:#ff9c93}
.startChip .pdot{width:22px;height:22px;border-radius:50%;background-size:cover;
  background-position:center;display:block}

.startGrid{display:grid;gap:var(--gap);margin-top:9px;
  grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));
  grid-auto-rows:206px}
.card.startRoom{padding:17px 18px}
.startRoomName{font-size:21px;font-weight:600;letter-spacing:-.015em;margin-top:12px}
.startRoomLights{font-size:13px;color:var(--tx-sub);margin-top:3px;display:flex;
  align-items:center;gap:9px;flex-wrap:wrap}
.card.on .startRoomLights{color:var(--ink-sub)}
.startRoomLights .dots{margin-top:0}
.startTopRight{display:flex;align-items:center;gap:11px}
.startRoomTemp{font-size:26px;font-weight:600;letter-spacing:-.02em;
  font-variant-numeric:tabular-nums;opacity:.92;line-height:1}
.sfacts{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto}
.sfact{display:inline-flex;align-items:center;gap:5px;height:27px;padding:0 10px;
  border-radius:14px;background:rgba(255,255,255,.1);font-size:12px;color:var(--tx-sub)}
.card.on .sfact{background:rgba(34,29,25,.09);color:var(--ink-sub)}
.sfact ha-icon{--mdc-icon-size:14px;opacity:.75}
.sfact b{font-weight:600;color:var(--tx)}
.card.on .sfact b{color:var(--ink)}
.sfact.warn{background:rgba(245,183,49,.2)}
.sfact.bad{background:rgba(240,68,56,.3);color:#fff}
.sfact.bad b{color:#fff}

@media(max-width:900px){.startSide{flex:1 1 100%}}
.hd.phone .startHero{gap:16px}
.hd.phone .startClock{font-size:clamp(62px,19vw,104px)}
.hd.phone .startStatus{font-size:19px}
.hd.phone .startClockCol{min-width:0;flex:1 1 100%}
.hd.phone .startGrid{grid-template-columns:1fr;grid-auto-rows:auto}
.hd.phone .card.startRoom{min-height:178px}
.hd.phone .startWeather{padding:13px 16px}
.hd.phone .startTemp{font-size:32px}

/* ===================== ENHETSVELGER (ny) ====================== */
/* Toppen er KLEBRIG og lå med hardkodet mørk farge. I et lyst tema ble den
   en diger mørk kloss oppå arket, og domenebrikkene (lys-på-lys) forsvant i
   den — det var dette Mats så som «søkefeltet blir altfor stort». Fargen må
   følge arket, og rekka med domener må rulle sideveis i stedet for å brekke
   ned i fem rader på en telefon. */
.pickhead{position:sticky;top:-2px;z-index:3;background:var(--sheet-bg);
  padding:2px 0 12px;margin:-2px 0 6px}
.pickfield{position:relative;display:flex;align-items:center}
.pickfield .pfic{position:absolute;left:16px;--mdc-icon-size:19px;
  color:var(--tx-dim);pointer-events:none}
.pickfield .pfx{position:absolute;right:7px;width:32px;height:32px;border-radius:50%;
  display:grid;place-items:center;cursor:pointer;color:var(--tx-sub);
  background:var(--off-hi)}
.pickfield .pfx ha-icon{--mdc-icon-size:16px}
#pickq,#searchq{width:100%;height:46px;border-radius:23px;
  border:1px solid var(--off-br);background:var(--off);color:var(--tx);
  padding:0 46px 0 44px;font-size:16px;font-family:inherit;outline:none}
#pickq:focus,#searchq:focus{border-color:var(--accent)}
#pickq::placeholder,#searchq::placeholder{color:var(--tx-dim)}
.pickcount{margin-top:9px;font-size:12px}
.pickrow{margin-top:10px}
.pickgrid{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))}
.pickrow2{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:var(--r-sm);
  background:var(--off);border:1px solid var(--off-br);cursor:pointer;
  transition:background .15s,border-color .15s}
.pickrow2:active{transform:scale(.98)}
.pickrow2.sel{background:rgba(245,183,49,.14);border-color:var(--accent)}
.pickrow2 .ic{width:32px;height:32px;flex:0 0 auto}
.pickrow2 .ic ha-icon{--mdc-icon-size:17px}
.pickrow2 .txt{flex:1;min-width:0}
.pickrow2 .nm{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis}
.pickrow2 .st{font-size:11.5px;color:var(--tx-sub);margin-top:1px}
.pickrow2 .okmark{--mdc-icon-size:19px;color:var(--accent);flex:0 0 auto}
.pickrow2 .addmark{--mdc-icon-size:19px;color:var(--tx-dim);flex:0 0 auto}
.pick b{font-variant-numeric:tabular-nums}

/* ===================== REDIGERING (forbedret) ================= */
/* Scroll må fungere mens man redigerer. touch-action:none her gjorde et
   langt dashbord umulig å bla i. Draget armeres av et langtrykk i JS i
   stedet, og dra-handtaket tar fatt med en gang. */
.hd.edit .card,.hd.edit .chip,.hd.edit .lrow{touch-action:pan-y}
.hd.edit .grip{touch-action:none}
/* Håndtak på kort: nede til venstre, med romslig trefflate. */
.card .grip{position:absolute;left:8px;bottom:8px;width:30px;height:30px;
  border-radius:50%;background:#fff;color:#241d17;display:none;
  align-items:center;justify-content:center;z-index:5;cursor:grab;
  box-shadow:0 3px 10px -2px rgba(0,0,0,.45)}
.card .grip ha-icon{--mdc-icon-size:19px}
.card .grip::after{content:"";position:absolute;inset:-9px;border-radius:50%}
.hd.edit .card .grip{display:flex}
.chip .grip{display:none}
/* En brikke i hurtigvalgsraden må kunne dras med FINGER også. Uten et
   håndtak returnerer _onPointerDown tidlig på touch, og raden var i praksis
   umulig å omrokere på mobil. Knappene legges inne i brikken: raden ruller
   sideveis på telefon, og alt utenfor kanten ville blitt klippet bort. */
.hd.edit .quickrow .chip:not(.dashed){padding-left:34px;padding-right:34px}
.quickrow .chip .rm{top:50%;left:3px;transform:translateY(-50%);
  width:26px;height:26px}
.quickrow .chip .rm ha-icon{--mdc-icon-size:15px}
.hd.edit .quickrow .chip .grip{display:flex;position:absolute;right:3px;left:auto;
  top:50%;bottom:auto;transform:translateY(-50%);width:26px;height:26px;
  border-radius:50%;background:var(--solid-bg);color:var(--solid-tx);
  align-items:center;justify-content:center;z-index:5;cursor:grab;
  touch-action:none}
.hd.edit .quickrow .chip .grip ha-icon{--mdc-icon-size:16px}
.hd.edit .quickrow .chip .grip::after{content:"";position:absolute;inset:-9px;
  border-radius:50%}
.hd.edit .quickrow{padding-top:6px}
.hd.phone.edit .quickrow:not(.col){padding-top:8px;padding-bottom:12px}
.card.armed,.chip.armed,.lrow.armed{transform:scale(1.03);
  box-shadow:0 10px 26px -8px rgba(0,0,0,.5)}
.hd.edit .card.dragging,.hd.edit .chip.dragging{animation:none!important}
.card.dropslot{outline:2px dashed rgba(255,255,255,.35);outline-offset:-3px;
  background:rgba(255,255,255,.04)!important}
#edittoolbar{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:45;
  display:flex;align-items:center;gap:6px;padding:7px;border-radius:26px;
  background:var(--dock);backdrop-filter:blur(22px) saturate(1.4);
  border:1px solid rgba(255,255,255,.12);box-shadow:0 16px 40px -14px rgba(0,0,0,.65)}
#edittoolbar .ebtn{display:flex;align-items:center;gap:8px;height:42px;padding:0 17px;
  border-radius:21px;cursor:pointer;font-size:14px;font-weight:600;
  background:rgba(255,255,255,.1);color:var(--tx);white-space:nowrap}
#edittoolbar .ebtn.done{background:#fff;color:#241d17}
#edittoolbar .ebtn ha-icon{--mdc-icon-size:18px}
.hd.phone #edittoolbar{left:var(--pad);right:var(--pad);transform:none;
  bottom:calc(12px + env(safe-area-inset-bottom,0px));justify-content:space-between}
.hd.phone #edittoolbar .ebtn{padding:0 13px;flex:1;justify-content:center}
.hd.phone #edittoolbar .ebtn span{display:none}
.hd.phone #edittoolbar .ebtn.done span{display:inline}

/* ========================= SØK ========================= */
.srow{display:flex;align-items:center;gap:13px;padding:11px 13px;border-radius:var(--r-sm);
  background:var(--off);border:1px solid var(--off-br);cursor:pointer;margin-bottom:7px}
.srow:active{transform:scale(.99)}
.srow.on{background:rgba(245,183,49,.13);border-color:rgba(245,183,49,.4)}
.srow.dead{opacity:.45}
.srow .ic{width:38px;height:38px;flex:0 0 auto}
.srow .ic ha-icon{--mdc-icon-size:19px}
.srow .txt{flex:1;min-width:0}
.srow .nm{font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis}
.srow .st{font-size:12px;color:var(--tx-sub);margin-top:1px;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.srow .chev{--mdc-icon-size:20px;color:var(--tx-dim);flex:0 0 auto}
.srow .sgo{flex:0 0 auto;height:34px;padding:0 16px;border-radius:17px;display:flex;
  align-items:center;background:rgba(255,255,255,.12);font-size:13px;font-weight:600}
.srow .sw{flex:0 0 auto;width:50px;height:30px;border-radius:15px;
  background:rgba(255,255,255,.16);position:relative;transition:background .18s}
.srow .sw i{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;
  background:#fff;transition:transform .18s}
.srow .sw.on{background:var(--accent)}
.srow .sw.on i{transform:translateX(20px)}
.srow.act{background:rgba(255,255,255,.07)}

/* ==================== TRENGER TILSYN ==================== */
.alist{display:grid;gap:8px;margin-top:9px;
  grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr))}
.arow{display:flex;align-items:center;gap:13px;padding:13px 15px;border-radius:var(--r-sm);
  background:var(--off);border:1px solid var(--off-br);cursor:pointer}
.arow:active{transform:scale(.99)}
.arow.dim{opacity:.6}
.arow.lvl3{background:rgba(240,68,56,.18);border-color:rgba(240,68,56,.5)}
.arow.lvl2{background:rgba(245,183,49,.13);border-color:rgba(245,183,49,.34)}
.arow .ic{width:40px;height:40px;flex:0 0 auto}
.arow .ic ha-icon{--mdc-icon-size:20px}
.arow.lvl3 .ic{background:rgba(240,68,56,.3)}
.arow.lvl3 .ic ha-icon{color:#ffb4ac}
.arow .txt{flex:1;min-width:0}
.arow .nm{font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis}
.arow .st{font-size:12px;color:var(--tx-sub);margin-top:2px;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.arow .kind{flex:0 0 auto;font-size:11px;font-weight:650;letter-spacing:.06em;
  text-transform:uppercase;color:var(--tx-dim);padding-left:6px}
.lbl.crit{color:#ff9c93}
.allgood{display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:64px 24px;border-radius:var(--r);background:var(--off);
  border:1px solid var(--off-br);margin-top:14px}
.allgood ha-icon{--mdc-icon-size:54px;color:#6ee7a8;margin-bottom:14px}
.allgood .t{font-size:22px;font-weight:600;letter-spacing:-.02em}
.allgood .s{font-size:13.5px;color:var(--tx-sub);margin-top:6px;max-width:380px}

/* merke på dock-ikonet */
.dockitem{position:relative}
.dockitem .badge{position:absolute;top:2px;right:calc(50% - 20px);min-width:18px;height:18px;
  border-radius:9px;background:var(--accent);color:#241d17;font-size:11px;font-weight:700;
  display:flex;align-items:center;justify-content:center;padding:0 5px;
  font-variant-numeric:tabular-nums}
.dockitem .badge.crit{background:#f04438;color:#fff}
.hd.phone .dockitem .badge{right:calc(50% - 17px)}

.morebtn{display:inline-flex;align-items:center;gap:7px;margin-top:10px;height:40px;
  padding:0 18px;border-radius:20px;background:var(--off);border:1px solid var(--off-br);
  font-size:13.5px;font-weight:600;cursor:pointer;color:var(--tx-sub)}
.morebtn ha-icon{--mdc-icon-size:18px}
.morebtn:active{transform:scale(.98)}
.arow[data-e=""],.arow:not([data-e]){cursor:default}

/* ===================== GRUPPER / SKILLELINJER ===================== */
.sep{display:flex;align-items:center;gap:14px;margin:26px 0 4px;
  font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  color:var(--tx-dim)}
.sep::after{content:"";flex:1;height:1px;background:var(--off-br)}
.sep.edit{gap:9px;text-transform:none;letter-spacing:0}
.sep.edit::after{display:none}
.septxt{flex:1;height:40px;border-radius:20px;border:1px dashed rgba(255,255,255,.22);
  background:rgba(255,255,255,.05);color:var(--tx);padding:0 16px;font-size:14px;
  font-weight:600;font-family:inherit;outline:none;letter-spacing:0;text-transform:none}
.septxt:focus{border-style:solid;border-color:var(--accent)}
.seprm{width:34px;height:34px;flex:0 0 auto;border-radius:50%;display:flex;
  align-items:center;justify-content:center;background:#f04438;color:#fff;cursor:pointer}
.seprm ha-icon{--mdc-icon-size:19px}
.addsep{display:inline-flex;align-items:center;gap:8px;margin-top:14px;height:40px;
  padding:0 18px;border-radius:20px;border:1px dashed var(--off-br);
  background:transparent;font-size:13.5px;font-weight:600;cursor:pointer;
  color:var(--tx-sub)}
.addsep ha-icon{--mdc-icon-size:18px}
.addsep:active{transform:scale(.98)}

/* ============ REDIGERING I LISTE-LAYOUT ============ */
.lrow.editing{cursor:grab}
.lrow.editing .rm{width:32px;height:32px;flex:0 0 auto;border-radius:50%;
  background:#f04438;color:#fff;display:flex;align-items:center;justify-content:center;
  margin-right:2px;cursor:pointer;position:relative}
.lrow.editing .rm::after{content:"";position:absolute;inset:-8px}  /* 48px trefflate */
.lrow.editing .grip{position:relative}
.lrow.editing .grip::after{content:"";position:absolute;inset:-10px}
.lrow.editing .rm ha-icon{--mdc-icon-size:17px}
.lrow.editing .grip{flex:0 0 auto;color:var(--tx-dim);padding-left:6px}
.lrow.editing .grip ha-icon{--mdc-icon-size:22px}
.lrow.dragging{opacity:.85;box-shadow:0 14px 34px -10px rgba(0,0,0,.6);
  background:rgba(255,255,255,.1);border-radius:var(--r-sm);z-index:20;position:relative}
.lgroup.edit .lrow.head{opacity:.75;cursor:default}
.lgroup.edit .lrow.head .chev{display:none}
.lrow.addrow{cursor:pointer;border:1px dashed var(--off-br);background:transparent;
  margin-top:6px;border-radius:var(--r-sm)}
.lrow.addrow .nm{color:var(--tx-sub)}
.lrows{display:block}

/* ========================= APPLE TV ========================= */
.atvnow{display:flex;gap:16px;align-items:center;padding:16px;border-radius:var(--r);
  background:var(--off);border:1px solid var(--off-br);margin-bottom:18px}
.atvnow.off{justify-content:center;color:var(--tx-sub);font-size:14px;gap:10px;padding:26px}
.atvnow.off ha-icon{--mdc-icon-size:22px}
.atvart{width:84px;height:84px;flex:0 0 auto;border-radius:12px;background-size:cover;
  background-position:center;background-color:rgba(255,255,255,.08)}
.atvart.ph{display:flex;align-items:center;justify-content:center}
.atvart.ph ha-icon{--mdc-icon-size:34px;opacity:.5}
.atvtxt{flex:1;min-width:0}
.atvtxt .app{font-size:11.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
  color:var(--tx-dim)}
.atvtxt .ttl{font-size:19px;font-weight:600;letter-spacing:-.015em;margin-top:3px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.atvtxt .sub{font-size:13px;color:var(--tx-sub);margin-top:2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.atvbar{height:4px;border-radius:2px;background:rgba(255,255,255,.16);margin-top:10px;
  overflow:hidden}
.atvbar i{display:block;height:100%;background:var(--accent);border-radius:2px}
.atvtime{display:flex;justify-content:space-between;font-size:11px;color:var(--tx-dim);
  margin-top:4px;font-variant-numeric:tabular-nums}

.atvpad{display:flex;gap:22px;align-items:center;justify-content:center;margin:4px 0 18px;
  flex-wrap:wrap}
.dpad{position:relative;width:216px;height:216px;border-radius:50%;
  background:rgba(255,255,255,.07);border:1px solid var(--off-br);flex:0 0 auto}
.dbtn{position:absolute;display:flex;align-items:center;justify-content:center;
  cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}
.dbtn ha-icon{--mdc-icon-size:30px;opacity:.85}
.dbtn:active{background:rgba(255,255,255,.12)}
.dbtn.up{top:0;left:25%;width:50%;height:33%;border-radius:50% 50% 0 0/100% 100% 0 0}
.dbtn.down{bottom:0;left:25%;width:50%;height:33%;border-radius:0 0 50% 50%/0 0 100% 100%}
.dbtn.left{left:0;top:25%;width:33%;height:50%;border-radius:50% 0 0 50%/100% 0 0 100%}
.dbtn.right{right:0;top:25%;width:33%;height:50%;border-radius:0 50% 50% 0/0 100% 100% 0}
.dbtn.mid{left:50%;top:50%;transform:translate(-50%,-50%);width:86px;height:86px;
  border-radius:50%;background:rgba(255,255,255,.14);font-size:15px;font-weight:700;
  letter-spacing:.04em}
.dbtn.mid:active{background:var(--accent);color:#241d17}
.atvside{display:flex;flex-direction:column;gap:10px}

.atvrow{display:flex;gap:10px;justify-content:center;margin-bottom:12px;flex-wrap:wrap}
.atvbtn{display:flex;align-items:center;justify-content:center;gap:8px;min-width:58px;
  height:54px;padding:0 18px;border-radius:27px;background:var(--off);
  border:1px solid var(--off-br);cursor:pointer;font-size:14px;font-weight:600;
  color:var(--tx);-webkit-tap-highlight-color:transparent}
.atvbtn ha-icon{--mdc-icon-size:23px}
.atvbtn:active{background:rgba(255,255,255,.16);transform:scale(.97)}
.atvbtn.big{background:#fff;color:#241d17;min-width:76px}
.atvbtn.big ha-icon{--mdc-icon-size:28px}

.appgrid{display:grid;gap:10px;margin-top:8px;
  grid-template-columns:repeat(auto-fill,minmax(96px,1fr))}
.appchip{display:flex;flex-direction:column;align-items:center;gap:7px;padding:12px 6px;
  border-radius:var(--r-sm);background:var(--off);border:1px solid var(--off-br);
  cursor:pointer;text-align:center}
.appchip:active{transform:scale(.96)}
.appicon{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;
  justify-content:center;color:#fff}
.appicon ha-icon{--mdc-icon-size:26px}
.appicon b{font-size:20px;font-weight:700}
.appchip span{font-size:11.5px;font-weight:600;line-height:1.25;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

.dlgrid{display:grid;gap:10px;margin-top:8px;
  grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr))}
.dlink{position:relative;height:104px;border-radius:var(--r-sm);overflow:hidden;
  background:var(--off);border:1px solid var(--off-br);cursor:pointer;
  background-size:cover;background-position:center}
.dlink:active{transform:scale(.98)}
.dlshade{position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(10,6,12,.15),rgba(10,6,12,.86))}
.dlbody{position:absolute;inset:auto 0 0 0;display:flex;align-items:center;gap:10px;
  padding:11px 13px}
.dlapp{width:34px;height:34px;flex:0 0 auto;border-radius:9px;display:flex;
  align-items:center;justify-content:center;background:rgba(255,255,255,.16);color:#fff}
.dlapp ha-icon{--mdc-icon-size:19px}
.dltxt{min-width:0}
.dltxt .nm{font-size:14px;font-weight:650;color:#fff;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.dltxt .st{font-size:11.5px;color:rgba(255,255,255,.72);margin-top:1px}
.atvhint{display:flex;gap:12px;padding:15px;border-radius:var(--r-sm);
  background:var(--off);border:1px dashed var(--off-br);font-size:13px;
  color:var(--tx-sub);line-height:1.5;margin-top:8px}
.atvhint ha-icon{--mdc-icon-size:21px;flex:0 0 auto;margin-top:1px}
.atvhint code{background:rgba(255,255,255,.1);padding:1px 6px;border-radius:5px;font-size:12px}

.hd.phone .dpad{width:min(74vw,250px);height:min(74vw,250px)}
.hd.phone .atvpad{gap:14px}
.hd.phone .atvside{flex-direction:row;flex-wrap:wrap;justify-content:center}
.hd.phone .atvart{width:66px;height:66px}

/* varseltekst (toast) */
#toast{position:fixed;left:50%;transform:translateX(-50%);bottom:84px;z-index:70;pointer-events:none}
.toastbox{background:rgba(255,255,255,.96);color:#241d17;font-size:13.5px;font-weight:600;
  padding:11px 20px;border-radius:22px;box-shadow:0 14px 40px -12px rgba(0,0,0,.6);
  animation:pop .2s ease;max-width:min(90vw,460px);text-align:center}

/* ============================= MOBIL ============================= */
.hd.phone{--pad:16px;--gap:11px;--r:20px}
.hd.phone #shell{padding:calc(var(--pad) + env(safe-area-inset-top,0px)) var(--pad)
  calc(96px + env(safe-area-inset-bottom,0px))}
.hd.phone header{flex-direction:column;gap:12px;align-items:stretch}
.hd.phone .clockwrap{min-width:0}
.hd.phone .clock{font-size:46px}
.hd.phone .datestr{font-size:10.5px;letter-spacing:.14em}
.hd.phone .hdrright{margin-left:0;justify-content:space-between;width:100%}
.hd.phone .wpill{height:38px;padding:0 14px 0 11px;flex:1;min-width:0}
.hd.phone .wpill .c{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hd.phone .statusrow{flex-direction:column;align-items:stretch;gap:14px;margin-top:18px}
.hd.phone .h1{font-size:25px}
.hd.phone .allbtns{gap:9px}
.hd.phone .abtn{flex:1;justify-content:center;height:44px;font-size:14.5px}
/* scenestripe skal rulle sidelengs, ikke brekke i flere rader */
.hd.phone .scenestrip{flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x proximity;
  padding:2px 0 6px;margin:0 calc(var(--pad) * -1);padding-left:var(--pad);padding-right:var(--pad)}
.hd.phone .scenestrip::-webkit-scrollbar{height:0}
.hd.phone .chip{scroll-snap-align:start;height:40px}
.hd.phone .roomrail{flex-wrap:nowrap;overflow-x:auto;margin:0 calc(var(--pad) * -1);
  padding:2px var(--pad) 6px}
.hd.phone .roomrail::-webkit-scrollbar{height:0}
.hd.phone .roomtab{flex:0 0 auto;height:42px}
.hd.phone .grid,.hd.phone .grid.rooms{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:146px}
.hd.phone .card{padding:13px 14px}
.hd.phone .card .nm{font-size:15px}
.hd.phone .ic{width:38px;height:38px}
.hd.phone .ic ha-icon{--mdc-icon-size:20px}
.hd.phone .card.w2{grid-column:span 2}
.hd.phone .listcols{grid-template-columns:1fr}
/* sidekolonne har ingen plass på mobil — faller tilbake til rutenett */
.hd.phone .sbwrap{display:block}
.hd.phone .sidebar{display:none}
/* dock: bred bunnlinje med trygg sone */
.hd.phone #dock{left:var(--pad);right:var(--pad);transform:none;width:auto;
  bottom:calc(12px + env(safe-area-inset-bottom,0px));justify-content:space-around;
  padding:7px 6px;border-radius:24px}
.hd.phone .dockitem{flex:1;justify-content:center;height:44px;padding:0}
.hd.phone .dockitem .t{display:none}
.hd.phone .dockitem ha-icon{--mdc-icon-size:21px}
.hd.phone #editfab{right:var(--pad);bottom:calc(72px + env(safe-area-inset-bottom,0px));
  width:48px;height:48px;padding:0;justify-content:center;border-radius:24px}
.hd.phone #editfab .t{display:none}
/* overlegg som bunnark */
.hd.phone .sheet,.hd.phone .sheet.wide,.hd.phone .sheet.full{
  width:100%;left:0;top:auto;bottom:0;transform:none;max-height:92vh;height:auto;
  border-radius:26px 26px 0 0;padding:20px 18px calc(24px + env(safe-area-inset-bottom,0px));
  animation:slideup .26s cubic-bezier(.2,.9,.3,1)}
@keyframes slideup{from{transform:translateY(14%);opacity:.6}to{transform:translateY(0);opacity:1}}
.hd.phone .sheet::before{content:'';display:block;width:38px;height:4px;border-radius:2px;
  background:rgba(255,255,255,.22);margin:0 auto 14px}
.hd.phone .callayout{grid-template-columns:1fr;height:auto}
.hd.phone .calcell{min-height:52px;padding:4px;border-radius:9px}
.hd.phone .calcell .dn{font-size:11.5px;width:19px;height:19px}
.hd.phone .ev{font-size:9px;padding:1px 3px}
.hd.phone .calside{max-height:none;padding:14px}
.hd.phone .setwrap{grid-template-columns:1fr;height:auto}
.hd.phone .setnav{flex-direction:row;overflow-x:auto;gap:6px;padding-bottom:8px}
.hd.phone .setnav::-webkit-scrollbar{height:0}
.hd.phone .setnav .navitem{flex:0 0 auto;height:38px;border-radius:19px}
.hd.phone .player .cover{width:min(230px,58vw)}
.hd.phone .player .ttl{font-size:22px;margin-top:14px}
.hd.phone .player .big-transport{gap:20px;margin-top:12px}
.hd.phone .focusclock{font-size:clamp(56px,20vw,120px)}
.hd.phone .hours{margin:0 calc(var(--pad) * -1);padding:0 var(--pad) 6px}
.hd.phone .sensorrow,
.hd.phone .quickrow:not(.col){flex-wrap:nowrap;overflow-x:auto;
  scroll-snap-type:x proximity;margin:0 calc(var(--pad) * -1);
  padding:2px var(--pad) 8px}
.hd.phone .quickrow:not(.col)::-webkit-scrollbar{height:0}
.hd.phone .quickrow:not(.col) .chip{flex:0 0 auto;scroll-snap-align:start}
.hd.phone .sensorrow::-webkit-scrollbar{height:0}
.hd.phone .sensorpill{flex:0 0 auto}
.hd.phone .pricebars{height:92px}
.hd.phone .pbar span{font-size:8.5px}
.hd.phone .dsec{margin-top:16px}
.hd.phone .card .dragval{right:10px;top:10px;font-size:14px}
.hd.phone #toast{bottom:calc(80px + env(safe-area-inset-bottom,0px))}
@media(hover:none){.chip:hover{background:var(--off)}.navitem:hover{background:transparent;color:var(--tx-sub)}}

/* sensorstriper */
.sensorrow{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}
.sensorpill{display:flex;align-items:center;gap:7px;height:34px;padding:0 13px;border-radius:17px;
  background:var(--off);border:1px solid var(--off-br);font-size:13px;color:var(--tx-sub)}
.sensorpill ha-icon{--mdc-icon-size:16px;opacity:.75}
.sensorpill b{color:var(--tx);font-weight:600;font-variant-numeric:tabular-nums}

/* ------------------------------------------------- lyse temaer
   Hele paletten er stemt for mørk bakgrunn med hvit tekst. Et lyst tema må
   derfor snu BÅDE tekstfargene og alle de halvgjennomsiktige hvite flatene
   (slidere, brikker, striper) — en hvit 7 %-flate på hvit bakgrunn er
   usynlig, og hvit tekst er uleselig. Alt som er stemt for mørkt har en
   .light-motpart her. */
.hd.light{
  /* Flatene var så svake at kortene fløt sammen med bakgrunnen, og
     sekundærteksten lå rundt 3:1 mot underlaget. Begge deler er hevet. */
  --off:rgba(22,18,15,.075);
  --off-hi:rgba(22,18,15,.13);
  --off-br:rgba(22,18,15,.16);
  --tx:#17130f;
  --tx-sub:rgba(23,19,15,.66);
  --tx-dim:rgba(23,19,15,.46);
  --label:rgba(23,19,15,.56);
  --dock:rgba(255,255,255,.86);
  --solid-bg:#241d17;
  --solid-tx:#fff;
  --sheet-bg:rgba(252,250,246,.98);
}
.hd.light #bg::after{
  background:radial-gradient(90% 70% at 50% 110%, rgba(40,30,20,.10), transparent 70%)}
.hd.light .card{box-shadow:0 2px 6px -2px rgba(30,22,14,.12)}
.hd.light .camwrap::after{height:40%}
.hd.light .card.on{box-shadow:0 12px 28px -14px rgba(40,30,20,.45);
  border:1px solid rgba(20,16,12,.10)}
.hd.light .card.dead{opacity:.5}

/* flater som var hvite-på-mørkt */
.hd.light .minibar,
.hd.light .bar,
.hd.light .vbar,
.hd.light .prog,
.hd.light .tband,
.hd.light .sw-toggle{background:rgba(22,18,15,.12)}
.hd.light .dots i{background:rgba(22,18,15,.20)}
.hd.light .pw{background:rgba(22,18,15,.08)}
.hd.light .card.on .pw{background:rgba(0,0,0,.08)}
.hd.light .card.on .minibar{background:rgba(34,29,25,.14)}
.hd.light .card.on .dots i{background:rgba(34,29,25,.20)}
.hd.light .card.on .bar{background:rgba(34,29,25,.12)}
.hd.light .navitem:hover{background:rgba(22,18,15,.06)}
.hd.light .navitem.sel{background:#241d17;color:#fff}
.hd.light .sensorpill,
.hd.light .chip{background:rgba(22,18,15,.055);border-color:rgba(22,18,15,.14)}
.hd.light .chip:hover{background:rgba(22,18,15,.10)}
.hd.light .chip ha-icon{opacity:.7}
.hd.light .chip.qa.solid ha-icon{opacity:1}
.hd.light .btn{background:rgba(22,18,15,.08);color:var(--tx)}
.hd.light .pick{background:rgba(22,18,15,.055);border-color:rgba(22,18,15,.14)}
.hd.light .pick.sel{background:#241d17;color:#fff;border-color:transparent}
.hd.light .pick.sel ha-icon{color:#fff}
.hd.light .optrow{border-top-color:rgba(22,18,15,.10)}
.hd.light .sizepick,
.hd.light .pickrow2{background:rgba(22,18,15,.05);border-color:rgba(22,18,15,.10)}
.hd.light .sizepick .box{background:rgba(22,18,15,.26)}
.hd.light .swrow .sw{border-color:rgba(22,18,15,.20)}
.hd.light #pickq,
.hd.light .txtin,
.hd.light .septxt{background:rgba(22,18,15,.05);border-color:rgba(22,18,15,.14);color:var(--tx)}

/* overlegg og menylinje */
.hd.light .sheet{background:var(--sheet-bg);border-color:rgba(22,18,15,.14);
  box-shadow:0 40px 90px -20px rgba(40,30,20,.35)}
.hd.light .scrim{background:rgba(40,32,24,.32)}
.hd.light #dock{border-color:rgba(22,18,15,.10);
  box-shadow:0 14px 40px -16px rgba(40,30,20,.35)}
.hd.light #dock{background:rgba(255,255,255,.93)}
.hd.light .dockitem{color:rgba(28,24,21,.62)}
.hd.light .dockitem.sel{background:#241d17;color:#fff}
.hd.light #editfab{background:#241d17;color:#fff}
.hd.light #edittoolbar{background:rgba(252,250,246,.95);border-color:rgba(22,18,15,.10)}
.hd.light .ebtn{background:rgba(22,18,15,.07)}

/* redigeringsknapper: hvit sirkel forsvinner mot lys bakgrunn */
.hd.light .cog{background:#241d17;color:#fff}
.hd.light .bigtog{background:#241d17;color:#fff}
.hd.light .card .grip{background:rgba(22,18,15,.10);color:var(--tx-sub)}
.hd.light .empty{color:var(--tx-sub)}


/* ------------------------------------------------- høy kontrast
   «Det er ikke godt nok skille» — bakgrunnene er myke gradienter, og en
   kortflate på 7 % hvitt forsvinner i dem. Denne bryteren (Innstillinger →
   Utseende → Lesbarhet) gjør flatene tettere, kantene synlige og
   sekundærteksten sterkere, uten å endre formspråket. */
.hd.hicon{
  --off:rgba(255,255,255,.135);
  --off-hi:rgba(255,255,255,.20);
  --off-br:rgba(255,255,255,.22);
  --tx-sub:rgba(255,255,255,.72);
  --tx-dim:rgba(255,255,255,.52);
  --label:rgba(255,255,255,.62);
}
.hd.hicon.light{
  --off:rgba(22,18,15,.105);
  --off-hi:rgba(22,18,15,.17);
  --off-br:rgba(22,18,15,.26);
  --tx-sub:rgba(23,19,15,.76);
  --tx-dim:rgba(23,19,15,.58);
  --label:rgba(23,19,15,.68);
}
.hd.hicon .card{box-shadow:0 6px 18px -10px rgba(0,0,0,.6)}
.hd.hicon.light .card{box-shadow:0 4px 12px -4px rgba(30,22,14,.20)}
.hd.hicon .card .st,.hd.hicon .srow .st,.hd.hicon .pickrow2 .st{opacity:1}
.hd.hicon #bg::after{background:radial-gradient(92% 74% at 50% 108%,
  rgba(0,0,0,.50),transparent 72%)}
.hd.hicon.light #bg::after{background:radial-gradient(92% 74% at 50% 108%,
  rgba(40,30,20,.16),transparent 72%)}
.hd.hicon .minibar,.hd.hicon .bar,.hd.hicon .vbar,.hd.hicon .prog{
  background:rgba(255,255,255,.22)}
.hd.hicon.light .minibar,.hd.hicon.light .bar,.hd.hicon.light .vbar,
.hd.hicon.light .prog{background:rgba(22,18,15,.20)}

/* ------------------------------------------------- kortinnstillinger */
.cardcfgsheet{width:min(560px,94vw);max-height:88vh}
.cardcfghead{display:flex;align-items:center;gap:13px;padding:0 0 18px;
  border-bottom:2px solid rgba(255,255,255,.1);margin-bottom:20px}
.cardcfghead .ic{width:46px;height:46px}
.cardcfghead .ic ha-icon{--mdc-icon-size:24px}
.cardcfghead .txt{min-width:0}
.cardcfghead b{display:block;font-size:17px;font-weight:700;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.cardcfghead span{font-size:12px;color:var(--tx-sub);font-family:ui-monospace,monospace}

.sizerow{display:flex;gap:10px;flex-wrap:wrap}
.sizepick{display:flex;flex-direction:column;align-items:center;gap:7px;
  padding:12px 10px 10px;border-radius:var(--r-sm);min-width:76px;cursor:pointer;
  background:var(--off);border:1px solid var(--off-br);
  transition:background .15s,border-color .15s}
.sizepick:active{transform:scale(.97)}
.sizepick.sel{background:rgba(245,183,49,.15);border-color:var(--accent)}
.sizepick span{font-size:11.5px;color:var(--tx-sub)}
.sizepick.sel span{color:var(--tx)}
.sizepick .box{display:block;background:rgba(255,255,255,.26);border-radius:4px}
.sizepick.sel .box{background:var(--accent)}
.sizepick .box.s1x1{width:20px;height:20px}
.sizepick .box.s2x1{width:40px;height:20px}
.sizepick .box.s1x2{width:20px;height:40px}
.sizepick .box.s2x2{width:40px;height:40px}
.sizerow .sizepick{justify-content:flex-end}

.swrow{display:flex;gap:9px;flex-wrap:wrap}
.swrow .sw{width:36px;height:36px;border-radius:50%;cursor:pointer;
  border:2px solid rgba(255,255,255,.18);display:grid;place-items:center;color:var(--tx-dim)}
.swrow .sw ha-icon{--mdc-icon-size:17px}
.swrow .sw.sel{border-color:var(--accent);box-shadow:0 0 0 3px rgba(245,183,49,.28)}

.txtin{width:100%;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.07);color:var(--tx);padding:0 14px;font-size:14.5px;
  font-family:inherit;outline:none}
.txtin:focus{border-color:var(--accent)}
.btnrow{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:9px}
.cardcfg .optrow{cursor:pointer}
`;
