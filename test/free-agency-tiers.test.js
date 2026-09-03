// Direct checks for the Free Agency Tier/Market Dynamics spec
// (docs/VPLL_Free_Agency_Tiers_Spec.md), implemented in src/engine/freeAgency.js
// and src/engine/trades.js. Uses hand-built players/rosters on real team names so
// each mechanic — tiering, position scarcity, tier-biased motivation, coach-fit and
// cap-pressure signing pressure, and the salary-dump trade trigger — can be proven
// directly, the same approach used for the draft lottery odds and the roster
// cap/floor rules elsewhere in this suite.
import { test } from "node:test";
import assert from "node:assert/strict";

import { TEAMS, COACHES, PLAYERS_RAW } from "../src/data/rawData.js";
import { SALARY_CAP, capFine } from "../src/engine/contracts.js";
import { HC_TAG_FIT } from "../src/engine/simulation.js";
import {
  freeAgentTier, pickMotivation, projectedCapFine, reSignChance, runFreeAgency,
} from "../src/engine/freeAgency.js";
import { runTradeEngine } from "../src/engine/trades.js";

const TEAM = "Saint Albans Dawnlanders";

// player tuple: [name, pos, hand, age, overall, star, leadership, balance, durability, aav, yearsRemaining, contractType, ceiling, hometown]
function makePlayer(name, pos, overall, { star = 0, aav = 20000, age = 27, hometown = null } = {}) {
  return [name, pos, "R", age, overall, star, 50, 5, 60, aav, 3, "S", null, hometown];
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

test("freeAgentTier buckets by overall + star flag per the spec's table", () => {
  assert.equal(freeAgentTier(makePlayer("Star", "M", 90, { star: 1 })), 1); // Franchise
  assert.equal(freeAgentTier(makePlayer("NonStarHighOvr", "M", 90, { star: 0 })), 2); // star flag required for Tier 1
  assert.equal(freeAgentTier(makePlayer("Starter", "M", 80)), 2); // Quality Starter
  assert.equal(freeAgentTier(makePlayer("Rotational", "M", 68)), 3);
  assert.equal(freeAgentTier(makePlayer("Journeyman", "M", 50)), 4);
});

test("position scarcity nudges a boundary player into a higher tier for G/F/L but not other positions", () => {
  // overall 71 alone is Tier 3 (62-74): 71 * {G/F: 1.08, L: 1.06} rounds to 77/77/75,
  // just crossing the Tier 2 floor (75) for every scarce position, while an
  // identical-overall Midfielder (no boost) stays at 71, still Tier 3.
  assert.equal(freeAgentTier(makePlayer("Plain Mid", "M", 71)), 3);
  assert.equal(freeAgentTier(makePlayer("Scarce Goalie", "G", 71)), 2);
  assert.equal(freeAgentTier(makePlayer("Scarce Fogo", "F", 71)), 2);
  assert.equal(freeAgentTier(makePlayer("Scarce Lsm", "L", 71)), 2);
});

test("pickMotivation matches the tier-based distribution over a large sample", () => {
  const N = 20000;
  function sample(tier) {
    const counts = { Loyalist: 0, Mercenary: 0, Winner: 0 };
    for (let i = 0; i < N; i++) counts[pickMotivation(tier)]++;
    return counts;
  }
  const tier1 = sample(1); // 35/35/30
  assert.ok(Math.abs(tier1.Loyalist / N - 0.35) < 0.02);
  assert.ok(Math.abs(tier1.Mercenary / N - 0.35) < 0.02);
  assert.ok(Math.abs(tier1.Winner / N - 0.30) < 0.02);

  const tier4 = sample(4); // 80/10/10
  assert.ok(Math.abs(tier4.Loyalist / N - 0.80) < 0.02);
  assert.ok(Math.abs(tier4.Mercenary / N - 0.10) < 0.02);
  assert.ok(Math.abs(tier4.Winner / N - 0.10) < 0.02);
});

test("projectedCapFine matches capFine() computed against the projected payroll", () => {
  const roster = [makePlayer("P1", "M", 70, { aav: 1_900_000 })]; // team payroll = 1.9M
  withFreshRoster(roster, () => {
    // 1.9M + 200k = 2.1M -> 5% over cap -> still the 0-5% safe zone -> 0 fine
    assert.equal(projectedCapFine(TEAM, 200_000), 0);
    // 1.9M + 400k = 2.3M -> 15% over cap -> 50% of the 300k overage = 150k
    assert.equal(projectedCapFine(TEAM, 400_000), capFine(2_300_000));
    assert.equal(projectedCapFine(TEAM, 400_000), Math.round((2_300_000 - SALARY_CAP) * 0.50));
  });
});

test("reSignChance never fully blocks a re-sign even under severe cap pressure, but meaningfully reduces the odds", () => {
  const roomy = [makePlayer("P1", "M", 70, { aav: 100_000 })]; // tiny payroll, huge room — cap pressure comes from the projected AAV argument below, not the roster
  const standings = { [TEAM]: { points: 10 } };

  withFreshRoster(roomy, () => {
    const safeChance = reSignChance("Mercenary", TEAM, standings, 50_000); // barely moves payroll
    const severeChance = reSignChance("Mercenary", TEAM, standings, 5_000_000); // wildly over cap
    assert.ok(severeChance < safeChance, "a projected signing that blows way past the cap should be less likely than a safe one");
    assert.ok(severeChance >= 0.03, "should never be reduced to literally impossible");
  });
});

test("reSignChance rewards a coach whose archetype fits the team's tag, and penalizes a mismatch", () => {
  const standings = { [TEAM]: { points: 10 } };
  const originalCoach = { ...COACHES[TEAM] };
  const originalTag = TEAMS[TEAM].tag;
  try {
    // Pick a tag with a known fitting archetype and a known non-fitting one.
    const tag = Object.keys(HC_TAG_FIT)[0];
    const fittingArch = HC_TAG_FIT[tag][0];
    const mismatchArch = Object.values(HC_TAG_FIT).flat().find((a) => !HC_TAG_FIT[tag].includes(a));
    TEAMS[TEAM].tag = tag;

    COACHES[TEAM].hcArch = fittingArch;
    const fitChance = reSignChance("Loyalist", TEAM, standings, 20_000);

    COACHES[TEAM].hcArch = mismatchArch;
    const mismatchChance = reSignChance("Loyalist", TEAM, standings, 20_000);

    assert.ok(fitChance > mismatchChance, "a coach-fit team should re-sign more readily than a mismatched one");
  } finally {
    Object.assign(COACHES[TEAM], originalCoach);
    TEAMS[TEAM].tag = originalTag;
  }
});

test("runTradeEngine's salary-dump phase moves a team's highest-AAV player when they're paying a luxury fine", () => {
  // Give the team a payroll well into the worst fine tier (30%+ over cap) so
  // capFine(...) > 0 is guaranteed, then run the engine many times (phase 3 is
  // chance-gated) and confirm a salary-dump trade actually fires for this team
  // a meaningful fraction of the time, moving the correct (highest-AAV) player.
  //
  // runTradeEngine mutates PLAYERS_RAW for whichever teams it trades between — not
  // just TEAM (phases 1/2 can move players on any team) — so every trial restores
  // the *entire* league's rosters from a deep-cloned snapshot, not just TEAM's.
  // Realistic AAVs (contracts.js's baseSalaryFromOverall tops out well under $300k for a
  // single player) — the fine comes from the roster summing well past the cap, not from
  // any one player costing more than the whole cap, which would make no destination team
  // ever have enough room to take them on.
  const bigRoster = [
    makePlayer("Expensive Star", "A", 75, { aav: 200_000, star: 0 }), // non-star: keeps phase 1 (unhappy stars) out of play
    ...Array.from({ length: 24 }, (_, i) => makePlayer(`Filler ${i}`, "M", 60, { aav: 110_000 })),
  ];
  const totalPayroll = 200_000 + 24 * 110_000;
  assert.ok(capFine(totalPayroll) > 0, "test setup should actually be in a fine tier");

  // Real original state for every team (including TEAM) — this is what gets restored
  // when the test is done, regardless of pass/fail.
  const originalLeague = JSON.parse(JSON.stringify(PLAYERS_RAW));

  let dumpedCount = 0;
  const N = 60;
  try {
    for (let i = 0; i < N; i++) {
      for (const t of Object.keys(originalLeague)) {
        PLAYERS_RAW[t].length = 0;
        PLAYERS_RAW[t].push(...JSON.parse(JSON.stringify(t === TEAM ? bigRoster : originalLeague[t])));
      }
      const standings = Object.fromEntries(Object.keys(TEAMS).map((t) => [t, { points: 10, w: 5, l: 5, otl: 0 }]));
      const trades = runTradeEngine(standings);
      const dump = trades.find((t) => t.reason.startsWith("salary dump") && (t.teamA === TEAM || t.teamB === TEAM));
      if (dump) {
        dumpedCount++;
        const dumpedName = dump.teamA === TEAM ? dump.playerA : dump.playerB;
        assert.equal(dumpedName, "Expensive Star", "the highest-AAV movable player should be the one dumped");
      }
    }
  } finally {
    for (const t of Object.keys(originalLeague)) {
      PLAYERS_RAW[t].length = 0;
      PLAYERS_RAW[t].push(...originalLeague[t]);
    }
  }
  assert.ok(dumpedCount > 0, "a team deep in a luxury-tax fine should shed salary at least sometimes across 60 trials");
});

test("reSignChance gives a homegrown player (hometown === team) a bump over an identical player from elsewhere", () => {
  const standings = { [TEAM]: { points: 10 } };
  const homegrown = reSignChance("Loyalist", TEAM, standings, 20_000, makePlayer("Local Hero", "M", 70, { hometown: TEAM }));
  const outsider = reSignChance("Loyalist", TEAM, standings, 20_000, makePlayer("Outsider", "M", 70, { hometown: "Rutland Cryptids" }));
  const noPlayer = reSignChance("Loyalist", TEAM, standings, 20_000);
  assert.ok(homegrown > outsider, "a player re-signing with their own hometown team should be more likely to stay");
  assert.equal(outsider, noPlayer, "an omitted player and a non-hometown player should behave identically");
});

test("runFreeAgency's signed entries each carry a runnersUp list from the real multi-team bidding pass", () => {
  const standings = Object.fromEntries(
    Object.keys(TEAMS).map((t) => [t, { points: Math.round(Math.random() * 30), w: 5, l: 5, otl: 0 }])
  );
  const originalLeague = JSON.parse(JSON.stringify(PLAYERS_RAW));
  try {
    const result = runFreeAgency(standings);
    assert.ok(Array.isArray(result.signed));
    for (const entry of result.signed) {
      assert.ok(Array.isArray(entry.runnersUp), "every signing should record which other bidders it beat out (possibly empty)");
    }
  } finally {
    for (const t of Object.keys(originalLeague)) {
      PLAYERS_RAW[t].length = 0;
      PLAYERS_RAW[t].push(...originalLeague[t]);
    }
  }
});
