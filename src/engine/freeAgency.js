import { TEAMS, TEAM_NAMES, COACHES, PLAYERS_RAW, PLAYER_POOL } from "../data/rawData.js";
import { clamp } from "./mathHelpers.js";
import { SALARY_CAP, teamPayroll, capFine, assignNewContract } from "./contracts.js";
import { avgOverallByPosition } from "./ratings.js";
import { HC_TAG_FIT } from "./simulation.js";
import { ensureFloorBeforeRemoval, enforceRosterFloor, DRAFT_ROSTER_CAP } from "./roster.js";

/* ============================================================
   FREE AGENCY (Master File 9.4/9.5, extended per
   docs/VPLL_Free_Agency_Tiers_Spec.md)

   This is the one subsystem CLAUDE.md flags as still duplicated across
   App.jsx and scripts/lib/simulateLeague.mjs rather than shared as its own
   module — pulling it out here (both call runFreeAgency() now) closes that
   gap and gives the tier/scarcity/cap-pressure additions below a single
   home instead of a third copy-pasted implementation.
   ============================================================ */

// ---------- §1 Free Agent Tiers ----------
// Computed at the point a contract expires or a market decision is being made — never
// stored on the player — so it always reflects *current* overall (which can shift via
// developPlayer() year to year), not overall at draft/signing time.
export const FREE_AGENT_TIER_NAMES = { 1: "Franchise", 2: "Quality Starter", 3: "Rotational", 4: "Journeyman" };

// §2 Position Scarcity Premium — Goalie/FOGO/Long-Stick Midfield are structurally
// rarer/more specialized than the rest of a 25-man roster (Master File position
// composition). Two separate multipliers: a larger one on market needScore (a team
// desperate for a goalie should chase harder than the raw overall gap suggests), and a
// smaller one on the *effective* overall used for tier lookup (a 78-overall FOGO
// should read market-wise closer to an 82-84 overall attackman, not literally jump to
// Tier 1 — Tier 1 still requires the star flag regardless of position).
const SCARCE_NEED_MULTIPLIER = { G: 1.4, F: 1.4, L: 1.35 };
const SCARCE_TIER_MULTIPLIER = { G: 1.08, F: 1.08, L: 1.06 };

function effectiveOverallForTier(player) {
  return Math.round(player[4] * (SCARCE_TIER_MULTIPLIER[player[1]] || 1.0));
}

export function freeAgentTier(player) {
  const ovr = effectiveOverallForTier(player);
  const star = player[5] === 1;
  if (star && ovr >= 85) return 1;
  if (ovr >= 75) return 2;
  if (ovr >= 62) return 3;
  return 4;
}

// ---------- §3 Star-Biased Motivation Assignment ----------
// A true star has real leverage a role player doesn't — replaces the old flat
// 55/25/20 split with a distribution that shifts by tier.
const MOTIVATION_BY_TIER = {
  1: { loyalist: 0.35, mercenary: 0.35 }, // winner = remainder (0.30)
  2: { loyalist: 0.50, mercenary: 0.30 }, // remainder 0.20
  3: { loyalist: 0.65, mercenary: 0.20 }, // remainder 0.15
  4: { loyalist: 0.80, mercenary: 0.10 }, // remainder 0.10
};
export function pickMotivation(tier) {
  const { loyalist, mercenary } = MOTIVATION_BY_TIER[tier] || MOTIVATION_BY_TIER[4];
  const r = Math.random();
  if (r < loyalist) return "Loyalist";
  if (r < loyalist + mercenary) return "Mercenary";
  return "Winner";
}

// ---------- §4 Additional Signing Influences ----------
// Homegrown bonus (spec §4, Master File 9.3) — now real, now that src/engine/hometown.js
// exists and every player tuple carries a permanent hometown at index 13. A player
// re-signing with, or signing with, their own hometown team gets a modest bump — a
// "local hero" narrative made mechanical, not just flavor text — on top of whatever
// their motivation type already contributes. Deliberately modest: this is a nudge, not
// a guarantee, matching how every other bonus term in this module behaves.
const HOMEGROWN_RESIGN_BONUS = 0.08;
const HOMEGROWN_NEED_BONUS = 14; // added to a hometown team's needScore in rankTeamsForPlayer

function isHometown(player, team) {
  return player[13] === team;
}

