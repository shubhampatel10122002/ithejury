/* =====================================================================
   I, the Jury — the platform
   ---------------------------------------------------------------------
   A static single-page app. Hash routes (#/, #/m/<id>, #/c/<cat>...),
   one function per page that returns HTML, and one click handler for
   every control (data-act). Prices move on their own, a small random
   walk with the odd trade, so the demo is alive. Your account (practice
   credits, positions, watchlist) lives in this browser's localStorage.
   ===================================================================== */
(() => {
"use strict";

/* ============ helpers ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const NOW0 = Date.now();
const MIN = 6e4, HR = 36e5, DAY = 864e5;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function hash(s){ let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed){ let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r){ let u = 0, v = 0; while(!u) u = r(); while(!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

const usd = (x, dp = 2) => (x < 0 ? "-" : "") + "$" + Math.abs(x).toLocaleString("en-US", {minimumFractionDigits: dp, maximumFractionDigits: dp});
const usd0 = x => usd(Math.round(x), 0);
const usdK = x => x >= 1e6 ? "$" + (x / 1e6).toFixed(x >= 1e7 ? 0 : 1) + "M" : x >= 1e3 ? "$" + Math.round(x / 1e3) + "K" : usd0(x);
const num = x => Math.round(x).toLocaleString("en-US");
const pct = p => p < 1 ? "<1%" : p > 99 ? ">99%" : Math.round(p) + "%";
const dShort = t => { const d = new Date(t); return MON[d.getMonth()] + " " + d.getDate(); };
const dLong = t => { const d = new Date(t); return MON[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); };
const tClock = t => { const d = new Date(t); let h = d.getHours(); const m = d.getMinutes(), ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12; return h + ":" + String(m).padStart(2, "0") + ap; };
const ago = min => min < 1 ? "now" : min < 60 ? Math.round(min) + "m" : min < 1440 ? Math.round(min / 60) + "h" : Math.round(min / 1440) + "d";
const IMG = k => "app/img/" + k + ".jpg";
const isNarrow = () => matchMedia("(max-width:980px)").matches;
let uid = 0;

/* ============ icons ============ */
const IC = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  right: '<path d="m9 6 6 6-6 6"/>', left: '<path d="m15 6-6 6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chat: '<path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1-4.4A8.5 8.5 0 1 1 20.5 12z"/>',
  repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  scale: '<path d="M12 3v18M8 21h8M5 7h14M5 7 2.5 13a2.6 2.6 0 0 0 5 0L5 7zM19 7l-2.5 6a2.6 2.6 0 0 0 5 0L19 7z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.8 3.2 7.9 7.5 9 4.3-1.1 7.5-4.2 7.5-9V6L12 3z"/><path d="m9 12 2 2 4-4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
  dollar: '<circle cx="12" cy="12" r="9"/><path d="M15 9.4c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2.1 3 .9 3 2.1-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6.3v11.4"/>',
  bars: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M10 20v-5.5h4V20"/>',
  radio: '<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10.5h18M16 15h2"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 21h7M10 17h4v4h-4z"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/>',
  gavel: '<path d="m14 4 6 6M11.5 6.5l6 6M13 5l-5.5 5.5 6 6L19 11M10.2 13.2 3.5 20"/>',
  download: '<path d="M12 4v11M8 11l4 4 4-4M5 20h14"/>'
};
const icon = (k, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
const MARK = `<span class="mk" aria-hidden="true"><svg viewBox="0 0 24 24"><text x="12" y="18.4" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="18" fill="#F5B82E">I</text></svg></span>`;
const LOGO = `<a class="logo" href="#/" aria-label="I, the Jury, home">${MARK}<span>I<i>,</i> the Jury</span></a>`;

/* ============ markets ============ */
const CAT = Object.fromEntries(ITJ.cats.map(c => [c.id, c]));
const USER = Object.fromEntries(ITJ.users.map(u => [u.h, u]));
const LIST = ITJ.markets;
const MK = {};
const PALETTE = ["#00A866", "#2563EB", "#9333EA", "#F59E0B", "#E11D48", "#0891B2"];

function closeTime(c){
  const d = new Date(NOW0);
  if(c === "fri"){ let add = (5 - d.getDay() + 7) % 7; if(add === 0 && d.getHours() >= 17) add = 7; d.setDate(d.getDate() + add); }
  else d.setDate(d.getDate() + c);
  d.setHours(17, 0, 0, 0);
  return +d;
}
function walk(r, n, a, b, vol, jumps){
  const x = [a];
  for(let i = 1; i < n; i++) x.push(x[i - 1] + gauss(r) * vol);
  for(let j = 0; j < jumps; j++){
    const at = 1 + Math.floor(r() * Math.max(1, n - 2)), size = (r() - .5) * vol * 10;
    for(let i = at; i < n; i++) x[i] += size;
  }
  const err = b - x[n - 1];
  return x.map((v, i) => clamp(v + err * i / Math.max(1, n - 1), 1, 99));
}
for(const m of LIST){
  MK[m.id] = m;
  m.outs = m.kind === "binary" ? [{n: "Yes", p: m.p}] : m.kind === "vs" ? m.sides : m.outcomes;
  m.closeAt = closeTime(m.close);
  m.listedAt = NOW0 - m.listed * DAY;
  m.comments = 14 + hash(m.id) % 380;
  m.outs.forEach((o, i) => {
    o.i = i; o.color = o.color || PALETTE[i % PALETTE.length]; o.base = o.p; o.live = [];
    const r = rng(hash(m.id + "|" + o.n));
    const sd = Math.sqrt(o.p * (100 - o.p)) / 50;                  /* quieter near 0 and 100 */
    const days = Math.max(3, Math.round(m.listed));
    o.d = walk(r, days + 1, clamp(o.p + (r() - .5) * 34, 3, 97), o.p, 2.6 * sd, 3);
    const hours = Math.min(720, days * 24);
    o.h = walk(r, hours + 1, o.d[Math.max(0, o.d.length - 1 - Math.ceil(hours / 24))], o.p, .5 * sd, 2);
    o.f = walk(r, 289, o.h[Math.max(0, o.h.length - 25)], o.p, .35 * sd, 1);   /* last 24h, every 5 minutes */
    o.vol = m.vol * (m.outs.length > 1 ? (o.p + 8) / m.outs.reduce((a, x) => a + x.p + 8, 0) : 1);
  });
}
const yesAsk = o => clamp(Math.round(o.p + .6), 1, 99);
const noAsk = o => clamp(Math.round(100 - o.p + .6), 1, 99);
const yesBid = o => 100 - noAsk(o);
const noBid = o => 100 - yesAsk(o);
const payout = c => usd0(100 * 100 / c);
const lead = m => m.kind === "binary" ? m.outs[0] : m.outs.reduce((a, o) => o.p > a.p ? o : a);
const ch24 = o => o.p - o.f[0];
const trending = () => LIST.filter(m => (m.tags || []).includes("trending")).sort((a, b) => b.vol - a.vol);
const newest = () => LIST.slice().sort((a, b) => a.listed - b.listed);
const closing = () => LIST.slice().sort((a, b) => a.closeAt - b.closeAt);
const liveNow = () => LIST.filter(m => m.live).sort((a, b) => b.vol - a.vol);
const inCat = c => LIST.filter(m => m.cat === c).sort((a, b) => b.vol - a.vol);
const sortedOuts = m => m.exclusive ? m.outs.slice().sort((a, b) => b.p - a.p) : m.outs.slice();
const rulesText = m => esc(m.rules.replace("{close}", dLong(m.closeAt))).replace(/\b(Yes)\b/g, '<span class="yes">$1</span>');

/* ============ your account ============ */
const KEY = "itj_app_v1";
const blank = () => ({v: 1, user: null, cash: 0, pos: {}, hist: [], watch: [], liked: [], posts: [], realized: 0});
let S = blank();
try{ const s = JSON.parse(localStorage.getItem(KEY)); if(s && s.v === 1) S = {...blank(), ...s}; }catch(e){}
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} };
const posKey = (mid, oi, side) => mid + "|" + oi + "|" + side;
const posList = () => Object.entries(S.pos).filter(([, p]) => p.qty > 0).map(([k, p]) => {
  const [mid, oi, side] = k.split("|"); const m = MK[mid]; if(!m) return null;
  const o = m.outs[+oi]; const mark = side === "yes" ? o.p : 100 - o.p;
  return {k, m, o, side, qty: p.qty, cost: p.cost, value: p.qty * mark / 100, avg: p.cost / p.qty * 100};
}).filter(Boolean);
const posValue = () => posList().reduce((a, p) => a + p.value, 0);
const pv = () => S.cash + posValue();

/* ============ live prices ============ */
const WEIGHT = LIST.map(m => (m.live ? 3 : 1) * ((m.tags || []).includes("trending") ? 2 : 1));
const WSUM = WEIGHT.reduce((a, b) => a + b, 0);
const NAMES = ITJ.users.map(u => u.h).concat(["lex.talionis", "pacer.pro", "docket.diver", "ruling.ruth", "brief.case", "chambers", "quorum", "the.recusal", "nisi.prius", "plaintiff.pat"]);
let ROUTE = {name: "home"};
const TAPE = [];

function pick(){ let x = Math.random() * WSUM; for(let i = 0; i < LIST.length; i++){ x -= WEIGHT[i]; if(x <= 0) return LIST[i]; } return LIST[0]; }
function tradeSize(){ const r = Math.random(); return Math.max(1, Math.round(Math.exp(1.6 + r * 5.2 + (Math.random() < .04 ? 2 : 0)))); }
function push(o, t){ o.live.push({t, p: o.p}); if(o.live.length > 500) o.live.shift(); }
function move(m){
  const now = Date.now();
  const o = m.outs[Math.floor(Math.random() * m.outs.length)];
  const sd = Math.sqrt(o.p * (100 - o.p)) / 50;
  const old = o.p;
  o.p = clamp(o.p + gauss(Math.random) * (m.live ? 1.25 : .55) * sd + (o.base - o.p) * .03, 1, 99);
  const d = o.p - old;
  if(m.kind === "vs"){ const x = m.outs[1 - o.i]; x.p = clamp(x.p - d, 1, 99); push(x, now); }
  else if(m.exclusive){
    const others = m.outs.filter(x => x !== o), tot = others.reduce((a, x) => a + x.p, 0) || 1;
    for(const x of others){ x.p = clamp(x.p - d * x.p / tot, 1, 99); push(x, now); }
  }
  push(o, now);
  const amt = tradeSize();
  m.vol += amt; o.vol += amt;
  const t = {t: now, u: NAMES[Math.floor(Math.random() * NAMES.length)], m, o, side: d >= 0 ? "yes" : "no", amt};
  TAPE.unshift(t); if(TAPE.length > 60) TAPE.pop();
  paint(m);
  onTrade(t);
}
function tick(){
  const n = 2 + Math.floor(Math.random() * 3);
  for(let k = 0; k < n; k++) move(pick());
  if(ROUTE.m && Math.random() < .55) move(ROUTE.m);
}

/* write the new numbers into everything on screen that shows them */
function setText(el, txt, dir){
  if(el.textContent === txt) return;
  el.textContent = txt;
  if(dir){ el.classList.remove("flash-up", "flash-dn"); void el.offsetWidth; el.classList.add(dir > 0 ? "flash-up" : "flash-dn"); }
}
function paint(m){
  for(const el of $$(`[data-b][data-m="${m.id}"]`)){
    const b = el.dataset.b, o = m.outs[+el.dataset.o || 0];
    if(b === "pc"){ const prev = parseFloat(el.textContent) || 0; setText(el, pct(o.p), Math.round(o.p) - prev); }
    else if(b === "ya") setText(el, yesAsk(o) + "¢");
    else if(b === "na") setText(el, noAsk(o) + "¢");
    else if(b === "poy") setText(el, payout(yesAsk(o)));
    else if(b === "pon") setText(el, payout(noAsk(o)));
    else if(b === "vol") setText(el, usd0(m.vol));
    else if(b === "chg"){ const c = Math.round(ch24(o)); el.className = "chg " + (c >= 0 ? "up" : "down"); el.textContent = Math.abs(c); el.hidden = !c; }
  }
  for(const el of $$(`.chart[data-chart="${m.id}"]`)) drawChart(el);
  if(TP.m === m) tpCalc();
  if(ROUTE.name === "m" && ROUTE.m === m) paintMbar();
}
function paintAcct(){
  if(!S.user) return;
  for(const el of $$('[data-b="pv"]')) setText(el, usd(pv()));
  for(const el of $$('[data-b="cash"]')) setText(el, usd(S.cash));
}
function onTrade(t){
  /* the floating ticker on a market's chart */
  if(ROUTE.name === "m" && ROUTE.m === t.m){
    const tape = $(".chart-box .tape");
    if(tape){
      const s = document.createElement("span");
      s.className = t.side === "yes" ? "up" : "down";
      s.textContent = "+ $" + num(t.amt);
      tape.appendChild(s);
      setTimeout(() => s.remove(), 2600);
      while(tape.children.length > 6) tape.firstChild.remove();
    }
  }
  /* the trade feeds */
  for(const ul of $$("[data-tape]")){
    ul.insertAdjacentHTML("afterbegin", tapeItem(t));
    while(ul.children.length > 14) ul.lastElementChild.remove();
  }
  if(S.user && posList().some(p => p.m === t.m)) paintAcct();
}

