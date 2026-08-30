/* ============================================================
   ALL-STAR GAME (Master File 1.5, 2.6)
   Two per year — Lakeshore All-Stars vs Mountainside All-Stars, one for
   each season (outdoor during Corkum's Interconference Week, indoor during
   Culkin's). The winning conference earns Trophy Final home field (Games 1
   & 3) that season — see simulateConferenceFinalRound in playoffs.js.

   There's no fan-vote/coach-selection roster system in this engine (Master
   File 1.5's "every team gets at least one rep" is a roster-construction
   detail, not something that changes a simulated outcome), so a conference
   All-Star team is approximated as the straight average of all 16 of its
   teams across every rating subcategory — a reasonable stand-in for "the
   conference's collective talent level." It has no coach and no roster
   tag, so tag-driven variance/clutch/fatigue modifiers are neutral, and
   it's simulated at a neutral site — home-field bonuses never apply to
   either side.
   ============================================================ */
import { TEAMS, TEAM_NAMES } from "../data/rawData.js";
import { applyBalance, gameDayTeam, simulateTeamScore, simulateOT } from "./simulation.js";

const ALL_STAR_SUBCATS = [
  "offPos", "offPac", "offRisk", "defPos", "defPre", "defRisk",
  "fofClm", "fofCon", "glcStp", "glcCon", "glcPas", "pp", "pk",
  "clutch", "tcon", "riding", "clearing",
];

export function buildConferenceAllStarTeam(conf) {
  const confTeams = TEAM_NAMES.filter((t) => TEAMS[t].conf === conf);
  const team = {};
  for (const key of ALL_STAR_SUBCATS) {
    team[key] = confTeams.reduce((sum, t) => sum + TEAMS[t][key], 0) / confTeams.length;
  }
  team.bal = confTeams.reduce((sum, t) => sum + TEAMS[t].bal, 0) / confTeams.length;
  return team;
}

export function simulateAllStarGame(isIndoor) {
  const lakeRaw = buildConferenceAllStarTeam("Lake");
  const mounRaw = buildConferenceAllStarTeam("Moun");
  const lake = gameDayTeam(applyBalance(lakeRaw, isIndoor), undefined, false, null);
  const moun = gameDayTeam(applyBalance(mounRaw, isIndoor), undefined, false, null);

  let lakeScore = Math.round(simulateTeamScore(lake, moun, false, isIndoor).score);
  let mounScore = Math.round(simulateTeamScore(moun, lake, false, isIndoor).score);

  let ot = null;
  if (lakeScore === mounScore) {
    // simulateOT has a small fixed edge for its "home" side (Master File
    // doesn't define a host for this game) — an acceptable wrinkle for what
    // is, in spirit, a coin-flip exhibition either way.
    ot = simulateOT(lake, moun, undefined, undefined);
    if (ot.winner === "home") lakeScore += 1; else mounScore += 1;
  }

  return { lakeScore, mounScore, winner: lakeScore > mounScore ? "Lake" : "Moun", ot };
}
