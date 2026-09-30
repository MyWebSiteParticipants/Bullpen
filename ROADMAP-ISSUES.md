# Roadmap issues — ready to create

Companion to `ROADMAP.md`. One block per issue on
**MyWebSiteParticipants/Bullpen**: copy the title into the title box, the
body into the description, then add the labels and set the Iteration field
on the board. Create the six epics first (they get low numbers), then the
tasks, and add each task as a **sub-issue** of its epic (epic issue →
*Create sub-issue* → *Add existing issue*). The *Auto-add to project*
workflow puts every new issue in **Backlog**; at Sprint Planning the team
drags the sprint's items to **Sprint**.

Status on 2026-09-29: epics A, B, C exist as #2, #3, #4; the `epic` label
exists. Until the `chore`, `test` and `area:*` labels are created (a
Sprint 0 task), use the repo's existing `enhancement` for `feature` and
`documentation` for `docs`, and name the area in the issue body.

Acceptance criteria are written as the Definition of Done for that item;
every task also implies: PR into `dev`, CI green, one review, `CHANGES.md`
entry, Help text updated if a screen changed.

Delete this file once the issues exist — the board owns them from then on.

---

## Epics

### Epic A: Team foundation
labels: `epic`, `area:platform` · iteration: Sprint 0

Get the repo and board into the shape the course teaches: `dev` as the
integration branch, protected `main`, templates and labels, first bug fixed
through the full fork → PR → merge flow. See ROADMAP.md § Epic A.

### Epic B: Trader control
labels: `epic`, `area:trade` · iteration: Sprint 1

Make the risk guard's limits editable in-app, show traders what the guard
will check before they submit, and let them manage open orders and several
watchlists. Release v0.8. See ROADMAP.md § Epic B.

### Epic C: Journal & analytics
labels: `epic`, `area:journal` · iteration: Sprint 2

Turn the journal from a list into a mirror: realized P&L, win rate, equity
curve, tags and post-trade review notes. Release v0.9. See ROADMAP.md § Epic C.

### Epic D: Strategy engine & backtester
labels: `epic`, `area:strategy` · iteration: Sprint 3 (continues Sprint 4)

Strategy interface, bar feed, two reference strategies, a pure backtester
that runs through the real risk guard, and a backtest report screen.
Releases v0.10 and v0.11. See ROADMAP.md § Epic D.

### Epic E: Automation
labels: `epic`, `area:strategy` · iteration: Sprint 5

Run a strategy on the paper account for real, through `pipeline.submit()`,
with attribution, a kill switch and price alerts. Semester demo build
v0.12. See ROADMAP.md § Epic E.

### Epic F: Platform & quality
labels: `epic`, `area:platform` · iteration: none (continuous)

Smoke tests, diagnostics, accessibility, and the ops workflows. One or two
items per sprint. See ROADMAP.md § Epic F.

---

## Sprint 0 — Team foundation (Sep 29 – Oct 2)

### Create `dev` branch and make it the default
labels: `chore`, `area:platform` · epic: A

**Why.** GitFlow needs an integration branch, and "Closes #n" in a PR only
closes the issue when the PR merges into the *default* branch.

**Done when**
- `dev` exists, created from current `main`
- Settings → General → Default branch = `dev`
- `deploy.yml` still deploys from `main` only (check the `on: push:
  branches:` block)

### Protect `main` and `dev`
labels: `chore`, `area:platform` · epic: A

**Done when** both branches have a ruleset: PR required, `CI` status check
required, 1 approval, no force-push. The Product Owner can bypass for
release merges.

### Add issue templates and a PR template
labels: `docs`, `area:platform` · epic: A

**Done when** `.github/ISSUE_TEMPLATE/` has `bug.yml`, `feature.yml`,
`task.yml` (each asks for the build stamp) and
`.github/pull_request_template.md` has the Definition of Done checklist
(build passes, tests pass, CHANGES.md updated, Help updated, `Closes #`).
The *Report feedback* menu link still opens the bug template.

### Create the label set
labels: `chore`, `area:platform` · epic: A

**Done when** these labels exist with a one-line description each:
`epic`, `feature`, `bug`, `chore`, `docs`, `test`, `area:trade`,
`area:watch`, `area:discover`, `area:journal`, `area:strategy`,
`area:platform`, `area:shell`, `good first issue`.

### Write CONTRIBUTING.md
labels: `docs`, `area:platform` · epic: A

