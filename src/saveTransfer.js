import { storage } from "./storage.js";

/* ============================================================
   LEAGUE SAVE EXPORT / IMPORT

   Persistence is entirely localStorage-backed (see storage.js) — losing
   browser storage (a cleared profile, a different browser/device, private
   browsing) loses the whole league permanently, with no way to back it up
   or move it. This gives the Commissioner a real file to hold onto.

   Every value under `data` is the *raw already-JSON-stringified string*
   storage.get() hands back for that key — export never re-parses/re-embeds
   app-level JSON, and import never re-serializes it, so a round trip can't
   subtly alter anything (key order, number formatting, etc.). Only the
   thin envelope (format/version/exportedAt/data) is real JSON built here.

   validateLeagueSave() is deliberately pure (no storage/DOM access) so it
   can be unit tested directly — it's the one piece of this file with real
   edge cases worth locking down. buildLeagueSaveExport()/applyLeagueSave()
   both touch storage.js's real localStorage-backed implementation, so
   they're verified the same way every other storage-touching behavior in
   this app is: by hand / Playwright against a real browser, not node:test.
   ============================================================ */
export const SAVE_FORMAT = "vpll-league-save";
export const SAVE_VERSION = 1;

// The complete set of live storage keys a league save is made of. Deliberately excludes
// the legacy "vpll-season-state" key (App.jsx migrates it into vpll-year1-state on load
// and never writes it again) — a save exported from this app always reflects the current,
// already-migrated shape, so re-including the pre-migration key would just be dead weight.
export const SAVE_KEYS = [
  "vpll-game-history", "vpll-league-data-state", "vpll-meta-state",
  "vpll-year1-state", "vpll-pressbox-archive",
];

export async function buildLeagueSaveExport(extra = {}) {
  const data = {};
  for (const key of SAVE_KEYS) {
    const entry = await storage.get(key);
    if (entry) data[key] = entry.value;
  }
  return { format: SAVE_FORMAT, version: SAVE_VERSION, exportedAt: new Date().toISOString(), ...extra, data };
}

// Never throws — returns { ok: true } or { ok: false, error } so a caller can show a
// friendly message instead of an uncaught exception on a hand-edited or unrelated file.
export function validateLeagueSave(parsed) {
  if (!parsed || typeof parsed !== "object") return { ok: false, error: "Not a valid save file." };
  if (parsed.format !== SAVE_FORMAT) return { ok: false, error: "This doesn't look like a VPLL league save file." };
  if (!parsed.data || typeof parsed.data !== "object") return { ok: false, error: "Save file is missing its data." };
  for (const key of SAVE_KEYS) {
    const value = parsed.data[key];
    if (value === undefined || value === null) continue; // absent is fine — that key just gets cleared on import
    if (typeof value !== "string") return { ok: false, error: `Save file's "${key}" entry is malformed.` };
    try {
      JSON.parse(value);
    } catch {
      return { ok: false, error: `Save file's "${key}" entry isn't valid JSON.` };
    }
  }
  return { ok: true };
}

// Only call after validateLeagueSave() has already returned ok. Replaces, not merges —
// any known key absent from the import gets deleted, so an older or thinner save can't
// leave stale current-session data sitting alongside it after import.
export async function applyLeagueSave(parsed) {
  for (const key of SAVE_KEYS) {
    const value = parsed.data[key];
    if (typeof value === "string") await storage.set(key, value);
    else await storage.delete(key);
  }
}
