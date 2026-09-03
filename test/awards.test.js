// Direct checks for the Awards subsystem (Master File Section 10, src/engine/awards.js).
// Every award scans some or all of the real 32-team league (TEAM_NAMES/PLAYERS_RAW/TEAMS/
// COACHES are live singletons, not injectable), so tests that need full determinism control
// every team's roster for the duration of the test — a bland, low-overall filler roster on
// every team except the one(s) under test, so a real embedded player can never accidentally
// out-score a manufactured test candidate. Awards that only look at one specific team's roster
// (Rookie of the Year, Trophy Finals MVP, the Davidson Award, All-Rookie Team) don't need this —
// their own name/team filters already make them deterministic against a single overridden team.
import { test } from "node:test";
import assert from "node:assert/strict";

import { TEAM_NAMES, PLAYERS_RAW, TEAMS, COACHES } from "../src/data/rawData.js";
import {
  computeMVP, computeOffensivePlayerOfTheYear, computeDefensivePlayerOfTheYear,
  computeMostOutstandingGoalie, computeRookieOfTheYear, computeCoachOfTheYear,
  computeTrophyFinalsMVP, computeDavidsonAward, computeAllVPLLTeams, computeAllRookieTeam,
} from "../src/engine/awards.js";

const TEAM = "Saint Albans Dawnlanders";
const TEAM_B = "Milton Machine"; // a second real team, for tests needing two controlled rosters

// player tuple: [name, pos, hand, age, overall, star, leadership, balance, durability, aav, yearsRemaining, contractType, ceiling]
function makePlayer(name, pos, overall, { star = 0, bal = 5 } = {}) {
  return [name, pos, "R", 26, overall, star, 50, bal, 60, 20000, 3, "S", null];
}

// Deliberately low-overall, no-star filler covering every position — used on every team not
// under test in a full-league scan, so it can never win.
const BLAND_ROSTER = ["A", "A", "M", "M", "M", "L", "L", "D", "D", "F", "G"].map((pos, i) => makePlayer(`Filler ${i}`, pos, 40));

function withFreshRoster(team, roster, fn) {
  const original = PLAYERS_RAW[team];
  PLAYERS_RAW[team] = roster;
  try {
    return fn();
  } finally {
    PLAYERS_RAW[team] = original;
  }
}

// rostersByTeam: { teamName: roster } for the team(s) under test — every other team gets
// BLAND_ROSTER so a full-league scan is fully deterministic.
function withControlledLeague(rostersByTeam, fn) {
  const snapshot = {};
  for (const t of TEAM_NAMES) snapshot[t] = PLAYERS_RAW[t];
  for (const t of TEAM_NAMES) PLAYERS_RAW[t] = rostersByTeam[t] || BLAND_ROSTER.map((p) => [...p]);
  try {
    return fn();
  } finally {
    for (const t of TEAM_NAMES) PLAYERS_RAW[t] = snapshot[t];
  }
}

test("computeMVP favors a comparable player on a weaker-rated team over a slightly-better player on a strong team", () => {
  const originalScore = TEAMS[TEAM].score, originalScoreB = TEAMS[TEAM_B].score;
  TEAMS[TEAM].score = 40; // well below average
  TEAMS[TEAM_B].score = 95; // well above average
  try {
    withControlledLeague(
      {
        [TEAM]: [makePlayer("Underdog Star", "M", 88, { star: 1 })],
        [TEAM_B]: [makePlayer("Stacked Star", "M", 90, { star: 1 })], // higher overall, but on a much stronger-rated team
      },
      () => {
        const mvp = computeMVP();
        assert.equal(mvp.name, "Underdog Star", "the context bonus for a weaker team should let a comparable player win MVP");
      }
    );
  } finally {
    TEAMS[TEAM].score = originalScore;
    TEAMS[TEAM_B].score = originalScoreB;
  }
});

test("computeOffensivePlayerOfTheYear only considers Attack/Midfield", () => {
  withControlledLeague(
    { [TEAM]: [makePlayer("Best Defender", "D", 99, { star: 1 }), makePlayer("Good Attacker", "A", 70)] },
    () => {
      const opoy = computeOffensivePlayerOfTheYear();
      assert.equal(opoy.name, "Good Attacker");
      assert.equal(opoy.pos, "A");
    }
  );
});

