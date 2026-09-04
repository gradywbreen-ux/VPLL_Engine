// Direct checks for the roster cap/floor rules (src/engine/roster.js):
// DRAFT_ROSTER_CAP (32, post-draft), SEASON_ROSTER_CAP (28, training-camp
// cut before the season opens), MIN_ROSTER_SIZE (24, floor enforced at the
// end of Free Agency), and POSITION_MINIMUMS (never cut a position below
// its floor, never leave a position short of it either). Uses hand-built
// rosters on a real team name rather than a full simulated year, so each
// rule can be proven directly instead of relying on it happening to hold
// after 16 years of essentially-random offseason churn.
import { test } from "node:test";
import assert from "node:assert/strict";

import { PLAYERS_RAW, PLAYER_POOL } from "../src/data/rawData.js";
import {
  cutRosterToSize, enforceRosterFloor, manualCutPlayer, manualSignFromPool,
  DRAFT_ROSTER_CAP, SEASON_ROSTER_CAP, MIN_ROSTER_SIZE, POSITION_MINIMUMS,
} from "../src/engine/roster.js";

const TEAM = "Saint Albans Dawnlanders"; // a real team name — TEAMS[name].conf etc. isn't touched here, but contracts/name-gen code assumes real players

function positionCounts(roster) {
  const counts = {};
  for (const p of roster) counts[p[1]] = (counts[p[1]] || 0) + 1;
  return counts;
}

// player tuple: [name, pos, hand, age, overall, star, leadership, balance, durability, aav, yearsRemaining, contractType, ceiling]
function makePlayer(name, pos, overall) {
  return [name, pos, "R", 26, overall, 0, 50, 5, 60, 20000, 3, "S", null];
}

// PLAYER_POOL is module-level state shared across every test in this file (cutRosterToSize
// pushes into it) — clear it around each test so one test's cuts can't feed the next test's
// claimFromPool()/enforceRosterFloor() calls.
function withFreshRoster(roster, fn) {
  const original = PLAYERS_RAW[TEAM];
  PLAYERS_RAW[TEAM] = roster;
  PLAYER_POOL.length = 0;
  try {
    return fn();
  } finally {
    PLAYERS_RAW[TEAM] = original;
    PLAYER_POOL.length = 0;
  }
}

test("cutRosterToSize trims down to the target size, releasing the lowest overall first", () => {
  // 34 generic midfielders, well clear of every position floor, so the cut
  // is purely a "lowest overall goes first" check.
  const roster = Array.from({ length: 34 }, (_, i) => makePlayer(`Mid ${i}`, "M", 40 + i));
  withFreshRoster(roster, () => {
    const cuts = cutRosterToSize(TEAM, DRAFT_ROSTER_CAP);
    assert.equal(PLAYERS_RAW[TEAM].length, DRAFT_ROSTER_CAP);
    assert.equal(cuts.length, 34 - DRAFT_ROSTER_CAP);
    // every survivor should have overall >= every cut player's overall
    const survivorMin = Math.min(...PLAYERS_RAW[TEAM].map((p) => p[4]));
    const cutMax = Math.max(...cuts.map((c) => c.ovr));
    assert.ok(survivorMin >= cutMax, "cuts should be the weakest players, not arbitrary ones");
  });
});

test("cutRosterToSize never cuts a position below its floor, even if it means keeping a weaker player", () => {
  // Exactly at the goalie floor (2) with a much lower overall than everyone
  // else — a naive "always cut the worst" pass would release a goalie and
  // leave the team with only 1. Target size forces 2 real cuts (28 -> 26),
  // so the floor protection is actually exercised, not vacuously true.
  const roster = [
    ...Array.from({ length: 26 }, (_, i) => makePlayer(`Mid ${i}`, "M", 70)),
    makePlayer("Weak Goalie 1", "G", 30),
    makePlayer("Weak Goalie 2", "G", 31),
  ];
  withFreshRoster(roster, () => {
    const cuts = cutRosterToSize(TEAM, SEASON_ROSTER_CAP - 2);
    assert.equal(cuts.length, 2, "should actually have cut 2 players");
    const counts = positionCounts(PLAYERS_RAW[TEAM]);
    assert.equal(counts.G, POSITION_MINIMUMS.G, "both goalies should survive despite being the lowest-overall players");
  });
});

