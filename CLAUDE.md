# VPLL — Vermont Professional Lacrosse League Simulation Engine

## What this is

A fully mechanized, fictional 32-team professional lacrosse league simulation. Guiding
philosophy: "feels like playing a video game and reading the newspaper." The Commissioner
(the user) is a "ghost in the machine" — an observer watching 32 teams rise and fall
autonomously, not a GM managing one team. Nearly everything should run itself; the user
occasionally intervenes (e.g. the manual trade override) but the default mode is watching,
not managing.

**Source of truth for lore/rules:** `docs/VPLL_Master_File.md`. This is the canonical rulebook
— league structure, scoring formula, roster tags, cap rules, playoff structure, coaching
archetypes, all of it. When in doubt about "what should happen," check it first. The user
maintains this file directly and it should stay in sync with what the engine actually does;
flag any drift you notice.

**Other docs** (`docs/`): Year 1 rosters, coaches, free agent pool, and name pools — these were
the original generation outputs and are now embedded (in compact/mutated form) inside the
simulator itself. Treat them as historical/reference, not live data.

## Current state

The engine is a real Vite + React project under `src/`, `scripts/`, and `test/` — no longer the
single ~220KB `src/VPLL_Simulator.jsx` file it started as. That file was built incrementally
across many sessions inside a Claude.ai artifact, which only supports single-file React
components — that constraint is why it started as one file, not a design choice. It's been fully
decomposed (see git history for the split) and removed; every function/const body was moved
verbatim into its new module, not rewritten, so the module boundaries below don't imply any
behavior changed along the way.

Current module layout:
- `src/data/` — `rawData.js` (embedded `RAW_DATA`: 32 teams, 800 players, 96 coaches, name pools,
  plus `PRISTINE_YEAR1`, plus `PLAYER_POOL` — the persistent waiver pool, a plain live array
  starting empty every Year 1 rather than embedded seed data), `migrations.js` (one-time LSM
  position migration), `reset.js` (`resetLeagueDataToYear1()`, the single source of truth the app
  and the test harness both use — also clears `PLAYER_POOL`)