test("computeDefensivePlayerOfTheYear only considers Defense/Long-Stick Midfield/FOGO", () => {
  withControlledLeague(
    { [TEAM]: [makePlayer("Best Attacker", "A", 99, { star: 1 }), makePlayer("Good Defender", "D", 70)] },
    () => {
      const dpoy = computeDefensivePlayerOfTheYear();
      assert.equal(dpoy.name, "Good Defender");
      assert.equal(dpoy.pos, "D");
    }
  );
});

test("computeMostOutstandingGoalie only considers Goalies", () => {
  withControlledLeague(
    { [TEAM]: [makePlayer("Best Attacker", "A", 99, { star: 1 }), makePlayer("Good Goalie", "G", 70)] },
    () => {
      const mog = computeMostOutstandingGoalie();
      assert.equal(mog.name, "Good Goalie");
      assert.equal(mog.pos, "G");
    }
  );
});

test("computeRookieOfTheYear only picks from the given rookie name set, regardless of anyone else's overall", () => {
  const roster = [makePlayer("Veteran Star", "M", 99, { star: 1 }), makePlayer("Rookie Prospect", "M", 65)];
  withFreshRoster(TEAM, roster, () => {
    const roy = computeRookieOfTheYear(["Rookie Prospect"]);
    assert.equal(roy.name, "Rookie Prospect");
  });
});

test("computeRookieOfTheYear returns null when no rookie names are given", () => {
  assert.equal(computeRookieOfTheYear([]), null);
  assert.equal(computeRookieOfTheYear(null), null);
});

test("computeCoachOfTheYear picks the largest positive (actual win% - team.score/100) overachievement", () => {
  const originalScore = TEAMS[TEAM].score;
  const originalCoach = { ...COACHES[TEAM] };
  TEAMS[TEAM].score = 30; // low-rated team...
  COACHES[TEAM].hc = "Test Coach";
  COACHES[TEAM].hcArch = "The Builder";
  try {
    // every other team's table entry has gamesPlayed: 0, so it's excluded entirely
    const table = Object.fromEntries(TEAM_NAMES.map((t) => [t, { gamesPlayed: 0, w: 0 }]));
    table[TEAM] = { gamesPlayed: 10, w: 9 }; // ...that won 90% of its games anyway
    const coy = computeCoachOfTheYear(table);
    assert.equal(coy.team, TEAM);
    assert.equal(coy.coach, "Test Coach");
  } finally {
    TEAMS[TEAM].score = originalScore;
    Object.assign(COACHES[TEAM], originalCoach);
  }
});

test("computeTrophyFinalsMVP picks the winning team's best player (star, then overall, then leadership)", () => {
  const roster = [makePlayer("Winner's Best", "A", 85, { star: 1 }), makePlayer("Winner's Bench", "M", 60)];
  withFreshRoster(TEAM, roster, () => {
    const mvp = computeTrophyFinalsMVP({ champion: TEAM });
    assert.equal(mvp.name, "Winner's Best");
    assert.equal(mvp.team, TEAM);
  });
});

test("computeTrophyFinalsMVP returns null when there's no champion yet", () => {
  assert.equal(computeTrophyFinalsMVP({ champion: null }), null);
  assert.equal(computeTrophyFinalsMVP(null), null);
});

test("computeDavidsonAward prefers a balanced (bal >= 5) player even over a higher-overall unbalanced one", () => {
  const roster = [makePlayer("Unbalanced Star", "A", 90, { star: 1, bal: 2 }), makePlayer("Balanced Regular", "M", 75, { bal: 6 })];
  withFreshRoster(TEAM, roster, () => {
    const davidson = computeDavidsonAward(TEAM);
    assert.equal(davidson.name, "Balanced Regular", "poor Indoor/Outdoor Balance should be almost disqualifying");
  });
});

test("computeDavidsonAward falls back to the full roster if nobody clears the balance bar", () => {
  const roster = [makePlayer("Only Option", "A", 80, { star: 1, bal: 1 })];
  withFreshRoster(TEAM, roster, () => {
    const davidson = computeDavidsonAward(TEAM);
    assert.equal(davidson.name, "Only Option", "the award should never come up empty on a real roster");
  });
});

