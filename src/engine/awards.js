import { TEAMS, COACHES, PLAYERS_RAW, TEAM_NAMES } from "../data/rawData.js";
import { savePct, MIN_FOR_RATE_LEADERBOARD } from "./playerStats.js";

/* ============================================================
   AWARDS (Master File Section 10)

   Built from signals the engine tracks — player overall/star/leadership/
   balance, team subcategory ratings, roster tag, coach archetype, actual
   season standings/playoff results, and (now that src/engine/playerStats.js
   exists) real season production: points for Offensive Player of the Year,
   caused turnovers for Defensive Player of the Year, save% for Most
   Outstanding Goalie, all pulled from `season.playerStats`. This module
   predates playerStats.js and originally ran on ratings alone — the season-
   long stat tracking it now consumes didn't exist anywhere in this engine
   when it was first built. Every function below is a genuine, defensible
   proxy for what the Master File describes, using data the engine actually
   has — never a fabricated stand-in for a missing signal.

   Seasonal offensive/defensive/goalie awards use a two-step "gate, then
   rank" pattern: first narrow the eligible field to the real statistical
   leaders at the position (the top STAT_GATE_SIZE by the position-
   appropriate real stat, ties included — so Offensive Player of the Year,
   for instance, is always drawn from something like the league's actual
   top handful of scorers), *then* pick the best of that shortlist by
   rating/team context, the same way this module always has. This keeps
   "context can matter" (a comparable player showcased by the right system,
   or on a rebuilding team) without ever letting a highly-rated player who
   simply didn't produce win over the real statistical leaders. When no
   stat data is available yet (a hand-built roster with nobody's played a
   game, or every candidate ties at zero) the gate is a no-op and selection
   falls back to the original ratings-only ranking — so an early, stat-less
   moment (or a test that never sets up playerStats) behaves exactly as
   before, only diverging once real production actually exists to rank on.
   `seasonStats` is optional everywhere below for exactly this reason.

   The Trophy Finals MVP and Davidson Award stay ratings/tiebreak-only —
   playerStats.js is deliberately scoped to regular-season games only (see
   its own header), so there's no honest playoff production number to rank
   a postseason-scoped award on; folding in *regular*-season stats for a
   *postseason* award would conflate the two in exactly the way playerStats.js
   was built to avoid.

   One award from 10.1 is NOT implemented, for the same reason the free-agency
   spec's homegrown bonus wasn't: it depends on data that doesn't exist
   anywhere in the engine, not on missing effort.
     - Comeback Player of the Year needs multi-year per-player injury/struggle
       history; no player field or year-over-year record for this exists.

   10.3's All-VPLL Teams reuse DRAFT_POSITIONS' exact composition (2 Attack, 3
   Midfield, 2 Long-Stick Midfield, 2 Defense, 1 FOGO, 1 Goalie — 11 total) as
   an established "typical lineup shape" already used elsewhere in this
   codebase, since the Master File doesn't specify roster construction.

   A deactivated player (src/engine/deactivation.js) didn't play the season in
   question, so every award scoped to *that* season excludes them — the
   optional `deactivated` param below, `{ team: [names] }` for the season being
   evaluated. The Davidson Award (evaluated across both seasons combined) and
   Coach of the Year (team-level, not a player award) don't take one.
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

// deactivated: optional { team: [names] } for the season being evaluated — a
// deactivated player didn't play, so every award scoped to that season skips them.
function isDeactivated(deactivated, team, name) {
  return !!deactivated?.[team]?.includes(name);
}

// A modest production bonus for MVP/Rookie of the Year — real points matter, but neither
// award is stat-gated (MVP spans every position; a rookie's best asset might be shutdown
// defense, not scoring), so this stays a nudge, never a dominant signal.
const PRODUCTION_BONUS_WEIGHT = 0.3;

// A much stronger, per-stat weight for Offensive/Defensive Player of the Year, Most
// Outstanding Goalie, and All-VPLL Team selection — here the real stat is meant to be the
// *primary* signal (an Offensive Player of the Year that isn't actually one of the league's
// real top scorers isn't a defensible pick), with rating/team-context as a secondary tiebreak
// among genuinely comparable producers, not the deciding factor on its own. Scaled per stat
// because their natural ranges differ wildly: points/caused turnovers are small integer
// counts (roughly 0-56 across a season), while save% is a 0-1 ratio — without this, save%
// would barely move the score at all next to a 40-99 overall.
const STAT_AWARD_WEIGHT = { pts: 1.0, ct: 1.0, savePct: 120 };

function statLineFor(seasonStats, player) {
  return seasonStats ? seasonStats[player[14]] : null;
}

// key: "pts" | "ct" | "savePct". savePct is a rate stat gated by MIN_FOR_RATE_LEADERBOARD.sa
// so a goalie who's faced only a handful of shots can't dominate on a fluky small sample —
// the same floor the Stats tab's own leaderboard uses, reused rather than a second magic number.
function statValueFor(seasonStats, player, key) {
  const line = statLineFor(seasonStats, player);
  if (!line) return 0;
  if (key === "savePct") return line.sa >= MIN_FOR_RATE_LEADERBOARD.sa ? savePct(line) : 0;
  return line[key] || 0;
}

function collectCandidates(filterFn, deactivated) {
  const candidates = [];
  for (const team of TEAM_NAMES) {
    for (const p of PLAYERS_RAW[team]) {
      if (isDeactivated(deactivated, team, p[0])) continue;
      if (filterFn && !filterFn(p, team)) continue;
      candidates.push({ team, p });
    }
  }
  return candidates;
}

function bestOfCandidates(candidates, scoreFn) {
  let best = null;
  for (const { team, p } of candidates) {
    const score = scoreFn(p, team);
    if (score == null) continue;
    if (!best || score > best.score) best = { team, p, score };
  }
  return best ? playerRecord(best.team, best.p) : null;
}

// Shared scan: score every rostered player (optionally filtered), return the highest.
function bestPlayerByScore(scoreFn, filterFn, deactivated) {
  return bestOfCandidates(collectCandidates(filterFn, deactivated), scoreFn);
}

// Narrows `candidates` to the top `n` by a real season stat (ties included) before rating
// gets a say — see the module header's "gate, then rank" note. Opens back up to the full
// field whenever the gate would be meaningless: no seasonStats yet, or every candidate ties
// at zero (nobody's produced *anything* on this stat — an early moment, or a hand-built test
// roster with no game history at all).
function gateToStatLeaders(candidates, seasonStats, statKey, n) {
  if (!seasonStats || !candidates.length) return candidates;
  const withValues = candidates.map((c) => ({ ...c, statValue: statValueFor(seasonStats, c.p, statKey) }));
  withValues.sort((a, b) => b.statValue - a.statValue);
  const cutoff = withValues[Math.min(n, withValues.length) - 1].statValue;
  return cutoff > 0 ? withValues.filter((c) => c.statValue >= cutoff) : candidates;
}

// Gate-then-rank selection used by Offensive/Defensive Player of the Year and Most
// Outstanding Goalie: shortlist to the real statistical leaders at the position, then pick
// the best of that shortlist by overall + team context + the same stat, weighted heavily
// (STAT_AWARD_WEIGHT) — so production keeps mattering *within* the shortlist too, not just
// as the gate that got a player there. Without this second half, a shortlist diluted by
// several tied-at-the-cutoff players could still hand the award to whichever of them
// happens to have the highest overall, ignoring who actually produced more within the elite
// tier. `ratingTermFn` supplies just the rating/team-context piece — this appends `overall`
// and the weighted stat term itself.
function bestStatGatedPlayer(ratingTermFn, filterFn, deactivated, seasonStats, statKey, gateSize) {
  const candidates = collectCandidates(filterFn, deactivated);
  const gated = gateToStatLeaders(candidates, seasonStats, statKey, gateSize);
  const weight = STAT_AWARD_WEIGHT[statKey];
  return bestOfCandidates(gated, (p, team) => p[4] + ratingTermFn(p, team) + statValueFor(seasonStats, p, statKey) * weight);
}

const STAT_GATE_SIZE = 5; // shortlist size for OPOY/DPOY/MOG — the league's real top handful

/* ---------- 10.1 Seasonal Awards ---------- */

