// Direct checks for the roster→rating feedback loop (src/engine/ratings.js) and its
// wiring into manual roster moves (src/engine/roster.js, task #50). CLAUDE.md flags this
// mechanism as easy to break in a specific way — pulling team.score toward the raw roster
// average instead of roster strength RELATIVE to the league average caused a real
// league-wide drift bug once already — so these tests prove both the direction/magnitude
// of the pull and, explicitly, the relative-vs-absolute distinction, rather than relying
// on the 16-year benchmark to notice drift after the fact.
//
// Also proves the actual end-to-end claim: a manual cut/sign (roster.js's
// manualCutPlayer()/manualSignFromPool()) changes PLAYERS_RAW in place, and
// pullRatingsTowardRoster() — the same call applyLeagueProgression() makes for every
// team once the Commissioner clicks "Apply Progression" — picks that change straight
// up, exactly like it already does for a trade or a draft pick.
import { test } from "node:test";
import assert from "node:assert/strict";

import { TEAMS, PLAYERS_RAW, PLAYER_POOL, TEAM_NAMES } from "../src/data/rawData.js";
import {
  pullRatingsTowardRoster, avgOverallByPosition, weakestPosition, strongestPosition,
  POSITION_GROUP_SUBCATS, ROSTER_PULL_WEIGHT,
} from "../src/engine/ratings.js";
import { manualCutPlayer, manualSignFromPool, DRAFT_ROSTER_CAP } from "../src/engine/roster.js";
import { clamp10 } from "../src/engine/mathHelpers.js";

const TEAM = "Saint Albans Dawnlanders"; // a real team name — TEAMS[name] needs every real subcat key

// player tuple: [name, pos, hand, age, overall, star, leadership, balance, durability, aav, yearsRemaining, contractType, ceiling]
function makePlayer(name, pos, overall, age = 26) {
  return [name, pos, "R", age, overall, 0, 50, 5, 60, 20000, 3, "S", null];
}

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

// Restores every key on TEAMS[TEAM] afterward (not just the overridden ones) since
// pullRatingsTowardRoster touches many subcats plus score in one call.
function withTeamState(overrides, fn) {
  const original = { ...TEAMS[TEAM] };
  Object.assign(TEAMS[TEAM], overrides);
  try {
    return fn();
  } finally {
    Object.assign(TEAMS[TEAM], original);
  }
}

/* ---------- avgOverallByPosition ---------- */

test("avgOverallByPosition averages overall by position and returns null for an empty group", () => {
  const roster = [makePlayer("A1", "A", 40), makePlayer("A2", "A", 60), makePlayer("A3", "A", 80)];
  withFreshRoster(roster, () => {
    const groups = avgOverallByPosition(TEAM);
    assert.equal(groups.A, 60);
    assert.equal(groups.D, null, "a position with nobody rostered should be null, not 0 or NaN");
  });
});

/* ---------- pullRatingsTowardRoster: direction + magnitude on subcats ---------- */

test("pullRatingsTowardRoster raises a position's subcats toward a strong roster group", () => {
  const roster = [makePlayer("Star1", "A", 99), makePlayer("Star2", "A", 99)];
  withFreshRoster(roster, () => {
    withTeamState({ offPos: 5, offRisk: 5 }, () => {
      pullRatingsTowardRoster(TEAM);
      const target = clamp10((99 - 35) / 64 * 9 + 1);
      const expected = clamp10(5 * (1 - ROSTER_PULL_WEIGHT) + target * ROSTER_PULL_WEIGHT);
      assert.ok(TEAMS[TEAM].offPos > 5, "a 99-overall Attack group should pull offPos up, not down");
      assert.equal(Math.round(TEAMS[TEAM].offPos * 100), Math.round(expected * 100), "should match the documented blend formula exactly");
      assert.equal(Math.round(TEAMS[TEAM].offRisk * 100), Math.round(expected * 100), "every subcat mapped to Attack should move by the same blend");
    });
  });
});

test("pullRatingsTowardRoster lowers a position's subcats toward a weak roster group", () => {
  const roster = [makePlayer("Scrub1", "D", 35), makePlayer("Scrub2", "D", 35)];
  withFreshRoster(roster, () => {
    withTeamState({ defPos: 8, defRisk: 8 }, () => {
      pullRatingsTowardRoster(TEAM);
      assert.ok(TEAMS[TEAM].defPos < 8, "a 35-overall Defense group should pull defPos down, not up");
      assert.ok(TEAMS[TEAM].defRisk < 8);
    });
  });
});

