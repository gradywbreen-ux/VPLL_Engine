import { PLAYERS_RAW, TEAM_NAMES } from "../data/rawData.js";
import { POSITION_MINIMUMS } from "./roster.js";

/* ============================================================
   DEACTIVATION LISTS (Master File 9.8 — Between-Season Roster Rules)

   Up to 5 players per team can be deactivated for a season — they retain
   their roster spot (not released, not available to other teams), but sit
   out that season entirely. Indoor specialists deactivate for Corkum
   (outdoor) and reactivate for Culkin (indoor); core Corkum players
   unsuited for box lacrosse deactivate for Culkin. This engine has no
   literal per-game lineup selection (team-aggregate ratings drive
   simulation, not individual players — see CLAUDE.md), so deactivation's
   real mechanical effect is scoped to what the roster-aggregate model can
   actually express: a deactivated player is excluded from that season's
   awards eligibility (src/engine/awards.js) *and* from that season's box
   score attribution (src/engine/boxScore.js's computeGameBoxScore(), fed
   by season.deactivated) — so they can't accumulate goals/assists/face-offs/
   turnovers/saves for a season they're sitting out either. There's no
   roster-browsing UI anywhere in the app (see CLAUDE.md), so this doesn't
   currently surface as a visible "inactive" tag anywhere — only as an
   absence from awards and stat leaderboards.

   Selection uses each player's own Indoor/Outdoor Balance field (tuple
   index 7, same 1-10 scale as the team-level bal rating) — a genuine
   per-player signal already in the data, not a fabricated one. Deactivation
   never drops an active position group below the same POSITION_MINIMUMS
   floor roster.js uses for the full roster, so a team can never end up with,
   say, zero active goalies just because all its goalies happen to be
   indoor-only.
   ============================================================ */
const OUTDOOR_MISFIT_THRESHOLD = 8; // bal >= this: indoor-only specialist, sit for Corkum
const INDOOR_MISFIT_THRESHOLD = 3; // bal <= this: outdoor-only specialist, sit for Culkin
const MAX_DEACTIVATIONS = 5;

export function computeDeactivations(teamName, isIndoor) {
  const roster = PLAYERS_RAW[teamName];
  const misfits = isIndoor
    ? roster.filter((p) => p[7] <= INDOOR_MISFIT_THRESHOLD)
    : roster.filter((p) => p[7] >= OUTDOOR_MISFIT_THRESHOLD);
  misfits.sort((a, b) => (isIndoor ? a[7] - b[7] : b[7] - a[7])); // worst mismatch first

  const activeCounts = {};
  for (const p of roster) activeCounts[p[1]] = (activeCounts[p[1]] || 0) + 1;

  const deactivated = [];
  for (const p of misfits) {
    if (deactivated.length >= MAX_DEACTIVATIONS) break;
    const pos = p[1];
    if (activeCounts[pos] - 1 < (POSITION_MINIMUMS[pos] || 0)) continue; // would leave the position short-handed
    activeCounts[pos]--;
    deactivated.push(p[0]);
  }
  return deactivated;
}

// { teamName: [deactivated player names] } for every team, for the season about to be played.
export function computeAllDeactivations(isIndoor) {
  const out = {};
  for (const team of TEAM_NAMES) out[team] = computeDeactivations(team, isIndoor);
  return out;
}