/* ============ small components ============ */
let AVN = 0;
function avatarSVG(h){
  const r = rng(hash(h)), hue = Math.floor(r() * 360), hue2 = (hue + 50 + Math.floor(r() * 90)) % 360, id = "av" + (++AVN), kind = Math.floor(r() * 3);
  let art = "";
  if(kind === 0){ for(let y = 0; y < 6; y++) for(let x = 0; x < 6; x++) art += `<circle cx="${3.5 + x * 6.6}" cy="${3.5 + y * 6.6}" r="${(.9 + (x + y) * .22).toFixed(2)}" fill="rgba(255,255,255,.82)"/>`; }
  else if(kind === 1){ for(let k = 5; k > 0; k--) art += `<circle cx="20" cy="${26 + k}" r="${k * 4.2}" fill="none" stroke="rgba(255,255,255,${(.15 + k * .07).toFixed(2)})" stroke-width="2"/>`; }
  else { for(let k = 0; k < 7; k++) art += `<rect x="${k * 6}" y="0" width="3" height="40" fill="rgba(255,255,255,${(.1 + k * .05).toFixed(2)})" transform="rotate(35 20 20)"/>`; }
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 72% 46%)"/><stop offset="1" stop-color="hsl(${hue2} 78% 28%)"/></linearGradient></defs><rect width="40" height="40" fill="url(#${id})"/>${art}</svg>`;
}
const avatar = h => USER[h] && USER[h].av ? `<img src="${IMG(USER[h].av)}" alt="">` : avatarSVG(h);
const thumb = (m, cls = "thumb") => `<img class="${cls}" src="${IMG(m.img)}" alt="" loading="lazy">`;
const watched = m => S.watch.includes(m.id);
const plusBtn = m => `<button class="plus" data-act="watch" data-m="${m.id}" aria-pressed="${watched(m)}" aria-label="${watched(m) ? "Remove from" : "Add to"} watchlist">${icon("plus")}</button>`;
const chgB = (m, o) => { const c = Math.round(ch24(o)); return `<span class="chg ${c >= 0 ? "up" : "down"}" data-m="${m.id}" data-o="${o.i}" data-b="chg"${c ? "" : " hidden"}>${Math.abs(c)}</span>`; };
const pcB = (m, o, tag = "span", cls = "") => `<${tag}${cls ? ` class="${cls}"` : ""} data-m="${m.id}" data-o="${o.i}" data-b="pc">${pct(o.p)}</${tag}>`;
const tradeBtn = (m, o, side, label, cls) => `<button class="${cls || (side === "yes" ? "y" : "n")}" data-act="trade" data-m="${m.id}" data-o="${o.i}" data-s="${side}">${label}</button>`;
const sw = o => `<span class="sw" style="background:${o.color}"></span>`;
const markB = o => o.code ? `<span class="mark" style="background:${o.color}">${esc(o.code)}</span>` : sw(o);
function countdown(t){
  let s = Math.max(0, Math.round((t - Date.now()) / 1000));
  const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; const mi = Math.floor(s / 60); s %= 60;
  return d ? `${d}d ${h}h ${mi}m` : [h, mi, s].map(x => String(x).padStart(2, "0")).join(":");
}

/* ============ market card ============ */
function cardBody(m){
  if(m.kind === "binary"){
    const o = m.outs[0];
    return `<div class="bigyn">${tradeBtn(m, o, "yes", "Yes")}${tradeBtn(m, o, "no", "No")}</div>
      <div class="payouts"><span>$100 → <b data-m="${m.id}" data-o="0" data-b="poy">${payout(yesAsk(o))}</b></span><span>$100 → <b data-m="${m.id}" data-o="0" data-b="pon">${payout(noAsk(o))}</b></span></div>`;
  }
  if(m.kind === "vs"){
    return `<div class="vsb">${m.outs.map(o => `<button style="background:${o.color}" data-act="trade" data-m="${m.id}" data-o="${o.i}" data-s="yes">${esc(o.code)} <span data-m="${m.id}" data-o="${o.i}" data-b="ya">${yesAsk(o)}¢</span></button>`).join("")}</div>
      <div class="payouts">${m.outs.map(o => `<span>$100 → <b data-m="${m.id}" data-o="${o.i}" data-b="poy">${payout(yesAsk(o))}</b></span>`).join("")}</div>`;
  }
  return sortedOuts(m).slice(0, 2).map(o => `<div class="orow"><span class="nm">${esc(o.n)}</span>${pcB(m, o, "span", "pc")}<span class="yn">${tradeBtn(m, o, "yes", "Yes")}${tradeBtn(m, o, "no", "No")}</span></div>`).join("");
}
function card(m, opt = {}){
  const big = m.kind === "binary" ? `<div class="big">${pcB(m, m.outs[0])}<small>chance</small></div>` : "";
  const meta = opt.closing ? `<div class="card-meta">${icon("clock", "ic sm")}Closes in <span class="cd" data-cd="${m.closeAt}">${countdown(m.closeAt)}</span></div>`
    : m.live ? `<div class="card-meta"><span class="livetag">Live</span>${esc(m.live)}</div>` : "";
  return `<article class="card">
    <div class="card-hd"><a href="#/m/${m.id}" tabindex="-1">${thumb(m)}</a><a class="tt" href="#/m/${m.id}">${esc(m.title)}</a>${big}</div>
    <div class="card-body">${meta}${cardBody(m)}</div>
    <div class="card-ft"><span class="l"><span><span data-m="${m.id}" data-b="vol">${usd0(m.vol)}</span> vol</span>${m.repeat ? `<span class="rp">${icon("repeat")}${m.repeat}</span>` : ""}</span>${plusBtn(m)}</div>
  </article>`;
}
function railSec(title, href, ms, opt = {}){
  const id = "rail" + (++uid);
  return `<section class="sec"><div class="sec-hd"><h2><a href="${href}">${opt.live ? '<span class="livedot" aria-hidden="true"></span>' : ""}${title}</a></h2>
    <a class="see" href="${href}">See all ${icon("right", "ic sm")}</a>
    <div class="ctrls"><button class="arrow" data-act="rail" data-t="${id}" data-dir="-1" aria-label="Scroll ${esc(title)} left" disabled>${icon("left")}</button><button class="arrow" data-act="rail" data-t="${id}" data-dir="1" aria-label="Scroll ${esc(title)} right">${icon("right")}</button></div></div>
    <div class="rail"><div class="track" id="${id}">${ms.map(m => card(m, opt)).join("")}</div></div></section>`;
}

/* ============ charts ============ */
function seriesFor(o, range){
  let pts;
  if(range === "ALL"){ const n = o.d.length; pts = o.d.map((p, i) => ({t: NOW0 - (n - 1 - i) * DAY, p})); }
  else if(range === "1D"){ const n = o.f.length; pts = o.f.map((p, i) => ({t: NOW0 - (n - 1 - i) * 5 * MIN, p})); }
  else {
    const hrs = range === "1W" ? 168 : 720, n = o.h.length, from = Math.max(0, n - 1 - hrs);
    pts = []; for(let i = from; i < n; i++) pts.push({t: NOW0 - (n - 1 - i) * HR, p: o.h[i]});
  }
  pts = pts.concat(o.live);
  pts.push({t: Date.now(), p: o.p});
  return pts;
}
function thin(pts, max){
  if(pts.length <= max) return pts;
  const k = pts.length / max, out = [];
  for(let i = 0; i < max - 1; i++) out.push(pts[Math.floor(i * k)]);
  out.push(pts[pts.length - 1]);
  return out;
}
function smooth(pts, k){
  /* a centred moving average, keeping the last point exact so the line ends on the price */
  return pts.map((p, i) => {
    if(i === pts.length - 1) return p;
    let s = 0, n = 0;
    for(let j = Math.max(0, i - k); j <= Math.min(pts.length - 1, i + k); j++){ s += pts[j].p; n++; }
    return {t: p.t, p: s / n};
  });
}
function ticks(lo, hi, n){
  const span = hi - lo, steps = [1, 2, 5, 10, 20, 25, 50];
  const step = steps.find(s => span / s <= n) || 50;
  const out = []; for(let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v);
  return out;
}
function chartOuts(m, mode){
  if(m.kind === "binary") return [m.outs[0]];
  if(m.kind === "vs") return m.outs;
  return (m.exclusive ? sortedOuts(m) : m.outs).slice(0, mode === "hero" ? 3 : 5);
}
function fmtAxis(t, range){
  const d = new Date(t);
  if(range === "1D") return tClock(t).replace(":00", "");
  if(range === "1W") return DOW[d.getDay()] + " " + d.getDate();
  return dShort(t);
}
function drawChart(el){
  const m = MK[el.dataset.chart]; if(!m) return;
  const mode = el.dataset.mode || "full", range = el.dataset.range || "1M";
  const W = el.clientWidth, H = el.clientHeight; if(W < 40 || H < 40) return;
  const outs = chartOuts(m, mode);
  const S2 = outs.map(o => ({o, pts: mode === "hero" ? smooth(thin(seriesFor(o, range), 90), 3) : thin(seriesFor(o, range), 260)}));
  const t0 = S2[0].pts[0].t, t1 = S2[0].pts[S2[0].pts.length - 1].t;
  const v = S2.flatMap(s => s.pts.map(p => p.p));
  let lo = Math.min(...v), hi = Math.max(...v);
  const pad = Math.max(3, (hi - lo) * .16), step = outs.length === 1 ? 5 : 10;
  lo = Math.max(0, Math.floor((lo - pad) / step) * step); hi = Math.min(100, Math.ceil((hi + pad) / step) * step);
  const minSpan = mode === "hero" ? 40 : 20;
  if(hi - lo < minSpan){ const c = (hi + lo) / 2; lo = Math.max(0, c - minSpan / 2); hi = Math.min(100, lo + minSpan); lo = Math.max(0, hi - minSpan); }
  const labels = mode === "hero" || outs.length > 1;
  const padR = labels ? (mode === "hero" ? 128 : 150) : 52, padT = 16, padB = mode === "full" ? 28 : 10;
  const pw = W - padR;
  const X = t => (t - t0) / ((t1 - t0) || 1) * pw;
  const Y = p => padT + (1 - (p - lo) / ((hi - lo) || 1)) * (H - padT - padB);
  const gid = "cg" + (++uid);
  let g = "";
  for(const v of ticks(lo, hi, mode === "hero" ? 4 : 5)){
    g += `<line x1="0" x2="${pw}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#EDEFF1" ${mode === "hero" ? 'stroke-dasharray="2 5"' : ""}/>`;
    if(!labels || mode === "full") g += `<text class="ax" x="${pw + (labels ? 132 : 10)}" y="${(Y(v) + 4).toFixed(1)}" ${labels ? 'text-anchor="end"' : ""}>${v}%</text>`;
  }
  if(mode === "full"){
    for(let k = 0; k < 5; k++){ const t = t0 + (t1 - t0) * (k + .5) / 5; g += `<text class="ax" x="${X(t).toFixed(1)}" y="${H - 6}" text-anchor="middle">${fmtAxis(t, range)}</text>`; }
    g += `<text class="wm" x="${pw - 8}" y="${padT + 14}" text-anchor="end">I, the Jury</text>`;
  }
  let defs = "";
  const ends = [];
  for(const s of S2){
    const d = s.pts.map((p, i) => (i ? "L" : "M") + X(p.t).toFixed(1) + " " + Y(p.p).toFixed(1)).join("");
    if(outs.length === 1){
      defs += `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.o.color}" stop-opacity=".18"/><stop offset="1" stop-color="${s.o.color}" stop-opacity="0"/></linearGradient>`;
      g += `<path d="${d}L${pw.toFixed(1)} ${H - padB}L0 ${H - padB}Z" fill="url(#${gid})"/>`;
    }
    g += `<path d="${d}" fill="none" stroke="${s.o.color}" stroke-width="${mode === "hero" ? 2.2 : 2}" stroke-linejoin="round" stroke-linecap="round"/>`;
    const last = s.pts[s.pts.length - 1];
    ends.push({s, x: X(last.t), y: Y(last.p), p: last.p});
  }
  for(const e of ends) g += `<circle cx="${e.x.toFixed(1)}" cy="${e.y.toFixed(1)}" r="7" fill="${e.s.o.color}" opacity=".18"/><circle cx="${e.x.toFixed(1)}" cy="${e.y.toFixed(1)}" r="3.8" fill="${e.s.o.color}" stroke="#fff" stroke-width="1.5"/>`;
  if(labels){
    const sorted = ends.slice().sort((a, b) => a.y - b.y), gap = 34;
    sorted.forEach((e, i) => { e.ly = i ? Math.max(e.y, sorted[i - 1].ly + gap) : Math.max(e.y, padT + 8); });
    const over = sorted.length ? sorted[sorted.length - 1].ly - (H - padB - 14) : 0;
    if(over > 0) sorted.forEach(e => e.ly -= over);
    for(const e of sorted){
      const nm = e.s.o.n.length > 17 ? e.s.o.n.slice(0, 16) + "…" : e.s.o.n;
      g += `<text x="${pw + 12}" y="${(e.ly - 4).toFixed(1)}" style="font:500 11.5px var(--ui)" fill="#6B7079">${esc(nm)}</text>
            <text x="${pw + 12}" y="${(e.ly + 15).toFixed(1)}" style="font:600 19px var(--display)" fill="${e.s.o.color}">${pct(e.p)}</text>`;
    }
  }
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Price history for ${esc(m.title)}"><defs>${defs}</defs>${g}<line class="xh" x1="0" x2="0" y1="${padT}" y2="${H - padB}" stroke="#A1A6AE" stroke-dasharray="3 3" opacity="0"/></svg><div class="tip"></div>`;
  el._geo = {S2, t0, t1, pw, X, Y, range, padT, padB};
  if(!el._hov){
    el._hov = true;
    el.addEventListener("mousemove", e => hoverChart(el, e));
    el.addEventListener("mouseleave", () => { const tip = $(".tip", el), xh = $(".xh", el); if(tip) tip.style.opacity = 0; if(xh) xh.setAttribute("opacity", 0); });
  }
}
function hoverChart(el, e){
  const g = el._geo; if(!g) return;
  const r = el.getBoundingClientRect(), x = clamp(e.clientX - r.left, 0, g.pw);
  const t = g.t0 + x / g.pw * (g.t1 - g.t0);
  const tip = $(".tip", el), xh = $(".xh", el); if(!tip || !xh) return;
  let h = `<div class="muted">${g.range === "1D" || g.range === "1W" ? dShort(t) + ", " + tClock(t) : dLong(t)}</div>`;
  for(const s of g.S2){
    let lo = 0, hi = s.pts.length - 1;
    while(hi - lo > 1){ const mid = (lo + hi) >> 1; if(s.pts[mid].t < t) lo = mid; else hi = mid; }
    const p = Math.abs(s.pts[lo].t - t) < Math.abs(s.pts[hi].t - t) ? s.pts[lo] : s.pts[hi];
    h += `<div class="r">${g.S2.length > 1 ? sw(s.o) + esc(s.o.n) + " " : ""}<b>${pct(p.p)}</b></div>`;
  }
  tip.innerHTML = h;
  tip.style.left = clamp(x, 60, g.pw - 60) + "px";
  tip.style.opacity = 1;
  xh.setAttribute("x1", x); xh.setAttribute("x2", x); xh.setAttribute("opacity", 1);
}

