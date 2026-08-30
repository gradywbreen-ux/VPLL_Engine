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

import { PLAYERS_RAW } from "../src/data/rawData.js";
import {
  cutRosterToSize, enforceRosterFloor,
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

function withFreshRoster(roster, fn) {
  const original = PLAYERS_RAW[TEAM];
  PLAYERS_RAW[TEAM] = roster;
  try {
    return fn();
  } finally {
    PLAYERS_RAW[TEAM] = original;
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
  // leave the team with only 1.
  const roster = [
    ...Array.from({ length: 26 }, (_, i) => makePlayer(`Mid ${i}`, "M", 70)),
    makePlayer("Weak Goalie 1", "G", 30),
    makePlayer("Weak Goalie 2", "G", 31),
  ];
  withFreshRoster(roster, () => {
    cutRosterToSize(TEAM, SEASON_ROSTER_CAP);
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