// ---------- §6 Indoor Specialist Market (Master File 9.8) ----------
// Standing in for the doc's literal "20% turnover allowance" — no such hard cap exists
// anywhere else in this engine's free agency, and the Culkin roster carryover is
// already an abstraction rather than a literal roster mutation (see CLAUDE.md). What's
// real and already in the data: a team's own Indoor/Outdoor Balance rating (team.bal)
// and a player's own (tuple index 7) — same 1-10 scale, same semantics as the field
// deactivation.js already uses to pick indoor/outdoor misfits. An indoor-leaning team
// (bal above the 5 midpoint) chases indoor-leaning specialists harder, and the mirror
// for outdoor; a team or player near the neutral midpoint gets no bonus either way —
// this only kicks in for genuine specialists on both sides of the match.
function indoorSpecialistBonus(player, team) {
  const teamBal = TEAMS[team]?.bal;
  const playerBal = player[7];
  if (teamBal == null || playerBal == null) return 0;
  const teamLean = teamBal - 5;
  const playerLean = playerBal - 5;
  if (teamLean === 0 || playerLean === 0 || Math.sign(teamLean) !== Math.sign(playerLean)) return 0;
  return Math.min(Math.abs(teamLean), Math.abs(playerLean)) * 4;
}

// Coach-fit bump/penalty reuses the exact same HC_TAG_FIT lookup identifyUnhappyStars()
// (trades.js) already uses for trade-demand detection, rather than duplicating the check.
function coachFitsTeam(team) {
  const coach = COACHES[team];
  if (!coach) return null; // no data to judge by
  return (HC_TAG_FIT[TEAMS[team].tag] || []).includes(coach.hcArch);
}

// ---------- §5 Salary Cap Pressure & Luxury Tax Avoidance ----------
export function projectedCapFine(team, additionalAAV) {
  return capFine(teamPayroll(team) + additionalAAV);
}

// projectedAAV is an estimate, not an exact figure — the real re-sign contract is only
// computed by assignNewContract() *after* the decision succeeds, and duplicating its
// full salary-band logic just to project one number isn't worth it. The player's
// outgoing AAV (driven by the same overall/age/leadership inputs) is a reasonable
// stand-in for what the new one will land near.
export function reSignChance(motivation, team, standingsMap, projectedAAV, player) {
  let chance;
  if (motivation === "Loyalist") chance = 0.85;
  else if (motivation === "Mercenary") chance = 0.30;
  else chance = (standingsMap[team]?.points || 0) > 20 ? 0.55 : 0.28; // Winner: stays if actually winning

  const fit = coachFitsTeam(team);
  if (fit === false) chance -= 0.12;
  else if (fit === true) chance += 0.05; // a real fit is a smaller, quieter bump than a mismatch's penalty

  if (player && isHometown(player, team)) chance += HOMEGROWN_RESIGN_BONUS; // §4 homegrown bonus

  // Re-sign reluctance scales with *projected* cap position, not just current room —
  // a re-sign that would push the team into a worse fine tier gets meaningfully less
  // likely (scaled by how far past the current fine it lands), never blocked outright:
  // teams do sometimes pay the tax for a player worth it, especially Tier 1s.
  const currentFine = capFine(teamPayroll(team));
  const newFine = projectedCapFine(team, projectedAAV);
  if (newFine > currentFine) {
    const overageSeverity = clamp((newFine - currentFine) / Math.max(1, SALARY_CAP * 0.10), 0, 1);
    chance -= overageSeverity * 0.35;
  }
  return clamp(chance, 0.03, 0.97);
}

// Decreasing per-round chance for the top 3 ranked contenders (§7, main loop below).
const BIDDING_ROUND_CHANCES = [0.35, 0.25, 0.15];

function rankTeamsForPlayer(player, motivation, standingsMap, mercenaryWeight) {
  const pos = player[1];
  const scarceMult = SCARCE_NEED_MULTIPLIER[pos] || 1.0;
  const candidates = TEAM_NAMES.map((t) => {
    const room = SALARY_CAP - teamPayroll(t);
    const posAvg = avgOverallByPosition(t)[pos];
    let needScore = (posAvg == null ? 60 : Math.max(0, 100 - posAvg)) * scarceMult;
    needScore += indoorSpecialistBonus(player, t);
    if (isHometown(player, t)) needScore += HOMEGROWN_NEED_BONUS;
    return { t, room, needScore, points: standingsMap[t]?.points || 0 };
  }).filter((x) => x.room > 8000);

  if (motivation === "Mercenary") {
    // Market-wide cap tightness dampens aggressive bidding league-wide: when few teams
    // can actually afford to chase a contract (mercenaryWeight low), blend the ranking
    // toward the same need+room-first ordering a Loyalist-style market uses instead of
    // pure room-chasing — the qualitative "more teams pass on the bidding war" effect
    // this produces, rather than a literal pass/fail gate the spec doesn't specify.
    candidates.sort((a, b) => {
      const scoreA = mercenaryWeight * (a.room + a.needScore * 15000) + (1 - mercenaryWeight) * (a.needScore * 2000 + a.room);
      const scoreB = mercenaryWeight * (b.room + b.needScore * 15000) + (1 - mercenaryWeight) * (b.needScore * 2000 + b.room);
      return scoreB - scoreA;
    });
  } else if (motivation === "Winner") {
    candidates.sort((a, b) => b.points - a.points || b.room - a.room);
  } else {
    candidates.sort((a, b) => (b.needScore * 2000 + b.room) - (a.needScore * 2000 + a.room));
  }
  return candidates;
}