/* ============ header, categories, footer ============ */
function renderChrome(){
  $("#hdr").innerHTML = `<div class="wrap hdr-row">
    ${LOGO}
    <nav class="nav" aria-label="Main">
      <a href="#/" data-nav="home">Markets</a>
      <a href="#/live" class="live" data-nav="live">Live</a>
      <a href="#/ideas" data-nav="ideas">Ideas</a>
      <a href="#/leaderboard" data-nav="leaderboard">Leaderboard</a>
      <a href="sim/" data-nav="sim">Simulation</a>
    </nav>
    <div class="search" role="search">
      ${icon("search")}
      <input id="q" type="search" placeholder="Search markets or profiles" autocomplete="off" spellcheck="false" aria-label="Search markets or profiles" aria-controls="sdrop" aria-expanded="false">
      <kbd>/</kbd>
      <div class="sdrop" id="sdrop" role="listbox" aria-label="Search results"></div>
    </div>
    <div class="hdr-r" id="acct"></div>
  </div>`;
  $("#cats").innerHTML = `<div class="wrap cats-row"><div class="scroller" id="catScroll">
    <a class="cat" href="#/" data-cat="home">${icon("trend")}Trending</a>
    <a class="cat" href="#/new" data-cat="new">New</a>
    <span class="cat-sep" aria-hidden="true">·</span>
    <a class="cat" href="#/all" data-cat="all">All</a>
    ${ITJ.cats.map(c => `<a class="cat" href="#/c/${c.id}" data-cat="${c.id}">${esc(c.label)}</a>`).join("")}
  </div><span class="fade-r" aria-hidden="true"></span><button class="more" data-act="catmore" aria-label="More categories">${icon("right", "ic sm")}</button></div>`;
  $("#foot").innerHTML = `<div class="wrap"><div class="foot-in">
    <div>${LOGO}<p class="tag">Prediction markets on court cases. Trade the ruling, the verdict and the settlement.</p>
      <div class="social">
        <a href="#/" aria-label="X"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.3l-7.2 8.2L22.4 21h-6.6l-5.2-6.8L4.6 21H1.3l7.7-8.8L1 3h6.8l4.7 6.2L17.8 3zm-1.2 16.2h1.8L6.6 4.7H4.7l11.9 14.5z"/></svg></a>
        <a href="#/" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></svg></a>
        <a href="#/" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 9h3v12H3zM9 9h2.9v1.7c.4-.8 1.5-1.9 3.4-1.9 3.6 0 4.2 2.3 4.2 5.4V21h-3v-5.9c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1v6H9z"/></svg></a>
        <a href="#/" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12a31 31 0 0 0 .4 3.8 3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-3.8 31 31 0 0 0-.4-3.8zM10 15.2V8.8l5.2 3.2z"/></svg></a>
      </div></div>
    <div><h5>Markets</h5><ul>${ITJ.cats.slice(0, 6).map(c => `<li><a href="#/c/${c.id}">${esc(c.label)}</a></li>`).join("")}</ul></div>
    <div><h5>More markets</h5><ul>${ITJ.cats.slice(6, 12).map(c => `<li><a href="#/c/${c.id}">${esc(c.label)}</a></li>`).join("")}</ul></div>
    <div><h5>Platform</h5><ul><li><a href="#/live">Live</a></li><li><a href="#/ideas">Ideas</a></li><li><a href="#/leaderboard">Leaderboard</a></li><li><a href="#/portfolio">Portfolio</a></li><li><a href="sim/">Live simulation</a></li></ul></div>
    <div><h5>Learn</h5><ul><li><a href="#/how">How it works</a></li><li><a href="#/how">Market rules</a></li><li><a href="#/how">Fees</a></li><li><a href="#/how">Surveillance</a></li></ul></div>
  </div>
  <div class="legal">I, the Jury is a product demo. Every case, party, judge, company, outlet and trader on this site is fictional, all trading uses practice credits, and nothing here is an offer to trade or legal advice. Real courts and agencies appear only as institutions. Photos are public domain or CC0, via Openverse.</div></div>`;
  $("#tabbar").innerHTML = `
    <a href="#/" data-tab="home">${icon("home")}Home</a>
    <a href="#/live" data-tab="live">${icon("radio")}Live</a>
    <a href="#/search" data-tab="search">${icon("search")}Search</a>
    <a href="#/ideas" data-tab="ideas">${icon("bulb")}Ideas</a>
    <a href="#/portfolio" data-tab="portfolio">${icon("wallet")}Portfolio</a>`;
  renderAcct();
}
function renderAcct(){
  const el = $("#acct"), s = `<a class="iconbtn m-only" href="#/search" aria-label="Search">${icon("search")}</a>`;
  if(!S.user){ el.innerHTML = s + `<button class="btn btn-line" data-act="login">Log in</button><button class="btn btn-green" data-act="signup">Sign up</button>`; return; }
  el.innerHTML = s + `<div class="acct">
    <a class="stat" href="#/portfolio"><small>Portfolio</small><b data-b="pv">${usd(pv())}</b></a>
    <a class="stat" href="#/portfolio"><small>Cash</small><b class="green" data-b="cash">${usd(S.cash)}</b></a>
    <button class="btn btn-green d-only" data-act="deposit">Deposit</button>
    <button class="avatar" data-act="menu" aria-label="Account menu" aria-haspopup="menu">${avatarSVG(S.user.h)}</button></div>`;
}

/* ============ pages ============ */

/* ---- home ---- */
function heroRows(m){
  if(m.kind === "binary"){
    const o = m.outs[0];
    return `<div class="s-bin"><div class="m-chance" style="margin:0 0 14px"><span class="big">${pcB(m, o)}</span><span class="lbl">chance</span>${chgB(m, o)}</div>
      <div class="bigyn">${tradeBtn(m, o, "yes", `Yes <span data-m="${m.id}" data-o="0" data-b="ya">${yesAsk(o)}¢</span>`)}${tradeBtn(m, o, "no", `No <span data-m="${m.id}" data-o="0" data-b="na">${noAsk(o)}¢</span>`)}</div></div>`;
  }
  return `<div class="s-rows">${chartOuts(m, "hero").map(o => `<div class="s-row">${markB(o)}<span class="nm">${esc(o.n)}</span>${pcB(m, o, "span", "pc")}<span class="yn">${tradeBtn(m, o, "yes", "Yes")}${tradeBtn(m, o, "no", "No")}</span></div>`).join("")}</div>`;
}
function slide(m, i, n){
  return `<article class="slide${i ? "" : " on"}" data-i="${i}" aria-roledescription="slide" aria-label="${i + 1} of ${n}"${i ? ' aria-hidden="true"' : ""}>
    <div class="s-l">
      <div class="s-hd"><a href="#/m/${m.id}" tabindex="-1">${thumb(m, "thumb lg")}</a><div>
        <div class="s-kick">${m.live ? '<span class="livetag">Live</span>' : ""}<span class="kicker">${esc(CAT[m.cat].label)}</span></div>
        <h2><a href="#/m/${m.id}">${esc(m.title)}</a></h2></div></div>
      ${heroRows(m)}
      ${m.news ? `<p class="s-news"><b>News</b> · ${esc(m.news)}</p>` : ""}
      <div class="s-ft"><span><span data-m="${m.id}" data-b="vol">${usd0(m.vol)}</span> vol</span>${plusBtn(m)}</div>
    </div>
    <div class="s-chart"><div class="chart" data-chart="${m.id}" data-mode="hero" data-range="1M"></div></div>
  </article>`;
}
function tlist(kind){
  const ms = kind === "movers" ? LIST.slice().sort((a, b) => Math.abs(ch24(lead(b))) - Math.abs(ch24(lead(a)))).slice(0, 5)
    : kind === "new" ? newest().slice(0, 5) : trending().slice(0, 5);
  return ms.map((m, i) => { const o = lead(m); return `<li><a href="#/m/${m.id}"><span class="rk">${i + 1}</span>${thumb(m, "thumb xs")}<span class="tt">${esc(m.title)}</span><span class="tpc">${pcB(m, o, "b")}${chgB(m, o)}</span></a></li>`; }).join("");
}
function viewHome(){
  const hero = ITJ.hero.map(id => MK[id]).filter(Boolean), lm = MK.northline;
  const top2 = sortedOuts(lm).slice(0, 2);
  return `<div class="wrap">
    <div class="chips" role="toolbar" aria-label="Topics">
      <button class="chip" aria-pressed="true">For you</button>
      ${ITJ.topics.map(t => `<a class="chip" href="#/m/${t.m}">${MK[t.m] && MK[t.m].live ? '<span class="dot"></span>' : ""}${esc(t.label)}</a>`).join("")}
    </div>
    <div class="home-top">
      <section class="hero" id="hero" aria-roledescription="carousel" aria-label="Featured markets">
        <div class="slides">${hero.map((m, i) => slide(m, i, hero.length)).join("")}</div>
        <div class="hero-nav">
          <button class="lbl" data-act="hero" data-dir="-1" aria-label="Previous market"><span class="arrow">${icon("left")}</span><span data-hl="prev"></span></button>
          <div class="dots">${hero.map((m, i) => `<button data-act="hero" data-i="${i}" aria-label="Show ${esc(m.title)}"${i ? "" : ' aria-current="true"'}></button>`).join("")}</div>
          <button class="lbl r" data-act="hero" data-dir="1" aria-label="Next market"><span data-hl="next"></span><span class="arrow">${icon("right")}</span></button>
        </div>
      </section>
      <div class="side">
        <a class="panel live-panel" href="#/m/${lm.id}">
          <img src="${IMG("courtroom")}" alt="">
          <div class="lp-in"><span class="livetag">Live</span><h4>${esc(lm.title.split(":")[0])}</h4><div class="lp-sub">${esc(lm.live)}</div>
          <div class="lp-odds">${top2.map(o => `<span>${esc(o.n)} ${pcB(lm, o, "b")}</span>`).join("")}</div></div>
        </a>
        <div class="panel"><div class="panel-hd"><h3>Popular now</h3><a href="#/all">See all</a></div>
          <div class="tabs-sm" role="tablist">
            <button role="tab" aria-selected="true" data-act="tlist" data-k="trending">Trending</button>
            <button role="tab" aria-selected="false" data-act="tlist" data-k="movers">Top movers</button>
            <button role="tab" aria-selected="false" data-act="tlist" data-k="new">New</button>
          </div>
          <ol class="tlist" id="tlist">${tlist("trending")}</ol></div>
      </div>
    </div>
    <div class="props">${ITJ.props.map(p => `<div class="prop"><span class="pi">${icon(p.icon)}</span><div><h4>${esc(p.title)}</h4><p>${esc(p.body)}</p></div></div>`).join("")}</div>
    ${railSec("Trending", "#/all", trending())}
    ${railSec("Live now", "#/live", liveNow(), {live: true})}
    <section class="promo">
      <img src="${IMG("promo")}" alt="" loading="lazy">
      <div class="promo-in"><span class="kicker">I, the Jury Live</span>
        <h2>Six months of court decisions in ten minutes</h2>
        <p>Trade against thousands of simulated traders while rulings land, a jury deliberates and the Supreme Court hears argument.</p>
        <a class="btn btn-green" href="sim/">${icon("play", "ic sm")}Play the simulation</a></div>
      <div class="stats"><div><b>10 min</b><small>one court term</small></div><div><b>8</b><small>markets</small></div><div><b>9,000+</b><small>traders</small></div></div>
    </section>
    ${railSec("Supreme Court", "#/c/scotus", inCat("scotus").concat(inCat("mentions").filter(m => m.id === "pruitt-words")))}
    ${railSec("Closing soon", "#/all", closing().slice(0, 8), {closing: true})}
    ${railSec("New", "#/new", newest().slice(0, 8))}
    <section class="sec"><div class="sec-hd"><h2><a href="#/all">All markets</a></h2><a class="see" href="#/all">See all ${icon("right", "ic sm")}</a></div>
      <div class="chips" style="padding-top:0" role="toolbar" aria-label="Filter markets">
        <button class="chip line" data-act="gridcat" data-c="" aria-pressed="true">All</button>
        ${ITJ.cats.map(c => `<button class="chip line" data-act="gridcat" data-c="${c.id}" aria-pressed="false">${esc(c.label)}</button>`).join("")}
      </div>
      <div class="grid" id="homeGrid">${LIST.slice().sort((a, b) => b.vol - a.vol).slice(0, 8).map(m => card(m)).join("")}</div>
    </section>
    <section class="sec"><div class="sec-hd"><h2><a href="#/leaderboard">Leaderboard</a></h2><a class="see" href="#/leaderboard">See all ${icon("right", "ic sm")}</a></div>${lbHTML(5, "all", "")}</section>
    <section class="sec two">
      <div><div class="sec-hd"><h2>Breaking news</h2></div><div class="news">${ITJ.news.slice(0, 5).map(newsItem).join("")}</div></div>
      <div><div class="sec-hd"><h2><a href="#/ideas">Ideas</a></h2><a class="see" href="#/ideas">See all ${icon("right", "ic sm")}</a></div><div style="border-top:1px solid var(--line)">${ITJ.ideas.slice(0, 3).map(postHTML).join("")}</div></div>
    </section>
  </div>`;
}
function newsItem(n){
  const m = MK[n.m], o = m && lead(m);
  return `<article class="news-it"><div style="flex:1;min-width:0">
    <div class="src"><span class="slogo" style="background:${n.color}">${esc(n.mono)}</span>${esc(n.src)} <span>· ${ago(n.ago + (Date.now() - NOW0) / MIN)}</span></div>
    <h4><a href="#/m/${n.m}">${esc(n.title)}</a></h4><p>${esc(n.body)}</p></div>
    ${m ? `<a class="nm" href="#/m/${m.id}"><span>${pcB(m, o, "b")}${m.kind === "binary" ? "chance" : esc(o.n)}</span>${thumb(m, "")}</a>` : ""}</article>`;
}
function postHTML(p, i){
  const m = MK[p.m], id = p.id || "seed" + ITJ.ideas.indexOf(p), liked = S.liked.includes(id);
  const yes = p.side === "Yes";
  return `<article class="post"><a class="avatar" href="#/u/${encodeURIComponent(p.u)}">${p.mine ? avatarSVG(p.u) : avatar(p.u)}</a><div class="post-b">
    <div class="post-h"><a href="#/u/${encodeURIComponent(p.u)}"><b>${esc(p.u)}</b></a>${p.amt ? `<span class="pos ${yes ? "yes" : "no"}">${esc(p.side)}${p.outcome ? " · " + esc(p.outcome) : ""} · ${usdK(p.amt)}</span>` : ""}<span class="t">${ago(p.ago + (Date.now() - NOW0) / MIN)}</span></div>
    <p>${esc(p.text)}</p>
    ${m ? `<a class="post-m" href="#/m/${m.id}">${thumb(m, "thumb xs")}<span class="tt">${esc(m.title)}</span>${pcB(m, p.outcome ? (m.outs.find(o => o.n === p.outcome) || lead(m)) : lead(m), "b")}</a>` : ""}
    <div class="post-a"><button data-act="like" data-id="${id}" aria-pressed="${liked}">${icon("heart")}<span>${p.likes + (liked ? 1 : 0)}</span></button><button data-act="reply" data-m="${p.m}">${icon("chat")}<span>${p.replies}</span></button><button data-act="share" data-m="${p.m}">${icon("share")}Share</button></div>
  </div></article>`;
}
function lbRows(kind, period, cat, n){
  const f = period === "week" ? .16 : period === "month" ? .41 : 1;
  const r = rng(hash(kind + period + cat));
  const users = ITJ.users.map(u => ({u, v: (kind === "profit" ? u.profit : kind === "volume" ? u.volume : u.preds) * f * (period === "all" && !cat ? 1 : .55 + r() * .9)}));
  users.sort((a, b) => b.v - a.v);
  return users.slice(0, n).map((x, i) => `<a class="lb-row" href="#/u/${encodeURIComponent(x.u.h)}"><span class="rank ${i < 3 ? "r" + (i + 1) : "rn"}">${i + 1}</span><span class="avatar">${avatar(x.u.h)}</span><span class="h">${esc(x.u.h)}</span><span class="v">${kind === "profit" ? usd0(x.v) : num(x.v)}</span></a>`).join("");
}
function lbHTML(n, period, cat){
  return `<div class="lb">
    <div class="lb-col"><h3>${icon("dollar")}Profit</h3>${lbRows("profit", period, cat, n)}</div>
    <div class="lb-col"><h3>${icon("bars")}Volume</h3>${lbRows("volume", period, cat, n)}</div>
    <div class="lb-col"><h3>${icon("target")}Predictions</h3>${lbRows("preds", period, cat, n)}</div></div>`;
}