// Most impactful player FOR their team, not automatically the best player on the
// best team — a comparably great player elevating a weaker or rebuilding roster
// gets a real bonus, and (now that real production exists) so does a big season.
// Overall still dominates; neither bonus is large enough to hand MVP to a mediocre
// player just because their team is struggling or they racked up empty-net points.
export function computeMVP(deactivated, seasonStats) {
  const avgScore = leagueAvgTeamScore();
  return bestPlayerByScore((p, team) => {
    const contextBonus = Math.max(0, avgScore - TEAMS[team].score) * 1.2 + (UNDERDOG_TAG_BONUS[TEAMS[team].tag] || 0);
    const productionBonus = statValueFor(seasonStats, p, "pts") * PRODUCTION_BONUS_WEIGHT;
    return p[4] + contextBonus + productionBonus;
  }, null, deactivated);
}

// Best offensive performer — restricted to Attack/Midfield, gated to the season's real top
// scorers (see the module header's "gate, then rank"), then ranked within that shortlist by
// overall and by whether the team's Offensive Risk/Pace ratings suggest a system that
// showcases them.
export function computeOffensivePlayerOfTheYear(deactivated, seasonStats) {
  return bestStatGatedPlayer(
    (p, team) => (TEAMS[team].offRisk + TEAMS[team].offPac) * 0.6,
    (p) => OFFENSIVE_POSITIONS.includes(p[1]),
    deactivated, seasonStats, "pts", STAT_GATE_SIZE
  );
}

