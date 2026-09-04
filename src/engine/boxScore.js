import { playersFor, TEAMS } from "../data/rawData.js";
import { pickWeighted, clamp, rand } from "./mathHelpers.js";
import { computeFaceoff } from "./simulation.js";

/* ============================================================
   BOX SCORE / SCORING ATTRIBUTION

   None of this is a literal simulated play-by-play — this engine simulates a
   final score from team-aggregate ratings, not individual possessions (see
   CLAUDE.md). Every function here narrates a plausible *attribution* of that
   aggregate outcome onto individual rostered players, weighted by real
   signals already in the data (position, overall, star flag, and the same
   team subcategory ratings the simulation itself uses to decide the score),
   the same principle attributeGoals() has always used for goals/assists —
   extended here to face-offs, caused turnovers, and goalie shots/saves for
   src/engine/playerStats.js's season/career leaderboards. None of these are
   real recorded events; they're a consistent, weighted-random accounting of
   who plausibly produced a real team-level outcome, seeded fresh per game
   (see computeGameBoxScore below) so a season's leaderboard reflects a
   genuine accumulation, not just per-view flavor text.

   Every function below takes an optional `deactivatedNames` array — a
   player sitting out the season on a Deactivation List (Master File 9.8,
   src/engine/deactivation.js) never picks up a stat, the same way they're
   already excluded from that season's awards (awards.js). Without this,
   a deactivated player could still top the season leaderboard for a
   season they supposedly didn't play — the same roster the rest of the
   season respects has to be the one stats are attributed from too.
   ============================================================ */
export const SCORER_WEIGHT = { A: 3.0, M: 2.0, L: 0.8, D: 0.4, F: 0.25, G: 0.02 };

function activeRosterFor(teamName, deactivatedNames) {
  const roster = playersFor(teamName);
  if (!deactivatedNames || !deactivatedNames.length) return roster;
  const active = roster.filter((p) => !deactivatedNames.includes(p.name));
  return active.length ? active : roster; // POSITION_MINIMUMS guarantees this never actually happens
}

export function attributeGoals(teamName, goalCount, hasTwoPointGoal, deactivatedNames) {
  const roster = activeRosterFor(teamName, deactivatedNames);
  const eligible = roster.filter((p) => p.pos !== "G" || Math.random() < 0.02);
  const scorers = [];
  for (let i = 0; i < goalCount; i++) {
    const isTwoPoint = hasTwoPointGoal && i === goalCount - 1;
    const pool = isTwoPoint ? eligible.filter((p) => p.pos === "A" || p.pos === "M") : eligible;
    const scorer = pickWeighted(pool.length ? pool : eligible, (p) =>
      (SCORER_WEIGHT[p.pos] || 0.3) * (p.ovr / 60) * (p.star ? 1.4 : 1)
    );
    let assist = null;
    if (Math.random() < 0.82) {
      const assistPool = eligible.filter((p) => p.name !== scorer.name);
      if (assistPool.length) {
        assist = pickWeighted(assistPool, (p) =>
          (SCORER_WEIGHT[p.pos] || 0.3) * (p.ovr / 60) * (p.star ? 1.3 : 1)
        );
      }
    }
    scorers.push({
      scorer: scorer.name, scorerId: scorer.id, pos: scorer.pos,
      assist: assist ? assist.name : null, assistId: assist ? assist.id : null,
      assistPos: assist ? assist.pos : null,
      twoPoint: isTwoPoint,
    });
  }
  return scorers;
}

/* ---------- Face-offs ----------
   Total draws per game is a fixed, documented assumption (field lacrosse
   has a face-off after every goal plus each quarter open; box play is
   faster-paced with fewer stoppages) — not derived from the score. Each
   individual draw's winner comes from computeFaceoff() (Master File 5.1's
   fofClm/fofCon), the exact same team-strength signal simulateGame() itself
   uses for its own faceoffBonus, so a team that's actually simulated as
   faceoff-strong also shows up that way on the leaderboard. */
const FACEOFFS_PER_GAME = { indoor: 20, outdoor: 26 };

function bumpFaceoff(store, player, won) {
  if (!store[player.name]) store[player.name] = { name: player.name, id: player.id, pos: player.pos, won: 0, total: 0 };
  store[player.name].total++;
  if (won) store[player.name].won++;
}

export function attributeFaceoffs(homeTeam, awayTeam, isIndoor, deactivated) {
  const total = FACEOFFS_PER_GAME[isIndoor ? "indoor" : "outdoor"];
  const homeStrength = computeFaceoff(TEAMS[homeTeam]);
  const awayStrength = computeFaceoff(TEAMS[awayTeam]);
  const pHome = homeStrength / (homeStrength + awayStrength || 1);
  const homeFogos = activeRosterFor(homeTeam, deactivated?.[homeTeam]).filter((p) => p.pos === "F");
  const awayFogos = activeRosterFor(awayTeam, deactivated?.[awayTeam]).filter((p) => p.pos === "F");
  const homeStats = {}, awayStats = {};
  for (let i = 0; i < total; i++) {
    const homeWon = Math.random() < pHome;
    if (homeFogos.length) bumpFaceoff(homeStats, pickWeighted(homeFogos, (p) => p.ovr), homeWon);
    if (awayFogos.length) bumpFaceoff(awayStats, pickWeighted(awayFogos, (p) => p.ovr), !homeWon);
  }
  return { home: Object.values(homeStats), away: Object.values(awayStats) };
}