test("pullRatingsTowardRoster leaves a position's subcats untouched when nobody is rostered there", () => {
  const roster = [makePlayer("OnlyMid", "M", 70)]; // no goalies rostered
  withFreshRoster(roster, () => {
    withTeamState({ glcStp: 6, glcCon: 6, glcPas: 6 }, () => {
      pullRatingsTowardRoster(TEAM);
      assert.equal(TEAMS[TEAM].glcStp, 6, "no goalie on the roster means no Goalie-group pull this call");
      assert.equal(TEAMS[TEAM].glcCon, 6);
      assert.equal(TEAMS[TEAM].glcPas, 6);
    });
  });
});

test("every POSITION_GROUP_SUBCATS entry is a real, settable key on a team object", () => {
  const team = TEAMS[TEAM_NAMES[0]];
  for (const subcats of Object.values(POSITION_GROUP_SUBCATS)) {
    for (const key of subcats) assert.ok(key in team, `${key} should be a real TEAMS field`);
  }
});

/* ---------- pullRatingsTowardRoster: team.score is pulled toward RELATIVE roster
   strength, not the raw roster average — the exact bug class CLAUDE.md documents ---------- */

test("pullRatingsTowardRoster does not chase the roster's raw overall number — a roster exactly at the league-average relative strength barely moves score off its blend toward the league MEAN SCORE", () => {
  // Give TEAM a single-player roster whose overall is set so that this team's roster
  // average lands exactly at the mean of the other 31 teams' roster averages — i.e.
  // relative roster strength ~0. If the pull were toward the raw absolute roster
  // average (the old buggy behavior), team.score would drift toward that roster
  // overall number itself (systematically higher than the score scale, per CLAUDE.md).
  // Pulling toward RELATIVE strength instead should land it at the blend toward the
  // league's mean SCORE, regardless of how high the roster-overall numbers run.
  const otherTeams = TEAM_NAMES.filter((n) => n !== TEAM);
  const otherRosterAvgs = otherTeams.map((n) => {
    const r = PLAYERS_RAW[n];
    return r.reduce((s, p) => s + p[4], 0) / r.length;
  });
  const meanOfOthers = otherRosterAvgs.reduce((a, b) => a + b, 0) / otherRosterAvgs.length;
  const leagueMeanScore = TEAM_NAMES.reduce((s, n) => s + TEAMS[n].score, 0) / TEAM_NAMES.length;

  const roster = [makePlayer("Solo", "M", Math.round(meanOfOthers))];
  withFreshRoster(roster, () => {
    withTeamState({ score: 40 }, () => {
      pullRatingsTowardRoster(TEAM);
      // Recompute the implementation's own formula with this exact roster to account for
      // the rounding on meanOfOthers, then assert the actual result matches it exactly —
      // a regression test for the formula — AND that it lands close to the mean-score
      // blend rather than anywhere near the (much higher) roster-overall number.
      const rosterAvgOvr = roster[0][4];
      const leagueMeanRosterOvr = (otherRosterAvgs.reduce((a, b) => a + b, 0) + rosterAvgOvr) / TEAM_NAMES.length;
      const impliedScore = leagueMeanScore + (rosterAvgOvr - leagueMeanRosterOvr);
      const expected = Math.max(35, Math.min(99, Math.round(40 * (1 - ROSTER_PULL_WEIGHT) + impliedScore * ROSTER_PULL_WEIGHT)));
      assert.equal(TEAMS[TEAM].score, expected, "should match the documented relative-strength formula exactly");
      assert.ok(
        Math.abs(TEAMS[TEAM].score - expected) <= 1 && Math.abs(expected - Math.round(40 * (1 - ROSTER_PULL_WEIGHT) + leagueMeanScore * ROSTER_PULL_WEIGHT)) <= 2,
        "at ~zero relative roster strength, the result should be close to the mean-SCORE blend, not the (much higher) mean-roster-overall number"
      );
    });
  });
});

test("pullRatingsTowardRoster raises team.score for a roster well ABOVE league-average relative strength, and lowers it for one well below — same starting score, opposite roster strength", () => {
  const leagueMeanScore = TEAM_NAMES.reduce((s, n) => s + TEAMS[n].score, 0) / TEAM_NAMES.length;
  const strongRoster = Array.from({ length: 20 }, (_, i) => makePlayer(`S${i}`, "M", 95));
  const weakRoster = Array.from({ length: 20 }, (_, i) => makePlayer(`W${i}`, "M", 38));

  const scoreAfterStrong = withFreshRoster(strongRoster, () => withTeamState({ score: Math.round(leagueMeanScore) }, () => {
    pullRatingsTowardRoster(TEAM);
    return TEAMS[TEAM].score;
  }));
  const scoreAfterWeak = withFreshRoster(weakRoster, () => withTeamState({ score: Math.round(leagueMeanScore) }, () => {
    pullRatingsTowardRoster(TEAM);
    return TEAMS[TEAM].score;
  }));

  assert.ok(scoreAfterStrong > Math.round(leagueMeanScore), "a far-above-average roster should pull score up from a league-average starting point");
  assert.ok(scoreAfterWeak < Math.round(leagueMeanScore), "a far-below-average roster should pull score down from a league-average starting point");
  assert.ok(scoreAfterStrong > scoreAfterWeak);
});

