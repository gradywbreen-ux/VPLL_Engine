import { TEAMS, TEAM_NAMES } from "../data/rawData.js";
import { BY_REGION } from "./schedule.js";
import { simulateGame } from "./simulation.js";

/* ============================================================
   PLAYOFFS (Master File Section 2)
   12 of 16 teams per conference qualify. 4 division winners per conference
   get a bye. Within each region: intra-division #2 vs #3 wildcard game;
   winner faces the OTHER division's bye winner in the Regional Semifinal.
   Regional Final -> Conference Final -> Trophy Final (best of 3).
   Regular season: 1 Commissioners Cup point per win. Playoffs: 2 points per win.
   ============================================================ */

export function rankDivision(table, teamList) {
  return [...teamList].sort((a, b) =>
    table[b].points - table[a].points || table[b].gd - table[a].gd || table[b].gf - table[a].gf
  );
}

export function betterSeed(table, teamA, teamB) {
  const a = table[teamA], b = table[teamB];
  if (a.points !== b.points) return a.points > b.points ? teamA : teamB;
  if (a.gd !== b.gd) return a.gd > b.gd ? teamA : teamB;
  return a.gf >= b.gf ? teamA : teamB;
}

export function buildRegionSeeds(table, regionKey) {
  const regionTeams = BY_REGION[regionKey];
  const divs = [...new Set(regionTeams.map((t) => TEAMS[t].div))];
  const div1Teams = regionTeams.filter((t) => TEAMS[t].div === divs[0]);
  const div2Teams = regionTeams.filter((t) => TEAMS[t].div === divs[1]);
  const div1Ranked = rankDivision(table, div1Teams);
  const div2Ranked = rankDivision(table, div2Teams);
  return {
    regionKey,
    div1: { name: divs[0], winner: div1Ranked[0], seed2: div1Ranked[1], seed3: div1Ranked[2], missed: div1Ranked[3] },
    div2: { name: divs[1], winner: div2Ranked[0], seed2: div2Ranked[1], seed3: div2Ranked[2], missed: div2Ranked[3] },
  };
}

export function buildAllSeeds(table) {
  const seeds = {};
  for (const regionKey of Object.keys(BY_REGION)) seeds[regionKey] = buildRegionSeeds(table, regionKey);
  return seeds;
}

export let playoffGameId = 0;
export function initPlayoffs(table) {
  playoffGameId = 0;
  const seeds = buildAllSeeds(table);
  const wildcard = [];
  for (const regionKey of Object.keys(seeds)) {
    const s = seeds[regionKey];
    // higher seed (division's #2) hosts the wildcard game
    const g1Home = betterSeed(table, s.div1.seed2, s.div1.seed3);
    wildcard.push({ id: playoffGameId++, round: "wildcard", region: regionKey, bracket: s.div1.name,
      home: g1Home, away: g1Home === s.div1.seed2 ? s.div1.seed3 : s.div1.seed2, winner: null, result: null });
    const g2Home = betterSeed(table, s.div2.seed2, s.div2.seed3);
    wildcard.push({ id: playoffGameId++, round: "wildcard", region: regionKey, bracket: s.div2.name,
      home: g2Home, away: g2Home === s.div2.seed2 ? s.div2.seed3 : s.div2.seed2, winner: null, result: null });
  }
  return { seeds, wildcard, regionalSemis: [], regionalFinal: [], conferenceFinal: [], trophyFinal: null, ccBonus: {}, champion: null };
}

export function playGame(home, away) {
  const raw = simulateGame(home, away, false); // playoffs stay in the season's format (outdoor Corkum for now)
  return { home, away, homeScore: raw.homeScore, awayScore: raw.awayScore, ot: !!raw.ot,
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

export function simulateRegionalSemisRound(playoffs, table) {
  for (const g of playoffs.regionalSemis) {
    const r = playGame(g.home, g.away);
    g.winner = r.winner; g.result = r;
    addCC(playoffs, r.winner, 2);
  }
  for (const regionKey of Object.keys(playoffs.seeds)) {
    const semis = playoffs.regionalSemis.filter((g) => g.region === regionKey);
    const home = betterSeed(table, semis[0].winner, semis[1].winner);
    const away = home === semis[0].winner ? semis[1].winner : semis[0].winner;
    playoffs.regionalFinal.push({ id: playoffGameId++, round: "regionalFinal", region: regionKey, home, away, winner: null, result: null });
  }
}

export function simulateRegionalFinalRound(playoffs, table) {
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
    const home = betterSeed(table, a, b);
    const away = home === a ? b : a;
    playoffs.conferenceFinal.push({ id: playoffGameId++, round: "conferenceFinal", conference: conf, home, away, winner: null, result: null });
  }
}

export function simulateConferenceFinalRound(playoffs, table) {
  for (const g of playoffs.conferenceFinal) {
    const r = playGame(g.home, g.away);
    g.winner = r.winner; g.result = r;
    addCC(playoffs, r.winner, 2);
  }
  const [a, b] = playoffs.conferenceFinal.map((g) => g.winner);
  const higherSeed = betterSeed(table, a, b);
  const otherTeam = higherSeed === a ? b : a;
  // Games 1 & 3 hosted by the better regular-season record (stand-in for All-Star Game result, not yet simulated)
  playoffs.trophyFinal = { teamA: higherSeed, teamB: otherTeam, games: [], winner: null, winsA: 0, winsB: 0 };
}

export function simulateTrophyFinalSeries(playoffs) {
  const tf = playoffs.trophyFinal;
  const hostOrder = [tf.teamA, tf.teamB, tf.teamA]; // games 1 & 3 hosted by teamA (higher seed)
  let gameNum = 0;
  while (tf.winsA < 2 && tf.winsB < 2 && gameNum < 3) {
    const home = hostOrder[gameNum];
    const away = home === tf.teamA ? tf.teamB : tf.teamA;
    const r = playGame(home, away);
    tf.games.push(r);
    addCC(playoffs, r.winner, 2);
    if (r.winner === tf.teamA) tf.winsA++; else tf.winsB++;
    gameNum++;
  }
  tf.winner = tf.winsA === 2 ? tf.teamA : tf.teamB;
  playoffs.champion = tf.winner;
}
