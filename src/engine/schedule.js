import { TEAMS, TEAM_NAMES } from "../data/rawData.js";

/* ============================================================
   SCHEDULE GENERATION (Master File Section 1.4, 15)
   ============================================================ */

export function groupBy(keyFn) {
  const groups = {};
  for (const name of TEAM_NAMES) {
    const key = keyFn(TEAMS[name]);
    if (!groups[key]) groups[key] = [];
    groups[key].push(name);
  }
  return groups;
}
export const BY_DIVISION = groupBy((t) => `${t.conf}|${t.div}`);
export const BY_REGION = groupBy((t) => `${t.conf}|${t.region}`);
export const BY_CONFERENCE = groupBy((t) => t.conf);

export let gameIdCounter = 0;
export function makePairing(teamA, teamB, type) {
  return { id: gameIdCounter++, teamA, teamB, type, home: null, away: null, week: null };
}

export function buildSeasonPairings() {
  const pairings = [];
  for (const div of Object.values(BY_DIVISION)) {
    for (let i = 0; i < div.length; i++)
      for (let j = i + 1; j < div.length; j++) {
        pairings.push(makePairing(div[i], div[j], "division"));
        pairings.push(makePairing(div[i], div[j], "division"));
      }
  }
  for (const regionTeams of Object.values(BY_REGION)) {
    const divs = [...new Set(regionTeams.map((t) => TEAMS[t].div))];
    const groupA = regionTeams.filter((t) => TEAMS[t].div === divs[0]);
    const groupB = regionTeams.filter((t) => TEAMS[t].div === divs[1]);
    for (const a of groupA) for (const b of groupB) pairings.push(makePairing(a, b, "region"));
  }
  for (const confTeams of Object.values(BY_CONFERENCE)) {
    const regions = [...new Set(confTeams.map((t) => TEAMS[t].region))];
    const regionA = confTeams.filter((t) => TEAMS[t].region === regions[0]);
    const regionB = confTeams.filter((t) => TEAMS[t].region === regions[1]);
    for (let i = 0; i < regionA.length; i++)
      for (let d = 0; d < 4; d++) {
        const j = (i + d) % regionB.length;
        pairings.push(makePairing(regionA[i], regionB[j], "conference"));
      }
  }
  const lakeshore = TEAM_NAMES.filter((t) => TEAMS[t].conf === "Lake");
  const mountainside = TEAM_NAMES.filter((t) => TEAMS[t].conf === "Moun");
  for (let i = 0; i < lakeshore.length; i++)
    for (let d = 0; d < 2; d++) {
      const j = (i + d) % mountainside.length;
      pairings.push(makePairing(lakeshore[i], mountainside[j], "interconference"));
    }
  return pairings;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function assignHomeAway(pairings) {
  const homeCounts = {};
  for (const name of TEAM_NAMES) homeCounts[name] = 0;
  const order = shuffle(pairings);
  for (const g of order) {
    const aHome = homeCounts[g.teamA], bHome = homeCounts[g.teamB];
    if (aHome < bHome) { g.home = g.teamA; g.away = g.teamB; }
    else if (bHome < aHome) { g.home = g.teamB; g.away = g.teamA; }
    else if (Math.random() < 0.5) { g.home = g.teamA; g.away = g.teamB; }
    else { g.home = g.teamB; g.away = g.teamA; }
    homeCounts[g.home]++;
  }
  return pairings;
}

export function maxImbalanceOf(games) {
  const counts = {};
  for (const name of TEAM_NAMES) counts[name] = { home: 0, away: 0 };
  for (const g of games) { counts[g.home].home++; counts[g.away].away++; }
  return Math.max(...Object.values(counts).map((c) => Math.abs(c.home - c.away)));
}

export function buildBalancedPairings() {
  const pairings = buildSeasonPairings();
  let best = null, bestImb = Infinity;
  for (let attempt = 0; attempt < 25; attempt++) {
    const trial = assignHomeAway(pairings.map((g) => ({ ...g, home: null, away: null })));
    const imb = maxImbalanceOf(trial);
    if (imb < bestImb) { bestImb = imb; best = trial; }
    if (bestImb <= 2) break;
  }
  return best;
}

export function assignWeeks(games) {
  const teamWeekCount = {};
  for (const name of TEAM_NAMES) teamWeekCount[name] = new Array(14).fill(0);
  function bump(team, week) { teamWeekCount[team][week]++; }

  const interGames = games.filter((g) => g.type === "interconference");
  const assignedInterTeams = new Set();
  for (const g of interGames) {
    const aFree7 = !assignedInterTeams.has(g.teamA + "_7");
    const bFree7 = !assignedInterTeams.has(g.teamB + "_7");
    if (aFree7 && bFree7) { g.week = 7; assignedInterTeams.add(g.teamA + "_7"); assignedInterTeams.add(g.teamB + "_7"); }
    else { g.week = 12; assignedInterTeams.add(g.teamA + "_12"); assignedInterTeams.add(g.teamB + "_12"); }
    bump(g.teamA, g.week); bump(g.teamB, g.week);
  }

  for (const div of Object.values(BY_DIVISION)) {
    const divGames = games.filter((g) => g.type === "division" && div.includes(g.teamA) && div.includes(g.teamB));
    const pairKey = (g) => [g.teamA, g.teamB].sort().join("|");
    const byPair = {};
    for (const g of divGames) { const k = pairKey(g); (byPair[k] = byPair[k] || []).push(g); }
    const [W, X, Y, Z] = div;
    for (const [t1, t2] of [[W, X], [Y, Z]]) {
      const k = [t1, t2].sort().join("|");
      const cand = byPair[k];
      if (cand && cand.length) { cand[0].week = 13; bump(cand[0].teamA, 13); bump(cand[0].teamB, 13); }
    }
  }

  const remainingWeeks = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11];
  const remainingGames = shuffle(games.filter((g) => g.week === null));
  for (const g of remainingGames) {
    let bestWeek = null, bestScore = Infinity;
    for (const w of remainingWeeks) {
      const aCount = teamWeekCount[g.teamA][w], bCount = teamWeekCount[g.teamB][w];
      if (aCount >= 2 || bCount >= 2) continue;
      const score = aCount + bCount;
      if (score < bestScore) { bestScore = score; bestWeek = w; }
    }
    if (bestWeek === null) {
      bestWeek = remainingWeeks.reduce((min, w) =>
        teamWeekCount[g.teamA][w] + teamWeekCount[g.teamB][w] < teamWeekCount[g.teamA][min] + teamWeekCount[g.teamB][min] ? w : min,
      remainingWeeks[0]);
    }
    g.week = bestWeek;
    bump(g.teamA, bestWeek); bump(g.teamB, bestWeek);
  }
  return games;
}

export function generateFullSchedule() {
  gameIdCounter = 0;
  const pairings = buildBalancedPairings();
  return assignWeeks(pairings).sort((a, b) => a.week - b.week);
}