test("computeDavidsonAward returns null without a Cup champion", () => {
  assert.equal(computeDavidsonAward(null), null);
});

test("computeAllVPLLTeams builds an 11-player lineup matching the A/M/L/D/F/G shape, with no player on both teams", () => {
  withControlledLeague({}, () => {
    // BLAND_ROSTER alone (11 players across every position) is enough to fill both First and
    // Second Team without running out of candidates at any position.
    const { firstTeam, secondTeam } = computeAllVPLLTeams();
    assert.equal(firstTeam.length, 11);
    assert.equal(secondTeam.length, 11);
    const counts = (lineup) => {
      const c = {};
      for (const p of lineup) c[p.pos] = (c[p.pos] || 0) + 1;
      return c;
    };
    assert.deepEqual(counts(firstTeam), { A: 2, M: 3, L: 2, D: 2, F: 1, G: 1 });
    assert.deepEqual(counts(secondTeam), { A: 2, M: 3, L: 2, D: 2, F: 1, G: 1 });
    const firstNames = new Set(firstTeam.map((p) => `${p.team} ${p.name}`));
    for (const p of secondTeam) assert.ok(!firstNames.has(`${p.team} ${p.name}`), "no player should appear on both teams");
  });
});

test("computeAllRookieTeam only draws from the rookie name set and matches the standard lineup shape", () => {
  const rookiePositions = ["A", "A", "M", "M", "M", "L", "L", "D", "D", "F", "G"];
  const roster = [
    ...rookiePositions.map((pos, i) => makePlayer(`Rookie ${i}`, pos, 60)),
    makePlayer("Veteran Star", "M", 99, { star: 1 }), // should never be selected — not a rookie
  ];
  withFreshRoster(TEAM, roster, () => {
    const rookieNames = rookiePositions.map((_, i) => `Rookie ${i}`);
    const team = computeAllRookieTeam(rookieNames);
    assert.equal(team.length, 11);
    assert.ok(team.every((p) => p.name.startsWith("Rookie")));
  });
});

test("computeAllRookieTeam returns an empty list with no rookies", () => {
  assert.deepEqual(computeAllRookieTeam([]), []);
});

test("computeMVP skips a player deactivated for this season (Master File 9.8) in favor of the next-best", () => {
  const originalScore = TEAMS[TEAM].score;
  TEAMS[TEAM].score = 50;
  try {
    withControlledLeague(
      { [TEAM]: [makePlayer("Sat Out", "M", 95, { star: 1 }), makePlayer("Played", "M", 70)] },
      () => {
        const deactivated = { [TEAM]: ["Sat Out"] };
        const mvp = computeMVP(deactivated);
        assert.equal(mvp.name, "Played", "a deactivated player should never win an award for a season they didn't play");
      }
    );
  } finally {
    TEAMS[TEAM].score = originalScore;
  }
});

test("computeTrophyFinalsMVP skips a deactivated player on the champion roster", () => {
  const roster = [makePlayer("Sat Out", "A", 95, { star: 1 }), makePlayer("Played", "M", 60)];
  withFreshRoster(TEAM, roster, () => {
    const mvp = computeTrophyFinalsMVP({ champion: TEAM }, { [TEAM]: ["Sat Out"] });
    assert.equal(mvp.name, "Played");
  });
});

test("computeAllVPLLTeams and computeAllRookieTeam exclude deactivated players from consideration", () => {
  withControlledLeague({}, () => {
    // Deactivate one of BLAND_ROSTER's own goalies so the position must be filled by
    // whatever real fallback exists — the deactivated name should never appear.
    const deactivated = { [TEAM_NAMES[0]]: ["Filler 10"] }; // index 10 is the "G" entry in BLAND_ROSTER
    const { firstTeam } = computeAllVPLLTeams(deactivated);
    const names = firstTeam.map((p) => `${p.team} ${p.name}`);
    assert.ok(!names.includes(`${TEAM_NAMES[0]} Filler 10`));
  });
});
