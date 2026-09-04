import { CAREER_STATS } from "../data/rawData.js";

/* ============================================================
   SEASON / CAREER INDIVIDUAL STAT TRACKING

   Turns a single game's box score (src/engine/boxScore.js's computeGameBoxScore())
   into accumulated per-player totals — both a season-scoped store (kept on the
   season object as `playerStats`, wiped every year like everything else) and
   CAREER_STATS (src/data/rawData.js), a persistent cross-year store keyed by the
   stable player ID (src/engine/playerId.js) so a retired player's name being
   reissued to a new draftee years later can never merge their totals.

   Deliberately does NOT track "games played." This engine has no literal
   per-game lineup (team-aggregate ratings drive the score, not individual
   possessions — see CLAUDE.md), so there's no honest way to say a given
   rostered player "played" a game beyond however computeGameBoxScore()
   happened to attribute a play to them that game. A GP column built on that
   would look like real roster-participation data and wouldn't be — better to
   just not have one than to fake it.

   Scoped to regular-season games only, home and away combined — the same
   "season-long" framing task #43 was asked for. Playoff box scores still
   render for display (Playoffs tab), but intentionally don't feed either
   store, so a leaderboard never conflates a 13-game regular season with a
   handful of playoff games.
   ============================================================ */

export function emptyStatLine(id, name, team, pos) {
  return { id, name, team, pos, g: 0, a: 0, pts: 0, twoPt: 0, foWon: 0, foTotal: 0, ct: 0, sv: 0, sa: 0, ga: 0 };
}

// Career lines re-stamp name/team/pos to the *current* values on every bump, so a
// career leaderboard always shows where a player is now, not where they were the
// year a given stat was recorded — only the numeric totals actually accumulate.
function bump(store, id, name, team, pos, patch) {
  if (!id) return; // defensive: a pre-migration player somehow missing an id contributes nothing rather than corrupting a shared bucket
  if (!store[id]) store[id] = emptyStatLine(id, name, team, pos);
  const line = store[id];
  line.name = name; line.team = team; line.pos = pos;
  for (const [k, v] of Object.entries(patch)) line[k] = (line[k] || 0) + v;
}

function bumpBoth(seasonStats, id, name, team, pos, patch) {
  bump(seasonStats, id, name, team, pos, patch);
  bump(CAREER_STATS, id, name, team, pos, patch);
}

// Folds one game's box score (computeGameBoxScore()'s return shape) into the given
// season store and CAREER_STATS. Call once per completed regular-season game.
export function accumulateGameStats(seasonStats, gameBox, homeTeam, awayTeam) {
  for (const [team, side] of [[homeTeam, gameBox.home], [awayTeam, gameBox.away]]) {
    for (const goal of side.goals) {
      bumpBoth(seasonStats, goal.scorerId, goal.scorer, team, goal.pos, { g: 1, pts: 1, twoPt: goal.twoPoint ? 1 : 0 });
      if (goal.assistId) bumpBoth(seasonStats, goal.assistId, goal.assist, team, goal.assistPos, { a: 1, pts: 1 });
    }
    for (const fo of side.faceoffs) {
      bumpBoth(seasonStats, fo.id, fo.name, team, fo.pos, { foWon: fo.won, foTotal: fo.total });
    }
    for (const ct of side.turnovers) {
      bumpBoth(seasonStats, ct.id, ct.name, team, ct.pos, { ct: ct.ct });
    }
    if (side.goalie) {
      bumpBoth(seasonStats, side.goalie.id, side.goalie.name, team, "G", {
        sv: side.goalie.saves, sa: side.goalie.shotsFaced, ga: side.goalie.goalsAllowed,
      });
    }
  }
}

// Undoes accumulateGameStats()'s effect on CAREER_STATS for an entire season's worth
// of stats at once. Used when a season is scrapped and replayed before completion
// (App.jsx's resetSeason) — without this, a reset season's games would still count
// toward career totals even though the season that produced them no longer exists.
export function subtractSeasonFromCareer(seasonStats) {
  const fields = ["g", "a", "pts", "twoPt", "foWon", "foTotal", "ct", "sv", "sa", "ga"];
  for (const line of Object.values(seasonStats)) {
    const career = CAREER_STATS[line.id];
    if (!career) continue;
    for (const k of fields) career[k] = Math.max(0, (career[k] || 0) - (line[k] || 0));
    if (fields.every((k) => !career[k])) delete CAREER_STATS[line.id];
  }
}

/* ---------- Leaderboards ---------- */
// Derived rates (FO%, save%) are computed at read time, never stored, so they're
// always consistent with whatever totals happen to be accumulated so far.
export function foPct(line) { return line.foTotal > 0 ? line.foWon / line.foTotal : 0; }
export function savePct(line) { return line.sa > 0 ? line.sv / line.sa : 0; }

// A token handful of attempts before a rate stat is meaningful — exported so awards.js's
// Most Outstanding Goalie can apply the exact same floor rather than a second magic number.
export const MIN_FOR_RATE_LEADERBOARD = { foTotal: 20, sa: 20 };

export function topByStat(statStore, statKey, { positions = null, n = 10 } = {}) {
  let lines = Object.values(statStore);
  if (positions) lines = lines.filter((l) => positions.includes(l.pos));
  if (statKey === "foPct") lines = lines.filter((l) => l.foTotal >= MIN_FOR_RATE_LEADERBOARD.foTotal);
  if (statKey === "savePct") lines = lines.filter((l) => l.sa >= MIN_FOR_RATE_LEADERBOARD.sa);
  const valueOf = (l) => (statKey === "foPct" ? foPct(l) : statKey === "savePct" ? savePct(l) : l[statKey] || 0);
  return lines.sort((x, y) => valueOf(y) - valueOf(x)).slice(0, n).map((l) => ({ ...l, value: valueOf(l) }));
}
