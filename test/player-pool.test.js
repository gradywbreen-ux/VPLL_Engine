// Direct checks for the persistent player pool (Master File 9.5,
// src/engine/roster.js): cuts feed the pool instead of vanishing, claims
// prefer real pool players over generating new ones, the roster-floor
// guard never lets a team dip below MIN_ROSTER_SIZE even for one tick, and
// maintainPlayerPool() ages/retires/caps the pool so it doesn't grow
// forever. Uses hand-built rosters/pools on a real team name so each rule
// can be proven directly rather than relying on it happening to hold after
// years of essentially-random offseason churn.
import { test } from "node:test";
import assert from "node:assert/strict";

import { PLAYERS_RAW, PLAYER_POOL } from "../src/data/rawData.js";
import {
  cutRosterToSize, claimFromPool, claimOrGenerate, enforceRosterFloor, ensureFloorBeforeRemoval,
  maintainPlayerPool, DRAFT_ROSTER_CAP, SEASON_ROSTER_CAP, MIN_ROSTER_SIZE, MAX_POOL_PER_POSITION,
} from "../src/engine/roster.js";

const TEAM = "Saint Albans Dawnlanders";

// player tuple: [name, pos, hand, age, overall, star, leadership, balance, durability, aav, yearsRemaining, contractType, ceiling]
function makePlayer(name, pos, overall, age = 26) {
  return [name, pos, "R", age, overall, 0, 50, 5, 60, 20000, 3, "S", null];
}

function withFreshState(roster, pool, fn) {
  const originalRoster = PLAYERS_RAW[TEAM];
  PLAYERS_RAW[TEAM] = roster;
  PLAYER_POOL.length = 0;
  PLAYER_POOL.push(...pool);
  try {
    return fn();
  } finally {
    PLAYERS_RAW[TEAM] = originalRoster;
    PLAYER_POOL.length = 0;
  }
}

test("cutRosterToSize feeds cut players into the persistent pool instead of discarding them", () => {
  const roster = Array.from({ length: 34 }, (_, i) => makePlayer(`Mid ${i}`, "M", 40 + i));
  withFreshState(roster, [], () => {
    const cuts = cutRosterToSize(TEAM, DRAFT_ROSTER_CAP);
    assert.equal(PLAYER_POOL.length, cuts.length);
    for (const c of cuts) assert.ok(PLAYER_POOL.some((p) => p[0] === c.name), `${c.name} should have landed in the pool`);
  });
});

test("claimFromPool prefers an exact position match, highest overall first", () => {
  const pool = [makePlayer("Weak D", "D", 40), makePlayer("Strong D", "D", 70), makePlayer("Strong M", "M", 90)];
  withFreshState([], pool, () => {
    const claimed = claimFromPool("D");
    assert.equal(claimed[0], "Strong D");
    assert.equal(PLAYER_POOL.length, 2); // removed from the pool on claim
  });
});

test("claimFromPool falls back to the best player at any position when no exact match exists", () => {
  const pool = [makePlayer("Only M", "M", 55)];
  withFreshState([], pool, () => {
    const claimed = claimFromPool("G");
    assert.equal(claimed[0], "Only M");
    assert.equal(PLAYER_POOL.length, 0);
  });
});

test("claimFromPool returns null on an empty pool", () => {
  withFreshState([], [], () => {
    assert.equal(claimFromPool("A"), null);
  });
});

test("claimOrGenerate prefers the pool over generating a new player", () => {
  const pool = [makePlayer("Pool Goalie", "G", 60)];
  withFreshState([], pool, () => {
    const usedNames = new Set();
    const { player, source } = claimOrGenerate("G", usedNames);
    assert.equal(source, "pool");
    assert.equal(player[0], "Pool Goalie");
  });
});

test("claimOrGenerate falls back to generating only when the pool has nothing", () => {
  withFreshState([], [], () => {
    const usedNames = new Set();
    const { player, source } = claimOrGenerate("G", usedNames);
    assert.equal(source, "generated");
    assert.equal(player[1], "G");
    assert.ok(usedNames.has(player[0]));
  });
});

