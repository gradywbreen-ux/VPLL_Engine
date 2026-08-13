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

Everything currently lives in **one file**: `src/VPLL_Simulator.jsx` (~220KB). This was built
incrementally across many sessions inside a Claude.ai artifact, which only supports single-file
React components — that constraint is why it's one file, not a design choice. **Splitting this
into a real modular project is an expected and welcome first task**, not something to avoid.

Rough shape of what's in that file, top to bottom:
1. Embedded league data (`RAW_DATA` — 32 teams, ~800-900 players, 96 coaches, name pools)
2. Simulation engine (scoring formula, indoor/outdoor balance, OT, 2-point cycle, injuries)
3. Schedule generator (256-game season, division/region/conference pairing logic)
4. Playoff bracket engine (wild card → regional semis → regional final → conf final → trophy)
5. Standings + Commissioners Cup calculation
6. Offseason systems: draft (need-aware), coaching carousel, retirement, free agency
   (motivation-driven), trades (autonomous + manual override), team rating progression
7. Press Box: Claude API-powered game recaps / Hot Stove / Week in Review articles
8. React UI (tabs: Exhibition, Season, Playoffs, Standings, Offseason, Press Box)

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
 aav, yearsRemaining, contractType, ceiling]
```
Indices 9-12 (contract + dev ceiling fields) were added after the original embed — always
guard for `undefined` on old saves (`bootstrapContractsIfNeeded()` handles this). `ceiling`
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
  generator sanity) and `multi-year-parity.test.js` (see below). Both run in well under a second.
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

## What has to change for local/non-Claude.ai execution

Two things currently only work inside the Claude.ai artifact sandbox:

1. **`window.storage`** — artifact-specific persistence API. Swap for `localStorage` (data
   volume is well within its limits) or `IndexedDB` if it grows. API shapes are close enough
   that this should be a mechanical replacement, not a redesign. Storage keys currently in use:
   `vpll-game-history`, `vpll-league-data-state`, `vpll-meta-state`, `vpll-year1-state`,
   `vpll-pressbox-archive` (plus a legacy `vpll-season-state` migration path that can probably
   be dropped now).

2. **Press Box's Anthropic API call** (`fetchArticle()`) — currently calls `api.anthropic.com`
   directly with no key, which only works because the Claude.ai artifact environment proxies
   and authenticates it transparently. Outside that environment this needs a real API key,
   which should **not** live in client-side code. Build a minimal local server/proxy that holds
   the key and forwards the request; point `fetchArticle()` at that instead.

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

- **Season-long stat tracking** (goals/assists leaderboards across a full season) — explicitly
  deferred by the user, needs its own design conversation before building
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