/* ---------- weakestPosition / strongestPosition ---------- */

test("weakestPosition and strongestPosition identify the real extremes", () => {
  const roster = [
    makePlayer("Weak", "D", 30), makePlayer("Weak2", "D", 32),
    makePlayer("Strong", "A", 95), makePlayer("Strong2", "A", 97),
    makePlayer("Mid", "M", 60),
  ];
  withFreshRoster(roster, () => {
    assert.equal(weakestPosition(TEAM), "D");
    assert.equal(strongestPosition(TEAM), "A");
  });
});

/* ---------- End-to-end: a manual roster move actually reaches ratings ---------- */

test("a manual cut that guts a position's roster quality is picked up by pullRatingsTowardRoster, exactly like Progression applies it for every team", () => {
  // Two strong attackers and enough depth everywhere else to stay clear of every
  // floor. Cutting the stronger of the two should measurably drop the Attack-group
  // subcats once pullRatingsTowardRoster runs — the same call applyLeagueProgression()
  // makes for every team when the Commissioner clicks "Apply Progression".
  const roster = [
    makePlayer("Star Attacker", "A", 95), makePlayer("Good Attacker", "A", 75),
    makePlayer("Filler Attacker 1", "A", 55), makePlayer("Filler Attacker 2", "A", 55), // A=4, well above the 3-player floor
    ...Array.from({ length: 12 }, (_, i) => makePlayer(`M${i}`, "M", 60)), // extra depth just to clear MIN_ROSTER_SIZE overall
    ...Array.from({ length: 2 }, (_, i) => makePlayer(`L${i}`, "L", 60)),
    ...Array.from({ length: 4 }, (_, i) => makePlayer(`D${i}`, "D", 60)),
    makePlayer("F0", "F", 60),
    ...Array.from({ length: 2 }, (_, i) => makePlayer(`G${i}`, "G", 60)),
  ];
  assert.ok(roster.length > 24, "fixture needs to clear MIN_ROSTER_SIZE with room for one cut");
  withFreshRoster(roster, () => {
    withTeamState({ offPos: 6, offRisk: 6 }, () => {
      const result = manualCutPlayer(TEAM, roster[0]); // release the 95-overall attacker
      assert.equal(result.ok, true);
      pullRatingsTowardRoster(TEAM);
      // Remaining Attack group is just the 75-overall player, well below the 95+75
      // average the roster started with, so the pull target — and thus offPos/offRisk —
      // should have dropped versus what a 95-and-75 Attack group would have produced.
      const groups = avgOverallByPosition(TEAM);
      assert.equal(groups.A, (75 + 55 + 55) / 3, "the cut player should be gone from the roster average");
      assert.ok(TEAMS[TEAM].offPos < 6 || TEAMS[TEAM].offRisk < 6, "losing the stronger attacker should pull Attack subcats down, not leave them untouched");
    });
  });
});

test("a manual sign that upgrades a position's roster quality is picked up by pullRatingsTowardRoster the same way", () => {
  const roster = [
    makePlayer("Weak Attacker", "A", 45),
    ...Array.from({ length: 5 }, (_, i) => makePlayer(`M${i}`, "M", 60)),
    ...Array.from({ length: 2 }, (_, i) => makePlayer(`L${i}`, "L", 60)),
    ...Array.from({ length: 4 }, (_, i) => makePlayer(`D${i}`, "D", 60)),
    makePlayer("F0", "F", 60),
    ...Array.from({ length: 2 }, (_, i) => makePlayer(`G${i}`, "G", 60)),
  ];
  withFreshRoster(roster, () => {
    const poolStar = makePlayer("Pool Star Attacker", "A", 98);
    PLAYER_POOL.push(poolStar);
    withTeamState({ offPos: 4, offRisk: 4 }, () => {
      const result = manualSignFromPool(TEAM, poolStar, DRAFT_ROSTER_CAP);
      assert.equal(result.ok, true);
      pullRatingsTowardRoster(TEAM);
      const groups = avgOverallByPosition(TEAM);
      assert.equal(groups.A, (45 + 98) / 2, "the signed player should now count toward the Attack average");
      assert.ok(TEAMS[TEAM].offPos > 4 && TEAMS[TEAM].offRisk > 4, "adding a 98-overall attacker should pull Attack subcats up");
    });
  });
});
