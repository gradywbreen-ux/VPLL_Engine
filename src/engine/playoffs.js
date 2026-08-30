import { TEAMS, TEAM_NAMES } from "../data/rawData.js";
import { BY_REGION } from "./schedule.js";
import { simulateGame } from "./simulation.js";
import { clamp } from "./mathHelpers.js";
import { simulateAllStarGame } from "./allStarGame.js";

/* ============================================================
   PLAYOFFS (Master File Section 2)
   12 of 16 teams per conference qualify. 4 division winners per conference
   get a bye. Within each region: intra-division #2 vs #3 wildcard game;
   winner faces the OTHER division's bye winner in the Regional Semifinal.
   Regional Final -> Conference Final -> Trophy Final (best of 3).
   Regular season: 1 Commissioners Cup point per win. Playoffs: 2 points per win.
   ============================================================ */

/* ---------- Tiebreakers (Master File 2.3/2.4) ----------
   Overall Record -> Conference Record -> Head to Head -> Goal Differential,
   with Head to Head recomputed among only whichever teams are still tied at
   that point (2.4's "among tied teams"), not the whole division. Goals For
   is kept as a final fallback beyond the documented four criteria, purely
   to stay deterministic in the vanishingly unlikely case all four tie. */

function conferenceRecordFor(team, schedule, results) {
  const conf = TEAMS[team].conf;
  let points = 0;
  for (const g of schedule) {
    if (g.home !== team && g.away !== team) continue;
    const opponent = g.home === team ? g.away : g.home;
    if (TEAMS[opponent].conf !== conf) continue; // only intra-conference games count
    const res = results[g.id];
    if (!res) continue;
    const winner = res.homeScore > res.awayScore ? g.home : g.away;
    if (winner === team) points += 1;
  }
  return points;
}

function headToHeadRecord(teamList, schedule, results) {
  const teamSet = new Set(teamList);
  const points = {};
  for (const t of teamList) points[t] = 0;
  for (const g of schedule) {
    if (!teamSet.has(g.home) || !teamSet.has(g.away)) continue;
    const res = results[g.id];
    if (!res) continue;
    const winner = res.homeScore > res.awayScore ? g.home : g.away;
    points[winner] += 1;
  }
  return points;
}

// Splits teamList into groups sharing the same keyFn() value, ordered by
// that value descending — used to cascade to the next tiebreaker only among
// teams still tied after the previous one.
function tiebreakGroups(teamList, keyFn) {
  const sorted = [...teamList].sort((a, b) => keyFn(b) - keyFn(a));
  const groups = [];
  for (const t of sorted) {
    const last = groups[groups.length - 1];
    if (last && keyFn(last[0]) === keyFn(t)) last.push(t);
    else groups.push([t]);
  }
  return groups;
}

export function rankDivision(table, teamList, schedule, results) {
  let order = [teamList];
  for (const keyFn of [(t) => table[t].points, (t) => conferenceRecordFor(t, schedule, results)]) {
    order = order.flatMap((group) => (group.length > 1 ? tiebreakGroups(group, keyFn) : [group]));
  }
  order = order.flatMap((group) => {
    if (group.length <= 1) return [group];
    const h2h = headToHeadRecord(group, schedule, results);
    return tiebreakGroups(group, (t) => h2h[t]);
  });
  for (const keyFn of [(t) => table[t].gd, (t) => table[t].gf]) {
    order = order.flatMap((group) => (group.length > 1 ? tiebreakGroups(group, keyFn) : [group]));
  }
  return order.flat();
}

export function betterSeed(table, teamA, teamB, schedule, results) {
  return rankDivision(table, [teamA, teamB], schedule, results)[0];
}

export function buildRegionSeeds(table, regionKey, schedule, results) {
  const regionTeams = BY_REGION[regionKey];
  const divs = [...new Set(regionTeams.map((t) => TEAMS[t].div))];
  const div1Teams = regionTeams.filter((t) => TEAMS[t].div === divs[0]);
  const div2Teams = regionTeams.filter((t) => TEAMS[t].div === divs[1]);
  const div1Ranked = rankDivision(table, div1Teams, schedule, results);
  const div2Ranked = rankDivision(table, div2Teams, schedule, results);
  return {
    regionKey,
    div1: { name: divs[0], winner: div1Ranked[0], seed2: div1Ranked[1], seed3: div1Ranked[2], missed: div1Ranked[3] },
    div2: { name: divs[1], winner: div2Ranked[0], seed2: div2Ranked[1], seed3: div2Ranked[2], missed: div2Ranked[3] },
  };
}

