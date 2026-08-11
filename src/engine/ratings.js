import { TEAMS, PLAYERS_RAW, TEAM_NAMES } from "../data/rawData.js";
import { clamp, clamp10, rand } from "./mathHelpers.js";

/* ============================================================
   ROSTER → RATING FEEDBACK LOOP
   Team ratings are no longer fully independent of the roster: each offseason,
   position-group roster quality pulls the relevant subcategories (and overall
   score) toward roster reality. The pull is modest and blended (not an override)
   so the zero-sum tag progression's parity work stays intact — but stacking real
   talent at a position now actually shows up in the numbers, and a gutted position
   group drags a team down. This is what makes drafting, free agency, and trades matter.
   ============================================================ */
export const POSITION_GROUP_SUBCATS = {
  A: ["offPos", "offRisk"],
  M: ["offPac", "riding"],
  L: ["defPre", "riding"],   // long-stick midfield: hybrid defensive assignment + transition threat
  D: ["defPos", "defRisk"],
  F: ["fofClm", "fofCon"],
  G: ["glcStp", "glcCon", "glcPas"],
};
export const ROSTER_PULL_WEIGHT = 0.14;

export function avgOverallByPosition(teamName) {
  const roster = PLAYERS_RAW[teamName];
  const groups = {};
  for (const pos of Object.keys(POSITION_GROUP_SUBCATS)) {
    const players = roster.filter((p) => p[1] === pos);
    groups[pos] = players.length ? players.reduce((s, p) => s + p[4], 0) / players.length : null;
  }
  return groups;
}

export function pullRatingsTowardRoster(teamName) {
  const team = TEAMS[teamName];
  const roster = PLAYERS_RAW[teamName];
  if (!roster.length) return;

  const groups = avgOverallByPosition(teamName);
  for (const [pos, subcats] of Object.entries(POSITION_GROUP_SUBCATS)) {
    const avgOvr = groups[pos];
    if (avgOvr == null) continue;
    const target = clamp10((avgOvr - 35) / 64 * 9 + 1);
    for (const key of subcats) team[key] = clamp10(team[key] * (1 - ROSTER_PULL_WEIGHT) + target * ROSTER_PULL_WEIGHT);
  }

  // Pull team.score toward how this roster compares to the LEAGUE-WIDE roster average,
  // translated into score terms. "Player overall" and "team score" were generated on
  // different absolute scales (player averages run systematically higher), so pulling
  // toward the raw roster average would create a steady upward drift league-wide.
  // Pulling toward RELATIVE roster strength avoids that while still rewarding real
  // team-building — a genuinely above-average roster nudges the score up either way.
  const leagueMeanScore = TEAM_NAMES.reduce((s, n) => s + TEAMS[n].score, 0) / TEAM_NAMES.length;
  const leagueMeanRosterOvr = TEAM_NAMES.reduce((s, n) => {
    const r = PLAYERS_RAW[n];
    return s + (r.length ? r.reduce((a, p) => a + p[4], 0) / r.length : 0);
  }, 0) / TEAM_NAMES.length;
  const rosterAvgOvr = roster.reduce((s, p) => s + p[4], 0) / roster.length;
  const impliedScore = leagueMeanScore + (rosterAvgOvr - leagueMeanRosterOvr);
  team.score = Math.max(35, Math.min(99, Math.round(team.score * (1 - ROSTER_PULL_WEIGHT) + impliedScore * ROSTER_PULL_WEIGHT)));
}

export function weakestPosition(teamName) {
  const groups = avgOverallByPosition(teamName);
  return Object.entries(groups).sort((a, b) => (a[1] ?? 50) - (b[1] ?? 50))[0][0];
}
export function strongestPosition(teamName) {
  const groups = avgOverallByPosition(teamName);
  return Object.entries(groups).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0][0];
}

/* ---------- Player development (draft picks don't all pan out) ---------- */
export function developPlayer(p, coachDev) {
  const age = p[3];
  if (age > 26) return null; // past the organic development window
  const ceiling = p[12] != null ? p[12] : p[4];
  const gap = ceiling - p[4];
  if (Math.abs(gap) < 1) return null;
  const devFactor = (coachDev - 50) / 100;
  const successChance = clamp(0.55 + devFactor * 0.3, 0.20, 0.85);
  const oldOvr = p[4];
  if (Math.random() < successChance) {
    p[4] = clamp(Math.round(p[4] + gap * rand(0.15, 0.35)), 30, 99);
  } else {
    p[4] = clamp(Math.round(p[4] + rand(-2, 0)), 30, 99);
  }
  return p[4] !== oldOvr ? { name: p[0], from: oldOvr, to: p[4], hit: p[4] > oldOvr } : null;
}