/* ---- market page ---- */
const TP = {m: null, oi: 0, side: "yes", tab: "buy", amt: "", sell: "", step: "form", err: "", last: null};
function book(o, side){
  const r = rng(hash(o.n + side + o.i) ^ Math.floor(Date.now() / 20000));
  const best = side === "yes" ? yesAsk(o) : noAsk(o), lv = [];
  for(let k = 0; k < 7 && best + k <= 99; k++) lv.push({px: best + k, qty: Math.round(250 + r() * 3200 * (1 + k * .7))});
  return lv;
}
function fill(o, side, dollars){
  let left = Math.floor(dollars * 100), qty = 0, cost = 0;
  for(const l of book(o, side)){
    const can = Math.min(l.qty, Math.floor(left / l.px));
    qty += can; cost += can * l.px; left -= can * l.px;
    if(can < l.qty) break;
  }
  return {qty, cost: cost / 100, avg: qty ? cost / qty : 0, fee: Math.ceil(cost / 100) / 100};
}
function obHTML(m){
  const o = m.outs[TP.m === m ? TP.oi : 0];
  const asks = book(o, "yes").slice(0, 5), bids = book(o, "no").slice(0, 5).map(l => ({px: 100 - l.px, qty: l.qty}));
  const mx = Math.max(...asks.map(l => l.qty), ...bids.map(l => l.qty));
  let cum = 0; const askRows = asks.map(l => { cum += l.qty * l.px / 100; return {l, tot: cum}; }).reverse();
  cum = 0; const bidRows = bids.map(l => { cum += l.qty * l.px / 100; return {l, tot: cum}; });
  const row = (x, cls) => `<div class="ob-row ${cls}"><span class="bar" style="width:${(x.l.qty / mx * 60).toFixed(1)}%"></span><span class="px">${x.l.px}¢</span><span>${num(x.l.qty)}</span><span>${usd0(x.tot)}</span></div>`;
  return `<div class="ob-grid">
    <div class="ob-row th"><span class="px">Price · Yes${m.kind === "binary" ? "" : " " + esc(o.n)}</span><span>Contracts</span><span>Total</span></div>
    ${askRows.map(x => row(x, "ask")).join("")}
    <div class="ob-mid"><span>Last ${Math.round(o.p)}¢</span><span>Spread ${yesAsk(o) - (100 - noAsk(o))}¢</span></div>
    ${bidRows.map(x => row(x, "bid")).join("")}</div>`;
}
function viewMarket(m){
  const multi = m.kind !== "binary";
  const o0 = m.outs[TP.oi] || m.outs[0];
  const related = LIST.filter(x => x !== m && (x.cat === m.cat || (x.case && m.case && x.case.name === m.case.name))).concat(trending().filter(x => x !== m && x.cat !== m.cat)).slice(0, 8);
  const news = ITJ.news.filter(n => n.m === m.id || (MK[n.m] && MK[n.m].cat === m.cat)).concat(ITJ.news).filter((n, i, a) => a.indexOf(n) === i).slice(0, 3);
  const posts = S.posts.filter(p => p.m === m.id).concat(ITJ.ideas.filter(p => p.m === m.id || (MK[p.m] && MK[p.m].cat === m.cat)));
  const table = multi ? `<div class="otable" role="table" aria-label="Outcomes">
      <div class="ot-hd" role="row"><span>${m.kind === "vs" ? "Side" : "Outcome"}</span><span>Chance</span><span></span></div>
      ${sortedOuts(m).map(o => `<div class="ot-row${TP.oi === o.i ? " sel" : ""}" role="row" data-act="selout" data-m="${m.id}" data-o="${o.i}">
        <div class="nm">${markB(o)}<span>${esc(o.n)}<small>${usd0(o.vol)} vol</small></span></div>
        <div class="ch">${pcB(m, o, "b")}${chgB(m, o)}</div>
        <div class="ynp">${tradeBtn(m, o, "yes", `Yes <span data-m="${m.id}" data-o="${o.i}" data-b="ya">${yesAsk(o)}¢</span>`)}${tradeBtn(m, o, "no", `No <span data-m="${m.id}" data-o="${o.i}" data-b="na">${noAsk(o)}¢</span>`)}</div>
      </div>`).join("")}</div>` : "";
  return `<div class="wrap mkt">
    <div class="m-main">
      <div class="crumb kicker"><a href="#/c/${m.cat}">${esc(CAT[m.cat].label)}</a>${m.sub ? `<span>·</span><span>${esc(m.sub)}</span>` : ""}${m.live ? '<span class="livetag" style="margin-left:6px">Live</span>' : ""}</div>
      <div class="m-head">${thumb(m, "thumb xl")}<h1>${esc(m.title)}</h1>
        <div class="m-icons">
          <button class="iconbtn" data-act="cal" data-m="${m.id}" aria-label="Add the close date to your calendar">${icon("cal")}</button>
          <a class="iconbtn" href="#ideas-${m.id}" data-act="jump" data-t="ideas-${m.id}" aria-label="Comments">${icon("chat")}<sup>${m.comments}</sup></a>
          <button class="iconbtn" data-act="share" data-m="${m.id}" aria-label="Share">${icon("share")}</button>
          ${plusBtn(m).replace('class="plus"', 'class="iconbtn plus"')}
        </div></div>
      <div class="m-sub">${m.live ? `<span class="livetag">${esc(m.live)}</span>` : ""}${m.case ? `<span><b>${esc(m.case.name)}</b></span>` : ""}<span>${icon("clock", "ic sm")} Closes ${dLong(m.closeAt)}</span><span><span data-m="${m.id}" data-b="vol">${usd0(m.vol)}</span> vol</span></div>
      ${multi ? `<div class="legend">${chartOuts(m, "full").map(o => `<span>${sw(o)}${esc(o.n)} ${pcB(m, o, "b")}</span>`).join("")}</div>`
        : `<div class="m-chance"><span class="big">${pcB(m, o0)}</span><span class="lbl">chance</span>${chgB(m, o0)}</div>`}
      <div class="chart-box"><div class="chart" data-chart="${m.id}" data-mode="full" data-range="${ROUTE.range || "1M"}"></div><div class="tape" aria-hidden="true"></div></div>
      <div class="ranges" role="group" aria-label="Chart range">${["1D", "1W", "1M", "ALL"].map(r => `<button data-act="range" data-r="${r}" aria-pressed="${(ROUTE.range || "1M") === r}">${r}</button>`).join("")}<span class="vol">${m.repeat ? icon("repeat", "ic sm") + " " + m.repeat + " · " : ""}Listed ${dShort(m.listedAt)}</span></div>
      ${table}
      <section class="ob"><div class="ob-hd"><h3>Order book</h3><span class="muted" style="font-size:13px">Yes side · updates live</span></div><div id="ob">${obHTML(m)}</div></section>
      <section class="blk rules"><h3>Rules summary</h3>
        ${multi ? `<div class="pick" style="margin-top:10px">${esc(o0.n)}</div>` : ""}
        <p>${rulesText(m)}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-soft" data-act="rules" data-m="${m.id}">View full rules</button><a class="btn btn-soft" href="#/how">How markets resolve</a></div>
        <div class="acc">
          <details><summary>${icon("cal")}Timeline and payout<span class="chev">${icon("down")}</span></summary><div class="acc-b"><div class="tl">
            <span>Listed</span><b>${dLong(m.listedAt)}</b><span>Closes</span><b>${dLong(m.closeAt)}, 5:00pm</b><span>Resolves</span><b>When the decision is on the docket</b><span>Payout</span><b>$1 per winning contract, within an hour</b></div></div></details>
          ${m.case ? `<details><summary>${icon("doc")}The case<span class="chev">${icon("down")}</span></summary><div class="acc-b">
            <div class="facts" style="margin-top:0"><div class="fact"><small>Case</small><b>${esc(m.case.name)}</b></div><div class="fact"><small>Court</small><b>${esc(m.case.court)}</b></div><div class="fact"><small>Docket</small><b>${esc(m.case.docket)}</b></div></div>
            ${m.about ? `<p class="about">${esc(m.about)}</p>` : ""}</div></details>` : ""}
        </div></section>
      ${m.updates ? `<section class="blk"><h3><span class="livetag" style="font-size:12px;vertical-align:4px;margin-right:8px">Live</span>Updates</h3><div class="news" style="margin-top:12px">${m.updates.map(u => `<div class="news-it"><div><div class="src">${tClock(NOW0 - u[0] * MIN)} <span>· ${ago(u[0])} ago</span></div><p style="color:var(--ink);font-size:15px">${esc(u[1])}</p></div></div>`).join("")}</div></section>` : ""}
      <section class="blk"><h3>Breaking news</h3><div class="news" style="margin-top:12px">${news.map(newsItem).join("")}</div></section>
      <section class="blk" id="ideas-${m.id}"><h3>Ideas <span class="muted" style="font:500 15px var(--ui)">${m.comments}</span></h3>
        <form class="compose" data-form="post" data-m="${m.id}"><input name="t" placeholder="Share your take on this market" maxlength="280" aria-label="Your post"><button class="btn btn-dark">Post</button></form>
        <div>${posts.slice(0, 4).map(postHTML).join("") || '<p class="muted" style="margin:16px 0">No posts yet. Be the first.</p>'}</div></section>
      ${railSec("People also trade", "#/all", related)}
    </div>
    <aside class="aside" aria-label="Trade"><div class="tp" data-tp></div></aside>
  </div>`;
}

