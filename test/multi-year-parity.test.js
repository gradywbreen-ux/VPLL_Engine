// Multi-year parity/stability test — formalizes CLAUDE.md's "Testing Workflow"
// manual benchmark (16 simulated years) as real npm test coverage.
//
// Design goal being tested (per the Commissioner): dynasties should be
// POSSIBLE but not GUARANTEED, with a solid amount of league-wide parity.
// Concretely:
//   - parity: rating spread stays bounded (neither collapses to sameness nor
//     diverges into a permanent aristocracy), and a meaningful number of
//     distinct teams cycle through the top-5 and bottom-5 over the run
//   - dynasties possible: champions repeat sometimes (a team CAN go back to
//     back, or win several titles across the run)
//   - dynasties not guaranteed: no single team wins every single year, and
//     no team runs away with most of the league's titles
//
// This is a real 16-year simulation (both seasons, both playoffs, all six
// offseason steps) run with the engine's actual Math.random() — there's no
// seeded PRNG in this codebase, so bounds below are deliberately generous
// versus the tighter numbers CLAUDE.md documents from its last tuning pass,
// to keep this test's false-failure rate low while still catching a real
// regression (e.g. the roster-rating drift bug, or a "same team always
// wins" parity break). One assertion (a champion repeats at least once
// across 16 years) has an inherent ~1-2% chance of a spurious failure on
// a genuinely healthy league, purely from randomness — see the comment
// there. If this test fails, re-run it once before assuming a regression;
// consistent failures point to a real bug.
import { test } from "node:test";
import assert from "node:assert/strict";

import { TEAM_NAMES } from "../src/data/rawData.js";
import { simulateYears } from "../scripts/lib/simulateLeague.mjs";

const YEARS = 16;
const years = simulateYears(YEARS);

test("no roster/rating integrity violations across the full run", () => {
  const allViolations = years.flatMap((y) => y.rosterIntegrityViolations.map((v) => `Year ${y.year}: ${v}`));
  assert.deepEqual(allViolations, [], "roster or team-rating data became corrupted during the run");
});

test("rating spread (parity) stays in a healthy band — neither collapses nor diverges", () => {
  const sds = years.map((y) => y.ratingSD);
  const minSD = Math.min(...sds), maxSD = Math.max(...sds);
  // CLAUDE.md's validated 16-year pass held 6.9-10.0; these bounds are padded
  // to absorb normal run-to-run variance from an unseeded RNG.
  assert.ok(minSD > 2, `rating SD dropped to ${minSD.toFixed(2)} — teams are converging toward sameness (parity collapse)`);
  assert.ok(maxSD < 20, `rating SD rose to ${maxSD.toFixed(2)} — teams are diverging into a permanent aristocracy`);
});

test("league-wide rating mean stays roughly level (zero-sum progression, no systemic drift)", () => {
  const firstMean = years[0].ratingMean;
  const lastMean = years[years.length - 1].ratingMean;
  const drift = Math.abs(lastMean - firstMean);
  // Guards against reintroducing the absolute-vs-relative roster-pull drift
  // bug CLAUDE.md describes — a real regression there causes steady,
  // compounding upward drift, not just a few points of run-to-run noise.
  assert.ok(drift < 15, `league mean rating drifted ${drift.toFixed(1)} points over ${YEARS} years (${firstMean.toFixed(1)} -> ${lastMean.toFixed(1)}) — looks like systemic drift, not noise`);
});

test("coach firing rate stays plausible — coaches get fired sometimes, not always or never", () => {
  const totalFires = years.reduce((s, y) => s + y.coachesFired, 0);
  const teamSeasons = YEARS * TEAM_NAMES.length;
  const rate = totalFires / teamSeasons;
  // Benchmark ~6%; generously bounded here to avoid flakiness.
  assert.ok(rate > 0.005, `coach firing rate ${(rate * 100).toFixed(1)}% is implausibly low — firing may be broken`);
  assert.ok(rate < 0.30, `coach firing rate ${(rate * 100).toFixed(1)}% is implausibly high — coaches are being fired far too often`);
});

test("parity: a meaningful number of distinct teams cycle through the top-5 and bottom-5", () => {
  const top5Union = new Set(years.flatMap((y) => y.top5));
  const bottom5Union = new Set(years.flatMap((y) => y.bottom5));
  // Benchmark: 23/32 and 20/32 over 16yr. Require at least a third of the
  // league to have touched each over the run — a permanent-aristocracy
  // regression would show only ~5 teams ever touching top-5.
  assert.ok(top5Union.size >= 12, `only ${top5Union.size}/32 teams ever reached the top-5 over ${YEARS} years — looks like a permanent aristocracy`);
  assert.ok(bottom5Union.size >= 12, `only ${bottom5Union.size}/32 teams ever fell into the bottom-5 over ${YEARS} years — looks like a permanent underclass`);
});

test("dynasties are not guaranteed: no single team wins every year or dominates the league's titles", () => {
  const cupChampCounts = {};
  for (const y of years) cupChampCounts[y.cupChampion] = (cupChampCounts[y.cupChampion] || 0) + 1;
  const maxTitles = Math.max(...Object.values(cupChampCounts));
  assert.ok(maxTitles < YEARS, `one team (${Object.entries(cupChampCounts).find(([, c]) => c === maxTitles)[0]}) won the Commissioners Cup every single year — dynasties are not supposed to be guaranteed`);
  // No team should run away with the majority of titles across the run.
  assert.ok(maxTitles <= Math.ceil(YEARS * 0.6), `one team won ${maxTitles}/${YEARS} Cups — that's dominance, not "possible but not guaranteed"`);
});

test("dynasties are possible: champions repeat at some point across the run", () => {
  // ~1-2% inherent chance of a spurious failure on a genuinely healthy
  // league (16 independent-ish draws from 32 teams can, rarely, come up
  // all-distinct) — see file header. A consistent failure across re-runs
  // means the mechanism is (accidentally) forcing champion rotation.
  const distinctCupChampions = new Set(years.map((y) => y.cupChampion)).size;
  assert.ok(distinctCupChampions < YEARS, "every single year had a different Commissioners Cup champion — repeat champions (dynasties) never occurred across 16 years, which is suspiciously perfect rotation");
});
