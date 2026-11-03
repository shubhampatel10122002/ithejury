/* =====================================================================
   I, the Jury Live — the scenario
   ---------------------------------------------------------------------
   The simulation's story is this file and nothing else. Five fictional
   cases, eight markets, and everything that happens to them between
   January 4 and June 30, 2027. Edit a date, a line or a number here and
   the whole run follows: the engine (engine.js) and the screens (sim.js)
   hold no story of their own.

   Everything here is invented: the cases, the parties, the judges, the
   lawyers, the companies and every number. The legal mechanics are real
   ones (disclosure injunctions in Delaware, divestiture remedies, fair
   use, vacatur under the APA, stays pending appeal, opinion assignment),
   because a story that gets those wrong would lose the people it is
   meant to convince. No real judge or justice is named or quoted.

   Time: dates, in 2027. The calendar runs the term onto ten minutes at
   about 3.1 seconds a day, except the Supreme Court argument, where one
   hour of argument takes 42 seconds so every question can be read.

   An event can carry:
     at      "Mar 2" or "Mar 2 10:00" (noon if no time is given)
     m       the market it is about (its card, colour and chart)
     tag     what kind of moment: Hearing, Ruling, Filing...
     major   true to slide in a breaking card
     fair    {market: probability}: what the facts now imply. The
             informed traders converge on it; nobody else knows it.
     over    seconds a fair value takes to glide there (a deadline
             approaching with no ruling), instead of jumping
     hype    {market: -0.1..0.1}: how hard the crowd overreacts. Fades
             with a 40-second half-life
     resolve "yes" | "no": settles the market on this moment
     list    a market id that opens for trading on this moment
     grow    new traders arriving through a channel
     doc     the document shown on the breaking card
     changed one line for the market page's "What changed"
   ===================================================================== */

