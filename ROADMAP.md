# Bullpen product roadmap

*Fall 2026 · owner: Mike Costarella (Product Owner) · team: CSCI 5802 Scrum team*
*Last revised 2026-09-29 against v0.7.0 on `main`.*

Bullpen is a phone-first paper-trading PWA on Alpaca. The long game, in
one sentence: **learn to trade on pretend money with the same app you would
trust with real money** — first by hand, then with automated strategies
that go through the same risk guard and journal as every manual order.

This file is the *product* roadmap: what we intend to build, roughly when,
and why. The *sprint* backlog lives on the GitHub Project board
(<https://github.com/orgs/MyWebSiteParticipants/projects/1>). Every item
below is meant to become one or more issues there; the board is the source
of truth for status, this file is the source of truth for direction.

## Where we are (v0.7, September 2026)

Built and live at <https://mywebsiteparticipants.github.io/Bullpen/>:

| Area | Shipped |
| --- | --- |
| Trade | Manual ticket (market / limit / stop / stop-limit, day / GTC) → `OrderIntent` → risk guard → journal → `AlpacaAdapter`. One pipeline, unit-tested guard, source attribution in `client_order_id`. |
| Watch | Watchlist with live quotes, ticker/company type-ahead validated against the Alpaca asset master (IndexedDB cache). |
| Chart | Candles + volume, 5Min / 15Min / 1Hour / 1Day. |
| Symbol | Detail panel: identity, today's stats, 52-week range, performance windows, news, optional Finnhub fundamentals. |
| Discover | Movers, most active, curated groups (index ETFs, sectors, Mag 7, Dow 30, bonds/gold), **By location** from SEC filings, company search, junk filter. |
| Account / Journal | Positions, orders, cash; journal of every intent (sent / blocked / refused) with CSV export. |
| Shell | Hamburger accordion menu, build stamp, Settings (bring-your-own paper keys), in-app Help drawer, beta pill. |
| Platform | GitHub Pages deploy, Cloudflare Worker relay (paper-only, origin allow-list), CI, monthly HQ-data refresh, nightly site-health watchdog. |

Not built yet — and the reason this roadmap exists: the `strategies` box in
the README diagram is empty. There is no strategy interface, no backtester,
no runner, no alerts, no in-app risk settings, no trade analytics, and the
repo still has a single `main` branch.

## Calendar

Two-week sprints, Monday to Friday. Each sprint ends with a
`release/sprint-N` branch cut from `dev`, QA on the staged build, merge to
`main` tagged `v0.N`, merge back to `dev` (see the GitFlow lecture in
GitHub Scrum Intro).

| Sprint | Dates | Release | Theme |
| --- | --- | --- | --- |
| 0 | Tue Sep 29 – Fri Oct 2 | — | Team setup: `dev` branch, board hygiene, templates, first bug |
| 1 | Mon Oct 5 – Fri Oct 16 | v0.8 | Trader control: risk limits in-app, order management, watchlists |
| 2 | Mon Oct 19 – Fri Oct 30 | v0.9 | Know thyself: journal analytics, P&L, equity curve |
| 3 | Mon Nov 2 – Fri Nov 13 | v0.10 | Strategy engine: strategy interface + backtester |
| 4 | Mon Nov 16 – Fri Nov 27 | v0.11 | Backtest reports, Discover by industry & peers *(Thanksgiving week — plan light)* |
| 5 | Mon Nov 30 – Fri Dec 11 | v0.12 | Automation: paper strategy runner, alerts, semester demo |
| — | Spring 2027 | v1.0 | Real-money readiness gate |

Velocity assumption: six people, part-time, so roughly six to eight
issue-sized items per sprint plus a stretch item or two. Anything that
doesn't fit rolls forward at Sprint Planning; it does not get squeezed in.

## Epics

Each epic is a GitHub issue labelled `epic`; its tasks are sub-issues.
Labels: `epic`, `feature`, `bug`, `chore`, `docs`, `test`, and one `area:*`
label (`area:trade`, `area:watch`, `area:discover`, `area:journal`,
`area:strategy`, `area:platform`, `area:shell`).

### Epic A — Team foundation (Sprint 0)

*Why:* the class cannot practise GitFlow on a repo with only `main`, and
the board only works if issues arrive with labels and templates.

- Create `dev` from `main`; make `dev` the default branch; protect `main`
  and `dev` (PR required, CI green, one approval).
- Issue templates (`bug`, `feature`, `task`) and a PR template with the
  Definition of Done checklist and the "Closes #" line.
- Label set created; `CONTRIBUTING.md` with the ten-step fork → PR → merge
  workflow and the release-branch flow.
- Project board: Iteration field set to Sprint 1 start (Oct 5, 2 weeks);
  Roadmap view's *Date fields* set to Iteration so cards draw as bars.
- Fix **Site health: 1 check(s) failing #1** (relay CORS preflight for the
  Pages origin) — the team's first bug, first PR, first merge.
- Bump `react-app/package.json` version to match `CHANGES.md` (0.7.0) and
  agree that the release branch bumps it each sprint.

### Epic B — Trader control (Sprint 1 → v0.8)

*Why:* the risk guard is the app's spine, but its limits are hard-coded in
`src/config/risk.ts`. A learner should set limits "while calm" in the app,
and should be able to manage the orders they placed.

- **Risk limits in Settings**: edit every `RiskLimits` field, stored per
  device, with the config file as the defaults; guard reads the stored
  values; tests cover the merge.
- **Order preview**: the ticket shows notional, est. position after fill,
  and which guard rules were checked *before* submit.