- `src/engine/` — one module per subsystem: `mathHelpers`, `contracts` (salary cap), `ratings`
  (roster→rating feedback loop), `simulation` (scoring formula, indoor/outdoor balance, OT,
  2-point cycle, injuries), `boxScore` (goal attribution), `schedule` (256-game generator),
  `trades` (autonomous + manual override — three trigger phases: unhappy-star demands,
  complementary need/surplus matching, and salary-dump trades from a team already paying a
  luxury-cap fine, each capped at `MAX_TRADES_PER_TEAM` and distinct in the UI/Hot Stove copy),
  `standings`, `playoffs` (wild card → regional semis →
  regional final → conf final → trophy), `progression` (zero-sum tag progression), `draft`
  (need-aware), `coaching` (carousel), `retirement`, `roster` (roster-size caps/floor AND the
  persistent player pool — Master File 9.5/9.7, tuned to the Commissioner's explicit numbers
  rather than the doc's 20-25 band: 32-player cap after the draft, a 28-player training-camp cut
  applied once at year-start, a 24-player floor with per-position minimums so no cut or shortfall
  ever leaves a team without enough bodies at a position. Cut and unsigned players land in
  `PLAYER_POOL` instead of vanishing; `ensureFloorBeforeRemoval()` claims a replacement from the
  pool *before* a retirement or an unsigned departure actually happens, so a roster never dips
  below the floor even for one offseason tick — `enforceRosterFloor()` is the belt-and-suspenders
  safety net after that. `maintainPlayerPool()` ages pool players a year, retires eligible
  veterans out of it on the same rules as rostered players, and trims each position back to
  `MAX_POOL_PER_POSITION` so an unclaimed pool can't grow forever), `freeAgency` (Master File
  9.4/9.5, extended per `docs/VPLL_Free_Agency_Tiers_Spec.md`: `freeAgentTier()` buckets a
  player 1-4 — Franchise/Quality Starter/Rotational/Journeyman — from *current* overall + star
  flag each time it's needed, never stored on the player; a smaller multiplier on the effective
  overall used for that tier lookup and a larger one on market `needScore` both favor the three
  scarce positions (Goalie/FOGO/Long-Stick Midfield); `pickMotivation()` skews Loyalist/
  Mercenary/Winner by tier instead of one flat league-wide split; `reSignChance()` folds in a
  coach-archetype-fit bump/penalty (reusing `trades.js`'s `HC_TAG_FIT` lookup rather than
  duplicating it) and a projected-cap-position penalty via `projectedCapFine()` — never a hard
  block, just a scaled-down chance, since teams do sometimes pay the tax for a player worth it;
  market-wide cap tightness also dampens how aggressively the Mercenary branch chases bidding
  wars league-wide. This is the one subsystem that used to be duplicated across `App.jsx` and
  the harness — now both just call `runFreeAgency()`. The spec's homegrown bonus is now real
  (a modest re-sign bump in `reSignChance()` and a `needScore` nudge in `rankTeamsForPlayer()`
  when `player[13] === team`), now that `hometown.js` (below) gives every player a real
  hometown to check against. §6 Indoor Specialist Market (Master File 9.8) is implemented as a
  `needScore` bonus keyed off the same `bal` field/scale `deactivation.js` uses, standing in for
  the doc's literal "20% turnover allowance" (no such hard cap exists anywhere else in this
  engine's free agency, consistent with the Culkin roster-carryover abstraction noted below). §7
  real multi-team bidding: `runFreeAgency()`'s signing loop tries up to the top 3 ranked
  contenders in sequence, each an independent decreasing-probability roll (0.35/0.25/0.15,
  tuned so the combined chance lands close to the old flat single-roll 0.6 rather than inflating
  free-agent movement) — every `signed` entry carries a `runnersUp` list of the teams that also
  pursued but didn't land the player), `hometown` (Master File 9.3 — every player gets a
  permanent hometown team, assigned once at creation (`assignHometown()`, tuple index 13 — see
  "Player data format" below) and weighted by market size via `MARKET_TIER`, the Master File
  13.1 big/mid/small market table for all 32 real teams (weights 3/2/1 — Tier 3 never drops to
  zero, per the doc). `bootstrapHometownsIfNeeded()` migrates any pre-existing save the same way
  `bootstrapContractsIfNeeded()`/`migrateLSMIfNeeded()` do, called from both `resetLeagueDataToYear1()`
  and `App.jsx`'s load effect. Consumed by `freeAgency.js`'s homegrown bonus above and by
  `awards.js` only indirectly (it doesn't gate any award itself)), `deactivation` (Master File
  9.8 Deactivation Lists — up to 5 players/team/season sit out while retaining their roster spot,
  selected from genuine indoor/outdoor misfits via each player's own `bal` field (tuple index 7,
  same scale/semantics as the team-level rating), never dropping an active position group below
  `roster.js`'s `POSITION_MINIMUMS`. This engine has no literal per-game lineup selection
  (team-aggregate ratings drive simulation, not individual players), so deactivation's real
  mechanical effect is scoped to what that model can express: `App.jsx`'s `startNewSeason()`
  computes `computeAllDeactivations()` once per season and stores it on the season object as
  `deactivated`, which `awards.js` (below) then excludes from every award scoped to that season),
  `awards` (Master File
  Section 10 — MVP, Offensive/Defensive Player of the Year, Most Outstanding Goalie, Rookie of
  the Year, Coach of the Year, both Trophy Finals MVPs, the Davidson Award (Commissioners Cup
  MVP), and First/Second Team All-VPLL + All-Rookie Team. Built entirely from signals the engine
  already tracks — overall/star/leadership/balance, team subcategory ratings, roster tag, coach
  archetype, actual standings/playoff results — not from season-long individual stats
  (goals/assists), which didn't exist anywhere in this engine when this module was built (see
  `playerStats` below, which now provides them — `awards.js` predates it and hasn't been
  revisited to use it); every award is a genuine proxy for what the doc describes, not a
  fabricated stand-in for a missing signal. Comeback Player of the Year is
  **still not** implemented — it needs multi-year per-player history, which didn't exist
  anywhere on the player tuple or elsewhere when this module was built, and `deactivation.js`
  doesn't fill that gap either. `playerStats.js`'s `CAREER_STATS` (below) now gives a real,
  multi-year, per-player production history (not literally injury/struggle data, but a genuine
  signal a "bounced back after a down year" award could be built on) — worth revisiting when
  task #44 is picked up, rather than still treating this as a hard data gap. Rookie identity is
  tracked explicitly (`currentRookies`
  state in `App.jsx`, snapshotted from the draft class right before `beginYear2` resets
  `offseason`) rather than inferred from contract-year arithmetic, which would have been fragile
  and implicit. Every player-scoped award takes an optional `deactivated` param (`{ team: [names] }`
  for the season being evaluated, from `deactivation.js` above) and excludes anyone on it — the
  Davidson Award (evaluated across both seasons combined) and Coach of the Year (team-level, not
  a player award) don't take one), `boxScore` (goal attribution, extended for season-long
  individual stat tracking: `attributeFaceoffs()`, `attributeCausedTurnovers()`, and
  `attributeGoalieStats()` alongside the original `attributeGoals()`, all four narrating a
  plausible individual attribution of a real team-level simulated outcome from the same rating
  signals `simulation.js` itself uses — not a literal play-by-play, since this engine has no
  per-possession simulation, same as everything else here. `computeGameBoxScore()` is the one
  call site that runs all four for a single game, feeding both display and `playerStats`
  accumulation below), `playerStats` (season + career individual leaderboards — goals, assists,
  points, 2-point goals, face-off %, caused turnovers, save % — built from `boxScore.js`'s
  eager, guaranteed-complete-for-every-game attribution rather than the old on-click-only
  generation. `accumulateGameStats()` folds one game's box score into both a season-scoped store
  (`season.playerStats`, wiped every year) and `CAREER_STATS` (`src/data/rawData.js`, persistent
  across years, keyed by the stable player ID at tuple index 14 — see `playerId.js` below and
  "Player data format" above — specifically because names alone aren't safe to key
  cross-year data by). Deliberately doesn't track "games played" — this engine has no literal
  per-game lineup, so there's no honest number to put there. Scoped to regular-season games
  only; playoff box scores still render for display but don't feed either store, so a season
  leaderboard never conflates a 13-game regular season with a handful of playoff games.
  `subtractSeasonFromCareer()` undoes a scrapped-and-reset season's contribution to
  `CAREER_STATS` (`App.jsx`'s `resetSeason`) so a redone season can't double-count.
  `topByStat()` is the one leaderboard query both the Stats tab and any future consumer use,
  with a minimum-attempts floor before a rate stat like face-off %/save % is eligible to lead),
  `playerId` (mints the stable per-player identity above — no persisted counter, a
  timestamp-plus-random string is entropy enough given this engine already has no seeded PRNG
  anywhere else; `bootstrapPlayerIdsIfNeeded()` migrates existing saves the same way every other
  post-hoc tuple field here does)
- `src/pressbox/` — `prompts.js` (recap / Hot Stove / Week in Review prompt builders),
  `api.js` (`fetchArticle`, still calling `api.anthropic.com` directly with no key — see "What
  has to change" below, unresolved)
- `src/components/` — `RatingBar`, `TeamCard`, `BoxScore`, `PlayoffRound`, `StandingsTable`,
  `Article`, `CombinedCupTable`, `ErrorBoundary` (task #49 — a class component, the only kind
  that can implement `getDerivedStateFromError`/`componentDidCatch`; wraps `<App/>` in
  `main.jsx`, outside everything else, so it still renders correctly even if the crash happened
  before `<style>{STYLES}</style>` ever mounted — every color/font in its fallback UI is inlined
  rather than relying on `.vpll-root`'s CSS variables or the Google Fonts import. Before this, any
  render-time exception anywhere in the tree took the whole app to a blank white screen with no
  recovery path. The fallback offers Reload and a "Clear saved data & reload" action — the same
  storage keys `resetLeagueToYear1` already deletes — for the specific case of a crash caused by
  corrupted local save data, where a plain reload would just crash again)
- `src/styles/styles.js` — the CSS-in-JS design system
- `src/storage.js` — localStorage-backed replacement for `window.storage`, same key names
- `src/App.jsx` — the main component (tabs: Exhibition, Season, Playoffs, Standings, Offseason,
  Press Box), wired to all of the above
- `scripts/lib/simulateLeague.mjs` + `scripts/simulate-years.mjs` — headless multi-year
  simulation harness and CLI report (see "Testing workflow" below)
- `test/` — `data-integrity.test.js`, `multi-year-parity.test.js`, `playoff-tiebreakers.test.js`,
  `draft-lottery.test.js`, `roster-caps.test.js`, `player-pool.test.js`, `free-agency-tiers.test.js`,
  `awards.test.js`, `hometown.test.js`, `deactivation.test.js`, `boxScore.test.js`,
  `playerId.test.js`, `playerStats.test.js`

`npm run dev` / `npm run build` both work; see "Testing workflow" below for `npm test`.

## Critical architectural gotcha — read before touching data mutation code

`TEAMS`, `COACHES`, and `PLAYERS_RAW` are **direct object references into `RAW_DATA`**, not
copies:
```js
const TEAMS = RAW_DATA.teams;      // same object, not a clone
const COACHES = RAW_DATA.coaches;
const PLAYERS_RAW = RAW_DATA.players;
```
Every offseason mutation (progression, contracts, trades, retirement, development) writes
straight through to `RAW_DATA` too, since JS objects are reference types. This caused a real
bug once already (see "Reset to Year 1" below) — there was no pristine backup anywhere until
one was explicitly snapshotted. If you refactor this into modules, **preserve a genuine deep
clone of the original embedded data** before any mutation path can touch it. Currently this is
`PRISTINE_YEAR1`, built via `JSON.parse(JSON.stringify(...))` at module load, before React even
mounts. Don't lose this pattern in a refactor — it's what "Reset to Year 1" restores from.

## Player data format

Players are compact tuples, not objects (to keep embedded payload size down):
```
[name, pos, hand, age, overall, starFlag, leadership, balance, durability,
 aav, yearsRemaining, contractType, ceiling, hometown, id]
```
Indices 9-12 (contract + dev ceiling fields) were added after the original embed — always
guard for `undefined` on old saves (`bootstrapContractsIfNeeded()` handles this). Index 13
(`hometown`, a team name — see `src/engine/hometown.js` above) was added the same way, guarded
by `bootstrapHometownsIfNeeded()`. Index 14 (`id`, a stable player identity — see
`src/engine/playerId.js` above) followed the same pattern again, guarded by
`bootstrapPlayerIdsIfNeeded()` — it exists because a player's *name* is only unique at a single
point in time (a retiree's name can be reissued to a new draftee years later), which is fine for
anything that only looks at the current league but unsafe for anything that persists
player-scoped data across years, like `src/engine/playerStats.js`'s `CAREER_STATS` below. `ceiling`
(index 12) is only set for draft picks; established players have no growth target, which is
intentional — only young/drafted talent develops.

Positions: `A` Attack, `M` Midfield, `L` Long-Stick Midfield, `D` Defense, `F` FOGO, `G` Goalie.

## Team ratings: the roster→rating feedback loop

Team ratings (`TEAMS[name].score` and 17 subcategory ratings, 1-10 scale) are **not** purely
independent of the roster. Each offseason, `pullRatingsTowardRoster()` nudges ratings toward
actual roster quality by position group. This was added deliberately so drafting, free agency,
and trades have real mechanical consequences, not just narrative flavor.

**Important subtlety:** "team score" and "player overall" were generated on different absolute
scales originally (player averages run systematically ~10-15 points higher than team score for
the same team). Pulling `team.score` toward the *raw* roster average creates a slow systematic
upward drift league-wide — this was a real bug, caught via a 10-year simulation test, fixed by
pulling toward roster quality **relative to the league-wide roster average** instead of the
absolute value. If you touch this function, re-run a multi-year stability test before shipping
(see Testing Workflow below) — it's easy to reintroduce drift.

## Parity design — this took real tuning, don't undo it casually

The league deliberately resists both "same teams win forever" and "spread collapses to nothing."
Mechanisms, all currently tuned together as a system:
- Zero-sum tag-based progression (one team's rise is funded by others' declines)
- Compression toward league mean, stronger at the extremes (currently 9%, was 15% before the
  roster-pull mechanism was added — the two forces compound, so if you change one, retest the
  other)
- A full tag life-cycle so no tag is a dead end (Young & Inexperienced matures into Deep Roster
  or Star Dependent; Deep Roster ages into Veteran-led; Veteran-led declines into Rebuilding;
  Rebuilding can launch a youth movement back into Young & Inexperienced)
- Coach firing requires *sustained* struggle (never in year 1 of a tenure, escalates with
  consecutive bad years) — this was added because naive single-year firing created constant
  chaotic churn with zero payoff, since coaching didn't used to affect gameplay either.

Validated benchmark from the last tuning pass (16 simulated years): rating SD stable in the
6.9-10.0 range, ~6% coach firing rate per team-season, 23/32 teams touched a top-5 finish at
some point, 20/32 touched a bottom-5, zero overlap between Year 1's and Year 16's top-5. If you
change progression, coaching, or the roster-pull weight, re-run something like this before
calling it done.

## Testing workflow used throughout this project

Now that the engine lives in real modules under `src/` (see "Current state" above), there's a
real automated suite instead of the fully-manual process this section used to describe:

- **`npm test`** — runs `test/*.test.js` on Node's built-in test runner (no extra dependency).
  Currently: `data-integrity.test.js` (league data shape, no duplicate rostered players, schedule
  generator sanity), `multi-year-parity.test.js` (see below), `playoff-tiebreakers.test.js`
  (hand-built fixtures proving the Conference Record → Head-to-Head tiebreak cascade, including
  N-way ties scoped to just the tied teams), `draft-lottery.test.js` (large-sample statistical
  check that the NBA-style fixed-odds lottery draw — see below — actually produces the intended
  per-rank probabilities, plus structural invariants on pool size/order), `roster-caps.test.js`
  (hand-built rosters proving the 32/28/24 cap-cut-floor rules and the per-position minimums,
  including that a cut never drops a position below its floor and a floor top-up never ignores a
  position shortfall just because the total count is already fine), `player-pool.test.js`
  (the persistent waiver pool: cuts feed it instead of vanishing, claims prefer a real pool player
  over generating a fresh one, a claim for a specific position never silently substitutes the
  wrong one, the roster never dips below the floor even momentarily across a chain of
  retirements/departures, and `maintainPlayerPool()`'s aging/retirement/size-cap upkeep), and
  `free-agency-tiers.test.js` (tier bucketing incl. the position-scarcity boundary shift,
  `pickMotivation()`'s tier-based distribution over a large sample, `projectedCapFine()` against
  a controlled payroll, `reSignChance()`'s coach-fit bump/penalty and its cap-pressure dampening
  — reduced but never fully blocked — and `runTradeEngine()`'s salary-dump phase actually moving
  the highest-AAV player off a team paying a luxury fine, plus the homegrown re-sign bump and
  that every real signing carries a `runnersUp` list from the multi-team bidding pass),
  `awards.test.js` (every award's selection logic against a fully controlled league roster so a
  real embedded player can never accidentally win a test by coincidence — position filters for
  OPOY/DPOY/MOG, the MVP context bonus actually favoring a weaker team, Coach of the Year's
  overachievement math, the Davidson Award's balance-eligibility filter and its full-roster
  fallback, All-VPLL/All-Rookie Team composition and no player appearing on both teams, and that
  a `deactivated` player is excluded from every award scoped to that season), `hometown.test.js`
  (`MARKET_TIER` covers all 32 real teams exactly once, `assignHometown()` always returns a real
  team and weights Tier 1 above Tier 3 over a large sample, `bootstrapHometownsIfNeeded()`
  backfills missing hometowns on rostered/pooled players without ever overwriting an existing
  one), `deactivation.test.js` (misfit selection sits the right specialists for the right
  season, the 5-player cap, and that a deactivation never drops an active position group below
  `POSITION_MINIMUMS`, including with a surplus above the floor), `boxScore.test.js` (every
  goal carries a resolvable scorer id, the 2-point flag lands on exactly one eligible goal,
  face-offs distribute to a real FOGO with the stronger team winning more over a large sample
  and never throwing when a team has none rostered, caused turnovers only ever land on
  Defense/Long-Stick Midfield, goalie saves/shots-faced/goals-allowed stay internally
  consistent and `null` with no rostered goalie, and `computeGameBoxScore()`'s combined shape),
  `playerId.test.js` (`mintPlayerId()` uniqueness over a large sample, and
  `bootstrapPlayerIdsIfNeeded()`'s backfill-without-overwrite migration), and
  `playerStats.test.js` (`accumulateGameStats()` sums goals/assists/face-offs/turnovers/goalie
  lines into both the season store and `CAREER_STATS`, two different players who happen to
  share a name accumulate separately because they're keyed by id and not name — proving the
  exact collision `playerId.js` exists to prevent — `subtractSeasonFromCareer()` reverses only
  what a given season actually contributed, and `topByStat()`'s position filter and rate-stat
  minimum-attempts floor). All run in well under a second combined.
- **`npm run simulate:years [n]`** — `scripts/simulate-years.mjs`, a headless CLI that runs a
  real N-year league simulation (default 16) and prints a benchmark report: rating SD range,
  coach firing rate, top-5/bottom-5 team turnover, champion diversity. This is the formalized,
  rerunnable version of the "run 16 simulated years, inspect by hand" pass this file used to
  reference informally — use it whenever you touch progression, coaching, or the roster-pull
  weight, per the Parity design note above.
- **`test/multi-year-parity.test.js`** — the automated form of the same 16-year run, asserting
  the Commissioner's stated design goal directly: dynasties possible but not guaranteed, solid
  league-wide parity. Checks roster/rating integrity, rating-spread bounds, league-mean drift
  (catches the roster-pull absolute-vs-relative bug class specifically), plausible coach firing
  rate, meaningful top-5/bottom-5 turnover, no team winning every year or >60% of titles, and at
  least one repeat champion across the run. There's no seeded PRNG in this codebase, so its
  bounds are deliberately padded versus the exact numbers below to keep the false-failure rate
  low — a single failure is worth a re-run before treating it as a regression; a consistent
  failure is real.
- **`npm run build`** (Vite) is now the real build-validity check — no more manual
  `esbuild --jsx=automatic` step, and no risk of duplicate top-level definitions across files
  now that each subsystem is its own module (a build failure or duplicate-export error surfaces
  immediately instead of needing a manual grep).
- **`npm run lint`** — ESLint 9+ flat config (`eslint.config.js`), separate rule blocks for the
  browser/React code under `src/` (with `globals.browser`) versus plain Node code (`scripts/`,
  `server/`, `test/`, config files, with `globals.node`) so neither false-flags the other's
  globals. Deliberately does *not* pull in `eslint-plugin-react-hooks`'s full v7 "recommended"
  bundle — that config ships a large set of React Compiler-oriented rules (purity, immutability,
  static-components, preserve-manual-memoization, ...) meant for codebases adopting that
  compiler, which this project doesn't use; only `rules-of-hooks` (error) and `exhaustive-deps`
  (warn) are enabled, the two classic rules that catch real hook bugs. Fails only on genuine
  errors — pre-existing style patterns (mainly unused `catch (e)` error variables and a few
  `exhaustive-deps` notices) are warnings and don't block the build. Wired into CI right after
  `npm ci`.
- **`.github/workflows/ci.yml`** — runs on every push and PR (no dedicated main branch exists
  yet, so it isn't scoped to one branch name): `npm ci` → `npm run lint` → `npm test` →
  `npm run build` → a 16-year `npm run simulate:years` benchmark. The benchmark step already
  exits non-zero on a genuine roster-integrity violation; its rating-SD/coach-firing/champion-
  diversity numbers are informational only, since there's no seeded PRNG here.

Validated 16-year benchmark from the module split (see git history for the full run): rating SD
5.4-8.9 (close to the earlier hand-tuned 6.9-10.0 pass), ~5.5% coach firing rate per
team-season, 24/32 teams touched a top-5 finish, 22/32 touched a bottom-5, 11 distinct
Commissioners Cup champions across 16 years with the top team winning 3 — dynasties possible,
nowhere close to guaranteed. Re-run `npm run simulate:years 16` and eyeball it against these
numbers if you touch progression, coaching, or the roster-pull weight.

This workflow has already caught real bugs, both before and after the module split: the
roster-rating drift, a 10x unit conversion bug in home field advantage, a tenure-tracking bug in
coach firing, and — caught immediately by the new multi-year harness the first time it ran —
two missing-import bugs from the module split itself (the offseason Trades step and every Press
Box prompt were silently broken until the harness actually exercised them). Don't skip it.

## Local/non-Claude.ai execution — both blockers resolved

Two things only ever worked inside the Claude.ai artifact sandbox. Both are now handled:

1. **`window.storage`** (artifact-specific persistence API) → `src/storage.js`, a thin
   `localStorage` wrapper with the same async `get`/`set`/`delete` shape, same key names:
   `vpll-game-history`, `vpll-league-data-state`, `vpll-meta-state`, `vpll-year1-state`,
   `vpll-pressbox-archive` (plus the legacy `vpll-season-state` migration path, kept for anyone
   still on an old save).

2. **Press Box's Anthropic API call** — `fetchArticle()` used to call `api.anthropic.com`
   directly with no key, which only worked because the Claude.ai artifact environment proxied
   and authenticated it transparently; everywhere else it just failed. Now: `server/index.mjs`
   is a minimal, dependency-free local proxy (plain `node:http`) that holds the real API key
   server-side (via a gitignored `.env` — copy `.env.example` to get started) and forwards
   `{prompt}` to the real Messages API. Vite's dev server proxies `/api/*` to it (see
   `vite.config.js`) for the normal same-origin dev workflow. Run it with `npm run server`
   alongside `npm run dev`, or both at once with `npm run dev:all`. Without it running, Press
   Box fails gracefully into the existing "the presses jammed" error banner — same as any other
   article generation failure, not a crash. Hardened by a security pass (task #47): binds
   explicitly to `127.0.0.1` (Node's default with no host argument listens on every network
   interface, not just this machine, despite the "local-only" framing), only ever reflects back
   an `Access-Control-Allow-Origin` for a request whose `Origin` header is itself loopback —
   never `*` — so a malicious page open in the same browser can't silently ride this proxy to
   spend the developer's own API credits and read the response, and caps the request body at
   64KB against unbounded-memory-buffering abuse. `npm run simulate:years`'s benchmark and
   `npm audit` (0 vulnerabilities as of this pass) don't cover this file at all since it's
   outside the headless engine — verified by hand instead (build/lint/test plus manual `curl`
   checks against all three fixes).

   Along the way, fixed `model: "claude-sonnet-4-6"` — a stale, invalid model ID that had been
   sitting in this code since the original artifact export and would have failed every request
   regardless of the proxy. It's `claude-sonnet-5` now, set server-side.

## Design system (for reference if rebuilding UI)

Deliberately not the generic AI-assistant look — grounded in Vermont + the sport itself:
- Colors: forest green `#1F4430`, lake blue `#23576B`, maple gold `#C6871F`, barn red `#8E3B2E`,
  paper `#E4DFCE`, ink `#16241C`
- Type: Zilla Slab (headlines/scoreboard), Lora (body/newspaper), JetBrains Mono (stats/data)
- Signature motif: a subtle diamond mesh pattern as background texture — a nod to both literal
  lacrosse net mesh and "The Mesh," the league's own in-universe analysis outlet
- The masthead deliberately mashes up a newspaper banner with a digital scoreboard readout —
  the "video game meets newspaper" brief made literal

## Known scope boundaries (deliberately deferred, not forgotten)

- **Season-long individual stat tracking** is now built (`src/engine/boxScore.js` +
  `src/engine/playerStats.js`, the Stats tab in `App.jsx`) — goals, assists, points, 2-point
  goals, face-off %, caused turnovers, and goalie save %, both season-scoped and a persistent
  cross-year career total. `src/engine/awards.js` (Master File Section 10) predates this and was
  deliberately built entirely around ratings/standings/roster signals instead, since this gap
  didn't exist yet when it shipped — it hasn't been revisited to consume the new stat data, and
  Comeback Player of the Year specifically is still unbuilt (see the awards.js note above).
- **Culkin (indoor) roster carryover** is abstracted, not literal — Culkin uses the same
  ratings/rosters as Corkum with the Balance modifier doing the work, rather than a true
  80%-carryover roster mutation between seasons
- Free agency and trades exist and are real, but there's no in-artifact concept of scouting
  reports, agent negotiation drama, or multi-team trade packages — single player-for-player
  swaps only

## Tone/voice notes for any generated content (Press Box, etc.)

Everything must stay strictly in-fiction: "Year N," never a real-world date. Quotes only from
named VPLL coaches/players who actually appear in the data — never invent named real people.
Three outlet voices are established: VPLL.com (straight beat reporting), The Mesh (tactical
analysis), The X (opinion/hot takes, especially resort-town salary cap drama). Hot Stove is the
offseason transaction column. Keep new outlets consistent with this if you add any.
