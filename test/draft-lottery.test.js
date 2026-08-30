// Statistical check for the NBA-style draft lottery (buildDraftOrder in
// src/engine/draft.js). The lottery draws picks 1-8 from the 16-team
// conference-split pool using a FIXED weight per pre-lottery rank
// (LOTTERY_WEIGHTS, worst team first) — a team isn't reweighted just
// because a worse team got drawn ahead of it, same as the real NBA board.
// A single simulated year is too noisy to prove this (16 lottery teams,
// 1 draw), so this runs a large batch of draws directly and checks pick-1
// frequency against the intended odds, plus a couple of structural
// invariants a regression could plausibly break silently.
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildDraftOrder, LOTTERY_WEIGHTS } from "../src/engine/draft.js";
import { TEAMS, TEAM_NAMES } from "../src/data/rawData.js";

const lakeTeams = TEAM_NAMES.filter((t) => TEAMS[t].conf === "Lake");
const mounTeams = TEAM_NAMES.filter((t) => TEAMS[t].conf === "Moun");

// Ranks teams worst-to-best within their own conference via points, exactly
// like buildDraftOrder does, so points-per-team below double as pool rank.
const standings = [
  ...lakeTeams.map((team, idx) => ({ team, points: idx })),
  ...mounTeams.map((team, idx) => ({ team, points: idx })),
];

// Re-derive the same worst-first 16-team lottery pool buildDraftOrder
// computes internally, so results can be labeled by pool rank (0 = worst
// record in the pool, 15 = best record still in the pool).
function lotteryPoolRanks() {
  const byConf = {};
  for (const e of standings) {
    const conf = TEAMS[e.team].conf;
    (byConf[conf] = byConf[conf] || []).push(e);
  }
  for (const k of Object.keys(byConf)) byConf[k].sort((a, b) => a.points - b.points);
  const pool = Object.values(byConf).flatMap((arr) => arr.slice(0, 8));
  pool.sort((a, b) => a.points - b.points);
  return new Map(pool.map((e, idx) => [e.team, idx]));
}

test("draft lottery pool is 16 teams (8 per conference), rest fall in standings order", () => {
  const order = buildDraftOrder(standings);
  assert.equal(order.length, 32);
  assert.equal(new Set(order).size, 32); // no duplicates, no missing team

  const rankOf = lotteryPoolRanks();
  const first16 = order.slice(0, 16);
  // Every one of the first 16 picks must actually be a lottery-pool team —
  // the non-lottery "rest" teams should never be interleaved in front of a
  // lottery team, since picks 9-16 are exactly the undrawn lottery teams.
  for (const team of first16) assert.ok(rankOf.has(team), `${team} should be in the lottery pool`);

  // Picks 17-32 are the non-lottery teams, in their original worst-first
  // combined-standings order (untouched by the weighted drawing).
  const nonLottery = standings.filter((e) => !rankOf.has(e.team)).sort((a, b) => a.points - b.points);
  assert.deepEqual(order.slice(16), nonLottery.map((e) => e.team));
});

test("pick-1 odds match the fixed NBA-style weight table over a large sample", () => {
  const rankOf = lotteryPoolRanks();
  const N = 60000;
  const counts = new Array(16).fill(0);
  for (let i = 0; i < N; i++) {
    const winner = buildDraftOrder(standings)[0];
    counts[rankOf.get(winner)]++;
  }
  const totalWeight = LOTTERY_WEIGHTS.reduce((a, b) => a + b, 0);
  for (let rank = 0; rank < 16; rank++) {
    const expected = LOTTERY_WEIGHTS[rank] / totalWeight;
    const observed = counts[rank] / N;
    // Generous absolute tolerance (this project has no seeded PRNG) — still
    // tight enough to catch a wrong formula (e.g. reverting to linear rank
    // weighting), not just sampling noise.
    assert.ok(
      Math.abs(observed - expected) < 0.02,
      `pool rank ${rank}: expected ~${(expected * 100).toFixed(2)}%, observed ${(observed * 100).toFixed(2)}%`
    );
  }
});

test("the three worst records in the pool have equal (flattened) pick-1 odds", () => {
  assert.equal(LOTTERY_WEIGHTS[0], LOTTERY_WEIGHTS[1]);
  assert.equal(LOTTERY_WEIGHTS[1], LOTTERY_WEIGHTS[2]);
  // ...and odds strictly taper afterward, same shape as the real NBA board.
  for (let i = 2; i < LOTTERY_WEIGHTS.length - 1; i++) {
    assert.ok(LOTTERY_WEIGHTS[i] > LOTTERY_WEIGHTS[i + 1], `weight should strictly decrease after index 2 (at ${i})`);
  }
});
