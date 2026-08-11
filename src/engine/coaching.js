import { rand } from "./mathHelpers.js";
import { getUniqueName } from "./draft.js";

/* ---------- Coach Movement ---------- */
// A coach now needs sustained struggle to lose their job, not just one bad year —
// tenure=1 (first year on the job) is always safe; firing pressure escalates with
// consecutive bad years, matching the Master File's "3 consecutive losing seasons" spirit.
export function evaluateFiring(coachRecord, corkumMadePlayoffs, culkinMadePlayoffs, combinedCupRank, competence) {
  const tenure = coachRecord.hcTenure || 1;
  const priorStruggle = coachRecord.hcStruggleYears || 0;
  if (tenure <= 1) return { fired: false, strugglingYears: 0 };

  const hadBadYear = (!corkumMadePlayoffs && !culkinMadePlayoffs) || combinedCupRank >= 27;
  const strugglingYears = hadBadYear ? priorStruggle + 1 : 0;

  let fireChance = 0.02;
  if (strugglingYears === 1) fireChance += 0.08;
  else if (strugglingYears === 2) fireChance += 0.35;
  else if (strugglingYears >= 3) fireChance += 0.65;
  fireChance -= (competence - 50) / 300;

  const fired = Math.random() < Math.max(0.02, Math.min(0.85, fireChance));
  return { fired, strugglingYears: fired ? 0 : strugglingYears };
}

export const HC_ARCHETYPES = ["The Tactician","The Players Coach","The Firebrand","The Builder","The Veteran Whisperer","The Gambler"];
export function generateFreshCoach(usedNames) {
  const name = getUniqueName(usedNames);
  const archetype = HC_ARCHETYPES[Math.floor(Math.random() * HC_ARCHETYPES.length)];
  const competence = Math.round(rand(45, 90));
  const development = Math.round(rand(40, 85));
  return { name, archetype, competence, development };
}