- **Cancel / replace** open orders from the Account screen
  (`cancelOrder()` exists; replace is new on `BrokerAdapter`).
- **Multiple watchlists** (Alpaca watchlists or local named lists) with a
  switcher on the Watch tab.
- **Recent searches** in the symbol type-ahead.
- Stretch: bracket orders (take-profit + stop-loss legs) through the
  pipeline, with guard rules for the legs.

### Epic C — Know thyself: journal & analytics (Sprint 2 → v0.9)

*Why:* a paper account only teaches if you can see what you did. Today the
journal is a list; it needs to become a mirror.

- **Realized P&L per closed trade** (FIFO match of fills from
  `getOrders({status:"closed"})`), win rate, average win / loss, largest
  loss — pure functions with tests.
- **Equity curve** from Alpaca `portfolio/history` on the Account tab,
  with the daily-loss limit drawn on it.
- **Journal tags and post-trade review**: tag entries (setup, mistake,
  emotion), add a review note after close; filter the journal by tag.
- **Journal export v2**: CSV includes fills, P&L and tags; JSON export for
  backup / restore of journal + settings.
- Stretch: weekly summary card ("this week: 7 trades, 4 wins, −$120").

### Epic D — Strategy engine (Sprint 3 → v0.10, Sprint 4 → v0.11)

*Why:* this is the other half of the product. It is deliberately built as
pure code first (backtests are just tests over history) and only then wired
to the pipeline, so no strategy can ever reach the broker by a side door.

Sprint 3:

- **Strategy interface** in `src/sources/strategies/`: `onBar(bar,
  state) → OrderIntent[] | null`, declared params, symbol universe.
- **Bar feed**: historical bars via `getBars()` shaped for strategies;
  daily and intraday.
- **Reference strategy: SMA crossover** (the README already reserves the
  `sma-cross-` attribution prefix). Second reference: simple breakout.
- **Backtester core**: runs a strategy over a bar series with a simulated
  account (cash, positions, commission = 0, slippage param), through the
  *same* risk guard; returns trades and an equity series. Pure, tested.

Sprint 4:

- **Backtest screen** (new tab or under Tools): pick strategy, symbol(s),
  params, date range → equity curve, drawdown, trade list, summary stats
  (CAGR, max DD, win rate, profit factor).
- **Compare** two parameter sets side by side.
- **Discover by industry** (SIC codes are already in `hq.json`) and
  **Finnhub peers** on the detail panel — universe pickers for strategies
  as much as browsing features.
- Stretch: walk-forward split (in-sample / out-of-sample) in the report.

### Epic E — Automation (Sprint 5 → v0.12)

*Why:* strategies that only run in backtests are homework. Running one on
paper, live, is where the risk guard and attribution earn their keep.

- **Paper strategy runner** (in-browser while the app is open): schedule a
  strategy on a bar interval, submit through `pipeline.submit()`, show
  its orders on Account with the strategy's attribution, start / stop /
  kill switch, and the guard's "blocked" entries in the journal.
- **Strategy positions are its own**: a strategy can only sell what it
  bought (attribution check in the pipeline).
- **Price alerts**: above / below / % move on a symbol, in-app and (PWA
  push where the platform allows) notifications.
- **Semester demo build**: `v0.12` tagged, Help updated for every new
  screen, BETA.md refreshed, release notes in `CHANGES.md`.
- Stretch: a server-side runner (Cloudflare Worker cron + Durable Object,
  or a small Node service) so strategies run when no browser is open —
  design spike only this semester.

### Epic F — Platform & quality (continuous, one or two items per sprint)

- Playwright smoke test of the hosted build (load, paste fake keys, see
  the 401 guidance) run in CI.
- Error reporting: a "copy diagnostics" button that gathers build stamp,
  last API errors and settings (keys masked) for bug reports.
- Accessibility pass: focus order, labels, contrast on `tokens.css`.
- Backend for `/api/*` beyond the relay — only when a feature needs state
  the browser can't hold (the server-side runner above is the first).
- Keep `build:hq` and site-health green; rotate the sticky issue.

### v1.0 — Real-money readiness gate (Spring 2027)

Not scheduled into a sprint; a checklist the product must pass before the
`VITE_API_BASE` relay is ever allowed to point at a live account.

- Live mode is a separate, explicit switch with a typed confirmation, a red
  banner on every screen, and its own key store.
- Risk limits have live-mode ceilings that cannot be raised in-app.
- Automated strategies are disabled in live mode until they have run N
  sessions on paper without a guard block.
- Audit log of every settings change and every order, exportable.
- Disclaimer and "this is not financial advice" text reviewed; Alpaca
  live-account terms read and the relay's paper-only hard-wiring
  re-evaluated (it may stay paper-only forever and live go direct).

## Ideas parked (not scheduled)

Options chains · crypto (Alpaca supports it; different risk rules) ·
social / shared watchlists · dark-pool or level-2 data · desktop layout ·
multiple brokers behind `BrokerAdapter` · earnings calendar screen ·
screener with fundamental filters · trade replay (bar-by-bar) for practice.

## Explicitly not doing

- No real-money trading during the course. The relay stays paper-only.
- No server that stores anyone's keys. Keys stay in the browser.
- No paid data feeds. Alpaca free tier + Finnhub free tier only.
- No feature that bypasses `orderPipeline.ts` — if it needs to place an
  order it goes through the guard, or it doesn't ship.

## How this file is maintained

The Product Owner revises it at Sprint Review. Items that shipped move to
the "Where we are" table; items that slipped move to the next sprint or
back to *Ideas parked*. Changes come in through a PR like any other file,
so the history of the roadmap is the git history.
