/* =====================================================================
   I, the Jury Live — the screens
   ---------------------------------------------------------------------
   scenario.js  what happens, and when
   engine.js    the exchange and everyone trading on it
   sim.js       this file: the clock, the screens, and the person playing

   One player, no account. What they do is kept in this browser as a list
   of actions, each stamped with the step it happened on; a reload replays
   the list and carries on where it left off, paused. Nothing is sent
   anywhere and nothing is tracked.

   URL flags, for whoever is presenting:
     ?reset        start again from nothing
     ?speed=2      start at a speed (0.5, 1, 2 or 4; up to 60 works, for testing)
     ?jump=300     start paused at that second, everything before it played out
     ?autoplay     start the clock as the page opens
     #m=<id>       open on a market
   ===================================================================== */
(() => {
"use strict";

const SCN = SCENARIO, M = SimEngine.compile(SCN), LEN = M.len, DT = SimEngine.DT, STEPS = M.STEPS;
const START = SCN.credits * 100;
const SPEEDS = [.5, 1, 2, 4];
const flags = new URLSearchParams(location.search);
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const WEEK = 7 * M.cal.rate;

/* ============ helpers ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const MINUS = "−";
const num = n => Math.round(n).toLocaleString("en-US");
const usd = c => (Math.round(c / 100) < 0 ? MINUS : "") + "$" + Math.abs(Math.round(c / 100)).toLocaleString("en-US");
const usd2 = c => (c <= -.5 ? MINUS : "") + "$" + (Math.abs(c) / 100).toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const usdK = c => {
  const d = Math.abs(c) / 100, s = c < -49 ? MINUS : "";
  return s + (d >= 1e6 ? "$" + (d / 1e6).toFixed(d >= 1e7 ? 1 : 2) + "M" : d >= 1e4 ? "$" + Math.round(d / 1e3) + "k" : d >= 1e3 ? "$" + (d / 1e3).toFixed(1) + "k" : "$" + Math.round(d));
};
const sUsd = c => (Math.round(c / 100) > 0 ? "+" : "") + usd(c);
const sUsd2 = c => (c >= .5 ? "+" : "") + usd2(c);
const pctS = x => { const r = Math.round(x * 1000) / 10; return (r > 0 ? "+" : r < 0 ? MINUS : "") + Math.abs(r).toFixed(Math.abs(r) >= 100 ? 0 : 1) + "%"; };
const ct = p => Math.round(p) + "¢";
const ct1 = p => (Math.round(p * 10) / 10).toFixed(1) + "¢";
const signOf = v => v > 1e-4 ? "up" : v < -1e-4 ? "down" : "flat";
const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const speedLabel = s => (s === .5 ? "½" : String(s)) + "×";
const dateOf = t => SimEngine.dateAt(M, Math.min(t, LEN - .01));
const dShort = t => dateOf(t).short;
const daysTo = t2 => SimEngine.daysBetween(M, E.t, t2);
const plural = (n, w, ws) => num(n) + " " + (Math.round(n) === 1 ? w : (ws || w + "s"));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

const MKT = Object.fromEntries(M.markets.map(m => [m.id, m]));
const IDS = M.markets.map(m => m.id);
const catOf = id => SCN.cats[MKT[id].cs.cat];
const ccol = id => catOf(id).color;
const shortOf = id => MKT[id].cs.short;

const svg = (d, w = 2) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const fill = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">${d}</svg>`;
const I = {
  play: fill('<path d="M8 5.5v13l10.5-6.5z"/>'),
  pause: fill('<rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/>'),
  replay: svg('<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/>', 2.2),
  next: svg('<path d="M6 6l7 6-7 6zM17 6v12"/>', 2.2),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>', 1.8),
  back: svg('<path d="M15 5l-7 7 7 7"/>', 2.4),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>', 2.4),
  up: svg('<path d="M12 19V5M6 11l6-6 6 6"/>', 2.6),
  down: svg('<path d="M12 5v14M6 13l6 6 6-6"/>', 2.6),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.6),
  cross: svg('<path d="M7 7l10 10M17 7L7 17"/>', 2.6),
  share: svg('<path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7"/>'),
  spark: fill('<path d="M12 2l1.9 5.6L19.5 9.5 13.9 11.4 12 17l-1.9-5.6L4.5 9.5l5.6-1.9z"/>'),
  flame: fill('<path d="M13.5 2c.5 3-1.2 4.4-2.6 5.7C9.2 9.2 7.5 10.7 7.5 14a5.5 5.5 0 0 0 11 0c0-2.4-1-3.7-1.9-4.8-.3 1-.9 1.7-1.7 2 .4-2.6-.6-6.6-1.4-9.2z"/>'),
  people: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.6a3.2 3.2 0 0 1 0 6.3M18 14.3c1.8.8 3 2.6 3 4.7"/>'),
  key: svg('<rect x="2.5" y="6.5" width="19" height="11" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  gavel: svg('<path d="M14 4l6 6M11.5 6.5l6 6M13 5l-6.5 6.5 6 6L19 11M9.5 14.5L3 21M3 21h7"/>'),
  doc: svg('<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/>'),
  shield: svg('<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  alert: svg('<path d="M12 3l9.5 17h-19zM12 10v4M12 17.5v.5"/>'),
  scale: svg('<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0zM8 21h8"/>'),
  live: fill('<circle cx="12" cy="12" r="5"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 2.4),
  minus: svg('<path d="M5 12h14"/>', 2.4)
};

const toastEl = $("#toast"), srLive = $("#srLive");
let toastT;
function toast(html, ms = 3600){
  toastEl.innerHTML = html; toastEl.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("on"), ms);
}
const say = text => { srLive.textContent = text; };

/* ============ state ============
   The decisions are all that is saved. The market itself is rebuilt
   from them: the engine replays every action at the step it was taken. */
const KEY = "itj_live_v1";
const blank = () => ({v: 1, s: 0, log: [], speed: 1, started: false, done: false, set: {pauseMoments: false, slowArg: true}});
function load(){
  try{
    const s = JSON.parse(localStorage.getItem(KEY));
    if(s && s.v === 1 && Array.isArray(s.log)) return {...blank(), ...s, set: {...blank().set, ...(s.set || {})}};
  }catch(e){}
  return blank();
}
let st = flags.has("reset") ? blank() : load();
if(flags.has("speed")){ const s = parseFloat(flags.get("speed")); if(s > 0 && s <= 60) st.speed = s; }
let E = SimEngine.create(SCN, {log: st.log, to: Math.min(STEPS, st.s || 0)});
let clockT = E.t;
function save(){
  st.s = E.s; st.log = E.log;
  try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(e){}
}

const mkOf = id => E.byId[id];
const px = id => SimEngine.px(mkOf(id));
const yesAsk = mk => mk.ba <= 99 ? mk.ba : null;
const noAsk = mk => mk.bb >= 1 ? 100 - mk.bb : null;
const expertOf = id => MKT[id].expert[E.s] * 100;
const isOpen = id => mkOf(id).status === "open";
function weekAgo(id){
  const mk = mkOf(id), sec = Math.max(Math.ceil(mk.openT || 0), Math.floor(E.t - WEEK));
  const v = mk.h.p[sec];
  return v === v ? v : px(id);
}
/* the player, read off the engine */
const Y = () => E.you;
function myPos(id){
  const y = Y(), k = mkOf(id).k, x = y.pos[k], mk = mkOf(id);
  const p = SimEngine.px(mk), value = x > 0 ? x * p : -x * (100 - p);
  return {x, side: x > 0 ? "yes" : x < 0 ? "no" : null, n: Math.abs(x), basis: y.basis[k], avg: x ? y.basis[k] / Math.abs(x) : 0,
          value, pl: value - y.basis[k], realized: y.realized[k], paid: y.paid[k], held: y.held[k], locked: y.locked[k]};
}
function snapshot(){
  const y = Y();
  let inPos = 0;
  for(const id of IDS) inPos += myPos(id).value;
  const total = y.cash + inPos;
  return {cash: y.cash - y.reserved, reserved: y.reserved, inPos, total, ret: total / START - 1};
}
let snap = snapshot();

/* ============ the clock ============
   `playing` is what the presenter asked for; a hold stops the clock
   without un-asking (a sheet open on a phone, for example). */
let playing = false, lastNow = 0, lastPaint = 0, lastChart = 0, lastSave = 0, lastChatter = 0, lastNotable = 0;
const holds = new Set();
const running = () => playing && !holds.size && !st.done;
let argLive = null;           /* the oral argument, while it runs */
const effSpeed = () => argLive && !argLive.over && st.set.slowArg ? Math.min(st.speed, 1) : st.speed;

function setPlaying(on){
  if(st.done && on){ go("stand"); return; }
  playing = !!on;
  if(on && !st.started){ st.started = true; renderMarkets(); $("#v-markets").scrollTop = 0; }
  save(); renderBarState(); tickClock();
}
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(.25, Math.max(0, (now - lastNow) / 1000));
  lastNow = now;
  if(running()){
    clockT = Math.min(LEN, Math.max(clockT, E.t) + dt * effSpeed());
    const target = Math.min(STEPS, Math.floor(clockT / DT + 1e-6));
    for(let n = 0; E.s < target && n < 600; n++){
      SimEngine.step(E);
      drain(false);
      if(!running()){ clockT = E.t; break; }
    }
    if(E.s >= STEPS && !st.done) finish(false);
  }
  tickClock();
  if(now - lastPaint > 180){ lastPaint = now; tick(now); }
}
/* the next scripted moment, for the skip button */
function nextEvent(){
  return M.events.find(e => !e.line && e.t > E.t + 1e-6 && (e.major || e.resolve || e.list)) || null;
}
function skip(){
  if(st.done) return;
  if(!st.started){ st.started = true; renderMarkets(); }
  const e = nextEvent(), to = e ? Math.min(STEPS, Math.ceil(e.t / DT)) : STEPS;
  while(E.s < to){ SimEngine.step(E); drain(E.s < to - 1); }
  clockT = E.t;
  if(E.s >= STEPS) finish(false);
  save(); tick(performance.now(), true);
}
function finish(quiet){
  st.done = true; playing = false;
  save(); renderBarState();
  if(!quiet){
    toast(`<span><b>Time’s up.</b> Six months of rulings, done.</span>`, 3600);
    setTimeout(() => { hideMoment(); go("stand"); }, 2200);
  }
}
function restart(){
  st = {...blank(), speed: st.speed, set: st.set};
  playing = false; holds.clear(); argLive = null;
  E = SimEngine.create(SCN); clockT = 0;
  hideMoment(); closeSheet();
  feed.length = 0; feedVer++; seenNotable = 0; boardCache = null;
  save();
  rebuildFeed();
  snap = snapshot();
  renderBar(); renderMarkets(); renderWallet(true);
  go("markets");
}

/* ============ what the engine says happened ============ */
function drain(quiet){
  for(const o of E.out){
    if(o.k === "event") onEvent(o.e, quiet);
    else if(o.k === "line") onLine(o.e, quiet);
    else if(o.k === "resolve") onResolve(o, quiet);
    else if(o.k === "fill") onFill(o, quiet);
    else if(o.k === "forecast") addFeed(feedForecast(o.f), quiet);
    else if(o.k === "milestone"){ addFeed(feedMilestone(o.ms), quiet); }
  }
  E.out.length = 0;
}
function onEvent(e, quiet){
  addFeed(feedEvent(e), quiet);
  if(e.live && !quiet) startArgument(e);
  if(quiet) return;
  if(e.m) flash(e.m);
  if(e.list) toast(`<span><b>New market:</b> ${esc(MKT[e.list].short)}</span>`, 3200);
  if(e.major && !e.live){ showMoment(e, true); if(st.set.pauseMoments){ playing = false; renderBarState(); } }
  if(e.major) say(e.title);
}
function onResolve(o, quiet){
  const id = IDS[o.m];
  if(quiet || !o.youHeld) return;
  const won = o.youPaid > 0;
  setTimeout(() => toast(won ? `${I.check}<span><b>+${usd2(o.youPaid)}</b> paid into your account: ${esc(MKT[id].short)} resolved ${o.outcome === "yes" ? "Yes" : "No"}.</span>`
    : `<span>Your ${o.youHeld > 0 ? "Yes" : "No"} contracts in ${esc(shortOf(id))} paid nothing.</span>`, 4600), 900);
}
function onFill(o, quiet){
  const id = IDS[o.m];
  addFeed({t: E.t, kind: "you", m: id, html: `<b>Your limit order filled:</b> ${num(o.q)} ${o.dir === "yes" ? "Yes" : "No"} at ${ct(o.avg)} in ${esc(shortOf(id))}.`}, quiet);
  if(!quiet) toast(`${I.check}<span>Limit order filled: <b>${num(o.q)} ${o.dir === "yes" ? "Yes" : "No"}</b> at ${ct(o.avg)}.</span>`);
}

/* ============ the feed ============
   One list for everything: the script, the named traders, the big
   tickets, the crowd's ordinary trades, the business, and the player. */
const feed = [];
let feedVer = 0, feedNew = 0, feedDrawn = -1, seenNotable = 0;
function addFeed(it, quiet){
  it.o = ++feedVer;
  feed.push(it);
  feed.sort((a, b) => b.t - a.t || b.o - a.o);
  if(feed.length > 240) feed.length = 240;
  if(!quiet) feedNew++;
}
const chip = (id, extra = "") => `<span class="chip" style="--cat:${ccol(id)}"><i></i>${esc(shortOf(id))}${extra}</span>`;
const metaRow = (id, t, tag) => `<div class="fd-meta">${id ? chip(id) : ""}<span>${dShort(t)}</span>${tag ? `<span>· ${esc(tag)}</span>` : ""}</div>`;
function fxChip(e){
  const info = E.info[e.id];
  if(e.resolve){
    const yes = e.resolve === "yes";
    return `<span class="fx ${yes ? "yes" : "no"}">${yes ? I.check : I.cross}Resolved ${yes ? "Yes" : "No"}</span>`;
  }
  if(!e.m || !info || info.before == null) return "";
  const mk = mkOf(e.m);
  const now = mk.status === "open" ? SimEngine.px(mk) : mk.priorPx;
  const d = now - info.before;
  if(Math.abs(d) < 1) return "";
  return `<span class="fx ${d > 0 ? "up" : "down"}">${d > 0 ? I.up : I.down}Yes ${ct(info.before)} → ${ct(now)}</span>`;
}
function feedEvent(e){
  if(e.kind === "platform") return {t: e.t, kind: "biz", html: `<div class="fd-meta"><span class="chip biz"><i></i>${esc(e.tag)}</span><span>${dShort(e.t)}</span></div><div class="fd-t">${esc(e.title)}</div>`};
  if(e.kind === "integrity") return {t: e.t, kind: "alert", m: e.m, html: `${metaRow(e.m, e.t, e.tag)}<div class="fd-t">${esc(e.title)}</div>`};
  return {t: e.t, kind: e.major ? "ev major" : "ev", m: e.m, e: e.id,
    html: `${metaRow(e.m, e.t, e.tag)}<div class="fd-t">${esc(e.title)}</div><div class="fxs" data-fx="${e.id}">${fxChip(e)}</div>`};
}
function feedForecast(f){
  return {t: f.t, kind: "fc", m: f.m, html: `${metaRow(f.m, f.t, "Forecast")}<div class="fd-t"><b>${esc(f.name)}</b> <span class="muted">(${esc(f.record)})</span> puts it at <b>${f.p}%</b>. ${disclosure(f)}</div>`};
}
const disclosure = f => f.pos ? `<span class="disc">Holds ${num(Math.abs(f.pos))} ${f.pos > 0 ? "Yes" : "No"}</span>` : `<span class="disc">No position</span>`;
function feedMilestone(ms){ return {t: ms.t, kind: "biz", html: `<div class="fd-meta"><span class="chip biz"><i></i>Milestone</span><span>${dShort(ms.t)}</span></div><div class="fd-t">${esc(ms.text)}</div>`}; }
const who = a => `<b>${esc(a.name)}</b>${a.pid ? ` <span class="role">${esc(a.role)}</span>` : a.city ? ` <span class="muted">${esc(a.city)}</span>` : ""}`;
function tradeWords(side, q, avg){
  return side > 0 ? `bought ${num(q)} Yes at ${ct(avg)}` : `bought ${num(q)} No at ${ct(100 - avg)}`;
}
function feedNotable(n){
  const a = E.agents[n.a], id = IDS[n.m];
  return {t: n.t, kind: a.pid ? "persona" : "big", m: id, html: `${metaRow(id, n.t)}<div class="fd-t">${who(a)} ${tradeWords(n.side, n.q, n.avg)}, ${usdK(n.v)}.</div>`};
}
function feedTx(x){
  const id = IDS[x.m], what = x.op === "buy" ? "bought" : "sold";
  return {t: x.t, kind: "you", m: id, html: `${metaRow(id, x.t)}<div class="fd-t"><b>You</b> ${what} ${num(x.qty)} ${x.dir === "yes" ? "Yes" : "No"} at ${ct1(x.avg)}${x.fee ? `, ${usd2(x.fee)} fee` : ""}.</div>`};
}
/* the crowd's ordinary trades, a few at a time, from the real tape */
function chatter(){
  const open = E.open.filter(mk => mk.tape.length);
  if(!open.length) return;
  const mk = pick(open), tr = mk.tape[mk.tape.length - 1 - Math.floor(Math.random() * Math.min(8, mk.tape.length))];
  if(!tr || E.t - tr.t > 6) return;
  const taker = E.agents[tr.side > 0 ? tr.b : tr.s];
  if(!taker.crowd || taker.pid) return;
  addFeed({t: tr.t, kind: "crowd", m: mk.id, html: `<div class="fd-t">${who(taker)} ${tradeWords(tr.side, tr.q, tr.p)}${"" } <span class="muted">· ${esc(shortOf(mk.id))}</span></div>`}, false);
}
function notableTick(){
  const N = E.notable;
  if(seenNotable > N.length) seenNotable = 0;
  const fresh = N.slice(seenNotable).filter(n => E.t - n.t < 8);
  seenNotable = N.length;
  fresh.sort((a, b) => (E.agents[b.a].pid ? 1 : 0) - (E.agents[a.a].pid ? 1 : 0) || b.v - a.v);
  fresh.slice(0, 2).forEach(n => addFeed(feedNotable(n), false));
}
function rebuildFeed(){
  feed.length = 0;
  E.fired.filter(e => !e.line).forEach(e => addFeed(feedEvent(e), true));
  E.published.forEach(f => addFeed(feedForecast(f), true));
  E.milestones.forEach(ms => addFeed(feedMilestone(ms), true));
  Y().txns.forEach(x => addFeed(x.type === "fill"
    ? {t: x.t, kind: "you", m: IDS[x.m], html: `<b>Your limit order filled:</b> ${num(x.qty)} ${x.dir === "yes" ? "Yes" : "No"} at ${ct(x.avg)} in ${esc(shortOf(IDS[x.m]))}.`}
    : feedTx(x), true));
  E.notable.filter(n => E.agents[n.a].pid).slice(-30).forEach(n => addFeed(feedNotable(n), true));
  seenNotable = E.notable.length;
  feedNew = 0;
}

/* ============ the clock bar ============ */
function renderBar(){
  const months = M.months.map(mo => `<span style="left:${(mo.t0 / LEN * 100).toFixed(2)}%">${mo.label}</span>`).join("");
  $("#bar").innerHTML = `
    <button class="bar-play" id="barPlay"></button>
    <div class="bar-clock"><b id="barDate"></b><span id="barSub"></span></div>
    <div class="bar-tl" id="barTl"><div class="tl-track"></div><div class="tl-fill" id="tlFill"></div>
      <div class="tl-months" aria-hidden="true">${months}</div><div id="tlTicks"></div><div class="tl-head" id="tlHead"></div></div>
    <div class="bar-right">
      <div class="bar-speed" role="group" aria-label="Speed">${SPEEDS.map(s => `<button data-speed="${s}" aria-pressed="false">${speedLabel(s)}</button>`).join("")}</div>
      <button class="bar-btn bar-next" id="barNext" aria-label="Skip to the next big moment" title="Skip to the next big moment (N)">${I.next}</button>
      <div class="bar-wallet"><b data-v="total"></b><small data-v="ret"></small></div>
      <button class="bar-btn" id="barGear" aria-label="Run settings" title="Run settings">${I.gear}</button>
    </div>`;
  $("#barPlay").onclick = () => st.done ? openRestart() : setPlaying(!playing);
  $("#barNext").onclick = skip;
  $(".bar-clock").onclick = () => { if(argLive && !argLive.shown) renderArgument(true); };
  $("#barGear").onclick = openSettings;
  $$("[data-speed]").forEach(b => b.onclick = () => setSpeed(+b.dataset.speed));
  $("#tlTicks").onclick = ev => {
    const b = ev.target.closest("[data-tick]");
    if(!b) return;
    const e = M.events.find(x => x.id === b.dataset.tick);
    if(e) showMoment(e, false);
  };
  ticksSig = "";
  renderTicks(); renderBarState(); tickClock();
}
let ticksSig = "";
function renderTicks(){
  const fired = E.fired.filter(e => !e.line && e.m);
  const sig = fired.length + "";
  if(sig === ticksSig) return;
  ticksSig = sig;
  $("#tlTicks").innerHTML = fired.map(e => {
    const lab = esc(`${dShort(e.t)} · ${shortOf(e.m)}: ${e.title}`);
    return `<button class="tl-tick${e.major ? " major" : ""}${e.resolve ? " res" : ""}" data-tick="${e.id}" style="left:${(e.t / LEN * 100).toFixed(2)}%;--tc:${ccol(e.m)}" title="${lab}" aria-label="${lab}"><i></i></button>`;
  }).join("");
}
function renderBarState(){
  const b = $("#barPlay"); if(!b) return;
  b.innerHTML = st.done ? I.replay : playing ? I.pause : I.play;
  b.classList.toggle("is-waiting", !playing && !st.done && !st.started);
  b.setAttribute("aria-label", st.done ? "Run it again" : playing ? "Pause the clock" : st.started ? "Resume the clock" : "Start the clock");
  b.title = st.done ? "Run it again" : (playing ? "Pause" : "Play") + " (space)";
  $$("[data-speed]").forEach(x => x.setAttribute("aria-pressed", String(+x.dataset.speed === st.speed)));
}
function setSpeed(s){
  st.speed = s; save(); renderBarState(); tickClock();
  if(sheetOpen && sheetKind === "settings") $$("[data-sp]", sheet).forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.sp === s)));
}
function tickClock(){
  const d = $("#barDate"); if(!d) return;
  const dt = dateOf(E.t);
  const label = dt.label;
  if(d.textContent !== label) d.textContent = label;
  const left = (LEN - E.t) / effSpeed();
  const sub = st.done ? "Term complete"
    : !st.started ? `<b>${mmss(LEN / st.speed)}</b> run · press play`
    : dt.live ? `<span class="live-dot"></span><b>${dt.clock}</b> · live argument${playing ? "" : " · paused"}`
    : `<b>${mmss(left)}</b> left${playing ? "" : " · paused"}${effSpeed() !== 1 ? ` · ${speedLabel(effSpeed())}` : ""}`;
  const el = $("#barSub");
  if(el.innerHTML !== sub) el.innerHTML = sub;
  const p = (E.t / LEN * 100).toFixed(3) + "%";
  $("#tlFill").style.width = p;
  $("#tlHead").style.left = p;
}

