import { playersFor } from "../data/rawData.js";
import { pickWeighted } from "./mathHelpers.js";

/* ---------- Box Score / Scoring Attribution ---------- */
export const SCORER_WEIGHT = { A: 3.0, M: 2.0, L: 0.8, D: 0.4, F: 0.25, G: 0.02 };

export function attributeGoals(teamName, goalCount, hasTwoPointGoal) {
  const roster = playersFor(teamName);
  const eligible = roster.filter((p) => p.pos !== "G" || Math.random() < 0.02);
  const scorers = [];
  for (let i = 0; i < goalCount; i++) {
    const isTwoPoint = hasTwoPointGoal && i === goalCount - 1;
    const pool = isTwoPoint ? eligible.filter((p) => p.pos === "A" || p.pos === "M") : eligible;
    const scorer = pickWeighted(pool.length ? pool : eligible, (p) =>
      (SCORER_WEIGHT[p.pos] || 0.3) * (p.ovr / 60) * (p.star ? 1.4 : 1)
    );
    let assist = null;
    if (Math.random() < 0.82) {
      const assistPool = eligible.filter((p) => p.name !== scorer.name);
      if (assistPool.length) {
        assist = pickWeighted(assistPool, (p) =>
          (SCORER_WEIGHT[p.pos] || 0.3) * (p.ovr / 60) * (p.star ? 1.3 : 1)
        );
      }
    }
    scorers.push({ scorer: scorer.name, pos: scorer.pos, assist: assist ? assist.name : null, twoPoint: isTwoPoint });
  }
  return scorers;
}