/* ---------- Main entry point — called by App.jsx and the headless harness ---------- */
export function runFreeAgency(standingsMap) {
  const reSigned = [], departed = [], signed = [];
  const openMarket = [];
  const usedNames = new Set();
  for (const t of TEAM_NAMES) { PLAYERS_RAW[t].forEach((p) => usedNames.add(p[0])); COACHES[t] && usedNames.add(COACHES[t].hc); }
  for (const p of PLAYER_POOL) usedNames.add(p[0]);

  // Market-wide cap tightness, computed once for the whole cycle (§5).
  const avgCapRoom = TEAM_NAMES.reduce((sum, t) => sum + (SALARY_CAP - teamPayroll(t)), 0) / TEAM_NAMES.length;
  const mercenaryWeight = clamp(avgCapRoom / SALARY_CAP, 0.35, 1);

  const poolSignings = [];
  for (const team of TEAM_NAMES) {
    const roster = PLAYERS_RAW[team];
    for (let i = roster.length - 1; i >= 0; i--) {
      const p = roster[i];
      const yearsLeft = (p[10] || 1) - 1;
      if (yearsLeft > 0) { p[10] = yearsLeft; continue; }
      const tier = freeAgentTier(p);
      const motivation = pickMotivation(tier);
      if (Math.random() < reSignChance(motivation, team, standingsMap, p[9] || 0, p)) {
        assignNewContract(p);
        reSigned.push({ team, name: p[0], ovr: p[4], aav: p[9], motivation, tier });
      } else {
        // Never let the roster dip below the floor, even for one tick — claim a
        // same-position replacement before this player actually leaves.
        const backfill = ensureFloorBeforeRemoval(team, p[1], usedNames);
        if (backfill) poolSignings.push(backfill);
        roster.splice(i, 1);
        openMarket.push({ fromTeam: team, player: p, motivation, tier });
      }
    }
  }

  // General waiver pass: this year's fresh departures compete for a new home right
  // alongside every player already sitting in the persistent pool from prior years
  // (Master File 9.5 — "always available for waiver claims"), not just each other.
  const pooledCandidates = PLAYER_POOL.splice(0, PLAYER_POOL.length).map((player) => ({
    fromTeam: null, player, motivation: "Pool", tier: freeAgentTier(player),
  }));
  const candidates = [...openMarket, ...pooledCandidates].sort((a, b) => b.player[4] - a.player[4]);
  for (const entry of candidates) {
    const teamsRanked = rankTeamsForPlayer(entry.player, entry.motivation, standingsMap, mercenaryWeight)
      .filter((x) => PLAYERS_RAW[x.t].length < DRAFT_ROSTER_CAP);
    // §7 Real multi-team bidding — up to the top BIDDING_ROUND_CHANCES.length ranked
    // contenders each get an independent, decreasing-probability shot in rank order
    // (the best-fit team goes first and is most likely, but isn't a guarantee; a
    // player can and does end up with its second or third choice). Round chances are
    // tuned so the *combined* signing probability across all rounds lands close to the
    // old flat single-roll 0.6 rather than inflating overall free-agent movement.
    let dest = null;
    const runnersUp = [];
    for (let i = 0; i < teamsRanked.length && i < BIDDING_ROUND_CHANCES.length; i++) {
      if (Math.random() < BIDDING_ROUND_CHANCES[i]) { dest = teamsRanked[i].t; break; }
      runnersUp.push(teamsRanked[i].t);
    }
    if (dest) {
      assignNewContract(entry.player);
      PLAYERS_RAW[dest].push(entry.player);
      signed.push({
        team: dest, name: entry.player[0], ovr: entry.player[4], from: entry.fromTeam || "Player Pool",
        aav: entry.player[9], motivation: entry.motivation, tier: entry.tier, runnersUp,
      });
    } else {
      if (entry.fromTeam) departed.push({ team: entry.fromTeam, name: entry.player[0], ovr: entry.player[4] });
      PLAYER_POOL.push(entry.player); // unclaimed — stays available for a future offseason
    }
  }

  // Safety net for anything the per-removal guard above couldn't have anticipated
  // (there shouldn't be much left to do here, but this is the last offseason step
  // that can shrink a roster, so it's the last chance to catch it).
  const emergencySigned = [];
  for (const team of TEAM_NAMES) emergencySigned.push(...enforceRosterFloor(team, usedNames));

  return { reSigned, signed, departed, emergencySigned, poolSignings };
}
