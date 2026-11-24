# I, the Jury

Prediction markets on court cases. This repository holds two things, both
static, with no build step and no backend:

| Where | What |
| --- | --- |
| `/` | **The platform.** A working demo of the exchange itself, laid out like Kalshi on a white theme: markets on rulings, verdicts and settlements, live prices, a trade ticket, a portfolio, a leaderboard and a social feed |
| `/sim/` | **I, the Jury Live.** The ten-minute investor simulation: six months of court decisions on a clock, against thousands of simulated traders |

Serve the folder (or deploy it to Vercel as it is) and open it:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/` for the platform and
`http://localhost:8000/sim/` for the simulation. Each links to the other.

Everything is fictional: the cases, the parties, the judges, the companies,
the outlets, the traders and every number. The legal mechanics are real
ones. No real judge or justice is named or quoted.

# The platform

## Files

| File | What it is |
| --- | --- |
| `index.html` | Page shell. Also sends old simulation links (`/?jump=300`, `/#m=...`) on to `sim/` |
| `app/data.js` | Every market, category, news item, trader and post. Nothing else holds any content |
| `app/app.js` | The app: routes, pages, live prices, charts, carousels, the trade ticket, the account |
| `app/app.css` | Every style, desktop to phone. White theme only |
| `app/img/` | 53 photos, all public domain or CC0, cropped to 320px squares (about 1.2 MB in all). Credits in `app/img/CREDITS.md` |

## Pages

| Route | Page |
| --- | --- |
| `#/` | Home: category bar, topic chips, a featured carousel with live charts, trending and top movers, horizontal rails (Trending, Live now, Supreme Court, Closing soon, New), the simulation banner, a market grid, the leaderboard, breaking news and Ideas |
| `#/m/<id>` | A market: chart (1D, 1W, 1M, All) with trades ticking past, outcomes, order book, rules, timeline, the case, live updates, news, posts, related markets, and the trade ticket |
| `#/c/<category>` | A category: side navigation, filter chips, market list, and the trade ticket beside it |
| `#/all`, `#/new` | Every market as a grid, filterable by category |
| `#/live` | Trials and hearings happening now, with a live trade feed |
| `#/ideas` | Posts from traders, with their positions |
| `#/leaderboard` | Profit, volume and predictions; or the Activity feed |
| `#/portfolio` | Your value, cash, positions (with Sell), history and watchlist |
| `#/u/<name>` | A trader's profile |
| `#/how` | How it works, and questions |

On a phone the header folds into a search icon, a tab bar runs along the
bottom, and Yes and No open the trade ticket as a sheet.

## How the demo behaves

- **Prices move.** Every second and a half a few markets take a small random
  step, more often for trials in progress, and drift back toward where they
  started. Numbers flash green or red as they change; charts redraw, and
  trades float up the left edge of the market chart.
- **Trading works.** Sign up (any email, or either button) for $1,000 in
  practice credits. A buy walks a small order book, so a big order pays a
  little more per contract, and takers pay a 1% fee, as in the simulation.
  Positions are marked at the current chance. Sell from the ticket or the
  portfolio. Deposit adds credits.
- **It remembers you.** Your account, positions, history, watchlist, likes
  and posts live in this browser's `localStorage` (`itj_app_v1`). The account
  menu has Reset demo and Log out. Nothing is sent anywhere.
- **Dates never go stale.** Close dates, listing dates, news and posts are
  stored relative to the moment the page opens.

Keyboard: `/` searches, arrow keys move through search results, Esc closes
whatever is open.

## Editing markets

Everything is in `app/data.js`. A market has an `id`, a category (`cat`), a
`title`, an image key (`img`, a file in `app/img/`), a volume, `close` (days
from now, or `"fri"`), `listed` (days ago), `rules` (with `{close}` for the
date), and one of:

| `kind` | Holds |
| --- | --- |
| `binary` | `p`: the chance of Yes, in % |
| `multi` | `outcomes: [{n, p}]`, with `exclusive: true` when exactly one can happen |
| `vs` | `sides: [{n, code, color, p}]`: a case between two parties, shown as two buttons in their colours |

