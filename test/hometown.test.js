// Direct checks for the Player Hometown System (Master File 9.3),
// src/engine/hometown.js.
import { test } from "node:test";
import assert from "node:assert/strict";

import { TEAM_NAMES, PLAYERS_RAW, PLAYER_POOL } from "../src/data/rawData.js";
import { MARKET_TIER, assignHometown, bootstrapHometownsIfNeeded } from "../src/engine/hometown.js";

test("MARKET_TIER covers every real team exactly once, tiers 1-3", () => {
  const teams = Object.keys(MARKET_TIER);
  assert.equal(teams.length, TEAM_NAMES.length);
  for (const t of TEAM_NAMES) assert.ok(t in MARKET_TIER, `${t} missing from MARKET_TIER`);
  for (const t of teams) assert.ok([1, 2, 3].includes(MARKET_TIER[t]), `${t} has an invalid tier`);
});

test("assignHometown always returns a real team name", () => {
  for (let i = 0; i < 200; i++) assert.ok(TEAM_NAMES.includes(assignHometown()));
});

test("assignHometown weights Tier 1 markets above Tier 3 over a large sample", () => {
  const N = 20000;
  const counts = {};
  for (let i = 0; i < N; i++) {
    const t = assignHometown();
    counts[t] = (counts[t] || 0) + 1;
  }
  const tier1Teams = TEAM_NAMES.filter((t) => MARKET_TIER[t] === 1);
  const tier3Teams = TEAM_NAMES.filter((t) => MARKET_TIER[t] === 3);
  const avgTier1 = tier1Teams.reduce((s, t) => s + (counts[t] || 0), 0) / tier1Teams.length;
  const avgTier3 = tier3Teams.reduce((s, t) => s + (counts[t] || 0), 0) / tier3Teams.length;
  assert.ok(avgTier1 > avgTier3, "a Tier 1 market should turn out hometown talent more often than Tier 3");
  assert.ok(avgTier3 > 0, "Tier 3 markets should never drop to zero weight");
});

test("bootstrapHometownsIfNeeded assigns a real team to every rostered/pooled player missing one, and never overwrites an existing hometown", () => {
  const TEAM = "Saint Albans Dawnlanders";
  const originalRoster = PLAYERS_RAW[TEAM];
  const originalPool = PLAYER_POOL.slice();
  const withHometown = [...originalRoster[0]];
  withHometown[13] = "Rutland Cryptids"; // pre-existing hometown, should survive untouched
  const withoutHometown = [...originalRoster[1]];
  withoutHometown[13] = undefined;
  PLAYERS_RAW[TEAM] = [withHometown, withoutHometown, ...originalRoster.slice(2)];
  PLAYER_POOL.length = 0;
  const poolPlayer = [...originalRoster[2]];
  poolPlayer[13] = undefined;
  PLAYER_POOL.push(poolPlayer);
  try {
    bootstrapHometownsIfNeeded();
    assert.equal(PLAYERS_RAW[TEAM][0][13], "Rutland Cryptids", "an existing hometown should never be overwritten");
    assert.ok(TEAM_NAMES.includes(PLAYERS_RAW[TEAM][1][13]), "a missing hometown should be backfilled with a real team");
    assert.ok(TEAM_NAMES.includes(PLAYER_POOL[0][13]), "pool players get backfilled too");
  } finally {
    PLAYERS_RAW[TEAM] = originalRoster;
    PLAYER_POOL.length = 0;
    PLAYER_POOL.push(...originalPool);
  }
});
