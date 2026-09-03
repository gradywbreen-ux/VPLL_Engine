// Direct checks for stable player identity (src/engine/playerId.js) — the tuple-14 id
// that lets career stats (src/engine/playerStats.js, CAREER_STATS) survive a player's
// name being reissued to someone else after they retire or leave the pool.
import { test } from "node:test";
import assert from "node:assert/strict";

import { PLAYERS_RAW, PLAYER_POOL } from "../src/data/rawData.js";
import { mintPlayerId, bootstrapPlayerIdsIfNeeded } from "../src/engine/playerId.js";

test("mintPlayerId produces unique ids over a large sample", () => {
  const ids = new Set();
  for (let i = 0; i < 20000; i++) ids.add(mintPlayerId());
  assert.equal(ids.size, 20000);
});

test("bootstrapPlayerIdsIfNeeded backfills missing ids and never overwrites an existing one", () => {
  const TEAM = "Saint Albans Dawnlanders";
  const originalRoster = PLAYERS_RAW[TEAM];
  const originalPool = PLAYER_POOL.slice();
  const withId = [...originalRoster[0]];
  withId[14] = "existing-id-should-survive";
  const withoutId = [...originalRoster[1]];
  withoutId[14] = undefined;
  PLAYERS_RAW[TEAM] = [withId, withoutId, ...originalRoster.slice(2)];
  PLAYER_POOL.length = 0;
  const poolPlayer = [...originalRoster[2]];
  poolPlayer[14] = undefined;
  PLAYER_POOL.push(poolPlayer);
  try {
    bootstrapPlayerIdsIfNeeded();
    assert.equal(PLAYERS_RAW[TEAM][0][14], "existing-id-should-survive");
    assert.ok(PLAYERS_RAW[TEAM][1][14], "a missing id should be backfilled");
    assert.ok(PLAYER_POOL[0][14], "pool players get backfilled too");
  } finally {
    PLAYERS_RAW[TEAM] = originalRoster;
    PLAYER_POOL.length = 0;
    PLAYER_POOL.push(...originalPool);
  }
});
