// Direct checks for Deactivation Lists (Master File 9.8), src/engine/deactivation.js.
// Uses a hand-built roster on a real team name so the misfit-selection, the 5-player
// cap, and the position-floor safety net can each be proven directly.
import { test } from "node:test";
import assert from "node:assert/strict";

import { PLAYERS_RAW } from "../src/data/rawData.js";
import { POSITION_MINIMUMS } from "../src/engine/roster.js";
import { computeDeactivations, computeAllDeactivations } from "../src/engine/deactivation.js";

const TEAM = "Saint Albans Dawnlanders";

// player tuple: [name, pos, hand, age, overall, star, leadership, bal, durability, aav, yearsRemaining, contractType, ceiling, hometown]
function makePlayer(name, pos, bal) {
  return [name, pos, "R", 26, 60, 0, 50, bal, 60, 20000, 3, "S", null, null];
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

test("computeDeactivations sits indoor specialists (high bal) for Corkum and outdoor specialists (low bal) for Culkin", () => {
  const roster = [
    makePlayer("Indoor Specialist", "A", 9),
    makePlayer("Outdoor Specialist", "A", 1),
    makePlayer("Neutral", "A", 5),
    // extra "A" surplus above POSITION_MINIMUMS.A so deactivating a misfit never trips the floor guard
    ...Array.from({ length: POSITION_MINIMUMS.A }, (_, i) => makePlayer(`Attack Anchor ${i}`, "A", 5)),
    ...Array.from({ length: 10 }, (_, i) => makePlayer(`Filler ${i}`, "M", 5)),
  ];
  withFreshRoster(roster, () => {
    const corkum = computeDeactivations(TEAM, false); // outdoor season — indoor-only misfits sit
    assert.ok(corkum.includes("Indoor Specialist"));
    assert.ok(!corkum.includes("Outdoor Specialist"));
    assert.ok(!corkum.includes("Neutral"));

    const culkin = computeDeactivations(TEAM, true); // indoor season — outdoor-only misfits sit
    assert.ok(culkin.includes("Outdoor Specialist"));
    assert.ok(!culkin.includes("Indoor Specialist"));
    assert.ok(!culkin.includes("Neutral"));
  });
});

test("computeDeactivations never exceeds MAX_DEACTIVATIONS (5)", () => {
  const roster = [
    ...Array.from({ length: 8 }, (_, i) => makePlayer(`Misfit ${i}`, "M", 9)),
    ...Array.from({ length: 6 }, (_, i) => makePlayer(`Anchor ${i}`, "M", 5)),
  ];
  withFreshRoster(roster, () => {
    const deactivated = computeDeactivations(TEAM, false);
    assert.ok(deactivated.length <= 5);
  });
});

test("computeDeactivations never drops an active position group below POSITION_MINIMUMS", () => {
  // Exactly at the goalie floor (2) and both are indoor-only misfits for a Corkum season —
  // neither can be deactivated without leaving the team with zero active goalies.
  const roster = [
    makePlayer("Goalie A", "G", 9),
    makePlayer("Goalie B", "G", 9),
    ...Array.from({ length: 10 }, (_, i) => makePlayer(`Filler ${i}`, "M", 5)),
  ];
  withFreshRoster(roster, () => {
    const deactivated = computeDeactivations(TEAM, false);
    assert.ok(!deactivated.includes("Goalie A"));
    assert.ok(!deactivated.includes("Goalie B"));
  });
});

test("computeDeactivations respects POSITION_MINIMUMS with a surplus above the floor", () => {
  // 3 indoor-misfit goalies, floor is 2 -> exactly one can sit, not both/all.
  const roster = [
    makePlayer("Goalie A", "G", 9),
    makePlayer("Goalie B", "G", 9),
    makePlayer("Goalie C", "G", 9),
    ...Array.from({ length: 10 }, (_, i) => makePlayer(`Filler ${i}`, "M", 5)),
  ];
  withFreshRoster(roster, () => {
    const deactivated = computeDeactivations(TEAM, false).filter((n) => n.startsWith("Goalie"));
    assert.equal(deactivated.length, 3 - POSITION_MINIMUMS.G);
  });
});

test("computeAllDeactivations returns an entry for every team", () => {
  const all = computeAllDeactivations(false);
  assert.equal(Object.keys(all).length, Object.keys(PLAYERS_RAW).length);
  for (const list of Object.values(all)) assert.ok(Array.isArray(list));
});
