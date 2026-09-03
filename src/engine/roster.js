import { PLAYERS_RAW, PLAYER_POOL } from "../data/rawData.js";
import { assignNewContract, CONTRACT_TYPES } from "./contracts.js";
import { rand } from "./mathHelpers.js";
import { getUniqueName } from "./draft.js";
import { evaluateRetirement } from "./retirement.js";
import { assignHometown } from "./hometown.js";
import { mintPlayerId } from "./playerId.js";

/* ============================================================
   ROSTER SIZE RULES (Master File 9.7 Training Camp, tuned to the
   Commissioner's explicit numbers rather than the doc's 20-25 band)

   DRAFT_ROSTER_CAP  — ceiling right after the draft (existing behavior,
                        just centralized here)
   SEASON_ROSTER_CAP — final training-camp cut, applied once per year right
                        before the new season opens
   MIN_ROSTER_SIZE   — floor a team's roster should never dip below, even
                        momentarily, during Retirement or Free Agency
   POSITION_MINIMUMS — per-position floor so "24 players" can't mean "24
                        midfielders and zero goalies" — respected by every
                        cut (never release a player if it would fall below
                        it) and by the total-floor top-up

   PLAYER POOL (Master File 9.5) — cut and unsigned-departure players land
   in PLAYER_POOL (src/data/rawData.js) instead of vanishing, and stay
   available for any team to claim in a future offseason. claimFromPool()/
   claimOrGenerate() are the shared "get me a body" primitives used both by
   the roster-floor guard (retirement/free-agency backfills) and by Free
   Agency's general waiver pass over the pool.
   ============================================================ */
export const DRAFT_ROSTER_CAP = 32;
export const SEASON_ROSTER_CAP = 28;
export const MIN_ROSTER_SIZE = 24;
export const MAX_POOL_PER_POSITION = 15; // keeps an unclaimed pool from growing forever

export const POSITION_MINIMUMS = { A: 3, M: 5, L: 2, D: 4, F: 1, G: 2 };

function positionCounts(roster) {
  const counts = {};
  for (const p of roster) counts[p[1]] = (counts[p[1]] || 0) + 1;
  return counts;
}

// Cuts a roster down to maxSize, releasing the lowest-overall players first —
// but never a player whose position is already sitting at its floor, so a
// team can't be left short at a position just because its weakest players
// happen to cluster there. Cut players go into the persistent pool.
export function cutRosterToSize(teamName, maxSize) {
  const roster = PLAYERS_RAW[teamName];
  const cuts = [];
  while (roster.length > maxSize) {
    const counts = positionCounts(roster);
    let worstIdx = -1;
    for (let i = 0; i < roster.length; i++) {
      const pos = roster[i][1];
      if (counts[pos] <= (POSITION_MINIMUMS[pos] || 0)) continue;
      if (worstIdx === -1 || roster[i][4] < roster[worstIdx][4]) worstIdx = i;
    }
    if (worstIdx === -1) break; // every remaining player is holding their position's floor
    const [cutPlayer] = roster.splice(worstIdx, 1);
    cuts.push({ team: teamName, name: cutPlayer[0], ovr: cutPlayer[4], pos: cutPlayer[1] });
    PLAYER_POOL.push(cutPlayer);
  }
  return cuts;
}

// Emergency camp-body generation — last resort only, used when the pool has
// nobody suitable. No motivation, no market competition: a team quietly
// filling out training camp, not a marquee move.
function generateJourneyman(pos, usedNames) {
  const overall = Math.round(rand(42, 58));
  const age = Math.round(rand(23, 33));
  const leadership = Math.round(rand(25, 55));
  const balance = Math.round(rand(3, 8));
  const durability = Math.round(rand(45, 75));
  const hand = Math.random() < 0.62 ? "R" : Math.random() < 0.90 ? "L" : "A";
  const tuple = [getUniqueName(usedNames), pos, hand, age, overall, 0, leadership, balance, durability];
  assignNewContract(tuple, CONTRACT_TYPES.JOURNEYMAN);
  tuple[13] = assignHometown();
  tuple[14] = mintPlayerId();
  return tuple;
}

// Removes and returns the best-fit pool player for a position: highest
// overall at that exact position. If requirePosition is false (the
// default) and there's no exact match, falls back to the best overall at
// any position — a warm body at the wrong spot still beats a vacancy for a
// pure headcount guard. Callers that need the claimed player to actually
// be at `pos` (anything tracking POSITION_MINIMUMS) must pass
// requirePosition: true, or they'll silently miscount — a same-pool player
// claimed for the wrong slot keeps its real position, it doesn't relabel
// itself. Returns null if nothing suitable is available.
export function claimFromPool(pos, { requirePosition = false } = {}) {
  if (PLAYER_POOL.length === 0) return null;
  let idx = -1;
  for (let i = 0; i < PLAYER_POOL.length; i++) {
    if (PLAYER_POOL[i][1] === pos && (idx === -1 || PLAYER_POOL[i][4] > PLAYER_POOL[idx][4])) idx = i;
  }
  if (idx === -1) {
    if (requirePosition) return null;
    for (let i = 0; i < PLAYER_POOL.length; i++) if (idx === -1 || PLAYER_POOL[i][4] > PLAYER_POOL[idx][4]) idx = i;
  }
  const [claimed] = PLAYER_POOL.splice(idx, 1);
  return claimed;
}

