import { TEAM_NAMES, PLAYERS_RAW, PLAYER_POOL } from "../data/rawData.js";

/* ============================================================
   STABLE PLAYER IDENTITY

   Player names are only unique at a single point in time (getUniqueName()'s
   usedNames set is rebuilt fresh from whoever's currently rostered/pooled
   each offseason call, not a permanent registry) — a retiree's name is free
   to be reissued to a brand-new draft prospect years later. That's fine for
   everything that only ever looks at the *current* league, but the moment
   anything persists player-scoped data across years — src/engine/playerStats.js's
   CAREER_STATS below, and eventually Comeback Player of the Year's multi-year
   history — keying by name risks silently merging two different players'
   records. Stored at tuple index 14 (added post-hoc, same guard-undefined-on-
   old-saves pattern as contracts/ceiling/hometown at 9-13).

   No persisted counter needed: a timestamp prefix plus random suffix gives
   enough entropy that a collision across even a very long save's worth of
   players is astronomically unlikely, consistent with this engine having no
   seeded PRNG anywhere else either.
   ============================================================ */
export function mintPlayerId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

// One-time migration for existing saves/embedded data — mirrors
// bootstrapContractsIfNeeded()/bootstrapHometownsIfNeeded()'s pattern exactly.
export function bootstrapPlayerIdsIfNeeded() {
  for (const team of TEAM_NAMES) {
    for (const p of PLAYERS_RAW[team]) {
      if (p[14] === undefined) p[14] = mintPlayerId();
    }
  }
  for (const p of PLAYER_POOL) {
    if (p[14] === undefined) p[14] = mintPlayerId();
  }
}