export function buildAllSeeds(table, schedule, results) {
  const seeds = {};
  for (const regionKey of Object.keys(BY_REGION)) seeds[regionKey] = buildRegionSeeds(table, regionKey, schedule, results);
  return seeds;
}

export let playoffGameId = 0;
export function initPlayoffs(table, schedule, results) {
  playoffGameId = 0;
  const seeds = buildAllSeeds(table, schedule, results);
  const wildcard = [];
  for (const regionKey of Object.keys(seeds)) {
    const s = seeds[regionKey];
    // higher seed (division's #2) hosts the wildcard game
    const g1Home = betterSeed(table, s.div1.seed2, s.div1.seed3, schedule, results);
    wildcard.push({ id: playoffGameId++, round: "wildcard", region: regionKey, bracket: s.div1.name,
      home: g1Home, away: g1Home === s.div1.seed2 ? s.div1.seed3 : s.div1.seed2, winner: null, result: null });
    const g2Home = betterSeed(table, s.div2.seed2, s.div2.seed3, schedule, results);
    wildcard.push({ id: playoffGameId++, round: "wildcard", region: regionKey, bracket: s.div2.name,
      home: g2Home, away: g2Home === s.div2.seed2 ? s.div2.seed3 : s.div2.seed2, winner: null, result: null });
  }
  return { seeds, wildcard, regionalSemis: [], regionalFinal: [], conferenceFinal: [], trophyFinal: null, ccBonus: {}, champion: null };
}

export function playGame(home, away) {
  const raw = simulateGame(home, away, false); // playoffs stay in the season's format (outdoor Corkum for now)
  // ot is null or { winner: "home"|"away", periods } — kept intact (not
  // coerced to a boolean) so simulateTrophyFinalSeries can read periods for
  // the Double OT+ momentum-carry check (Master File 2.5). Every existing
  // reader only ever truthy-checks .ot, so this is backward compatible.
  return { home, away, homeScore: raw.homeScore, awayScore: raw.awayScore, ot: raw.ot,
    winner: raw.homeScore > raw.awayScore ? home : away };
}

export function addCC(playoffs, team, pts) {
  playoffs.ccBonus[team] = (playoffs.ccBonus[team] || 0) + pts;
}

export function simulateWildcardRound(playoffs) {
  for (const g of playoffs.wildcard) {
    const r = playGame(g.home, g.away);
    g.winner = r.winner; g.result = r;
    addCC(playoffs, r.winner, 2);
  }
  for (const regionKey of Object.keys(playoffs.seeds)) {
    const s = playoffs.seeds[regionKey];
    const div1WC = playoffs.wildcard.find((g) => g.region === regionKey && g.bracket === s.div1.name);
    const div2WC = playoffs.wildcard.find((g) => g.region === regionKey && g.bracket === s.div2.name);
    // division winner (bye) always hosts, per Master File "winner plays winner of [other] Division"
    playoffs.regionalSemis.push({ id: playoffGameId++, round: "regionalSemis", region: regionKey, bracket: s.div2.name,
      home: s.div2.winner, away: div1WC.winner, winner: null, result: null });
    playoffs.regionalSemis.push({ id: playoffGameId++, round: "regionalSemis", region: regionKey, bracket: s.div1.name,
      home: s.div1.winner, away: div2WC.winner, winner: null, result: null });
  }
}

export function simulateRegionalSemisRound(playoffs, table, schedule, results) {
  for (const g of playoffs.regionalSemis) {
    const r = playGame(g.home, g.away);
    g.winner = r.winner; g.result = r;
    addCC(playoffs, r.winner, 2);
  }
  for (const regionKey of Object.keys(playoffs.seeds)) {
    const semis = playoffs.regionalSemis.filter((g) => g.region === regionKey);
    const home = betterSeed(table, semis[0].winner, semis[1].winner, schedule, results);
    const away = home === semis[0].winner ? semis[1].winner : semis[0].winner;
    playoffs.regionalFinal.push({ id: playoffGameId++, round: "regionalFinal", region: regionKey, home, away, winner: null, result: null });
  }
}

