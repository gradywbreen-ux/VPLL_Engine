/* ============================================================
   STORAGE
   Replaces the Claude.ai artifact sandbox's window.storage API with plain
   localStorage. Same async get/set/delete shape, same key names in use
   throughout the app (vpll-game-history, vpll-league-data-state,
   vpll-meta-state, vpll-year1-state, vpll-pressbox-archive, plus the legacy
   vpll-season-state migration path) — a mechanical swap, not a redesign.
   See CLAUDE.md "What has to change for local/non-Claude.ai execution".
   ============================================================ */
export const storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    return value === null ? undefined : { value };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
  async delete(key) {
    localStorage.removeItem(key);
  },
};