/* ---- trade panel ---- */
function selectTrade(m, oi = 0, side = "yes"){
  if(TP.m !== m){ TP.amt = ""; TP.sell = ""; }
  TP.m = m; TP.oi = oi; TP.side = side; TP.step = "form"; TP.err = "";
}
function tpRows(){
  const m = TP.m, o = m.outs[TP.oi], yes = TP.side === "yes";
  if(TP.tab === "sell"){
    const p = S.pos[posKey(m.id, TP.oi, TP.side)], q = Math.min(+TP.sell || 0, p ? p.qty : 0), bid = yes ? yesBid(o) : noBid(o);
    return `<div><span>Contracts to sell</span><b>${num(q)}</b></div><div><span>Price</span><b>${bid}¢</b></div>
      <div class="pay"><span>You receive<small>after fees</small></span><b>${usd(Math.max(0, q * bid / 100 - Math.ceil(q * bid / 100) / 100))}</b></div>`;
  }
  const a = parseFloat(TP.amt) || 0, f = fill(o, TP.side, a);
  const win = m.kind === "binary" ? (yes ? "Yes" : "No") : (yes ? esc(o.n) : "not " + esc(o.n));
  return `<div><span>Contracts</span><b>${num(f.qty)}</b></div>
    <div><span>Average price</span><b>${f.qty ? f.avg.toFixed(1).replace(".0", "") + "¢" : (yes ? yesAsk(o) : noAsk(o)) + "¢"}</b></div>
    <div><span>Fees</span><b>${usd(f.fee)}</b></div>
    <div class="pay${yes ? "" : " no"}"><span>Payout if ${win}<small>${f.qty ? "+" + Math.round((f.qty - f.cost - f.fee) / Math.max(.01, f.cost + f.fee) * 100) + "% return" : "$1 per contract"}</small></span><b>${usd(f.qty)}</b></div>`;
}
function tpHTML(){
  const m = TP.m; if(!m) return "";
  const o = m.outs[TP.oi], yes = TP.side === "yes", sel = m.kind === "binary" ? "" : ` · ${esc(o.n)}`;
  if(TP.step === "done" && TP.last){
    const L = TP.last;
    return `<div class="tp-done"><div class="ok">${icon("check")}</div><h4>${L.act === "buy" ? "Order filled" : "Sold"}</h4>
      <p>${L.act === "buy" ? "Bought" : "Sold"} ${num(L.qty)} ${L.side === "yes" ? "Yes" : "No"}${m.kind === "binary" ? "" : " · " + esc(m.outs[L.oi].n)} at ${L.avg.toFixed(1).replace(".0", "")}¢ for ${usd(L.total)}</p>
      <a class="btn btn-green btn-block" href="#/portfolio">View portfolio</a>
      <button class="btn btn-soft btn-block" style="margin-top:8px" data-act="tpagain">Trade again</button></div>`;
  }
  const head = `<div class="tp-hd">${thumb(m, "thumb sm")}<div><div class="tt">${esc(m.title)}</div><div class="sd">${TP.tab === "buy" ? "Buy" : "Sell"} <span class="${yes ? "y" : "n"}">${yes ? "Yes" : "No"}</span>${sel}</div></div></div>`;
  const tabs = `<div class="tp-tabs" role="tablist"><button role="tab" aria-selected="${TP.tab === "buy"}" data-act="tptab" data-k="buy">Buy</button><button role="tab" aria-selected="${TP.tab === "sell"}" data-act="tptab" data-k="sell">Sell</button><span class="unit">${TP.tab === "buy" ? "Dollars" : "Contracts"}</span></div>`;
  const outSel = m.outs.length > 1 ? `<div class="tp-out"><select data-tp-out aria-label="Outcome">${m.outs.map(x => `<option value="${x.i}"${x.i === TP.oi ? " selected" : ""}>${esc(x.n)}</option>`).join("")}</select></div>` : "";
  const sides = `<div class="tp-lbl">Pick a side</div><div class="tp-sides">
    <button class="y" data-act="tpside" data-k="yes" aria-pressed="${yes}">Yes <span data-m="${m.id}" data-o="${o.i}" data-b="ya">${yesAsk(o)}¢</span></button>
    <button class="n" data-act="tpside" data-k="no" aria-pressed="${!yes}">No <span data-m="${m.id}" data-o="${o.i}" data-b="na">${noAsk(o)}¢</span></button></div>`;
  const id = "amt" + (++uid);
  let body;
  if(TP.tab === "sell"){
    const p = S.pos[posKey(m.id, TP.oi, TP.side)];
    if(!S.user) body = `<button class="btn btn-green btn-block" style="margin-top:16px" data-act="signup">Sign up to trade</button>`;
    else if(!p || p.qty <= 0) body = `<div class="tp-pos" style="text-align:center;color:var(--muted)">You don't hold any ${yes ? "Yes" : "No"} here yet.</div>`;
    else body = `<div class="tp-amt"><label for="${id}">Contracts<small>You hold ${num(p.qty)}</small></label><input id="${id}" data-tp-sell inputmode="numeric" placeholder="0" value="${esc(TP.sell)}" autocomplete="off"></div>
      <div class="tp-quick"><button data-act="tpsq" data-k=".25">25%</button><button data-act="tpsq" data-k=".5">50%</button><button data-act="tpsq" data-k="1">All</button></div>
      <div class="tp-rows" data-tp-rows>${tpRows()}</div>
      ${TP.step === "review" ? `<button class="btn btn-green btn-block" data-act="tpconfirm">Confirm sell</button><button class="btn btn-soft btn-block" style="margin-top:8px" data-act="tpback">Edit</button>` : `<button class="btn btn-green btn-block" data-act="tpreview">Review sell</button>`}`;
  } else {
    body = `<div class="tp-amt"><label for="${id}">Amount<small>${S.user ? usd(S.cash) + " available" : "Practice credits"}</small></label><input id="${id}" data-tp-amt inputmode="decimal" placeholder="$0" value="${TP.amt ? "$" + esc(TP.amt) : ""}" autocomplete="off"></div>
      <div class="tp-quick"><button data-act="tpq" data-k="1">+$1</button><button data-act="tpq" data-k="20">+$20</button><button data-act="tpq" data-k="100">+$100</button><button data-act="tpq" data-k="max">Max</button></div>
      <div class="tp-rows" data-tp-rows>${tpRows()}</div>
      ${!S.user ? `<button class="btn btn-green btn-block" data-act="signup">Sign up to trade</button>`
        : TP.step === "review" ? `<button class="btn btn-green btn-block" data-act="tpconfirm">Confirm buy</button><button class="btn btn-soft btn-block" style="margin-top:8px" data-act="tpback">Edit</button>`
        : `<button class="btn btn-green btn-block" data-act="tpreview">Review buy</button>`}`;
  }
  const err = TP.err ? `<div class="err" role="alert">${esc(TP.err)}</div>` : "";
  const mine = S.user ? posList().filter(p => p.m === m) : [];
  const pos = mine.length ? `<div class="tp-pos"><h5>Your position</h5>${mine.map(p => `<div><span>${num(p.qty)} ${p.side === "yes" ? '<span class="up">Yes</span>' : '<span class="down">No</span>'}${m.kind === "binary" ? "" : " · " + esc(p.o.n)}</span><b class="${p.value >= p.cost ? "up" : "down"}">${usd(p.value)}</b></div>`).join("")}</div>` : "";
  return head + tabs + outSel + sides + body + err + `<div class="tp-note">Practice credits only. Prices move with the market.</div>` + pos;
}
function renderTP(){ for(const el of $$("[data-tp]")) el.innerHTML = tpHTML(); paintMbar(); }
function tpCalc(){
  for(const el of $$("[data-tp-rows]")) el.innerHTML = tpRows();
  const ob = $("#ob"); if(ob && ROUTE.m === TP.m) ob.innerHTML = obHTML(TP.m);
}
function paintMbar(){
  const bar = $("#mbar");
  const on = ROUTE.name === "m" && ROUTE.m;
  document.body.classList.toggle("has-mbar", !!on);
  if(!on){ bar.innerHTML = ""; return; }
  const m = ROUTE.m, o = m.outs[TP.m === m ? TP.oi : 0];
  bar.innerHTML = `<button class="y" data-act="trade" data-m="${m.id}" data-o="${o.i}" data-s="yes">Yes ${yesAsk(o)}¢</button><button class="n" data-act="trade" data-m="${m.id}" data-o="${o.i}" data-s="no">No ${noAsk(o)}¢</button>`;
}
function doTrade(){
  const m = TP.m, o = m.outs[TP.oi], k = posKey(m.id, TP.oi, TP.side);
  if(TP.tab === "buy"){
    const a = parseFloat(TP.amt) || 0, f = fill(o, TP.side, a);
    if(f.qty < 1){ TP.err = "Enter an amount of at least one contract."; TP.step = "form"; return; }
    if(f.cost + f.fee > S.cash + 1e-9){ TP.err = `That's more than your ${usd(S.cash)} available.`; TP.step = "form"; return; }
    S.cash = Math.round((S.cash - f.cost - f.fee) * 100) / 100;
    const p = S.pos[k] || {qty: 0, cost: 0}; p.qty += f.qty; p.cost += f.cost + f.fee; S.pos[k] = p;
    TP.last = {act: "buy", qty: f.qty, avg: f.avg, total: f.cost + f.fee, side: TP.side, oi: TP.oi};
    S.hist.unshift({t: Date.now(), m: m.id, oi: TP.oi, side: TP.side, act: "buy", qty: f.qty, avg: f.avg, total: f.cost + f.fee});
    m.vol += f.cost; o.vol += f.cost;
    o.p = clamp(o.p + (TP.side === "yes" ? 1 : -1) * Math.min(3, f.qty / 4000), 1, 99); push(o, Date.now());
  } else {
    const p = S.pos[k], q = Math.min(Math.floor(+TP.sell || 0), p ? p.qty : 0), bid = TP.side === "yes" ? yesBid(o) : noBid(o);
    if(q < 1){ TP.err = "Enter how many contracts to sell."; TP.step = "form"; return; }
    const gross = q * bid / 100, fee = Math.ceil(gross) / 100, basis = p.cost * q / p.qty;
    S.cash = Math.round((S.cash + gross - fee) * 100) / 100;
    S.realized += gross - fee - basis;
    p.qty -= q; p.cost -= basis; if(p.qty <= 0) delete S.pos[k];
    TP.last = {act: "sell", qty: q, avg: bid, total: gross - fee, side: TP.side, oi: TP.oi};
    S.hist.unshift({t: Date.now(), m: m.id, oi: TP.oi, side: TP.side, act: "sell", qty: q, avg: bid, total: gross - fee});
    TP.sell = "";
  }
  if(S.hist.length > 200) S.hist.length = 200;
  TP.step = "done"; TP.err = ""; TP.amt = "";
  save(); renderAcct(); paint(m);
  toast(`${TP.last.act === "buy" ? "Bought" : "Sold"} ${num(TP.last.qty)} ${TP.side === "yes" ? "Yes" : "No"} · ${usd(TP.last.total)}`);
}

/* ---- list pages ---- */
function viewGrid(kind, cat){
  const title = kind === "new" ? "New" : "All markets";
  let ms = kind === "new" ? newest() : LIST.slice().sort((a, b) => b.vol - a.vol);
  if(cat) ms = ms.filter(m => m.cat === cat);
  return `<div class="wrap"><div class="page-hd"><h1>${title}</h1></div>
    <div class="chips" role="toolbar" aria-label="Filter by category">
      <a class="chip line" href="#/${kind}" aria-pressed="${!cat}">All</a>
      ${ITJ.cats.map(c => `<a class="chip line" href="#/${kind}?c=${c.id}" aria-pressed="${cat === c.id}">${esc(c.label)}</a>`).join("")}
    </div>
    <div class="grid" style="margin-top:12px">${ms.map(m => card(m)).join("")}</div></div>`;
}
function lcard(m){
  const rows = m.kind === "binary" ? [m.outs[0]] : sortedOuts(m).slice(0, 3);
  return `<article class="lcard${TP.m === m ? " sel" : ""}">
    <div class="lc-k">${m.live ? '<span class="livetag">Live</span>' : ""}<span>${esc(m.sub || CAT[m.cat].label)}${m.case ? " · " + esc(m.case.name) : ""}</span></div>
    <div class="lc-t">${thumb(m, "thumb sm")}<a href="#/m/${m.id}">${esc(m.title)}</a>${plusBtn(m)}</div>
    ${rows.map(o => `<div class="lc-row"><span class="nm">${m.kind === "binary" ? "Chance" : markB(o) + esc(o.n)}</span>${pcB(m, o, "span", "pc")}<span class="px">
      ${tradeBtn(m, o, "yes", `Yes <span data-m="${m.id}" data-o="${o.i}" data-b="ya">${yesAsk(o)}¢</span>`)}${tradeBtn(m, o, "no", `No <span data-m="${m.id}" data-o="${o.i}" data-b="na">${noAsk(o)}¢</span>`)}</span></div>`).join("")}
    <div class="lc-f"><span><span data-m="${m.id}" data-b="vol">${usd0(m.vol)}</span> vol · Closes ${dShort(m.closeAt)}</span>${m.kind === "binary" ? "" : `<a href="#/m/${m.id}" class="muted">${m.outs.length} outcomes ${icon("right", "ic sm")}</a>`}</div>
  </article>`;
}
function viewCat(cat, sub){
  const c = CAT[cat]; if(!c) return view404();
  const all = inCat(cat), subs = [...new Set(all.map(m => m.sub).filter(Boolean))];
  const ms = sub ? all.filter(m => m.sub === sub) : all;
  if(!TP.m || TP.m.cat !== cat) selectTrade(ms[0] || all[0], 0, "yes");
  return `<div class="wrap catpage">
    <nav class="sidenav" aria-label="Categories">${ITJ.cats.map(x => `<a href="#/c/${x.id}"${x.id === cat ? ' aria-current="page"' : ""}>${esc(x.label)}<span>${inCat(x.id).length}</span></a>`).join("")}</nav>
    <div>
      <div class="page-hd" style="padding-top:0"><h1>${esc(c.label)}</h1></div>
      <div class="chips" role="toolbar" aria-label="Filter"><a class="chip line" href="#/c/${cat}" aria-pressed="${!sub}">All</a>${subs.map(s => `<a class="chip line" href="#/c/${cat}?s=${encodeURIComponent(s)}" aria-pressed="${sub === s}">${esc(s)}</a>`).join("")}</div>
      <div class="list">${ms.map(lcard).join("")}</div>
    </div>
    <aside class="aside" aria-label="Trade"><div class="tp" data-tp></div></aside>
  </div>`;
}