test("ensureFloorBeforeRemoval backfills before a removal that would cross MIN_ROSTER_SIZE, and no-ops otherwise", () => {
  const roster = Array.from({ length: MIN_ROSTER_SIZE }, (_, i) => makePlayer(`P${i}`, "M", 60));
  const pool = [makePlayer("Reserve D", "D", 55)];
  withFreshState(roster, pool, () => {
    const usedNames = new Set(roster.map((p) => p[0]));
    // At exactly MIN_ROSTER_SIZE — removing one more would cross the floor, so this should backfill.
    const backfill = ensureFloorBeforeRemoval(TEAM, "D", usedNames);
    assert.ok(backfill, "should have backfilled");
    assert.equal(backfill.name, "Reserve D");
    assert.equal(PLAYERS_RAW[TEAM].length, MIN_ROSTER_SIZE + 1);

    // Now well clear of the floor — should no-op.
    const noop = ensureFloorBeforeRemoval(TEAM, "D", usedNames);
    assert.equal(noop, null);
    assert.equal(PLAYERS_RAW[TEAM].length, MIN_ROSTER_SIZE + 1);
  });
});

test("a full retirement-style removal loop never lets the roster dip below MIN_ROSTER_SIZE, even momentarily", () => {
  // Exactly at the floor. Simulate 3 players "retiring" one at a time, guarding each removal —
  // the roster count should never be observed below MIN_ROSTER_SIZE at any point.
  const roster = Array.from({ length: MIN_ROSTER_SIZE }, (_, i) => makePlayer(`P${i}`, "M", 60));
  const pool = [makePlayer("R1", "M", 50), makePlayer("R2", "M", 51), makePlayer("R3", "M", 52)];
  withFreshState(roster, pool, () => {
    const usedNames = new Set(roster.map((p) => p[0]));
    const liveRoster = PLAYERS_RAW[TEAM];
    const observedSizes = [];
    for (let i = 0; i < 3; i++) {
      const vacatingPos = liveRoster[liveRoster.length - 1][1];
      ensureFloorBeforeRemoval(TEAM, vacatingPos, usedNames);
      liveRoster.splice(liveRoster.length - 2, 1); // remove the "retiree" (the backfill was pushed to the end)
      observedSizes.push(liveRoster.length);
    }
    for (const size of observedSizes) assert.ok(size >= MIN_ROSTER_SIZE, `roster size ${size} dipped below the floor`);
  });
});

test("enforceRosterFloor pulls from the pool before generating, per position", () => {
  const roster = Array.from({ length: 22 }, (_, i) => makePlayer(`M${i}`, "M", 60)); // short of every non-M floor
  const pool = [makePlayer("Pool Goalie 1", "G", 65), makePlayer("Pool Goalie 2", "G", 66)];
  withFreshState(roster, pool, () => {
    const usedNames = new Set(roster.map((p) => p[0]));
    const signed = enforceRosterFloor(TEAM, usedNames);
    const goalieSignings = signed.filter((s) => s.pos === "G");
    assert.equal(goalieSignings.length, 2);
    assert.ok(goalieSignings.every((s) => s.source === "pool"), "both goalies should have come from the pool, not been generated");
  });
});

test("maintainPlayerPool ages every pool player by one year", () => {
  const pool = [makePlayer("Young Prospect", "A", 60, 22)];
  withFreshState([], pool, () => {
    maintainPlayerPool();
    assert.equal(PLAYER_POOL.find((p) => p[0] === "Young Prospect")[3], 23);
  });
});

test("maintainPlayerPool eventually retires eligible veterans out of the pool", () => {
  // evaluateRetirement is probabilistic even at advanced ages — use a large batch and a generous
  // statistical bound (mirrors the draft-lottery test's approach) rather than asserting an exact count.
  const pool = Array.from({ length: 200 }, (_, i) => makePlayer(`Vet ${i}`, "M", 55, 45));
  withFreshState([], pool, () => {
    maintainPlayerPool();
    // chance formula at age 45 is ~0.70 before durability/leadership adjustments — expect a
    // clear majority gone, not none and not necessarily all.
    assert.ok(PLAYER_POOL.length < 150, `expected most of 200 age-45 players to retire out, ${PLAYER_POOL.length} remained`);
  });
});

test("maintainPlayerPool caps the pool at MAX_POOL_PER_POSITION per position, keeping the strongest", () => {
  const pool = Array.from({ length: MAX_POOL_PER_POSITION + 10 }, (_, i) => makePlayer(`A${i}`, "A", 30 + i, 24));
  withFreshState([], pool, () => {
    maintainPlayerPool();
    const atPos = PLAYER_POOL.filter((p) => p[1] === "A");
    assert.equal(atPos.length, MAX_POOL_PER_POSITION);
    // the highest-overall players (30+10..30+18, i.e. the last MAX_POOL_PER_POSITION generated) should have survived
    const kept = new Set(atPos.map((p) => p[4]));
    for (let ovr = 30 + 10; ovr < 30 + 10 + MAX_POOL_PER_POSITION; ovr++) assert.ok(kept.has(ovr), `overall ${ovr} should have survived the cap`);
  });
});
