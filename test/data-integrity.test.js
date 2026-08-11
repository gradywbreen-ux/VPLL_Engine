// Basic sanity checks on the embedded league data and schedule generator.
// Run with: npm test
// This is a starting point, not the full test suite CLAUDE.md's "Testing
// Workflow" section calls for (multi-year parity/stability, roster integrity
// across trades) — those need real simulation runs and belong in follow-up
// test files alongside this one.
import { test } from "node:test";
import assert from "node:assert/strict";

import { TEAMS, PLAYERS_RAW, COACHES, TEAM_NAMES } from "../src/data/rawData.js";
import { generateFullSchedule } from "../src/engine/schedule.js";

test("league data matches the documented Year 1 shape", () => {
  assert.equal(TEAM_NAMES.length, 32, "expected 32 teams");
  assert.equal(Object.keys(COACHES).length, 32, "expected 32 coaching staffs (96 coaches: hc/oc/dc each)");
  const totalPlayers = Object.values(PLAYERS_RAW).reduce((sum, roster) => sum + roster.length, 0);
  assert.equal(totalPlayers, 800, "expected 800 players league-wide");
});

test("every team has a name, division, and score", () => {
  for (const name of TEAM_NAMES) {
    const t = TEAMS[name];
    assert.ok(t.conf === "Lake" || t.conf === "Moun", `${name} has an unexpected conference`);
    assert.ok(t.div, `${name} missing division`);
    assert.ok(typeof t.score === "number", `${name} missing numeric score`);
  }
});

test("no duplicate player names within a single roster", () => {
  for (const name of TEAM_NAMES) {
    const roster = PLAYERS_RAW[name];
    const seen = new Set(roster.map((p) => p[0]));
    assert.equal(seen.size, roster.length, `${name} roster has a duplicate player name`);
  }
});

test("generateFullSchedule produces a balanced 256-game, 13-week season", () => {
  const schedule = generateFullSchedule();
  assert.equal(schedule.length, 256, "expected 256 games");
  const weeks = new Set(schedule.map((g) => g.week));
  for (let w = 1; w <= 13; w++) assert.ok(weeks.has(w), `week ${w} has no games scheduled`);
  for (const g of schedule) {
    assert.notEqual(g.home, g.away, "a team cannot play itself");
    assert.ok(TEAM_NAMES.includes(g.home) && TEAM_NAMES.includes(g.away));
  }
});