/* ---- live ---- */
function tapeItem(t){
  return `<li><span class="avatar">${avatar(t.u)}</span><div class="w"><b>${esc(t.u)}</b> <span>bought</span> <b class="${t.side === "yes" ? "up" : "down"}">${t.side === "yes" ? "Yes" : "No"}</b>${t.m.kind === "binary" ? "" : ` <span>· ${esc(t.o.n)}</span>`}<a href="#/m/${t.m.id}">${esc(t.m.title)}</a></div><b class="num">${usd0(t.amt)}</b></li>`;
}
function seedTape(n){
  const r = rng(77), out = [];
  for(let i = 0; i < n; i++){ const m = LIST[Math.floor(r() * LIST.length)], o = m.outs[Math.floor(r() * m.outs.length)]; out.push({u: NAMES[Math.floor(r() * NAMES.length)], m, o, side: r() < .55 ? "yes" : "no", amt: Math.round(Math.exp(1.4 + r() * r() * 6))}); }
  return TAPE.concat(out).slice(0, n);
}
function viewLive(){
  return `<div class="wrap"><div class="page-hd"><h1><span class="livedot" aria-hidden="true"></span>Live now</h1></div>
    <div class="live-grid"><div>${liveNow().map(m => {
      const up = m.updates && m.updates[0], rows = m.kind === "binary" ? [m.outs[0]] : sortedOuts(m).slice(0, 3);
      return `<article class="lv">${thumb(m, "")}<div class="lv-b">
        <div class="lc-k"><span class="livetag">Live</span><span>${esc(m.live)}</span></div>
        <div class="lc-t"><a href="#/m/${m.id}">${esc(m.title)}</a>${plusBtn(m)}</div>
        ${up ? `<div class="lv-up"><b>${ago(up[0])} ago</b><span>${esc(up[1])}</span></div>` : ""}
        ${rows.map(o => `<div class="lc-row"><span class="nm">${m.kind === "binary" ? "Chance" : markB(o) + esc(o.n)}</span>${pcB(m, o, "span", "pc")}<span class="px">${tradeBtn(m, o, "yes", `Yes <span data-m="${m.id}" data-o="${o.i}" data-b="ya">${yesAsk(o)}¢</span>`)}${tradeBtn(m, o, "no", `No <span data-m="${m.id}" data-o="${o.i}" data-b="na">${noAsk(o)}¢</span>`)}</span></div>`).join("")}
      </div></article>`; }).join("")}</div>
      <aside class="panel"><div class="panel-hd"><h3>Trades</h3><span class="livetag">Live</span></div><ul class="tape-list" data-tape>${seedTape(14).map(tapeItem).join("")}</ul></aside>
    </div></div>`;
}

/* ---- ideas ---- */
function viewIdeas(){
  const posts = S.posts.concat(ITJ.ideas);
  return `<div class="wrap"><div class="page-hd"><h1>Ideas</h1></div>
    <div class="live-grid"><div>
      <form class="compose" data-form="post" data-m=""><input name="t" placeholder="What's your read on a case?" maxlength="280" aria-label="Your post"><button class="btn btn-dark">Post</button></form>
      <div>${posts.map(postHTML).join("")}</div></div>
      <aside class="side">
        <div class="panel"><div class="panel-hd"><h3>Top forecasters</h3><a href="#/leaderboard">See all</a></div><div style="padding:0 16px 10px">${lbRows("profit", "month", "", 6)}</div></div>
        <div class="panel"><div class="panel-hd"><h3>Trending</h3></div><ol class="tlist">${tlist("trending")}</ol></div>
      </aside></div></div>`;
}