// Best defensive performer — restricted to Defense/Long-Stick Midfield/FOGO, gated to the
// season's real top caused-turnover producers, then ranked within that shortlist by overall
// and by whether the team's Defensive Positioning/Pressure/Penalty Kill ratings reflect a
// real defensive identity. Caused turnovers are only ever attributed to D/L (boxScore.js has
// no defensive stat for FOGOs — face-off % is possession, not a takeaway), so in practice
// this gate is a D/L race; a FOGO stays technically eligible but needs a real defensive
// season, not just a faceoff-strong one, to ever clear it.
export function computeDefensivePlayerOfTheYear(deactivated, seasonStats) {
  return bestStatGatedPlayer(
    (p, team) => (TEAMS[team].defPos + TEAMS[team].defPre + TEAMS[team].pk) * 0.4,
    (p) => DEFENSIVE_POSITIONS.includes(p[1]),
    deactivated, seasonStats, "ct", STAT_GATE_SIZE
  );
}

// Separate from Defensive POY — goalies only, gated to the season's real top save%
// performers (min MIN_FOR_RATE_LEADERBOARD.sa shots faced, same floor the Stats tab uses —
// a goalie who's faced only a handful of shots can't ride a fluky small sample into the
// shortlist), then ranked within it by overall and Stopping/Consistency/Passing, the three
// traits the Master File calls out by name.
export function computeMostOutstandingGoalie(deactivated, seasonStats) {
  return bestStatGatedPlayer(
    (p, team) => (TEAMS[team].glcStp + TEAMS[team].glcCon + TEAMS[team].glcPas) * 0.4,
    (p) => p[1] === "G",
    deactivated, seasonStats, "savePct", STAT_GATE_SIZE
  );
}

