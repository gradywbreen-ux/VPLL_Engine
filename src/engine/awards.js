import { TEAMS, COACHES, PLAYERS_RAW, TEAM_NAMES } from "../data/rawData.js";

/* ============================================================
   AWARDS (Master File Section 10)

   Built entirely from signals the engine already tracks — player overall/star/
   leadership/balance, team subcategory ratings, roster tag, coach archetype,
   and actual season standings/playoff results — not from season-long
   individual stat tracking (goals/assists), which doesn't exist anywhere in
   this engine and is explicitly deferred pending its own design pass (see
   CLAUDE.md's "Known scope boundaries"). Every function below is a genuine,
   defensible proxy for what the Master File describes, using data the engine
   actually has — never a fabricated stand-in for a missing signal.

   One award from 10.1 is NOT implemented, for the same reason the free-agency
   spec's homegrown bonus wasn't: it depends on data that doesn't exist
   anywhere in the engine, not on missing effort.
     - Comeback Player of the Year needs multi-year per-player injury/struggle
       history; no player field or year-over-year record for this exists.

   10.3's All-VPLL Teams reuse DRAFT_POSITIONS' exact composition (2 Attack, 3
   Midfield, 2 Long-Stick Midfield, 2 Defense, 1 FOGO, 1 Goalie — 11 total) as
   an established "typical lineup shape" already used elsewhere in this
   codebase, since the Master File doesn't specify roster construction.
   ============================================================ */

const OFFENSIVE_POSITIONS = ["A", "M"];
const DEFENSIVE_POSITIONS = ["D", "L", "F"];
const ALL_VPLL_SHAPE = ["A", "A", "M", "M", "M", "L", "L", "D", "D", "F", "G"];

// A team already struggling (Rebuilding, Young & Inexperienced) makes a standout
// player's or coach's contribution weigh more, per the Master File's own framing
// ("Star on a rebuilding squad ... a legitimate candidate", "Naturally tied to
// Rebuilding or Young & Inexperienced teams punching above weight").
const UNDERDOG_TAG_BONUS = { "Rebuilding / Unknown": 6, "Young & Inexperienced": 4 };

function leagueAvgTeamScore() {
  return TEAM_NAMES.reduce((sum, t) => sum + TEAMS[t].score, 0) / TEAM_NAMES.length;
}

function playerRecord(team, p) {
  return { team, name: p[0], pos: p[1], ovr: p[4] };
}

// Shared scan: score every rostered player (optionally filtered), return the highest.
function bestPlayerByScore(scoreFn, filterFn) {
  let best = null;
  for (const team of TEAM_NAMES) {
    for (const p of PLAYERS_RAW[team]) {
      if (filterFn && !filterFn(p, team)) continue;
      const score = scoreFn(p, team);
      if (score == null) continue;
      if (!best || score > best.score) best = { team, p, score };
    }
  }
  return best ? playerRecord(best.team, best.p) : null;
}

/* ---------- 10.1 Seasonal Awards ---------- */

// Most impactful player FOR their team, not automatically the best player on the
// best team — a comparably great player elevating a weaker or rebuilding roster
// gets a real (but modest, overall still dominates) bonus.
export function computeMVP() {
  const avgScore = leagueAvgTeamScore();
  return bestPlayerByScore((p, team) => {
    const contextBonus = Math.max(0, avgScore - TEAMS[team].score) * 1.2 + (UNDERDOG_TAG_BONUS[TEAMS[team].tag] || 0);
    return p[4] + contextBonus;
  });
}

// Best offensive performer — restricted to Attack/Midfield, weighted toward teams
// whose Offensive Risk/Pace ratings suggest a system that showcases them.
export function computeOffensivePlayerOfTheYear() {
  return bestPlayerByScore(
    (p, team) => {
      const t = TEAMS[team];
      return p[4] + (t.offRisk + t.offPac) * 0.6;
    },
    (p) => OFFENSIVE_POSITIONS.includes(p[1])
  );
}

// Best defensive performer — restricted to Defense/Long-Stick Midfield/FOGO,
// weighted toward teams whose Defensive Positioning/Pressure/Penalty Kill
// ratings reflect a real defensive identity.
export function computeDefensivePlayerOfTheYear() {
  return bestPlayerByScore(
    (p, team) => {
      const t = TEAMS[team];
      return p[4] + (t.defPos + t.defPre + t.pk) * 0.4;
    },
    (p) => DEFENSIVE_POSITIONS.includes(p[1])
  );
}

// Separate from Defensive POY — goalies only, weighted toward Stopping/
// Consistency/Passing, the three traits the Master File calls out by name.
export function computeMostOutstandingGoalie() {
  return bestPlayerByScore(
    (p, team) => {
      const t = TEAMS[team];
      return p[4] + (t.glcStp + t.glcCon + t.glcPas) * 0.4;
    },
    (p) => p[1] === "G"
  );
}

