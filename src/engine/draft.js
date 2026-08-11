import { NAME_POOL_FIRST, NAME_POOL_LAST } from "../data/rawData.js";
import { rand } from "./mathHelpers.js";
import { weakestPosition } from "./ratings.js";

/* ---------- Draft ---------- */
export function buildDraftOrder(combinedStandings) {
  const sorted = [...combinedStandings].sort((a, b) => a.points - b.points); // worst first
  const lotteryPool = sorted.slice(0, 16);
  const rest = sorted.slice(16);
  const pool = [...lotteryPool];
  const picks1to8 = [];
  for (let i = 0; i < 8 && pool.length; i++) {
    const weights = pool.map((_, idx) => pool.length - idx);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let chosenIdx = 0;
    for (let j = 0; j < weights.length; j++) { r -= weights[j]; if (r <= 0) { chosenIdx = j; break; } }
    picks1to8.push(pool[chosenIdx].team);
    pool.splice(chosenIdx, 1);
  }
  const picks9to16 = pool.map((t) => t.team);
  const picks17to32 = rest.map((t) => t.team);
  return [...picks1to8, ...picks9to16, ...picks17to32];
}

export const DRAFT_POSITIONS = ["A","A","M","M","M","L","L","D","D","F","G"];
export function getUniqueName(usedNames) {
  let first, last, full;
  let attempts = 0;
  do {
    first = NAME_POOL_FIRST[Math.floor(Math.random() * NAME_POOL_FIRST.length)];
    last = NAME_POOL_LAST[Math.floor(Math.random() * NAME_POOL_LAST.length)];
    full = `${first} ${last}`;
    attempts++;
  } while ((usedNames.has(full) || first[0].toUpperCase() === last[0].toUpperCase()) && attempts < 300);
  usedNames.add(full);
  return full;
}

export function generateProspect(round, usedNames, teamName) {
  // Need-aware: a team drafts for its weakest position group most of the time,
  // but not always — "best player available" logic still wins out sometimes,
  // and even a need-based pick can bust (handled at development time).
  let pos;
  if (teamName && Math.random() < 0.60) {
    pos = weakestPosition(teamName);
  } else {
    pos = DRAFT_POSITIONS[Math.floor(Math.random() * DRAFT_POSITIONS.length)];
  }
  const age = 19 + Math.floor(Math.random() * 4);
  let ovrCenter, ceilCenter;
  if (round === 1) { ovrCenter = 74; ceilCenter = 87; }
  else if (round === 2) { ovrCenter = 66; ceilCenter = 79; }
  else if (round === 3) { ovrCenter = 60; ceilCenter = 73; }
  else if (round === 4) { ovrCenter = 55; ceilCenter = 67; }
  else { ovrCenter = 50; ceilCenter = 62; }
  const overall = Math.max(38, Math.min(92, Math.round(ovrCenter + rand(-9, 9))));
  const ceiling = Math.max(overall, Math.min(99, Math.round(ceilCenter + rand(-7, 10))));
  const hand = Math.random() < 0.62 ? "R" : Math.random() < 0.90 ? "L" : "A";
  return { name: getUniqueName(usedNames), pos, age, overall, ceiling, hand, round };
}

export function runDraft(draftOrder, usedNames) {
  const results = [];
  let overallPick = 1;
  for (let round = 1; round <= 5; round++) {
    for (let i = 0; i < draftOrder.length; i++) {
      const team = draftOrder[i];
      const prospect = generateProspect(round, usedNames, team);
      results.push({ overallPick, round, team, prospect });
      overallPick++;
    }
  }
  return results;
}
