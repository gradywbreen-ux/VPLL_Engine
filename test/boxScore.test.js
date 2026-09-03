// Direct checks for box score attribution (src/engine/boxScore.js) — goals/assists plus
// the three additions from task #43 (face-offs, caused turnovers, goalie shots/saves).
// None of these are literal simulated events (this engine has no per-possession play-by-play —
// see CLAUDE.md), so these tests prove the *shape* and *weighting* of the attribution, not that
// any specific play "really happened."
import { test } from "node:test";
import assert from "node:assert/strict";

import { TEAMS, PLAYERS_RAW } from "../src/data/rawData.js";
import {
  attributeGoals, attributeFaceoffs, attributeCausedTurnovers, attributeGoalieStats, computeGameBoxScore,
} from "../src/engine/boxScore.js";

const TEAM = "Saint Albans Dawnlanders";
const TEAM_B = "Milton Machine";

// player tuple: [name, pos, hand, age, overall, star, leadership, balance, durability, aav, yearsRemaining, contractType, ceiling, hometown, id]
function makePlayer(name, pos, overall, id) {
  return [name, pos, "R", 26, overall, 0, 50, 5, 60, 20000, 3, "S", null, null, id];
}

function withFreshRoster(team, roster, fn) {
  const original = PLAYERS_RAW[team];
  PLAYERS_RAW[team] = roster;
  try {
    return fn();
  } finally {
    PLAYERS_RAW[team] = original;
  }
}

function withTeamRatings(team, patch, fn) {
  const original = { ...TEAMS[team] };
  Object.assign(TEAMS[team], patch);
  try {
    return fn();
  } finally {
    Object.keys(patch).forEach((k) => { TEAMS[team][k] = original[k]; });
  }
}

test("attributeGoals returns one entry per goal, each carrying a scorer id", () => {
  const roster = [makePlayer("Scorer", "A", 80, "p1"), makePlayer("Passer", "M", 70, "p2")];
  withFreshRoster(TEAM, roster, () => {
    const goals = attributeGoals(TEAM, 6, false);
    assert.equal(goals.length, 6);
    for (const g of goals) {
      assert.ok(g.scorerId, "every goal should carry a resolvable scorer id");
      assert.ok(["Scorer", "Passer"].includes(g.scorer));
    }
  });
});

test("attributeGoals' two-point flag lands on exactly one goal, restricted to Attack/Midfield", () => {
  const roster = [makePlayer("Attacker", "A", 80, "p1"), makePlayer("Defender", "D", 80, "p2")];
  withFreshRoster(TEAM, roster, () => {
    const goals = attributeGoals(TEAM, 5, true);
    const twoPointers = goals.filter((g) => g.twoPoint);
    assert.equal(twoPointers.length, 1);
    assert.equal(twoPointers[0].pos, "A", "the only eligible scorer for the 2-pointer is the Attacker");
  });
});

test("attributeFaceoffs distributes every draw to a home or away FOGO and the stronger team wins more over a large sample", () => {
  const homeRoster = [makePlayer("Home Fogo", "F", 70, "hf1")];
  const awayRoster = [makePlayer("Away Fogo", "F", 70, "af1")];
  withFreshRoster(TEAM, homeRoster, () => withFreshRoster(TEAM_B, awayRoster, () => {
    withTeamRatings(TEAM, { fofClm: 10, fofCon: 10 }, () => withTeamRatings(TEAM_B, { fofClm: 1, fofCon: 1 }, () => {
      let homeWonTotal = 0, homeTotalTotal = 0;
      for (let i = 0; i < 30; i++) {
        const { home, away } = attributeFaceoffs(TEAM, TEAM_B, false);
        assert.equal(home.length, 1); assert.equal(away.length, 1);
        assert.equal(home[0].total, away[0].total, "every draw the away FOGO lost is one the home FOGO won, so totals match");
        homeWonTotal += home[0].won; homeTotalTotal += home[0].total;
      }
      assert.ok(homeWonTotal / homeTotalTotal > 0.5, "the far-stronger home faceoff team should win a clear majority of draws");
    }));
  }));
});

test("attributeFaceoffs skips a team with no rostered FOGO rather than throwing", () => {
  withFreshRoster(TEAM, [makePlayer("Attacker", "A", 70, "a1")], () => withFreshRoster(TEAM_B, [makePlayer("Away Fogo", "F", 70, "af1")], () => {
    const { home, away } = attributeFaceoffs(TEAM, TEAM_B, false);
    assert.deepEqual(home, []);
    assert.ok(away.length >= 0);
  }));
});

test("attributeCausedTurnovers only attributes to Defense/Long-Stick Midfield", () => {
  const roster = [makePlayer("Attacker", "A", 90, "a1"), makePlayer("Defender", "D", 60, "d1"), makePlayer("Lsm", "L", 60, "l1")];
  withFreshRoster(TEAM, roster, () => withFreshRoster(TEAM_B, [makePlayer("Opp", "A", 60, "o1")], () => {
    const { home } = attributeCausedTurnovers(TEAM, TEAM_B, false);
    for (const ct of home) assert.ok(["D", "L"].includes(ct.pos));
  }));
});

test("attributeGoalieStats: saves never exceed shots faced, and shots faced always exceeds goals allowed", () => {
  withFreshRoster(TEAM, [makePlayer("Netminder", "G", 75, "g1")], () => {
    for (let i = 0; i < 20; i++) {
      const stats = attributeGoalieStats(TEAM, TEAM_B, 8, false);
      assert.ok(stats.shotsFaced > stats.goalsAllowed);
      assert.equal(stats.saves, stats.shotsFaced - stats.goalsAllowed);
      assert.ok(stats.saves >= 0);
    }
  });
});

test("attributeGoalieStats returns null for a team with no rostered goalie", () => {
  withFreshRoster(TEAM, [makePlayer("Attacker", "A", 70, "a1")], () => {
    assert.equal(attributeGoalieStats(TEAM, TEAM_B, 8, false), null);
  });
});

test("computeGameBoxScore returns a fully-shaped result for both sides", () => {
  const homeRoster = [
    makePlayer("H Attacker", "A", 75, "ha1"), makePlayer("H Fogo", "F", 70, "hf1"),
    makePlayer("H Defender", "D", 70, "hd1"), makePlayer("H Goalie", "G", 70, "hg1"),
  ];
  const awayRoster = [
    makePlayer("A Attacker", "A", 75, "aa1"), makePlayer("A Fogo", "F", 70, "af1"),
    makePlayer("A Defender", "D", 70, "ad1"), makePlayer("A Goalie", "G", 70, "ag1"),
  ];
  withFreshRoster(TEAM, homeRoster, () => withFreshRoster(TEAM_B, awayRoster, () => {
    const box = computeGameBoxScore(TEAM, TEAM_B, false, { homeScore: 10, awayScore: 8, homeTwoPointGoal: false, awayTwoPointGoal: false });
    assert.equal(box.home.goals.length, 10);
    assert.equal(box.away.goals.length, 8);
    assert.ok(box.home.goalie && box.away.goalie);
    assert.equal(box.home.goalie.goalsAllowed, 8, "the home goalie allowed the away team's score");
    assert.equal(box.away.goalie.goalsAllowed, 10, "the away goalie allowed the home team's score");
  }));
});