Optional: `live` (a status line such as `"Day 9 · Jury deliberating"`),
`updates` (`[[minutes ago, text]]`), `news`, `case` (`{name, court, docket}`),
`about`, `repeat`, and `tags: ["trending" | "new"]`. The home carousel is
`ITJ.hero`, a list of market ids.

## Where the layout comes from

The layout follows Kalshi's web app as published in 2025 and 2026 reviews and
screenshots: the header with search and Log in / Sign up, the category bar
and topic chips, the featured carousel with its chart and previous / next
titles, the cards with Yes and No and "$100 → $238", two-team buttons for
head-to-head events, the market page with the trade ticket on the right,
rules and timeline, the order book, the leaderboard's three columns, and the
breaking-news list. The brand, the words, the code and every image are this
project's own; no Kalshi asset is used.

# The simulation

A ten-minute simulation of I, the Jury for putting in front of investors.
Six months of court decisions play out on a clock: filings, hearings, a live
Supreme Court argument, a jury verdict, a settlement, a deadline that passes.
The investor gets $1,000 in practice credits and trades against about 3,600
simulated traders, a number that passes 9,000 by June as distribution brings
more in. It lives in `sim/`; open `/sim/`.

## Files

| File | What it is |
| --- | --- |
| `sim/index.html` | Page shell |
| `sim/scenario.js` | The story: five cases, eight markets, every event and when it happens, the forecasts, the named traders. Nothing else holds any story |
| `sim/engine.js` | The exchange and everyone trading on it: order books, thousands of simulated traders, resolution, the business numbers. No DOM, so it also runs in Node |
| `sim/sim.js` | The clock, the screens and the person playing |
| `sim/sim.css` | Every style: phone, tablet and laptop, light and dark |
| `tools/check.js` | Runs the whole term headless and prints a report. Not shipped |

## What happens in ten minutes

The calendar runs January 4 to June 30, 2027, about three seconds a day.

| When | What |
| --- | --- |
| 0:00 | Six markets open. The investor can trade before starting the clock |
| 0:30 | Halcyon: the CEO's texts to the buyer surface in discovery |
| 1:29 | Halcyon's vote is halted. The first market resolves Yes and pays out, and a follow-up market lists |
| 2:20 | A creator's explainer brings 1,140 new traders, most of them rooting for one side of the H-1B case |
| 2:41–4:30 | H-1B: the judge asks for more briefing, and the deadline closes in with no ruling. The price decays toward zero |
| 4:30 | H-1B resolves No at midnight. At 4:56 the judge vacates the rule: the right ruling on the wrong date |
| 5:15 | The airline merger is blocked. A new market lists: will the deal be called off? |
| 5:34–6:16 | **Live oral argument at the Supreme Court.** Twelve exchanges from the bench, one every few seconds, each moving the price. The clock runs at 1× through it |
| 7:40 | Lumen settles for $900 million before any ruling. Under the market's rules, a settlement resolves it No |
| 7:50 | Surveillance flags an account that bought 34,000 No in the two days before the settlement. Frozen, payout withheld |
| 8:02–8:09 | A jury-trial market lists, and a national paper embeds the markets in its Supreme Court coverage: 1,850 new traders |
| 8:46–9:21 | The jury trial: an engineer takes the Fifth 41 times, the jury goes out, a jury note spooks the market, the verdict comes in |
| 9:40 | The Supreme Court decides Pruitt 6–3, after the crowd sold on "assignment math" |
| 10:00 | Results |

## The market

Each market is a real order book in whole cents, Kalshi style. A Yes contract
pays $1 if the question resolves Yes; a No contract pays $1 if it resolves No.
A Yes bid at 62¢ and a No bid at 38¢ make one trade, so the book is kept in Yes
prices and buying No at 38¢ is selling Yes at 62¢. Each new contract costs its
price; each one closed returns its price; a new Yes and a new No together are
exactly the dollar that pays out. Money is conserved to the cent, which
`tools/check.js` checks.

