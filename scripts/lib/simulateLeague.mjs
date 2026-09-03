/* ============================================================
   HEADLESS MULTI-YEAR LEAGUE SIMULATION HARNESS
   Runs the exact year-over-year flow the UI drives by hand (App.jsx), without
   React: full Corkum (outdoor) season + playoffs, full Culkin (indoor) season
   + playoffs, combined Commissioners Cup standings, then the six offseason
   steps in the same order the Offseason tab enforces — Draft, Coaching,
   Retirement, Free Agency, Trades, Progression. Every step below (other
   than Free Agency, which is shared via src/engine/freeAgency.js — see
   CLAUDE.md) is a line-for-line mirror of the corresponding handler in
   src/App.jsx; if you change one of those handlers there, update it here
   too so this harness keeps testing what the app actually does.

   This mutates the live TEAMS/PLAYERS_RAW/COACHES singletons exactly like
   the real app does (see CLAUDE.md's "Critical architectural gotcha") —
   callers should resetLeagueDataToYear1() before a run for a clean baseline.
   ============================================================ */
import { TEAMS, PLAYERS_RAW, COACHES, TEAM_NAMES, PLAYER_POOL } from "../../src/data/rawData.js";
import { resetLeagueDataToYear1 } from "../../src/data/reset.js";
import { rand } from "../../src/engine/mathHelpers.js";
import { CONTRACT_TYPES, assignNewContract } from "../../src/engine/contracts.js";
import { simulateGame } from "../../src/engine/simulation.js";
import { generateFullSchedule } from "../../src/engine/schedule.js";
import { runTradeEngine } from "../../src/engine/trades.js";
import { computeStandings } from "../../src/engine/standings.js";
import {
  initPlayoffs, simulateWildcardRound, simulateRegionalSemisRound,
  simulateRegionalFinalRound, simulateConferenceFinalRound, simulateTrophyFinalSeries,
} from "../../src/engine/playoffs.js";
import { applyLeagueProgression } from "../../src/engine/progression.js";
import { buildDraftOrder, generateProspect } from "../../src/engine/draft.js";
import { evaluateFiring, generateFreshCoach } from "../../src/engine/coaching.js";
import { evaluateRetirement } from "../../src/engine/retirement.js";
import { runFreeAgency } from "../../src/engine/freeAgency.js";
import {
  cutRosterToSize, ensureFloorBeforeRemoval, maintainPlayerPool,
  DRAFT_ROSTER_CAP, SEASON_ROSTER_CAP, MIN_ROSTER_SIZE, MAX_POOL_PER_POSITION, POSITION_MINIMUMS,
} from "../../src/engine/roster.js";
import { assignHometown } from "../../src/engine/hometown.js";

/* ---------- Season + playoffs, one season type, fully to completion ---------- */
function simulateFullSeasonResults(schedule, isIndoor) {
  const results = {};
  for (let w = 1; w <= 13; w++) {
    const weekGames = schedule.filter((g) => g.week === w);
    const gamesPlayedThisWeek = {};
    for (const g of weekGames) {
      const homeFatigued = (gamesPlayedThisWeek[g.home] || 0) >= 1;
      const awayFatigued = (gamesPlayedThisWeek[g.away] || 0) >= 1;
      const res = simulateGame(g.home, g.away, isIndoor, homeFatigued, awayFatigued);
      results[g.id] = { homeScore: res.homeScore, awayScore: res.awayScore, ot: !!res.ot };
      gamesPlayedThisWeek[g.home] = (gamesPlayedThisWeek[g.home] || 0) + 1;
      gamesPlayedThisWeek[g.away] = (gamesPlayedThisWeek[g.away] || 0) + 1;
    }
  }
  return results;
}

function simulateFullPlayoffs(table, schedule, results, isIndoor = false) {
  const playoffs = initPlayoffs(table, schedule, results);
  simulateWildcardRound(playoffs);
  simulateRegionalSemisRound(playoffs, table, schedule, results);
  simulateRegionalFinalRound(playoffs, table, schedule, results);
  simulateConferenceFinalRound(playoffs, table, isIndoor);
  simulateTrophyFinalSeries(playoffs);
  return playoffs;
}

function playoffTeamSet(playoffs) {
  const set = new Set();
  if (!playoffs) return set;
  for (const g of playoffs.wildcard) { set.add(g.home); set.add(g.away); }
  for (const rk of Object.keys(playoffs.seeds)) { set.add(playoffs.seeds[rk].div1.winner); set.add(playoffs.seeds[rk].div2.winner); }
  return set;
}