const SCENARIO = {
  title: "I, the Jury Live",
  credits: 1000,                 /* practice credits every player starts with, in dollars */
  length: 600,                   /* seconds at 1x */
  seed: 20270104,
  calendar: {year: 2027, month: 0, day: 4, days: 178,
             slow: [{at: "Apr 20 10:00", hours: 1, secs: 42}]},
  fees: {taker: .01, retained: .005},    /* 1% of value, paid by the taker; I, the Jury keeps half */
  pro: {price: 20, start: 360},          /* Pro subscription, $ a month; subscribers on day one */
  newsletter: [["Jan 4", 14200], ["Jan 8", 18400], ["Feb 17", 24100], ["Mar 11", 27600], ["May 26", 41300], ["Jun 28", 52000]],

  cats: {
    corporate:   {label: "Corporate",      color: "#E0559C"},
    antitrust:   {label: "Antitrust",      color: "#3D7FF5"},
    ai:          {label: "AI & copyright", color: "#F08A24"},
    scotus:      {label: "Supreme Court",  color: "#8A63F5"},
    immigration: {label: "Immigration",    color: "#16A9C2"},
    trade:       {label: "Trade secrets",  color: "#A87843"}
  },

  /* ---------------------------------------------------------------------
     The cases. A case is the reporting; its markets are the questions.
     --------------------------------------------------------------------- */
  cases: [
  {
    id: "halcyon", cat: "corporate", short: "Halcyon buyout",
    head: "A $6.2 billion buyout, a three-week sale and a CEO with a job waiting. Shareholders want the vote stopped.",
    caseName: "In re Halcyon Media, Inc. Stockholder Litigation",
    court: "Delaware Court of Chancery", docket: "C.A. No. 2027-0031-ICC",
    who: [["Judge", "Vice Chancellor Ines Calloway"], ["Plaintiff", "Great Lakes Teachers’ Pension Fund"],
          ["Defendants", "Halcyon’s board; CEO Garrett Lyle; Apex Partners"], ["Stakes", "$6.2B buyout at $38 a share"]],
    facts: [["$6.2B", "Apex’s price for Halcyon"], ["3 weeks", "how long the sale process ran"], ["31%", "premium to the pre-deal price"]],
    brief: ["Apex Partners agreed in December to buy Halcyon Media, owner of 41 local TV stations and the streaming service HalcyonPlus, for $38 a share. The board ran a three-week sale and spoke to one other bidder.",
            "A pension fund that owns 2% of Halcyon sued to postpone the February 4 vote. It says CEO Garrett Lyle was negotiating his own future at Apex while negotiating the price, and that shareholders can’t vote on a deal they haven’t been told the truth about."],
    forYes: ["Delaware postpones votes when shareholders are missing material facts, and a CEO’s side deal with the buyer is the textbook example.",
             "Discovery is expedited: if the messages exist, they will surface before the hearing."],
    forNo: ["Courts rarely stop a vote outright. The usual cure is more disclosure, which the company can make before the meeting.",
            "A 31% premium makes judges wary of standing between shareholders and their money."]
  },
  {
    id: "skyline", cat: "antitrust", short: "Airline merger",
    head: "The government says a $14 billion airline merger would raise fares on 61 routes. The airlines say it’s the only way Meridian survives.",
    caseName: "United States v. Skyline Airways, Inc. and Meridian Air Holdings",
    court: "U.S. District Court, District of Massachusetts", docket: "No. 1:26-cv-11873-TV",
    who: [["Judge", "Theodore Vance (bench trial, no jury)"], ["Plaintiff", "U.S. Department of Justice"],
          ["Defendants", "Skyline Airways; Meridian Air Holdings"], ["Stakes", "$14B merger; $400M breakup fee"]],
    facts: [["$14B", "the deal"], ["61", "routes where the two compete"], ["58%", "of Newark’s gates, combined"]],
    brief: ["Skyline, the fourth-largest U.S. airline, agreed to buy Meridian, the sixth, for $14 billion. Together they would hold 58% of the gates at Newark and 49% at Boston Logan.",
            "The Justice Department sued to block the deal over 61 routes where the two compete head to head. The airlines say Meridian is losing money and may not survive to compete at all. The trial starts January 19, and the judge decides alone."],
    forYes: ["Head-to-head competition on 61 routes is the core of a classic merger case, and courts have blocked airline deals on less.",
             "Internal documents usually decide these trials, and the government has had two years to find them."],
    forNo: ["The airlines can offer to sell gates and slots to another carrier, and a credible remedy has saved deals before.",
            "Meridian’s losses are real, and the judge will weigh what happens to its routes if it fails."]
  },
  {
    id: "lumen", cat: "ai", short: "AI training",
    head: "Lumen trained its AI on 7 million books, some from pirate sites. Is that fair use?",
    caseName: "Halloway et al. v. Lumen Labs, Inc.",
    court: "U.S. District Court, Northern District of California", docket: "No. 3:25-cv-04419-ME",
    who: [["Judge", "Marcus Ellery"], ["Plaintiffs", "Novelist Ruth Halloway and a class of 41,000 authors"],
          ["Defendant", "Lumen Labs, maker of the Lumen-4 model"], ["Stakes", "Statutory damages of up to $150,000 a book"]],
    facts: [["7M", "books in the training set"], ["1.9M", "from pirate libraries"], ["41,000", "authors in the class"]],
    brief: ["Novelist Ruth Halloway and a class of 41,000 authors say Lumen Labs copied their books to train Lumen-4, its flagship model, without asking or paying. About 1.9 million of the books came from shadow libraries that host pirated copies.",
            "Lumen says training is fair use: the model learns patterns from books and doesn’t hand them back, much as a person learns to write by reading. Both sides have asked Judge Ellery to decide fair use without a trial."],
    forYes: ["Courts have called similar uses transformative, and the judge’s questions so far have been about market harm, not copying.",
             "Lumen’s output filters block long passages, which weakens the authors’ strongest argument."],
    forNo: ["The pirated copies are a separate problem: a judge can find training fair and still not excuse how the books were obtained.",
            "Lumen is preparing an IPO. Companies facing a damages trial often settle before a ruling, and a settlement resolves this market No."]
  },
  {
    id: "pruitt", cat: "scotus", short: "AI deepfakes",
    head: "A comedian was fined $50,000 for an AI video of a senator. The Supreme Court will decide whether that’s a crime.",
    caseName: "Pruitt v. Federal Election Commission",
    court: "Supreme Court of the United States", docket: "No. 26-412",
    who: [["Court", "The Supreme Court, reviewing the D.C. Circuit"], ["Petitioner", "Dale Pruitt, comedian"],
          ["Respondent", "Federal Election Commission"], ["Law", "Deceptive AI Election Media Act of 2025"]],
    facts: [["$50,000", "Pruitt’s fine"], ["4.1M", "views of the unlabeled copies"], ["2–1", "the appeals court vote to uphold"]],
    brief: ["The Deceptive AI Election Media Act bans distributing realistic AI-made video or audio of a federal candidate in the 90 days before an election unless it is clearly labeled. Comedian Dale Pruitt posted a parody of a senator ‘confessing’ to bribery. It was labeled, but copies without the label reached millions.",
            "The FEC fined him $50,000, and the D.C. Circuit upheld the law 2–1. Pruitt says the Act punishes satire and that the answer to false speech is more speech. The government says a fake that looks like a recording is a lie about a fact, not an opinion."],
    forYes: ["The Court has struck down a law against false statements before, and it is wary of the government deciding what counts as parody.",
             "47 news organizations, from across the spectrum, filed briefs for Pruitt."],
    forNo: ["The law is narrow: candidates only, 90 days only, realistic fakes only, and a label is a defence.",
            "Election integrity is a weighty interest, and fraud has never been protected speech."]
  },
  {
    id: "h1b", cat: "immigration", short: "H-1B lottery",
    head: "DHS replaced the H-1B lottery with a draw weighted by salary. Startups say that isn’t what Congress wrote.",
    caseName: "Bay Area Founders Coalition v. Department of Homeland Security",
    court: "U.S. District Court, District of Columbia", docket: "No. 1:27-cv-00118-HM",
    who: [["Judge", "Helena Marsh"], ["Plaintiffs", "A coalition of 140 startups and two universities"],
          ["Defendant", "Department of Homeland Security"], ["Stakes", "85,000 visas a year"]],
    facts: [["85,000", "H-1B visas a year"], ["4×", "the chances at the top wage level"], ["Mar 31", "the first weighted selection"]],
    brief: ["Each year 85,000 H-1B visas go to employers chosen by lottery. A new DHS rule weights the draw by wage: an entry at the top pay level gets four chances, one at the lowest gets one. The first weighted selection runs March 31.",
            "Startups and two universities sued in January. The statute says visas go out ‘in the order in which petitions are filed’, which a random draw approximates and a draw weighted by salary does not. DHS says the statute leaves it room to design the selection."],
    forYes: ["Since the Supreme Court ended Chevron deference in 2024, agencies get less room to read a statute their own way.",
             "The plaintiffs asked for a ruling before March 31, and the judge set a fast schedule."],
    forNo: ["Judges often take longer than plaintiffs hope, and this market needs an order by March 30. A later ruling doesn’t count.",
            "Courts can no longer easily block a rule nationwide, so the judge has to decide on a remedy too, and that takes time."]
  },
  {
    id: "corvid", cat: "trade", short: "Lidar secrets",
    head: "An engineer left Corvid with 14,000 files. Six months later, Altair’s self-driving cars had a lidar that looked a lot like Corvid’s.",
    caseName: "Corvid Robotics, Inc. v. Altair Motors Corp.",
    court: "U.S. District Court, Northern District of California", docket: "No. 5:26-cv-02291-RS",
    who: [["Judge", "Renata Solís (jury trial)"], ["Plaintiff", "Corvid Robotics, a self-driving startup"],
          ["Defendant", "Altair Motors, the third-largest U.S. carmaker"], ["Stakes", "Corvid asks the jury for $1.1 billion"]],
    facts: [["14,000", "files downloaded before he quit"], ["6 months", "until Altair’s lidar shipped"], ["$1.1B", "what Corvid asks for"]],
    brief: ["Corvid Robotics says its former head of lidar, Martin Keyes, downloaded 14,000 design files in his last week, then joined Altair Motors, and that Altair’s new self-driving sensor is built on them.",
            "Altair says its engineers designed the sensor on their own, that Keyes never used the files, and that the two designs share only what every lidar shares. Eight jurors in San Jose will decide. The trial opens June 1."],
    forYes: ["Jurors understand ‘took the files on the way out’, and the download log is hard to explain away.",
             "Corvid’s experts point to three unusual design choices that Altair’s sensor shares."],
    forNo: ["A trade-secret plaintiff must prove the secrets were used, not just taken.",
            "Altair has design notebooks that it says predate Keyes’s arrival."]
  }
  ],

  /* ---------------------------------------------------------------------
     The markets. Each question names the court, the ruling and the
     deadline, as the plan requires; the rules say what happens when the
     world is messier than the question.
       fair0   the probability the facts imply on the day it opens
       pop     how much of the crowd's attention it draws
       lean    which side the true believers take, and how many of them
     --------------------------------------------------------------------- */
  markets: [
  {id: "halcyon-vote", c: "halcyon", deadline: "Feb 4",
   q: "Will the Delaware Court of Chancery halt Halcyon Media’s February 4 shareholder vote?",
   short: "Vote halted by Feb 4?", fair0: .30, pop: .95, lean: {side: 1, share: .5},
   rules: ["Yes if, before the February 4 meeting is called to order, the Court of Chancery orders the vote enjoined or postponed.",
           "No if the vote goes ahead on February 4.",
           "No if Halcyon postpones the meeting on its own, without a court order.",
           "Source: the Court of Chancery docket."]},
  {id: "halcyon-deal", c: "halcyon", deadline: "Apr 30",
   q: "Will Halcyon shareholders approve a sale to Apex Partners by April 30?",
   short: "Apex deal approved by Apr 30?", fair0: .62, pop: .8, lean: {side: -1, share: .4},
   rules: ["Yes if, by April 30, Halcyon announces that a majority of its shares voted to approve a merger with Apex Partners, at any price.",
           "No if the vote fails, the agreement is terminated, or no vote has been held by April 30.",
           "Source: Halcyon’s filings with the SEC."]},
  {id: "skyline-block", c: "skyline", deadline: "Apr 30",
   q: "Will a federal judge block the Skyline–Meridian merger by April 30?",
   short: "Merger blocked by Apr 30?", fair0: .48, pop: 1.1, lean: {side: 1, share: .55},
   rules: ["Yes if, by April 30, the District Court for the District of Massachusetts enjoins the merger.",
           "No if the court rules for the airlines, or has not ruled by April 30.",
           "No if the companies abandon the deal before a ruling.",
           "An appeal does not change the result. Source: the court’s docket."]},
  {id: "skyline-abandon", c: "skyline", deadline: "Jun 15",
   q: "Will Skyline and Meridian call off their merger by June 15?",
   short: "Deal called off by Jun 15?", fair0: .55, pop: .9, lean: {side: 1, share: .5},
   rules: ["Yes if, by June 15, either company announces that the merger agreement has been terminated.",
           "No if the agreement is still in force on June 15. A pending appeal counts as in force.",
           "Source: the companies’ filings with the SEC."]},
  {id: "lumen-fairuse", c: "lumen", deadline: "May 31",
   q: "Will Judge Ellery rule that Lumen’s AI training was fair use by May 31?",
   short: "Fair use ruling by May 31?", fair0: .44, pop: 1.3, lean: {side: 1, share: .62},
   rules: ["Yes if, by May 31, the court grants summary judgment holding that Lumen’s use of the books to train its models was fair use, in whole or in part.",
           "No if the court denies it, rules for the authors, or has not ruled by May 31.",
           "No if the case settles or is dismissed before a ruling.",
           "Source: the court’s docket."]},
  {id: "pruitt-scotus", c: "pruitt", deadline: "Jun 30",
   q: "Will the Supreme Court rule for Pruitt and strike down the AI election-ad ban by June 30?",
   short: "Ruling for Pruitt by Jun 30?", fair0: .58, pop: 1.5, lean: {side: 1, share: .64},
   rules: ["Yes if, by June 30, the Supreme Court holds that the Deceptive AI Election Media Act violates the First Amendment, on its face or as applied to Pruitt.",
           "No if the Court upholds the Act, dismisses the case, or has not decided by June 30.",
           "Source: the Court’s published opinion."]},
  {id: "h1b-block", c: "h1b", deadline: "Mar 30",
   q: "Will a federal court block DHS’s salary-weighted H-1B selection by March 30?",
   short: "Rule blocked by Mar 30?", fair0: .32, pop: 1.0, lean: {side: 1, share: .66},
   rules: ["Yes if, by 11:59 p.m. Eastern on March 30, a federal court vacates, stays or enjoins the salary-weighted selection rule, for any party.",
           "No if no such order has been issued by then.",
           "A ruling after March 30 does not count, even one that vacates the rule. The selection is scheduled for March 31.",
           "Source: the court’s docket."]},
  {id: "corvid-verdict", c: "corvid", deadline: "Jun 25",
   q: "Will the jury find Altair Motors liable for taking Corvid’s trade secrets by June 25?",
   short: "Altair liable by Jun 25?", fair0: .55, pop: 1.25, lean: {side: -1, share: .6},
   rules: ["Yes if, by June 25, the jury returns a verdict that Altair misappropriated at least one Corvid trade secret.",
           "No if the jury finds for Altair, the case settles, a mistrial is declared, or there is no verdict by June 25.",
           "The size of any award doesn’t matter: a liability verdict counts.",
           "Source: the verdict form on the court’s docket."]}
  ],

  /* ---------------------------------------------------------------------
     Dates everyone can see coming: the decision calendar. `from` is when
     a date becomes public (from the start, if left out).
     --------------------------------------------------------------------- */
  dates: [
    {at: "Jan 19", m: "skyline-block", label: "Skyline trial opens"},
    {at: "Jan 28", m: "halcyon-vote", label: "Halcyon injunction hearing", from: "Jan 6"},
    {at: "Feb 4",  m: "halcyon-vote", label: "Halcyon shareholder vote"},
    {at: "Feb 11", m: "h1b-block", label: "H-1B hearing", from: "Jan 15"},
    {at: "Mar 1",  m: "skyline-block", label: "Skyline closing arguments", from: "Feb 5"},
    {at: "Mar 16", m: "lumen-fairuse", label: "Lumen fair-use hearing"},
    {at: "Mar 30", m: "h1b-block", label: "H-1B question closes"},
    {at: "Apr 20", m: "pruitt-scotus", label: "Pruitt oral argument"},
    {at: "Apr 27", m: "halcyon-deal", label: "Halcyon vote on Apex", from: "Mar 23"},
    {at: "Apr 30", m: "skyline-block", label: "Skyline question closes"},
    {at: "May 13", m: "pruitt-scotus", label: "Supreme Court opinion day", from: "May 6"},
    {at: "May 31", m: "lumen-fairuse", label: "Lumen question closes"},
    {at: "Jun 1",  m: "pruitt-scotus", label: "Opinion day", from: "May 25"},
    {at: "Jun 8",  m: "pruitt-scotus", label: "Opinion day", from: "Jun 1"},
    {at: "Jun 1",  m: "corvid-verdict", label: "Corvid v. Altair jury trial opens", from: "May 24"},
    {at: "Jun 15", m: "skyline-abandon", label: "Call-off question closes", from: "Apr 15"},
    {at: "Jun 25", m: "corvid-verdict", label: "Verdict question closes", from: "May 24"},
    {at: "Jun 21", m: "pruitt-scotus", label: "Opinion day", from: "Jun 14"},
    {at: "Jun 24", m: "pruitt-scotus", label: "Opinion day", from: "Jun 17"},
    {at: "Jun 30", m: "pruitt-scotus", label: "Supreme Court term ends"}
  ],

  /* ---------------------------------------------------------------------
     What happens, in order.
     --------------------------------------------------------------------- */
  events: [
  /* ---------------- January ---------------- */
  {at: "Jan 6", m: "halcyon-vote", tag: "Scheduling",
   title: "Chancery sets an expedited hearing for January 28",
   body: "Six days before the vote. The court orders Halcyon to hand over the CEO’s messages with Apex by January 20.",
   fair: {"halcyon-vote": .33}},

  {at: "Jan 8", tag: "Newsletter", kind: "platform",
   title: "‘Cases to Watch’ #1 goes to 18,400 readers",
   body: "The Halcyon hearing and the Skyline trial lead the issue. 2,210 readers click through to a market.",
   grow: {ch: "newsletter", traders: 380, visits: 2210, reach: 18400, subs: 40}},

  {at: "Jan 11", m: "pruitt-scotus", tag: "Amicus briefs",
   title: "47 news organizations file briefs for Pruitt",
   body: "From both ends of the spectrum: “A law that can punish a satirist can punish a reporter who shares the wrong clip.”",
   fair: {"pruitt-scotus": .60}},

  {at: "Jan 13", m: "halcyon-vote", tag: "Discovery", major: true,
   title: "The texts: “Get me the chair and I’ll get you the board.”",
   body: "Discovery turns up a November text from CEO Garrett Lyle to Apex’s lead partner, sent while the price was still being negotiated. Apex later offered Lyle the chair of the combined company. The proxy statement doesn’t say so.",
   fair: {"halcyon-vote": .52}, hype: {"halcyon-vote": .08},
   doc: {kind: "text", from: "Garrett Lyle", to: "D. Ferro · Apex Partners", when: "Nov 30, 2026 · 11:42 PM",
         text: "Get me the chair and I’ll get you the board. 38 works if the chair works."},
   changed: "A conflict the proxy left out is the classic reason Delaware delays a vote."},

  {at: "Jan 15", m: "h1b-block", tag: "Filing",
   title: "Startups and universities sue DHS over the weighted H-1B draw",
   body: "“Congress wrote a lottery. DHS wrote an auction.” They ask Judge Helena Marsh to rule before the March 31 selection.",
   fair: {"h1b-block": .34}},

  {at: "Jan 19", m: "skyline-block", tag: "Trial",
   title: "Trial opens: the government maps 61 routes where the airlines compete",
   body: "Opening statements in Boston. There is no jury: Judge Theodore Vance decides alone.",
   fair: {"skyline-block": .50}},

  {at: "Jan 20", m: "halcyon-vote", tag: "Response",
   title: "Apex says the CEO’s role was “never agreed”",
   body: "Apex says the chair was discussed only after the price was set. The timestamps on the texts say otherwise.",
   fair: {"halcyon-vote": .49}},

  {at: "Jan 21", m: "skyline-block", tag: "Evidence", major: true,
   title: "Meridian’s pricing chief, in an email: “Once we combine, the fare floor goes up.”",
   body: "Read into the record on day three. Meridian says the email was about costs, not fares. The judge asks to see the attachment.",
   fair: {"skyline-block": .63}, hype: {"skyline-block": .05},
   doc: {kind: "email", from: "K. Albright, VP Revenue Management, Meridian", to: "Pricing leadership", when: "Mar 9, 2026",
         subject: "RE: synergy model, network overlap",
         text: "Once we combine, the fare floor goes up on the overlap routes. We stop chasing Skyline down to $89 on BOS–ORD."},
   changed: "Internal documents tend to decide merger trials, and this one goes to the heart of the government’s case."},

  {at: "Jan 25", m: "halcyon-vote", tag: "Disclosure",
   title: "Halcyon files extra disclosures about Lyle’s talks with Apex",
   body: "A standard move before a hearing: if shareholders now have the facts, there is less for the court to fix.",
   fair: {"halcyon-vote": .41}},

  {at: "Jan 26", m: "lumen-fairuse", tag: "Motion",
   title: "Lumen moves for summary judgment: “Reading is not copying.”",
   body: "Lumen says its model learns patterns from books the way a writer does, and never hands them back.",
   fair: {"lumen-fairuse": .46}},

  {at: "Jan 28", m: "halcyon-vote", tag: "Hearing", major: true,
   title: "The court: “Stockholders are entitled to know who was negotiating for whom.”",
   body: "Vice Chancellor Calloway calls Halcyon’s extra disclosure “a footnote where a headline belongs” and promises a ruling before the February 4 vote.",
   fair: {"halcyon-vote": .66}, hype: {"halcyon-vote": .04},
   doc: {kind: "transcript", court: "Court of Chancery of the State of Delaware", caption: "In re Halcyon Media, Inc. Stockholder Litigation",
         heading: "Transcript of argument · January 28, 2027",
         text: "THE COURT: Stockholders are entitled to know who was negotiating for whom. A footnote on page 94 is not that."}},

  /* ---------------- February ---------------- */
  {at: "Feb 1", m: "halcyon-vote", tag: "Ruling", major: true, resolve: "yes",
   title: "Vote halted: the court enjoins Halcyon’s February 4 meeting",
   body: "No vote until Halcyon tells shareholders about the CEO’s talks with Apex and the chair offer, and then waits 20 days. The market resolves Yes.",
   doc: {kind: "order", court: "Court of Chancery of the State of Delaware", caption: "In re Halcyon Media, Inc. Stockholder Litigation · C.A. No. 2027-0031-ICC",
         heading: "Order granting preliminary injunction",
         text: "The stockholder vote scheduled for February 4, 2027 is ENJOINED until twenty days after Halcyon discloses the communications described herein."}},

  {at: "Feb 2", m: "halcyon-deal", tag: "New market", list: "halcyon-deal",
   title: "New market: will shareholders approve the Apex deal by April 30?",
   body: "The vote has moved. The question now is whether the deal survives it."},

  {at: "Feb 3", m: "pruitt-scotus", tag: "Brief",
   title: "The government’s brief: “A lie that looks like a recording is not an opinion.”",
   body: "The Solicitor General says the Act reaches only realistic fakes of candidates, in the last 90 days of a race.",
   fair: {"pruitt-scotus": .57}},

  {at: "Feb 5", m: "skyline-block", tag: "Remedy", major: true,
   title: "Skyline offers to hand 44 gates at Newark and Boston to Pelican Air",
   body: "A low-cost airline would take over the overlapping routes, the airlines say, so fares stay low. Remedies like this have saved mergers before.",
   fair: {"skyline-block": .47}, hype: {"skyline-block": -.04},
   doc: {kind: "filing", court: "U.S. District Court · District of Massachusetts", caption: "United States v. Skyline Airways, Inc., et al. · No. 1:26-cv-11873-TV",
         heading: "Defendants’ notice of proposed divestiture",
         text: "Defendants will divest 44 gates and associated slots at EWR and BOS to Pelican Air, Inc., an independent low-cost carrier."}},

  {at: "Feb 11", m: "h1b-block", tag: "Hearing", major: true,
   title: "Judge Marsh to DHS: “Show me where the statute lets you weight the draw.”",
   body: "The statute says visas go out “in the order in which petitions are filed”. DHS says a lottery isn’t an order either, so it may choose how to draw. The judge doesn’t sound persuaded.",
   fair: {"h1b-block": .58}, hype: {"h1b-block": .08},
   doc: {kind: "transcript", court: "U.S. District Court · District of Columbia", caption: "Bay Area Founders Coalition v. DHS · No. 1:27-cv-00118-HM",
         heading: "Motion hearing · February 11, 2027",
         text: "THE COURT: Show me where the statute lets you weight the draw by salary. I see “in the order in which petitions are filed.” I don’t see “wage level.”"}},

  {at: "Feb 15", m: "lumen-fairuse", tag: "Expert report",
   title: "The authors’ expert: Lumen-4 can recite 40 pages of a bestseller word for word",
   body: "Lumen says its filters stop that in the product. The authors say the copy is still in the model.",
   fair: {"lumen-fairuse": .38}},

  {at: "Feb 17", tag: "Creators", kind: "platform", major: true,
   title: "A 60-second explainer on the H-1B case reaches 214,000 people",
   body: "Legal creator Maya Chen (“Courtside”) walks through the hearing with the I, the Jury chart on screen. 3,900 viewers click through, and 1,140 open accounts. Most of them are rooting for the startups.",
   grow: {ch: "creators", traders: 1140, visits: 3900, reach: 214000, subs: 60, lean: {"h1b-block": 1}},
   doc: {kind: "stats", title: "Sponsored explainer · ‘Courtside’", rows: [["Views", "214,000"], ["Clicks to a market", "3,900"], ["New traders", "1,140"], ["Sponsorship", "$2,500"]]}},

  {at: "Feb 18", m: "skyline-block", tag: "Testimony",
   title: "Pelican Air has twelve planes. DOJ: “a promise, not a competitor.”",
   body: "Pelican’s CEO concedes it would have to lease 30 more aircraft to fly the routes.",
   fair: {"skyline-block": .53}},

  {at: "Feb 22", m: "halcyon-deal", tag: "Proxy advisers",
   title: "Glass Ridge Advisory tells clients to vote against Apex at $38",
   body: "“The process was compromised, and the price shows it.” Index funds often follow the big proxy advisers.",
   fair: {"halcyon-deal": .46}},

  {at: "Feb 24", m: "h1b-block", tag: "Order", major: true,
   title: "Judge Marsh orders more briefing. On the remedy.",
   body: "New briefs are due March 10: should she vacate the rule for everyone, or only block it for the plaintiffs? She sounds like she’s leaning their way. It also means more time, and this market needs an order by March 30.",
   fair: {"h1b-block": .50},
   doc: {kind: "order", court: "U.S. District Court · District of Columbia", caption: "Bay Area Founders Coalition v. DHS · No. 1:27-cv-00118-HM",
         heading: "Minute order",
         text: "The parties shall file supplemental briefs addressing the appropriate scope of relief, including vacatur under 5 U.S.C. § 706, no later than March 10, 2027."},
   changed: "The ruling can come out right and still come out late."},

  /* ---------------- March ---------------- */
  {at: "Mar 1", m: "skyline-block", tag: "Closing arguments", major: true,
   title: "Closing arguments: “Tell me how Pelican survives the first fare war.”",
   body: "Judge Vance spends half the airlines’ time on that one question, and says he will rule in April.",
   fair: {"skyline-block": .60}, hype: {"skyline-block": .03},
   doc: {kind: "transcript", court: "U.S. District Court · District of Massachusetts", caption: "United States v. Skyline Airways, Inc., et al.",
         heading: "Closing arguments · March 1, 2027",
         text: "THE COURT: Twelve planes. The merged airline would have 410. Tell me how Pelican survives the first fare war."}},

  {at: "Mar 8", m: "halcyon-deal", tag: "Rival bid", major: true,
   title: "A rival bid: Cobalt Media offers $44 a share for Halcyon",
   body: "Sixteen percent more than Apex. Shareholders are unlikely to take $38 now. Apex can match, raise or walk away.",
   fair: {"halcyon-deal": .27}, hype: {"halcyon-deal": -.06},
   doc: {kind: "filing", court: "Securities and Exchange Commission", caption: "Cobalt Media Group · Schedule 13D",
         heading: "Letter to the Halcyon board",
         text: "Cobalt is prepared to acquire all outstanding shares of Halcyon Media at $44.00 per share in cash, with committed financing."}},

  {at: "Mar 11", tag: "Publishers", kind: "platform",
   title: "The Ledger embeds the Skyline market in its merger-arbitrage column",
   body: "92,000 finance readers see the live chart beside the reporting. 2,800 click through and 610 start trading.",
   grow: {ch: "publishers", traders: 610, visits: 2800, reach: 92000, subs: 90}},

  {at: "Mar 12", m: "h1b-block", tag: "Briefing",
   title: "Remedy briefs are in. Registration closes March 20. No ruling yet.",
   body: "DHS warns that vacating the rule days before the selection would cause “chaos”.",
   fair: {"h1b-block": .38}, over: 22},

  {at: "Mar 16", m: "lumen-fairuse", tag: "Hearing", major: true,
   title: "Judge Ellery: “Training looks transformative to me. The pirated library is a separate problem.”",
   body: "At the summary judgment hearing, the judge suggests he could find training fair use while leaving Lumen exposed over how it got 1.9 million of the books.",
   fair: {"lumen-fairuse": .64}, hype: {"lumen-fairuse": .06},
   doc: {kind: "transcript", court: "U.S. District Court · Northern District of California", caption: "Halloway et al. v. Lumen Labs, Inc. · No. 3:25-cv-04419-ME",
         heading: "Hearing on cross-motions for summary judgment",
         text: "THE COURT: Training looks transformative to me. Downloading a pirate library to do it is a separate problem, and not a small one."}},

  {at: "Mar 18", m: "h1b-block", tag: "Agency notice",
   title: "DHS: the weighted selection runs March 31, as planned",
   body: "Still nothing from Judge Marsh. Twelve days left on this question.",
   fair: {"h1b-block": .22}, over: 22},

  {at: "Mar 23", m: "halcyon-deal", tag: "Deal", major: true,
   title: "Apex raises to $45.50, and Lyle won’t be chair",
   body: "Apex tops Cobalt by $1.50 a share and drops the CEO’s role. The vote is set for April 27.",
   fair: {"halcyon-deal": .70}, hype: {"halcyon-deal": .06},
   doc: {kind: "filing", court: "Securities and Exchange Commission", caption: "Halcyon Media, Inc. · Form 8-K",
         heading: "Amendment No. 1 to Agreement and Plan of Merger",
         text: "The Merger Consideration is increased to $45.50 per share. Mr. Lyle will not serve as a director or officer of the surviving company."}},

  {at: "Mar 25", m: "h1b-block", tag: "Motion",
   title: "The plaintiffs ask for an emergency ruling. The docket is silent.",
   body: "Five days left on this question.",
   fair: {"h1b-block": .07}, over: 18},

  {at: "Mar 31 00:00", m: "h1b-block", tag: "Deadline", major: true, resolve: "no",
   title: "Midnight passes with no order. The market resolves No.",
   body: "The question asked for a court order by March 30. There wasn’t one, and DHS runs the weighted selection this morning. However the judge rules now, it is too late for this question.",
   doc: {kind: "docket", court: "U.S. District Court · District of Columbia", caption: "No. 1:27-cv-00118-HM · docket",
         rows: [["Mar 10", "Supplemental brief, plaintiffs"], ["Mar 10", "Supplemental brief, DHS"], ["Mar 25", "Emergency motion for a ruling"], ["Mar 30", "No entry"]]}},

  /* ---------------- April ---------------- */
  {at: "Apr 1", m: "pruitt-scotus", tag: "Calendar",
   title: "Pruitt will be argued on April 20",
   body: "One of the last arguments of the term. A decision is due by the end of June.",
   fair: {"pruitt-scotus": .57}},

  {at: "Apr 5", m: "halcyon-deal", tag: "Proxy advisers",
   title: "Glass Ridge switches: vote for Apex at $45.50",
   body: "“A fair price, from a cleaner process.”",
   fair: {"halcyon-deal": .80}},

  {at: "Apr 8", m: "h1b-block", tag: "Ruling", major: true,
   title: "Judge Marsh vacates the weighted H-1B rule, eight days late",
   body: "“In the order in which petitions are filed” means what it says, she writes. But the selection already ran on March 31. This market had resolved No, because the question named a date.",
   doc: {kind: "opinion", court: "U.S. District Court · District of Columbia", caption: "Bay Area Founders Coalition v. DHS",
         heading: "Memorandum opinion",
         text: "The statute directs that visas issue “in the order in which petitions are filed.” Whatever that phrase permits, it does not permit a draw weighted by salary. The rule is VACATED."},
   changed: "Right ruling, wrong date: this is why every question names a deadline."},

  {at: "Apr 12", m: "lumen-fairuse", tag: "Reporting",
   title: "Reports: Lumen’s board weighs settling before its IPO",
   body: "A damages trial over the pirated books could run into next year. Under this market’s rules, a settlement resolves it No.",
   fair: {"lumen-fairuse": .45}, hype: {"lumen-fairuse": -.03}},

  {at: "Apr 14", m: "skyline-block", tag: "Ruling", major: true, resolve: "yes",
   title: "Merger blocked: “A divestiture to a twelve-plane airline is a promise, not a remedy.”",
   body: "Judge Vance enjoins the Skyline–Meridian merger, finding it would raise fares on at least 34 routes. The market resolves Yes.",
   doc: {kind: "opinion", court: "U.S. District Court · District of Massachusetts", caption: "United States v. Skyline Airways, Inc., et al.",
         heading: "Findings of fact and conclusions of law",
         text: "A divestiture to a twelve-plane airline is a promise, not a remedy. The proposed merger is PERMANENTLY ENJOINED."}},

  {at: "Apr 15", m: "skyline-abandon", tag: "New market", list: "skyline-abandon",
   title: "New market: will Skyline and Meridian call the deal off by June 15?",
   body: "They can appeal, or Skyline can pay the $400 million breakup fee and walk."},

  {at: "Apr 20 10:00", m: "pruitt-scotus", tag: "Oral argument", major: true, live: true,
   title: "Live from the Supreme Court: Pruitt v. FEC",
   body: "One hour of argument. Every question from the bench moves the price.",
   lines: [
    {dt: 0,  who: "The Court", text: "We’ll hear argument first this morning in Pruitt against the Federal Election Commission. Ms. Obi.", fair: .57},
    {dt: 3,  who: "Adaeze Obi, for Pruitt", text: "Thank you. The Act makes it a crime to post a joke if the joke looks too real. That has never been the law in this country.", fair: .58},
    {dt: 7,  who: "A justice", text: "Your client’s video showed a senator confessing to a bribe he never took, ten days before the election. Is that a joke?", fair: .52, hype: -.03},
    {dt: 11, who: "A justice", text: "You say it was labeled parody in the first frame. And the copy shared four million times, without the first frame?", fair: .47},
    {dt: 15, who: "Another justice", text: "Fraud has never been protected speech. Why isn’t this fraud?", fair: .43, hype: -.04},
    {dt: 19, who: "Adaeze Obi", text: "Fraud needs a victim who relied on the lie and lost something by it. The Act needs nothing but a resemblance.", fair: .45},
    {dt: 23, who: "Lionel Dade, for the government", text: "The Act reaches only depictions a reasonable viewer would take as real, of candidates, in the last 90 days. That is a narrow band.", fair: .45},
    {dt: 26, who: "A justice", text: "Who is the reasonable viewer? A political scientist? My grandson?", note: "Laughter", fair: .51, hype: .03},
    {dt: 30, who: "A justice", text: "A sketch show does the senator, and the makeup is very good. Federal crime?", reply: ["Lionel Dade", "Not if it’s obviously satire."], follow: "Obvious to whom?", fair: .59, hype: .05},
    {dt: 35, who: "A justice", text: "Congress could have required a label. Why ban instead of label?", reply: ["Lionel Dade", "A label can be cropped out."], fair: .62},
    {dt: 39, who: "Adaeze Obi, rebuttal", text: "The answer to a convincing lie has always been the truth, told louder. Not a prosecutor.", fair: .60},
    {dt: 42, who: "The Court", text: "Thank you, counsel. The case is submitted.", end: true}
   ]},

  {at: "Apr 22", m: "pruitt-scotus", tag: "Analysis",
   title: "Court-watchers’ count: four for Pruitt, two for the government, three unclear",
   body: "“Obvious to whom?” is the clip every network ran.",
   fair: {"pruitt-scotus": .55}},

  {at: "Apr 23", m: "skyline-abandon", tag: "Appeal",
   title: "Skyline files a notice of appeal to the First Circuit",
   body: "“We will continue to fight for this merger.”",
   fair: {"skyline-abandon": .38}},

  {at: "Apr 27", m: "halcyon-deal", tag: "Vote", major: true, resolve: "yes",
   title: "Approved: 81% of Halcyon shares vote for Apex at $45.50",
   body: "Three months after the court stopped the first vote, shareholders take a price $7.50 a share higher. The market resolves Yes.",
   doc: {kind: "stats", title: "Special meeting · April 27, 2027", rows: [["For", "81.2%"], ["Against", "18.1%"], ["Abstain", "0.7%"], ["Price", "$45.50, up from $38"]]}},

  /* ---------------- May ---------------- */
  {at: "May 3", m: "lumen-fairuse", tag: "Mediation", major: true,
   title: "Lumen and the authors agree to mediation",
   body: "Both sides will sit down with a retired federal judge this week. Talks like these settle most big cases, and under this market’s rules a settlement resolves it No.",
   fair: {"lumen-fairuse": .24}, hype: {"lumen-fairuse": -.04},
   doc: {kind: "order", court: "U.S. District Court · Northern District of California", caption: "Halloway et al. v. Lumen Labs, Inc.",
         heading: "Stipulation and order referring case to mediation",
         text: "The parties shall participate in mediation before the Hon. Carla Wynn (Ret.) commencing May 4, 2027."}},

  {at: "May 10", m: "skyline-abandon", tag: "Shareholders", major: true,
   title: "Meridian’s biggest shareholder: take the $400 million and walk",
   body: "Harbor Peak Capital, with 14% of Meridian, says an appeal means a year in limbo for an airline that loses money every month.",
   fair: {"skyline-abandon": .63}, hype: {"skyline-abandon": .04},
   doc: {kind: "filing", court: "Securities and Exchange Commission", caption: "Harbor Peak Capital · Schedule 13D/A",
         heading: "Letter to the Meridian board",
         text: "Every month of appeal costs Meridian customers, crews and cash. Collect the $400 million termination fee and end this."}},

  {at: "May 13", m: "pruitt-scotus", tag: "Opinion day",
   title: "Opinion day: three cases decided. Not Pruitt.",
   body: "Six April cases still to come.",
   fair: {"pruitt-scotus": .55}, hype: {"pruitt-scotus": -.02}},

  {at: "May 17", m: "lumen-fairuse", tag: "Settlement", major: true, resolve: "no",
   title: "Settled: Lumen pays $900 million. There will be no ruling.",
   body: "About $470 a book for the class, and Lumen destroys the pirated copies. No court decides whether training was fair use, so the market resolves No.",
   doc: {kind: "filing", court: "U.S. District Court · Northern District of California", caption: "Halloway et al. v. Lumen Labs, Inc.",
         heading: "Notice of proposed class settlement",
         text: "Defendant shall pay $900,000,000 into a settlement fund and destroy all copies of works obtained from shadow libraries."}},

  {at: "May 20", m: "lumen-fairuse", tag: "Market integrity", kind: "integrity", major: true,
   title: "Flagged: a burst of No buying in the two days before the settlement",
   body: "Surveillance traced it to one account belonging to a paralegal at a firm working on the case. The account is frozen, its payout withheld and the trades reported to the exchange. People working on a case can’t trade it.",
   integrity: true},

  {at: "May 24", m: "corvid-verdict", tag: "New market", list: "corvid-verdict",
   title: "New market: Corvid v. Altair goes to a jury on June 1",
   body: "Eight jurors in San Jose will decide whether Altair’s self-driving sensor was built on files an engineer took on his way out."},

  {at: "May 26", tag: "Publishers", kind: "platform", major: true,
   title: "The Daily Courier puts I, the Jury markets in its Supreme Court coverage",
   body: "A national paper embeds live markets beside its reporting, each showing its source, a timestamp and the trading behind it. 1.2 million readers, 21,000 visits, 1,850 new traders.",
   grow: {ch: "publishers", traders: 1850, visits: 21000, reach: 1200000, subs: 150, lean: {"pruitt-scotus": 1}},
   doc: {kind: "stats", title: "Publisher partnership · The Daily Courier", rows: [["Readers", "1.2M"], ["Visits", "21,000"], ["New traders", "1,850"], ["Terms", "Revenue share, no upfront fee"]]}},

  {at: "May 27", m: "skyline-abandon", tag: "Appeal",
   title: "The First Circuit won’t expedite: argument no sooner than October",
   body: "Five more months of limbo, at least.",
   fair: {"skyline-abandon": .80}},

  /* ---------------- June ---------------- */
  {at: "Jun 1", m: "pruitt-scotus", tag: "Opinion day",
   title: "Opinion day: not Pruitt",
   body: "Five April cases still undecided.",
   fair: {"pruitt-scotus": .55}},

  {at: "Jun 2", m: "corvid-verdict", tag: "Trial",
   title: "Trial opens: Corvid shows the jury the download log",
   body: "14,000 files in four days, the last of them at 2:12 a.m. on the night before Keyes resigned.",
   fair: {"corvid-verdict": .58}},

  {at: "Jun 4", m: "skyline-abandon", tag: "Deal", major: true, resolve: "yes",
   title: "Called off: Skyline pays Meridian $400 million and walks away",
   body: "The appeal is withdrawn. The market resolves Yes.",
   doc: {kind: "filing", court: "Securities and Exchange Commission", caption: "Skyline Airways, Inc. · Form 8-K",
         heading: "Termination of a material definitive agreement",
         text: "On June 4, 2027, Skyline and Meridian terminated the Merger Agreement. Skyline will pay Meridian the $400 million termination fee."}},

  {at: "Jun 8", m: "pruitt-scotus", tag: "Opinion day",
   title: "Opinion day: not Pruitt",
   body: "Three April cases left.",
   fair: {"pruitt-scotus": .54}},

  {at: "Jun 7", m: "corvid-verdict", tag: "Testimony", major: true,
   title: "The engineer takes the Fifth. Forty-one times.",
   body: "Asked about the files, Martin Keyes refuses to answer, again and again. The judge tells the jury it may hold his silence against Altair.",
   fair: {"corvid-verdict": .72}, hype: {"corvid-verdict": .06},
   doc: {kind: "transcript", court: "U.S. District Court · Northern District of California", caption: "Corvid Robotics, Inc. v. Altair Motors Corp. · No. 5:26-cv-02291-RS",
         heading: "Trial transcript · Day 5",
         text: "Q. Did you bring Corvid’s lidar files to Altair? A. On the advice of counsel, I decline to answer, under the Fifth Amendment."}},

  {at: "Jun 9", m: "corvid-verdict", tag: "Defence",
   title: "Altair shows the jury design notebooks dated before Keyes arrived",
   body: "Corvid’s lawyers point out that two of the notebooks were scanned the week he started.",
   fair: {"corvid-verdict": .66}},

  {at: "Jun 11", m: "pruitt-scotus", tag: "Analysis", major: true,
   title: "Assignment math points to an author who has upheld election laws before",
   body: "Majority opinions are spread evenly across each sitting. With three April cases left and three justices yet to write one, court-watchers think Pruitt’s author is the one who has twice voted to uphold election rules. It’s a hint, not a fact.",
   fair: {"pruitt-scotus": .48}, hype: {"pruitt-scotus": -.09},
   doc: {kind: "stats", title: "The April sitting", rows: [["Cases argued", "9"], ["Decided", "6"], ["Justices yet to write", "3"], ["Pruitt", "undecided"]]}},

  {at: "Jun 15", m: "corvid-verdict", tag: "Trial", major: true,
   title: "Closing arguments are done. The jury is out.",
   body: "Nine days of testimony, 212 exhibits and one engineer who wouldn’t talk. A verdict could come in hours or in days, and the market is trading on nerves.",
   fair: {"corvid-verdict": .67},
   doc: {kind: "stats", title: "Corvid v. Altair · the trial", rows: [["Days of testimony", "9"], ["Exhibits", "212"], ["Witnesses", "23"], ["Jurors", "8, verdict must be unanimous"]]}},

  {at: "Jun 16", m: "corvid-verdict", tag: "Jury note",
   title: "A note from the jury: “Can we see Altair’s design notebooks again?”",
   body: "Jury-watchers read a request for the defence’s evidence as trouble for Corvid, and the price drops. Notes like this are often misread.",
   fair: {"corvid-verdict": .64}, hype: {"corvid-verdict": -.09}},

  {at: "Jun 18", m: "corvid-verdict", tag: "Verdict", major: true, resolve: "yes",
   title: "Verdict: Altair liable. $412 million.",
   body: "The jury finds Altair misappropriated two of Corvid’s trade secrets and awards $412 million. The market resolves Yes.",
   doc: {kind: "verdict", court: "U.S. District Court · Northern District of California", caption: "Corvid Robotics, Inc. v. Altair Motors Corp.",
         heading: "Verdict form",
         rows: [["Did Altair misappropriate Trade Secret No. 3?", "YES"], ["Did Altair misappropriate Trade Secret No. 7?", "YES"], ["Did Altair misappropriate Trade Secret No. 9?", "NO"], ["Damages", "$412,000,000"]]}},

  {at: "Jun 21", m: "pruitt-scotus", tag: "Opinion day",
   title: "Opinion day: four cases, not Pruitt. Three days left in the term.",
   body: "Pruitt is now the last case of the April sitting.",
   fair: {"pruitt-scotus": .47}},

  {at: "Jun 24", m: "pruitt-scotus", tag: "Decision", major: true, resolve: "yes",
   title: "6–3 for Pruitt: the Court strikes down the AI election-ad ban",
   body: "“The First Amendment does not make the government the judge of which parody is too convincing.” The assignment math was wrong, and the crowd that sold on it paid. The market resolves Yes.",
   doc: {kind: "opinion", court: "Supreme Court of the United States", caption: "Pruitt v. Federal Election Commission · No. 26-412",
         heading: "Opinion of the Court",
         text: "The First Amendment does not make the government the judge of which parody is too convincing. The judgment of the Court of Appeals is REVERSED."}},

  {at: "Jun 28", tag: "Newsletter", kind: "platform",
   title: "‘Cases to Watch’ ends the term with 52,000 subscribers",
   body: "Next term’s markets open the week the Court returns."}
  ],

  /* ---------------------------------------------------------------------
     Sourced forecasts, published by members with a public record. Each
     discloses the author's position at the moment it is posted, read
     from the market itself.
     --------------------------------------------------------------------- */
  forecasts: [
    {at: "Jan 14", m: "halcyon-vote", who: "dana", p: 58,
     text: "Del Monte is the template: a conflicted negotiator, a proxy that didn’t say so, and a vote days away. Expect a short delay, not a dead deal."},
    {at: "Feb 6", m: "skyline-block", who: "priya", p: 56,
     text: "A divestiture to a twelve-plane airline rarely impresses a judge. The gates offer buys time, not a win."},
    {at: "Feb 25", m: "h1b-block", who: "theo", p: 30,
     text: "When a judge asks for more briefing a month before the deadline, the clock becomes the case. She can be right and still be late."},
    {at: "Mar 17", m: "lumen-fairuse", who: "dana", p: 55,
     text: "He told us how he’d rule. Whether he gets to is another matter: Lumen has every reason to settle the piracy claim first."},
    {at: "Apr 13", m: "lumen-fairuse", who: "priya", p: 33,
     text: "Read the rules: a settlement resolves this No. Lumen wants an IPO this fall, and nobody goes public with a damages trial pending."},
    {at: "Apr 21", m: "pruitt-scotus", who: "dana", p: 60,
     text: "“Obvious to whom?” is the line the opinion will quote. Argument reads are noisy, but that exchange wasn’t."},
    {at: "May 11", m: "skyline-abandon", who: "priya", p: 74,
     text: "Breakup-fee math: Meridian gets $400 million to walk, and an appeal costs it a year in limbo."},
    {at: "Jun 8", m: "corvid-verdict", who: "theo", p: 76,
     text: "Juries forgive a lot. They don’t forgive 41 Fifths. Damages are another question; liability isn’t."},
    {at: "Jun 12", m: "pruitt-scotus", who: "theo", p: 55,
     text: "Assignment math is a hint, not a fact. Three justices haven’t written from April, not one, and the argument went Pruitt’s way."}
  ],

  /* The account the integrity team catches. It buys No in the two days
     before the settlement is announced. */
  insider: {m: "lumen-fairuse", from: "May 14 09:00", to: "May 16 18:00", dir: "no", contracts: 34000, worst: 84,
            name: "Account 48213", bank: 32000},

  /* ---------------------------------------------------------------------
     The crowd. Thousands of simulated traders, each one a strategy.
     None of them knows how anything ends; the court-watchers read the
     facts well, the rest less so. Their share of the first 3,600.
     --------------------------------------------------------------------- */
  population: {start: 3600, organicPerDay: 9},
  channels: {
    launch:     "Before the term",
    organic:    "Search and word of mouth",
    newsletter: "‘Cases to Watch’ newsletter",
    creators:   "Creators",
    publishers: "Publisher embeds",
    referrals:  "Referrals"
  },

  /* Named traders on the leaderboard. They trade by the same rules as
     everyone else; the three forecasters also trade on what they publish. */
  personas: [
    {id: "dana",   name: "Dana Whitlock",  type: "pro",    city: "Washington",    bank: 12000, role: "The court-watcher",
     bio: "Former appellate clerk. Reads every filing before she trades.", record: "Brier 0.11 over 214 questions"},
    {id: "priya",  name: "Priya Raman",    type: "pro",    city: "Chicago",       bank: 15000, role: "The forecaster",
     bio: "Top 1% forecaster on I, the Jury. Publishes every call.", record: "Brier 0.09 over 341 questions"},
    {id: "theo",   name: "Theo Lindqvist", type: "pro",    city: "Minneapolis",   bank: 8000,  role: "The calendar reader",
     bio: "Litigation analyst. Trades the docket as much as the merits.", record: "Brier 0.12 over 158 questions"},
    {id: "marcus", name: "Marcus Bell",    type: "mom",    city: "Atlanta",       bank: 6000,  role: "The momentum trader",
     bio: "If it’s moving, he’s in."},
    {id: "jake",   name: "Jake Moreno",    type: "news",   city: "Phoenix",       bank: 4000,  role: "The headline trader",
     bio: "Trades the headline the minute it breaks."},
    {id: "sam",    name: "Sam Achebe",     type: "contra", city: "Houston",       bank: 7000,  role: "The contrarian",
     bio: "When the crowd screams, he sells."},
    {id: "lily",   name: "Lily Chen",      type: "fan",    city: "San Francisco", bank: 2500,  role: "The true believer",
     bio: "Free speech and immigration. Backs her side.", favs: {"pruitt-scotus": 1, "h1b-block": 1}},
    {id: "victor", name: "Victor Hale",    type: "whale",  city: "Dallas",        bank: 120000, role: "The whale",
     bio: "Big tickets, few trades."}
  ],

  /* Independent firms quoting both sides of every market. New markets
     open with two of them; the rest join over the first minutes. */
  makers: ["Northline Liquidity", "Cobble Hill Markets", "Tidewater Quant", "Ardent Capital", "Six Rivers Trading", "Beacon Street Markets"]
};

if(typeof module !== "undefined") module.exports = SCENARIO;