**Done when** it covers: fork, clone, `npm install`, `.env.local`, the
ten-step branch-per-task → PR into upstream `dev` flow, commit message
style, and the sprint-end `release/sprint-N` → `main` (tag `v0.N`) → back
to `dev` flow with the exact git commands. Link it from README.

### Fix: Site health — relay rejects the site's origin (#1)
labels: `bug`, `area:platform` · epic: A · *already exists as #1 — add the labels and make it a sub-issue of Epic A, don't create a new one*

**Symptom.** The nightly watchdog's CORS-preflight check fails; see the
sticky issue for the exact origin and response.

**Done when** `relay/src` allows the Pages origin (check `ALLOWED_ORIGINS`
and case — Pages hostnames are lowercase), `node test.mjs` has a case for
it, the Worker is redeployed, and the next *Site health* run closes the
sticky issue on its own.

### Board: set Iteration field and Roadmap date fields
labels: `chore`, `area:platform` · epic: A

**Done when** the project's Iteration field starts Mon Oct 5, 2026, 2-week
duration, iterations named Sprint 1 … Sprint 5; the Roadmap view's *Date
fields* is set to *Iteration* so cards render as bars; `instructor/
project-board-setup.md` in CS_GitHubScrumIntro is updated to say so.

### Align package.json version with CHANGES.md
labels: `chore`, `area:platform` · epic: A

**Done when** `react-app/package.json` says `0.7.0`, the build stamp shows
the version next to the build time, and CONTRIBUTING.md states that the
release branch bumps the version.

---

## Sprint 1 — Trader control (Oct 5 – Oct 16, v0.8)

Eleven cards for five developers: the two big features are split in halves
so nobody holds one two-week card, and three `good first issue` fillers
give slack to whoever finishes early.

### Risk limits in Settings (1/2): form and storage
labels: `feature`, `area:trade` · epic: B

**Why.** Limits live in `src/config/risk.ts`; a learner should set them in
the app "while calm".

**Done when**
- Settings has a *Risk limits* section with every `RiskLimits` field, plus
  *Restore defaults*
- Values persist per device (`useLocalStorage` / `kvStore`); the config
  file values are the defaults
- A `useRiskLimits()` hook exposes the effective limits (part 2 wires it
  into the guard)

### Risk limits in Settings (2/2): guard wiring and tests
labels: `feature`, `area:trade` · epic: B · depends on 1/2

**Done when** `riskGuard` receives the effective limits from
`useRiskLimits()` everywhere the pipeline is called; `riskGuard.test.ts`
covers the merge of stored values over defaults and a user-tightened limit
blocking an order; the Help "Placing orders" section says where to change
the limits.

### Order preview before submit
labels: `feature`, `area:trade` · epic: B

**Done when** the ticket shows, before *Submit*: notional (qty × reference
price), position notional after fill, and a checklist of the guard rules
with pass / fail computed by calling the guard in dry-run mode. A failing
rule disables Submit and names the limit.

### Cancel and replace open orders
labels: `feature`, `area:trade` · epic: B

**Done when** each open order on Account has *Cancel* (two-tap confirm) and
*Replace* (qty / limit / stop editable), `replaceOrder()` is added to
`BrokerAdapter` and `AlpacaAdapter` (`PATCH /v2/orders/{id}`), a replace
goes through the risk guard, and both actions write a journal entry.

### Multiple watchlists (1/2): storage and switcher
labels: `feature`, `area:watch` · epic: B

**Done when** the Watch tab has a list switcher (create / rename / delete,
two-tap confirm), lists are stored locally under `useWatchlist`, and
*Restore default watchlist* in Tools resets only the default list.

### Multiple watchlists (2/2): Discover and detail panel target the current list
labels: `feature`, `area:watch` · epic: B · depends on 1/2

**Done when** the +/✓ toggle on Discover rows and in the symbol detail
panel adds to / removes from the *current* watchlist, and a long-press (or
⋯) offers *Add to…* another list.

### Recent searches in symbol type-ahead
labels: `feature`, `area:watch`, `good first issue` · epic: B

**Done when** the empty search box shows the last 8 picked symbols (stored
locally), tapping one behaves like a search pick, and Tools has *Clear
recent searches*.

### Show company name on Account position and order rows
labels: `feature`, `area:shell`, `good first issue` · epic: B

**Done when** position and order rows on the Account tab show the company
name under the ticker, using `useSymbolIndex().nameOf` exactly as the
watchlist rows do.

