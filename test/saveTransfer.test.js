// Direct checks for src/saveTransfer.js's validateLeagueSave() — the one piece of the
// league save export/import feature (task #52) that's pure enough to unit test without
// a real browser/localStorage. buildLeagueSaveExport()/applyLeagueSave() both go through
// storage.js's real localStorage-backed implementation and are verified by hand/Playwright
// instead, same as every other storage-touching behavior in this app.
import { test } from "node:test";
import assert from "node:assert/strict";

import { SAVE_FORMAT, SAVE_VERSION, SAVE_KEYS, validateLeagueSave } from "../src/saveTransfer.js";

function validSave(overrides = {}) {
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    exportedAt: "2026-01-01T00:00:00.000Z",
    data: { "vpll-meta-state": JSON.stringify({ yearNumber: 3 }) },
    ...overrides,
  };
}

test("validateLeagueSave accepts a well-formed save", () => {
  assert.deepEqual(validateLeagueSave(validSave()), { ok: true });
});

test("validateLeagueSave accepts a save with every known key absent (an empty/fresh league)", () => {
  assert.deepEqual(validateLeagueSave(validSave({ data: {} })), { ok: true });
});

test("validateLeagueSave rejects null, non-objects, and anything without the right format tag", () => {
  assert.equal(validateLeagueSave(null).ok, false);
  assert.equal(validateLeagueSave("just a string").ok, false);
  assert.equal(validateLeagueSave(42).ok, false);
  assert.equal(validateLeagueSave({ format: "some-other-app-save", data: {} }).ok, false);
  assert.equal(validateLeagueSave({}).ok, false, "missing format entirely should be rejected");
});

test("validateLeagueSave rejects a save with no data object", () => {
  assert.equal(validateLeagueSave({ format: SAVE_FORMAT }).ok, false);
  assert.equal(validateLeagueSave({ format: SAVE_FORMAT, data: null }).ok, false);
  assert.equal(validateLeagueSave({ format: SAVE_FORMAT, data: "not an object" }).ok, false);
});

test("validateLeagueSave rejects a non-string value for a known key", () => {
  const result = validateLeagueSave(validSave({ data: { "vpll-meta-state": { not: "a string" } } }));
  assert.equal(result.ok, false);
  assert.match(result.error, /vpll-meta-state/);
});

test("validateLeagueSave rejects a known key whose string value isn't valid JSON", () => {
  const result = validateLeagueSave(validSave({ data: { "vpll-year1-state": "{not valid json" } }));
  assert.equal(result.ok, false);
  assert.match(result.error, /vpll-year1-state/);
});

test("validateLeagueSave ignores unrecognized keys rather than rejecting the whole file (forward-compat)", () => {
  const result = validateLeagueSave(validSave({
    data: { "vpll-meta-state": JSON.stringify({ yearNumber: 1 }), "some-future-key": "whatever garbage" },
  }));
  assert.deepEqual(result, { ok: true });
});

test("SAVE_KEYS covers every live storage key App.jsx actually reads/writes", () => {
  // A hand-maintained cross-check, not derived from App.jsx — if a new persisted key is
  // ever added there without updating this list, a save/restore cycle would silently
  // drop it. Kept in sync manually; this test exists so that omission is at least visible.
  assert.deepEqual(
    [...SAVE_KEYS].sort(),
    ["vpll-game-history", "vpll-league-data-state", "vpll-meta-state", "vpll-pressbox-archive", "vpll-year1-state"].sort()
  );
});
