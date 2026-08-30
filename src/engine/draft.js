import { NAME_POOL_FIRST, NAME_POOL_LAST, TEAMS } from "../data/rawData.js";
import { rand } from "./mathHelpers.js";
import { weakestPosition } from "./ratings.js";

// NBA-style lottery odds, rescaled from the real NBA's 14-team board to
// VPLL's 16-team conference-split lottery pool: the worst three teams are
// flattened to a tied top chance at pick 1, then the odds taper down toward
// the best-record team still in the lottery pool. These are fixed WEIGHTS
// assigned by pre-lottery rank (worst first) and don't get recalculated
// after each pick — same mechanic as the real NBA drawing, where a team's
// assigned combinations stay put; only the pool of teams still eligible
// shrinks as picks 1-8 are drawn.
export const LOTTERY_WEIGHTS = [140, 140, 140, 120, 100, 85, 70, 60, 50, 40, 30, 20, 15, 10, 6, 4];

/* ---------- Draft ---------- */
export function buildDraftOrder(combinedStandings) {
  const sorted = [...combinedStandings].sort((a, b) => a.points - b.points); // worst first

  // Master File 9.2/15.7: lottery pool is the bottom 8 teams PER CONFERENCE
  // (16 total), not the bottom 16 league-wide — keeps the lottery balanced
  // even in a year one conference is much weaker than the other.
  const byConference = {};
  for (const entry of sorted) {
    const conf = TEAMS[entry.team].conf;
    (byConference[conf] = byConference[conf] || []).push(entry);
  }
  const lotteryPool = Object.values(byConference).flatMap((confSorted) => confSorted.slice(0, 8));
  lotteryPool.sort((a, b) => a.points - b.points); // restore true combined-standings order across both conferences
  const lotteryTeamSet = new Set(lotteryPool.map((e) => e.team));
  const rest = sorted.filter((e) => !lotteryTeamSet.has(e.team));

  // Each team keeps the fixed weight tied to its original worst-first rank
  // in the pool for the whole drawing — a team isn't reweighted just because
  // a worse team got picked ahead of it.
  const withWeights = lotteryPool.map((entry, idx) => ({
    entry,
    weight: LOTTERY_WEIGHTS[idx] ?? LOTTERY_WEIGHTS[LOTTERY_WEIGHTS.length - 1],
  }));
  const picks1to8 = [];
  for (let i = 0; i < 8 && withWeights.length; i++) {
    const total = withWeights.reduce((sum, w) => sum + w.weight, 0);
    let r = Math.random() * total;
    let chosenIdx = 0;
    for (let j = 0; j < withWeights.length; j++) { r -= withWeights[j].weight; if (r <= 0) { chosenIdx = j; break; } }
    picks1to8.push(withWeights[chosenIdx].entry.team);
    withWeights.splice(chosenIdx, 1);
  }
  const picks9to16 = withWeights.map((w) => w.entry.team);
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