// rookieNames: this season's true first-year players (App.jsx tracks who was
// drafted the offseason immediately before this season — see currentRookies).
export function computeRookieOfTheYear(rookieNames) {
  if (!rookieNames || !rookieNames.length) return null;
  const rookieSet = new Set(rookieNames);
  return bestPlayerByScore(
    (p, team) => p[4] + (UNDERDOG_TAG_BONUS[TEAMS[team].tag] ? 2 : 0),
    (p) => rookieSet.has(p[0])
  );
}

// Overachievement relative to what the team's own rating would predict — a
// genuinely clean fit using data that already exists (no new tracking needed):
// actual win% this season vs. team.score treated as a crude expected-win-rate.
export function computeCoachOfTheYear(table) {
  let best = null;
  for (const team of TEAM_NAMES) {
    const row = table[team];
    if (!row || row.gamesPlayed === 0) continue;
    const overachievement = row.w / row.gamesPlayed - TEAMS[team].score / 100;
    if (!best || overachievement > best.overachievement) {
      const coach = COACHES[team];
      best = { team, overachievement, coach: coach.hc, arch: coach.hcArch };
    }
  }
  return best ? { team: best.team, coach: best.coach, arch: best.arch } : null;
}

/* ---------- 10.2 Postseason Awards ---------- */

// Trophy Final MVP — the winning team's top player. No per-game individual
// series stats exist to break ties on, so star flag then overall then
// leadership stand in as the tiebreak order.
export function computeTrophyFinalsMVP(playoffs) {
  const winner = playoffs?.champion;
  if (!winner) return null;
  const roster = PLAYERS_RAW[winner];
  if (!roster.length) return null;
  const top = [...roster].sort((a, b) => (b[5] - a[5]) || (b[4] - a[4]) || (b[6] - a[6]))[0];
  return playerRecord(winner, top);
}

// The Davidson Award — Commissioners Cup MVP, the top player on the Cup
// champion. "A player with poor Indoor/Outdoor Balance is almost by
// definition ineligible" is implemented literally: prefer players with at
// least mid-scale balance (bal >= 5 on the 1-10 field), falling back to the
// full roster only if nobody clears that bar, so the award never comes up
// empty on a real roster.
export function computeDavidsonAward(cupChampionTeam) {
  if (!cupChampionTeam) return null;
  const roster = PLAYERS_RAW[cupChampionTeam];
  if (!roster.length) return null;
  const balanced = roster.filter((p) => p[7] >= 5);
  const pool = balanced.length ? balanced : roster;
  const top = [...pool].sort((a, b) => (b[5] - a[5]) || (b[4] - a[4]))[0];
  return { ...playerRecord(cupChampionTeam, top), bal: top[7] };
}

/* ---------- 10.3 All-VPLL Teams ---------- */

function topNAtPosition(pos, n, exclude, filterFn) {
  const candidates = [];
  for (const team of TEAM_NAMES) {
    for (const p of PLAYERS_RAW[team]) {
      if (p[1] !== pos) continue;
      if (exclude.has(`${team} ${p[0]}`)) continue;
      if (filterFn && !filterFn(p, team)) continue;
      candidates.push({ team, p });
    }
  }
  candidates.sort((a, b) => b.p[4] - a.p[4]);
  return candidates.slice(0, n).map(({ team, p }) => {
    exclude.add(`${team} ${p[0]}`);
    return playerRecord(team, p);
  });
}

function composeLineup(exclude, filterFn) {
  const counts = {};
  for (const pos of ALL_VPLL_SHAPE) counts[pos] = (counts[pos] || 0) + 1;
  const lineup = [];
  for (const [pos, n] of Object.entries(counts)) lineup.push(...topNAtPosition(pos, n, exclude, filterFn));
  return lineup;
}

// First and Second Team share one exclusion set, so the same player can't
// appear on both.
export function computeAllVPLLTeams() {
  const exclude = new Set();
  const firstTeam = composeLineup(exclude);
  const secondTeam = composeLineup(exclude);
  return { firstTeam, secondTeam };
}

export function computeAllRookieTeam(rookieNames) {
  if (!rookieNames || !rookieNames.length) return [];
  const rookieSet = new Set(rookieNames);
  return composeLineup(new Set(), (p) => rookieSet.has(p[0]));
}

/* ---------- One call for a season's full award slate ---------- */
export function computeSeasonAwards(table, playoffs, rookieNames) {
  return {
    mvp: computeMVP(),
    opoy: computeOffensivePlayerOfTheYear(),
    dpoy: computeDefensivePlayerOfTheYear(),
    mog: computeMostOutstandingGoalie(),
    roy: computeRookieOfTheYear(rookieNames),
    coy: computeCoachOfTheYear(table),
    finalsMVP: computeTrophyFinalsMVP(playoffs),
    allVPLL: computeAllVPLLTeams(),
    allRookie: computeAllRookieTeam(rookieNames),
  };
}
