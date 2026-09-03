# VPLL Engine

A fully mechanized, fictional 32-team professional lacrosse league simulation — the Vermont
Professional Lacrosse League. Guiding philosophy: "feels like playing a video game and reading
the newspaper." The Commissioner (you) is a ghost in the machine, watching 32 teams draft, trade,
sign free agents, and rise and fall over simulated years — not managing one team by hand.

A real Vite + React project: full seasons and playoffs, a salary cap and free agency market, an
autonomous trade engine, coach firings, a draft lottery, player development, and an AI-written
Press Box covering it all in-fiction.

## Quick start

```
npm install
npm run dev
```

Open the printed local URL. That's the whole app — team rosters, schedules, standings, playoffs,
and the offseason are all generated and simulated client-side; nothing else needs to be running.

### Press Box (optional)

Press Box generates recap articles and an offseason "Hot Stove" column via the Anthropic API. It
needs a small local proxy so the API key never lives in the browser:

```
cp .env.example .env        # add your ANTHROPIC_API_KEY
npm run dev:all             # runs the Vite dev server + the proxy together
```

Without this running, Press Box fails gracefully into an in-fiction "the presses jammed" error —
nothing else in the app depends on it.

## Project layout

```
src/
  data/       embedded league data (32 teams, 800 players, 96 coaches), reset-to-Year-1,
              the persistent player pool, and the one-time LSM position migration
  engine/     one module per subsystem — contracts, draft, trades, free agency, playoffs,
              progression, coaching, retirement, roster caps, simulation math, etc.
  pressbox/   prompt builders for the AI-written recap / Hot Stove / weekly-review articles
  components/ presentational React pieces (standings tables, box scores, team logos, ...)
  styles/     the CSS-in-JS design system
  App.jsx     the main component — Exhibition / Season / Playoffs / Standings / Offseason /
              Press Box tabs, wired to everything in src/engine and src/data
scripts/      headless multi-year league simulation harness + a CLI benchmark report
server/       the minimal Node proxy Press Box talks to (keeps the API key server-side)
test/         automated test suite (Node's built-in test runner)
docs/         VPLL_Master_File.md — the canonical rulebook this engine implements — plus
              design specs for individual subsystems
```

## Testing

```
npm test                    # automated suite — data integrity, draft lottery odds, roster
                             #   caps/floor, the player pool, free agency tiers, playoff
                             #   tiebreakers, and a multi-year parity/stability check
npm run lint                # ESLint
npm run build               # production build
npm run simulate:years [n]  # headless N-year benchmark (default 16) — rating spread, coach
                             #   firing rate, champion diversity, roster integrity
```

All four run in CI (`.github/workflows/ci.yml`) on every push and pull request.

## Where to go next

- **`CLAUDE.md`** — the real depth: architectural gotchas, the player data format, the
  roster→rating feedback loop, parity tuning, and everything else worth knowing before changing
  this codebase. Read this before making non-trivial changes.
- **`docs/VPLL_Master_File.md`** — the canonical in-fiction rulebook (league structure, scoring,
  roster tags, cap rules, playoff structure, coaching archetypes) that the engine is built to
  match. When in doubt about what should happen, check here first.
