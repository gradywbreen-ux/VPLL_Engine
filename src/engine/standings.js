import { TEAM_NAMES } from "../data/rawData.js";

/* ============================================================
   STANDINGS
   ============================================================ */
export function computeStandings(schedule, results) {
  const table = {};
  for (const name of TEAM_NAMES) {
    table[name] = { team: name, w: 0, l: 0, otl: 0, points: 0, gf: 0, ga: 0, gd: 0, gamesPlayed: 0 };
  }
  for (const g of schedule) {
    const res = results[g.id];
    if (!res) continue;
    const home = table[g.home], away = table[g.away];
    home.gamesPlayed++; away.gamesPlayed++;
    home.gf += res.homeScore; home.ga += res.awayScore;
    away.gf += res.awayScore; away.ga += res.homeScore;
    if (res.homeScore > res.awayScore) {
      home.w++; home.points += 1;
      if (res.ot) away.otl++; else away.l++;
    } else {
      away.w++; away.points += 1;
      if (res.ot) home.otl++; else home.l++;
    }
  }
  for (const t of Object.values(table)) t.gd = t.gf - t.ga;
  return table;
}

export function standingsForGroup(table, teamList) {
  return teamList
    .map((name) => table[name])
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
}