### Two-tap confirm on every destructive action
labels: `feature`, `area:shell`, `good first issue` · epic: B

**Done when** every destructive control (cancel order, remove watchlist
symbol, remove keys, restore defaults) uses one shared two-tap confirm
component with the same wording and timeout, replacing the ad-hoc ones in
Tools and Settings.

### Help: risk limits section
labels: `docs`, `area:shell`, `good first issue` · epic: B · depends on Risk limits 1/2

**Done when** `HelpPanel.tsx` has a *Risk limits* section explaining each
limit in plain language with an example, deep-linkable as
`openHelp("risk")`, linked from the Settings risk section.

### Stretch: bracket orders
labels: `feature`, `area:trade` · epic: B

**Done when** the ticket can attach take-profit and stop-loss legs
(`order_class: bracket`), `OrderIntent` carries the legs, the guard checks
the stop is on the correct side of the entry, and the legs show on Account
under the parent.

---

## Sprint 2 — Journal & analytics (Oct 19 – Oct 30, v0.9)

### Realized P&L and trade statistics
labels: `feature`, `area:journal` · epic: C

**Done when** `src/features/journal/pnl.ts` (pure, tested) matches fills
FIFO per symbol from `getOrders({status:"closed"})` into round-trip trades
and computes per-trade P&L, win rate, average win, average loss, largest
loss, profit factor; the Journal tab shows a stats card and a *Trades*
list. Partial fills and fractional quantities are covered by tests.

### Equity curve on the Account tab
labels: `feature`, `area:journal` · epic: C

**Done when** `getPortfolioHistory()` is added to `BrokerAdapter` /
`AlpacaAdapter` (`GET /v2/account/portfolio/history`), the Account tab
draws equity for 1W / 1M / 3M / All with the day's `maxDailyLoss` line,
and the chart reuses the candle chart's library and tokens.

### Journal tags and post-trade review
labels: `feature`, `area:journal` · epic: C

**Done when** a journal entry can carry tags from a small editable set
(e.g. `setup:breakout`, `mistake:chased`, `emotion:fomo`), a *Review* note
can be added after the trade closes, and the journal filters by tag.

### Journal export v2 and backup / restore
labels: `feature`, `area:journal` · epic: C

**Done when** the CSV export includes fills, P&L and tags; *Export backup*
writes a JSON file of journal + watchlists + risk limits (never keys);
*Restore backup* reads it back with a two-tap confirm.

### Stretch: weekly summary card
labels: `feature`, `area:journal` · epic: C

**Done when** the Journal tab opens with "This week: N trades, W wins,
±$X", tapping it opens the stats card filtered to the week.

### Playwright smoke test in CI
labels: `test`, `area:platform` · epic: F

**Done when** `npm run e2e` loads the built app in Chromium, sees the
no-keys banner, pastes fake keys in Settings, clicks *Test connection* and
sees the 401 guidance; `ci.yml` runs it on every PR.

---

## Sprint 3 — Strategy engine (Nov 2 – Nov 13, v0.10)

### Strategy interface and registry
labels: `feature`, `area:strategy` · epic: D

**Done when** `src/sources/strategies/types.ts` defines
`Strategy { id; name; params; universe; onBar(bar, ctx) => OrderIntent[] }`
with `ctx` giving position, cash and bar history; a registry lists the
available strategies; the attribution prefix is the strategy `id`
(`attribution.ts` already supports `sma-cross-`).

### Bar feed for strategies
labels: `feature`, `area:strategy` · epic: D

**Done when** `src/data/bars.ts` returns typed bar series for a symbol,
timeframe and range via `getBars()`, pages Alpaca's cursor, caches in
IndexedDB by (symbol, timeframe, day), and has tests for paging and
gaps (holidays, half days).

### Reference strategy: SMA crossover
labels: `feature`, `area:strategy`, `good first issue` · epic: D

**Done when** `smaCross.ts` buys when fast SMA crosses above slow and sells
on the reverse, with `fast` / `slow` params, unit tests on a hand-made bar
series, and a docstring that explains why it usually loses money.

### Reference strategy: breakout
labels: `feature`, `area:strategy` · epic: D

**Done when** `breakout.ts` buys a close above the N-day high and exits on
a close below the M-day low, with tests.

### Backtester core
labels: `feature`, `area:strategy` · epic: D

