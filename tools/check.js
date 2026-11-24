/* =====================================================================
   I, the Jury Live — a headless run of the whole term
   ---------------------------------------------------------------------
   node tools/check.js            the report
   node tools/check.js --quick    the report, without the player tests

   Runs the engine in Node with the scenario, checks that money is
   conserved and the replay is exact, and prints how each market traded,
   how each kind of trader did, and what the business did. Use it after
   editing scenario.js.
   ===================================================================== */

const path = require("path");
const SCENARIO = require(path.join(__dirname, "..", "sim", "scenario.js"));
const SimEngine = require(path.join(__dirname, "..", "sim", "engine.js"));
const quick = process.argv.includes("--quick");

const $ = c => "$" + Math.round(c / 100).toLocaleString("en-US");
const pct = x => (x >= 0 ? "+" : "") + (x * 100).toFixed(1) + "%";
const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);

/* every cent is in someone's cash, held back from the insider, behind an
   open contract, or paid in fees; and it all came in with somebody */
function audit(E){
  let cash = 0, withheld = 0, start = 0;
  for(const a of E.agents){ cash += a.cash; withheld += a.withheld || 0; start += a.start; }
  const oi = E.markets.reduce((a, mk) => a + mk.oi * 100, 0);
  return {start, end: cash + withheld + oi + E.fees};
}

/* ---------------- one full run, nobody playing ---------------- */
let t0 = Date.now();
const E = SimEngine.create(SCENARIO);
const tCreate = Date.now() - t0;
t0 = Date.now();
let minCash = Infinity, who = null, worst = 0;
while(SimEngine.step(E)){
  if(E.s % 50 === 0){
    for(const a of E.agents) if(a.cash < minCash){ minCash = a.cash; who = a; }
    const au = audit(E); worst = Math.max(worst, Math.abs(au.end - au.start));
  }
}
const tRun = Date.now() - t0;
const au = audit(E);
console.log(`\nCreated in ${tCreate} ms, ran ${E.s} steps in ${tRun} ms. Agents: ${E.agents.length}.`);
console.log(`Money in: ${$(au.start)}  accounted for: ${$(au.end)}  worst drift: ${worst} cents  ${worst < 1 ? "OK" : "MONEY NOT CONSERVED"}`);
console.log(`Lowest cash seen: ${minCash} cents (${who ? who.type + " " + who.name : ""}) ${minCash >= 0 ? "OK" : "NEGATIVE CASH"}`);

console.log("\nMarkets");
console.log(pad("market", 18) + lpad("open", 6) + lpad("end", 6) + lpad("prior", 7) + lpad("out", 5) + lpad("|p-f|", 7) + lpad("spread", 8) + lpad("1-sided", 8) + lpad("trades", 8) + lpad("value", 12) + lpad("contracts", 11));
for(const mk of E.markets){
  const Mm = E.M.markets[mk.k];
  let dev = 0, n = 0, spr = 0, ns = 0, one = 0, all = 0;
  for(let sec = Math.ceil(mk.openT); sec < (mk.resolvedSec || E.M.len); sec++){
    const p = mk.h.p[sec], f = Mm.fair[Math.min(E.M.STEPS, sec * 4)] * 100;
    if(p === p){ dev += Math.abs(p - f); n++; }
    const b = mk.h.b[sec], a = mk.h.a[sec];
    all++;
    if(b === b && a === a){ spr += a - b; ns++; } else one++;
  }
  console.log(pad(mk.id, 18) + lpad(Math.round(mk.openT), 6) + lpad(Math.round(mk.resolvedT || 0), 6) + lpad(mk.priorPx, 7) + lpad(mk.outcome || "-", 5) +
    lpad((dev / n).toFixed(1), 7) + lpad((spr / ns).toFixed(1), 8) + lpad((one / all * 100).toFixed(1) + "%", 8) + lpad(mk.trades, 8) + lpad($(mk.notional), 12) + lpad(mk.vol.toLocaleString(), 11));
}

/* a price trace around a few big moments */
function trace(id, from, to, every = 3){
  const mk = E.byId[id], Mm = E.M.markets[mk.k], out = [];
  for(let s = from; s <= to; s += every) out.push(`${s}:${mk.h.p[s] === mk.h.p[s] ? mk.h.p[s] : "-"}/${Math.round(Mm.fair[s * 4] * 100)}`);
  console.log(`  ${id} price/fair  ` + out.join("  "));
}
console.log("\nTraces (second: price/fair)");
trace("halcyon-vote", 20, 90, 5);
trace("h1b-block", 110, 270, 8);
trace("pruitt-scotus", 330, 382, 3);
trace("lumen-fairuse", 440, 462, 2);

console.log("\nWho made money");
for(const o of SimEngine.typeStats(E).sort((a, b) => b.avg - a.avg))
  console.log(pad(o.label, 18) + lpad(o.n, 6) + " traded   avg " + lpad(pct(o.avg), 8) + "   P&L " + lpad($(o.pnl), 11) + "   in profit " + lpad(Math.round(o.share * 100) + "%", 4));

const rows = SimEngine.board(E);
console.log(`\nLeaderboard: ${rows.length} traders`);
rows.slice(0, 8).forEach((r, i) => console.log(`  ${i + 1}. ${pad(r.a.name, 16)} ${pad(r.a.type, 7)} ${lpad(pct(r.r), 8)}  ${$(r.v)}`));
console.log("Personas:");
E.personas.forEach(a => { const i = rows.findIndex(r => r.a === a); console.log(`  ${pad(a.name, 16)} ${pad(a.type, 7)} #${i + 1}  ${pct(SimEngine.value(E, a) / a.start - 1)}  trades ${a.trades}`); });
const q = k => rows[Math.floor(rows.length * k)].r;
console.log(`Returns: p10 ${pct(q(.9))}  p25 ${pct(q(.75))}  median ${pct(q(.5))}  p75 ${pct(q(.25))}  p90 ${pct(q(.1))}`);