test("enforceRosterFloor tops a short roster up to MIN_ROSTER_SIZE", () => {
  // Every position floor already met (17 players), plus 3 extra midfielders —
  // 20 total, short only of the overall MIN_ROSTER_SIZE floor, isolating that
  // half of the function from the per-position top-up.
  const roster = [
    ...Array.from({ length: 3 }, (_, i) => makePlayer(`A${i}`, "A", 65)),
    ...Array.from({ length: 8 }, (_, i) => makePlayer(`M${i}`, "M", 65)), // 5 floor + 3 extra
    ...Array.from({ length: 2 }, (_, i) => makePlayer(`L${i}`, "L", 65)),
    ...Array.from({ length: 4 }, (_, i) => makePlayer(`D${i}`, "D", 65)),
    makePlayer("F0", "F", 65),
    ...Array.from({ length: 2 }, (_, i) => makePlayer(`G${i}`, "G", 65)),
  ];
  assert.equal(roster.length, 20);
  withFreshRoster(roster, () => {
    const usedNames = new Set(roster.map((p) => p[0]));
    const signed = enforceRosterFloor(TEAM, usedNames);
    assert.equal(PLAYERS_RAW[TEAM].length, MIN_ROSTER_SIZE);
    assert.equal(signed.length, MIN_ROSTER_SIZE - 20);
    // every signed name should actually be unique and reflected in the roster
    for (const s of signed) assert.ok(PLAYERS_RAW[TEAM].some((p) => p[0] === s.name));
  });
});

test("enforceRosterFloor fills every position group up to its own minimum, not just the total count", () => {
  // 24 players already (meets MIN_ROSTER_SIZE) but zero goalies and zero FOGOs —
  // a total-count-only floor would leave this roster untouched.
  const roster = Array.from({ length: 24 }, (_, i) => makePlayer(`Mid ${i}`, "M", 60));
  withFreshRoster(roster, () => {
    const usedNames = new Set(roster.map((p) => p[0]));
    const signed = enforceRosterFloor(TEAM, usedNames);
    const counts = positionCounts(PLAYERS_RAW[TEAM]);
    for (const [pos, min] of Object.entries(POSITION_MINIMUMS)) {
      assert.ok(counts[pos] >= min, `${pos} should be at least ${min}, got ${counts[pos] || 0}`);
    }
    assert.ok(signed.length > 0, "should have signed emergency journeymen to cover G and F");
    // total floor still respected on top of the position floors
    assert.ok(PLAYERS_RAW[TEAM].length >= MIN_ROSTER_SIZE);
  });
});

test("a roster already within [MIN_ROSTER_SIZE, SEASON_ROSTER_CAP] and meeting every position floor is left untouched", () => {
  const roster = [
    ...Array.from({ length: 3 }, (_, i) => makePlayer(`A${i}`, "A", 65)),
    ...Array.from({ length: 5 }, (_, i) => makePlayer(`M${i}`, "M", 65)),
    ...Array.from({ length: 2 }, (_, i) => makePlayer(`L${i}`, "L", 65)),
    ...Array.from({ length: 4 }, (_, i) => makePlayer(`D${i}`, "D", 65)),
    makePlayer("F0", "F", 65),
    ...Array.from({ length: 2 }, (_, i) => makePlayer(`G${i}`, "G", 65)),
  ]; // 17 players — below MIN_ROSTER_SIZE on purpose, to confirm the *position* floors alone don't block topping up the *total* floor
  withFreshRoster(roster, () => {
    const usedNames = new Set(roster.map((p) => p[0]));
    enforceRosterFloor(TEAM, usedNames);
    assert.equal(PLAYERS_RAW[TEAM].length, MIN_ROSTER_SIZE);
    cutRosterToSize(TEAM, SEASON_ROSTER_CAP); // no-op, already under the cap
    assert.equal(PLAYERS_RAW[TEAM].length, MIN_ROSTER_SIZE);
  });
});

/* ---------- Manual roster moves (task #50) ---------- */

test("manualCutPlayer releases a rostered player into the pool when well above every floor", () => {
  const roster = Array.from({ length: 26 }, (_, i) => makePlayer(`Mid ${i}`, "M", 60 + i));
  withFreshRoster(roster, () => {
    const target = roster[0];
    const result = manualCutPlayer(TEAM, target);
    assert.equal(result.ok, true);
    assert.equal(PLAYERS_RAW[TEAM].length, 25);
    assert.ok(!PLAYERS_RAW[TEAM].includes(target));
    assert.ok(PLAYER_POOL.includes(target), "cut player should land in the pool, not vanish");
  });
});

