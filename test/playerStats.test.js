// Direct checks for season/career stat accumulation and leaderboards
// (src/engine/playerStats.js), task #43.
import { test } from "node:test";
import assert from "node:assert/strict";

import { CAREER_STATS } from "../src/data/rawData.js";
import { accumulateGameStats, subtractSeasonFromCareer, topByStat, foPct, savePct } from "../src/engine/playerStats.js";

function makeGoalBox(scorerId, scorerName, pos, assistId = null, assistName = null, assistPos = null, twoPoint = false) {
  return { scorer: scorerName, scorerId, pos, assist: assistName, assistId, assistPos, twoPoint };
}

function withCleanCareerStats(fn) {
  const snapshot = { ...CAREER_STATS };
  Object.keys(CAREER_STATS).forEach((k) => delete CAREER_STATS[k]);
  try {
    return fn();
  } finally {
    Object.keys(CAREER_STATS).forEach((k) => delete CAREER_STATS[k]);
    Object.assign(CAREER_STATS, snapshot);
  }
}

test("accumulateGameStats sums goals, assists, and points into both the season store and CAREER_STATS", () => {
  withCleanCareerStats(() => {
    const seasonStats = {};
    const box = {
      home: {
        goals: [
          makeGoalBox("p1", "Scorer", "A", "p2", "Passer", "M"),
          makeGoalBox("p1", "Scorer", "A", null, null, null, true),
        ],
        faceoffs: [], turnovers: [], goalie: null,
      },
      away: { goals: [], faceoffs: [], turnovers: [], goalie: null },
    };
    accumulateGameStats(seasonStats, box, "Home Team", "Away Team");
    assert.equal(seasonStats.p1.g, 2);
    assert.equal(seasonStats.p1.twoPt, 1);
    assert.equal(seasonStats.p1.pts, 2);
    assert.equal(seasonStats.p2.a, 1);
    assert.equal(seasonStats.p2.pts, 1);
    assert.equal(CAREER_STATS.p1.g, 2);
    assert.equal(CAREER_STATS.p2.a, 1);
  });
});

test("two different players who happen to share a name accumulate separately, keyed by id not name", () => {
  withCleanCareerStats(() => {
    const seasonStats = {};
    const box = {
      home: { goals: [makeGoalBox("id-old-retiree", "Steve Smith", "A")], faceoffs: [], turnovers: [], goalie: null },
      away: { goals: [makeGoalBox("id-new-draftee", "Steve Smith", "M")], faceoffs: [], turnovers: [], goalie: null },
    };
    accumulateGameStats(seasonStats, box, "Team A", "Team B");
    assert.equal(seasonStats["id-old-retiree"].g, 1);
    assert.equal(seasonStats["id-new-draftee"].g, 1);
    assert.notEqual(seasonStats["id-old-retiree"], seasonStats["id-new-draftee"], "same name, different id, must not merge");
  });
});

test("accumulateGameStats folds face-offs, caused turnovers, and goalie shots/saves", () => {
  withCleanCareerStats(() => {
    const seasonStats = {};
    const box = {
      home: {
        goals: [],
        faceoffs: [{ id: "fo1", name: "Fogo", pos: "F", won: 8, total: 12 }],
        turnovers: [{ id: "d1", name: "Defender", pos: "D", ct: 3 }],
        goalie: { id: "g1", name: "Goalie", pos: "G", saves: 22, shotsFaced: 25, goalsAllowed: 3 },
      },
      away: { goals: [], faceoffs: [], turnovers: [], goalie: null },
    };
    accumulateGameStats(seasonStats, box, "Home Team", "Away Team");
    assert.equal(seasonStats.fo1.foWon, 8);
    assert.equal(seasonStats.fo1.foTotal, 12);
    assert.equal(foPct(seasonStats.fo1), 8 / 12);
    assert.equal(seasonStats.d1.ct, 3);
    assert.equal(seasonStats.g1.sv, 22);
    assert.equal(seasonStats.g1.sa, 25);
    assert.equal(seasonStats.g1.ga, 3);
    assert.equal(savePct(seasonStats.g1), 22 / 25);
  });
});