// rookieNames: this season's true first-year players (App.jsx tracks who was
// drafted the offseason immediately before this season — see currentRookies). Rookies span
// every position, so unlike OPOY/DPOY/MOG there's no single stat to gate the whole field on
// (a shutdown rookie defender shouldn't need scoring numbers to compete) — real points still
// count, as the same modest production bonus MVP uses, but as a bonus, not a gate.
export function computeRookieOfTheYear(rookieNames, deactivated, seasonStats) {
  if (!rookieNames || !rookieNames.length) return null;
  const rookieSet = new Set(rookieNames);
  return bestPlayerByScore(
    (p, team) => p[4] + (UNDERDOG_TAG_BONUS[TEAMS[team].tag] ? 2 : 0) + statValueFor(seasonStats, p, "pts") * PRODUCTION_BONUS_WEIGHT,
    (p) => rookieSet.has(p[0]),
    deactivated
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
export function computeTrophyFinalsMVP(playoffs, deactivated) {
  const winner = playoffs?.champion;
  if (!winner) return null;
  const roster = PLAYERS_RAW[winner].filter((p) => !isDeactivated(deactivated, winner, p[0]));
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

// Same "production is the primary signal" idea as OPOY/DPOY/MOG, applied per position: real
// points rank Attack/Midfield, real caused turnovers rank Defense/Long-Stick Midfield, real
// save% ranks Goalie, all at the same STAT_AWARD_WEIGHT those awards use — no hard gate here
// though (a full lineup needs exactly 2 Attack, 3 Midfield, etc. regardless of who's produced
// this season, unlike a single-winner award that can afford to shortlist first). FOGO has no
// equivalent defensive/offensive stat in this engine, so it stays rating-only.
const POSITION_PRODUCTION_STAT = { A: "pts", M: "pts", D: "ct", L: "ct", G: "savePct" };

function topNAtPosition(pos, n, exclude, filterFn, deactivated, seasonStats) {
  const candidates = [];
  for (const team of TEAM_NAMES) {
    for (const p of PLAYERS_RAW[team]) {
      if (p[1] !== pos) continue;
      if (exclude.has(`${team} ${p[0]}`)) continue;
      if (isDeactivated(deactivated, team, p[0])) continue;
      if (filterFn && !filterFn(p, team)) continue;
      candidates.push({ team, p });
    }
  }
  const statKey = POSITION_PRODUCTION_STAT[pos];
  const scoreOf = (p) => p[4] + (statKey ? statValueFor(seasonStats, p, statKey) * STAT_AWARD_WEIGHT[statKey] : 0);
  candidates.sort((a, b) => scoreOf(b.p) - scoreOf(a.p));
  return candidates.slice(0, n).map(({ team, p }) => {
    exclude.add(`${team} ${p[0]}`);
    return playerRecord(team, p);
  });
}

function composeLineup(exclude, filterFn, deactivated, seasonStats) {
  const counts = {};
  for (const pos of ALL_VPLL_SHAPE) counts[pos] = (counts[pos] || 0) + 1;
  const lineup = [];
  for (const [pos, n] of Object.entries(counts)) lineup.push(...topNAtPosition(pos, n, exclude, filterFn, deactivated, seasonStats));
  return lineup;
}

// First and Second Team share one exclusion set, so the same player can't
// appear on both.
export function computeAllVPLLTeams(deactivated, seasonStats) {
  const exclude = new Set();
  const firstTeam = composeLineup(exclude, null, deactivated, seasonStats);
  const secondTeam = composeLineup(exclude, null, deactivated, seasonStats);
  return { firstTeam, secondTeam };
}

export function computeAllRookieTeam(rookieNames, deactivated, seasonStats) {
  if (!rookieNames || !rookieNames.length) return [];
  const rookieSet = new Set(rookieNames);
  return composeLineup(new Set(), (p) => rookieSet.has(p[0]), deactivated, seasonStats);
}

/* ---------- One call for a season's full award slate ---------- */
// deactivated: optional { team: [names] } for this season (src/engine/deactivation.js) —
// excludes deactivated players from every award scoped to this season's play.
// seasonStats: optional season.playerStats (src/engine/playerStats.js) for the same season —
// real production informing Offensive/Defensive Player of the Year, Most Outstanding Goalie,
// MVP, Rookie of the Year, and All-VPLL/All-Rookie selection (see module header).
export function computeSeasonAwards(table, playoffs, rookieNames, deactivated, seasonStats) {
  return {
    mvp: computeMVP(deactivated, seasonStats),
    opoy: computeOffensivePlayerOfTheYear(deactivated, seasonStats),
    dpoy: computeDefensivePlayerOfTheYear(deactivated, seasonStats),
    mog: computeMostOutstandingGoalie(deactivated, seasonStats),
    roy: computeRookieOfTheYear(rookieNames, deactivated, seasonStats),
    coy: computeCoachOfTheYear(table),
    finalsMVP: computeTrophyFinalsMVP(playoffs, deactivated),
    allVPLL: computeAllVPLLTeams(deactivated, seasonStats),
    allRookie: computeAllRookieTeam(rookieNames, deactivated, seasonStats),
  };
}