**Done when** `src/backtest/engine.ts` runs a strategy over a bar series
with a simulated account (starting cash, positions, zero commission,
slippage in bps), fills at next bar open, passes every intent through
`riskGuard` with the effective limits, and returns `{ trades, equity[],
blocked[] }`; tests cover a known series with expected trades, a guard
block, and end-of-series liquidation.

### Backtest summary statistics
labels: `feature`, `area:strategy` · epic: D

**Done when** `src/backtest/stats.ts` (pure, tested) computes total return,
CAGR, max drawdown and its dates, win rate, profit factor, average trade,
exposure %, and the same trade stats as the journal (`pnl.ts` reused).

---

## Sprint 4 — Backtest reports & Discover (Nov 16 – Nov 27, v0.11)

*Thanksgiving is Thu Nov 26 — plan for one light week.*

### Backtest screen
labels: `feature`, `area:strategy` · epic: D

**Done when** Tools → *Backtest* (and a menu View entry) lets the user
pick a strategy, symbol(s), params, timeframe and date range; runs the
engine in a Web Worker so the UI stays responsive; shows equity curve,
drawdown, trade list and the stats card; Help gets a *Backtesting*
section.

### Compare two parameter sets
labels: `feature`, `area:strategy` · epic: D

**Done when** the Backtest screen can pin a run and overlay a second run's
equity curve and stats side by side.

### Discover: browse by industry (SIC)
labels: `feature`, `area:discover` · epic: D

**Done when** the Discover tab has a *By industry* chip using the SIC code
already in `hq.json` (`scripts/build-hq.mjs` keeps it), grouped by SIC
division → major group, rows carry quotes and the watchlist toggle, and the
same list can be sent to Backtest as a universe.

### Finnhub peers on the detail panel
labels: `feature`, `area:discover` · epic: D

**Done when** the symbol detail panel shows peers from Finnhub
`/stock/peers` via the relay's `/api/fundamentals` route (relay updated
and `node test.mjs` extended), each peer opening its own panel.

### Stretch: walk-forward split in the report
labels: `feature`, `area:strategy` · epic: D

**Done when** the Backtest screen can split the range into in-sample /
out-of-sample and shows stats for each.

### Copy-diagnostics button for bug reports
labels: `feature`, `area:shell`, `good first issue` · epic: F

**Done when** Settings → *About this build* has *Copy diagnostics*
(build stamp, version, API base, last 5 API errors, risk limits, keys
masked) and the bug template asks for it.

---

## Sprint 5 — Automation (Nov 30 – Dec 11, v0.12)

### Paper strategy runner (in-browser)
labels: `feature`, `area:strategy` · epic: E

**Done when** Tools → *Strategies* lists strategies with Start / Stop and
a global *Kill switch* (cancels the strategy's open orders); a running
strategy polls bars on its timeframe while the app is open and submits
through `pipeline.submit()`; its orders appear on Account with the
strategy's attribution; guard blocks appear in the journal with the
strategy as source; state survives reload (stopped by default after
reload, with a banner).

### Strategies may only manage their own positions
labels: `feature`, `area:strategy` · epic: E

**Done when** `orderPipeline.ts` rejects a sell whose source does not own
the position (attribution lookup over open orders / positions), with a
journal entry explaining it, and a test.

### Price alerts
labels: `feature`, `area:watch` · epic: E

**Done when** the detail panel can add an alert (above / below price, or
% move today), alerts are evaluated by the quote poll while the app is
open, fire an in-app banner and a PWA notification where permission is
granted, and a Tools → *Alerts* list manages them.

### Semester demo build v0.12
labels: `docs`, `area:shell` · epic: E

**Done when** Help covers every screen added this semester, BETA.md is
refreshed, `CHANGES.md` has 0.8 – 0.12, `release/sprint-5` merges to
`main` tagged `v0.12`, and the demo script (five minutes: watch → trade →
journal → backtest → runner) is in `docs/demo.md`.

### Spike: server-side strategy runner
labels: `chore`, `area:platform` · epic: E

**Done when** a one-page design note in `docs/` compares a Cloudflare
Worker cron + Durable Object against a small Node service for running
strategies with no browser open, including where keys would live (they
can't stay browser-only) — a decision for the Product Owner, not code.

### Accessibility pass
labels: `chore`, `area:shell` · epic: F

**Done when** every interactive control has a label, focus order on each
screen is sensible, contrast on `tokens.css` colours meets WCAG AA, and
the findings are logged as follow-up issues.