test("foPct/savePct return 0 rather than NaN on zero attempts", () => {
  assert.equal(foPct({ foWon: 0, foTotal: 0 }), 0);
  assert.equal(savePct({ sv: 0, sa: 0 }), 0);
});

test("subtractSeasonFromCareer reverses accumulateGameStats' effect and removes an emptied line", () => {
  withCleanCareerStats(() => {
    const seasonStats = {};
    const box = { home: { goals: [makeGoalBox("p1", "Scorer", "A")], faceoffs: [], turnovers: [], goalie: null }, away: { goals: [], faceoffs: [], turnovers: [], goalie: null } };
    accumulateGameStats(seasonStats, box, "Home Team", "Away Team");
    assert.equal(CAREER_STATS.p1.g, 1);
    subtractSeasonFromCareer(seasonStats);
    assert.equal(CAREER_STATS.p1, undefined, "a career line with nothing left should be removed, not left at all-zero");
  });
});

test("subtractSeasonFromCareer only removes what this season actually contributed, leaving prior years intact", () => {
  withCleanCareerStats(() => {
    const seasonOneStats = {};
    const box1 = { home: { goals: [makeGoalBox("p1", "Scorer", "A")], faceoffs: [], turnovers: [], goalie: null }, away: { goals: [], faceoffs: [], turnovers: [], goalie: null } };
    accumulateGameStats(seasonOneStats, box1, "Home Team", "Away Team");

    const seasonTwoStats = {};
    const box2 = { home: { goals: [makeGoalBox("p1", "Scorer", "A")], faceoffs: [], turnovers: [], goalie: null }, away: { goals: [], faceoffs: [], turnovers: [], goalie: null } };
    accumulateGameStats(seasonTwoStats, box2, "Home Team", "Away Team");

    assert.equal(CAREER_STATS.p1.g, 2);
    subtractSeasonFromCareer(seasonTwoStats); // scrap only the second season
    assert.equal(CAREER_STATS.p1.g, 1, "the first season's contribution should still stand");
  });
});

test("topByStat sorts descending, respects a position filter, and applies the rate-stat minimum-attempts floor", () => {
  const store = {
    p1: { id: "p1", name: "High Scorer", team: "T", pos: "A", g: 10, a: 0, pts: 10, twoPt: 0, foWon: 0, foTotal: 0, ct: 0, sv: 0, sa: 0, ga: 0 },
    p2: { id: "p2", name: "Low Scorer", team: "T", pos: "A", g: 3, a: 0, pts: 3, twoPt: 0, foWon: 0, foTotal: 0, ct: 0, sv: 0, sa: 0, ga: 0 },
    p3: { id: "p3", name: "Defender", team: "T", pos: "D", g: 20, a: 0, pts: 20, twoPt: 0, foWon: 0, foTotal: 0, ct: 5, sv: 0, sa: 0, ga: 0 },
    p4: { id: "p4", name: "Small Sample Goalie", team: "T", pos: "G", g: 0, a: 0, pts: 0, twoPt: 0, foWon: 0, foTotal: 0, ct: 0, sv: 5, sa: 5, ga: 0 },
    p5: { id: "p5", name: "Real Starter", team: "T", pos: "G", g: 0, a: 0, pts: 0, twoPt: 0, foWon: 0, foTotal: 0, ct: 0, sv: 18, sa: 25, ga: 7 },
  };
  const points = topByStat(store, "pts", { positions: ["A"] });
  assert.deepEqual(points.map((l) => l.id), ["p1", "p2"], "position filter should exclude the Defender despite a higher pts total");

  const saves = topByStat(store, "savePct", { positions: ["G"] });
  assert.equal(saves.length, 1, "a goalie under the minimum shots-against floor should be excluded from the save% leaderboard");
  assert.equal(saves[0].id, "p5");
  assert.ok(Math.abs(saves[0].value - 18 / 25) < 1e-9);
});