export function simulateRegionalFinalRound(playoffs, table, schedule, results) {
  for (const g of playoffs.regionalFinal) {
    const r = playGame(g.home, g.away);
    g.winner = r.winner; g.result = r;
    addCC(playoffs, r.winner, 2);
  }
  const byConf = {};
  for (const g of playoffs.regionalFinal) {
    const conf = TEAMS[g.winner].conf;
    (byConf[conf] = byConf[conf] || []).push(g.winner);
  }
  for (const conf of Object.keys(byConf)) {
    const [a, b] = byConf[conf];
    const home = betterSeed(table, a, b, schedule, results);
    const away = home === a ? b : a;
    playoffs.conferenceFinal.push({ id: playoffGameId++, round: "conferenceFinal", conference: conf, home, away, winner: null, result: null });
  }
}

export function simulateConferenceFinalRound(playoffs, table, isIndoor = false) {
  for (const g of playoffs.conferenceFinal) {
    const r = playGame(g.home, g.away);
    g.winner = r.winner; g.result = r;
    addCC(playoffs, r.winner, 2);
  }
  const [a, b] = playoffs.conferenceFinal.map((g) => g.winner);

  // Master File 1.5/2.6: the conference that wins the season's All-Star
  // Game hosts Games 1 & 3 of the Trophy Final. a and b are guaranteed one
  // per conference (conference finals produce exactly one finalist each).
  const allStarGame = simulateAllStarGame(isIndoor);
  playoffs.allStarGame = allStarGame;
  const hostTeam = TEAMS[a].conf === allStarGame.winner ? a : b;
  const otherTeam = hostTeam === a ? b : a;
  playoffs.trophyFinal = { teamA: hostTeam, teamB: otherTeam, games: [], winner: null, winsA: 0, winsB: 0 };
}

// Master File 2.5: an OT win in the Trophy Final can carry a Clutch bump
// into the next game of the series. Base carry chance is 60%; a winning
// team with one of these tags uses its own rate instead of the base.
// Double OT+ (2+ periods) independently pushes the chance up to at least
// 75% — the Master File doesn't specify how a tag rate and Double OT+
// combine when both apply, so this takes whichever is higher rather than
// stacking them.
const OT_MOMENTUM_CARRY_CHANCE = {
  "Veteran-led": 0.80,
  "Rebuilding / Unknown": 0.50,
  "Young & Inexperienced": 0.45,
};
const OT_MOMENTUM_CARRY_BASE = 0.60;
const OT_MOMENTUM_CARRY_DOUBLE_OT = 0.75;
const OT_MOMENTUM_CARRY_MAGNITUDE = 5; // +5/-5 Clutch, same flat 0-100 scale as TAG_CLUTCH_OT etc.

export function simulateTrophyFinalSeries(playoffs) {
  const tf = playoffs.trophyFinal;
  const hostOrder = [tf.teamA, tf.teamB, tf.teamA]; // games 1 & 3 hosted by teamA (higher seed)
  let gameNum = 0;
  let momentum = null; // { winner, loser } carried in from the previous game's OT, applied to this game only
  while (tf.winsA < 2 && tf.winsB < 2 && gameNum < 3) {
    const home = hostOrder[gameNum];
    const away = home === tf.teamA ? tf.teamB : tf.teamA;

    let restore = null;
    if (momentum) {
      restore = { [momentum.winner]: TEAMS[momentum.winner].clutch, [momentum.loser]: TEAMS[momentum.loser].clutch };
      TEAMS[momentum.winner].clutch = clamp(TEAMS[momentum.winner].clutch + OT_MOMENTUM_CARRY_MAGNITUDE / 10, 1, 10);
      TEAMS[momentum.loser].clutch = clamp(TEAMS[momentum.loser].clutch - OT_MOMENTUM_CARRY_MAGNITUDE / 10, 1, 10);
    }

    const r = playGame(home, away);

    if (restore) {
      TEAMS[momentum.winner].clutch = restore[momentum.winner];
      TEAMS[momentum.loser].clutch = restore[momentum.loser];
    }

    tf.games.push(r);
    addCC(playoffs, r.winner, 2);
    if (r.winner === tf.teamA) tf.winsA++; else tf.winsB++;

    momentum = null;
    if (r.ot) {
      const otWinner = r.winner;
      const otLoser = otWinner === home ? away : home;
      let carryChance = OT_MOMENTUM_CARRY_CHANCE[TEAMS[otWinner].tag] ?? OT_MOMENTUM_CARRY_BASE;
      if (r.ot.periods >= 2) carryChance = Math.max(carryChance, OT_MOMENTUM_CARRY_DOUBLE_OT);
      if (Math.random() < carryChance) momentum = { winner: otWinner, loser: otLoser };
    }

    gameNum++;
  }
  tf.winner = tf.winsA === 2 ? tf.teamA : tf.teamB;
  playoffs.champion = tf.winner;
}