/* ---- leaderboard ---- */
function viewBoard(tab, period, cat){
  const filters = `<div class="filters"><label class="dd"><select data-lb="period" aria-label="Period">${[["all", "All time"], ["month", "This month"], ["week", "This week"]].map(([v, l]) => `<option value="${v}"${period === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="dd"><select data-lb="cat" aria-label="Category"><option value="">All categories</option>${ITJ.cats.map(c => `<option value="${c.id}"${cat === c.id ? " selected" : ""}>${esc(c.label)}</option>`).join("")}</select></label></div>`;
  return `<div class="wrap"><div class="page-hd"><h1><a href="#/leaderboard"${tab === "board" ? "" : ' class="alt"'}>Leaderboard</a></h1><h1><a href="#/leaderboard?tab=activity"${tab === "activity" ? "" : ' class="alt"'}>Activity</a></h1></div>
    ${tab === "activity" ? `<div class="panel" style="margin-top:18px"><ul class="tape-list" data-tape style="max-height:none">${seedTape(14).map(tapeItem).join("")}</ul></div>` : filters + lbHTML(10, period, cat)}</div>`;
}

/* ---- portfolio ---- */
function viewPortfolio(tab){
  if(!S.user) return `<div class="wrap"><div class="empty"><h3>Your portfolio lives here</h3><p>Sign up to get $1,000 in practice credits and start trading.</p><button class="btn btn-green" data-act="signup">Sign up</button></div></div>`;
  const ps = posList(), val = posValue(), cost = ps.reduce((a, p) => a + p.cost, 0);
  const pnl = val - cost + S.realized;
  const tabs = [["positions", "Positions"], ["history", "History"], ["watch", "Watchlist"]];
  let body;
  if(tab === "history") body = S.hist.length ? `<table class="tbl"><thead><tr><th>Market</th><th class="hide-s">Date</th><th class="r">Contracts</th><th class="r hide-s">Price</th><th class="r">Total</th></tr></thead><tbody>${S.hist.map(h => { const m = MK[h.m]; if(!m) return ""; return `<tr><td><div class="mm">${thumb(m, "thumb xs")}<div><a href="#/m/${m.id}">${esc(m.title)}</a><div class="muted" style="font-size:12.5px">${h.act === "buy" ? "Bought" : "Sold"} <b class="${h.side === "yes" ? "up" : "down"}">${h.side === "yes" ? "Yes" : "No"}</b>${m.kind === "binary" ? "" : " · " + esc(m.outs[h.oi].n)}</div></div></div></td><td class="hide-s">${dShort(h.t)}, ${tClock(h.t)}</td><td class="r">${num(h.qty)}</td><td class="r hide-s">${h.avg.toFixed(1).replace(".0", "")}¢</td><td class="r">${usd(h.total)}</td></tr>`; }).join("")}</tbody></table>` : `<div class="empty"><h3>No trades yet</h3><p>Your fills will show up here.</p></div>`;
  else if(tab === "watch") body = S.watch.length ? `<div class="grid g3" style="margin-top:14px">${S.watch.map(id => MK[id]).filter(Boolean).map(m => card(m)).join("")}</div>` : `<div class="empty"><h3>Nothing on your watchlist</h3><p>Tap the + on any market to follow it.</p><a class="btn btn-green" href="#/all">Browse markets</a></div>`;
  else body = ps.length ? `<table class="tbl"><thead><tr><th>Market</th><th class="r">Contracts</th><th class="r hide-s">Avg</th><th class="r hide-s">Now</th><th class="r">Value</th><th class="r">Return</th><th></th></tr></thead><tbody>${ps.map(p => {
      const now = p.side === "yes" ? p.o.p : 100 - p.o.p, ret = p.value - p.cost;
      return `<tr><td><div class="mm">${thumb(p.m, "thumb xs")}<div><a href="#/m/${p.m.id}">${esc(p.m.title)}</a><div class="muted" style="font-size:12.5px"><b class="${p.side === "yes" ? "up" : "down"}">${p.side === "yes" ? "Yes" : "No"}</b>${p.m.kind === "binary" ? "" : " · " + esc(p.o.n)}</div></div></div></td>
        <td class="r">${num(p.qty)}</td><td class="r hide-s">${p.avg.toFixed(1).replace(".0", "")}¢</td><td class="r hide-s">${Math.round(now)}¢</td><td class="r">${usd(p.value)}</td><td class="r ${ret >= 0 ? "up" : "down"}">${ret >= 0 ? "+" : ""}${usd(ret)}</td>
        <td class="r"><button class="btn btn-soft" data-act="sellpos" data-m="${p.m.id}" data-o="${p.o.i}" data-s="${p.side}">Sell</button></td></tr>`; }).join("")}</tbody></table>`
    : `<div class="empty"><h3>No positions yet</h3><p>Buy Yes or No on any market and it will show up here.</p><a class="btn btn-green" href="#/">Explore markets</a></div>`;
  return `<div class="wrap"><div class="page-hd"><h1>Portfolio</h1><button class="btn btn-green" data-act="deposit" style="margin-left:auto">Deposit</button></div>
    <div class="pf-top">
      <div class="pf-stat"><small>Portfolio value</small><b data-b="pv">${usd(pv())}</b></div>
      <div class="pf-stat"><small>Cash</small><b data-b="cash">${usd(S.cash)}</b></div>
      <div class="pf-stat"><small>Positions</small><b>${usd(val)}</b></div>
      <div class="pf-stat"><small>All-time return</small><b class="${pnl >= 0 ? "up" : "down"}">${pnl >= 0 ? "+" : ""}${usd(pnl)}</b></div>
    </div>
    <div class="tabs-lg" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" data-act="pftab" data-k="${k}">${l}</button>`).join("")}</div>
    ${body}</div>`;
}

/* ---- profile ---- */
function viewProfile(h){
  const u = USER[h] || (S.user && S.user.h === h ? {h, profit: 0, volume: 0, preds: S.hist.length, joined: "today"} : null);
  if(!u) return view404();
  const r = rng(hash(h)), ms = LIST.slice().sort(() => r() - .5).slice(0, 4);
  const posts = S.posts.concat(ITJ.ideas).filter(p => p.u === h);
  return `<div class="wrap"><div class="prof"><span class="avatar">${USER[h] ? avatar(h) : avatarSVG(h)}</span><div><h1>${esc(h)}</h1><p>Joined ${esc(u.joined)}</p></div></div>
    <div class="pf-top"><div class="pf-stat"><small>Profit</small><b class="up">${usd0(u.profit)}</b></div><div class="pf-stat"><small>Volume</small><b>${usdK(u.volume)}</b></div><div class="pf-stat"><small>Predictions</small><b>${num(u.preds)}</b></div><div class="pf-stat"><small>Win rate</small><b>${52 + Math.round(r() * 17)}%</b></div></div>
    <div class="sec"><div class="sec-hd"><h2>Positions</h2></div><div class="grid">${ms.map(m => card(m)).join("")}</div></div>
    ${posts.length ? `<div class="sec"><div class="sec-hd"><h2>Ideas</h2></div><div style="border-top:1px solid var(--line);max-width:760px">${posts.map(postHTML).join("")}</div></div>` : ""}</div>`;
}

/* ---- how it works ---- */
function viewHow(){
  const steps = [["lawbooks", "Pick a case", "Rulings, verdicts and settlements in courts across the country, each a plain question with a date."],
    ["exchange", "Buy Yes or No", "Prices run from 1¢ to 99¢ and read as the crowd's odds. Sell any time before the market closes."],
    ["cash", "Get paid on the record", "When the decision hits the docket the market resolves. Each winning contract pays $1."]];
  const faq = [["What decides a market?", "The court's own record: the docketed order, the verdict form, the transcript. Each market's rules name the source and what happens in edge cases, like a settlement or a dismissal."],
    ["What if the case settles?", "The rules for each market say how a settlement resolves it, before anyone trades. Most 'Will the court rule…' markets resolve No on a settlement."],
    ["Can insiders trade?", "No one with non-public information about a case may trade it. Surveillance flags accounts that trade ahead of sealed or embargoed news, and freezes their payouts."],
    ["What does it cost?", "Takers pay a 1% fee on the value traded. Resting orders that add liquidity trade free."],
    ["Is this real money?", "Not here. This demo runs on practice credits, and every case and trader is fictional."]];
  return `<div class="wrap" style="max-width:980px"><div class="page-hd"><h1>How it works</h1></div>
    <div class="steps">${steps.map((s, i) => `<div class="step"><img src="${IMG(s[0])}" alt=""><div class="step-b"><span class="mark lg">${i + 1}</span><h4>${s[1]}</h4><p>${s[2]}</p></div></div>`).join("")}</div>
    <section class="blk"><h3 style="font-family:var(--display);font-size:28px;margin:0">Questions</h3><div class="acc">${faq.map(([q, a]) => `<details><summary>${icon("info")}${q}<span class="chev">${icon("down")}</span></summary><div class="acc-b">${a}</div></details>`).join("")}</div></section>
    <div style="margin-top:32px;display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-green" href="#/">Explore markets</a><a class="btn btn-soft" href="sim/">${icon("play", "ic sm")}Play the simulation</a></div></div>`;
}

/* ---- search page (phones) ---- */
function viewSearch(q){
  return `<div class="wrap"><div class="page-hd"><h1>Search</h1></div>
    <div class="search" style="display:block;width:100%;margin:8px 0 0">${icon("search")}<input id="q2" type="search" placeholder="Search markets or profiles" value="${esc(q)}" autocomplete="off" aria-label="Search markets or profiles"></div>
    <div id="sres2" style="margin-top:10px">${searchHTML(q)}</div></div>`;
}
const view404 = () => `<div class="wrap"><div class="empty"><h3>Market not found</h3><p>It may have closed, or the link is wrong.</p><a class="btn btn-green" href="#/">Back to markets</a></div></div>`;

/* ============ search ============ */
function searchHTML(q){
  q = (q || "").trim().toLowerCase();
  const ms = q ? LIST.filter(m => (m.title + " " + (m.case ? m.case.name : "") + " " + CAT[m.cat].label + " " + (m.sub || "") + " " + m.outs.map(o => o.n).join(" ")).toLowerCase().includes(q)).slice(0, 7) : trending().slice(0, 5);
  const us = q ? ITJ.users.filter(u => u.h.includes(q)).slice(0, 3) : [];
  const cs = q ? ITJ.cats.filter(c => c.label.toLowerCase().includes(q)) : [];
  if(!ms.length && !us.length && !cs.length) return `<div class="none">No markets or profiles match “${esc(q)}”.</div>`;
  let h = "";
  if(ms.length) h += `<h6>${q ? "Markets" : "Trending"}</h6>` + ms.map(m => { const o = lead(m); return `<a class="sres" role="option" href="#/m/${m.id}">${thumb(m, "thumb sm")}<span class="tt">${esc(m.title)}<small>${esc(CAT[m.cat].label)}${m.kind === "binary" ? "" : " · " + esc(o.n)}</small></span><b>${pct(o.p)}</b></a>`; }).join("");
  if(cs.length) h += `<h6>Categories</h6>` + cs.map(c => `<a class="sres" role="option" href="#/c/${c.id}"><span class="mark" style="background:var(--ink)">${esc(c.label[0])}</span><span class="tt">${esc(c.label)}<small>${inCat(c.id).length} markets</small></span></a>`).join("");
  if(us.length) h += `<h6>Profiles</h6>` + us.map(u => `<a class="sres" role="option" href="#/u/${encodeURIComponent(u.h)}"><span class="avatar">${avatar(u.h)}</span><span class="tt">${esc(u.h)}<small>${usd0(u.profit)} profit</small></span></a>`).join("");
  return h;
}

/* ============ overlays ============ */
const scrim = $("#scrim"), modal = $("#modal"), sheet = $("#sheet");
let toastT = 0;
function toast(msg){
  const t = $("#toast");
  t.innerHTML = `<span class="ok">${icon("check", "ic sm")}</span>${esc(msg)}`;
  t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2800);
}
function openModal(html){ modal.innerHTML = `<button class="iconbtn x" data-act="close" aria-label="Close">${icon("x")}</button>` + html; modal.classList.add("on"); scrim.classList.add("on"); setTimeout(() => { const f = $("input,button:not(.x)", modal); if(f) f.focus(); }, 60); }
function openSheet(){ sheet.innerHTML = `<div class="grab"></div><div class="tp" data-tp></div>`; renderTP(); sheet.classList.add("on"); scrim.classList.add("on"); }
function closeAll(){ for(const el of [modal, sheet, scrim]) el.classList.remove("on"); const mn = $(".menu"); if(mn) mn.remove(); setTimeout(() => { if(!sheet.classList.contains("on")) sheet.innerHTML = ""; }, 300); }
function authModal(login){
  openModal(`<h2>${login ? "Log in" : "Join I, the Jury"}</h2><p class="sub">${login ? "Welcome back." : "Trade on court cases with $1,000 in practice credits."}</p>
    <div class="oauth"><button data-act="auth" data-via="google"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.4-.2-2.1H12v4h6c-.1 1-.8 2.5-2.3 3.5v2.8h3.7c2.1-2 3.2-4.9 3.2-8.2z"/><path fill="#34A853" d="M12 23c3 0 5.6-1 7.4-2.7l-3.7-2.8c-1 .7-2.3 1.2-3.7 1.2-2.9 0-5.3-1.9-6.2-4.5H2v2.9C3.8 20.6 7.6 23 12 23z"/><path fill="#FBBC05" d="M5.8 14.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V6.9H2C1.4 8.5 1 10.2 1 12s.4 3.5 1 5.1l3.8-2.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.6 2.1 15 1 12 1 7.6 1 3.8 3.4 2 6.9l3.8 2.9c.9-2.6 3.3-4.4 6.2-4.4z"/></svg>Continue with Google</button>
    <button data-act="auth" data-via="apple"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"/></svg>Continue with Apple</button></div>
    <div class="or">or</div>
    <form data-form="auth"><input class="field" name="email" type="email" placeholder="Email address" autocomplete="email" required><button class="btn btn-green btn-block" style="margin-top:10px">Continue</button></form>
    <p class="fine">A demo account. No real money, nothing is sent anywhere.</p>`);
}
function signIn(handle){
  const fresh = !S.user;
  S.user = {h: handle.replace(/[^a-z0-9._]/gi, "").toLowerCase().slice(0, 18) || "you", joined: dShort(Date.now()) + ", " + new Date().getFullYear()};
  if(fresh && !S.cash && !S.hist.length) S.cash = 1000;
  save(); closeAll(); renderAcct();
  if(TP.m) renderTP();
  if(ROUTE.name === "portfolio") route();
  toast(fresh ? `Welcome, ${S.user.h}. $1,000 in practice credits added.` : `Welcome back, ${S.user.h}.`);
}
function depositModal(){
  openModal(`<h2>Deposit</h2><p class="sub">Add practice credits to your account.</p>
    <div class="amts" role="group" aria-label="Amount">${[100, 500, 1000].map((a, i) => `<button data-act="amtpick" data-k="${a}" aria-pressed="${i === 1}">$${num(a)}</button>`).join("")}</div>
    <button class="btn btn-green btn-block" data-act="depositgo" data-k="500">Add $500</button>
    <p class="fine">Bank transfer, debit card and wire would live here.</p>`);
}
function rulesModal(m){
  openModal(`<h2>Full rules</h2><p class="sub">${esc(m.title)}</p>
    <div style="font-size:14.5px;line-height:1.6;color:var(--ink-2);max-height:56vh;overflow:auto">
    <p>${rulesText(m)}</p>
    ${m.case ? `<p><b>Source.</b> The docket of ${esc(m.case.court)} in ${esc(m.case.name)} (${esc(m.case.docket)}), and the court's own orders and opinions.</p>` : `<p><b>Source.</b> The official record named above.</p>`}
    <p><b>Close.</b> Trading stops at 5:00pm ET on ${dLong(m.closeAt)}, or earlier if the outcome is known.</p>
    <p><b>Edge cases.</b> A decision that is later reversed on appeal does not change the result. An order entered under seal counts from the day it is unsealed.</p>
    <p><b>Payout.</b> Each winning contract pays $1. Losing contracts expire worthless.</p></div>`);
}
function menu(btn){
  const old = $(".menu"); if(old){ old.remove(); return; }
  const r = btn.getBoundingClientRect(), el = document.createElement("div");
  el.className = "menu"; el.setAttribute("role", "menu");
  el.style.top = (r.bottom + 8 + scrollY) + "px"; el.style.right = Math.max(12, innerWidth - r.right) + "px";
  el.innerHTML = `<div class="menu-hd"><span class="avatar">${avatarSVG(S.user.h)}</span><div><b>${esc(S.user.h)}</b><small>${usd(pv())} portfolio</small></div></div>
    <a role="menuitem" href="#/portfolio">${icon("wallet")}Portfolio</a><a role="menuitem" href="#/u/${encodeURIComponent(S.user.h)}">${icon("user")}Profile</a>
    <a role="menuitem" href="#/portfolio?tab=watch">${icon("plus")}Watchlist</a><button role="menuitem" data-act="deposit">${icon("dollar")}Deposit</button>
    <button role="menuitem" data-act="reset">${icon("reset")}Reset demo</button><button role="menuitem" data-act="logout">${icon("out")}Log out</button>`;
  document.body.appendChild(el);
}

/* ============ hero carousel and rails ============ */
const HERO = {i: 0, hold: false, n: 0};
function heroGo(i){
  const hero = $("#hero"); if(!hero) return;
  const slides = $$(".slide", hero); HERO.n = slides.length;
  HERO.i = (i + HERO.n) % HERO.n;
  slides.forEach((s, k) => { s.classList.toggle("on", k === HERO.i); s.setAttribute("aria-hidden", k !== HERO.i); });
  $$(".dots button", hero).forEach((d, k) => d.toggleAttribute("aria-current", k === HERO.i));
  const ids = ITJ.hero.filter(id => MK[id]);
  $('[data-hl="prev"]', hero).textContent = MK[ids[(HERO.i - 1 + HERO.n) % HERO.n]].title;
  $('[data-hl="next"]', hero).textContent = MK[ids[(HERO.i + 1) % HERO.n]].title;
}
function railState(track){
  const sec = track.closest(".sec"); if(!sec) return;
  const [l, r] = $$(".ctrls .arrow", sec);
  if(l) l.disabled = track.scrollLeft < 4;
  if(r) r.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
}
function hydrate(root){
  $$(".chart[data-chart]", root).forEach(drawChart);
  $$(".track", root).forEach(t => { railState(t); t.addEventListener("scroll", () => railState(t), {passive: true}); });
  const hero = $("#hero", root);
  if(hero){
    HERO.i = 0; heroGo(0);
    hero.addEventListener("mouseenter", () => HERO.hold = true);
    hero.addEventListener("mouseleave", () => HERO.hold = false);
    hero.addEventListener("focusin", () => HERO.hold = true);
    hero.addEventListener("focusout", () => HERO.hold = false);
    let x0 = null;
    hero.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, {passive: true});
    hero.addEventListener("touchend", e => { if(x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if(Math.abs(dx) > 50) heroGo(HERO.i + (dx < 0 ? 1 : -1)); x0 = null; });
  }
  renderTP();
}

/* ============ router ============ */
function route(){
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, qs] = raw.split("?"), q = new URLSearchParams(qs || "");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  closeAll();
  const prevName = ROUTE.name, prevM = ROUTE.m;
  ROUTE = {name: parts[0] || "home", m: null, range: ROUTE.range};
  let html, nav = "", cat = "", title = "I, the Jury · Prediction markets on court cases";
  switch(parts[0]){
    case undefined: html = viewHome(); nav = "home"; cat = "home"; break;
    case "m": {
      const m = MK[parts[1]];
      if(!m){ html = view404(); break; }
      ROUTE.m = m;
      if(prevM !== m) ROUTE.range = "1M";
      const o = q.has("o") ? clamp(+q.get("o") || 0, 0, m.outs.length - 1) : (TP.m === m ? TP.oi : sortedOuts(m)[0].i);
      selectTrade(m, o, q.get("s") === "no" ? "no" : q.has("s") ? "yes" : (TP.m === m ? TP.side : "yes"));
      if(prevName !== "m" || prevM !== m) TP.tab = TP.next || "buy";
      TP.next = null;
      html = viewMarket(m); nav = "home"; cat = m.cat; title = m.title + " · I, the Jury"; break;
    }
    case "c": html = viewCat(parts[1], q.get("s")); nav = "home"; cat = parts[1]; title = (CAT[parts[1]] ? CAT[parts[1]].label : "Markets") + " · I, the Jury"; break;
    case "new": case "all": html = viewGrid(parts[0], q.get("c")); nav = "home"; cat = parts[0]; break;
    case "live": html = viewLive(); nav = "live"; title = "Live · I, the Jury"; break;
    case "ideas": html = viewIdeas(); nav = "ideas"; title = "Ideas · I, the Jury"; break;
    case "leaderboard": html = viewBoard(q.get("tab") === "activity" ? "activity" : "board", q.get("p") || "all", q.get("c") || ""); nav = "leaderboard"; title = "Leaderboard · I, the Jury"; break;
    case "portfolio": html = viewPortfolio(q.get("tab") || "positions"); nav = "portfolio"; title = "Portfolio · I, the Jury"; break;
    case "u": html = viewProfile(parts[1]); title = parts[1] + " · I, the Jury"; break;
    case "how": html = viewHow(); title = "How it works · I, the Jury"; break;
    case "search": html = viewSearch(q.get("q") || ""); nav = "search"; break;
    default: html = view404();
  }
  if(ROUTE.name !== "m" && ROUTE.name !== "c") TP.m = null;
  const view = $("#view");
  view.innerHTML = html;
  document.title = title;
  $$("[data-nav]").forEach(a => { if(a.dataset.nav === nav) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  $$("[data-cat]").forEach(a => { if(a.dataset.cat === cat) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  $$("[data-tab]").forEach(a => { if(a.dataset.tab === (nav === "home" ? "home" : nav)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  const ca = $(`[data-cat="${cat}"]`); if(ca){ const sc = $("#catScroll"); const x = ca.offsetLeft - sc.clientWidth / 2 + ca.clientWidth / 2; if(ca.offsetLeft < sc.scrollLeft || ca.offsetLeft + ca.clientWidth > sc.scrollLeft + sc.clientWidth) sc.scrollLeft = x; }
  if(!(prevName === ROUTE.name && ROUTE.name === "m" && prevM === ROUTE.m)) scrollTo(0, 0);
  hydrate(view);
  if(ROUTE.name === "search"){ const i = $("#q2"); if(i){ i.focus(); i.addEventListener("input", () => { $("#sres2").innerHTML = searchHTML(i.value); }); } }
}

/* ============ events ============ */
document.addEventListener("click", e => {
  const a = e.target.closest("[data-act]");
  if(!a){
    if(!e.target.closest(".search")) $("#sdrop").classList.remove("on");
    if(!e.target.closest(".menu")){ const mn = $(".menu"); if(mn) mn.remove(); }
    return;
  }
  const act = a.dataset.act, m = MK[a.dataset.m];
  switch(act){
    case "trade": {
      e.preventDefault(); e.stopPropagation();
      const oi = +a.dataset.o || 0, side = a.dataset.s;
      if(ROUTE.name === "m" && ROUTE.m === m || ROUTE.name === "c"){
        selectTrade(m, oi, side);
        if(ROUTE.name === "c") $$(".lcard").forEach(c => c.classList.toggle("sel", !!c.querySelector(`[data-m="${m.id}"]`)));
        if(ROUTE.name === "m") $$(".ot-row").forEach(r => r.classList.toggle("sel", +r.dataset.o === oi));
        renderTP(); tpCalc();
        if(isNarrow()) openSheet();
        else { const inp = $(".aside [data-tp-amt]"); if(inp) inp.focus({preventScroll: true}); }
      } else if(isNarrow()){ selectTrade(m, oi, side); TP.tab = "buy"; openSheet(); }
      else location.hash = `#/m/${m.id}?o=${oi}&s=${side}`;
      break;
    }
    case "selout": if(ROUTE.m === m){ selectTrade(m, +a.dataset.o, TP.side); $$(".ot-row").forEach(r => r.classList.toggle("sel", r === a)); renderTP(); tpCalc(); } break;
    case "watch": {
      e.preventDefault();
      const on = !S.watch.includes(m.id);
      S.watch = on ? S.watch.concat(m.id) : S.watch.filter(x => x !== m.id); save();
      $$(`[data-act="watch"][data-m="${m.id}"]`).forEach(b => { b.setAttribute("aria-pressed", on); b.setAttribute("aria-label", (on ? "Remove from" : "Add to") + " watchlist"); });
      toast(on ? "Added to your watchlist" : "Removed from your watchlist");
      break;
    }
    case "hero": if(a.dataset.i !== undefined) heroGo(+a.dataset.i); else heroGo(HERO.i + +a.dataset.dir); break;
    case "rail": { const t = $("#" + a.dataset.t); t.scrollBy({left: +a.dataset.dir * t.clientWidth * .9, behavior: "smooth"}); break; }
    case "catmore": { const sc = $("#catScroll"); sc.scrollBy({left: sc.clientWidth * .7, behavior: "smooth"}); break; }
    case "tlist": {
      $$('[data-act="tlist"]').forEach(b => b.setAttribute("aria-selected", b === a));
      $("#tlist").innerHTML = tlist(a.dataset.k); break;
    }
    case "gridcat": {
      $$('[data-act="gridcat"]').forEach(b => b.setAttribute("aria-pressed", b === a));
      const c = a.dataset.c, ms = LIST.filter(x => !c || x.cat === c).sort((x, y) => y.vol - x.vol).slice(0, 8);
      $("#homeGrid").innerHTML = ms.map(x => card(x)).join(""); break;
    }
    case "range": {
      ROUTE.range = a.dataset.r;
      $$('[data-act="range"]').forEach(b => b.setAttribute("aria-pressed", b === a));
      const ch = $(".chart[data-mode='full']"); if(ch){ ch.dataset.range = a.dataset.r; drawChart(ch); }
      break;
    }
    case "tptab": TP.tab = a.dataset.k; TP.step = "form"; TP.err = ""; if(TP.tab === "sell"){ const p = S.pos[posKey(TP.m.id, TP.oi, TP.side)]; TP.sell = p ? String(p.qty) : ""; } renderTP(); break;
    case "tpside": TP.side = a.dataset.k; TP.step = "form"; TP.err = ""; if(TP.tab === "sell"){ const p = S.pos[posKey(TP.m.id, TP.oi, TP.side)]; TP.sell = p ? String(p.qty) : ""; } renderTP(); break;
    case "tpq": {
      const k = a.dataset.k, cur = parseFloat(TP.amt) || 0;
      const v = k === "max" ? Math.floor((S.user ? S.cash : 1000) / 1.01 * 100) / 100 : cur + +k;
      TP.amt = String(Math.round(v * 100) / 100); TP.step = "form"; TP.err = ""; renderTP(); break;
    }
    case "tpsq": { const p = S.pos[posKey(TP.m.id, TP.oi, TP.side)]; if(p){ TP.sell = String(Math.max(1, Math.floor(p.qty * +a.dataset.k))); renderTP(); } break; }
    case "tpreview": {
      TP.err = "";
      if(TP.tab === "buy"){ const f = fill(TP.m.outs[TP.oi], TP.side, parseFloat(TP.amt) || 0); if(f.qty < 1) TP.err = "Enter an amount to buy."; else if(f.cost + f.fee > S.cash + 1e-9) TP.err = `You have ${usd(S.cash)} available.`; }
      else if(!(+TP.sell >= 1)) TP.err = "Enter how many contracts to sell.";
      if(!TP.err) TP.step = "review";
      renderTP(); break;
    }
    case "tpconfirm": doTrade(); renderTP(); break;
    case "tpback": TP.step = "form"; renderTP(); break;
    case "tpagain": TP.step = "form"; TP.last = null; renderTP(); break;
    case "sellpos": selectTrade(m, +a.dataset.o, a.dataset.s); TP.tab = "sell"; TP.next = "sell"; { const p = S.pos[posKey(m.id, +a.dataset.o, a.dataset.s)]; TP.sell = p ? String(p.qty) : ""; } if(isNarrow()) openSheet(); else location.hash = `#/m/${m.id}?o=${a.dataset.o}&s=${a.dataset.s}`; break;
    case "login": authModal(true); break;
    case "signup": authModal(false); break;
    case "auth": signIn(a.dataset.via === "google" ? "gavel.fan" : "applejuror"); break;
    case "deposit": if(!S.user){ authModal(false); break; } { const mn = $(".menu"); if(mn) mn.remove(); } depositModal(); break;
    case "amtpick": $$('[data-act="amtpick"]').forEach(b => b.setAttribute("aria-pressed", b === a)); { const go = $('[data-act="depositgo"]'); go.dataset.k = a.dataset.k; go.textContent = "Add $" + num(+a.dataset.k); } break;
    case "depositgo": S.cash = Math.round((S.cash + +a.dataset.k) * 100) / 100; save(); closeAll(); renderAcct(); if(TP.m) renderTP(); if(ROUTE.name === "portfolio") route(); toast(`${usd0(+a.dataset.k)} in practice credits added`); break;
    case "menu": e.stopPropagation(); menu(a); break;
    case "logout": S.user = null; save(); closeAll(); renderAcct(); if(TP.m) renderTP(); route(); toast("Logged out"); break;
    case "reset": { const keep = S.user && S.user.h; S = blank(); if(keep){ S.user = {h: keep, joined: dShort(Date.now())}; S.cash = 1000; } save(); closeAll(); renderAcct(); route(); toast("Demo reset: $1,000 in fresh credits"); break; }
    case "close": closeAll(); break;
    case "rules": rulesModal(m); break;
    case "share": {
      const url = location.origin + location.pathname + "#/m/" + (m ? m.id : "");
      if(navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
      toast("Link copied"); break;
    }
    case "cal": toast(`Closes ${dLong(m.closeAt)} at 5:00pm. Added to your calendar.`); break;
    case "jump": e.preventDefault(); { const t = document.getElementById(a.dataset.t); if(t) t.scrollIntoView({behavior: "smooth"}); } break;
    case "like": {
      const id = a.dataset.id, on = !S.liked.includes(id);
      S.liked = on ? S.liked.concat(id) : S.liked.filter(x => x !== id); save();
      a.setAttribute("aria-pressed", on); const sp = $("span", a); sp.textContent = +sp.textContent + (on ? 1 : -1); break;
    }
    case "reply": if(m) location.hash = "#/m/" + m.id; break;
    case "pftab": location.hash = "#/portfolio" + (a.dataset.k === "positions" ? "" : "?tab=" + a.dataset.k); break;
  }
});
document.addEventListener("submit", e => {
  const f = e.target.closest("form[data-form]"); if(!f) return;
  e.preventDefault();
  if(f.dataset.form === "auth"){ const v = f.email.value.trim(); signIn(v.split("@")[0] || "you"); return; }
  if(f.dataset.form === "post"){
    if(!S.user){ authModal(false); return; }
    const t = f.t.value.trim(); if(!t) return;
    const mid = f.dataset.m || (trending()[0] || LIST[0]).id;
    S.posts.unshift({id: "p" + Date.now(), u: S.user.h, mine: true, ago: -(Date.now() - NOW0) / MIN, m: mid, text: t, likes: 0, replies: 0}); save();
    route(); toast("Posted");
  }
});
document.addEventListener("input", e => {
  const t = e.target;
  if(t.matches("[data-tp-amt]")){
    const v = t.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1").replace(/^(\d*\.\d{0,2}).*$/, "$1").slice(0, 9);
    TP.amt = v; TP.step = "form"; TP.err = "";
    t.value = v ? "$" + v : "";
    for(const x of $$("[data-tp-amt]")) if(x !== t) x.value = t.value;
    tpCalc();
  } else if(t.matches("[data-tp-sell]")){
    const p = S.pos[posKey(TP.m.id, TP.oi, TP.side)];
    const v = t.value.replace(/\D/g, "").slice(0, 8); TP.sell = p ? String(Math.min(+v || 0, p.qty) || "") : v; t.value = TP.sell; TP.step = "form"; tpCalc();
  } else if(t.id === "q"){
    const d = $("#sdrop"); d.innerHTML = searchHTML(t.value); d.classList.add("on"); t.setAttribute("aria-expanded", "true");
  }
});
document.addEventListener("change", e => {
  const t = e.target;
  if(t.matches("[data-tp-out]")){ selectTrade(TP.m, +t.value, TP.side); $$(".ot-row").forEach(r => r.classList.toggle("sel", +r.dataset.o === TP.oi)); renderTP(); tpCalc(); }
  else if(t.matches("[data-lb]")){ const p = $('[data-lb="period"]').value, c = $('[data-lb="cat"]').value; location.hash = `#/leaderboard?p=${p}${c ? "&c=" + c : ""}`; }
});
document.addEventListener("focusin", e => { if(e.target.id === "q"){ const d = $("#sdrop"); d.innerHTML = searchHTML(e.target.value); d.classList.add("on"); } });
document.addEventListener("keydown", e => {
  const tag = (e.target.tagName || "").toLowerCase(), typing = tag === "input" || tag === "textarea" || tag === "select";
  if(e.key === "Escape"){ closeAll(); $("#sdrop").classList.remove("on"); if(e.target.id === "q") e.target.blur(); return; }
  if(e.key === "/" && !typing){ e.preventDefault(); const q = $("#q"); if(q && q.offsetParent) q.focus(); else location.hash = "#/search"; return; }
  if(e.target.id === "q" && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")){
    const items = $$("#sdrop .sres"); if(!items.length) return;
    let i = items.findIndex(x => x.classList.contains("act"));
    if(e.key === "Enter"){ e.preventDefault(); (items[Math.max(0, i)]).click(); $("#sdrop").classList.remove("on"); e.target.blur(); return; }
    e.preventDefault(); i = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items.forEach((x, k) => x.classList.toggle("act", k === i)); items[i].scrollIntoView({block: "nearest"});
    return;
  }
  if(!typing && ROUTE.name === "home" && (e.key === "ArrowRight" || e.key === "ArrowLeft") && e.target.closest && e.target.closest("#hero")) heroGo(HERO.i + (e.key === "ArrowRight" ? 1 : -1));
});
scrim.addEventListener("click", closeAll);
document.addEventListener("click", e => { if(e.target.closest("#sdrop a")) $("#sdrop").classList.remove("on"); });
let rz = 0;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => $$(".chart[data-chart]").forEach(drawChart), 120); });
addEventListener("hashchange", route);
addEventListener("error", e => { const t = e.target; if(t && t.tagName === "IMG" && !t.dataset.fb){ t.dataset.fb = 1; t.src = IMG("courthouse"); } }, true);

/* ============ start ============ */
renderChrome();
route();
setInterval(tick, 1500);
setInterval(() => { if(ROUTE.name === "home" && !HERO.hold && !document.hidden) heroGo(HERO.i + 1); }, 7000);
setInterval(() => { for(const el of $$("[data-cd]")) el.textContent = countdown(+el.dataset.cd); }, 1000);
setInterval(paintAcct, 4000);
})();
