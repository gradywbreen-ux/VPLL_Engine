import { TEAMS, TEAM_NAMES, PLAYERS_RAW } from "../data/rawData.js";
import { clamp } from "./mathHelpers.js";
import { SALARY_CAP, teamPayroll } from "./contracts.js";
import { avgOverallByPosition, weakestPosition, strongestPosition } from "./ratings.js";
import { HC_TAG_FIT } from "./simulation.js";
import { shuffle } from "./schedule.js";

/* ============================================================
   TRADES — autonomous engine + manual override support
   ============================================================ */
export function playerTradeValue(p) {
  const age = p[3], ovr = p[4], aav = p[9] || 10000;
  let value = ovr * 10;
  if (age <= 24) value *= 1.25;
  else if (age >= 33) value *= 0.7;
  const efficiency = ovr / Math.max(1, aav / 10000);
  value *= clamp(efficiency / 8, 0.7, 1.3);
  return Math.round(value);
}

// Stars on losing teams or clashing with a mismatched coach get frustrated and may
// formally request a trade — the engine prioritizes moving them first.
export function identifyUnhappyStars(standingsMap) {
  const unhappy = [];
  for (const team of TEAM_NAMES) {
    const entry = standingsMap[team];
    const winPct = entry ? entry.w / (entry.w + entry.l + entry.otl || 1) : 0.5;
    const coach = COACHES[team];
    const teamTag = TEAMS[team].tag;
    const mismatch = coach && !(HC_TAG_FIT[teamTag] || []).includes(coach.hcArch);
    const stars = PLAYERS_RAW[team].filter((p) => p[5] === 1);
    for (const star of stars) {
      let demandChance = 0;
      let reason = null;
      if (winPct < 0.35) { demandChance += 0.30; reason = "losing situation"; }
      if (mismatch) { demandChance += 0.15; reason = reason || "clashing with the coaching staff"; }
      if (star[3] >= 30 && winPct < 0.40) demandChance += 0.10;
      if (demandChance > 0 && Math.random() < demandChance) {
        unhappy.push({ team, player: star, reason: reason || "wants a fresh start" });
      }
    }
  }
  return unhappy;
}

export function bestTradeCandidateAtPosition(team, pos, exclude) {
  const roster = PLAYERS_RAW[team].filter((p) => p[1] === pos && !exclude.has(p[0]));
  if (!roster.length) return null;
  return [...roster].sort((a, b) => b[4] - a[4])[0];
}

export function executeTrade(teamA, teamB, playerA, playerB) {
  const rosterA = PLAYERS_RAW[teamA], rosterB = PLAYERS_RAW[teamB];
  const idxA = rosterA.indexOf(playerA), idxB = rosterB.indexOf(playerB);
  if (idxA === -1 || idxB === -1) return false;
  rosterA.splice(idxA, 1);
  rosterB.splice(idxB, 1);
  rosterA.push(playerB);
  rosterB.push(playerA);
  return true;
}

export function runTradeEngine(standingsMap) {
  const trades = [];
  const tradedNames = new Set();
  const tradesThisCycle = {};
  for (const t of TEAM_NAMES) tradesThisCycle[t] = 0;
  const MAX_TRADES_PER_TEAM = 2;

  // 1. Unhappy stars get moved first
  const unhappy = identifyUnhappyStars(standingsMap);
  for (const u of unhappy) {
    if (tradedNames.has(u.player[0])) continue;
    if (tradesThisCycle[u.team] >= MAX_TRADES_PER_TEAM) continue;
    const pos = u.player[1];
    const candidates = TEAM_NAMES.filter((t) => t !== u.team && tradesThisCycle[t] < MAX_TRADES_PER_TEAM).map((t) => {
      const room = SALARY_CAP - teamPayroll(t);
      const posAvg = avgOverallByPosition(t)[pos];
      const needScore = posAvg == null ? 60 : Math.max(0, 100 - posAvg);
      return { t, room, needScore };
    }).filter((x) => x.room > (u.player[9] || 10000) * 0.8)
      .sort((a, b) => b.needScore - a.needScore);
    if (!candidates.length) continue;
    const destTeam = candidates[0].t;
    const requestingWeak = weakestPosition(u.team);
    const returnPlayer = bestTradeCandidateAtPosition(destTeam, requestingWeak, tradedNames)
      || bestTradeCandidateAtPosition(destTeam, strongestPosition(destTeam), tradedNames);
    if (!returnPlayer || returnPlayer[0] === u.player[0]) continue;
    if (executeTrade(u.team, destTeam, u.player, returnPlayer)) {
      tradedNames.add(u.player[0]); tradedNames.add(returnPlayer[0]);
      tradesThisCycle[u.team]++; tradesThisCycle[destTeam]++;
      trades.push({
        teamA: u.team, teamB: destTeam, playerA: u.player[0], playerB: returnPlayer[0],
        valueA: playerTradeValue(u.player), valueB: playerTradeValue(returnPlayer),
        reason: `${u.player[0]} requested a trade — ${u.reason}`,
      });
    }
  }

  // 2. General complementary need/surplus matching across the rest of the league
  const teamsShuffled = shuffle(TEAM_NAMES);
  for (const teamA of teamsShuffled) {
    if (tradesThisCycle[teamA] >= MAX_TRADES_PER_TEAM) continue;
    if (Math.random() > 0.35) continue; // not every team is active in the market every year
    const weakA = weakestPosition(teamA);
    const strongA = strongestPosition(teamA);
    for (const teamB of teamsShuffled) {
      if (teamB === teamA || tradesThisCycle[teamB] >= MAX_TRADES_PER_TEAM) continue;
      const weakB = weakestPosition(teamB);
      const strongB = strongestPosition(teamB);
      if (strongB === weakA && strongA === weakB) {
        const playerFromA = bestTradeCandidateAtPosition(teamA, strongA, tradedNames);
        const playerFromB = bestTradeCandidateAtPosition(teamB, strongB, tradedNames);
        if (!playerFromA || !playerFromB) continue;
        const valA = playerTradeValue(playerFromA), valB = playerTradeValue(playerFromB);
        if (Math.abs(valA - valB) / Math.max(valA, valB) < 0.25) {
          if (executeTrade(teamA, teamB, playerFromA, playerFromB)) {
            tradedNames.add(playerFromA[0]); tradedNames.add(playerFromB[0]);
            tradesThisCycle[teamA]++; tradesThisCycle[teamB]++;
            trades.push({ teamA, teamB, playerA: playerFromA[0], playerB: playerFromB[0], valueA: valA, valueB: valB, reason: "complementary roster needs" });
          }
          break;
        }
      }
    }
  }
  return trades;
}
