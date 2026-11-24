/* =====================================================================
   I, the Jury — the platform's data
   ---------------------------------------------------------------------
   Every case, party, judge, company, outlet and trader here is invented,
   as in the simulation (sim/). Real courts and agencies appear only as
   institutions; no real judge or justice is named.

   Times are relative to the moment the page opens, so the demo never
   goes stale: close is days from now, listed is days ago, news and
   posts are minutes ago.

   A market is one of:
     binary  one question: Yes or No             p      chance of Yes, in %
     multi   several questions under one title   outcomes [{n, p}]
             exclusive: true when exactly one can happen (they sum to ~100)
     vs      a case between two sides             sides  [{n, code, color, p}]
   ===================================================================== */

const ITJ = {

  cats: [
    {id: "scotus",      label: "Supreme Court"},
    {id: "trials",      label: "Trials"},
    {id: "antitrust",   label: "Antitrust"},
    {id: "ai",          label: "AI & Tech"},
    {id: "corporate",   label: "Corporate"},
    {id: "immigration", label: "Immigration"},
    {id: "crypto",      label: "Crypto"},
    {id: "criminal",    label: "Criminal"},
    {id: "elections",   label: "Elections"},
    {id: "culture",     label: "Culture"},
    {id: "sports",      label: "Sports"},
    {id: "ip",          label: "Patents & IP"},
    {id: "mentions",    label: "Mentions"},
    {id: "world",       label: "World"}
  ],

  /* the chips under the category bar */
  topics: [
    {label: "Pruitt argument", m: "pruitt"},
    {label: "Northline verdict", m: "northline"},
    {label: "Skyline merger", m: "skyline-block"},
    {label: "Kessler trial", m: "kessler"},
    {label: "Lumen fair use", m: "lumen"},
    {label: "H-1B lottery", m: "h1b"},
    {label: "Reyes v. Marlow", m: "reyes"},
    {label: "Orbit remedy", m: "orbit-remedy"},
    {label: "Halcyon vote", m: "halcyon-vote"},
    {label: "Tidepool", m: "tidepool"}
  ],

  hero: ["pruitt-split", "northline", "skyline-block", "kessler", "orbit-remedy", "lumen", "pruitt-words"],

  markets: [
  /* ---------------- Supreme Court ---------------- */
  {id: "pruitt", cat: "scotus", sub: "First Amendment", kind: "binary", img: "scotus",
   title: "Will the Supreme Court strike down the AI election-ad ban?",
   p: 41, vol: 4218550, close: 214, listed: 51, tags: ["trending"],
   news: "Argument is set for April 20. Forty-seven news organizations filed briefs for the comedian.",
   case: {name: "Pruitt v. Federal Election Commission", court: "Supreme Court of the United States", docket: "No. 26-412"},
   rules: "If the Supreme Court rules for Pruitt and holds the Deceptive AI Election Media Act's ban unconstitutional, in whole or as applied to him, before {close}, the market resolves to Yes. A dismissal or a ruling for the FEC resolves it No.",
   about: "A comedian was fined $50,000 for an AI video of a senator. The appeals court upheld the law 2–1; the Supreme Court took the case."},

  {id: "pruitt-split", cat: "scotus", sub: "First Amendment", kind: "multi", exclusive: true, img: "scotus2",
   title: "How will the Court split in Pruitt v. FEC?",
   outcomes: [{n: "Uphold 6–3", p: 31}, {n: "Strike 5–4", p: 22}, {n: "Strike 6–3", p: 17}, {n: "Uphold 7–2", p: 12}, {n: "Unanimous", p: 9}],
   vol: 1873204, close: 214, listed: 44, tags: ["trending"],
   news: "Court-watchers expect the opinion in the last week of June, as with most free-speech cases this term.",
   case: {name: "Pruitt v. Federal Election Commission", court: "Supreme Court of the United States", docket: "No. 26-412"},
   rules: "Resolves to the vote in the Court's judgment on the main question in Pruitt v. FEC, as printed in the opinion released before {close}."},

  {id: "zephyr-cert", cat: "scotus", sub: "Tech", kind: "binary", img: "capitol",
   title: "Will the Supreme Court hear Zephyr Social's challenge to the app ban?",
   p: 62, vol: 932118, close: 38, listed: 12, tags: ["new"],
   news: "The petition is set for the Court's January 9 conference.",
   case: {name: "Zephyr Social, Inc. v. Department of Commerce", court: "Supreme Court of the United States", docket: "No. 26-788"},
   rules: "If the Supreme Court grants certiorari in Zephyr Social v. Department of Commerce before {close}, the market resolves to Yes."},

  {id: "unanimous", cat: "scotus", sub: "Term stats", kind: "multi", img: "columns", repeat: "Annually",
   title: "How many unanimous decisions this term?",
   outcomes: [{n: "Above 20", p: 71}, {n: "Above 25", p: 44}, {n: "Above 30", p: 16}],
   vol: 386410, close: 218, listed: 58,
   rules: "Counts argued cases decided 9–0 on the judgment before {close}. Each line resolves Yes if the count is above its number."},

  {id: "term-end", cat: "scotus", sub: "Term stats", kind: "binary", img: "lawbooks", repeat: "Annually",
   title: "Will the Court issue its last opinion by June 30?",
   p: 83, vol: 211876, close: 218, listed: 58,
   rules: "If the Supreme Court releases its final opinion in an argued case of the term on or before June 30, the market resolves to Yes."},

  /* ---------------- Trials ---------------- */
  {id: "northline", cat: "trials", sub: "Civil", kind: "multi", exclusive: true, img: "train",
   title: "Northline Rail derailment trial: what will the jury decide?",
   outcomes: [{n: "Over $500M", p: 36}, {n: "Under $500M", p: 29}, {n: "Not liable", p: 23}, {n: "Mistrial", p: 9}],
   vol: 3102877, close: 6, listed: 30, live: "Day 9 · Jury deliberating", tags: ["trending"],
   updates: [[42, "The jury sent its second note: it wants the dispatcher's testimony read back."], [300, "Deliberations resumed at 9:00am with all eight jurors."], [1500, "Closing arguments ended. Northline asked the jury to blame the track inspector."]],
   news: "The jury asked to rehear the dispatcher's testimony this morning, its second note in two days.",
   case: {name: "Ashford County v. Northline Rail Co.", court: "U.S. District Court, Eastern District of Ohio", docket: "No. 2:25-cv-03318"},
   rules: "Resolves to the verdict the jury returns before {close}. A mistrial, or no verdict by then, resolves Mistrial."},

  {id: "northline-friday", cat: "trials", sub: "Civil", kind: "binary", img: "train2",
   title: "Will the Northline jury reach a verdict by Friday?",
   p: 58, vol: 688120, close: "fri", listed: 2, live: "Deliberating · 11h 40m",
   updates: [[42, "A second jury note. Notes about testimony usually mean hours more, not days."]],
   rules: "If the jury in Ashford County v. Northline Rail returns a verdict before 5:00pm ET Friday, the market resolves to Yes."},

  {id: "corvid", cat: "trials", sub: "Trade secrets", kind: "vs", img: "highway",
   title: "Corvid v. Altair Motors: who wins at trial?",
   sides: [{n: "Corvid", code: "COR", color: "#111827", p: 57}, {n: "Altair", code: "ALT", color: "#B42318", p: 44}],
   vol: 1640212, close: 196, listed: 40, tags: ["trending"],
   news: "An engineer left Corvid with 14,000 files. Six months later Altair's lidar shipped.",
   case: {name: "Corvid Robotics, Inc. v. Altair Motors Corp.", court: "U.S. District Court, Northern District of California", docket: "No. 5:26-cv-02291"},
   rules: "Corvid wins if the jury finds Altair liable for misappropriating trade secrets before {close}. Altair wins on a defense verdict. A settlement first resolves both sides No."},

  {id: "corvid-damages", cat: "trials", sub: "Trade secrets", kind: "multi", img: "cash",
   title: "Damages awarded in Corvid v. Altair?",
   outcomes: [{n: "Above $100M", p: 48}, {n: "Above $500M", p: 21}, {n: "Above $1B", p: 8}],
   vol: 402981, close: 196, listed: 22,
   rules: "Resolves on the total damages in the jury's verdict before {close}, before any reduction by the judge."},

  {id: "brightwater", cat: "trials", sub: "Environmental", kind: "binary", img: "dam",
   title: "Will Brightwater be found liable for the Cedar River spill?",
   p: 66, vol: 518334, close: 61, listed: 19,
   case: {name: "Cedar River Keepers v. Brightwater Chemical", court: "U.S. District Court, Western District of Pennsylvania", docket: "No. 2:24-cv-01147"},
   rules: "If a jury or the court finds Brightwater Chemical liable on any claim before {close}, the market resolves to Yes."},

  /* ---------------- Antitrust ---------------- */
  {id: "skyline-block", cat: "antitrust", sub: "Mergers", kind: "vs", img: "airliner",
   title: "U.S. v. Skyline Airways: will the merger be blocked?",
   sides: [{n: "DOJ", code: "DOJ", color: "#1E3A8A", p: 63}, {n: "Skyline", code: "SKY", color: "#0E7490", p: 38}],
   vol: 2754090, close: 157, listed: 64, live: "Bench trial · Day 12", tags: ["trending"],
   updates: [[18, "Meridian's CFO on the stand: 'We have eighteen months of cash, not thirty-six.'"], [190, "The judge asked the DOJ's economist to rerun the fare model without Newark."]],
   news: "Skyline offered to sell 41 Newark slots. The government called it 'a remedy for a different deal'.",
   case: {name: "United States v. Skyline Airways, Inc.", court: "U.S. District Court, District of Massachusetts", docket: "No. 1:26-cv-11873"},
   rules: "DOJ wins if the court enjoins the Skyline–Meridian merger before {close}. Skyline wins if the court rules for the airlines. If the deal is abandoned first, both sides resolve No."},

  {id: "skyline-abandon", cat: "antitrust", sub: "Mergers", kind: "binary", img: "airport",
   title: "Will Skyline and Meridian call off their merger?",
   p: 28, vol: 690442, close: 203, listed: 64,
   rules: "If either airline publicly terminates the merger agreement before {close}, the market resolves to Yes."},

  {id: "brightcart", cat: "antitrust", sub: "Mergers", kind: "binary", img: "grocery",
   title: "Will the FTC sue to block Brightcart's $24B Pantry deal?",
   p: 37, vol: 744306, close: 88, listed: 9, tags: ["new"],
   rules: "If the FTC files a complaint or an administrative challenge to Brightcart's acquisition of Pantry Foods before {close}, the market resolves to Yes."},

  {id: "orbit-remedy", cat: "antitrust", sub: "Big Tech", kind: "multi", img: "servers",
   title: "What will the court order Orbit Search to do?",
   outcomes: [{n: "Share data", p: 61}, {n: "End default deals", p: 54}, {n: "Sell browser", p: 23}, {n: "Sell ad exchange", p: 14}],
   vol: 2210385, close: 129, listed: 77, tags: ["trending"],
   news: "The remedies hearing closed Friday. The judge asked both sides how a browser sale would work.",
   case: {name: "United States v. Orbit Search, Inc.", court: "U.S. District Court, District of Columbia", docket: "No. 1:24-cv-00911"},
   rules: "Each line resolves Yes if the court's final judgment, entered before {close}, orders that remedy."},

  /* ---------------- AI & Tech ---------------- */
  {id: "lumen", cat: "ai", sub: "Copyright", kind: "binary", img: "robot",
   title: "Will Lumen's AI training be ruled fair use?",
   p: 46, vol: 3388211, close: 188, listed: 70, tags: ["trending"],
   news: "Judge Ellery asked for more briefing on market harm, the factor courts weigh most.",
   case: {name: "Halloway v. Lumen Labs, Inc.", court: "U.S. District Court, Northern District of California", docket: "No. 3:25-cv-04419"},
   rules: "If the court grants Lumen summary judgment that training Lumen-4 on the plaintiffs' books was fair use before {close}, the market resolves to Yes. A settlement first resolves it No.",
   about: "41,000 authors say Lumen trained its model on 7 million books, 1.9 million of them from pirate sites, without asking or paying."},

  {id: "lumen-settle", cat: "ai", sub: "Copyright", kind: "binary", img: "books",
   title: "Will Lumen Labs settle with the authors before a ruling?",
   p: 34, vol: 1104772, close: 188, listed: 33,
   rules: "If Lumen Labs and the author class announce a settlement before the court rules on fair use, and before {close}, the market resolves to Yes."},

  {id: "vantage-delete", cat: "ai", sub: "Privacy", kind: "binary", img: "robot2",
   title: "Will a court order Vantage AI to destroy a model?",
   p: 7, vol: 264520, close: 330, listed: 15, tags: ["new"],
   rules: "If any U.S. court orders Vantage AI to delete or destroy a trained model before {close}, the market resolves to Yes."},

  {id: "echo-voice", cat: "ai", sub: "Privacy", kind: "binary", img: "microphone",
   title: "Will the voice-clone suit against Echo Labs survive dismissal?",
   p: 72, vol: 331870, close: 52, listed: 26,
   rules: "If the court denies Echo Labs' motion to dismiss in whole or in part before {close}, the market resolves to Yes."},

  /* ---------------- Corporate ---------------- */
  {id: "halcyon-vote", cat: "corporate", sub: "Delaware", kind: "binary", img: "studio",
   title: "Will the court halt Halcyon Media's shareholder vote?",
   p: 38, vol: 1250964, close: 24, listed: 21, live: "Hearing · Court of Chancery", tags: ["trending"],
   updates: [[6, "The Vice Chancellor asked why the board spoke to only one other bidder."], [55, "The hearing opened with the CEO's texts to the buyer on screen."]],
   news: "Discovery turned up texts between Halcyon's CEO and the buyer about his job after the deal.",
   case: {name: "In re Halcyon Media, Inc. Stockholder Litigation", court: "Delaware Court of Chancery", docket: "C.A. No. 2027-0031"},
   rules: "If the Court of Chancery enjoins or postpones Halcyon's shareholder vote on the Apex buyout before {close}, the market resolves to Yes."},

  {id: "halcyon-deal", cat: "corporate", sub: "Delaware", kind: "binary", img: "skyline",
   title: "Will Halcyon shareholders approve the Apex buyout?",
   p: 71, vol: 588201, close: 140, listed: 21,
   rules: "If Halcyon Media's shareholders approve a sale to Apex Partners at a meeting held before {close}, the market resolves to Yes."},

  {id: "vireo-pay", cat: "corporate", sub: "Delaware", kind: "binary", img: "exchange",
   title: "Will Delaware void Vireo's $9B CEO pay package?",
   p: 44, vol: 962330, close: 97, listed: 48,
   rules: "If the Court of Chancery rescinds or voids the 2024 Vireo Inc. CEO award, in whole or in part, before {close}, the market resolves to Yes."},

  /* ---------------- Immigration ---------------- */
  {id: "h1b", cat: "immigration", sub: "Work visas", kind: "binary", img: "liberty",
   title: "Will a court block the salary-weighted H-1B lottery?",
   p: 52, vol: 1408813, close: 126, listed: 36, tags: ["trending"],
   news: "140 startups and two universities say a draw weighted by salary isn't what Congress wrote.",
   case: {name: "Bay Area Founders Coalition v. DHS", court: "U.S. District Court, District of Columbia", docket: "No. 1:27-cv-00118"},
   rules: "If a federal court vacates, enjoins or stays DHS's salary-weighted H-1B selection rule before {close}, the market resolves to Yes."},

  {id: "asylum-hold", cat: "immigration", sub: "Asylum", kind: "binary", img: "terminal",
   title: "Will the Ninth Circuit keep the new asylum rule on hold?",
   p: 61, vol: 498107, close: 47, listed: 11, tags: ["new"],
   rules: "If the Ninth Circuit denies the government's motion for a stay of the injunction before {close}, the market resolves to Yes."},

  /* ---------------- Crypto ---------------- */
  {id: "tidepool", cat: "crypto", sub: "SEC", kind: "binary", img: "bitcoin",
   title: "Will the SEC win its case against Tidepool Exchange?",
   p: 33, vol: 1902447, close: 165, listed: 90, tags: ["trending"],
   news: "Tidepool's lawyers say three of the SEC's tokens have since been delisted everywhere.",
   case: {name: "SEC v. Tidepool Exchange, LLC", court: "U.S. District Court, Southern District of New York", docket: "No. 1:25-cv-07720"},
   rules: "If the court enters judgment for the SEC on any registration claim before {close}, the market resolves to Yes."},

  {id: "wave-token", cat: "crypto", sub: "SEC", kind: "vs", img: "bitcoin2",
   title: "SEC v. Wavelength: is the WAVE token a security?",
   sides: [{n: "Security", code: "SEC", color: "#1D4ED8", p: 41}, {n: "Not a security", code: "WAVE", color: "#0EA5E9", p: 60}],
   vol: 807219, close: 110, listed: 42,
   rules: "Resolves on the court's ruling, before {close}, on whether secondary-market sales of WAVE were investment contracts."},

  {id: "coinvault", cat: "crypto", sub: "Bankruptcy", kind: "binary", img: "coins",
   title: "Will a judge approve Coinvault's payout plan by January 31?",
   p: 69, vol: 356012, close: 33, listed: 17,
   rules: "If the bankruptcy court confirms Coinvault's plan of reorganization before {close}, the market resolves to Yes."},

  /* ---------------- Criminal ---------------- */
  {id: "kessler", cat: "criminal", sub: "Fraud", kind: "multi", exclusive: true, img: "handcuffs",
   title: "Kessler Capital fraud trial: what's the verdict?",
   outcomes: [{n: "Guilty, all", p: 46}, {n: "Guilty, some", p: 27}, {n: "Hung jury", p: 15}, {n: "Acquitted", p: 12}],
   vol: 2988140, close: 34, listed: 55, live: "Day 14 · Defense case", tags: ["trending"],
   updates: [[11, "The defense called its first witness, a forensic accountant."], [260, "Cross-examination of the CFO ended on a missing week of emails."]],
   news: "The fund's former CFO finished three days on the stand. The defense calls its first witness today.",
   case: {name: "United States v. Kessler", court: "U.S. District Court, Southern District of New York", docket: "No. 1:26-cr-00205"},
   rules: "Resolves to the jury's verdict on the eleven counts before {close}. A mistrial for any reason resolves Hung jury."},

  {id: "kessler-sentence", cat: "criminal", sub: "Fraud", kind: "multi", img: "courthouse",
   title: "If convicted, how long will Kessler's sentence be?",
   outcomes: [{n: "Above 5 years", p: 72}, {n: "Above 10 years", p: 41}, {n: "Above 20 years", p: 12}],
   vol: 640093, close: 270, listed: 55,
   rules: "Resolves on the prison term imposed at sentencing before {close}. If there's no conviction, every line resolves No."},

  {id: "brightline-plea", cat: "criminal", sub: "Health care", kind: "binary", img: "pills",
   title: "Will Brightline Pharma's former CEO take a plea deal?",
   p: 24, vol: 289560, close: 74, listed: 23,
   rules: "If the defendant pleads guilty to any count in United States v. Okafor before {close}, the market resolves to Yes."},

  /* ---------------- Elections ---------------- */
  {id: "map-redraw", cat: "elections", sub: "Redistricting", kind: "binary", img: "ballot",
   title: "Will a court order a new congressional map before 2028?",
   p: 39, vol: 710442, close: 400, listed: 31,
   rules: "If a federal or state court orders a state to redraw its congressional map for the 2028 election before {close}, the market resolves to Yes."},

  {id: "voter-id", cat: "elections", sub: "Voting rights", kind: "binary", img: "capitol2",
   title: "Will the Eleventh Circuit block the new voter ID law?",
   p: 27, vol: 254881, close: 81, listed: 8, tags: ["new"],
   rules: "If the Eleventh Circuit enjoins the law or affirms an injunction before {close}, the market resolves to Yes."},

  /* ---------------- Culture ---------------- */
  {id: "reyes", cat: "culture", sub: "Music", kind: "vs", img: "concert",
   title: "Reyes v. Marlow: did 'Golden Hour' copy 'Neon Tide'?",
   sides: [{n: "Reyes", code: "REY", color: "#DB2777", p: 44}, {n: "Marlow", code: "MAR", color: "#7C3AED", p: 57}],
   vol: 1488305, close: 12, listed: 26, live: "Day 6 · Closing arguments", tags: ["trending"],
   updates: [[24, "Reyes's lawyer played the two hooks back to back, then sat down."], [130, "Closings began after the judge kept a third cover version out."]],
   news: "Both songs were played for the jury four times. Marlow's team brought a guitar.",
   case: {name: "Reyes v. Marlow", court: "U.S. District Court, Central District of California", docket: "No. 2:25-cv-08164"},
   rules: "Reyes wins if the jury finds that 'Golden Hour' infringes 'Neon Tide' before {close}. Marlow wins on a defense verdict."},

  {id: "orchard", cat: "culture", sub: "Film", kind: "binary", img: "camera",
   title: "Will the Halberd estate win back 'The Last Orchard' film rights?",
   p: 31, vol: 377042, close: 120, listed: 18,
   rules: "If the court rules that the estate's termination notice is valid before {close}, the market resolves to Yes."},

  {id: "royalties", cat: "culture", sub: "Music", kind: "multi", img: "vinyl",
   title: "How big will the streaming royalties settlement be?",
   outcomes: [{n: "Above $100M", p: 64}, {n: "Above $250M", p: 31}, {n: "Above $500M", p: 9}],
   vol: 298775, close: 150, listed: 14,
   rules: "Resolves on the total settlement fund in a preliminarily approved settlement announced before {close}."},

  /* ---------------- Sports ---------------- */
  {id: "cole", cat: "sports", sub: "Football", kind: "binary", img: "stadium",
   title: "Will a judge reinstate Darius Cole before the playoffs?",
   p: 35, vol: 922418, close: 41, listed: 6, tags: ["new"],
   news: "The quarterback's lawyers say the league's arbitrator never heard from the lab.",
   rules: "If a court vacates or stays Cole's suspension before the first playoff game, and before {close}, the market resolves to Yes."},

  {id: "athletes", cat: "sports", sub: "College", kind: "binary", img: "basketball",
   title: "Will college athletes win the revenue-share class action?",
   p: 57, vol: 488260, close: 245, listed: 60,
   rules: "If the court enters judgment for the athlete class on liability before {close}, the market resolves to Yes."},

  /* ---------------- Patents & IP ---------------- */
  {id: "aperture", cat: "ip", sub: "Patents", kind: "vs", img: "phone",
   title: "Lumio v. Aperture: does the Aperture 9 infringe?",
   sides: [{n: "Lumio", code: "LUM", color: "#EA580C", p: 53}, {n: "Aperture", code: "APT", color: "#334155", p: 48}],
   vol: 734108, close: 66, listed: 29,
   rules: "Lumio wins if the jury finds infringement of any asserted claim before {close}. Aperture wins on a verdict of no infringement or invalidity."},

  {id: "pulse-itc", cat: "ip", sub: "Patents", kind: "binary", img: "watch",
   title: "Will the ITC ban imports of the Pulse smartwatch?",
   p: 42, vol: 415773, close: 102, listed: 37,
   rules: "If the International Trade Commission issues a final exclusion order covering the Pulse watch before {close}, the market resolves to Yes."},

  /* ---------------- Mentions ---------------- */
  {id: "pruitt-words", cat: "mentions", sub: "Oral argument", kind: "multi", img: "scotus3",
   title: "What will be said at the Pruitt argument?",
   outcomes: [{n: "Deepfake", p: 93}, {n: "Parody", p: 88}, {n: "Chilling effect", p: 71}, {n: "Watermark", p: 47}, {n: "Saturday Night Live", p: 22}],
   vol: 912330, close: 147, listed: 10, tags: ["new"],
   news: "Each word resolves Yes if anyone at the lectern or on the bench says it during the hour.",
   rules: "Each word resolves Yes if it is spoken during the oral argument in Pruitt v. FEC, per the Court's official transcript, before {close}."},

  {id: "skyline-call", cat: "mentions", sub: "Earnings calls", kind: "multi", img: "podium",
   title: "What will Skyline's CEO say on the earnings call?",
   outcomes: [{n: "Merger", p: 97}, {n: "Newark", p: 71}, {n: "Divestiture", p: 63}, {n: "Appeal", p: 55}, {n: "Settlement", p: 38}],
   vol: 268410, close: 15, listed: 4,
   rules: "Each word resolves Yes if Skyline's CEO says it during the fourth-quarter earnings call, per the official transcript."},

  /* ---------------- World ---------------- */
  {id: "orbit-eu", cat: "world", sub: "Europe", kind: "binary", img: "parliament",
   title: "Will the EU fine Orbit Search over €1B by June 30?",
   p: 58, vol: 640225, close: 218, listed: 47,
   rules: "If the European Commission announces a fine of more than €1 billion against Orbit Search before {close}, the market resolves to Yes."},

  {id: "thamesway", cat: "world", sub: "UK", kind: "binary", img: "london",
   title: "Will a UK court approve the Thamesway Water rescue?",
   p: 66, vol: 301557, close: 58, listed: 20,
   rules: "If the High Court sanctions Thamesway Water's restructuring plan before {close}, the market resolves to Yes."}
  ],

  /* -------------------------------------------------------------------
     Breaking news. Outlets are invented; logo is a letter on a colour.
     ------------------------------------------------------------------- */
  news: [
    {src: "The Docket", mono: "D", color: "#1D4ED8", ago: 9, m: "northline",
     title: "Northline jury asks to rehear the dispatcher",
     body: "The second note in two days came an hour into deliberations. Both sides read it as good news."},
    {src: "Courthouse Wire", mono: "C", color: "#B42318", ago: 26, m: "kessler",
     title: "Kessler's former CFO leaves the stand after three days",
     body: "Defense lawyers spent the last morning on a single spreadsheet and a missing week of emails."},
    {src: "Bench Report", mono: "B", color: "#6D28D9", ago: 41, m: "pruitt",
     title: "Forty-seven newsrooms back the comedian in Pruitt",
     body: "The briefs span the spectrum and make one argument: satire needs room to look real."},
    {src: "Ledger Legal", mono: "L", color: "#047857", ago: 63, m: "orbit-remedy",
     title: "Orbit remedies hearing closes with a question about the browser",
     body: "The judge asked how a sale would work in practice. Orbit's stock fell 3% in an hour."},
    {src: "Capitol Brief", mono: "CB", color: "#0F172A", ago: 95, m: "h1b",
     title: "Startups ask for an H-1B ruling before the March draw",
     body: "The judge set argument for next month and told DHS to explain the weighting math."},
    {src: "The Docket", mono: "D", color: "#1D4ED8", ago: 140, m: "skyline-block",
     title: "Skyline offers 41 Newark slots to save the merger",
     body: "The government called the offer a remedy for a different deal."},
    {src: "Wire & Gavel", mono: "W", color: "#C2410C", ago: 210, m: "reyes",
     title: "In Reyes v. Marlow, the jury hears both songs a fourth time",
     body: "Marlow's lawyers brought a guitar. Reyes's brought a musicologist and a slow-motion waveform."},
    {src: "Bench Report", mono: "B", color: "#6D28D9", ago: 300, m: "lumen",
     title: "Judge in the Lumen case wants more on market harm",
     body: "The order gives both sides thirty days, which pushes a ruling into spring."}
  ],

  /* -------------------------------------------------------------------
     Traders. av is a photo key, or omitted for a generated pattern.
     ------------------------------------------------------------------- */
  users: [
    {h: "certpool",          av: "a-fox",      profit: 412880, volume: 18204400, preds: 6120, joined: "Mar 2024"},
    {h: "amicus.brie",       profit: 318640, volume: 9120550, preds: 4211, joined: "Jan 2025"},
    {h: "en.banc",           av: "a-mountain", profit: 287112, volume: 14880210, preds: 3990, joined: "Aug 2023"},
    {h: "voir.dire",         profit: 241077, volume: 6410332, preds: 5702, joined: "Jun 2024"},
    {h: "gavelgazer",        av: "a-dog",      profit: 198530, volume: 21330408, preds: 2860, joined: "Nov 2023"},
    {h: "de.novo",           profit: 176204, volume: 5022871, preds: 3301, joined: "Feb 2025"},
    {h: "res.ipsa",          av: "a-wave",     profit: 151880, volume: 7740910, preds: 2477, joined: "Sep 2024"},
    {h: "sidebar.sam",       profit: 129310, volume: 3900122, preds: 6630, joined: "Apr 2025"},
    {h: "billable.hours",    av: "a-cat",      profit: 118904, volume: 12770655, preds: 1902, joined: "Dec 2023"},
    {h: "pro.se.pete",       profit: 101377, volume: 2840330, preds: 4480, joined: "May 2025"},
    {h: "motion.denied",     av: "a-forest",   profit: 96240, volume: 4410982, preds: 2205, joined: "Jul 2024"},
    {h: "habeas.hannah",     profit: 88105, volume: 3120477, preds: 3875, joined: "Oct 2024"},
    {h: "remand.randy",      profit: 74990, volume: 9930120, preds: 1408, joined: "Jan 2024"},
    {h: "jurydutyjen",       av: "a-fox2",     profit: 69420, volume: 1980650, preds: 5120, joined: "Mar 2025"},
    {h: "summary.judgment",  profit: 61233, volume: 2655090, preds: 2960, joined: "Aug 2024"},
    {h: "objection",         av: "a-desert",   profit: 55870, volume: 1730844, preds: 2088, joined: "Jun 2025"},
    {h: "mens.rea",          profit: 49015, volume: 3310222, preds: 1650, joined: "Nov 2024"},
    {h: "tort.reformer",     profit: 41180, volume: 1205990, preds: 3402, joined: "Feb 2024"},
    {h: "the.clerk",         av: "a-lake",     profit: 37662, volume: 980411, preds: 4011, joined: "Sep 2025"},
    {h: "affirmed",          profit: 30550, volume: 2280760, preds: 1290, joined: "May 2024"}
  ],

  /* posts on the Ideas feed and under markets */
  ideas: [
    {u: "certpool", ago: 14, m: "pruitt", side: "No", amt: 8200, likes: 212, replies: 38,
     text: "Narrow law, a label is a defence, and it only covers candidates for 90 days. I think it survives, and the 6–3 split market is underpriced."},
    {u: "voir.dire", ago: 37, m: "northline", side: "Yes", outcome: "Over $500M", amt: 2400, likes: 96, replies: 21,
     text: "Juries that ask to rehear the dispatcher aren't looking for a reason to acquit."},
    {u: "amicus.brie", ago: 52, m: "lumen", side: "No", amt: 5100, likes: 140, replies: 44,
     text: "Even if training is fair use, the 1.9M pirated books are their own problem. Settlement before a ruling resolves this No."},
    {u: "gavelgazer", ago: 88, m: "skyline-block", side: "Yes", outcome: "DOJ", amt: 15000, likes: 71, replies: 12,
     text: "Sixty-one overlapping routes is the whole case. The Newark slot offer came too late and too small."},
    {u: "sidebar.sam", ago: 120, m: "kessler", side: "Yes", outcome: "Guilty, all", amt: 900, likes: 58, replies: 9,
     text: "Three days of the CFO walking the jury through the spreadsheet. Hard to unring that."},
    {u: "de.novo", ago: 170, m: "h1b", side: "Yes", amt: 3300, likes: 83, replies: 17,
     text: "'In the order in which petitions are filed' doesn't leave much room for a salary-weighted draw."}
  ],

  /* the four promises under the hero */
  props: [
    {icon: "scale",  title: "Markets on real legal outcomes", body: "Rulings, verdicts and settlements, resolved on the court record."},
    {icon: "bolt",   title: "Buy and sell any time",          body: "Trade from $1. Cash out before the court rules."},
    {icon: "spark",  title: "Free verdicts",                   body: "Forecast without trading and build a public record."},
    {icon: "shield", title: "Watched for insiders",            body: "Surveillance flags trading ahead of sealed news."}
  ]
};

if(typeof module !== "undefined") module.exports = ITJ;