/* ---------- Caused turnovers ----------
   A defending team's own pressure (defPos/defPre/defRisk, the same ratings
   computeDefense() uses) forces more turnovers against an opponent whose
   ball control (offPac/clearing) is weaker — the same relative-strength
   shape simulateGame() already uses for score, just pointed at a different
   outcome. Distributed to D/Long-Stick Midfield, the two positions the
   Master File and this engine's own DEFENSIVE_POSITIONS treat as the
   turnover-forcing group (awards.js). */
const CT_BASE = { indoor: 9, outdoor: 7 };
const CT_WEIGHT = { D: 1.0, L: 0.8 };

function causedTurnoverCount(defTeamName, offTeamName, isIndoor) {
  const def = TEAMS[defTeamName], off = TEAMS[offTeamName];
  const pressure = (def.defPos + def.defPre + def.defRisk) / 3;
  const ballControl = (off.offPac + off.clearing) / 2;
  const factor = clamp(pressure / Math.max(1, ballControl), 0.5, 2.0);
  return Math.round(CT_BASE[isIndoor ? "indoor" : "outdoor"] * factor);
}

function distributeTurnovers(count, defenders) {
  if (!defenders.length) return [];
  const store = {};
  for (let i = 0; i < count; i++) {
    const p = pickWeighted(defenders, (d) => (CT_WEIGHT[d.pos] || 0.5) * (d.ovr / 60));
    if (!store[p.name]) store[p.name] = { name: p.name, id: p.id, pos: p.pos, ct: 0 };
    store[p.name].ct++;
  }
  return Object.values(store);
}

export function attributeCausedTurnovers(homeTeam, awayTeam, isIndoor, deactivated) {
  const homeCT = causedTurnoverCount(homeTeam, awayTeam, isIndoor); // home defense vs. away's ball control
  const awayCT = causedTurnoverCount(awayTeam, homeTeam, isIndoor);
  const homeDefenders = activeRosterFor(homeTeam, deactivated?.[homeTeam]).filter((p) => p.pos === "D" || p.pos === "L");
  const awayDefenders = activeRosterFor(awayTeam, deactivated?.[awayTeam]).filter((p) => p.pos === "D" || p.pos === "L");
  return { home: distributeTurnovers(homeCT, homeDefenders), away: distributeTurnovers(awayCT, awayDefenders) };
}

/* ---------- Goalie shots/saves ----------
   Goals allowed is the one real number here (simulateGame()'s actual score);
   shots faced is estimated from the shooting team's offensive ratings, then
   floored a few shots above goals allowed so save% can never read as a
   nonsensical >100%. A single starter is picked per team per game, weighted
   toward the roster's best (and most durable) goalie — same as a real team
   mostly starting its #1 — rather than splitting one game across two. */
const SHOT_BASE = { indoor: 34, outdoor: 30 };

function estimateShotsFaced(offTeamName, isIndoor, goalsAllowed) {
  const off = TEAMS[offTeamName];
  const offenseFactor = (off.offPos + off.offPac + off.offRisk) / 3 / 5.5; // ~1.0 at league-average ~5.5
  const shots = Math.round(SHOT_BASE[isIndoor ? "indoor" : "outdoor"] * offenseFactor);
  return Math.max(shots, goalsAllowed + Math.round(rand(3, 10)));
}

export function attributeGoalieStats(teamName, opponentTeamName, goalsAllowed, isIndoor, deactivatedNames) {
  const goalies = activeRosterFor(teamName, deactivatedNames).filter((p) => p.pos === "G");
  if (!goalies.length) return null;
  const starter = pickWeighted(goalies, (p) => p.ovr + (p.durability || 0) * 0.1);
  const shotsFaced = estimateShotsFaced(opponentTeamName, isIndoor, goalsAllowed);
  return { name: starter.name, id: starter.id, pos: "G", saves: shotsFaced - goalsAllowed, shotsFaced, goalsAllowed };
}

/* ---------- One call per game, for both display and season/career accumulation ----------
   deactivated: optional { team: [names] } for the season this game belongs to (App.jsx's
   season.deactivated, from src/engine/deactivation.js) — every attribution below excludes
   anyone on it, same as awards.js already does. */
export function computeGameBoxScore(homeTeam, awayTeam, isIndoor, result, deactivated) {
  const homeGoals = attributeGoals(homeTeam, result.homeScore, !!result.homeTwoPointGoal, deactivated?.[homeTeam]);
  const awayGoals = attributeGoals(awayTeam, result.awayScore, !!result.awayTwoPointGoal, deactivated?.[awayTeam]);
  const faceoffs = attributeFaceoffs(homeTeam, awayTeam, isIndoor, deactivated);
  const turnovers = attributeCausedTurnovers(homeTeam, awayTeam, isIndoor, deactivated);
  const homeGoalie = attributeGoalieStats(homeTeam, awayTeam, result.awayScore, isIndoor, deactivated?.[homeTeam]); // home goalie allowed awayScore
  const awayGoalie = attributeGoalieStats(awayTeam, homeTeam, result.homeScore, isIndoor, deactivated?.[awayTeam]);
  return {
    home: { goals: homeGoals, faceoffs: faceoffs.home, turnovers: turnovers.home, goalie: homeGoalie },
    away: { goals: awayGoals, faceoffs: faceoffs.away, turnovers: turnovers.away, goalie: awayGoalie },
  };
}
