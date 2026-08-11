import { TEAM_NAMES, PLAYERS_RAW } from "./rawData.js";

// One-time migration: introduce Long-Stick Midfield by reclassifying ~2 midfielders per team
// (the position didn't exist when the original 800-player pool was generated).
export function migrateLSMIfNeeded() {
  for (const teamName of TEAM_NAMES) {
    const roster = PLAYERS_RAW[teamName];
    if (roster.some((p) => p[1] === "L")) continue; // already migrated
    const midfielders = roster.filter((p) => p[1] === "M");
    // pick the 2 oldest midfielders — reads as "converted to the long pole role later in their career"
    const toConvert = [...midfielders].sort((a, b) => b[3] - a[3]).slice(0, Math.min(2, midfielders.length));
    for (const p of toConvert) p[1] = "L";
  }
}
