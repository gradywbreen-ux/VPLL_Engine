/* ============================================================
   RESET TO YEAR 1
   Restores TEAMS/COACHES/PLAYERS_RAW to the pristine Year 1 snapshot taken
   at module load (PRISTINE_YEAR1 — see rawData.js). Pulled out of the app's
   "Danger Zone" button handler so the same logic can also be used to reset
   state between simulation runs in the test harness (scripts/lib/simulateLeague.mjs)
   without duplicating it.
   ============================================================ */
import { TEAMS, COACHES, PLAYERS_RAW, TEAM_NAMES, PRISTINE_YEAR1, PLAYER_POOL } from "./rawData.js";
import { bootstrapContractsIfNeeded } from "../engine/contracts.js";
import { migrateLSMIfNeeded } from "./migrations.js";

export function resetLeagueDataToYear1() {
  const fresh = JSON.parse(JSON.stringify(PRISTINE_YEAR1));
  for (const t of TEAM_NAMES) {
    Object.keys(TEAMS[t]).forEach((k) => delete TEAMS[t][k]);
    Object.assign(TEAMS[t], fresh.teams[t]);
    Object.keys(COACHES[t]).forEach((k) => delete COACHES[t][k]);
    Object.assign(COACHES[t], fresh.coaches[t]);
    PLAYERS_RAW[t].length = 0;
    PLAYERS_RAW[t].push(...fresh.players[t]);
  }
  PLAYER_POOL.length = 0; // Year 1 always starts with an empty pool — nothing's been cut yet
  bootstrapContractsIfNeeded();
  migrateLSMIfNeeded();
}