/* ============ live numbers ============
   Anything marked data-v is rewritten in place on each tick, so a screen
   never redraws for a number. */
function val(key){
  const [what, id] = key.split(":");
  switch(what){
    case "total": return [usd(snap.total)];
    case "totalC": return [usd2(snap.total)];
    case "ret": return [pctS(snap.ret), snap.ret];
    case "cash": return [usd(snap.cash)];
    case "inpos": return [usd(snap.inPos)];
    case "paid": return [usd(IDS.reduce((a, i) => a + Y().paid[mkOf(i).k], 0))];
    case "pct": return [Math.round(px(id)) + "%"];
    case "yes": { const p = yesAsk(mkOf(id)); return [p == null ? "—" : ct(p)]; }
    case "no": { const p = noAsk(mkOf(id)); return [p == null ? "—" : ct(p)]; }
    case "wk": { const d = px(id) - weekAgo(id); return [d ? (d > 0 ? "▲ " : "▼ ") + Math.abs(Math.round(d)) + " this week" : "flat this week", d / 100]; }
    case "exp": return ["Experts " + Math.round(expertOf(id)) + "%"];
    case "vol": return [usdK(mkOf(id).notional) + " traded"];
    case "spread": { const mk = mkOf(id); return [mk.bb >= 1 && mk.ba <= 99 ? (mk.ba - mk.bb) + "¢ spread" : "no quotes"]; }
    case "oi": return [num(mkOf(id).oi)];
    case "mvol": return [num(mkOf(id).vol)];
    case "trades": return [num(mkOf(id).trades)];
    case "pval": return [usd2(myPos(id).value)];
    case "ppl": { const p = myPos(id); return [sUsd2(p.pl), p.pl]; }
    case "pplpct": { const p = myPos(id); return [p.basis ? pctS(p.pl / p.basis) : "", p.pl]; }
    case "close": { const d = daysTo(MKT[id].closeT); return [d > 1 ? `${Math.ceil(d)} days left` : d > 0 ? "last day" : "closed"]; }
    case "online": return [num(bizCache().online)];
    case "pool": return [num(E.poolN)];
    case "tradesAll": return [num(E.trades)];
    case "notional": return [usdK(E.notional)];
    case "subs": return [num(Math.floor(E.subs))];
  }
  return [""];
}
function paint(root = document){
  $$("[data-v]", root).forEach(el => {
    const [text, sign] = val(el.dataset.v);
    if(el.textContent !== text) el.textContent = text;
    if(sign !== undefined) el.dataset.sign = signOf(sign);
  });
}
/* redraw a block only when what it shows has changed shape */
function patch(el, sig, html){
  if(!el || el.dataset.sig === sig) return false;
  el.dataset.sig = sig;
  el.innerHTML = typeof html === "function" ? html() : html;
  return true;
}
let bizC = null, bizAt = -1;
function bizCache(){
  if(!bizC || Math.abs(bizAt - E.t) >= 1 || bizAt > E.t){ bizC = SimEngine.stats(E); bizAt = E.t; }
  return bizC;
}

function tick(now, force){
  snap = snapshot();
  if(running() && now - lastChatter > Math.max(700, 1700 / effSpeed())){ lastChatter = now; chatter(); }
  if(running() && now - lastNotable > 900){ lastNotable = now; notableTick(); }
  renderTicks();
  const charts = force || now - lastChart > 450;
  if(charts) lastChart = now;
  if(view === "markets") tickMarkets(force, charts);
  if(view === "market") tickMarket(force, charts);
  if(view === "port") tickPort(force, charts);
  if(view === "biz") tickBiz(force, charts);
  if(view === "stand" && !st.done) tickStand(force);
  if(momentE) tickMoment();
  if(argLive) tickArgument();
  if(sheetOpen && sheetTick) sheetTick();
  renderWallet();
  paint();
  if(now - lastSave > 2000){ lastSave = now; save(); }
}

/* ============ charts ============
   One line chart, drawn several ways: a market's price with the expert
   panel and the spread, your value, the business. Values come from the
   engine's per-second record, so every line agrees with every number. */
