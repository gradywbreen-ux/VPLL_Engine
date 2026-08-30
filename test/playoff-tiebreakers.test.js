// Deterministic checks for the Master File 2.3/2.4 tiebreaker cascade:
// Overall Record -> Conference Record -> Head to Head (among the teams
// still tied at that point) -> Goal Differential -> Goals For. Uses
// hand-built standings/schedule/results fixtures rather than a real
// simulation run, so each criterion's effect can be isolated and proven —
// a multi-year benchmark run could easily "pass" by accident without ever
// actually exercising Conference Record or Head to Head.
import { test } from "node:test";
import assert from "node:assert/strict";

import { rankDivision, betterSeed } from "../src/engine/playoffs.js";

// All four real Lakeshore/Coastal teams — keeps TEAMS[name].conf lookups
// inside the tiebreaker functions resolving against real data.
const SA = "Saint Albans Dawnlanders";
const MM = "Milton Machine";
const GI = "Grand Isle Heroes";
const MB = "Missisquoi Bay Muskies";
const COLCHESTER = "Colchester Gryphons"; // Lake / Metro West — intra-conference, outside the Coastal group
const QUEEN_CITY = "Queen City Battery";  // Lake / Metro West — same

test("Conference Record breaks a tie in Overall Record", () => {
  const table = {
    [SA]: { points: 10, gd: 0, gf: 0 },
    [MM]: { points: 10, gd: 0, gf: 0 },
  };
  // SA has one intra-conference win outside the pair; MM has none.
  const schedule = [{ id: 1, home: SA, away: COLCHESTER, week: 1 }];
  const results = { 1: { homeScore: 10, awayScore: 5 } };

  assert.equal(betterSeed(table, SA, MM, schedule, results), SA);
  assert.deepEqual(rankDivision(table, [MM, SA], schedule, results), [SA, MM]);
});

test("Head to Head breaks a tie in both Overall Record and Conference Record", () => {
  const table = {
    // MM has the better Goal Differential, deliberately — if the cascade
    // wrongly fell through to GD instead of using Head to Head, MM (not
    // SA) would win, so this discriminates a real fix from a fallback
    // that only coincidentally looks right.
    [SA]: { points: 10, gd: 0, gf: 0 },
    [MM]: { points: 10, gd: 10, gf: 0 },
  };
  const schedule = [
    { id: 1, home: SA, away: MM, week: 1 },         // their head-to-head meeting
    { id: 2, home: MM, away: COLCHESTER, week: 2 },  // MM's compensating conference win
  ];
  const results = {
    1: { homeScore: 8, awayScore: 5 },  // SA beats MM
    2: { homeScore: 12, awayScore: 4 }, // MM beats Colchester
  };
  // Conference Record: SA = 1 (beat MM). MM = 0 (lost to SA) + 1 (beat Colchester) = 1. Tied.
  // Head to Head (SA vs MM only): SA 1, MM 0 -> SA should win the tiebreak.

  assert.equal(betterSeed(table, SA, MM, schedule, results), SA);
  assert.deepEqual(rankDivision(table, [MM, SA], schedule, results), [SA, MM]);
});

test("a 3-way Head to Head tie is resolved among just the tied teams, not the whole division", () => {
  const table = {
    [SA]: { points: 10, gd: 0, gf: 0 },
    [MM]: { points: 10, gd: 0, gf: 0 },
    [GI]: { points: 10, gd: 0, gf: 0 },
    [MB]: { points: 4, gd: 0, gf: 0 }, // not tied with the other three at all
  };
  const schedule = [
    { id: 1, home: SA, away: MM, week: 1 },
    { id: 2, home: SA, away: GI, week: 2 },
    { id: 3, home: MM, away: GI, week: 3 },
    { id: 4, home: MM, away: COLCHESTER, week: 4 },  // compensating conference win
    { id: 5, home: GI, away: COLCHESTER, week: 5 },  // compensating conference win
    { id: 6, home: GI, away: QUEEN_CITY, week: 6 },  // compensating conference win
    // MB beats all three of the tied trio — if the tiebreak incorrectly
    // computed Head to Head across the whole division instead of just the
    // tied group, these results would corrupt the SA/MM/GI ordering.
    { id: 7, home: MB, away: SA, week: 7 },
    { id: 8, home: MB, away: MM, week: 8 },
    { id: 9, home: MB, away: GI, week: 9 },
  ];
  const results = {
    1: { homeScore: 10, awayScore: 5 }, // SA beats MM
    2: { homeScore: 10, awayScore: 5 }, // SA beats GI
    3: { homeScore: 10, awayScore: 5 }, // MM beats GI
    4: { homeScore: 10, awayScore: 5 }, // MM beats Colchester
    5: { homeScore: 10, awayScore: 5 }, // GI beats Colchester
    6: { homeScore: 10, awayScore: 5 }, // GI beats Queen City
    7: { homeScore: 10, awayScore: 5 }, // MB beats SA
    8: { homeScore: 10, awayScore: 5 }, // MB beats MM
    9: { homeScore: 10, awayScore: 5 }, // MB beats GI
  };
  // Conference Record, all three tied at 2: SA (beat MM, beat GI, lost to
  // MB); MM (lost to SA, beat GI, beat Colchester, lost to MB); GI (lost to
  // SA, lost to MM, beat Colchester, beat Queen City, lost to MB).
  // Head to Head among {SA, MM, GI} only (games 1-3): SA 2-0, MM 1-1, GI 0-2.

  assert.deepEqual(
    rankDivision(table, [MB, GI, MM, SA], schedule, results),
    [SA, MM, GI, MB]
  );
});