/* Mirrors App.jsx's combinedCupStandings useMemo exactly. */
function computeCombinedCupStandings(corkumTable, corkumPlayoffs, culkinTable, culkinPlayoffs) {
  const combined = {};
  for (const name of TEAM_NAMES) {
    const corkumBase = corkumTable[name].points;
    const corkumBonus = corkumPlayoffs.ccBonus[name] || 0;
    const culkinBase = culkinTable[name].points;
    const culkinBonus = culkinPlayoffs.ccBonus[name] || 0;
    const corkumTotal = corkumBase + corkumBonus;
    const culkinTotal = culkinBase + culkinBonus;
    combined[name] = {
      team: name, corkumTotal, culkinTotal, points: corkumTotal + culkinTotal,
      w: corkumTable[name].w + culkinTable[name].w,
      l: corkumTable[name].l + culkinTable[name].l,
      gf: corkumTable[name].gf + culkinTable[name].gf,
      ga: corkumTable[name].ga + culkinTable[name].ga,
      gd: corkumTable[name].gd + culkinTable[name].gd,
      otl: corkumTable[name].otl + culkinTable[name].otl,
    };
  }
  return combined;
}

/* ---------- Offseason steps — each block mirrors its App.jsx handler exactly ---------- */
function runDraft(combinedCupStandings) {
  const standingsArr = Object.values(combinedCupStandings);
  const draftOrder = buildDraftOrder(standingsArr);
  const usedNames = new Set();
  for (const t of TEAM_NAMES) { PLAYERS_RAW[t].forEach((p) => usedNames.add(p[0])); COACHES[t] && usedNames.add(COACHES[t].hc); }
  for (const p of PLAYER_POOL) usedNames.add(p[0]);

  const results = [];
  let overallPick = 1;
  for (let round = 1; round <= 5; round++) {
    for (const team of draftOrder) {
      const pr = generateProspect(round, usedNames, team);
      results.push({ overallPick, round, team, prospect: pr });
      const leadership = Math.round(rand(30, 60));
      const balance = Math.round(rand(3, 8));
      const durability = Math.round(rand(45, 80));
      const tuple = [pr.name, pr.pos, pr.hand, pr.age, pr.overall, 0, leadership, balance, durability];
      assignNewContract(tuple, CONTRACT_TYPES.ROOKIE);
      const roundScale = [1, 0.75, 0.55, 0.4, 0.3][round - 1];
      tuple[9] = Math.round((tuple[9] * roundScale) / 500) * 500;
      tuple[12] = pr.ceiling;
      tuple[13] = assignHometown();
      PLAYERS_RAW[team].push(tuple);
      overallPick++;
    }
  }
  for (const team of TEAM_NAMES) cutRosterToSize(team, DRAFT_ROSTER_CAP);
  return { draftOrder, results };
}

function runCoaching(combinedCupStandings, corkumPlayoffs, culkinPlayoffs) {
  const standingsArr = Object.values(combinedCupStandings).sort((a, b) => b.points - a.points);
  const corkumPlayoffTeams = playoffTeamSet(corkumPlayoffs);
  const culkinPlayoffTeams = playoffTeamSet(culkinPlayoffs);
  const usedNames = new Set();
  for (const t of TEAM_NAMES) { PLAYERS_RAW[t].forEach((p) => usedNames.add(p[0])); usedNames.add(COACHES[t].hc); }
  for (const p of PLAYER_POOL) usedNames.add(p[0]);

  const fired = [];
  standingsArr.forEach((entry, idx) => {
    const coach = COACHES[entry.team];
    const { fired: wasFired, strugglingYears } = evaluateFiring(coach, corkumPlayoffTeams.has(entry.team), culkinPlayoffTeams.has(entry.team), idx + 1, coach.hcComp);
    coach.hcStruggleYears = strugglingYears;
    if (wasFired) fired.push({ team: entry.team, oldCoach: coach.hc, oldArch: coach.hcArch, tenure: coach.hcTenure || 1 });
    else coach.hcTenure = (coach.hcTenure || 1) + 1;
  });

  const hired = [];
  for (const f of fired) {
    const newCoach = generateFreshCoach(usedNames);
    COACHES[f.team].hc = newCoach.name;
    COACHES[f.team].hcArch = newCoach.archetype;
    COACHES[f.team].hcComp = newCoach.competence;
    COACHES[f.team].hcDev = newCoach.development;
    COACHES[f.team].hcTenure = 1;
    COACHES[f.team].hcStruggleYears = 0;
    hired.push({ team: f.team, newCoach: newCoach.name, newArch: newCoach.archetype });
  }
  return { fired, hired };
}

function runRetirement() {
  const usedNames = new Set();
  for (const t of TEAM_NAMES) { PLAYERS_RAW[t].forEach((p) => usedNames.add(p[0])); COACHES[t] && usedNames.add(COACHES[t].hc); }
  for (const p of PLAYER_POOL) usedNames.add(p[0]);

  const retirees = [], poolSignings = [];
  for (const teamName of TEAM_NAMES) {
    const roster = PLAYERS_RAW[teamName];
    for (let i = roster.length - 1; i >= 0; i--) {
      if (evaluateRetirement(roster[i])) {
        retirees.push({ team: teamName, name: roster[i][0], age: roster[i][3], pos: roster[i][1] });
        const backfill = ensureFloorBeforeRemoval(teamName, roster[i][1], usedNames);
        if (backfill) poolSignings.push(backfill);
        roster.splice(i, 1);
      }
    }
  }
  return { retirees, poolSignings };
}