The chance shown is the midpoint while the spread is 10¢ or less, otherwise the
last trade (as Polymarket does). Takers pay a 1% fee; I, the Jury keeps half,
the plan's 0.5% of value traded.

Prices are not scripted. The scenario says only what the facts imply at each
moment (its `fair` values) and how hard the crowd overreacts (`hype`). The price
comes from the traders:

| Who | How they trade |
| --- | --- |
| Court-watchers | On what the facts imply, a second or two late |
| Headline traders | On the news, late, and too far |
| Momentum traders | Buy what is rising, sell what is falling |
| Contrarians | Fade big moves |
| True believers | One side of a case they care about, whatever happens |
| Casual traders | Small bets on a hunch, a little too fond of long shots |
| Whales | Big tickets, rarely |
| Market makers | Six firms quoting both sides, leaning against their inventory, widening when the market is busy and stepping back for a moment when news breaks. New markets open with two of them, so a fresh market starts thin |

None of them knows how a case ends. Each new arrival is a trader with a
bankroll, a city and a strategy; most of them trade a few times and drift
away. Channels (the newsletter, a creator, publisher embeds, search, and the
investor's own shares) bring in people with different mixes of strategies.

The investor's orders go into the same books. A market order walks the book and
shows its average price and slippage first; a limit order rests until someone
trades with it. The leaderboard ranks everyone who started with at least $250
and made three trades, by return.

## Verdicts

Every market has a free verdict: the investor's own probability, scored by
Brier score from the moment it is cast until the question resolves, against the
market's price over the same seconds. Verdicts never touch the market. Three
named members publish sourced forecasts with their record and their position,
read from the book at the moment they post.

## The business tab

Live numbers from what the simulated traders do in the run: registered and
weekly-active traders, trades, value traded, fees kept, Pro subscribers at $20
a month, revenue by month, growth by channel with the cost per trader where a
channel was paid for, retention in weeks 3 and 4 against the plan's 30% bar,
break-even against the plan's hypothetical $30,000 a month, liquidity by market,
a map of where trades come from, and market-integrity alerts.

## Presenting

The bar across the top has play, the date, the time left, a timeline of
everything so far (click a mark to see that moment again), the speed, skip, the
investor's total and settings.

| Key | Does |
| --- | --- |
| Space | Play or pause |
| N or → | Skip to the next big moment |
| 1, 2, 4 | Run at 1×, 2× or 4×. 0 is half speed |
| M, P, B, S | Markets, portfolio, business, standings |
| Y, X | Buy Yes or No on the market being viewed |
| Esc | Close whatever is open |

Settings choose the run length (20, 10, 5 or 2½ minutes), whether the clock
stops for each big moment until Continue is pressed (off by default), and
whether the live argument runs at 1× (on by default).

| URL flag | Does |
| --- | --- |
| `?reset` | Start over from nothing |
| `?speed=2` | Start at a speed |
| `?jump=300` | Start paused at that second, everything before it already played |
| `?autoplay` | Start the clock as the page opens |
| `#m=pruitt-scotus` | Open on a market |

The run lives in that browser as a list of actions, each stamped with the step
it happened on. The engine is deterministic, so a reload replays the list and
carries on where it was, paused. Nothing is sent anywhere.

## Editing the story

Everything is in `sim/scenario.js`. An event has a date (`at: "Mar 16"` or
`"Apr 20 10:00"`), the market it is about, a tag, a title and body, and
optionally new `fair` values (with `over` to glide there instead of jumping),
`hype`, a document to show (`doc`), `resolve: "yes" | "no"`, a market to `list`,
or traders to `grow` through a channel. `major: true` makes it a breaking card.

After a change, run the term headless:

```
node tools/check.js
```

It checks that money is conserved, that no account goes negative and that a
replay rebuilds the same market, then prints how each market traded, how each
kind of trader did, the business numbers, and how a few simple player
strategies would have finished.

## Not in this

No accounts, no payments, no real cases, nothing saved anywhere but the
browser. Every trader except the person playing is simulated.
