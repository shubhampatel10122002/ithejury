/* =====================================================================
   I, the Jury Live — the engine
   ---------------------------------------------------------------------
   A small exchange and the people trading on it. No DOM, no clock, no
   storage: give it a scenario and it steps the world forward a quarter
   of a second at a time. sim.js owns the screens; tools/check.js runs
   the whole term in Node.

   Each market is a real order book in whole cents. A Yes contract pays
   $1 if the question resolves Yes; a No contract pays $1 if it resolves
   No. A Yes bid at 62¢ and a No bid at 38¢ make one trade, so the book
   is kept in Yes prices: buying No at 38¢ is selling Yes at 62¢. Prices
   are not scripted. They come from thousands of simulated traders, each
   a strategy, placing orders against the book and against each other:

     court-watchers   trade on what the facts imply, with a short lag
     headline traders react to news late and overshoot
     momentum         buy what is rising, sell what is falling
     contrarians      fade big moves
     true believers   back one side of a case whatever happens
     casual traders   small bets on a hunch, a little too fond of long shots
     whales           big tickets, rarely
     market makers    six firms quoting both sides, leaning against their
                      inventory, stepping back when news breaks

   Only the scenario knows what the facts imply (its `fair` values), and
   the court-watchers see it best. Nobody sees how a case ends.

   The whole run is deterministic: one seed, and the player's actions,
   each stamped with the step it happened on. Replaying the same actions
   rebuilds the same market, which is how a reload carries on where it
   left off.
   ===================================================================== */