const st = SimEngine.stats(E);
console.log(`\nBusiness: ${st.pool.toLocaleString()} registered, ${st.traded.toLocaleString()} traded, ${st.wat.toLocaleString()} weekly active, ${st.trades.toLocaleString()} trades`);
console.log(`  value traded ${$(st.notional)}, fees ${$(st.fees)}, retained ${$(st.retained)}, Pro ${st.subs} (${$(st.mrr)}/mo), newsletter ${st.newsletter.toLocaleString()}`);
console.log(`  returned in weeks 3-4: ${st.retention == null ? "-" : Math.round(st.retention * 100) + "%"} of ${st.cohort}`);
st.months.forEach(m => console.log(`  ${m.label}: traded ${$(m.vol)}  fees kept ${$(m.fees)}  subs ${$(m.subs)}`));
st.channels.forEach(c => console.log(`  ${pad(c.label, 30)} ${lpad(c.n, 6)} joined ${lpad(c.traded, 6)} traded ${lpad(c.wat, 6)} active`));
console.log("Milestones: " + E.milestones.map(m => `${Math.round(m.t)}s ${m.text}`).join(" · "));
const ins = E.insider;
console.log(`Insider: bought ${ins.done} for ${$(ins.cost)}, withheld ${$(ins.a.withheld || 0)}`);

if(quick) process.exit(0);

/* ---------------- the player: a few strategies, and the replay ---------------- */
function play(name, strat){
  const W = SimEngine.create(SCENARIO);
  while(W.s < W.M.STEPS){
    strat(W);
    SimEngine.step(W);
  }
  const rows = SimEngine.board(W), i = rows.findIndex(r => r.a === W.you);
  const v = SimEngine.value(W, W.you);
  console.log(`  ${pad(name, 34)} ${lpad($(v), 8)}  ${lpad(pct(v / W.you.start - 1), 8)}  rank ${i + 1} of ${rows.length}  trades ${W.you.txns.length}`);
  return W;
}
console.log("\nThe player");
play("does nothing", () => {});
play("buys the favourite, $100 each", W => {
  for(const mk of W.open){
    if(W.you.pos[mk.k] || W.you.txns.some(x => x.m === mk.k)) continue;
    const p = SimEngine.px(mk), dir = p >= 50 ? "yes" : "no";
    const pv = SimEngine.preview(W, mk.id, dir, "buy", {dollars: 100});
    if(pv && pv.qty) SimEngine.act(W, {k: "order", m: mk.id, dir, op: "buy", type: "market", qty: pv.qty});
  }
});
play("trades the expert line, $150 a market", W => {
  if(W.s % 8) return;
  for(const mk of W.open){
    const p = SimEngine.px(mk), e = W.M.markets[mk.k].expert[W.s] * 100, x = W.you.pos[mk.k];
    if(mk.ba - mk.bb > 4 || Math.abs(x) * 60 > 15000) continue;
    if(e - p > 6 && x >= 0){ const pv = SimEngine.preview(W, mk.id, "yes", "buy", {dollars: 40}); if(pv && pv.qty) SimEngine.act(W, {k: "order", m: mk.id, dir: "yes", op: "buy", type: "market", qty: pv.qty}); }
    if(p - e > 6 && x <= 0){ const pv = SimEngine.preview(W, mk.id, "no", "buy", {dollars: 40}); if(pv && pv.qty) SimEngine.act(W, {k: "order", m: mk.id, dir: "no", op: "buy", type: "market", qty: pv.qty}); }
    if(x > 0 && p - e > 3) SimEngine.act(W, {k: "order", m: mk.id, dir: "yes", op: "sell", type: "market", qty: x});
    if(x < 0 && e - p > 3) SimEngine.act(W, {k: "order", m: mk.id, dir: "no", op: "sell", type: "market", qty: -x});
  }
});
const L = play("limit orders 4¢ under, $60", W => {
  if(W.s % 40) return;
  for(const mk of W.open){
    if(W.you.orders.some(o => o.m === mk.k)) continue;
    const p = SimEngine.px(mk), dir = p >= 50 ? "yes" : "no", up = dir === "yes" ? p - 4 : 100 - p - 4;
    if(up < 2 || W.you.pos[mk.k] * (dir === "yes" ? 1 : -1) < 0) continue;
    SimEngine.act(W, {k: "order", m: mk.id, dir, op: "buy", type: "limit", px: up, qty: Math.floor(6000 / up)});
  }
});

/* replay: rebuild the last run from its log at a few points and compare */
for(const at of [400, 1200, 2400]){
  const R = SimEngine.create(SCENARIO, {log: L.log.filter(x => x.s <= at), to: at});
  const W = SimEngine.create(SCENARIO);
  const log = L.log.slice().sort((a, b) => a.s - b.s);
  let i = 0;
  for(;;){
    while(i < log.length && log[i].s <= W.s && log[i].s <= at) SimEngine.act(W, log[i++]);
    if(W.s >= at) break;
    SimEngine.step(W);
  }
  const same = R.you.cash === W.you.cash && R.markets.every((mk, k) => mk.last === W.markets[k].last && mk.vol === W.markets[k].vol);
  console.log(`  replay to step ${at}: ${same ? "identical" : "DIFFERENT"} (cash ${R.you.cash} vs ${W.you.cash})`);
}
console.log("");