test("manualCutPlayer refuses to drop a roster below MIN_ROSTER_SIZE", () => {
  const roster = [
    ...Array.from({ length: 3 }, (_, i) => makePlayer(`A${i}`, "A", 65)),
    ...Array.from({ length: 6 }, (_, i) => makePlayer(`M${i}`, "M", 65)),
    ...Array.from({ length: 2 }, (_, i) => makePlayer(`L${i}`, "L", 65)),
    ...Array.from({ length: 4 }, (_, i) => makePlayer(`D${i}`, "D", 65)),
    makePlayer("F0", "F", 65),
    ...Array.from({ length: 8 }, (_, i) => makePlayer(`G${i}`, "G", 65)),
  ]; // exactly MIN_ROSTER_SIZE (24)
  assert.equal(roster.length, MIN_ROSTER_SIZE);
  withFreshRoster(roster, () => {
    const result = manualCutPlayer(TEAM, roster[0]);
    assert.equal(result.ok, false);
    assert.match(result.reason, /roster floor/);
    assert.equal(PLAYERS_RAW[TEAM].length, MIN_ROSTER_SIZE, "refused cut should leave the roster untouched");
  });
});

test("manualCutPlayer refuses to cut a position below its own minimum even with total headcount to spare", () => {
  const roster = [
    ...Array.from({ length: 24 }, (_, i) => makePlayer(`Mid ${i}`, "M", 60)),
    makePlayer("Only Goalie 1", "G", 55),
    makePlayer("Only Goalie 2", "G", 55),
  ]; // 26 total, but goalies sit exactly at POSITION_MINIMUMS.G (2)
  withFreshRoster(roster, () => {
    const result = manualCutPlayer(TEAM, roster.find((p) => p[1] === "G"));
    assert.equal(result.ok, false);
    assert.match(result.reason, /position/);
    assert.equal(PLAYERS_RAW[TEAM].filter((p) => p[1] === "G").length, 2);
  });
});

test("manualCutPlayer reports failure for a player not on the given roster", () => {
  const roster = Array.from({ length: 26 }, (_, i) => makePlayer(`Mid ${i}`, "M", 60));
  withFreshRoster(roster, () => {
    const stranger = makePlayer("Nobody", "M", 60);
    const result = manualCutPlayer(TEAM, stranger);
    assert.equal(result.ok, false);
    assert.equal(PLAYERS_RAW[TEAM].length, 26);
  });
});

test("manualSignFromPool moves a pool player onto the roster under the given cap, with a fresh contract", () => {
  const roster = Array.from({ length: 26 }, (_, i) => makePlayer(`Mid ${i}`, "M", 60));
  withFreshRoster(roster, () => {
    const poolPlayer = makePlayer("Pool Guy", "A", 55);
    PLAYER_POOL.push(poolPlayer);
    const result = manualSignFromPool(TEAM, poolPlayer, DRAFT_ROSTER_CAP);
    assert.equal(result.ok, true);
    assert.equal(PLAYERS_RAW[TEAM].length, 27);
    assert.ok(PLAYERS_RAW[TEAM].includes(poolPlayer));
    assert.ok(!PLAYER_POOL.includes(poolPlayer), "signed player should leave the pool");
    assert.ok(poolPlayer[9] > 0 && poolPlayer[10] > 0, "should be given a real contract, not left with none");
  });
});

test("manualSignFromPool refuses to exceed the given roster cap", () => {
  const roster = Array.from({ length: DRAFT_ROSTER_CAP }, (_, i) => makePlayer(`Mid ${i}`, "M", 60));
  withFreshRoster(roster, () => {
    const poolPlayer = makePlayer("Pool Guy", "A", 55);
    PLAYER_POOL.push(poolPlayer);
    const result = manualSignFromPool(TEAM, poolPlayer, DRAFT_ROSTER_CAP);
    assert.equal(result.ok, false);
    assert.match(result.reason, /cap/);
    assert.equal(PLAYERS_RAW[TEAM].length, DRAFT_ROSTER_CAP, "refused sign should leave the roster untouched");
    assert.ok(PLAYER_POOL.includes(poolPlayer), "refused sign should leave the pool untouched too");
  });
});

test("manualSignFromPool reports failure for a player not actually in the pool", () => {
  const roster = Array.from({ length: 26 }, (_, i) => makePlayer(`Mid ${i}`, "M", 60));
  withFreshRoster(roster, () => {
    const notInPool = makePlayer("Ghost", "A", 55);
    const result = manualSignFromPool(TEAM, notInPool, DRAFT_ROSTER_CAP);
    assert.equal(result.ok, false);
    assert.equal(PLAYERS_RAW[TEAM].length, 26);
  });
});