/* ---------- Stats ---------- */
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stddev(arr) {
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((v) => (v - m) ** 2)));
}

function rosterIntegrityViolations() {
  const violations = [];
  for (const name of TEAM_NAMES) {
    const roster = PLAYERS_RAW[name];
    if (roster.length < MIN_ROSTER_SIZE || roster.length > SEASON_ROSTER_CAP) violations.push(`${name}: roster size ${roster.length} out of [${MIN_ROSTER_SIZE},${SEASON_ROSTER_CAP}]`);
    const seen = new Set();
    for (const p of roster) {
      if (seen.has(p[0])) violations.push(`${name}: duplicate player "${p[0]}"`);
      seen.add(p[0]);
      if (!Number.isFinite(p[4]) || p[4] < 1 || p[4] > 99) violations.push(`${name}: ${p[0]} has invalid overall ${p[4]}`);
      if (!Number.isFinite(p[3]) || p[3] < 15 || p[3] > 60) violations.push(`${name}: ${p[0]} has invalid age ${p[3]}`);
    }
  }
  for (const name of TEAM_NAMES) {
    const score = TEAMS[name].score;
    if (!Number.isFinite(score) || score < 1 || score > 99) violations.push(`${name}: invalid team score ${score}`);
  }

  const poolCap = Object.keys(POSITION_MINIMUMS).length * MAX_POOL_PER_POSITION;
  if (PLAYER_POOL.length > poolCap) violations.push(`player pool: size ${PLAYER_POOL.length} exceeds cap ${poolCap}`);
  const poolSeen = new Set();
  for (const p of PLAYER_POOL) {
    if (poolSeen.has(p[0])) violations.push(`player pool: duplicate player "${p[0]}"`);
    poolSeen.add(p[0]);
  }
  return violations;
}

/* ---------- One full simulated year: both seasons, both playoffs, full offseason ---------- */
export function simulateOneYear() {
  const corkumSchedule = generateFullSchedule();
  const corkumResults = simulateFullSeasonResults(corkumSchedule, false);
  const corkumTable = computeStandings(corkumSchedule, corkumResults);
  const corkumPlayoffs = simulateFullPlayoffs(corkumTable, corkumSchedule, corkumResults, false);

  const culkinSchedule = generateFullSchedule();
  const culkinResults = simulateFullSeasonResults(culkinSchedule, true);
  const culkinTable = computeStandings(culkinSchedule, culkinResults);
  const culkinPlayoffs = simulateFullPlayoffs(culkinTable, culkinSchedule, culkinResults, true);

  const combinedCupStandings = computeCombinedCupStandings(corkumTable, corkumPlayoffs, culkinTable, culkinPlayoffs);
  const cupChampion = Object.values(combinedCupStandings).sort((a, b) => b.points - a.points)[0].team;

  const ranked = Object.values(combinedCupStandings).sort((a, b) => b.points - a.points);
  const top5 = ranked.slice(0, 5).map((r) => r.team);
  const bottom5 = ranked.slice(-5).map((r) => r.team);

  // Offseason, in the exact order the Offseason tab enforces: Draft -> Coaching ->
  // Retirement -> Free Agency -> Trades -> Progression. All six read the same
  // combinedCupStandings computed above (it doesn't change until seasons reset).
  runDraft(combinedCupStandings);
  const coaching = runCoaching(combinedCupStandings, corkumPlayoffs, culkinPlayoffs);
  runRetirement();
  runFreeAgency(combinedCupStandings);
  runTradeEngine(combinedCupStandings);
  applyLeagueProgression(combinedCupStandings);

  // Training camp cuts (Master File 9.7) — final roster-size pass before the next
  // year's seasons open, mirrors App.jsx's beginYear2.
  for (const team of TEAM_NAMES) cutRosterToSize(team, SEASON_ROSTER_CAP);
  maintainPlayerPool();

  const ratingSD = stddev(TEAM_NAMES.map((n) => TEAMS[n].score));
  const ratingMean = mean(TEAM_NAMES.map((n) => TEAMS[n].score));

  return {
    corkumChampion: corkumPlayoffs.champion,
    culkinChampion: culkinPlayoffs.champion,
    cupChampion,
    top5,
    bottom5,
    coachesFired: coaching.fired.length,
    ratingSD,
    ratingMean,
    rosterIntegrityViolations: rosterIntegrityViolations(),
  };
}

/* ---------- N-year run, from a fresh Year 1 baseline ---------- */
export function simulateYears(n, { reset = true, onYearComplete } = {}) {
  if (reset) resetLeagueDataToYear1();
  const years = [];
  for (let y = 1; y <= n; y++) {
    const yearStats = simulateOneYear();
    years.push({ year: y, ...yearStats });
    if (onYearComplete) onYearComplete(years[years.length - 1]);
  }
  return years;
}