const SimEngine = (() => {
  "use strict";

  const DT = .25, HZ = 4;           /* seconds a step; steps a second */
  const ATT_HALF = 30;              /* how fast attention fades after news */
  const HYPE_HALF = 40, HYPE_RAMP = 3;
  const EXPERT_LAG = 6, EXPERT_TAU = 9;
  const SLIP_CAP = 15;              /* a market order walks at most 15¢ past the best price */
  const R0 = 8;                     /* orders a second on an average market */
  const SUB_RATE = 7.5e-5;          /* Pro conversions a second, per registered trader */
  const MM_CASH = 400000;           /* each market maker's capital, in dollars */
  let FEE = .01, RET = .005;        /* set from the scenario */

  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const decay = (dt, half) => Math.pow(.5, dt / half);
  const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };

  /* mulberry32: small, fast, seeded */
  function rng(seed){
    let a = seed >>> 0;
    return () => {
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function gauss(r){ let u = 0; while(u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307179586 * r()); }
  function poisson(r, lam){
    if(!(lam > 0)) return 0;
    if(lam > 25) return Math.max(0, Math.round(lam + Math.sqrt(lam) * gauss(r)));
    const L = Math.exp(-lam); let k = 0, p = r();
    while(p > L){ k++; p *= r(); }
    return k;
  }
  const logUni = (r, lo, hi) => Math.exp(Math.log(lo) + r() * (Math.log(hi) - Math.log(lo)));
  function pickW(r, items, w){
    let sum = 0;
    for(const it of items) sum += w(it);
    if(!(sum > 0)) return null;
    let x = r() * sum;
    for(const it of items){ x -= w(it); if(x <= 0) return it; }
    return items[items.length - 1];
  }

  /* ---------------------------------------------------------------------
     Who trades
     --------------------------------------------------------------------- */
  const TYPES = {
    pro:     {label: "Court-watchers",   blurb: "Read the filings and trade when the price strays from the facts",
              share: .045, act: 2.0, boost: 2.5, bank: [3000, 25000], thr: [2, 4], lag: [1, 4], risk: [.06, .14], bias: 1.5, slip: 3},
    news:    {label: "Headline traders", blurb: "Trade the news the minute it breaks, and overdo it",
              share: .16, act: 1.1, boost: 4.0, bank: [300, 4000], thr: [3, 6], lag: [3, 14], risk: [.06, .18], bias: 3, slip: 6},
    mom:     {label: "Momentum traders", blurb: "Buy what is rising, sell what is falling",
              share: .12, act: 1.0, boost: 1.6, bank: [300, 6000], thr: [2, 5], risk: [.05, .15], slip: 4},
    contra:  {label: "Contrarians",      blurb: "Fade every big move",
              share: .08, act: .9, boost: 1.3, bank: [500, 8000], thr: [3, 6], risk: [.05, .12], slip: 3},
    fan:     {label: "True believers",   blurb: "Back their side of a case whatever the facts",
              share: .10, act: .8, boost: 1.5, bank: [100, 2500], thr: [2, 5], risk: [.08, .25], bias: 2, slip: 5},
    casual:  {label: "Casual traders",   blurb: "Small bets on a hunch, a little too fond of long shots",
              share: .49, act: .6, boost: 1.2, bank: [50, 1500], thr: [0, 2], risk: [.03, .10], slip: 4},
    whale:   {label: "Whales",           blurb: "Big tickets, few trades",
              share: .005, act: 1.2, boost: 2.0, bank: [30000, 150000], thr: [3, 6], lag: [2, 8], risk: [.03, .08], bias: 3, slip: 4},
    mm:      {label: "Market makers",    blurb: "Quote both sides of every market and earn the spread"},
    insider: {label: "Restricted",       blurb: "Traded on confidential information; frozen"},
    you:     {label: "You"}
  };
  const CROWD = ["pro", "news", "mom", "contra", "fan", "casual", "whale"];
  const BASE = Object.fromEntries(CROWD.map(k => [k, TYPES[k].share]));
  /* who each channel brings */
  const MIX = {
    newsletter: {pro: .06, news: .16, mom: .10, contra: .08, fan: .08, casual: .515, whale: .005},
    creators:   {pro: .02, news: .22, mom: .08, contra: .04, fan: .20, casual: .44},
    publishers: {pro: .06, news: .18, mom: .14, contra: .10, fan: .06, casual: .45, whale: .01}
  };

  const FIRST = ["Aaliyah","Aaron","Abdul","Ada","Adrian","Aisha","Alana","Alejandro","Alex","Amara","Amir","Ana","Andre","Anika","Arjun","Ava",
    "Ben","Bianca","Brandon","Bruno","Caleb","Camila","Carlos","Chen","Chloe","Chris","Dahlia","Daniel","Darius","Deja","Diego","Dmitri",
    "Elena","Eli","Emeka","Emma","Esther","Ethan","Fatima","Felix","Gabriel","Grace","Hana","Hassan","Hector","Imani","Ines","Isaac","Ivan",
    "Jada","Jamal","Jasmine","Javier","Jin","Joel","Jordan","Jun","Kai","Kara","Keisha","Kenji","Kevin","Kofi","Laila","Lena","Leo","Lucia",
    "Luis","Maeve","Malik","Maria","Mateo","Maya","Mei","Mia","Miguel","Mina","Nadia","Naomi","Nate","Nia","Nikhil","Noah","Nora","Omar",
    "Owen","Paolo","Priya","Quinn","Rafael","Rania","Ravi","Rosa","Ruth","Ryan","Sana","Sara","Sean","Sofia","Tariq","Tess","Tomas","Uma",
    "Victor","Wei","Yara","Yusuf","Zara","Zoe","Hiro","Ingrid","Marta","Pedro","Siobhan","Tunde","Valeria","Wes"];
  /* [city, latitude, longitude, weight] */
  const CITIES = [["New York",40.71,-74.01,14],["Los Angeles",34.05,-118.24,9],["Chicago",41.88,-87.63,7],["Houston",29.76,-95.37,5],
    ["Phoenix",33.45,-112.07,4],["Philadelphia",39.95,-75.17,4],["San Antonio",29.42,-98.49,3],["San Diego",32.72,-117.16,3],
    ["Dallas",32.78,-96.80,5],["Austin",30.27,-97.74,5],["San Francisco",37.77,-122.42,8],["Seattle",47.61,-122.33,5],["Denver",39.74,-104.99,4],
    ["Washington",38.91,-77.04,9],["Boston",42.36,-71.06,6],["Nashville",36.16,-86.78,3],["Atlanta",33.75,-84.39,5],["Miami",25.76,-80.19,5],
    ["Minneapolis",44.98,-93.27,3],["Portland",45.52,-122.68,3],["Las Vegas",36.17,-115.14,2],["Detroit",42.33,-83.05,3],["Charlotte",35.23,-80.84,3],
    ["Columbus",39.96,-83.00,2],["Indianapolis",39.77,-86.16,2],["Salt Lake City",40.76,-111.89,2],["Raleigh",35.78,-78.64,2],["Kansas City",39.10,-94.58,2],
    ["St. Louis",38.63,-90.20,2],["Pittsburgh",40.44,-80.00,2],["Baltimore",39.29,-76.61,2],["New Orleans",29.95,-90.07,2],["Tampa",27.95,-82.46,2],
    ["Orlando",28.54,-81.38,2],["Sacramento",38.58,-121.49,2],["Albuquerque",35.08,-106.65,1],["Tucson",32.22,-110.97,1],["Omaha",41.26,-95.93,1],
    ["Milwaukee",43.04,-87.91,2],["Cleveland",41.50,-81.69,2],["Cincinnati",39.10,-84.51,2],["Richmond",37.54,-77.44,1],["Hartford",41.77,-72.67,1],
    ["Providence",41.82,-71.41,1],["Buffalo",42.89,-78.88,1],["Madison",43.07,-89.40,1],["Boise",43.62,-116.20,1],["Birmingham",33.52,-86.80,1],
    ["Louisville",38.25,-85.76,1],["Oklahoma City",35.47,-97.52,1],["Memphis",35.15,-90.05,1],["Jacksonville",30.33,-81.66,1],["Ann Arbor",42.28,-83.74,1],
    ["Durham",35.99,-78.90,1],["Spokane",47.66,-117.43,1],["Des Moines",41.59,-93.62,1],["Burlington",44.48,-73.21,1],["Santa Fe",35.69,-105.94,1],
    ["Charleston",32.78,-79.93,1],["Savannah",32.08,-81.09,1],["El Paso",31.76,-106.49,1],["Fresno",36.74,-119.79,1],["Reno",39.53,-119.81,1],
    ["Little Rock",34.75,-92.29,1],["Wichita",37.69,-97.34,1],["Fargo",46.88,-96.79,1],["Portland ME",43.66,-70.26,1],["Tallahassee",30.44,-84.28,1]];
  const CITY_IX = Object.fromEntries(CITIES.map((c, i) => [c[0], i]));
  function pickCity(r){ const c = pickW(r, CITIES, c => c[3]); return c[0]; }

  /* ---------------------------------------------------------------------
     The calendar: dates onto seconds, with the slow hour of argument
     --------------------------------------------------------------------- */
  const MON = {Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11};
  const MONTHS = Object.keys(MON);
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function calendar(c, len){
    const t0 = Date.UTC(c.year, c.month, c.day);
    const dayOf = s => {
      const m = /^([A-Z][a-z]{2}) (\d{1,2})(?: (\d{1,2}):(\d{2}))?$/.exec(String(s).trim());
      if(!m || MON[m[1]] == null) throw new Error("Can't read the date '" + s + "'");
      return (Date.UTC(c.year, MON[m[1]], +m[2], m[3] == null ? 12 : +m[3], m[4] == null ? 0 : +m[4]) - t0) / 864e5;
    };
    const slow = (c.slow || []).map(x => ({d: dayOf(x.at), dd: x.hours / 24, secs: x.secs})).sort((a, b) => a.d - b.d);
    const slowDays = slow.reduce((a, x) => a + x.dd, 0), slowSecs = slow.reduce((a, x) => a + x.secs, 0);
    const rate = (len - slowSecs) / (c.days - slowDays);       /* seconds a day */
    const pts = [[0, 0]];
    let t = 0, d = 0;
    slow.forEach(x => { t += (x.d - d) * rate; d = x.d; pts.push([t, d]); x.t = t; t += x.secs; d += x.dd; pts.push([t, d]); });
    pts.push([len, c.days]);
    const lerp = (v, i, j) => {
      for(let n = 1; n < pts.length; n++){
        const a = pts[n - 1], b = pts[n];
        if(v <= b[i] || n === pts.length - 1) return a[j] + (b[j] - a[j]) * (v - a[i]) / ((b[i] - a[i]) || 1);
      }
      return 0;
    };
    const toT = day => lerp(day, 1, 0), toD = tt => lerp(tt, 0, 1);
    return {
      dayOf, toT, toD, rate, t0, days: c.days, slow,
      at: s => toT(dayOf(s)),
      date: tt => new Date(t0 + toD(tt) * 864e5),
      slowAt: tt => slow.find(x => tt >= x.t && tt <= x.t + x.secs) || null
    };
  }

  /* ---------------------------------------------------------------------
     Compile: the scenario in the shape the engine reads, with every path
     that doesn't depend on the player worked out once
     --------------------------------------------------------------------- */
  function compile(scn){
    if(scn._compiled) return scn._compiled;
    FEE = scn.fees.taker; RET = scn.fees.retained;
    const len = scn.length, STEPS = Math.round(len / DT), cal = calendar(scn.calendar, len);
    const cases = Object.fromEntries(scn.cases.map(c => [c.id, c]));
    const markets = scn.markets.map((m, k) => ({...m, k, openT: 0, closeT: cal.at(m.deadline + " 23:59"), cs: cases[m.c], resolveT: null, outcome: null}));
    const byId = Object.fromEntries(markets.map(m => [m.id, m]));
    markets.forEach(m => { if(!m.cs) throw new Error("Market " + m.id + " names a case that doesn't exist: " + m.c); });

    const events = [];
    scn.events.forEach((e0, n) => {
      const e = {...e0, id: "e" + n, t: cal.at(e0.at)};
      if(e.m && !byId[e.m]) throw new Error("Event " + e.id + " names a market that doesn't exist: " + e.m);
      if(e.list) byId[e.list].openT = e.t;
      events.push(e);
      if(e.lines) e.lines.forEach((ln, i) => events.push({id: e.id + "l" + i, t: e.t + ln.dt, m: e.m, line: ln, li: i, parent: e.id,
        fair: ln.fair != null ? {[e.m]: ln.fair} : null, hype: ln.hype ? {[e.m]: ln.hype} : null}));
    });
    events.sort((a, b) => a.t - b.t);
    events.forEach(e => { if(e.resolve){ const m = byId[e.m]; m.resolveT = e.t; m.outcome = e.resolve; } });

    markets.forEach(m => {
      const fair = new Float32Array(STEPS + 1), expert = new Float32Array(STEPS + 1),
            hype = new Float32Array(STEPS + 1), att = new Float32Array(STEPS + 1);
      /* what the facts imply: jumps on news, glides where a deadline closes in */
      const keys = events.filter(e => e.fair && e.fair[m.id] != null).map(e => ({t: e.t, v: e.fair[m.id], over: e.over || 0}));
      let from = m.fair0, to = m.fair0, g0 = 0, g1 = 0, ki = 0;
      const val = t => g1 > g0 ? from + (to - from) * smooth((t - g0) / (g1 - g0)) : to;
      for(let s = 0; s <= STEPS; s++){
        const t = s * DT;
        while(ki < keys.length && keys[ki].t <= t + 1e-9){ const kk = keys[ki++]; from = val(kk.t); to = kk.v; g0 = kk.t; g1 = kk.t + kk.over; }
        fair[s] = m.resolveT != null && t >= m.resolveT ? (m.outcome === "yes" ? 1 : 0) : val(t);
      }
      /* the expert panel reads the same facts, later and more smoothly */
      const lag = Math.round(EXPERT_LAG / DT), a = 1 - Math.exp(-DT / EXPERT_TAU);
      let e = m.fair0;
      for(let s = 0; s <= STEPS; s++){ e += (fair[Math.max(0, s - lag)] - e) * a; expert[s] = e; }
      /* hype and attention */
      const hk = events.filter(x => x.hype && x.hype[m.id]).map(x => [x.t, x.hype[m.id]]);
      const ak = events.filter(x => x.m === m.id).map(x => [x.t, x.line ? 1.4 : x.resolve ? 4 : x.major ? 3 : x.list ? 2.2 : 1.2])
        .concat(events.filter(x => x.grow).map(x => [x.t, .8]));
      for(let s = 0; s <= STEPS; s++){
        const t = s * DT;
        let h = 0, at = 0;
        for(const [te, v] of hk) if(te <= t) h += v * decay(t - te, HYPE_HALF) * smooth((t - te) / HYPE_RAMP);
        for(const [te, v] of ak) if(te <= t) at += v * decay(t - te, ATT_HALF);
        hype[s] = h; att[s] = at;
      }
      Object.assign(m, {fair, expert, hype, att});
    });

    const dates = (scn.dates || []).map(d => ({...d, t: cal.at(d.at), from: d.from ? cal.at(d.from) : -1}));
    const forecasts = (scn.forecasts || []).map(f => ({...f, t: cal.at(f.at)})).sort((a, b) => a.t - b.t);
    const personas = Object.fromEntries((scn.personas || []).map(p => [p.id, p]));
    /* calendar months, for the revenue chart */
    const months = [];
    for(let mo = scn.calendar.month; ; mo++){
      const d0 = (Date.UTC(scn.calendar.year, mo, 1) - cal.t0) / 864e5, d1 = (Date.UTC(scn.calendar.year, mo + 1, 1) - cal.t0) / 864e5;
      if(d0 >= scn.calendar.days) break;
      months.push({label: MONTHS[mo % 12], t0: cal.toT(Math.max(0, d0)), t1: cal.toT(Math.min(scn.calendar.days, d1)),
                   days: Math.min(scn.calendar.days, d1) - Math.max(0, d0), full: d1 - d0});
    }
    /* how much attention the opening markets share, for spreading the crowd over fewer later on */
    const popRef = markets.filter(m => m.openT <= 0).reduce((a, m) => a + m.pop, 0);
    const M = {scn, len, STEPS, cal, cases, markets, byId, events, dates, forecasts, personas, months, popRef};
    Object.defineProperty(scn, "_compiled", {value: M, enumerable: false, configurable: true});
    return M;
  }

  /* ---------------------------------------------------------------------
     A world
     --------------------------------------------------------------------- */
  function create(scn, opts = {}){
    const M = compile(scn), nM = M.markets.length, S = M.len + 1;
    const seed = (opts.seed != null ? opts.seed : scn.seed) >>> 0;
    const E = {
      M, nM, s: 0, t: 0, seed,
      rP: rng(seed ^ 0x51ED27), rF: rng(seed + 1), rS: rng(seed ^ 0xA5A5A5),
      agents: [], pools: Object.fromEntries(CROWD.map(k => [k, []])), mms: [], personas: [], pById: {},
      markets: [], byId: {}, open: [], ei: 0, fi: 0, fired: [], info: {}, out: [], log: [],
      expiry: new Map(), oid: 1,
      poolN: 0, pool0: 0, tradersN: 0, growAcc: 0, subs: scn.pro.start, subsPend: 0, chan: {},
      notional: 0, trades: 0, fees: 0, retained: 0, secNot: 0, secTrades: 0, secRet: 0,
      g: {n: new Float64Array(S), tr: new Float64Array(S), pool: new Float64Array(S), subs: new Float64Array(S),
          ret: new Float64Array(S), traded: new Float64Array(S), online: new Float64Array(S), wat: new Float64Array(S)},
      notable: [], milestones: [], mDone: {}, published: [], insider: null, you: null
    };
    for(const ch in scn.channels) E.chan[ch] = {label: scn.channels[ch], n: 0, visits: 0, reach: 0};
    M.markets.forEach(m => { const mk = newMarket(E, m); E.markets.push(mk); E.byId[m.id] = mk; });

    /* the player, the firms, the named traders, the insider, the crowd */
    const you = E.you = makeAgent(E, "you", "you", {name: "You", city: "", bank: scn.credits});
    Object.assign(you, {basis: new Float64Array(nM), realized: new Float64Array(nM), paid: new Float64Array(nM), held: new Float64Array(nM),
      locked: new Int32Array(nM), orders: [], txns: [], verdicts: Array.from({length: nM}, () => []), fees: 0, shares: 0, reach: 0, referred: 0,
      hv: new Float64Array(S).fill(NaN)});
    (scn.makers || []).forEach(name => makeMM(E, name));
    M.markets.forEach(m => {
      if(m.openT <= 0) return;
      const order = E.mms.map((_, j) => j).sort(() => E.rP() - .5);
      order.forEach((j, rank) => { E.mms[j].join[m.k] = rank < 2 ? 0 : 4 + rank * 5 + E.rP() * 6; });
    });
    (scn.personas || []).forEach(p => makePersona(E, p));
    if(scn.insider) makeInsider(E, scn.insider);
    for(let i = 0; i < scn.population.start; i++) makeAgent(E, pickType(E.rP, null), "launch");
    E.pool0 = E.poolN;

    E.markets.forEach(mk => { if(M.markets[mk.k].openT <= 0) openMarket(E, mk); });
    while(E.ei < M.events.length && M.events[E.ei].t <= 0) fire(E, M.events[E.ei++]);
    sample(E);
    E.out.length = 0;
    if(opts.log || opts.to) runTo(E, opts.to || 0, opts.log || []);
    return E;
  }

  function newMarket(E, m){
    const S = E.M.len + 1, nan = () => new Float32Array(S).fill(NaN);
    return {k: m.k, id: m.id, m, status: "pending", outcome: null, openT: null, resolvedT: null, resolvedSec: null, priorPx: null,
      bidQ: Array.from({length: 101}, () => []), askQ: Array.from({length: 101}, () => []),
      bidN: new Int32Array(101), askN: new Int32Array(101), bb: 0, ba: 100,
      last: Math.round(m.fair0 * 100), ewma: m.fair0 * 100, lastT: 0,
      vol: 0, notional: 0, trades: 0, oi: 0, secVol: 0, secNot: 0, pullUntil: -1, att: 0,
      h: {p: nan(), b: nan(), a: nan(), e: nan(), v: new Float32Array(S), n: new Float32Array(S)},
      tape: [], paid: 0, winners: 0, losers: 0};
  }

  function pickType(r, mix){
    const w = mix || BASE;
    let x = r();
    for(const k of CROWD){ x -= (w[k] || 0); if(x <= 0) return k; }
    return "casual";
  }

  function makeAgent(E, type, ch, o = {}, r = E.rP){
    const T = TYPES[type], nM = E.nM;
    const bank = o.bank != null ? o.bank : Math.round(logUni(r, T.bank[0], T.bank[1]));
    const a = {i: E.agents.length, type, ch, name: o.name || null, city: o.city != null ? o.city : null, crowd: CROWD.includes(type),
      cash: bank * 100, start: bank * 100, reserved: 0, pos: new Int32Array(nM), bias: null, tilt: null, favs: null,
      act: 1, life: Infinity, joined: E.t, trades: 0, first: -1, last: -1, w34: false, thr: 2, lag: 0, risk: .05, slip: 4};
    if(!a.name) a.name = FIRST[Math.floor(r() * FIRST.length)] + " " + String.fromCharCode(65 + Math.floor(r() * 26)) + ".";
    if(a.city == null) a.city = pickCity(r);
    if(a.crowd){
      a.act = clamp(Math.exp(gauss(r) * .8) * .8, .05, 3);
      a.life = -Math.log(1 - r() * .999) * 360;
      a.thr = T.thr[0] + r() * (T.thr[1] - T.thr[0]);
      if(T.lag) a.lag = Math.round((T.lag[0] + r() * (T.lag[1] - T.lag[0])) / DT);
      a.risk = T.risk[0] + r() * (T.risk[1] - T.risk[0]);
      a.slip = T.slip;
      if(T.bias){ a.bias = new Float32Array(nM); for(let k = 0; k < nM; k++) a.bias[k] = gauss(r) * T.bias; }
      if(type === "news"){ a.over = .3 + r() * .7; a.hk = .6 + r() * .9; }
      if(type === "mom") a.beta = .8 + r() * 1.4;
      if(type === "contra") a.gamma = .4 + r() * .7;
      if(type === "fan" && !o.persona){
        a.favs = new Float32Array(nM);
        for(let j = r() < .35 ? 2 : 1; j > 0; j--){
          const m = pickW(r, E.M.markets, mm => mm.pop);
          const L = m.lean || {side: 1, share: .5};
          a.favs[m.k] = (r() < L.share ? L.side : -L.side) * (8 + r() * 16);
        }
      }
      E.pools[type].push(a.i);
      E.poolN++;
      if(E.chan[ch]) E.chan[ch].n++;
    }
    E.agents.push(a);
    return a;
  }

  function makeMM(E, name){
    const r = E.rP, a = makeAgent(E, "mm", "maker", {name, city: "New York", bank: MM_CASH});
    Object.assign(a, {spread: 1.6 + r() * 1.2, size: 240 + r() * 200, step: r() < .4 ? 2 : 1, skew: .5 + r() * .45, maxInv: 16000,
      lag: Math.round((2 + r() * 3) / DT), w: .6 + r() * .15,
      orders: Array.from({length: E.nM}, () => []), join: new Float32Array(E.nM)});
    E.mms.push(a);
  }

  function makePersona(E, p){
    const a = makeAgent(E, p.type, "launch", {name: p.name, city: p.city, bank: p.bank, persona: true});
    Object.assign(a, {pid: p.id, role: p.role, bio: p.bio, record: p.record, act: 2.5, life: Infinity,
      fc: new Float32Array(E.nM).fill(NaN), fcT: new Float32Array(E.nM).fill(-1), hv: new Float32Array(E.M.len + 1).fill(NaN)});
    if(p.favs){ a.favs = new Float32Array(E.nM); for(const id in p.favs) a.favs[E.byId[id].k] = p.favs[id] * 18; }
    E.personas.push(a);
    E.pById[p.id] = a;
  }

  function makeInsider(E, x){
    const a = makeAgent(E, "insider", "launch", {name: x.name, city: "San Francisco", bank: x.bank});
    E.insider = {a, k: E.byId[x.m].k, from: E.M.cal.at(x.from), to: E.M.cal.at(x.to), side: x.dir === "no" ? -1 : 1,
                 target: x.contracts, worst: x.worst, done: 0, cost: 0, flagged: false};
  }

  /* ---------------------------------------------------------------------
     The book
     --------------------------------------------------------------------- */
  function addOrder(E, mk, o){
    if(o.side > 0){ mk.bidQ[o.p].push(o); mk.bidN[o.p] += o.q; if(o.p > mk.bb) mk.bb = o.p; }
    else { mk.askQ[o.p].push(o); mk.askN[o.p] += o.q; if(o.p < mk.ba) mk.ba = o.p; }
    const Q = o.side > 0 ? mk.bidQ[o.p] : mk.askQ[o.p];
    if(Q.length > 40){ let j = 0; for(let i = 0; i < Q.length; i++) if(Q[i].q > 0) Q[j++] = Q[i]; Q.length = j; }
    if(o.exp < Infinity){ let L = E.expiry.get(o.exp); if(!L) E.expiry.set(o.exp, L = []); L.push(o); }
  }
  /* take k contracts off a resting order, filled or cancelled */
  function take(mk, o, k){
    o.q -= k;
    if(o.side > 0){
      mk.bidN[o.p] -= k;
      if(mk.bidN[o.p] <= 0){
        mk.bidN[o.p] = 0; mk.bidQ[o.p].length = 0;
        if(o.p === mk.bb){ let p = o.p - 1; while(p >= 1 && mk.bidN[p] <= 0) p--; mk.bb = p >= 1 ? p : 0; }
      }
    } else {
      mk.askN[o.p] -= k;
      if(mk.askN[o.p] <= 0){
        mk.askN[o.p] = 0; mk.askQ[o.p].length = 0;
        if(o.p === mk.ba){ let p = o.p + 1; while(p <= 99 && mk.askN[p] <= 0) p++; mk.ba = p <= 99 ? p : 100; }
      }
    }
  }
  function cancel(E, o){
    if(!(o.q > 0)) return;
    if(o.you) release(E, o, o.q);
    take(E.markets[o.m], o, o.q);
  }
  /* the player's resting orders hold cash (to open) or contracts (to close) */
  function reserve(E, o){
    const y = E.you, x = y.pos[o.m];
    if((o.side < 0 && x > 0) || (o.side > 0 && x < 0)){
      const l = Math.min(o.q, Math.abs(x) - y.locked[o.m]);
      o.lock = Math.max(0, l); y.locked[o.m] += o.lock;
    }
    const open = o.q - o.lock;
    o.res = Math.ceil(open * (o.side > 0 ? o.p : 100 - o.p) * (1 + FEE));
    y.reserved += o.res;
  }
  function release(E, o, k){
    const y = E.you;
    if(o.res){ const r = k >= o.q ? o.res : Math.round(o.res * k / o.q); o.res -= r; y.reserved -= r; }
    if(o.lock){ const l = Math.min(o.lock, k); o.lock -= l; y.locked[o.m] -= l; }
  }

  /* how many contracts an agent can afford to buy (Yes) or sell (Yes) at p */
  /* `owed` is the fee already run up by earlier fills of the same order */
  function canBuy(a, k, p, taker, r, owed = 0){
    let avail = a.cash - a.reserved - owed - (taker ? 1 : 0); if(r && r.you) avail += r.res;
    return Math.max(0, -a.pos[k]) + Math.max(0, Math.floor(avail / (p * (taker ? 1 + FEE : 1))));
  }
  function canSell(a, k, p, taker, r, owed = 0){
    let avail = a.cash - a.reserved - owed - (taker ? 1 : 0); if(r && r.you) avail += r.res;
    return Math.max(0, a.pos[k]) + Math.max(0, Math.floor(avail / ((100 - p) * (taker ? 1 + FEE : 1))));
  }

  /* A trade's cash, Kalshi-style: each new contract costs its price, each
     closed one returns its price, and a pair of new Yes and No contracts
     is exactly the dollar that pays out. */
  function settle(E, a, k, dq, p){
    const x = a.pos[k];
    let open, close, cash;
    if(dq > 0){ close = Math.min(dq, Math.max(0, -x)); open = dq - close; cash = close * (100 - p) - open * p; }
    else { const q = -dq; close = Math.min(q, Math.max(0, x)); open = q - close; cash = close * p - open * (100 - p); }
    a.cash += cash;
    a.pos[k] = x + dq;
    if(a === E.you){
      const y = E.you;
      if(close > 0){ const cb = y.basis[k] * close / Math.abs(x); y.basis[k] -= cb; y.realized[k] += (dq > 0 ? close * (100 - p) : close * p) - cb; }
      if(open > 0) y.basis[k] += open * (dq > 0 ? p : 100 - p);
      if(y.pos[k] === 0) y.basis[k] = 0;
    }
    return {open, close};
  }

  function fill(E, mk, taker, maker, side, p, k, r){
    const buyer = side > 0 ? taker : maker, seller = side > 0 ? maker : taker;
    if(r.you) release(E, r, k);
    take(mk, r, k);
    const lb = settle(E, buyer, mk.k, k, p), ls = settle(E, seller, mk.k, -k, p);
    mk.oi += lb.open - ls.close;
    mk.last = p; mk.lastT = E.t; mk.ewma += (p - mk.ewma) * .15;
    mk.vol += k; mk.secVol += k; mk.trades++; E.trades++; E.secTrades++;
    tally(E, taker); tally(E, maker);
    mk.tape.push({t: E.t, p, q: k, side, b: buyer.i, s: seller.i});
    if(mk.tape.length > 80) mk.tape.shift();
    if(r.you){
      const up = r.dir === "yes" ? p : 100 - p;
      E.you.txns.push({t: E.t, m: mk.k, dir: r.dir, op: r.op, type: "fill", qty: k, avg: up, gross: k * up, fee: 0, id: r.id});
      E.out.push({k: "fill", m: mk.k, id: r.id, q: k, avg: up, dir: r.dir, op: r.op});
    }
    /* what the taker paid or received, which is what the fee is on */
    return side > 0 ? lb.close * (100 - p) + lb.open * p : ls.close * p + ls.open * (100 - p);
  }
  function tally(E, a){
    if(a.trades === 0){ a.first = E.t; if(a.crowd) E.tradersN++; }
    a.trades++; a.last = E.t;
    if(a.crowd && !a.w34){ const age = (E.t - a.joined) / E.M.cal.rate; if(age >= 14 && age < 28 && a.first - a.joined < 14 * E.M.cal.rate) a.w34 = true; }
  }

  /* An order arrives. It trades against whatever it crosses, oldest first
     at each price, then (unless it is immediate-or-cancel) rests. A
     post-only order never trades on arrival: it moves inside the spread. */
  function submit(E, a, mk, side, limit, qty, o = {}){
    qty = Math.floor(qty);
    if(!(qty > 0) || mk.status !== "open") return null;
    limit = clamp(Math.round(limit), 1, 99);
    let rem = qty, filled = 0, gross = 0, yesVal = 0;
    if(o.post){
      if(side > 0 && mk.ba <= limit) limit = mk.ba - 1;
      if(side < 0 && mk.bb >= limit) limit = mk.bb + 1;
      if(limit < 1 || limit > 99) return null;
    } else {
      for(let guard = 0; rem > 0 && guard < 5000; guard++){
        const p = side > 0 ? mk.ba : mk.bb;
        if(side > 0 ? (p > limit || p > 99) : (p < limit || p < 1)) break;
        const Q = side > 0 ? mk.askQ[p] : mk.bidQ[p];
        if(!Q.length){
          if(side > 0){ mk.askN[p] = 0; let pp = p + 1; while(pp <= 99 && mk.askN[pp] <= 0) pp++; mk.ba = pp <= 99 ? pp : 100; }
          else { mk.bidN[p] = 0; let pp = p - 1; while(pp >= 1 && mk.bidN[pp] <= 0) pp--; mk.bb = pp >= 1 ? pp : 0; }
          continue;
        }
        const r = Q[0];
        if(!(r.q > 0)){ Q.shift(); continue; }
        if(r.a === a.i){ cancel(E, r); continue; }            /* never trade with yourself */
        const maker = E.agents[r.a];
        const owed = Math.ceil(gross * FEE);
        let k = Math.min(rem, r.q, side > 0 ? canBuy(a, mk.k, p, true, null, owed) : canSell(a, mk.k, p, true, null, owed));
        if(k <= 0) break;
        const km = side > 0 ? canSell(maker, mk.k, p, false, r) : canBuy(maker, mk.k, p, false, r);
        if(km <= 0){ cancel(E, r); continue; }
        k = Math.min(k, km);
        gross += fill(E, mk, a, maker, side, p, k, r);
        rem -= k; filled += k; yesVal += k * p;
      }
    }
    let fee = 0;
    if(filled > 0){
      fee = Math.round(gross * FEE);
      a.cash -= fee;
      E.fees += fee; E.retained += gross * RET; E.secRet += gross * RET;
      E.notional += gross; E.secNot += gross; mk.notional += gross; mk.secNot += gross;
      if(a.crowd && (gross >= 60000 || (a.pid && gross >= 30000))) {
        E.notable.push({t: E.t, a: a.i, m: mk.k, side, q: filled, avg: yesVal / filled, v: gross});
        if(E.notable.length > 400) E.notable.splice(0, 100);
      }
    }
    let rest = null;
    if(rem > 0 && !o.ioc){
      rest = {id: E.oid++, a: a.i, m: mk.k, side, p: limit, q: rem, q0: rem, t: E.t, exp: o.exp || Infinity, you: a === E.you, res: 0, lock: 0};
      if(rest.you) reserve(E, rest);
      addOrder(E, mk, rest);
      if(o.mm) a.orders[mk.k].push(rest);
      if(rest.you) a.orders.push(rest);
    }
    return {filled, gross, fee, yesVal, rest};
  }

  /* ---------------------------------------------------------------------
     The traders
     --------------------------------------------------------------------- */
  /* The price shown as the chance: the midpoint while the spread is 10¢
     or less, otherwise the last trade, kept inside the quotes. */
  function px(mk){
    if(mk.status === "resolved") return mk.outcome === "yes" ? 100 : 0;
    if(mk.bb >= 1 && mk.ba <= 99 && mk.ba - mk.bb <= 10) return (mk.bb + mk.ba) / 2;
    let p = mk.last;
    if(mk.bb >= 1 && p < mk.bb) p = mk.bb;
    if(mk.ba <= 99 && p > mk.ba) p = mk.ba;
    return p;
  }
  const midOf = mk => mk.bb >= 1 && mk.ba <= 99 ? (mk.bb + mk.ba) / 2 : px(mk);
  function ago(E, mk, secs){
    const i = Math.floor(E.t) - secs;
    if(i < 0 || i < Math.ceil(mk.openT)) return null;
    const v = mk.h.p[i];
    return v === v ? v : null;
  }

  /* A market maker cancels its quotes and posts new ones around what it
     thinks the market is worth: partly the facts as it last read them,
     partly where trades have been printing, leaning against what it
     already holds. Wider when the market is busy; gone for a moment when
     news breaks. */
  function mmQuote(E, mm, mk){
    const k = mk.k, L = mm.orders[k];
    for(const o of L) if(o.q > 0) cancel(E, o);
    L.length = 0;
    if(mk.status !== "open" || E.t < mk.pullUntil) return;
    const Mm = E.M.markets[k];
    const f = Mm.fair[Math.max(0, E.s - mm.lag)] * 100;
    const est = mm.w * f + (1 - mm.w) * mk.ewma, x = mm.pos[k];
    const center = est - mm.skew * x / 1000;
    const half = mm.spread / 2 * (1 + .35 * Math.min(4, mk.att));
    const scale = Math.max(.35, Mm.pop);
    const bid = Math.floor(center - half), ask = Math.max(bid + 1, Math.ceil(center + half));
    /* past its inventory limit a maker still quotes the side it is long
       on, only smaller and further away: the book never goes one-sided */
    const far = 3;
    for(let i = 0; i < 3; i++){
      const base = mm.size * scale * (1 + .6 * i);
      const overB = x > mm.maxInv, overA = x < -mm.maxInv;
      const bp = bid - i * mm.step - (overB ? far : 0), ap = ask + i * mm.step + (overA ? far : 0);
      const qb = Math.round(base * (overB ? .2 : x > 0 ? Math.max(.3, 1 - x / mm.maxInv) : 1));
      const qa = Math.round(base * (overA ? .2 : x < 0 ? Math.max(.3, 1 + x / mm.maxInv) : 1));
      if(bp >= 1 && bp <= 98 && qb > 0) submit(E, mm, mk, 1, bp, qb, {post: true, mm: true});
      if(ap >= 2 && ap <= 99 && qa > 0) submit(E, mm, mk, -1, ap, qa, {post: true, mm: true});
    }
  }

  /* someone from the crowd turns up at a market */
  function arrive(E, mk){
    const r = E.rF, att = mk.att;
    const type = pickW(r, CROWD, ty => E.pools[ty].length * TYPES[ty].act * (1 + TYPES[ty].boost * att / 4));
    if(!type) return;
    const pool = E.pools[type];
    for(let tries = 0; tries < 6; tries++){
      const a = E.agents[pool[Math.floor(r() * pool.length)]];
      const w = a.act * (a.life === Infinity ? 1 : Math.exp(-(E.t - a.joined) / a.life));
      if(r() * 3 < w){ decide(E, a, mk); return; }
    }
  }

  /* what one trader believes a market is worth, in cents */
  function belief(E, a, mk){
    const k = mk.k, Mm = E.M.markets[k], s = E.s, r = E.rF;
    const fairAt = d => Mm.fair[clamp(s - d, 0, E.M.STEPS)] * 100;
    const tilt = a.tilt ? a.tilt[k] : 0, bias = a.bias ? a.bias[k] : 0, mid = midOf(mk);
    switch(a.type){
      case "pro": case "whale":
        if(a.fc && a.fc[k] === a.fc[k] && E.t - a.fcT[k] < 60) return a.fc[k];
        return fairAt(a.lag) + bias + tilt;
      case "news": {
        const now = fairAt(a.lag), then = fairAt(a.lag + 180);
        return now + a.over * clamp(now - then, -16, 16) + Mm.hype[s] * 100 * a.hk + bias + tilt;
      }
      case "mom": {
        const p0 = ago(E, mk, 30); if(p0 == null) return NaN;
        const d = mid - p0; return Math.abs(d) < 2.5 ? NaN : mid + a.beta * d;
      }
      case "contra": {
        const p0 = ago(E, mk, 75); if(p0 == null) return NaN;
        const d = mid - p0; return Math.abs(d) < 5 ? NaN : mid - a.gamma * d;
      }
      case "fan":
        if(a.favs && a.favs[k]) return fairAt(80) + a.favs[k] + tilt;
        /* elsewhere, a true believer is a casual trader */
      default:
        return mid + gauss(r) * 6 + (50 - mid) * .06 + Mm.hype[s] * 50 + tilt;
    }
  }

  function sizeFor(a, k, edge, cost){
    const budget = a.cash * a.risk * 1.4 * clamp(edge / 10, .25, 1.6);
    const cap = Math.floor(a.start * .4 / Math.max(cost, 15)) - Math.abs(a.pos[k]);
    return Math.max(0, Math.min(Math.floor(budget / cost), cap));
  }

  function decide(E, a, mk){
    if(mk.status !== "open") return;
    const bb = mk.bb, ba = mk.ba;
    if(bb < 1 && ba > 99) return;
    const b0 = belief(E, a, mk);
    if(!(b0 === b0)) return;
    const r = E.rF, k = mk.k, b = clamp(b0, 1, 99), x = a.pos[k], thr = a.thr, mid = midOf(mk);
    const small = a.type === "casual" || (a.type === "fan" && !(a.favs && a.favs[k]));
    a.seen = E.t;
    if(ba <= 99 && b - ba > thr){
      const q = x < 0 ? Math.ceil(-x * (r() < .5 ? 1 : .5)) : small ? Math.floor((1000 + r() * 11000) / ba) : sizeFor(a, k, b - ba, ba);
      if(q > 0) submit(E, a, mk, 1, Math.min(99, Math.floor(b - thr / 2), ba + a.slip), q, {ioc: true});
    } else if(bb >= 1 && bb - b > thr){
      const q = x > 0 ? Math.ceil(x * (r() < .5 ? 1 : .5)) : small ? Math.floor((1000 + r() * 11000) / (100 - bb)) : sizeFor(a, k, bb - b, 100 - bb);
      if(q > 0) submit(E, a, mk, -1, Math.max(1, Math.ceil(b + thr / 2), bb - a.slip), q, {ioc: true});
    } else if(bb >= 1 && ba <= 99 && a.type !== "mom" && r() < (a.type === "pro" ? .35 : .22)){
      /* nothing worth crossing for: rest a small order at or inside the touch */
      const exp = E.s + Math.round((15 + r() * 50) / DT), q = Math.floor((1000 + r() * 6000) / 50);
      if(b > mid && x >= 0) submit(E, a, mk, 1, ba - bb > 1 ? bb + 1 : bb, q, {post: true, exp});
      else if(b < mid && x <= 0) submit(E, a, mk, -1, ba - bb > 1 ? ba - 1 : ba, q, {post: true, exp});
    }
  }

  /* ---------------------------------------------------------------------
     The script
     --------------------------------------------------------------------- */
  function openMarket(E, mk){
    if(mk.status !== "pending") return;
    mk.status = "open"; mk.openT = E.t;
    mk.last = Math.round(E.M.markets[mk.k].fair[E.s] * 100); mk.ewma = mk.last;
    E.open.push(mk);
    E.mms.forEach(mm => { if(mm.join[mk.k] <= 0) mmQuote(E, mm, mk); });
  }

  function fire(E, e){
    const mk = e.m ? E.byId[e.m] : null;
    E.fired.push(e);
    E.info[e.id] = {before: mk && mk.status === "open" ? px(mk) : null, t: E.t};
    if(e.list) openMarket(E, E.byId[e.list]);
    if(e.grow) grow(E, e.grow);
    if(mk && !e.line && (e.major || e.resolve)) mk.pullUntil = E.t + 1.5;
    if(e.resolve) resolve(E, mk, e.resolve);
    if(e.integrity) integrity(E, e);
    E.out.push({k: e.line ? "line" : "event", e});
  }

  function resolve(E, mk, outcome){
    if(mk.status !== "open") return;
    mk.priorPx = px(mk);
    for(let p = 1; p <= 99; p++){
      for(const o of mk.bidQ[p].slice()) if(o.q > 0) cancel(E, o);
      for(const o of mk.askQ[p].slice()) if(o.q > 0) cancel(E, o);
    }
    E.mms.forEach(mm => { mm.orders[mk.k].length = 0; });
    const k = mk.k, yes = outcome === "yes", y = E.you;
    let paid = 0, winners = 0, losers = 0;
    for(const a of E.agents){
      const x = a.pos[k];
      if(!x) continue;
      const win = yes ? Math.max(0, x) : Math.max(0, -x);
      if(win > 0) winners++; else losers++;
      if(a.type === "insider") a.withheld = (a.withheld || 0) + win * 100;
      else a.cash += win * 100;
      paid += win * 100;
      if(a === y){ y.held[k] = x; y.paid[k] = win * 100; y.realized[k] += win * 100 - y.basis[k]; y.basis[k] = 0; }
      a.pos[k] = 0;
    }
    y.orders = y.orders.filter(o => o.q > 0);
    Object.assign(mk, {status: "resolved", outcome, resolvedT: E.t, resolvedSec: Math.ceil(E.t - 1e-9), oi: 0, paid, winners, losers, bb: 0, ba: 100});
    E.open = E.open.filter(x => x !== mk);
    E.out.push({k: "resolve", m: k, outcome, paid, winners, losers, youHeld: y.held[k], youPaid: y.paid[k]});
  }

  function grow(E, g){
    const ch = E.chan[g.ch];
    if(ch){ ch.visits += g.visits || 0; ch.reach += g.reach || 0; }
    E.subsPend += g.subs || 0;
    const r = E.rP, mix = MIX[g.ch] || null;
    for(let i = 0; i < g.traders; i++){
      const a = makeAgent(E, pickType(r, mix), g.ch);
      if(g.lean) for(const id in g.lean) if(r() < .7){
        a.tilt = a.tilt || new Float32Array(E.nM);
        a.tilt[E.byId[id].k] = g.lean[id] * (4 + r() * 10);
      }
    }
  }

  function integrity(E, e){
    const X = E.insider;
    if(!X) return;
    X.flagged = true;
    E.info[e.id].insider = {name: X.a.name, contracts: X.done, cost: X.cost, withheld: X.a.withheld || 0, from: X.from, to: X.to, m: X.k};
  }

  function publish(E, f){
    const a = E.pById[f.who], mk = E.byId[f.m];
    if(!a || mk.status !== "open") return;
    a.fc[mk.k] = f.p; a.fcT[mk.k] = E.t;
    decide(E, a, mk);
    const pub = {...f, t: E.t, k: mk.k, price: px(mk), pos: a.pos[mk.k], name: a.name, role: a.role, record: a.record};
    E.published.push(pub);
    E.out.push({k: "forecast", f: pub});
  }

  /* ---------------------------------------------------------------------
     A step: a quarter of a second
     --------------------------------------------------------------------- */
  function step(E){
    const M = E.M;
    if(E.s >= M.STEPS) return false;
    E.s++; E.t = E.s * DT;
    const s = E.s, t = E.t, r = E.rF;
    while(E.ei < M.events.length && M.events[E.ei].t <= t + 1e-9) fire(E, M.events[E.ei++]);
    while(E.fi < M.forecasts.length && M.forecasts[E.fi].t <= t + 1e-9) publish(E, M.forecasts[E.fi++]);
    const ex = E.expiry.get(s);
    if(ex){ for(const o of ex) if(o.q > 0) cancel(E, o); E.expiry.delete(s); }

    /* sign-ups that nobody scripted */
    E.growAcc += M.scn.population.organicPerDay * (M.cal.toD(t) - M.cal.toD(t - DT));
    while(E.growAcc >= 1){ E.growAcc -= 1; makeAgent(E, pickType(E.rP, null), "organic"); }
    const rel = Math.min(E.subsPend, E.subsPend * .06 + .4 * DT);
    E.subsPend -= rel;
    E.subs += rel + E.poolN * SUB_RATE * DT;

    const growth = E.poolN / E.pool0;
    let popOpen = 0;
    for(const mk of E.open) popOpen += M.markets[mk.k].pop;
    const crowding = popOpen > 0 ? Math.pow(Math.max(1, M.popRef / popOpen), .8) : 1;
    for(const mk of E.open){
      const Mm = M.markets[mk.k];
      mk.att = Mm.att[s];
      for(let j = 0; j < E.mms.length; j++){
        const mm = E.mms[j];
        if((s + j + mk.k) % HZ === 0 && t - mk.openT >= mm.join[mk.k]) mmQuote(E, mm, mk);
      }
      for(let n = poisson(r, R0 * Mm.pop * (.55 + mk.att) * growth * crowding * DT); n > 0; n--) arrive(E, mk);
      /* a side swept clean, or a spread blown wide, brings the next maker in line back a step later at most */
      if((mk.bb < 1 || mk.ba > 99 || mk.ba - mk.bb > 8) && t >= mk.pullUntil){
        for(let j = 0; j < E.mms.length; j++){
          const mm = E.mms[(s + mk.k + j) % E.mms.length];
          if(t - mk.openT >= mm.join[mk.k]){ mmQuote(E, mm, mk); break; }
        }
      }
    }
    /* the named traders look in more often than most */
    if(E.open.length) for(const a of E.personas) if(r() < .02){
      const mk = pickW(r, E.open, m => .4 + m.att);
      if(mk) decide(E, a, mk);
    }
    /* the account that knew */
    const X = E.insider;
    if(X && t >= X.from && t <= X.to && X.done < X.target){
      const mk = E.markets[X.k];
      if(mk.status === "open" && r() < .7){
        const q = Math.min(X.target - X.done, Math.round(1500 + r() * 1300));
        const res = submit(E, X.a, mk, X.side, X.side < 0 ? 100 - X.worst : X.worst, q, {ioc: true});
        if(res && res.filled){ X.done += res.filled; X.cost += res.gross + res.fee; }
      }
    }
    if(s % HZ === 0) sample(E);
    return true;
  }

  const MILESTONES = [
    ["traders5", E => E.poolN >= 5000, "5,000 registered traders"],
    ["traders75", E => E.poolN >= 7500, "7,500 registered traders"],
    ["vol1", E => E.notional >= 1e8, "$1 million traded this term"],
    ["vol25", E => E.notional >= 2.5e8, "$2.5 million traded this term"],
    ["vol5", E => E.notional >= 5e8, "$5 million traded this term"],
    ["vol10", E => E.notional >= 1e9, "$10 million traded this term"],
    ["subs500", E => E.subs >= 500, "500 Pro subscribers"],
    ["subs750", E => E.subs >= 750, "750 Pro subscribers"],
    ["subs1k", E => E.subs >= 1000, "1,000 Pro subscribers"],
    ["trades25", E => E.trades >= 25000, "25,000 trades"],
    ["trades50", E => E.trades >= 50000, "50,000 trades"],
    ["trades100", E => E.trades >= 100000, "100,000 trades"]
  ];

  function sample(E){
    const sec = Math.round(E.t);
    for(const mk of E.markets){
      if(mk.status === "pending") continue;
      if(mk.status === "resolved" && sec > mk.resolvedSec) continue;
      const H = mk.h;
      H.p[sec] = px(mk);
      H.b[sec] = mk.bb >= 1 ? mk.bb : NaN; H.a[sec] = mk.ba <= 99 ? mk.ba : NaN;
      H.e[sec] = E.M.markets[mk.k].expert[E.s] * 100;
      H.v[sec] = mk.secVol; H.n[sec] = mk.secNot;
      mk.secVol = 0; mk.secNot = 0;
    }
    const g = E.g;
    g.n[sec] = E.secNot; g.tr[sec] = E.secTrades; g.ret[sec] = E.secRet;
    g.pool[sec] = E.poolN; g.subs[sec] = E.subs; g.traded[sec] = E.tradersN; g.online[sec] = online(E);
    g.wat[sec] = sec % 5 === 0 || sec === 0 ? weekly(E) : g.wat[sec - 1];
    E.secNot = 0; E.secTrades = 0; E.secRet = 0;
    E.you.hv[sec] = value(E, E.you);
    for(const a of E.personas) a.hv[sec] = value(E, a);
    for(const [key, test, text] of MILESTONES){
      if(E.mDone[key] || !test(E)) continue;
      E.mDone[key] = true;
      if(E.t > 0){ const ms = {t: E.t, text}; E.milestones.push(ms); E.out.push({k: "milestone", ms}); }
    }
  }

  /* traders who traded in the last seven days of the calendar */
  function weekly(E){
    const wk = 7 * E.M.cal.rate;
    let n = 0;
    for(const a of E.agents) if(a.crowd && a.seen != null && E.t - a.seen <= wk) n++;
    return n;
  }
  function online(E){
    let att = 0;
    for(const mk of E.open) att += mk.att;
    att /= Math.max(1, E.open.length);
    return Math.round(E.poolN * (.06 + .028 * Math.min(5, att)) * (1 + .05 * Math.sin(E.t * .7)));
  }

  /* ---------------------------------------------------------------------
     The player
     --------------------------------------------------------------------- */
  /* Walk the book without touching it: what an order would get now. */
  function preview(E, id, dir, op, opt = {}){
    const mk = E.byId[id], y = E.you;
    if(!mk || mk.status !== "open") return null;
    const yes = dir === "yes", buy = op === "buy", side = buy === yes ? 1 : -1;
    const own = new Int32Array(101);
    for(const o of y.orders) if(o.m === mk.k && o.q > 0 && o.side === -side) own[o.p] += o.q;
    const best = side > 0 ? mk.ba : mk.bb;
    if(side > 0 ? best > 99 : best < 1) return {qty: 0, empty: true};
    const lim = side > 0 ? Math.min(99, best + SLIP_CAP) : Math.max(1, best - SLIP_CAP);
    let budget = buy ? (opt.dollars != null ? opt.dollars * 100 : Infinity) : Infinity;
    if(buy) budget = Math.min(budget, y.cash - y.reserved);
    let want = opt.qty != null ? Math.floor(opt.qty) : Infinity;
    if(!buy){ const have = yes ? Math.max(0, y.pos[mk.k]) : Math.max(0, -y.pos[mk.k]); want = Math.min(want, have - y.locked[mk.k]); }
    let qty = 0, cost = 0, worst = null, levels = 0;
    for(let p = best; side > 0 ? p <= lim : p >= lim; p += side){
      const avail = (side > 0 ? mk.askN[p] : mk.bidN[p]) - own[p];
      if(avail <= 0) continue;
      const unit = yes ? p : 100 - p;
      let n = Math.min(avail, want - qty);
      if(buy) n = Math.min(n, Math.floor((budget - cost * (1 + FEE)) / (unit * (1 + FEE))));
      if(n <= 0) break;
      qty += n; cost += n * unit; worst = unit; levels++;
      if(qty >= want) break;
    }
    const fee = Math.round(cost * FEE);
    return {qty, cost, fee, avg: qty ? cost / qty : 0, worst, levels, bestUnit: yes ? best : 100 - best,
            payout: buy ? qty * 100 : 0, proceeds: buy ? 0 : cost - fee, total: buy ? cost + fee : cost - fee};
  }

  function order(E, x){
    const y = E.you, mk = E.byId[x.m];
    if(!mk || mk.status !== "open") return {ok: false, msg: "This market isn’t trading."};
    const k = mk.k, pos = y.pos[k], yes = x.dir === "yes", buy = x.op === "buy", side = buy === yes ? 1 : -1;
    let qty = Math.floor(x.qty);
    if(!(qty > 0)) return {ok: false, msg: "Choose an amount."};
    if(buy){
      const want = yes ? 1 : -1;
      if(pos * want < 0) return {ok: false, msg: `You hold ${pos > 0 ? "Yes" : "No"} in this market. Sell it before you buy ${yes ? "Yes" : "No"}.`};
      if(y.orders.some(o => o.m === k && o.q > 0 && o.op === "buy" && (o.dir === "yes" ? 1 : -1) !== want))
        return {ok: false, msg: "Cancel your open order on the other side first."};
    } else {
      const have = yes ? Math.max(0, pos) : Math.max(0, -pos);
      qty = Math.min(qty, have - y.locked[k]);
      if(!(qty > 0)) return {ok: false, msg: "There’s nothing to sell."};
    }
    let limit;
    if(x.type === "limit"){
      const up = clamp(Math.round(x.px), 1, 99);
      limit = yes ? up : 100 - up;
      if(buy && qty * up * (1 + FEE) > y.cash - y.reserved + 1e-9) return {ok: false, msg: "Not enough cash for that order."};
    } else {
      if(side > 0 ? mk.ba > 99 : mk.bb < 1) return {ok: false, msg: "Nobody is offering right now."};
      limit = side > 0 ? Math.min(99, mk.ba + SLIP_CAP) : Math.max(1, mk.bb - SLIP_CAP);
    }
    const r = submit(E, y, mk, side, limit, qty, {ioc: x.type !== "limit"});
    if(!r) return {ok: false, msg: "That didn’t go through."};
    if(r.rest){ r.rest.dir = x.dir; r.rest.op = x.op; }
    if(r.fee){ y.realized[k] -= r.fee; y.fees += r.fee; }
    if(!r.filled && !r.rest) return {ok: false, msg: "Nothing filled at that price."};
    const avg = r.filled ? (yes ? r.yesVal / r.filled : 100 - r.yesVal / r.filled) : 0;
    const tx = {t: E.t, m: k, dir: x.dir, op: x.op, type: x.type, qty: r.filled, avg, gross: r.gross, fee: r.fee,
                rest: r.rest ? r.rest.id : 0, restQ: r.rest ? r.rest.q : 0, px: x.px};
    if(r.filled) y.txns.push(tx);
    return {ok: true, tx};
  }

  function share(E, x){
    const mk = E.byId[x.m];
    if(!mk) return {ok: false};
    const y = E.you, r = E.rS;
    y.shares++;
    const fatigue = Math.pow(.6, y.shares - 1);
    const opened = Math.round((20 + r() * 40) * (1 + Math.min(3, mk.att)) * fatigue) + 2;
    const joined = Math.max(1, Math.round(opened * (.15 + r() * .15)));
    for(let i = 0; i < joined; i++) makeAgent(E, pickType(r, null), "referrals", {}, r);
    E.chan.referrals.visits += opened;
    y.reach += opened; y.referred += joined;
    return {ok: true, opened, joined};
  }

  function apply(E, x){
    const y = E.you;
    switch(x.k){
      case "order": return order(E, x);
      case "cancel": {
        const o = y.orders.find(o => o.id === x.id && o.q > 0);
        if(!o) return {ok: false};
        cancel(E, o);
        y.orders = y.orders.filter(o => o.q > 0);
        return {ok: true};
      }
      case "verdict": {
        const mk = E.byId[x.m];
        if(!mk || mk.status !== "open") return {ok: false};
        y.verdicts[mk.k].push({t: E.t, p: clamp(Math.round(x.p), 1, 99), mkt: px(mk)});
        return {ok: true};
      }
      case "share": return share(E, x);
    }
    return {ok: false};
  }
  /* everything the player does goes through here, stamped with the step */
  function act(E, x){
    const res = apply(E, x);
    if(res && res.ok) E.log.push({...x, s: E.s});
    y_clean(E);
    return res;
  }
  function y_clean(E){ const y = E.you; if(y.orders.some(o => !(o.q > 0))) y.orders = y.orders.filter(o => o.q > 0); }

  /* Rebuild a run: replay the log, each action before the step it was
     taken at, up to step `to`. Nothing lands in the outbox. */
  function runTo(E, to, log){
    const L = (log || []).slice().sort((a, b) => a.s - b.s);
    let i = 0;
    for(;;){
      while(i < L.length && L[i].s <= E.s){ const x = L[i++]; const res = apply(E, x); if(res && res.ok) E.log.push(x); y_clean(E); }
      if(E.s >= to || !step(E)) break;
    }
    E.out.length = 0;
  }

  /* ---------------------------------------------------------------------
     Reading the world
     --------------------------------------------------------------------- */
  function value(E, a){
    let v = a.cash;
    for(let k = 0; k < E.nM; k++){
      const x = a.pos[k];
      if(!x) continue;
      const p = px(E.markets[k]);
      v += x > 0 ? x * p : -x * (100 - p);
    }
    return v;
  }

  /* the order book, n levels a side; `you` is how much of each is yours */
  function depth(E, mk, n = 8){
    const own = {}, y = E.you;
    for(const o of y.orders) if(o.m === mk.k && o.q > 0) own[(o.side > 0 ? "b" : "a") + o.p] = (own[(o.side > 0 ? "b" : "a") + o.p] || 0) + o.q;
    const bids = [], asks = [];
    for(let p = mk.bb; p >= 1 && bids.length < n; p--) if(mk.bidN[p] > 0) bids.push({p, q: mk.bidN[p], you: own["b" + p] || 0});
    for(let p = mk.ba; p <= 99 && asks.length < n; p++) if(mk.askN[p] > 0) asks.push({p, q: mk.askN[p], you: own["a" + p] || 0});
    return {bids, asks};
  }

  function holders(E, mk){
    let yes = 0, no = 0;
    for(const a of E.agents){ const x = a.pos[mk.k]; if(x > 0) yes++; else if(x < 0) no++; }
    return {yes, no};
  }

  /* Everyone who has traded, best return first. The ranking counts
     accounts that started with at least $250 and made three trades, so a
     $50 account's one lucky bet doesn't top the table. */
  function board(E, all){
    const rows = [];
    for(const a of E.agents){
      if(!(a.crowd || a === E.you)) continue;
      if(a !== E.you && (a.trades < (all ? 1 : 3) || (!all && a.start < 25000))) continue;
      const v = value(E, a);
      rows.push({a, v, r: v / a.start - 1});
    }
    rows.sort((x, y) => y.r - x.r || y.v - x.v);
    return rows;
  }

  /* how each kind of trader is doing: average return, and where the money went */
  function typeStats(E){
    const out = {};
    for(const ty of CROWD.concat(["mm"])) out[ty] = {type: ty, label: TYPES[ty].label, blurb: TYPES[ty].blurb, n: 0, sumR: 0, pnl: 0, up: 0};
    for(const a of E.agents){
      const o = out[a.type];
      if(!o || a.trades === 0) continue;
      const v = value(E, a), pnl = v - a.start;
      o.n++; o.sumR += v / a.start - 1; o.pnl += pnl; if(pnl > 0) o.up++;
    }
    return Object.values(out).filter(o => o.n).map(o => ({...o, avg: o.sumR / o.n, share: o.up / o.n}));
  }

  /* the business, as of now */
  function stats(E){
    const t = E.t, wk = 7 * E.M.cal.rate, age28 = 28 * E.M.cal.rate;
    let wat = 0, cohort = 0, back = 0;
    const ch = {};
    for(const k in E.chan) ch[k] = {key: k, label: E.chan[k].label, n: E.chan[k].n, visits: E.chan[k].visits, reach: E.chan[k].reach, traded: 0, wat: 0};
    for(const a of E.agents){
      if(!a.crowd) continue;
      const c = ch[a.ch];
      if(a.trades > 0 && c) c.traded++;
      if(a.seen != null && t - a.seen <= wk){ wat++; if(c) c.wat++; }
      if(t - a.joined >= age28 && a.first >= 0 && a.first - a.joined < 14 * E.M.cal.rate){ cohort++; if(a.w34) back++; }
    }
    const months = E.M.months.map(mo => {
      let ret = 0, vol = 0, subsSum = 0, n = 0;
      const a = Math.ceil(mo.t0), b = Math.min(Math.floor(t), Math.ceil(mo.t1) - 1);
      for(let s = a; s <= b; s++){ ret += E.g.ret[s]; vol += E.g.n[s]; subsSum += E.g.subs[s]; n++; }
      const done = n ? clamp((Math.min(t, mo.t1) - mo.t0) / (mo.t1 - mo.t0), 0, 1) : 0;
      const subsRev = n ? subsSum / n * E.M.scn.pro.price * 100 * done * mo.days / mo.full : 0;
      return {label: mo.label, fees: ret, subs: subsRev, vol, done, started: t >= mo.t0};
    });
    let spread = 0, ns = 0;
    for(const mk of E.open){ if(mk.bb >= 1 && mk.ba <= 99){ spread += mk.ba - mk.bb; ns++; } }
    return {pool: E.poolN, traded: E.tradersN, wat, online: online(E), notional: E.notional, trades: E.trades, fees: E.fees,
            retained: E.retained, subs: Math.floor(E.subs), mrr: Math.floor(E.subs) * E.M.scn.pro.price * 100,
            retention: cohort ? back / cohort : null, cohort, channels: Object.values(ch), months,
            spread: ns ? spread / ns : null, newsletter: newsletterAt(E)};
  }
  function newsletterAt(E){
    const pts = E.M.scn.newsletter.map(([d, n]) => [E.M.cal.at(d), n]);
    if(E.t <= pts[0][0]) return pts[0][1];
    for(let i = 1; i < pts.length; i++) if(E.t <= pts[i][0]) return Math.round(pts[i-1][1] + (pts[i][1] - pts[i-1][1]) * (E.t - pts[i-1][0]) / (pts[i][0] - pts[i-1][0]));
    return pts[pts.length - 1][1];
  }

  /* How good a run of verdicts was: the average Brier score from the first
     verdict to the resolution, each second scored on the verdict standing
     then, beside the market's own price over the same seconds. Lower is
     better; always saying 50% scores 0.25. */
  function verdictScore(E, k){
    const mk = E.markets[k], V = E.you.verdicts[k];
    if(mk.status !== "resolved" || !V.length) return null;
    const o = mk.outcome === "yes" ? 1 : 0, t1 = mk.resolvedSec;
    let sy = 0, sm = 0, n = 0, vi = 0;
    for(let sec = Math.ceil(V[0].t); sec < t1; sec++){
      while(vi + 1 < V.length && V[vi + 1].t <= sec) vi++;
      const pm = mk.h.p[sec];
      if(!(pm === pm)) continue;
      sy += (V[vi].p / 100 - o) ** 2; sm += (pm / 100 - o) ** 2; n++;
    }
    if(!n){ const v = V[V.length - 1]; return {you: (v.p / 100 - o) ** 2, market: (v.mkt / 100 - o) ** 2, n: 1, last: v.p}; }
    return {you: sy / n, market: sm / n, n, last: V[V.length - 1].p};
  }

  function dateAt(M, t){
    const d = M.cal.date(t), live = M.cal.slowAt(t);
    const m = d.getUTCMonth(), day = d.getUTCDate();
    let clock = "";
    if(live){ const h = d.getUTCHours(), mi = d.getUTCMinutes(); clock = (h % 12 || 12) + ":" + String(mi).padStart(2, "0") + (h < 12 ? " a.m." : " p.m."); }
    return {d, m, day, dow: DOW[d.getUTCDay()], short: MONTHS[m] + " " + day, label: DOW[d.getUTCDay()] + ", " + MONTHS[m] + " " + day, clock, live: !!live};
  }
  /* days from t to t2, on the calendar */
  const daysBetween = (M, t, t2) => M.cal.toD(t2) - M.cal.toD(t);

  return {DT, HZ, TYPES, CROWD, CITIES, CITY_IX, MONTHS, compile, create, step, runTo, act, preview, px, midOf, value, depth, holders,
          board, typeStats, stats, verdictScore, dateAt, daysBetween};
})();

if(typeof module !== "undefined") module.exports = SimEngine;