function lineChart(o){
  const W = o.W, H = o.H, L = o.padL ?? 38, R = o.padR ?? 64, T = 12, B = 24;
  const x = t => L + (W - L - R) * (t - o.x0) / ((o.x1 - o.x0) || 1);
  const y = v => T + (H - T - B) * (1 - (v - o.y0) / ((o.y1 - o.y0) || 1));
  let g = "";
  o.yTicks.forEach(v => {
    g += `<line class="lc-grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="lc-axis r" x="${L - 6}" y="${(y(v) + 3.5).toFixed(1)}">${o.yFmt(v)}</text>`;
  });
  (o.xTicks || []).forEach(xt => { if(xt.t >= o.x0 && xt.t <= o.x1) g += `<text class="lc-axis" x="${(x(xt.t) + 2).toFixed(1)}" y="${H - 7}">${esc(xt.label)}</text>`; });
  if(o.now != null && o.now < o.x1) g += `<rect class="lc-future" x="${x(Math.max(o.x0, o.now)).toFixed(1)}" y="${T}" width="${(x(o.x1) - x(Math.max(o.x0, o.now))).toFixed(1)}" height="${H - T - B}"/>
    <line class="lc-now" x1="${x(o.now).toFixed(1)}" x2="${x(o.now).toFixed(1)}" y1="${T}" y2="${H - B}"/>`;
  if(o.base) g += `<line class="lc-base" x1="${L}" x2="${W - R}" y1="${y(o.base.v).toFixed(1)}" y2="${y(o.base.v).toFixed(1)}"/>`;
  const path = pts => { let d = "", pen = false; for(const p of pts){ if(p[1] == null || !(p[1] === p[1])){ pen = false; continue; } d += (pen ? "L" : "M") + x(p[0]).toFixed(1) + " " + y(clamp(p[1], o.y0, o.y1)).toFixed(1); pen = true; } return d; };
  if(o.band && o.band.lo.length){
    const lo = o.band.lo.filter(p => p[1] === p[1]), hi = o.band.hi.filter(p => p[1] === p[1]);
    if(lo.length > 1 && hi.length > 1) g += `<path class="lc-band" d="${path(hi)}${lo.slice().reverse().map(p => "L" + x(p[0]).toFixed(1) + " " + y(p[1]).toFixed(1)).join("")}Z"/>`;
  }
  const ends = [];
  o.series.forEach(s => {
    const pts = s.pts.filter(p => p[1] === p[1]);
    if(!pts.length) return;
    const d = path(s.pts), last = pts[pts.length - 1];
    if(s.area) g += `<path class="lc-area" style="--c:${s.color}" d="${d}L${x(last[0]).toFixed(1)} ${y(o.y0)}L${x(pts[0][0]).toFixed(1)} ${y(o.y0)}Z"/>`;
    g += `<path class="lc-line${s.dash ? " dash" : ""}" style="--c:${s.color};stroke-width:${s.width || 2}" d="${d}"/>`;
    if(s.label) ends.push({x: x(last[0]), y: y(clamp(last[1], o.y0, o.y1)), ly: y(clamp(last[1], o.y0, o.y1)), s, v: last[1]});
  });
  (o.marks || []).forEach(m => {
    if(m.t < o.x0 || m.t > o.x1 || !(m.v === m.v)) return;
    g += `<circle class="lc-mark ${m.cls || ""}" cx="${x(m.t).toFixed(1)}" cy="${y(clamp(m.v, o.y0, o.y1)).toFixed(1)}" r="${m.r || 3.5}"/>`;
  });
  ends.sort((a, b) => a.y - b.y);
  for(let i = 1; i < ends.length; i++) if(ends[i].ly - ends[i - 1].ly < 14) ends[i].ly = ends[i - 1].ly + 14;
  ends.forEach(e => {
    g += `<circle class="lc-dot" style="--c:${e.s.color}" cx="${e.x.toFixed(1)}" cy="${e.y.toFixed(1)}" r="3.6"/>
      <text class="lc-end" x="${(e.x + 8).toFixed(1)}" y="${(e.ly + 4).toFixed(1)}">${esc(e.s.label)} <tspan>${esc(o.endFmt ? o.endFmt(e.v) : "")}</tspan></text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || "")}">${g}</svg>`;
}
/* The hover layer: a crosshair that snaps to the nearest second, and a
   tooltip with every series there. Kept across redraws. */
const chartModels = {};
function wireChart(box){
  if(box._reshow) return;
  const cross = document.createElement("div"), tip = document.createElement("div");
  cross.className = "lc-x"; tip.className = "lc-tip";
  box.append(cross, tip);
  let px0 = null;
  const show = () => {
    const m = chartModels[box.dataset.chart], s = box.querySelector("svg");
    if(!m || !s || px0 == null || !m.read){ cross.style.display = "none"; tip.classList.remove("on"); return; }
    const r = s.getBoundingClientRect(), br = box.getBoundingClientRect(), k = r.width / m.W;
    const L = m.padL ?? 38, R = m.padR ?? 64;
    let t = m.x0 + ((px0 - r.left) / k - L) / (m.W - L - R) * (m.x1 - m.x0);
    t = Math.round(clamp(t, m.x0, Math.min(m.x1, m.now ?? m.x1)));
    const xpx = r.left - br.left + (L + (m.W - L - R) * (t - m.x0) / ((m.x1 - m.x0) || 1)) * k;
    Object.assign(cross.style, {display: "block", left: xpx + "px", top: (r.top - br.top + 12 * k) + "px", height: ((m.H - 36) * k) + "px"});
    const rows = m.read(t), near = m.near ? m.near(t) : "";
    tip.innerHTML = `<h4>${esc(dShort(t))}</h4>${rows.map(rw => `<p style="--c:${rw.color}"><i></i><b>${esc(rw.v)}</b><span>${esc(rw.label)}</span></p>`).join("")}${near ? `<div class="tip-ev">${esc(near)}</div>` : ""}`;
    tip.classList.add("on");
    const tw = tip.offsetWidth, left = xpx + 12 + tw > br.width ? xpx - 12 - tw : xpx + 12;
    tip.style.left = Math.max(0, left) + "px"; tip.style.top = (r.top - br.top + 4) + "px";
  };
  box.addEventListener("pointermove", e => { px0 = e.clientX; show(); });
  box.addEventListener("pointerleave", () => { px0 = null; show(); });
  box._reshow = show;
}
function drawChart(box, model){
  if(!box) return;
  chartModels[box.dataset.chart] = model;
  [...box.children].forEach(n => { if(!n.classList.contains("lc-x") && !n.classList.contains("lc-tip")) n.remove(); });
  model.W = Math.max(280, Math.round(box.clientWidth || 600));
  model.H = model.H || (model.W < 520 ? 200 : 240);
  box.insertAdjacentHTML("afterbegin", model.empty ? `<div class="lc-empty" style="height:${model.H}px">${esc(model.empty)}</div>` : lineChart(model));
  wireChart(box); box._reshow();
}
const monthTicks = () => M.months.map(mo => ({t: mo.t0, label: mo.label}));
function hist(arr, from, to){
  const pts = [];
  for(let s = Math.max(0, Math.ceil(from)); s <= Math.floor(to); s++) pts.push([s, arr[s]]);
  return pts;
}

/* a market's price, the expert panel, the bid and ask */
function marketModel(id){
  const mk = mkOf(id), m = MKT[id], H = mk.h;
  const x0 = Math.max(0, Math.floor(m.openT)), end = mk.status === "resolved" ? mk.resolvedSec : E.t;
  const x1 = Math.max(m.closeT, end);
  const price = hist(H.p, x0, end), exp = mk.status === "open" ? hist(H.e, x0, end) : hist(H.e, x0, end - 1);
  const evs = E.fired.filter(e => e.m === id && !e.line && e.t >= x0);
  const marks = evs.map(e => ({t: e.t, v: H.p[Math.min(LEN, Math.ceil(e.t))], cls: e.resolve ? "res" : e.major ? "major" : "", r: e.major ? 4.5 : 3}));
  Y().txns.filter(x => IDS[x.m] === id).forEach(x => marks.push({t: x.t, v: H.p[Math.min(LEN, Math.round(x.t))], cls: "you", r: 4.5}));
  return {x0, x1, now: mk.status === "open" ? E.t : null, y0: 0, y1: 100, yTicks: [0, 25, 50, 75, 100], yFmt: v => v + "¢", padR: 74,
    xTicks: monthTicks(), endFmt: v => ct(v), aria: `Price of Yes in ${m.short}, with the expert panel`,
    band: {lo: hist(H.b, x0, end), hi: hist(H.a, x0, end)},
    series: [{pts: exp, color: "var(--expert)", dash: true, width: 1.6, label: mk.status === "open" ? "Experts" : ""},
             {pts: price, color: ccol(id), width: 2.2, label: "Yes"}],
    marks,
    read: t => {
      const rows = [{color: ccol(id), label: "Yes price", v: H.p[t] === H.p[t] ? ct(H.p[t]) : "—"}];
      if(H.e[t] === H.e[t]) rows.push({color: "var(--expert)", label: "Expert panel", v: Math.round(H.e[t]) + "%"});
      if(H.b[t] === H.b[t] && H.a[t] === H.a[t]) rows.push({color: "var(--faint)", label: "Bid / ask", v: `${ct(H.b[t])} / ${ct(H.a[t])}`});
      return rows;
    },
    near: t => { const e = evs.find(x => Math.abs(x.t - t) <= 2); return e ? e.title : ""; }};
}
function sparkHTML(id, w = 300, h = 54){
  const mk = mkOf(id), end = mk.status === "resolved" ? mk.resolvedSec : Math.floor(E.t);
  const from = Math.max(Math.ceil(mk.openT || 0), end - 75);
  const pts = hist(mk.h.p, from, end).filter(p => p[1] === p[1]);
  if(pts.length < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" class="spark-flat"/></svg>`;
  const lo = Math.max(0, Math.min(...pts.map(p => p[1])) - 6), hi = Math.min(100, Math.max(...pts.map(p => p[1])) + 6);
  const t0 = pts[0][0], t1 = Math.max(t0 + 20, pts[pts.length - 1][0]);
  const x = t => (t - t0) / (t1 - t0) * (w - 6) + 2, y = v => 3 + (h - 6) * (1 - (v - lo) / ((hi - lo) || 1));
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join("");
  const last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d}L${x(last[0]).toFixed(1)} ${h}L${x(t0).toFixed(1)} ${h}Z" class="spark-area" style="--c:${ccol(id)}"/>
    <path d="${d}" class="spark-line" style="--c:${ccol(id)}"/></svg>`;
}

/* ============ the wallet, in the side bar ============ */
let walletAt = 0;
function renderWallet(force){
  const el = $("#navWallet"); if(!el) return;
  patch(el, "w", `<div class="nw"><span class="nw-h">Practice credits</span>
    <div class="nw-total"><b data-v="total"></b><small data-v="ret"></small></div>
    <div data-part="wspark"></div>
    <div class="nw-rows"><span>Cash</span><b data-v="cash"></b><span>In positions</span><b data-v="inpos"></b></div>
    <div class="nw-foot"><button data-act="keys">Shortcuts</button><button data-act="restart">Restart</button></div></div>`);
  const now = performance.now();
  if(force || now - walletAt > 1000){ walletAt = now; const w = el.querySelector("[data-part=wspark]"); if(w) w.innerHTML = walletSpark(); }
}
function walletSpark(){
  const hv = Y().hv, end = Math.floor(E.t), pts = hist(hv, 0, end).filter(p => p[1] === p[1]);
  const W = 200, H = 34;
  if(pts.length < 2) return `<svg class="nw-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" class="spark-flat"/></svg>`;
  const hi = Math.max(START * 1.1, ...pts.map(p => p[1])) * 1.02, lo = Math.min(START * .9, ...pts.map(p => p[1])) * .98;
  const x = t => t / LEN * W, y = v => 2 + (H - 4) * (1 - (v - lo) / (hi - lo));
  return `<svg class="nw-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <line x1="0" x2="${W}" y1="${y(START).toFixed(1)}" y2="${y(START).toFixed(1)}" class="spark-base"/>
    <path d="${pts.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join("")}" class="spark-line" style="--c:var(--ink)"/></svg>`;
}

/* ============ markets ============ */
function renderMarkets(){
  $("#v-markets").innerHTML = `<div class="mk-wrap">
    <div class="mk-main">
      ${st.started ? pulseHTML() : introHTML()}
      <section class="cal" aria-label="Coming up" data-part="cal"></section>
      <div class="grid" data-part="grid"></div>
      <section data-part="resolved"></section>
      <div class="foot-room"></div>
    </div>
    <aside class="card feed" aria-label="Live feed">
      <div class="feed-head"><i></i><h2>Live</h2><small>every market, every trader</small></div>
      <ol class="feed-list" id="feedList"></ol>
    </aside></div>`;
  feedDrawn = -1;
  tickMarkets(true, true);
}
function introHTML(){
  return `<section class="intro">
    <div class="intro-eyebrow"><i></i>I, the Jury Live · a ten-minute simulation</div>
    <h1>Six months of court rulings. Ten minutes. <span class="mark">$${num(SCN.credits)} in practice credits.</span></h1>
    <p class="intro-lead">Eight questions on five fictional cases, from a buyout fight to the Supreme Court. Each one names the court, the ruling and the deadline. A Yes contract pays $1 if it happens, so its price is the crowd’s probability. You’re trading against ${num(E.pool0)} simulated traders who read the same news differently, and more arrive as the term goes on.</p>
    <ol class="intro-steps">
      <li><b>Read the case</b><span>A neutral brief, both sides’ arguments, the documents and the exact rules. The price says what the crowd thinks; the facts are yours to weigh.</span></li>
      <li><b>Cast your verdict, then trade</b><span>A verdict is a free forecast, scored when the question resolves. A trade costs practice credits and pays $1 a contract if you’re right.</span></li>
      <li><b>Watch the term unfold</b><span>Filings, hearings and rulings arrive on the clock, including a live Supreme Court argument and a jury verdict. Thousands of traders react. So can you.</span></li>
    </ol>
    <div class="intro-cta"><button class="btn primary big" data-act="start">${I.play}Start the clock</button>
      <span>or trade first: every market is open now.</span></div>
    <p class="intro-fine">A simulation. The cases, people and companies are fictional, the credits have no cash value, and every trader except you is simulated.</p>
  </section>`;
}
function pulseHTML(){
  return `<section class="pulse" aria-label="The platform right now">
    <div><span class="pulse-dot"></span><b data-v="online"></b><small>trading now</small></div>
    <div><b data-v="pool"></b><small>registered traders</small></div>
    <div><b data-v="notional"></b><small>traded this term</small></div>
    <div><b data-v="tradesAll"></b><small>trades</small></div>
    <button class="pulse-go" data-go2="biz">The business ${svg('<path d="M9 6l6 6-6 6"/>', 2.4)}</button>
  </section>`;
}
function calHTML(){
  const items = M.dates.filter(d => d.t > E.t - 1e-6 && d.from <= E.t && mkOf(d.m).status !== "resolved").slice(0, 7);
  if(!items.length) return "";
  return `<h2 class="cal-h">Coming up</h2><div class="cal-row">${items.map(d => {
    const n = Math.ceil(daysTo(d.t));
    return `<button class="cal-i" data-open="${d.m}" style="--cat:${ccol(d.m)}"><span class="cal-d">${esc(dShort(d.t))}</span><span class="cal-l">${esc(d.label)}</span>
      <span class="cal-n">${n <= 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`}</span></button>`;
  }).join("")}</div>`;
}
function cardHTML(id){
  const m = MKT[id];
  return `<article class="mcard" data-m="${id}" style="--cat:${ccol(id)}">
    <div class="mc-top"><span class="chip"><i></i>${esc(catOf(id).label)} · ${esc(shortOf(id))}</span><span class="mc-close">Closes ${esc(dShort(m.closeT))} · <span data-v="close:${id}"></span></span></div>
    <h3 class="mc-q"><button data-open="${id}">${esc(m.q)}</button></h3>
    <div class="mc-mid">
      <div class="mc-prob"><b data-v="pct:${id}"></b><span>chance</span><em data-v="wk:${id}"></em></div>
      <div class="mc-spark" data-part="spark"></div>
    </div>
    <div class="mc-acts">
      <button class="yn yes" data-act="buy" data-m="${id}" data-dir="yes"><span>Yes</span><b data-v="yes:${id}"></b></button>
      <button class="yn no" data-act="buy" data-m="${id}" data-dir="no"><span>No</span><b data-v="no:${id}"></b></button>
    </div>
    <div class="mc-foot"><span data-v="vol:${id}"></span><span data-v="spread:${id}"></span><span data-v="exp:${id}"></span></div>
    <div class="mc-mine" data-part="mine"></div>
    <p class="mc-news" data-part="news"></p>
  </article>`;
}
function mineHTML(id){
  const p = myPos(id), V = Y().verdicts[mkOf(id).k], v = V.length ? V[V.length - 1].p : null;
  const o = Y().orders.filter(x => x.m === mkOf(id).k && x.q > 0);
  if(!p.n && !o.length && v == null) return "";
  return `<div class="mine">${p.n ? `<span class="mine-pos ${p.side}">You: ${num(p.n)} ${p.side === "yes" ? "Yes" : "No"}</span><span>worth <b data-v="pval:${id}"></b></span><em data-v="ppl:${id}"></em>` : ""}
    ${o.length ? `<span class="mine-o">${plural(o.length, "open order")}</span>` : ""}${v != null ? `<span class="mine-v">Your verdict ${v}%</span>` : ""}</div>`;
}
function newsHTML(id){
  const e = [...E.fired].reverse().find(x => x.m === id && !x.line);
  return e ? `<small>${esc(dShort(e.t))}</small>${esc(e.title)}` : `<small>${esc(dShort(E.t))}</small>Trading opens. ${esc(MKT[id].cs.court)}.`;
}
function resolvedHTML(){
  const ids = IDS.filter(id => mkOf(id).status === "resolved").sort((a, b) => mkOf(b).resolvedT - mkOf(a).resolvedT);
  if(!ids.length) return "";
  return `<h2 class="sec-h">Resolved</h2><div class="rlist">${ids.map(id => {
    const mk = mkOf(id), yes = mk.outcome === "yes", p = myPos(id), k = mk.k, held = Y().held[k];
    const mine = held ? `<span class="r-you" data-sign="${signOf(Y().realized[k])}">You ${sUsd2(Y().realized[k])}</span>` : "";
    return `<button class="rcard" data-open="${id}" style="--cat:${ccol(id)}"><span class="stamp ${yes ? "yes" : "no"}">${yes ? "Yes" : "No"}</span>
      <span class="r-txt"><b>${esc(MKT[id].short)}</b><small>${esc(dShort(mk.resolvedT))} · last traded ${ct(mk.priorPx)} · ${plural(mk.winners, "trader")} paid ${usdK(mk.paid)}</small></span>${mine}</button>`;
  }).join("")}</div>`;
}
function tickMarkets(force, charts){
  const v = $("#v-markets"), q = n => v.querySelector(`[data-part="${n}"]`);
  const open = IDS.filter(id => mkOf(id).status === "open");
  const grid = q("grid");
  if(patch(grid, open.join(","), () => open.map(cardHTML).join(""))) charts = true;
  patch(q("cal"), M.dates.filter(d => d.t > E.t - 1e-6 && d.from <= E.t).map(d => d.at).join("|") + Math.floor(E.t / 3), calHTML);
  patch(q("resolved"), IDS.filter(id => mkOf(id).status === "resolved").join(",") + "/" + Y().txns.length, resolvedHTML);
  for(const id of open){
    const card = grid.querySelector(`.mcard[data-m="${id}"]`);
    if(!card) continue;
    const c = n => card.querySelector(`[data-part="${n}"]`);
    if(charts) patch(c("spark"), Math.floor(E.t) + "", () => sparkHTML(id));
    const k = mkOf(id).k, y = Y();
    patch(c("mine"), [y.pos[k], y.orders.filter(o => o.m === k && o.q > 0).length, y.verdicts[k].length].join("/"), () => mineHTML(id));
    patch(c("news"), E.fired.filter(x => x.m === id && !x.line).length + "", () => newsHTML(id));
  }
  renderFeed(force);
}
let feedOpen = false;
function renderFeed(force){
  const el = $("#feedList"); if(!el) return;
  if(!force && feedDrawn === feedVer) return;
  const n = feedOpen ? 140 : innerWidth >= 1100 ? 70 : 10, items = feed.slice(0, n);
  el.innerHTML = items.length ? items.map((it, k) => `<li class="fd fd-${it.kind}${k < Math.min(feedNew, 4) ? " in" : ""}"${it.m ? ` style="--cat:${ccol(it.m)}"` : ""}${it.m ? ` data-open="${it.m}"` : ""}>${it.html}</li>`).join("")
    : `<li class="fd fd-empty">The term starts January 4. Press play and the feed fills with every filing, ruling and trade.</li>`;
  if(feed.length > n) el.insertAdjacentHTML("beforeend", `<li class="fd-more-li"><button class="fd-more" data-act="more">Show more</button></li>`);
  feedNew = 0; feedDrawn = feedVer;
}
function flash(id){
  const card = $(`.mcard[data-m="${id}"]`);
  if(!card) return;
  card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash");
  setTimeout(() => card.classList.remove("flash"), 1600);
}

/* ============ a market ============ */
let mId = null;
function openMarket(id){
  if(!MKT[id]) return;
  mId = id;
  renderMarket();
  go("market");
  $("#v-market").scrollTop = 0;
}
function renderMarket(){
  const id = mId, m = MKT[id], c = m.cs;
  $("#v-market").innerHTML = `<div class="mp" style="--cat:${ccol(id)}">
    <header class="mp-hero">
      <button class="back" data-back>${I.back}Markets</button>
      <div class="mp-meta"><span class="chip"><i></i>${esc(catOf(id).label)} · ${esc(c.short)}</span><span>${esc(c.court)}</span><span data-part="status"></span></div>
      <h1>${esc(m.q)}</h1>
      <p class="mp-case">${esc(c.caseName)} · ${esc(c.docket)}</p>
    </header>
    <div class="mp-body">
      <div class="mp-main">
        <section class="card mp-price">
          <div class="mp-top" data-part="top"></div>
          <div class="lc" data-chart="mkt"></div>
          <div class="mp-legend"><span class="lg-line" style="--c:${ccol(id)}"></span>Yes price <span class="lg-dash"></span>Expert panel (12 vetted analysts) <span class="lg-band"></span>Bid to ask <span class="lg-dot"></span>Your trades</div>
        </section>
        <section class="card mp-sec" data-part="changed"></section>
        <section class="card mp-sec"><h2>The case</h2>
          <div class="facts">${c.facts.map(([b, s]) => `<div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join("")}</div>
          <div class="prose">${c.brief.map(p => `<p>${esc(p)}</p>`).join("")}</div>
          <dl class="who">${c.who.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></section>
        <section class="card mp-sec"><h2>Both sides</h2><p class="sub">The strongest arguments each way, written by the legal editor. Neither is a prediction.</p>
          <div class="sides"><div class="side-y"><h3>${I.up}The case for Yes</h3><ul>${c.forYes.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>
          <div class="side-n"><h3>${I.down}The case for No</h3><ul>${c.forNo.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div></div></section>
        <section class="card mp-sec"><h2>Timeline and documents</h2><div data-part="story"></div></section>
        <section class="card mp-sec"><h2>${I.gavel}How this resolves</h2><ul class="rules">${m.rules.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
          <p class="note">Questions are written before trading opens and don’t change. Appeals, delays and settlements are settled by these rules, not by anyone’s judgment afterwards.</p></section>
        <section class="card mp-sec"><h2>Sourced forecasts</h2><p class="sub">Published by members with a public record. Every forecast discloses the author’s position, read from the market itself. Tracked apart from the price.</p><div data-part="fcs"></div></section>
        <section class="card mp-sec"><h2>Embed this market</h2><p class="sub">How a publisher shows it: the source, a timestamp and the trading behind the number, beside their own reporting.</p><div data-part="embed"></div></section>
      </div>
      <aside class="mp-side">
        <section class="card mp-trade" data-part="trade"></section>
        <section class="card mp-verdict" data-part="verdict"></section>
        <section class="card mp-book"><h2>Order book <small>Yes prices</small></h2><div data-part="book"></div>
          <p class="note">Buying No at 40¢ is selling Yes at 60¢: a Yes and a No make one $1 contract.</p></section>
        <section class="card mp-tape"><h2>Recent trades</h2><ol class="tape" data-part="tape"></ol></section>
        <section class="card mp-crowd"><h2>The crowd</h2><div data-part="crowd"></div></section>
      </aside>
    </div>
    <div class="foot-room"></div></div>`;
  tickMarket(true, true);
}
function statusHTML(id){
  const mk = mkOf(id);
  if(mk.status === "resolved") return `<span class="stamp sm ${mk.outcome}">Resolved ${mk.outcome === "yes" ? "Yes" : "No"}</span>`;
  const d = daysTo(MKT[id].closeT);
  return `<span class="open-pill"><i></i>Open · closes ${esc(dShort(MKT[id].closeT))}${d > 0 ? ` (${Math.ceil(d)} days)` : ""}</span>`;
}
function topHTML(id){
  const mk = mkOf(id);
  if(mk.status === "resolved"){
    const yes = mk.outcome === "yes";
    return `<div class="mp-big"><b class="${yes ? "c-yes" : "c-no"}">${yes ? "Yes" : "No"}</b><span>resolved ${esc(dShort(mk.resolvedT))}. It last traded at ${ct(mk.priorPx)}.</span></div>
      <div class="mp-stats"><span><b>${num(mk.winners)}</b> traders paid</span><span><b>${usdK(mk.paid)}</b> paid out</span><span><b>${usdK(mk.notional)}</b> traded</span></div>`;
  }
  const V = Y().verdicts[mk.k], v = V.length ? V[V.length - 1].p : null;
  return `<div class="mp-big"><b data-v="pct:${id}"></b><span>chance of Yes</span><em data-v="wk:${id}"></em></div>
    <div class="mp-stats"><span>Experts <b>${Math.round(expertOf(id))}%</b></span>${v != null ? `<span>Your verdict <b>${v}%</b></span>` : ""}<span><b data-v="vol:${id}"></b></span><span><b data-v="spread:${id}"></b></span></div>`;
}
function tradeHTML(id){
  const mk = mkOf(id), p = myPos(id);
  if(mk.status !== "open"){
    if(!Y().held[mk.k]) return `<h2>Trade</h2><p class="sub" style="margin:0">This market is closed. You didn’t trade it.</p>`;
    return `<h2>Your result</h2><div class="res-row"><span>You held ${num(Math.abs(Y().held[mk.k]))} ${Y().held[mk.k] > 0 ? "Yes" : "No"}</span><b data-sign="${signOf(Y().realized[mk.k])}">${sUsd2(Y().realized[mk.k])}</b></div>
      <p class="sub" style="margin:6px 0 0">Paid ${usd2(Y().paid[mk.k])} at resolution, after fees.</p>`;
  }
  const o = Y().orders.filter(x => x.m === mk.k && x.q > 0);
  return `<h2>Trade</h2>
    <div class="yn-row"><button class="yn yes lg" data-act="buy" data-m="${id}" data-dir="yes"><span>Buy Yes</span><b data-v="yes:${id}"></b></button>
      <button class="yn no lg" data-act="buy" data-m="${id}" data-dir="no"><span>Buy No</span><b data-v="no:${id}"></b></button></div>
    ${p.n ? `<div class="pos"><div class="pos-h"><span class="mine-pos ${p.side}">${num(p.n)} ${p.side === "yes" ? "Yes" : "No"}</span><span>avg ${ct1(p.avg)}</span></div>
      <dl><dt>Worth now</dt><dd data-v="pval:${id}"></dd><dt>Gain or loss</dt><dd data-v="ppl:${id}"></dd><dt>Pays if ${p.side === "yes" ? "Yes" : "No"}</dt><dd>${usd2(p.n * 100)}</dd></dl>
      <button class="btn line" data-act="sell" data-m="${id}" data-dir="${p.side}">Sell ${p.side === "yes" ? "Yes" : "No"}</button></div>` : ""}
    ${o.length ? `<div class="orders"><h3>Open orders</h3>${o.map(x => `<div class="ord"><span>${x.op === "buy" ? "Buy" : "Sell"} ${num(x.q)} ${x.dir === "yes" ? "Yes" : "No"} at ${ct(x.dir === "yes" ? x.p : 100 - x.p)}</span><button data-act="cancel" data-id="${x.id}">Cancel</button></div>`).join("")}</div>` : ""}
    <button class="btn ghost sm" data-act="share" data-m="${id}">${I.share}Share this market</button>`;
}
function verdictHTML(id){
  const mk = mkOf(id), V = Y().verdicts[mk.k], last = V.length ? V[V.length - 1] : null;
  if(mk.status !== "open"){
    const sc = SimEngine.verdictScore(E, mk.k);
    if(!sc) return `<h2>Your verdict</h2><p class="sub" style="margin:0">You didn’t cast a verdict on this one.</p>`;
    const better = sc.you < sc.market;
    return `<h2>Your verdict</h2><div class="vd-score"><div><b>${sc.you.toFixed(3)}</b><span>your Brier score</span></div><div><b>${sc.market.toFixed(3)}</b><span>the market’s, same days</span></div></div>
      <p class="sub" style="margin:8px 0 0">${better ? "You read it better than the market." : "The market read it better than you."} Lower is better; always saying 50% scores 0.250.</p>`;
  }
  const v = last ? last.p : Math.round(SimEngine.px(mk));
  return `<h2>Your verdict <small>free · scored at resolution</small></h2>
    <p class="sub">How likely is Yes, in your judgment? I, the Jury scores every verdict when the question resolves, and keeps your record.</p>
    <div class="vd"><input type="range" min="1" max="99" value="${v}" id="vdIn" aria-label="Your verdict, percent chance of Yes"><output id="vdOut">${v}%</output></div>
    <div class="vd-ref"><span>Market <b data-v="pct:${id}"></b></span><span>Experts <b>${Math.round(expertOf(id))}%</b></span></div>
    <button class="btn primary" data-act="verdict" data-m="${id}">${last ? "Update verdict" : "Cast verdict"}</button>
    ${V.length ? `<p class="vd-hist">${V.slice(-3).reverse().map(x => `${x.p}% on ${esc(dShort(x.t))} (market ${ct(x.mkt)})`).join(" · ")}</p>` : ""}`;
}
function bookHTML(id){
  const mk = mkOf(id);
  if(mk.status !== "open") return `<p class="sub" style="margin:0">Trading has ended.</p>`;
  const d = SimEngine.depth(E, mk, 6), mx = Math.max(1, ...d.bids.map(r => r.q), ...d.asks.map(r => r.q));
  const row = (r, side) => `<div class="bk-r ${side}${r.you ? " you" : ""}"><span class="bk-p">${ct(r.p)}</span><span class="bk-q">${num(r.q)}${r.you ? ` <em>you ${num(r.you)}</em>` : ""}</span><i style="width:${(r.q / mx * 100).toFixed(1)}%"></i></div>`;
  const spread = mk.bb >= 1 && mk.ba <= 99 ? mk.ba - mk.bb : null;
  const depth5 = d.bids.filter(r => r.p >= mk.bb - 5).reduce((a, r) => a + r.q * r.p, 0) + d.asks.filter(r => r.p <= mk.ba + 5).reduce((a, r) => a + r.q * (100 - r.p), 0);
  return `<div class="bk-h"><span>Price</span><span>Contracts</span></div>
    <div class="bk-asks">${d.asks.slice().reverse().map(r => row(r, "ask")).join("") || `<div class="bk-none">No offers</div>`}</div>
    <div class="bk-mid"><span>${spread != null ? `Spread ${spread}¢` : "No two-sided quote"}</span><span class="liq ${spread != null && spread <= 3 ? "deep" : "thin"}">${spread != null && spread <= 3 ? "Deep" : "Thin"} · ${usdK(depth5)} within 5¢</span></div>
    <div class="bk-bids">${d.bids.map(r => row(r, "bid")).join("") || `<div class="bk-none">No bids</div>`}</div>`;
}
function tapeHTML(id){
  const mk = mkOf(id), rows = mk.tape.slice(-12).reverse();
  if(!rows.length) return `<li class="tp-none">No trades yet. They start when the clock does.</li>`;
  return rows.map(tr => {
    const a = E.agents[tr.side > 0 ? tr.b : tr.s], yes = tr.side > 0;
    return `<li class="${a === Y() ? "you" : ""}"><span class="tp-s ${yes ? "c-yes" : "c-no"}">${yes ? "Yes" : "No"} ${ct(yes ? tr.p : 100 - tr.p)}</span><span class="tp-q">${num(tr.q)}</span><span class="tp-w">${a === Y() ? "<b>You</b>" : `${esc(a.name)}${a.city ? ` · ${esc(a.city)}` : ""}`}</span></li>`;
  }).join("");
}
let holdersCache = {t: -1, id: null, v: null};
function crowdHTML(id){
  const mk = mkOf(id);
  if(holdersCache.id !== id || Math.abs(holdersCache.t - E.t) > 2){ holdersCache = {t: E.t, id, v: SimEngine.holders(E, mk)}; }
  const h = holdersCache.v;
  return `<div class="crowd"><div><b>${num(h.yes)}</b><span>traders holding Yes</span></div><div><b>${num(h.no)}</b><span>holding No</span></div>
    <div><b data-v="oi:${id}"></b><span>contracts open</span></div><div><b data-v="trades:${id}"></b><span>trades so far</span></div></div>`;
}
function storyHTML(id){
  const evs = E.fired.filter(e => e.m === id && !e.line).slice().reverse();
  const next = mkOf(id).status === "open" ? `<div class="story-next"><i></i>${
    (() => { const d = M.dates.find(x => x.m === id && x.t > E.t && x.from <= E.t); return d ? `Next: ${esc(d.label)}, ${esc(dShort(d.t))}.` : "More will appear here the moment it happens."; })()}</div>` : "";
  if(!evs.length) return next + `<p class="sub" style="margin:0">Nothing has happened yet this term.</p>`;
  return next + `<ol class="story">${evs.map(e => `<li${e.major ? ' class="major"' : ""}><div class="fd-meta"><span>${esc(dShort(e.t))}</span><span>· ${esc(e.tag)}</span></div>
    <h3>${esc(e.title)}</h3>${e.body ? `<p>${esc(e.body)}</p>` : ""}${e.doc ? `<div class="doc-wrap">${docHTML(e.doc)}</div>` : ""}<div class="fxs">${fxChip(e)}</div></li>`).join("")}</ol>`;
}
function changedHTML(id){
  const e = [...E.fired].reverse().find(x => x.m === id && !x.line && !x.list);
  if(!e) return `<h2>What changed</h2><p class="sub" style="margin:0">Nothing yet. The first filing, hearing or ruling will show up here, with what it did to the price.</p>`;
  return `<h2>What changed <small>${esc(dShort(e.t))}</small></h2><p class="chg-t">${esc(e.title)}</p>${e.changed ? `<p class="chg-why">${esc(e.changed)}</p>` : ""}<div class="fxs">${fxChip(e)}</div>`;
}
function forecastsHTML(id){
  const fs = E.published.filter(f => f.m === id).slice().reverse();
  if(!fs.length) return `<p class="sub" style="margin:0">No sourced forecasts yet.</p>`;
  return `<ul class="fcs">${fs.map(f => `<li><div class="fc-h"><span class="av">${esc(f.name.split(" ").map(w => w[0]).join(""))}</span><div><b>${esc(f.name)}</b><small>${esc(f.role)} · ${esc(f.record)}</small></div><span class="fc-p">${f.p}%</span></div>
    <p>${esc(f.text)}</p><div class="fc-f"><span>${esc(dShort(f.t))} · market then ${ct(f.price)}</span>${disclosure(f)}</div></li>`).join("")}</ul>`;
}
function embedHTML(id){
  const mk = mkOf(id), m = MKT[id], p = SimEngine.px(mk), open = mk.status === "open";
  return `<div class="embed"><div class="em-pub"><b>The Daily Courier</b><span>${esc(catOf(id).label)}</span></div>
    <div class="em-w"><div class="em-q">${esc(m.q)}</div>
      <div class="em-row"><span class="em-p">${open ? Math.round(p) + "%" : mk.outcome === "yes" ? "Resolved Yes" : "Resolved No"}</span><span class="em-s">${open ? "chance of Yes" : ""}</span>${sparkHTML(id, 160, 34)}</div>
      <div class="em-f"><span class="logo sm">I<b>,</b> the Jury</span><span>${usdK(mk.notional)} traded · ${num(mk.trades)} trades · updated ${esc(dShort(E.t))}</span></div></div></div>`;
}
function tickMarket(force, charts){
  const v = $("#v-market"), id = mId;
  if(!id || !v.firstElementChild) return;
  const mk = mkOf(id), q = n => v.querySelector(`[data-part="${n}"]`), y = Y(), k = mk.k;
  patch(q("status"), mk.status + Math.ceil(daysTo(MKT[id].closeT)), () => statusHTML(id));
  patch(q("top"), mk.status + "/" + y.verdicts[k].length + "/" + Math.round(expertOf(id)), () => topHTML(id));
  patch(q("trade"), [mk.status, y.pos[k], y.orders.filter(o => o.m === k && o.q > 0).map(o => o.id + ":" + o.q).join(","), y.realized[k]].join("/"), () => tradeHTML(id));
  if(patch(q("verdict"), mk.status + "/" + y.verdicts[k].length, () => verdictHTML(id))) wireVerdict();
  const vd = q("verdict").querySelector(".vd-ref b:not([data-v])"); if(vd){ const t = Math.round(expertOf(id)) + "%"; if(vd.textContent !== t) vd.textContent = t; }
  patch(q("changed"), E.fired.filter(x => x.m === id && !x.line).length + "/" + Math.floor(E.t / 2), () => changedHTML(id));
  patch(q("story"), E.fired.filter(x => x.m === id && !x.line).length + mk.status, () => storyHTML(id));
  patch(q("fcs"), E.published.filter(f => f.m === id).length + "", () => forecastsHTML(id));
  if(charts){
    patch(q("book"), Math.floor(E.t * 4) + "/" + y.orders.length, () => bookHTML(id));
    patch(q("tape"), mk.trades + "", () => tapeHTML(id));
    patch(q("crowd"), Math.floor(E.t / 2) + "", () => crowdHTML(id));
    patch(q("embed"), Math.floor(E.t) + "", () => embedHTML(id));
    drawChart(v.querySelector('[data-chart="mkt"]'), marketModel(id));
  }
}
function wireVerdict(){
  const inp = $("#vdIn"), out = $("#vdOut");
  if(!inp) return;
  inp.oninput = () => { out.textContent = inp.value + "%"; };
}

/* ============ documents, drawn ============ */
function docHTML(d){
  if(!d) return "";
  switch(d.kind){
    case "text": return `<div class="doc doc-text"><div class="dt-h"><b>${esc(d.from)}</b><span>to ${esc(d.to)}</span></div><div class="bubble">${esc(d.text)}</div><div class="dt-f">${esc(d.when)} · Exhibit 14</div></div>`;
    case "email": return `<div class="doc doc-email"><dl><dt>From</dt><dd>${esc(d.from)}</dd><dt>To</dt><dd>${esc(d.to)}</dd><dt>Date</dt><dd>${esc(d.when)}</dd><dt>Subject</dt><dd>${esc(d.subject)}</dd></dl><p><mark>${esc(d.text)}</mark></p><div class="dt-f">Trial exhibit PX-0312</div></div>`;
    case "stats": return `<div class="doc doc-stats">${d.title ? `<h4>${esc(d.title)}</h4>` : ""}<dl>${d.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>`;
    case "docket": case "verdict": return `<div class="doc doc-paper"><div class="dp-court">${esc(d.court || "")}</div><div class="dp-cap">${esc(d.caption)}</div>${d.heading ? `<div class="dp-h">${esc(d.heading)}</div>` : ""}
      <table class="dp-t">${d.rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${b === "YES" || b === "NO" ? `<b class="vf ${b.toLowerCase()}">${b}</b>` : esc(b)}</td></tr>`).join("")}</table></div>`;
    default: return `<div class="doc doc-paper"><div class="dp-court">${esc(d.court || "")}</div><div class="dp-cap">${esc(d.caption)}</div><div class="dp-h">${esc(d.heading)}</div><p class="dp-x"><mark>${esc(d.text)}</mark></p></div>`;
  }
}

/* ============ breaking: the big moments ============ */
let momentE = null;
function showMoment(e, live){
  const el = $("#moment");
  /* the live argument keeps the card while it runs; anything else waits in the feed */
  if(argLive && !argLive.over){ if(live) return; argLive.shown = false; }
  else argLive = null;
  momentE = e;
  const id = e.m;
  el.className = "moment";
  el.style.setProperty("--cat", id ? ccol(id) : "var(--gold)");
  const kind = e.resolve ? "res" : e.kind === "integrity" ? "alert" : e.kind === "platform" ? "biz" : "news";
  const label = e.resolve ? "Resolved" : e.kind === "integrity" ? "Market integrity" : e.kind === "platform" ? "Growth" : live ? "Breaking" : "Replay";
  el.innerHTML = `<div class="mo-top"><span class="mo-badge ${kind}">${label}</span>${id ? chip(id) : `<span class="chip biz"><i></i>${esc(e.tag)}</span>`}<span class="mo-date">${esc(dShort(e.t))}</span>
      <button class="mo-x" data-mo="close" aria-label="Close">${I.x}</button></div>
    <div class="mo-scroll">
      <div class="mo-tag">${esc(e.tag)}</div>
      <h3 class="mo-title">${esc(e.title)}</h3>
      <p class="mo-text">${esc(e.body || "")}</p>
      ${e.doc ? docHTML(e.doc) : ""}
      <div data-part="mo-extra"></div>
    </div>
    <div class="mo-foot"><div data-part="mo-fx"></div><div class="mo-acts" data-part="mo-acts"></div></div>`;
  el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
  tickMoment();
}
$("#moment").addEventListener("click", ev => {
  const a = ev.target.closest("[data-mo]");
  if(!a) return;
  const k = a.dataset.mo, id = a.dataset.m || (momentE && momentE.m) || (argLive && argLive.m);
  if(k === "close"){ if(argLive && !argLive.over){ hideMoment(true); } else hideMoment(); }
  if(k === "yes" || k === "no") openTicket(id, k, "buy");
  if(k === "open"){ hideMoment(true); openMarket(id); }
  if(k === "biz"){ hideMoment(); go("biz"); }
  if(k === "go") setPlaying(true);
});
function tickMoment(){
  const el = $("#moment"), e = momentE;
  if(!e || argLive && !argLive.over && argLive.shown) return;
  const q = n => el.querySelector(`[data-part="${n}"]`), id = e.m;
  const resume = !playing && st.started && !st.done ? `<button class="btn primary sm" data-mo="go">${I.play}Continue</button>` : "";
  if(e.resolve){
    const mk = mkOf(id), y = Y(), held = y.held[mk.k];
    patch(q("mo-fx"), "r" + held, () => `<div class="mo-res"><span class="stamp ${mk.outcome}">${mk.outcome === "yes" ? "Yes" : "No"}</span><span><b>${num(mk.winners)} traders</b> paid <b>${usdK(mk.paid)}</b>. It last traded at ${ct(mk.priorPx)}.</span></div>
      ${held ? `<div class="mo-mine">You held ${num(Math.abs(held))} ${held > 0 ? "Yes" : "No"}: <b data-sign="${signOf(y.realized[mk.k])}">${sUsd2(y.realized[mk.k])}</b> on this market.</div>` : ""}`);
    patch(q("mo-acts"), "r" + playing, () => resume + `<button class="btn line sm" data-mo="open" data-m="${id}">The market</button>`);
    return;
  }
  if(e.kind === "integrity"){
    const info = (E.info[e.id] || {}).insider;
    patch(q("mo-extra"), "i", () => info ? `<div class="alert-card">${I.shield}<div><b>${esc(info.name)}</b> bought <b>${num(info.contracts)} No</b> for ${usdK(info.cost)} between ${esc(dShort(info.from))} and ${esc(dShort(info.to))}, then the settlement was announced.
      <div class="alert-stats"><span><b>${usdK(info.withheld)}</b> payout withheld</span><span><b>Frozen</b> account</span><span><b>Reported</b> to the exchange</span></div></div></div>` : "");
    patch(q("mo-acts"), "i" + playing, () => resume + `<button class="btn line sm" data-mo="open" data-m="${id}">See the chart</button>`);
    return;
  }
  if(e.kind === "platform"){
    patch(q("mo-acts"), "p" + playing, () => resume + `<button class="btn line sm" data-mo="biz">The business</button>`);
    return;
  }
  const mk = mkOf(id), info = E.info[e.id];
  if(mk.status === "open"){
    const now = SimEngine.px(mk), before = info && info.before != null ? info.before : now, d = now - before;
    patch(q("mo-fx"), `${before}/${now}`, () => `<div class="mo-move"><span>Yes</span><b>${ct(before)}</b><i>${I.next}</i><b class="${d > 0 ? "c-yes" : d < 0 ? "c-no" : ""}">${ct(now)}</b><span class="${d > 0 ? "c-yes" : d < 0 ? "c-no" : "muted"}">${d ? (d > 0 ? "▲ " : "▼ ") + Math.abs(d) : "no change yet"}</span></div>`);
    patch(q("mo-acts"), "o" + playing, () => `<button class="yn yes" data-mo="yes" data-m="${id}"><span>Yes</span><b data-v="yes:${id}"></b></button><button class="yn no" data-mo="no" data-m="${id}"><span>No</span><b data-v="no:${id}"></b></button>${resume}<button class="btn line sm" data-mo="open" data-m="${id}">The market</button>`);
  } else {
    patch(q("mo-fx"), "c", "");
    patch(q("mo-acts"), "c" + playing, () => resume + `<button class="btn line sm" data-mo="open" data-m="${id}">The market</button>`);
  }
  paint(el);
}
function hideMoment(keepArg){
  $("#moment").classList.remove("on");
  momentE = null;
  if(argLive){ if(keepArg && !argLive.over) argLive.shown = false; else argLive = null; }
}

/* ============ the oral argument, live ============
   One card for the whole hour: every line from the bench as it is
   spoken, the price beside it, and the clock at 1× unless the presenter
   turned that off. */
function startArgument(e){
  const info = E.info[e.id];
  argLive = {e, m: e.m, over: false, shown: false, start: info && info.before != null ? info.before : px(e.m)};
  momentE = null;
  renderArgument(true);
  say("Live: the Supreme Court argument in Pruitt v. FEC has begun.");
}
const argLines = () => E.fired.filter(x => x.line && x.parent === argLive.e.id);
function lineHTML(e, anim){
  const ln = e.line, info = E.info[e.id];
  const cls = /^(A justice|Another justice)/.test(ln.who) ? "bench" : ln.who === "The Court" ? "court" : "counsel";
  return `<li class="${cls}${anim && !REDUCED ? " in" : ""}" data-l="${e.id}">
    <div class="al-w"><b>${esc(ln.who)}</b>${info && info.before != null ? `<span class="al-p">Yes ${ct(info.before)}</span>` : ""}</div>
    <p>${esc(ln.text)}${ln.note ? ` <em>[${esc(ln.note)}]</em>` : ""}</p>
    ${ln.reply ? `<p class="al-r"><b>${esc(ln.reply[0])}:</b> ${esc(ln.reply[1])}</p>` : ""}${ln.follow ? `<p class="al-f"><b>The justice:</b> ${esc(ln.follow)}</p>` : ""}</li>`;
}
/* the whole card, with every line spoken so far */
function renderArgument(animate){
  const el = $("#moment"), e = argLive.e, id = e.m;
  el.className = "moment arg";
  el.style.setProperty("--cat", ccol(id));
  el.innerHTML = `<div class="mo-top"><span class="mo-badge live"><i></i>Live</span>${chip(id)}<span class="mo-date" data-part="arg-clock"></span>
      <button class="mo-x" data-mo="close" aria-label="Close">${I.x}</button></div>
    <div class="arg-head"><div><div class="mo-tag">Supreme Court · Oral argument</div><h3 class="mo-title">${esc(e.title)}</h3></div>
      <div class="arg-px"><b data-v="pct:${id}"></b><span>chance of Yes</span></div></div>
    <div class="arg-lean" data-part="lean"></div>
    <ol class="arg-lines" data-part="lines">${argLines().map(x => lineHTML(x, false)).join("")}</ol>
    <div class="mo-foot"><div class="mo-acts"><button class="yn yes" data-mo="yes" data-m="${id}"><span>Yes</span><b data-v="yes:${id}"></b></button><button class="yn no" data-mo="no" data-m="${id}"><span>No</span><b data-v="no:${id}"></b></button>
      <button class="btn line sm" data-mo="open" data-m="${id}">The market</button></div></div>`;
  if(animate){ el.classList.remove("on"); void el.offsetWidth; }
  el.classList.add("on");
  argLive.shown = true;
  const ol = el.querySelector("[data-part=lines]");
  ol.scrollTop = ol.scrollHeight;
  tickArgument();
}
function onLine(e, quiet){
  if(quiet) return;
  if(!argLive || argLive.e.id !== e.parent){
    const parent = M.events.find(x => x.id === e.parent);
    if(!parent) return;
    startArgument(parent);
  } else if(argLive.shown){
    const ol = $("#moment [data-part=lines]");
    if(ol && !ol.querySelector(`[data-l="${e.id}"]`)){ ol.insertAdjacentHTML("beforeend", lineHTML(e, true)); ol.scrollTop = ol.scrollHeight; }
  }
  if(e.line.end && !argLive.over){
    argLive.over = true;
    addFeed({t: E.t, kind: "ev", m: e.m, html: `${metaRow(e.m, E.t, "Oral argument")}<div class="fd-t">Argument over. Yes went from ${ct(argLive.start)} to ${ct(px(e.m))} during the hour.</div>`}, false);
  }
}
function tickArgument(){
  const el = $("#moment");
  if(!argLive || !argLive.shown) return;
  const q = n => el.querySelector(`[data-part="${n}"]`);
  const dt = dateOf(E.t);
  const clk = q("arg-clock");
  if(clk){ const t = argLive.over ? "Argument over" : dt.clock || dShort(E.t); if(clk.textContent !== t) clk.textContent = t; }
  const d = px(argLive.m) - argLive.start;
  const lean = clamp(d / 20, -1, 1);
  patch(q("lean"), Math.round(d) + "", () => `<div class="lean-l"><span>Sounds like the government</span><span>How the market hears the bench</span><span>Sounds like Pruitt</span></div>
    <div class="lean-bar"><i style="left:${(50 + lean * 50).toFixed(1)}%"></i></div>
    <div class="lean-n">${d ? `Yes ${d > 0 ? "up" : "down"} ${Math.abs(Math.round(d))}¢ since the argument began` : "No move yet"}</div>`);
  paint(el);
}

/* ============ portfolio ============ */
function renderPort(){
  $("#v-port").innerHTML = `<div class="page">
    <div class="page-head"><h1>Your portfolio</h1><p>You started with $${num(SCN.credits)} in practice credits on ${esc(dShort(0))}.</p></div>
    <div class="tiles">
      <div class="tile hero"><small>Total value</small><b data-v="totalC"></b><em data-v="ret"></em></div>
      <div class="tile"><small>Cash</small><b data-v="cash"></b></div>
      <div class="tile"><small>In positions</small><b data-v="inpos"></b></div>
      <div class="tile"><small>Paid out to you</small><b data-v="paid"></b></div>
    </div>
    <div class="two">
      <div>
        <section class="card sec"><h2>Your value over time</h2><p class="sub">Against two of the named traders: a court-watcher who reads every filing, and a headline trader who trades the news the minute it breaks.</p>
          <div class="lc" data-chart="port"></div></section>
        <section class="card sec"><h2>Positions</h2><div data-part="pos"></div></section>
        <section class="card sec"><h2>Open orders</h2><div data-part="orders"></div></section>
      </div>
      <div>
        <section class="card sec"><h2>Your verdicts</h2><p class="sub">Free forecasts, scored by Brier score when each question resolves. Lower is better.</p><div data-part="verdicts"></div></section>
        <section class="card sec"><h2>Your moves</h2><ul class="acts-list" data-part="acts"></ul></section>
      </div>
    </div><div class="foot-room"></div></div>`;
  tickPort(true, true);
}
function posTableHTML(){
  const rows = IDS.filter(id => myPos(id).n);
  if(!rows.length) return `<p class="sub" style="margin:0">No open positions. Every market on the Markets page is open to trade.</p>`;
  return `<div class="ptable">${rows.map(id => {
    const p = myPos(id);
    return `<div class="prow" style="--cat:${ccol(id)}"><button class="prow-m" data-open="${id}"><span class="dot"></span><b>${esc(MKT[id].short)}</b><small>${esc(shortOf(id))}</small></button>
      <span class="mine-pos ${p.side}">${num(p.n)} ${p.side === "yes" ? "Yes" : "No"}</span>
      <span class="prow-n"><small>avg</small>${ct1(p.avg)}</span><span class="prow-n"><small>now</small>${ct(p.side === "yes" ? px(id) : 100 - px(id))}</span>
      <span class="prow-v"><b data-v="pval:${id}"></b><em data-v="ppl:${id}"></em></span>
      <span class="prow-a"><button class="btn line sm" data-act="sell" data-m="${id}" data-dir="${p.side}">Sell</button></span></div>`;
  }).join("")}</div>`;
}
function ordersHTML(){
  const o = Y().orders.filter(x => x.q > 0);
  if(!o.length) return `<p class="sub" style="margin:0">None. A limit order rests in the book until someone trades with it.</p>`;
  return o.map(x => `<div class="ord"><span>${esc(MKT[IDS[x.m]].short)}: ${x.op === "buy" ? "buy" : "sell"} ${num(x.q)} ${x.dir === "yes" ? "Yes" : "No"} at ${ct(x.dir === "yes" ? x.p : 100 - x.p)}</span><button data-act="cancel" data-id="${x.id}">Cancel</button></div>`).join("");
}
function verdictsHTML(){
  const rows = IDS.filter(id => Y().verdicts[mkOf(id).k].length);
  if(!rows.length) return `<p class="sub" style="margin:0">No verdicts yet. Open any market and cast one: it’s free, and it’s how members build a record.</p>`;
  return `<div class="vlist">${rows.map(id => {
    const k = mkOf(id).k, V = Y().verdicts[k], last = V[V.length - 1], sc = SimEngine.verdictScore(E, k);
    return `<div class="vrow"><button data-open="${id}">${esc(MKT[id].short)}</button><span>${last.p}%</span>${sc
      ? `<span class="${sc.you < sc.market ? "c-yes" : "c-no"}">${sc.you.toFixed(3)} vs market ${sc.market.toFixed(3)}</span>`
      : `<span class="muted">market now ${Math.round(px(id))}%</span>`}</div>`;
  }).join("")}</div>`;
}
function actsHTML(){
  const xs = Y().txns.slice().reverse();
  if(!xs.length) return `<li><span class="muted">No trades yet.</span></li>`;
  return xs.map(x => {
    const out = x.op === "buy", cash = out ? -(x.gross + (x.fee || 0)) : x.gross - (x.fee || 0);
    return `<li><span>${x.type === "fill" ? "Limit filled: " : ""}${out ? "Bought" : "Sold"} ${num(x.qty)} ${x.dir === "yes" ? "Yes" : "No"} · ${esc(MKT[IDS[x.m]].short)} at ${ct1(x.avg)}<small>${esc(dShort(x.t))}</small></span><b data-sign="${out ? "flat" : "up"}">${sUsd2(cash)}</b></li>`;
  }).join("");
}
function portModel(){
  const end = Math.floor(E.t), dana = E.pById.dana, jake = E.pById.jake;
  const toRet = (a, arr) => hist(arr, 0, end).map(p => [p[0], p[1] === p[1] ? (p[1] / a - 1) * 100 : NaN]);
  const me = toRet(START, Y().hv), d1 = toRet(dana.start, dana.hv), j1 = toRet(jake.start, jake.hv);
  const all = [...me, ...d1, ...j1].map(p => p[1]).filter(v => v === v);
  const lo = Math.min(-20, Math.floor(Math.min(...all) / 20) * 20), hi = Math.max(20, Math.ceil(Math.max(...all) / 20) * 20);
  const ticks = []; for(let v = lo; v <= hi; v += (hi - lo > 120 ? 40 : 20)) ticks.push(v);
  return {x0: 0, x1: LEN, now: E.t, y0: lo, y1: hi, yTicks: ticks, yFmt: v => (v > 0 ? "+" : v < 0 ? MINUS : "") + Math.abs(v) + "%", padR: 92,
    xTicks: monthTicks(), base: {v: 0}, endFmt: v => pctS(v / 100), aria: "Your return over time, beside two named traders",
    series: [{pts: j1, color: "var(--faint)", width: 1.4, label: "Jake (headlines)"}, {pts: d1, color: "var(--expert)", width: 1.4, label: "Dana (filings)"},
             {pts: me, color: "var(--ink)", width: 2.4, label: "You"}],
    marks: Y().txns.map(x => ({t: x.t, v: me[Math.min(me.length - 1, Math.round(x.t))] ? me[Math.min(me.length - 1, Math.round(x.t))][1] : NaN, cls: "you", r: 4})),
    read: t => [{color: "var(--ink)", label: "You", v: pctS((Y().hv[t] / START) - 1)}, {color: "var(--expert)", label: "Dana Whitlock", v: pctS(dana.hv[t] / dana.start - 1)},
                {color: "var(--faint)", label: "Jake Moreno", v: pctS(jake.hv[t] / jake.start - 1)}]};
}
function tickPort(force, charts){
  const v = $("#v-port"); if(!v.firstElementChild) return;
  const q = n => v.querySelector(`[data-part="${n}"]`), y = Y();
  patch(q("pos"), IDS.map(id => y.pos[mkOf(id).k]).join(",") + "/" + IDS.map(id => Math.round(px(id) / 2)).join(","), posTableHTML);
  patch(q("orders"), y.orders.map(o => o.id + ":" + o.q).join(","), ordersHTML);
  patch(q("verdicts"), IDS.map(id => y.verdicts[mkOf(id).k].length + mkOf(id).status[0]).join(","), verdictsHTML);
  patch(q("acts"), y.txns.length + "", actsHTML);
  if(charts) drawChart(v.querySelector('[data-chart="port"]'), portModel());
}

/* ============ the business ============ */
function renderBiz(){
  $("#v-biz").innerHTML = `<div class="page biz">
    <div class="page-head"><h1>The business, live</h1><p>Every number here comes from what the simulated traders do in this run. The money assumptions are the plan’s: I, the Jury keeps 0.5% of the value traded (half the 1% fee; the exchange partner keeps the rest), and Pro costs $20 a month.</p></div>
    <div class="kpis" data-part="kpis"></div>
    <div class="two">
      <div>
        <section class="card sec"><h2>Revenue by month</h2><p class="sub">Fees kept on trading, plus Pro subscriptions. The current month so far.</p><div data-part="rev"></div></section>
        <section class="card sec"><h2>Value traded, week by week</h2><p class="sub">Volume follows the news: every spike is a hearing, a ruling or a distribution push.</p><div class="lc" data-chart="vol"></div></section>
        <section class="card sec"><h2>Growth by channel</h2><p class="sub">Where the traders came from, and whether they stayed.</p><div data-part="chan"></div></section>
      </div>
      <div>
        <section class="card sec"><h2>Where the traders are</h2><p class="sub">Each dot a city, sized by traders; each flash a trade.</p><div class="map" data-part="map"></div></section>
        <section class="card sec"><h2>Retention</h2><div data-part="ret"></div></section>
        <section class="card sec"><h2>Break-even</h2><div data-part="be"></div></section>
        <section class="card sec"><h2>Liquidity</h2><div data-part="liq"></div></section>
        <section class="card sec"><h2>${I.shield}Market integrity</h2><div data-part="integ"></div></section>
      </div>
    </div><div class="foot-room"></div></div>`;
  mapDrawn = false;
  tickBiz(true, true);
}
function kpisHTML(b){
  const wkAgo = Math.max(0, Math.floor(E.t - WEEK)), newWk = E.poolN - E.g.pool[wkAgo];
  const k = (label, v, sub, cls = "") => `<div class="kpi ${cls}"><small>${label}</small><b>${v}</b>${sub ? `<em>${sub}</em>` : ""}</div>`;
  return k("Registered traders", num(b.pool), `+${num(newWk)} this week`) + k("Trading now", num(b.online), "", "live") +
    k("Active this week", num(b.wat), `${Math.round(b.wat / Math.max(1, b.pool) * 100)}% of registered`) + k("Trades", num(b.trades), "") +
    k("Value traded", usdK(b.notional), "this term") + k("Fees kept", usdK(b.retained), "0.5% of value traded", "gold") +
    k("Pro subscribers", num(b.subs), `${usdK(b.mrr)} a month`, "gold") + k("Newsletter", num(b.newsletter), "‘Cases to Watch’ readers");
}
function revHTML(b){
  const mx = Math.max(1, ...b.months.map(m => m.fees + m.subs));
  const nice = [5e5, 1e6, 2e6, 3e6, 4e6, 5e6, 7.5e6, 1e7].find(v => v >= mx) || mx;
  return `<div class="bars">${b.months.map(m => {
    const tot = m.fees + m.subs;
    return `<div class="bar-c${m.started && m.done < 1 ? " now" : ""}"><span class="bar-v">${m.started ? usdK(tot) : ""}</span><div class="bar-stack">
      <i class="b-subs" style="height:${(m.subs / nice * 100).toFixed(2)}%"></i><i class="b-fees" style="height:${(m.fees / nice * 100).toFixed(2)}%"></i></div><span class="bar-l">${m.label}</span></div>`;
  }).join("")}</div><div class="legend"><span><i class="b-fees"></i>Fees kept</span><span><i class="b-subs"></i>Pro subscriptions</span></div>`;
}
function volModel(){
  const end = Math.floor(E.t), wk = WEEK, bars = [];
  for(let t0 = 0; t0 < LEN; t0 += wk){
    let v = 0; for(let s = Math.ceil(t0); s < Math.min(end + 1, t0 + wk); s++) v += E.g.n[s];
    bars.push([t0, v]);
  }
  const mx = Math.max(1, ...bars.map(b => b[1]));
  return {bars, mx, end};
}
function volChart(box){
  if(!box) return;
  const W = Math.max(280, Math.round(box.clientWidth || 600)), H = W < 520 ? 170 : 200, L = 44, R = 10, T = 10, B = 24;
  const {bars, mx, end} = volModel(), nice = [1e6, 2.5e6, 5e6, 1e7, 2e7, 4e7, 6e7, 1e8].find(v => v >= mx) || mx;
  const x = t => L + (W - L - R) * t / LEN, y = v => T + (H - T - B) * (1 - v / nice), bw = (W - L - R) / bars.length - 2;
  let g = "";
  [0, nice / 2, nice].forEach(v => { g += `<line class="lc-grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="lc-axis r" x="${L - 6}" y="${(y(v) + 3.5).toFixed(1)}">${usdK(v)}</text>`; });
  monthTicks().forEach(t => { g += `<text class="lc-axis" x="${(x(t.t) + 2).toFixed(1)}" y="${H - 7}">${t.label}</text>`; });
  bars.forEach(([t0, v]) => { if(t0 > end) return; const h = H - B - y(v); g += `<rect class="vb${t0 + WEEK > end ? " cur" : ""}" x="${(x(t0) + 1).toFixed(1)}" y="${y(v).toFixed(1)}" width="${Math.max(1, bw).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="2"><title>Week of ${dShort(t0)}: ${usdK(v)}</title></rect>`; });
  E.fired.filter(e => e.major && !e.line).forEach(e => { g += `<circle class="vb-ev" cx="${x(e.t).toFixed(1)}" cy="${H - B + 4}" r="2.2" style="--c:${e.m ? ccol(e.m) : "var(--gold)"}"><title>${esc(e.title)}</title></circle>`; });
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Value traded each week">${g}</svg>`;
}
function chanHTML(b){
  const cost = {creators: 250000, publishers: 150000};
  const rows = b.channels.filter(c => c.n);
  return `<div class="ctable"><div class="ch-h"><span>Channel</span><span>Reached</span><span>Joined</span><span>Traded</span><span>Active this week</span></div>${rows.map(c =>
    `<div class="ch-r"><span><b>${esc(c.label)}</b>${cost[c.key] && c.traded ? `<small>${usd2(cost[c.key] / c.traded)} per trader, sponsored</small>` : c.key === "publishers" ? "" : ""}</span><span>${c.reach ? usdK(c.reach * 100).replace("$", "") : "—"}</span><span>${num(c.n)}</span><span>${num(c.traded)}</span><span>${num(c.wat)}</span></div>`).join("")}</div>`;
}
function retHTML(b){
  const r = b.retention;
  return `<div class="ret"><div class="ret-big"><b>${r == null ? "—" : Math.round(r * 100) + "%"}</b><span>of early traders came back in weeks 3 and 4</span></div>
    <div class="ret-bar"><i style="width:${r == null ? 0 : Math.round(r * 100)}%"></i><span class="ret-th" style="left:30%"></span></div>
    <p class="sub" style="margin:8px 0 0">The plan’s bar for a real launch is 30%. Counted over ${num(b.cohort)} traders who joined at least four weeks ago and traded in their first two.</p></div>`;
}
function beHTML(){
  const span = 30 * M.cal.rate, end = Math.floor(E.t), from = Math.max(0, Math.floor(E.t - span));
  let vol = 0, ret = 0; for(let s = from; s <= end; s++){ vol += E.g.n[s]; ret += E.g.ret[s]; }
  const scale = E.t >= span ? 1 : span / Math.max(1, E.t - 0);
  vol *= scale; ret *= scale;
  const subsRev = Math.floor(E.subs) * SCN.pro.price * 100, tot = ret + subsRev, fixed = 3000000;
  return `<p class="sub" style="margin:0 0 10px">The plan sets a hypothetical $30,000 a month of fixed costs. At 0.5%, fees alone would need $6 million of trading a month to cover it. The last 30 days of this run:</p>
    <dl class="be"><dt>Value traded</dt><dd>${usdK(vol)}</dd><dt>Fees kept</dt><dd>${usdK(ret)}</dd><dt>Pro subscriptions</dt><dd>${usdK(subsRev)}</dd><dt>Revenue</dt><dd><b>${usdK(tot)}</b></dd></dl>
    <div class="be-bar"><i style="width:${Math.min(100, tot / fixed * 100).toFixed(1)}%"></i></div>
    <p class="be-n"><b>${Math.round(tot / fixed * 100)}%</b> of break-even${tot >= fixed ? ", covered" : ""}. Subscriptions are ${Math.round(subsRev / Math.max(1, tot) * 100)}% of it: the plan’s point that low-cost distribution and Pro matter as much as volume.</p>`;
}
function liqHTML(){
  const open = E.open;
  if(!open.length) return `<p class="sub" style="margin:0">No markets open.</p>`;
  return `<div class="liq-t">${open.map(mk => {
    const id = mk.id, spread = mk.bb >= 1 && mk.ba <= 99 ? mk.ba - mk.bb : null;
    const makers = E.mms.filter(mm => mm.orders[mk.k].some(o => o.q > 0)).length;
    return `<div class="liq-r" style="--cat:${ccol(id)}"><span class="dot"></span><span>${esc(MKT[id].short)}</span><span>${spread != null ? spread + "¢" : "—"}</span><span>${makers} of ${E.mms.length} makers quoting</span></div>`;
  }).join("")}</div><p class="note">Six independent market-making firms quote both sides. New markets open with two of them and the rest join over the following weeks, so a fresh market starts thin and the spread shows it.</p>`;
}
function integHTML(){
  const e = E.fired.find(x => x.kind === "integrity");
  if(!e) return `<p class="sub" style="margin:0">No alerts. Surveillance watches for trading just ahead of news and for accounts linked to anyone working on a case.</p>`;
  const info = E.info[e.id].insider;
  return `<div class="alert-card">${I.alert}<div><b>1 account frozen</b> on ${esc(dShort(e.t))}: ${esc(info.name)} bought ${num(info.contracts)} No in the Lumen market in the two days before the settlement.
    <div class="alert-stats"><span><b>${usdK(info.withheld)}</b> withheld</span><span><b>Reported</b> to the exchange</span></div></div></div>`;
}
/* the map: cities by trader count, with a flash for each trade */
const US = [[-124.7,48.4],[-123,49],[-95.2,49],[-89.6,48],[-84.8,46.9],[-82.5,45.3],[-82.4,43],[-79,43.3],[-76,44.2],[-74.7,45],[-71.5,45],[-69.2,47.4],[-67.8,47.1],
  [-67,44.8],[-70,43.7],[-70.6,42],[-71.5,41.4],[-73.9,40.6],[-74.1,39.6],[-75,38.8],[-75.9,37],[-75.5,35.2],[-77.9,33.9],[-79.9,32.7],[-81.4,30.4],[-80,26.7],
  [-80.4,25.2],[-81.8,26.1],[-82.8,27.9],[-84.3,30],[-86.5,30.4],[-89.6,30.2],[-89.4,29],[-91.5,29.5],[-94,29.6],[-97.2,27.8],[-97.2,25.9],[-99.5,27.5],[-101.4,29.8],
  [-103,29],[-104.5,29.8],[-106.5,31.8],[-108.2,31.3],[-111.1,31.3],[-114.8,32.5],[-117.1,32.5],[-118.5,34],[-120.6,34.6],[-122.5,37.6],[-124.2,40.4],[-124.5,42.8],[-124,46.2]];
const MW = 600, MH = 340;
const proj = (lon, lat) => [((lon + 125) / 59) * MW, ((50 - lat) / 26) * MH];
let mapDrawn = false, mapAt = -9, mapCounts = null;
function mapTick(box){
  if(!box) return;
  const cities = SimEngine.CITIES;
  if(!mapDrawn || E.t - mapAt > 4){
    mapAt = E.t;
    mapCounts = new Array(cities.length).fill(0);
    for(const a of E.agents) if(a.crowd){ const i = SimEngine.CITY_IX[a.city]; if(i != null) mapCounts[i]++; }
    const mx = Math.max(...mapCounts);
    const outline = US.map((p, i) => (i ? "L" : "M") + proj(p[0], p[1]).map(v => v.toFixed(1)).join(" ")).join("") + "Z";
    box.innerHTML = `<svg viewBox="0 0 ${MW} ${MH}" role="img" aria-label="Traders by city">
      <path class="map-us" d="${outline}"/>${cities.map((c, i) => { const [x, y] = proj(c[2], c[1]); return `<circle class="map-c" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.6 + Math.sqrt(mapCounts[i] / mx) * 11).toFixed(1)}"><title>${esc(c[0])}: ${num(mapCounts[i])} traders</title></circle>`; }).join("")}<g class="map-fl"></g></svg>
      <div class="map-top">${cities.map((c, i) => [c[0], mapCounts[i]]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, v]) => `<span><b>${esc(n)}</b> ${num(v)}</span>`).join("")}</div>`;
    mapDrawn = true;
  }
  if(REDUCED) return;
  const g = box.querySelector(".map-fl");
  if(!g) return;
  const recent = [];
  for(const mk of E.open) for(let i = mk.tape.length - 1; i >= 0 && recent.length < 40; i--){ const tr = mk.tape[i]; if(E.t - tr.t > .9) break; recent.push(tr); }
  recent.slice(0, 10).forEach(tr => {
    const a = E.agents[tr.side > 0 ? tr.b : tr.s], i = SimEngine.CITY_IX[a.city];
    if(i == null) return;
    const [x, y] = proj(cities[i][2], cities[i][1]);
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", x.toFixed(1)); c.setAttribute("cy", y.toFixed(1)); c.setAttribute("r", "3");
    c.setAttribute("class", "map-p " + (tr.side > 0 ? "y" : "n"));
    g.appendChild(c);
    setTimeout(() => c.remove(), 1300);
  });
}
function tickBiz(force, charts){
  const v = $("#v-biz"); if(!v.firstElementChild) return;
  const q = n => v.querySelector(`[data-part="${n}"]`), b = bizCache();
  patch(q("kpis"), [b.pool, b.online, b.wat, b.trades, Math.round(b.notional / 1e4), Math.round(b.retained / 1e3), b.subs, b.newsletter].join("/"), () => kpisHTML(b));
  if(charts){
    patch(q("rev"), b.months.map(m => Math.round((m.fees + m.subs) / 1e4)).join("/"), () => revHTML(b));
    patch(q("chan"), b.channels.map(c => c.n + ":" + c.traded + ":" + c.wat).join("/"), () => chanHTML(b));
    patch(q("ret"), (b.retention == null ? "-" : Math.round(b.retention * 100)) + "/" + b.cohort, () => retHTML(b));
    patch(q("be"), Math.floor(E.t / 2) + "", beHTML);
    patch(q("liq"), Math.floor(E.t) + "/" + E.open.length, liqHTML);
    patch(q("integ"), E.fired.some(x => x.kind === "integrity") + "", integHTML);
    volChart(v.querySelector('[data-chart="vol"]'));
  }
  mapTick(q("map"));
}

/* ============ standings and results ============ */
let boardCache = null;
function boardNow(){
  if(!boardCache || Math.abs(boardCache.t - E.t) >= 1 || boardCache.s !== E.s && st.done){
    const rows = SimEngine.board(E), i = rows.findIndex(r => r.a === Y());
    boardCache = {t: E.t, s: E.s, rows, me: i, types: SimEngine.typeStats(E)};
  }
  return boardCache;
}
function boardRowHTML(r, i){
  const a = r.a, me = a === Y();
  return `<li class="${me ? "me" : ""}"><span class="rk">${i + 1}</span><span class="bw">${me ? "<b>You</b>" : `<b>${esc(a.name)}</b>${a.pid ? ` <span class="role">${esc(a.role)}</span>` : ` <span class="muted">${esc(SimEngine.TYPES[a.type].label.replace(/s$/, ""))} · ${esc(a.city)}</span>`}`}</span>
    <span class="bv"><b data-sign="${signOf(r.r)}">${pctS(r.r)}</b><small>${usd(r.v)}</small></span></li>`;
}
function typesHTML(types){
  const rows = types.slice().sort((a, b) => b.avg - a.avg), mx = Math.max(.05, ...rows.map(r => Math.abs(r.avg)));
  return `<div class="types">${rows.map(r => `<div class="ty"><span class="ty-l"><b>${esc(r.label)}</b><small>${esc(r.blurb)}</small></span>
    <span class="ty-bar"><i class="${r.avg >= 0 ? "tb-up" : "tb-down"}" style="width:${(Math.abs(r.avg) / mx * 50).toFixed(1)}%"></i></span>
    <span class="ty-v" data-sign="${signOf(r.avg)}">${pctS(r.avg)}<small>${sUsd(r.pnl)}</small></span></div>`).join("")}</div>
    <p class="note">Average return of everyone of each kind who traded, and their combined gain or loss. Fees go to the exchange and to I, the Jury.</p>`;
}
function renderStand(){
  const v = $("#v-stand");
  if(st.done){ renderResults(); return; }
  v.innerHTML = `<div class="page">
    <div class="page-head"><h1>Standings</h1><p>Every trader who started with at least $250 and made three trades, ranked by return. The final results land when the clock runs out, on ${esc(dShort(LEN - .01))}.</p></div>
    <section class="card me-card" data-part="me"></section>
    <div class="two">
      <section class="card sec"><h2>Top traders</h2><ol class="board" data-part="board"></ol></section>
      <div>
        <section class="card sec"><h2>The named traders</h2><ol class="board" data-part="named"></ol></section>
        <section class="card sec"><h2>Who’s making money</h2><div data-part="types"></div></section>
      </div>
    </div><div class="foot-room"></div></div>`;
  tickStand(true);
}
function meHTML(b){
  const n = b.rows.length, r = b.rows[b.me], top = Math.max(1, Math.ceil((b.me + 1) / n * 100));
  const t = Y().txns.length;
  return `<div class="me-l"><span class="me-rank">#${num(b.me + 1)}</span><span>of ${num(n)} ranked traders</span></div>
    <div class="me-r"><b data-sign="${signOf(r.r)}">${pctS(r.r)}</b><span>${t ? `top ${top}%` : "No trades yet: you rank on cash"}</span></div>`;
}
function tickStand(force){
  const v = $("#v-stand"); if(!v.firstElementChild || st.done) return;
  const q = n => v.querySelector(`[data-part="${n}"]`), b = boardNow();
  patch(q("me"), b.me + "/" + b.rows.length + "/" + Math.round(b.rows[b.me].r * 1000), () => meHTML(b));
  patch(q("board"), b.rows.slice(0, 10).map(r => r.a.i + ":" + Math.round(r.r * 1000)).join(",") + "/" + b.me, () => b.rows.slice(0, 10).map(boardRowHTML).join("") + (b.me >= 10 ? `<li class="gap">…</li>` + boardRowHTML(b.rows[b.me], b.me) : ""));
  const named = b.rows.map((r, i) => [r, i]).filter(([r]) => r.a.pid || r.a === Y());
  patch(q("named"), named.map(([r, i]) => i + ":" + Math.round(r.r * 1000)).join(","), () => named.map(([r, i]) => boardRowHTML(r, i)).join(""));
  patch(q("types"), b.types.map(t => Math.round(t.avg * 1000)).join(","), () => typesHTML(b.types));
}

function renderResults(){
  const v = $("#v-stand");
  boardCache = null;
  const b = boardNow(), n = b.rows.length, me = b.rows[b.me], top = Math.max(1, Math.ceil((b.me + 1) / n * 100));
  const total = SimEngine.value(E, Y()), ret = total / START - 1;
  const y = Y();
  const scored = IDS.map(id => ({id, sc: SimEngine.verdictScore(E, mkOf(id).k)})).filter(x => x.sc);
  const beat = scored.filter(x => x.sc.you < x.sc.market).length;
  const avgB = scored.length ? scored.reduce((a, x) => a + x.sc.you, 0) / scored.length : null;
  const biz = SimEngine.stats(E);
  const peakWat = Math.max(...Array.from(E.g.wat));
  const badges = badgesOf();
  v.innerHTML = `<div class="page rs">
    <section class="rs-hero">
      <div class="rs-eyebrow">Six months in ten minutes · final result</div>
      <div class="rs-big">${usd2(total)}</div>
      <p class="rs-line">From $${num(SCN.credits)} in practice credits: <b data-sign="${signOf(ret)}">${pctS(ret)}</b>. You finished <b>#${num(b.me + 1)} of ${num(n)}</b> ranked traders, the top ${top}%.</p>
      ${badges.length ? `<div class="rs-chips">${badges.map(x => `<span>${I.spark}${esc(x)}</span>`).join("")}</div>` : ""}
      <div class="rs-acts"><button class="btn primary" data-act="again">${I.replay}Run it again</button><button class="btn ghost" data-act="copy">${I.copy}Copy your result</button></div>
    </section>
    <div class="two">
      <div>
        <section class="card sec"><h2>Where you finished</h2><p class="sub">All ${num(n)} ranked traders by return. None of them knew how a case would end. The dark bar is you.</p><div class="hg"></div></section>
        <section class="card sec"><h2>How each market ended</h2><div class="rs-mk">${IDS.map(resultRowHTML).join("")}</div></section>
        <section class="card sec"><h2>Your verdicts</h2>${scored.length ? `<p class="sub">Average Brier score <b>${avgB.toFixed(3)}</b> on ${plural(scored.length, "question")}. You read it better than the market on <b>${beat} of ${scored.length}</b>.</p>
          <div class="vlist">${scored.map(x => `<div class="vrow"><button data-open="${x.id}">${esc(MKT[x.id].short)}</button><span>${x.sc.last}%</span><span class="${x.sc.you < x.sc.market ? "c-yes" : "c-no"}">${x.sc.you.toFixed(3)} vs ${x.sc.market.toFixed(3)}</span></div>`).join("")}</div>`
          : `<p class="sub" style="margin:0">You didn’t cast any verdicts this time. On the platform, verdicts are how members build a public record before they ever trade.</p>`}</section>
        <section class="card sec"><h2>Your calls</h2><ul class="moves">${callsHTML().join("")}</ul></section>
      </div>
      <div>
        <section class="card sec"><h2>Leaderboard</h2><ol class="board">${b.rows.slice(0, 10).map(boardRowHTML).join("")}${b.me >= 10 ? `<li class="gap">…</li>` + boardRowHTML(me, b.me) : ""}</ol></section>
        <section class="card sec"><h2>Who made money</h2>${typesHTML(b.types)}</section>
        <section class="card sec"><h2>The business this term</h2><div class="kpis sm">
          <div class="kpi"><small>Registered traders</small><b>${num(biz.pool)}</b><em>from ${num(E.pool0)}</em></div>
          <div class="kpi"><small>Trades</small><b>${num(biz.trades)}</b></div>
          <div class="kpi"><small>Value traded</small><b>${usdK(biz.notional)}</b></div>
          <div class="kpi gold"><small>Fees kept</small><b>${usdK(biz.retained)}</b><em>0.5% of value</em></div>
          <div class="kpi gold"><small>Pro subscribers</small><b>${num(biz.subs)}</b><em>${usdK(biz.mrr)} a month</em></div>
          <div class="kpi"><small>Weekly active, peak</small><b>${num(peakWat)}</b></div></div>
          <button class="btn line sm" data-go2="biz" style="margin-top:12px">The full dashboard</button></section>
        <section class="card sec"><h2>What the ten minutes showed</h2><ul class="shows">
          <li><b>Precise questions resolve cleanly, even when the news is messy.</b>The H-1B rule was vacated eight days after its deadline, and Lumen settled before any ruling. Both markets resolved No by their written rules, without anyone’s judgment.</li>
          <li><b>People show up when a case becomes news.</b>Volume spiked with every hearing and ruling, and the creator video, the newsletter and the publisher embeds brought ${num(biz.pool - E.pool0)} new traders.</li>
          <li><b>Reading the case pays.</b>Court-watchers and the published forecasters beat the headline traders and the true believers. The briefs, documents and forecasts are the product, not decoration.</li>
          <li><b>Integrity is built in.</b>The account that traded ahead of the Lumen settlement was caught, frozen and reported, and its payout withheld.</li>
          <li><b>Two revenue lines, as the plan says.</b>Fees kept on ${usdK(biz.notional)} of trading, plus ${num(biz.subs)} Pro subscriptions. Neither alone reaches break-even; together, with cheap distribution, they get closer.</li></ul></section>
      </div>
    </div><div class="foot-room"></div></div>`;
  const hg = v.querySelector(".hg");
  hg.innerHTML = histogramSVG(b.rows.map(r => r.r), me.r, Math.max(300, Math.round(hg.clientWidth || 600)));
}
function resultRowHTML(id){
  const mk = mkOf(id), k = mk.k, y = Y(), yes = mk.outcome === "yes", held = y.held[k];
  return `<button class="rs-row" data-open="${id}" style="--cat:${ccol(id)}"><span class="stamp ${yes ? "yes" : "no"}">${yes ? "Yes" : "No"}</span>
    <span class="rs-q"><b>${esc(MKT[id].short)}</b><small>${esc(MKT[id].cs.short)} · last traded ${ct(mk.priorPx)} · ${esc(dShort(mk.resolvedT))}</small></span>
    <span class="rs-y">${held || y.realized[k] ? `<b data-sign="${signOf(y.realized[k])}">${sUsd2(y.realized[k])}</b>` : `<small class="muted">no position</small>`}</span></button>`;
}
function callsHTML(){
  const y = Y(), out = [], li = (cls, icon, html) => `<li class="${cls}">${icon}<span>${html}</span></li>`;
  const byM = IDS.map(id => ({id, r: y.realized[mkOf(id).k], held: y.held[mkOf(id).k]})).filter(x => x.r || x.held);
  const best = byM.slice().sort((a, b) => b.r - a.r)[0], worst = byM.slice().sort((a, b) => a.r - b.r)[0];
  if(best && best.r > 0) out.push(li("good", I.up, `<b>Best call:</b> “${esc(MKT[best.id].short)}” ${best.held ? `You held ${best.held > 0 ? "Yes" : "No"} to the end` : "You traded in and out"}, for <b>${sUsd2(best.r)}</b>.`));
  if(worst && worst.r < 0) out.push(li("bad", I.down, `<b>Toughest call:</b> “${esc(MKT[worst.id].short)}” It cost you <b>${sUsd2(worst.r)}</b>.`));
  const exits = y.txns.filter(x => x.op === "sell");
  exits.forEach(x => {
    const mk = E.markets[x.m]; if(mk.status !== "resolved") return;
    const lost = (x.dir === "yes") !== (mk.outcome === "yes");
    if(lost && out.length < 6) out.push(li("good", I.check, `<b>Got out in time:</b> sold ${num(x.qty)} ${x.dir === "yes" ? "Yes" : "No"} in ${esc(MKT[IDS[x.m]].short)} at ${ct1(x.avg)}. They went on to pay nothing.`));
  });
  if(y.fees) out.push(li("info", I.info, `<b>You paid ${usd2(y.fees)} in fees.</b> On the platform, half of every fee is I, the Jury’s revenue.`));
  if(y.reach) out.push(li("info", I.people, `<b>Your shares reached ${num(y.reach)} people</b> and brought ${num(y.referred)} new traders.`));
  if(!y.txns.length) out.push(li("info", I.info, `<b>You kept all $${num(SCN.credits)} in cash.</b> Nothing lost, nothing learned. Run it again and trade.`));
  return out;
}
function badgesOf(){
  const y = Y(), b = [];
  const k = id => mkOf(id).k;
  if(y.txns.some(x => x.m === k("pruitt-scotus") && x.t >= M.cal.slow[0].t && x.t <= M.cal.slow[0].t + M.cal.slow[0].secs)) b.push("Traded the live argument");
  if(y.held[k("h1b-block")] < 0) b.push("Read the deadline");
  if(y.held[k("lumen-fairuse")] < 0) b.push("Read the rules");
  if(y.held[k("pruitt-scotus")] > 0 && y.txns.some(x => x.m === k("pruitt-scotus") && x.dir === "yes" && x.op === "buy" && x.avg < 46)) b.push("Bought the panic");
  if(y.held[k("corvid-verdict")] > 0) b.push("Trusted the jury");
  const sc = IDS.map(id => SimEngine.verdictScore(E, k(id))).filter(Boolean);
  if(sc.length >= 3 && sc.filter(x => x.you < x.market).length >= Math.ceil(sc.length / 2)) b.push("Beat the market’s forecasts");
  return b;
}
function histogramSVG(rets, me, W = 600){
  const H = 200, L = 36, R = 10, T = 24, B = 24, lo = -1, hi = 2, bw = .1;
  const nb = Math.round((hi - lo) / bw), bins = new Array(nb).fill(0);
  rets.forEach(r => bins[clamp(Math.floor((r - lo) / bw), 0, nb - 1)]++);
  const mx = Math.max(...bins), slot = (W - L - R) / nb, barW = Math.max(2, slot - 2);
  const x = k => L + slot * k + (slot - barW) / 2, y = n => T + (H - T - B) * (1 - n / mx);
  const mine = clamp(Math.floor((me - lo) / bw), 0, nb - 1);
  let g = "";
  [0, Math.round(mx / 2), mx].forEach(n => { g += `<line class="lc-grid" x1="${L}" x2="${W - R}" y1="${y(n).toFixed(1)}" y2="${y(n).toFixed(1)}"/><text class="lc-axis r" x="${L - 6}" y="${(y(n) + 3.5).toFixed(1)}">${n}</text>`; });
  [-1, -.5, 0, .5, 1, 1.5, 2].forEach(v => { g += `<text class="lc-axis" x="${(L + (v - lo) / bw * slot).toFixed(1)}" y="${H - 7}" text-anchor="middle">${v > 0 ? "+" : v < 0 ? MINUS : ""}${Math.abs(v * 100)}%</text>`; });
  const z = L + (0 - lo) / bw * slot;
  g += `<line class="hg-zero" x1="${z.toFixed(1)}" x2="${z.toFixed(1)}" y1="${T - 6}" y2="${H - B}"/>`;
  bins.forEach((n, k) => { if(!n) return; const h = H - B - y(n); g += `<rect class="hg-bar${k === mine ? " you" : ""}" x="${x(k).toFixed(1)}" y="${y(n).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2"><title>${n} traders</title></rect>`; });
  g += `<text class="hg-you" x="${(x(mine) + barW / 2).toFixed(1)}" y="${(y(bins[mine]) - 7).toFixed(1)}" text-anchor="middle">You</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="How every ranked trader finished">${g}</svg>`;
}
async function copyResult(){
  const b = boardNow(), total = SimEngine.value(E, Y());
  const text = `I turned $${num(SCN.credits)} of practice credits into ${usd2(total)} (${pctS(total / START - 1)}) in I, the Jury Live: six months of court rulings in ten minutes. #${num(b.me + 1)} of ${num(b.rows.length)} traders.`;
  try{ await navigator.clipboard.writeText(text); toast("Result copied."); }catch(e){ toast("Couldn’t copy here."); }
}

/* ============ sheets ============ */
const sheet = $("#sheet"), scrim = $("#scrim");
let sheetOpen = false, sheetTick = null, sheetKind = "", lastFocus = null;
function openSheet(html, kind, tickFn){
  if(!sheetOpen) lastFocus = document.activeElement;
  sheet.className = "sheet " + kind;
  sheet.innerHTML = '<div class="grip"></div>' + html;
  sheet.classList.add("on"); scrim.classList.add("on");
  sheetOpen = true; sheetKind = kind; sheetTick = tickFn || null;
  setTimeout(() => { const f = sheet.querySelector("button.seg-on, input:not([type=range]), button:not([disabled])"); f && f.focus({preventScroll: true}); }, 200);
}
/* Closing returns focus to whatever opened the sheet, except after a
   trade: then nothing keeps it, so the presenter's next Space press plays
   the clock instead of reopening the ticket. */
function closeSheet(done){
  if(!sheetOpen) return;
  sheet.classList.remove("on"); scrim.classList.remove("on");
  sheetOpen = false; sheetTick = null; sheetKind = "";
  if(done){ if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
  else lastFocus && lastFocus.focus && lastFocus.focus({preventScroll: true});
}
scrim.addEventListener("click", closeSheet);

/* The ticket. Its numbers stay live while it is open: the clock doesn't
   stop for anyone, so the price on the button is the price you get. */
function openTicket(id, dir, op){
  if(!MKT[id]) return;
  const mk = mkOf(id);
  let type = "market", dollars = 100, frac = 1, lim = null, msg = "";
  const T = {id, dir, op};
  const draw = () => {
    if(mk.status !== "open"){ openSheet(`<h2 id="sheetTitle">This market has closed</h2><p class="sub">${esc(MKT[id].q)}</p><button class="btn primary" data-x>OK</button>`, "ticket"); sheet.querySelector("[data-x]").onclick = closeSheet; return; }
    const p = myPos(id), buy = T.op === "buy", yes = T.dir === "yes";
    const side = T.dir === "yes" ? "Yes" : "No";
    const best = buy ? (yes ? yesAsk(mk) : noAsk(mk)) : (yes ? (mk.bb >= 1 ? mk.bb : null) : (mk.ba <= 99 ? 100 - mk.ba : null));
    if(lim == null) lim = best != null ? (buy ? Math.max(1, best - 2) : Math.min(99, best + 2)) : 50;
    const cash = snap.cash;
    openSheet(`<h2 id="sheetTitle">${buy ? "Buy" : "Sell"} ${side}</h2>
      <p class="sub">${esc(MKT[id].q)}</p>
      ${buy ? `<div class="seg" role="group" aria-label="Side"><button class="yn yes${yes ? " seg-on" : ""}" data-dir="yes" aria-pressed="${yes}"><span>Yes</span><b data-v="yes:${id}"></b></button><button class="yn no${!yes ? " seg-on" : ""}" data-dir="no" aria-pressed="${!yes}"><span>No</span><b data-v="no:${id}"></b></button></div>` : ""}
      <div class="tabs2" role="group" aria-label="Order type"><button data-ty="market" aria-pressed="${type === "market"}">At the market</button><button data-ty="limit" aria-pressed="${type === "limit"}">Limit order</button></div>
      ${type === "limit" ? `<label class="f">Your price for ${side}</label><div class="stepper"><button data-lim="-1" aria-label="Lower">${I.minus}</button><output id="tLim">${lim}¢</output><button data-lim="1" aria-label="Higher">${I.plus}</button></div>
        <p class="hint">${buy ? `Rests in the book until someone sells ${side} to you at ${lim}¢ or less.` : `Rests in the book until someone buys your ${side} at ${lim}¢ or more.`} If it crosses the market, it fills now.</p>` : ""}
      ${buy ? `<label class="f" id="amtL">How much to spend</label>
        <div class="amts" role="group" aria-labelledby="amtL">${[25, 100, 250].map(a => `<button data-a="${a}" aria-pressed="${dollars === a}"${a * 100 > cash ? " disabled" : ""}>$${a}</button>`).join("")}<button data-a="all" aria-pressed="false"${cash < 100 ? " disabled" : ""}>All ${usd(cash)}</button></div>
        <div class="money"><span>$</span><input class="inp" id="tAmt" inputmode="decimal" value="${dollars}" aria-label="Dollars to spend"></div>`
      : `<label class="f" id="frL">How much of your ${num(p.n - p.locked)} ${side}</label>
        <div class="amts" role="group" aria-labelledby="frL" style="grid-template-columns:repeat(3,1fr)">${[[.25, "A quarter"], [.5, "Half"], [1, "All"]].map(([f, l]) => `<button data-fr="${f}" aria-pressed="${frac === f}">${l}</button>`).join("")}</div>`}
      <div class="quote" data-q="quote"></div>
      <div class="err" id="tErr">${esc(msg)}</div>
      <button class="btn primary big" id="tGo"></button>
      <p class="hint">Practice credits, no cash value. Your order trades against the simulated traders in the book.</p>`, "ticket", live);
    sheet.querySelectorAll("[data-dir]").forEach(b => b.onclick = () => { if(T.dir !== b.dataset.dir){ T.dir = b.dataset.dir; lim = null; msg = ""; draw(); } });
    sheet.querySelectorAll("[data-ty]").forEach(b => b.onclick = () => { type = b.dataset.ty; msg = ""; draw(); });
    sheet.querySelectorAll("[data-lim]").forEach(b => b.onclick = () => { lim = clamp(lim + +b.dataset.lim, 1, 99); $("#tLim").textContent = lim + "¢"; quote(); });
    sheet.querySelectorAll("[data-a]").forEach(b => b.onclick = () => { dollars = b.dataset.a === "all" ? Math.floor(snap.cash / 100) : +b.dataset.a; $("#tAmt").value = dollars; mark(); quote(); });
    sheet.querySelectorAll("[data-fr]").forEach(b => b.onclick = () => { frac = +b.dataset.fr; sheet.querySelectorAll("[data-fr]").forEach(x => x.setAttribute("aria-pressed", String(+x.dataset.fr === frac))); quote(); });
    const inp = $("#tAmt");
    if(inp) inp.oninput = () => { inp.value = inp.value.replace(/[^\d.]/g, "").slice(0, 7); dollars = Math.max(0, parseFloat(inp.value) || 0); mark(); quote(); };
    $("#tGo").onclick = submit;
    quote();
    paint(sheet);
  };
  const mark = () => sheet.querySelectorAll("[data-a]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.a === "all" ? dollars === Math.floor(snap.cash / 100) : +b.dataset.a === dollars)));
  /* what the order comes to right now */
  const plan = () => {
    const p = myPos(id), buy = T.op === "buy", yes = T.dir === "yes";
    if(buy && p.n && p.side !== T.dir) return {err: `You hold ${p.side === "yes" ? "Yes" : "No"} here. Sell it before buying ${yes ? "Yes" : "No"}.`};
    if(type === "market"){
      const pv = SimEngine.preview(E, id, T.dir, T.op, buy ? {dollars} : {qty: Math.floor((p.n - p.locked) * frac)});
      if(!pv || pv.empty) return {err: "Nobody is offering on this side right now."};
      return {pv, qty: pv.qty, buy, yes};
    }
    const qty = buy ? Math.floor(dollars * 100 / (lim * 1.01)) : Math.floor((p.n - p.locked) * frac);
    return {qty, buy, yes, lim};
  };
  const quote = () => {
    const box = sheet.querySelector('[data-q="quote"]'), go1 = $("#tGo");
    if(!box) return;
    const r = plan(), side = T.dir === "yes" ? "Yes" : "No";
    if(r.err){ box.innerHTML = `<p class="hint err-in">${esc(r.err)}</p>`; go1.textContent = "Can’t place this"; go1.disabled = true; return; }
    if(type === "market"){
      const pv = r.pv;
      if(!pv.qty){ box.innerHTML = `<p class="hint">${r.buy ? "Choose an amount." : "Nothing to sell."}</p>`; go1.textContent = r.buy ? "Choose an amount" : "Nothing to sell"; go1.disabled = true; return; }
      const slip = pv.worst != null && pv.levels > 1 ? Math.abs(pv.worst - pv.bestUnit) : 0;
      if(r.buy){
        const gain = pv.payout - pv.total;
        box.innerHTML = `<dl class="qt"><dt>Contracts</dt><dd>${num(pv.qty)} ${side}</dd><dt>Average price</dt><dd>${ct1(pv.avg)}${slip ? ` <small>best ${ct(pv.bestUnit)}, your size moves it ${slip}¢</small>` : ""}</dd>
          <dt>Fee (1%)</dt><dd>${usd2(pv.fee)}</dd><dt>You pay</dt><dd><b>${usd2(pv.total)}</b></dd></dl>
          <div class="payoff"><span>If ${side}, you get</span><b>${usd2(pv.payout)}</b><em class="c-yes">${sUsd2(gain)} · ${pctS(gain / pv.total)}</em></div>
          <div class="payoff lose"><span>If not</span><b>$0.00</b><em class="c-no">${sUsd2(-pv.total)}</em></div>`;
        go1.textContent = `Buy ${num(pv.qty)} ${side} · ${usd2(pv.total)}`;
      } else {
        const p = myPos(id), cost = p.avg * pv.qty;
        box.innerHTML = `<dl class="qt"><dt>Selling</dt><dd>${num(pv.qty)} ${side}</dd><dt>Average price</dt><dd>${ct1(pv.avg)}</dd><dt>Fee (1%)</dt><dd>${usd2(pv.fee)}</dd>
          <dt>You receive</dt><dd><b>${usd2(pv.proceeds)}</b></dd><dt>They cost you</dt><dd>${usd2(cost)}</dd><dt>Gain or loss</dt><dd class="${pv.proceeds - cost >= 0 ? "c-yes" : "c-no"}">${sUsd2(pv.proceeds - cost)}</dd></dl>`;
        go1.textContent = `Sell ${num(pv.qty)} ${side} · ${usd2(pv.proceeds)}`;
      }
      go1.disabled = false;
      return;
    }
    if(!(r.qty > 0)){ box.innerHTML = `<p class="hint">${r.buy ? "Choose an amount." : "Nothing to sell."}</p>`; go1.textContent = "Choose an amount"; go1.disabled = true; return; }
    box.innerHTML = r.buy ? `<dl class="qt"><dt>Contracts</dt><dd>${num(r.qty)} ${side} at ${r.lim}¢</dd><dt>Held for the order</dt><dd>${usd2(r.qty * r.lim * 1.01)}</dd></dl>
        <div class="payoff"><span>If it fills and ${side} wins</span><b>${usd2(r.qty * 100)}</b><em class="c-yes">${sUsd2(r.qty * (100 - r.lim))}</em></div>`
      : `<dl class="qt"><dt>Offering</dt><dd>${num(r.qty)} ${side} at ${r.lim}¢</dd><dt>You’d receive</dt><dd>${usd2(r.qty * r.lim * .99)}</dd></dl>`;
    go1.textContent = `Place order: ${r.buy ? "buy" : "sell"} ${num(r.qty)} ${side} at ${r.lim}¢`;
    go1.disabled = false;
  };
  const submit = () => {
    const r = plan();
    if(r.err || !(r.qty > 0)) return;
    const res = SimEngine.act(E, {k: "order", m: id, dir: T.dir, op: T.op, type, qty: r.qty, px: lim});
    if(!res || !res.ok){ msg = res && res.msg || "That didn’t go through."; $("#tErr").textContent = msg; return; }
    const tx = res.tx, side = T.dir === "yes" ? "Yes" : "No";
    closeSheet(true);
    if(tx.qty) addFeed(feedTx(tx), false);
    if(type === "market" || tx.qty) toast(`${I.check}<span>${T.op === "buy" ? "Bought" : "Sold"} <b>${num(tx.qty)} ${side}</b> at ${ct1(tx.avg)}${tx.fee ? ` · fee ${usd2(tx.fee)}` : ""}${tx.restQ ? `. ${num(tx.restQ)} more resting at ${lim}¢` : ""}.</span>`);
    else toast(`${I.check}<span>Order placed: ${T.op} <b>${num(tx.restQ)} ${side}</b> at ${lim}¢. It rests in the book.</span>`);
    flash(id); save(); tick(performance.now(), true);
  };
  /* a market closing under an open ticket changes what it is for */
  let shape = mk.status;
  const live = () => { if(mk.status !== shape){ shape = mk.status; draw(); } else { quote(); paint(sheet); } };
  draw();
}

function openSettings(){
  openSheet(`<h2 id="sheetTitle">Run settings</h2><p class="sub">For whoever is presenting.</p>
    <label class="f">How long the run takes</label>
    <div class="speeds">${SPEEDS.map(s => `<button data-sp="${s}" aria-pressed="${s === st.speed}">${speedLabel(s)}<small>${mmss(LEN / s)}</small></button>`).join("")}</div>
    <div class="set-row"><div><b>Pause for big moments</b><small>Stop the clock when a breaking card slides in, until you press Continue.</small></div>
      <input type="checkbox" class="tgl" id="setMom"${st.set.pauseMoments ? " checked" : ""} aria-label="Pause for big moments"></div>
    <div class="set-row"><div><b>Run the live argument at 1×</b><small>Slow the clock for the hour of Supreme Court argument, so every question can be read.</small></div>
      <input type="checkbox" class="tgl" id="setArg"${st.set.slowArg ? " checked" : ""} aria-label="Run the live argument at 1x"></div>
    <div class="set-row"><div><b>Skip ahead</b><small data-q="next"></small></div><button class="btn ghost" id="setNext" style="width:auto;padding:10px 14px">${I.next}Next</button></div>
    <button class="btn ghost" id="setKeys" style="width:100%;margin-top:12px">${I.key}Keyboard shortcuts</button>
    <button class="btn ghost" id="setRestart" style="width:100%;margin-top:8px">${I.replay}Restart the simulation</button>`, "settings", () => {
      const n = nextEvent(), el = sheet.querySelector('[data-q="next"]');
      const t = st.done ? "The term is over." : n ? `Next: ${dShort(n.t)}, ${n.title}` : "Straight to the end.";
      if(el && el.textContent !== t) el.textContent = t;
    });
  sheet.querySelectorAll("[data-sp]").forEach(b => b.onclick = () => setSpeed(+b.dataset.sp));
  $("#setMom").onchange = e => { st.set.pauseMoments = e.target.checked; save(); };
  $("#setArg").onchange = e => { st.set.slowArg = e.target.checked; save(); };
  $("#setNext").onclick = () => { closeSheet(); skip(); };
  $("#setKeys").onclick = openKeys;
  $("#setRestart").onclick = openRestart;
  sheetTick();
}
function openKeys(){
  openSheet(`<h2 id="sheetTitle">Keyboard shortcuts</h2><p class="sub">Handy when presenting from a laptop.</p>
    <ul class="keys"><li><kbd>Space</kbd>Play or pause the clock</li><li><kbd>N</kbd>Skip to the next big moment</li>
    <li><kbd>1</kbd><kbd>2</kbd><kbd>4</kbd>Run at 1×, 2× or 4×, and <kbd>0</kbd> for half speed</li>
    <li><kbd>M</kbd>Markets <kbd>P</kbd>Portfolio <kbd>B</kbd>Business <kbd>S</kbd>Standings</li>
    <li><kbd>Y</kbd><kbd>X</kbd>Buy Yes or No on the market you’re looking at</li><li><kbd>Esc</kbd>Close whatever is open</li></ul>
    <button class="btn primary" id="kOk" style="margin-top:16px">Got it</button>`, "keys");
  $("#kOk").onclick = closeSheet;
}
function openRestart(){
  openSheet(`<h2 id="sheetTitle">Start again?</h2><p class="sub">The clock goes back to ${esc(dShort(0))}, you get $${num(SCN.credits)} of fresh practice credits, and every market reopens. Your run settings stay as they are.</p>
    <button class="btn primary" id="rGo">${I.replay}Restart the simulation</button>
    <button class="btn ghost" id="rNo" style="width:100%;margin-top:8px">Keep going</button>`, "restart");
  $("#rGo").onclick = () => { closeSheet(); restart(); toast("<span>Fresh start. Every market is open.</span>"); };
  $("#rNo").onclick = closeSheet;
}

/* ============ navigation ============ */
const KEY_SPEED = {"0": .5, "1": 1, "2": 2, "4": 4};
let view = "markets", prevView = "markets";
function go(v){
  if(v !== view && momentE) hideMoment(true);
  if(v !== "market"){ prevView = v; mId = null; $("#v-market").innerHTML = ""; }
  view = v;
  $("#app").dataset.view = v;
  $$(".view").forEach(el => el.classList.toggle("on", el.id === "v-" + v));
  $$("#nav button[data-go]").forEach(b => b.dataset.go === v || (v === "market" && b.dataset.go === "markets") ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  if(v === "markets" && !$("#v-markets .mk-wrap")) renderMarkets();
  if(v === "markets") tickMarkets(true, true);
  if(v === "port") renderPort();
  if(v === "biz") renderBiz();
  if(v === "stand") renderStand();
  const pane = $("#v-" + v); if(pane && v !== "market") pane.scrollTop = 0;
  tick(performance.now(), true);
}
$$("#nav button[data-go]").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));

function act(ev){
  if(ev.target.closest("[data-back]")){ go(prevView || "markets"); return; }
  const g2 = ev.target.closest("[data-go2]");
  if(g2){ go(g2.dataset.go2); return; }
  const a = ev.target.closest("[data-act]");
  if(a){
    const id = a.dataset.m || mId;
    switch(a.dataset.act){
      case "start": setPlaying(true); break;
      case "buy": openTicket(id, a.dataset.dir || "yes", "buy"); break;
      case "sell": openTicket(id, a.dataset.dir, "sell"); break;
      case "cancel": { const r = SimEngine.act(E, {k: "cancel", id: +a.dataset.id}); if(r && r.ok){ toast("Order cancelled."); save(); tick(performance.now(), true); } break; }
      case "verdict": { const inp = $("#vdIn"); if(!inp) break; const p = +inp.value; const r = SimEngine.act(E, {k: "verdict", m: id, p});
        if(r && r.ok){ toast(`${I.scale}<span>Verdict recorded: <b>${p}%</b>. It will be scored when the question resolves.</span>`); save(); tick(performance.now(), true); } break; }
      case "share": share(id); break;
      case "again": case "restart": openRestart(); break;
      case "copy": copyResult(); break;
      case "keys": openKeys(); break;
      case "more": feedOpen = true; renderFeed(true); break;
    }
    return;
  }
  const o = ev.target.closest("[data-open]");
  if(o && !ev.target.closest("button:not([data-open])")) openMarket(o.dataset.open);
}
$(".panes").addEventListener("click", act);
$("#navWallet").addEventListener("click", act);

async function share(id){
  const url = location.origin + location.pathname + "#m=" + id;
  try{ await navigator.clipboard.writeText(`${MKT[id].q} Trading on I, the Jury Live: ${url}`); }catch(e){}
  const r = SimEngine.act(E, {k: "share", m: id});
  if(r && r.ok){
    toast(`${I.people}<span>Link copied. <b>${num(r.opened)} people</b> opened it and ${plural(r.joined, "started", "started")} trading.</span>`);
    addFeed({t: E.t, kind: "you", m: id, html: `<b>You</b> shared ${esc(shortOf(id))}. ${num(r.opened)} people opened it; ${num(r.joined)} joined.`}, false);
    save();
  }
}

/* the sheet's own buttons */
sheet.addEventListener("click", ev => { if(ev.target.closest("[data-x]")) closeSheet(); });

document.addEventListener("keydown", e => {
  const tag = (e.target.tagName || "").toLowerCase();
  if(tag === "input" && e.target.type !== "range" || tag === "textarea") return;
  if(e.key === "Escape"){
    if(sheetOpen) closeSheet();
    else if(momentE || argLive) hideMoment(!!argLive && !argLive.over);
    return;
  }
  if(sheetOpen || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if(e.key === " " && tag !== "button" && tag !== "a"){ e.preventDefault(); st.done ? go("stand") : setPlaying(!playing); }
  else if(k === "n" || e.key === "ArrowRight"){ e.preventDefault(); skip(); }
  else if(KEY_SPEED[e.key]) setSpeed(KEY_SPEED[e.key]);
  else if(k === "m") go("markets");
  else if(k === "p") go("port");
  else if(k === "b") go("biz");
  else if(k === "s") go("stand");
  else if((k === "y" || k === "x") && view === "market" && mId && isOpen(mId)) openTicket(mId, k === "y" ? "yes" : "no", "buy");
  else if(e.key === "?") openKeys();
});
addEventListener("pagehide", save);
document.addEventListener("visibilitychange", () => { if(document.visibilityState === "hidden") save(); });
addEventListener("resize", () => { lastChart = 0; mapDrawn = false; });

/* ============ start ============ */
(function boot(){
  if(flags.has("jump")){
    const j = Math.max(0, Math.min(LEN, parseFloat(flags.get("jump")) || 0));
    const to = Math.floor(j / DT);
    if(to > E.s){ st.started = true; SimEngine.runTo(E, to, []); clockT = E.t; }
  }
  if(E.s >= STEPS) st.done = true;
  if(E.s > 0) st.started = true;
  if(flags.has("reset") || flags.has("jump")){
    const q = location.search.slice(1).split("&").filter(p => p && !/^(reset|jump)(=|$)/.test(p)).join("&");
    history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
  }
  save();
  rebuildFeed();
  snap = snapshot();
  renderBar();
  renderMarkets();
  renderWallet(true);
  go(st.done ? "stand" : "markets");
  const linked = (location.hash.match(/^#m=([\w-]+)/) || [])[1];
  if(linked && MKT[linked]) openMarket(linked);
  if(flags.has("autoplay") && !st.done) setPlaying(true);
  requestAnimationFrame(t => { lastNow = t; frame(t); });
})();
})();