// The shared "get me a body for this position" primitive: prefer a real
// player already sitting in the pool (less generation, per the
// Commissioner), fall back to inventing a fresh journeyman only if the pool
// has nothing to offer. Always leaves the returned player with a fresh
// journeyman-tier contract — this is an emergency fill, not a market signing.
// See claimFromPool for what requirePosition changes.
export function claimOrGenerate(pos, usedNames, { requirePosition = false } = {}) {
  const pooled = claimFromPool(pos, { requirePosition });
  if (pooled) {
    assignNewContract(pooled, CONTRACT_TYPES.JOURNEYMAN);
    return { player: pooled, source: "pool" };
  }
  return { player: generateJourneyman(pos, usedNames), source: "generated" };
}

// Enforces MIN_ROSTER_SIZE and POSITION_MINIMUMS by claiming from the pool
// (or generating as a last resort). usedNames must include every currently
// rostered/pooled player and coach name (name-collision guard, same
// convention as the draft). This is the end-of-Free-Agency safety net — the
// floor is normally already held by the per-removal guard in Retirement and
// Free Agency, but this catches anything else that might shrink a roster.
// Every claim here is requirePosition: true — this function's whole point is
// making POSITION_MINIMUMS true, so a wrong-position pool player wouldn't
// actually satisfy what it's being counted toward.
export function enforceRosterFloor(teamName, usedNames) {
  const roster = PLAYERS_RAW[teamName];
  const counts = positionCounts(roster);
  const signed = [];

  for (const [pos, min] of Object.entries(POSITION_MINIMUMS)) {
    while ((counts[pos] || 0) < min) {
      const { player, source } = claimOrGenerate(pos, usedNames, { requirePosition: true });
      roster.push(player);
      counts[pos] = (counts[pos] || 0) + 1;
      signed.push({ team: teamName, name: player[0], pos: player[1], ovr: player[4], source });
    }
  }
  // Position floors are satisfied — top off any remaining shortfall against
  // the overall floor at whichever position is thinnest right now.
  while (roster.length < MIN_ROSTER_SIZE) {
    const pos = Object.keys(POSITION_MINIMUMS).reduce((a, b) => ((counts[a] || 0) <= (counts[b] || 0) ? a : b));
    const { player, source } = claimOrGenerate(pos, usedNames, { requirePosition: true });
    roster.push(player);
    counts[pos] = (counts[pos] || 0) + 1;
    signed.push({ team: teamName, name: player[0], pos: player[1], ovr: player[4], source });
  }
  return signed;
}

// Roster-floor guard for Retirement and Free Agency: call this immediately
// before releasing/retiring a player if doing so would drop the roster below
// MIN_ROSTER_SIZE. Claims a replacement from the pool (or generates one) and
// adds it to the roster *before* the caller removes the departing player, so
// the team's roster count never actually dips below the floor, even for one
// offseason tick. Position match is a soft preference here (any warm body
// keeps the count right), not a hard requirement like enforceRosterFloor.
// Returns the signing record, or null if the roster wasn't at risk and no
// action was needed.
export function ensureFloorBeforeRemoval(teamName, vacatingPos, usedNames) {
  const roster = PLAYERS_RAW[teamName];
  if (roster.length > MIN_ROSTER_SIZE) return null;
  const { player, source } = claimOrGenerate(vacatingPos, usedNames);
  roster.push(player);
  return { team: teamName, name: player[0], pos: player[1], ovr: player[4], source };
}

// Once-a-year pool upkeep (call alongside the season roster cut): pool
// players age like everyone else, retire out of the pool on the same rules
// as rostered veterans, and an unclaimed pool is trimmed back to
// MAX_POOL_PER_POSITION per position so it can't grow without bound over a
// long simulated history.
export function maintainPlayerPool() {
  for (const p of PLAYER_POOL) p[3] = (p[3] || 20) + 1;

  for (let i = PLAYER_POOL.length - 1; i >= 0; i--) {
    if (evaluateRetirement(PLAYER_POOL[i])) PLAYER_POOL.splice(i, 1);
  }

  const byPos = {};
  for (const p of PLAYER_POOL) (byPos[p[1]] = byPos[p[1]] || []).push(p);
  const keep = new Set();
  for (const pos of Object.keys(byPos)) {
    byPos[pos].sort((a, b) => b[4] - a[4]);
    for (const p of byPos[pos].slice(0, MAX_POOL_PER_POSITION)) keep.add(p);
  }
  for (let i = PLAYER_POOL.length - 1; i >= 0; i--) {
    if (!keep.has(PLAYER_POOL[i])) PLAYER_POOL.splice(i, 1);
  }
}
