import { TEAMS, TEAM_NAMES, PLAYERS_RAW, COACHES } from "../data/rawData.js";
import { clamp10, rand } from "./mathHelpers.js";
import { SUBCATS_TO_VARY } from "./simulation.js";
import { developPlayer, pullRatingsTowardRoster } from "./ratings.js";

/* ============================================================
   OFFSEASON (Master File Sections 7, 8.5, 9.4)
   Team ratings/tags progress via a simplified season-over-season model since
   full roster-driven ratings aren't wired in yet (Option A — see project notes).
   Draft, coach movement, and retirement operate on real embedded data and
   generate fresh names from the pool for prospects and incoming coaches.
   ============================================================ */

export function computeProgressionDelta(team, combinedWinPct, roster) {
  const oldTag = team.tag;
  let delta = 0;
  let newTag = team.tag;
  switch (team.tag) {
    case "Veteran-led": {
      delta = combinedWinPct < 0.5 ? -rand(2, 4) : -rand(1, 2);
      if (combinedWinPct < 0.40) newTag = "Rebuilding / Unknown";
      break;
    }
    case "Star Dependent": {
      const hasYoungStar = roster.some((p) => p[5] === 1 && p[3] < 30);
      delta = hasYoungStar ? rand(2, 5) : -rand(3, 6);
      if (!hasYoungStar && combinedWinPct < 0.45) newTag = "Rebuilding / Unknown";
      else if (team.score >= 86 && Math.random() < 0.35) newTag = "Deep Roster"; // built a real team around the star
      break;
    }
    case "Young & Inexperienced": {
      delta = rand(3, 6) * (combinedWinPct > 0.5 ? 1.15 : 0.85);
      if (team.score >= 80) {
        // the young core matures — growth phase ends
        const hasStar = roster.some((p) => p[5] === 1);
        newTag = hasStar && Math.random() < 0.4 ? "Star Dependent" : "Deep Roster";
      }
      break;
    }
    case "Rebuilding / Unknown": {
      const combinedWins = Math.round(combinedWinPct * 32);
      if (combinedWins >= 18) {
        const skillPlayers = roster.filter((p) => p[1] === "A" || p[1] === "M");
        const attackAvgOvr = skillPlayers.reduce((s, p) => s + p[4], 0) / (skillPlayers.length || 1);
        const hasStar = roster.some((p) => p[5] === 1);
        newTag = hasStar ? "Star Dependent" : attackAvgOvr > 68 ? "Deep Roster" : "Young & Inexperienced";
      }
      delta = rand(-2, 2);
      if (newTag === "Rebuilding / Unknown" && Math.random() < 0.22) newTag = "Young & Inexperienced"; // front office commits to a youth movement
      break;
    }
    case "Deep Roster": {
      delta = rand(-1, 2);
      const r = Math.random();
      if (r < 0.10) newTag = "Rebuilding / Unknown";
      else if (r < 0.25) newTag = "Veteran-led"; // the core is aging together
      break;
    }
  }
  return { rawDelta: delta, newTag, oldTag };
}

/* League-wide zero-sum progression: teams still rise and fall on their tag trajectories,
   but the league's total rating stays level — one team's climb is funded by others' slides.
   A gentle compression term (regression toward the league mean) keeps the top and bottom
   from drifting apart into a permanent divide, while day-to-day stratification remains. */
export function applyLeagueProgression(combinedStandingsByTeam) {
  const leagueMean = TEAM_NAMES.reduce((s, n) => s + TEAMS[n].score, 0) / TEAM_NAMES.length;
  const raws = {};
  let deltaSum = 0;
  for (const name of TEAM_NAMES) {
    const entry = combinedStandingsByTeam[name];
    const winPct = entry.w / (entry.w + entry.l + entry.otl || 1);
    const r = computeProgressionDelta(TEAMS[name], winPct, PLAYERS_RAW[name]);
    raws[name] = r;
    deltaSum += r.rawDelta;
  }
  const meanDelta = deltaSum / TEAM_NAMES.length;

  const results = [];
  const developments = [];
  for (const name of TEAM_NAMES) {
    const team = TEAMS[name];
    const { rawDelta, newTag, oldTag } = raws[name];
    const zeroSum = rawDelta - meanDelta;                    // league total stays level
    const compression = (leagueMean - team.score) * 0.09;   // pull toward the middle — reduced since the roster pull below now shares this job
    const delta = zeroSum + compression;
    const oldScore = team.score;
    const tagScore = Math.max(40, Math.min(92, Math.round(team.score + delta)));
    const subcatDelta = (tagScore - oldScore) / 10;
    for (const key of SUBCATS_TO_VARY) team[key] = clamp10(team[key] + subcatDelta);
    team.score = tagScore;
    team.tag = newTag;

    // player development — not every prospect pans out
    const coachDev = COACHES[name]?.hcDev ?? 55;
    for (const p of PLAYERS_RAW[name]) {
      p[3] = (p[3] || 20) + 1; // everyone ages a year in the offseason
      const devResult = developPlayer(p, coachDev);
      if (devResult) developments.push({ team: name, ...devResult });
    }

    // roster quality now pulls the numbers toward reality — this is what makes
    // drafting, free agency, and trades actually matter, not just narrative flavor
    pullRatingsTowardRoster(name);

    const newScore = team.score;
    results.push({ team: name, oldScore, newScore, delta: Math.round((newScore - oldScore) * 10) / 10, tagChanged: newTag !== oldTag, oldTag, newTag });
  }
  return { results, developments };
}
