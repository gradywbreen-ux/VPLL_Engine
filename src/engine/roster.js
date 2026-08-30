import { PLAYERS_RAW } from "../data/rawData.js";
import { assignNewContract, CONTRACT_TYPES } from "./contracts.js";
import { rand } from "./mathHelpers.js";
import { getUniqueName } from "./draft.js";

/* ============================================================
   ROSTER SIZE RULES (Master File 9.7 Training Camp, tuned to the
   Commissioner's explicit numbers rather than the doc's 20-25 band)

   DRAFT_ROSTER_CAP  — ceiling right after the draft (existing behavior,
                        just centralized here)
   SEASON_ROSTER_CAP — final training-camp cut, applied once per year right
                        before the new season opens
   MIN_ROSTER_SIZE   — floor enforced at the end of Free Agency, the last
                        step that can shrink a roster (retirement, unsigned
                        departures)
   POSITION_MINIMUMS — per-position floor so "24 players" can't mean "24
                        midfielders and zero goalies" — respected by both
                        the floor (never sign below it) and every cut (never
                        release a player if it would fall below it)
   ============================================================ */
export const DRAFT_ROSTER_CAP = 32;
export const SEASON_ROSTER_CAP = 28;
export const MIN_ROSTER_SIZE = 24;

export const POSITION_MINIMUMS = { A: 3, M: 5, L: 2, D: 4, F: 1, G: 2 };

function positionCounts(roster) {
  const counts = {};
  for (const p of roster) counts[p[1]] = (counts[p[1]] || 0) + 1;
  return counts;
}

// Cuts a roster down to maxSize, releasing the lowest-overall players first —
// but never a player whose position is already sitting at its floor, so a
// team can't be left short at a position just because its weakest players
// happen to cluster there.
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
    cuts.push({ team: teamName, name: roster[worstIdx][0], ovr: roster[worstIdx][4], pos: roster[worstIdx][1] });
    roster.splice(worstIdx, 1);
  }
  return cuts;
}

// Emergency camp-body signing used only to plug a floor shortfall — not a
// real free agent pursuit (no motivation, no market competition). This is a
// team quietly filling out training camp, not a marquee move.
function generateJourneyman(pos, usedNames) {
  const overall = Math.round(rand(42, 58));
  const age = Math.round(rand(23, 33));
  const leadership = Math.round(rand(25, 55));
  const balance = Math.round(rand(3, 8));
  const durability = Math.round(rand(45, 75));
  const hand = Math.random() < 0.62 ? "R" : Math.random() < 0.90 ? "L" : "A";
  const tuple = [getUniqueName(usedNames), pos, hand, age, overall, 0, leadership, balance, durability];
  assignNewContract(tuple, CONTRACT_TYPES.JOURNEYMAN);
  return tuple;
}

// Enforces MIN_ROSTER_SIZE and POSITION_MINIMUMS by signing emergency
// journeymen. usedNames must include every currently-rostered player and
// coach name (name-collision guard, same convention as the draft).
export function enforceRosterFloor(teamName, usedNames) {
  const roster = PLAYERS_RAW[teamName];
  const counts = positionCounts(roster);
  const signed = [];

  for (const [pos, min] of Object.entries(POSITION_MINIMUMS)) {
    while ((counts[pos] || 0) < min) {
      const tuple = generateJourneyman(pos, usedNames);
      roster.push(tuple);
      counts[pos] = (counts[pos] || 0) + 1;
      signed.push({ team: teamName, name: tuple[0], pos, ovr: tuple[4] });
    }
  }
  // Position floors are satisfied — top off any remaining shortfall against
  // the overall floor at whichever position is thinnest right now.
  while (roster.length < MIN_ROSTER_SIZE) {
    const pos = Object.keys(POSITION_MINIMUMS).reduce((a, b) => ((counts[a] || 0) <= (counts[b] || 0) ? a : b));
    const tuple = generateJourneyman(pos, usedNames);
    roster.push(tuple);
    counts[pos] = (counts[pos] || 0) + 1;
    signed.push({ team: teamName, name: tuple[0], pos, ovr: tuple[4] });
  }
  return signed;
}
