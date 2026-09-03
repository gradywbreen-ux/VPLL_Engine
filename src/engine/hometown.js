import { TEAM_NAMES, PLAYERS_RAW, PLAYER_POOL } from "../data/rawData.js";

/* ============================================================
   PLAYER HOMETOWN SYSTEM (Master File 9.3)

   Every player has a hometown team, assigned once and permanent — where
   they grew up, not where they play. Stored at player tuple index 13 (added
   post-hoc, same pattern as the contract/ceiling fields at 9-12 — always
   guard for undefined on old saves via bootstrapHometownsIfNeeded()).

   MARKET_TIER (Master File 13.1) is what "weighted by market size" actually
   means: Burlington-metro/resort-money/wealthy-lakeshore teams (Tier 1) turn
   out hometown talent more often than small-market towns (Tier 3), but per
   the doc every team's junior program produces *some* talent — Tier 3 never
   drops to zero weight.
   ============================================================ */
export const MARKET_TIER = {
  // Tier 1 — Big Market
  "Queen City Battery": 1, "North End Horsemen": 1, "Colchester Gryphons": 1,
  "South Burlington Aviators": 1, "Essex Railroaders": 1, "Onion River Predators": 1,
  "Stowe Smugglers": 1, "Jay StormKings": 1, "Charlotte Navigators": 1, "Shelburne Reapers": 1,
  // Tier 2 — Mid Market
  "Rutland Cryptids": 2, "Bennington Prowlers": 2, "Springfield Hardshells": 2,
  "Windsor Independents": 2, "Hartford Rampage": 2, "Montpelier Congress": 2,
  "Middlebury RiverWolves": 2, "Williston Lynx": 2, "Saint Albans Dawnlanders": 2,
  "Manchester Black Bears": 2, "Woodstock Boilers": 2, "Missisquoi Bay Muskies": 2,
  // Tier 3 — Small Market
  "Newport Spirits": 3, "Saint Johnsbury Dinos": 3, "Barre Carvers": 3, "Brattleboro Pioneers": 3,
  "Ludlow Shepherds": 3, "Milton Machine": 3, "Jericho Stags": 3, "Fair Haven Tycoons": 3,
  "Enosburg Owls": 3, "Grand Isle Heroes": 3,
};

const TIER_WEIGHT = { 1: 3, 2: 2, 3: 1 };

const WEIGHTED_HOMETOWN_POOL = TEAM_NAMES.flatMap((t) => Array(TIER_WEIGHT[MARKET_TIER[t]]).fill(t));

export function assignHometown() {
  return WEIGHTED_HOMETOWN_POOL[Math.floor(Math.random() * WEIGHTED_HOMETOWN_POOL.length)];
}

// One-time migration for existing saves/embedded data — mirrors
// bootstrapContractsIfNeeded()/migrateLSMIfNeeded()'s pattern exactly.
export function bootstrapHometownsIfNeeded() {
  for (const team of TEAM_NAMES) {
    for (const p of PLAYERS_RAW[team]) {
      if (p[13] === undefined) p[13] = assignHometown();
    }
  }
  for (const p of PLAYER_POOL) {
    if (p[13] === undefined) p[13] = assignHometown();
  }
}
