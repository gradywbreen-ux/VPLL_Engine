import { TEAMS, COACHES } from "../data/rawData.js";
import { clamp, gauss } from "./mathHelpers.js";

/* ============================================================
   SIMULATION ENGINE (Master File Section 5)
   ============================================================ */

export const BALANCE_PCT = { 1: -0.20, 2: -0.16, 3: -0.12, 4: -0.08, 5: 0, 6: 0.04, 7: 0.08, 8: 0.12, 9: 0.16, 10: 0.20 };

export function applyBalance(team, isIndoor) {
  if (!isIndoor) return { ...team };
  const pct = BALANCE_PCT[team.bal] ?? 0;
  const adjusted = { ...team };
  for (const key of ["offPos","offPac","offRisk","defPos","defPre","defRisk","glcStp","glcCon","glcPas","pp","pk","clutch","tcon","riding","clearing"]) {
    adjusted[key] = clamp(team[key] * (1 + pct), 1, 10);
  }
  return adjusted; // Faceoff (fofClm/fofCon) exempt per Master File 5.1
}

export const TAG_CLUTCH_OT = {
  "Veteran-led": 0.10, "Star Dependent": 0.07, "Deep Roster": 0.05,
  "Rebuilding / Unknown": -0.07, "Young & Inexperienced": -0.10,
};
export const TAG_VARIANCE_PCT = {
  "Veteran-led": -0.15, "Star Dependent": 0.20, "Deep Roster": -0.10,
  "Rebuilding / Unknown": 0.20, "Young & Inexperienced": 0.25,
};
export const TAG_FATIGUE_PCT = {
  "Veteran-led": 0.25, "Star Dependent": 0.0, "Deep Roster": -0.50,
  "Rebuilding / Unknown": 0.0, "Young & Inexperienced": -0.25,
};

// Which HC archetypes fit which roster tags — a real fit steadies performance,
// a mismatch adds chaos (Master File Section 8: coach/roster fluid influence).
export const HC_TAG_FIT = {
  "Veteran-led": ["The Veteran Whisperer", "The Players Coach", "The Tactician"],
  "Star Dependent": ["The Gambler", "The Players Coach", "The Firebrand"],
  "Young & Inexperienced": ["The Builder", "The Firebrand", "The Tactician"],
  "Rebuilding / Unknown": ["The Builder", "The Gambler", "The Tactician"],
  "Deep Roster": ["The Tactician", "The Players Coach", "The Veteran Whisperer"],
};

// Head Coach/GM Competence now has a real, modest, persistent effect on team quality
// (roster construction) and archetype fit affects game-to-game steadiness.
export function coachEffect(teamName) {
  const c = COACHES[teamName];
  const team = TEAMS[teamName];
  if (!c) return { qualityBonus: 0, varianceMult: 1 };
  const qualityBonus = (c.hcComp - 60) / 40; // roughly -1 to +1 on the 1-10 subcat scale
  const fits = HC_TAG_FIT[team.tag] || [];
  const varianceMult = fits.includes(c.hcArch) ? 0.90 : 1.12;
  return { qualityBonus, varianceMult };
}

export const SUBCATS_TO_VARY = ["offPos","offPac","offRisk","defPos","defPre","defRisk",
                         "fofClm","fofCon","glcStp","glcCon","glcPas","pp","pk","riding","clearing"];

export function gameDayTeam(team, tag, isFatigued, teamName) {
  const consistency = team.tcon;
  const baseSD = (10 - consistency) / 10 * 3.6 + 1.2;
  const tagMult = 1 + (TAG_VARIANCE_PCT[tag] || 0);
  const fatigueMult = isFatigued ? 1.10 : 1.0;
  const { qualityBonus, varianceMult } = teamName ? coachEffect(teamName) : { qualityBonus: 0, varianceMult: 1 };
  const sd = baseSD * tagMult * fatigueMult * varianceMult;

  const effective = { ...team };
  for (const key of SUBCATS_TO_VARY) {
    effective[key] = clamp(team[key] + gauss(0, sd), 1, 10);
  }
  // persistent coaching quality nudge — steady across every game, unlike the random noise above
  effective.offPos = clamp(effective.offPos + qualityBonus, 1, 10);
  effective.defPos = clamp(effective.defPos + qualityBonus, 1, 10);

  if (isFatigued) {
    const fatigueTagMult = 1 + (TAG_FATIGUE_PCT[tag] || 0);
    effective.defPre = clamp(effective.defPre - 0.3 * fatigueTagMult, 1, 10);
    effective.offPac = clamp(effective.offPac - 0.2 * fatigueTagMult, 1, 10);
    effective.riding = clamp(effective.riding - 0.15 * fatigueTagMult, 1, 10);
  }
  return effective;
}

export function homeFieldBonus(isIndoor, isHome) {
  // Master File 5.5. Clutch/Consistency/Goalie Passing are flat points on the
  // same 0-100 scale as the roster-tag OT modifiers (TAG_CLUTCH_OT etc.) —
  // applyHomeFieldEffects divides by 10 to land on the engine's 1-10 stat
  // scale. Transition is different: computeTransition() already returns a
  // 0-100-ish value, so its bonus is added straight to that computed number
  // inside simulateTeamScore rather than to a raw stat field.
  //
  // Indoor Q2/Q4 longer road shifts (+6 home / -4 away Transition, +5 home
  // Clearing, -15% away Riding) are folded into Transition here as a
  // whole-game average, at half strength — we simulate one aggregate score
  // rather than four quarters. The Clearing/Riding half of that same
  // addendum is applied separately in applyHomeFieldEffects.
  if (!isHome) {
    return isIndoor
      ? { clutch: -3, consistency: -3, transition: -2 + -4 * 0.5, goaliePassing: 0 }
      : { clutch: -2, consistency: -2, transition: -1, goaliePassing: 0 };
  }
  return isIndoor
    ? { clutch: 5, consistency: 5, transition: 4 + 6 * 0.5, goaliePassing: 3 }
    : { clutch: 3, consistency: 3, transition: 2, goaliePassing: 2 };
}

export function applyHomeFieldEffects(team, isHome, isIndoor) {
  const bonus = homeFieldBonus(isIndoor, isHome);
  const adjusted = { ...team };
  adjusted.clutch = clamp(adjusted.clutch + bonus.clutch / 10, 1, 10);
  adjusted.tcon = clamp(adjusted.tcon + bonus.consistency / 10, 1, 10);
  adjusted.glcPas = clamp(adjusted.glcPas + bonus.goaliePassing / 10, 1, 10);
  if (!isIndoor) return adjusted;
  if (isHome) {
    adjusted.clearing = clamp(adjusted.clearing + 0.25, 1, 10); // +2.5/100 avg (half of +5) home Clearing boost
  } else {
    adjusted.riding = clamp(adjusted.riding * 0.925, 1, 10); // 7.5% avg (half of 15%) road Riding penalty
  }
  return adjusted;
}

export function computeTransition(t) {
  return (t.defPre * 0.05 + t.defRisk * 0.05 + t.fofClm * 0.10 + t.offPac * 0.05 +
          t.offRisk * 0.05 + t.riding * 0.30 + t.clearing * 0.30 + t.glcStp * 0.10) * 10;
}
export function computeOffense(t) { return (t.offPos * 0.30 + t.offPac * 0.30 + t.pp * 0.20 + t.offRisk * 0.20) * 10; }
export function computeDefense(t) { return (t.defPos * 0.30 + t.defPre * 0.30 + t.pk * 0.20 + t.defRisk * 0.20) * 10; }
export function computeFaceoff(t) { return (t.fofClm * 0.70 + t.fofCon * 0.30) * 10; }

export function simulateTeamScore(team, opponent, isHome, isIndoor) {
  const homeBonus = homeFieldBonus(isIndoor, isHome);
  const offense = computeOffense(team);
  const oppDefense = computeDefense(opponent);
  const baseGoals = 8 + ((offense - oppDefense) / 10);

  const transition = computeTransition(team) + homeBonus.transition;
  const oppTransition = computeTransition(opponent);
  const transitionGoals = (transition - oppTransition) / 15;

  const ridingAdv = ((team.riding * 10 - opponent.clearing * 10) / 25)
                   + ((opponent.offRisk * 10 - team.defRisk * 10) / 30)
                   + ((team.riding * 10 - opponent.glcPas * 10) / 30);

  const faceoff = computeFaceoff(team);
  const oppFaceoff = computeFaceoff(opponent);
  const faceoffBonus = (faceoff - oppFaceoff) / 20;

  const oppPenaltyGen = (opponent.defRisk * 10 * 0.6 + opponent.defPre * 10 * 0.4);
  const ppGoals = (team.pp * 10 * oppPenaltyGen) / 10000;

  const consistency = team.tcon * 10;
  const varianceSD = 1 + (100 - consistency) / 100 * 2.5;
  const variance = gauss(0, varianceSD);

  const score = baseGoals + transitionGoals + ridingAdv + faceoffBonus + ppGoals + variance;
  return { score: Math.max(0, score), breakdown: { baseGoals, transitionGoals, ridingAdv, faceoffBonus, ppGoals, variance } };
}

export function simulate2PointCycle(offTeam, defTeam) {
  const offRisk = offTeam.offRisk * 10;
  let attemptChance;
  if (offRisk >= 80) attemptChance = 0.55;
  else if (offRisk >= 60) attemptChance = 0.30;
  else attemptChance = 0.10;
  if (Math.random() > attemptChance) return { attempted: false };

  const conversionScore = (offRisk + (100 - defTeam.glcCon * 10) + (100 - defTeam.defPos * 10) + (100 - defTeam.defPre * 10)) / 4;
  const converted = Math.random() * 100 < conversionScore;
  if (converted) return { attempted: true, converted: true };

  // Master File 5.3: missed attempt -> opponent capitalizes based on their
  // Transition rating and Riding, not Consistency.
  const transitionChance = (computeTransition(defTeam) + (defTeam.riding * 10)) / 200;
  const capitalized = Math.random() < transitionChance;
  return { attempted: true, converted: false, capitalized };
}

export function simulateOT(homeTeam, awayTeam, homeTag, awayTag) {
  const homeClutch = homeTeam.clutch * 10 + (TAG_CLUTCH_OT[homeTag] || 0) * 100;
  const awayClutch = awayTeam.clutch * 10 + (TAG_CLUTCH_OT[awayTag] || 0) * 100;
  const homeFaceoff = computeFaceoff(homeTeam);
  const awayFaceoff = computeFaceoff(awayTeam);
  const homeProb = 0.5 + (homeClutch - awayClutch) / 1000
                  + (homeFaceoff - awayFaceoff) / 2000
                  + (100 - awayTeam.glcCon * 10) / 1000
                  + 0.03;
  let periods = 1;
  while (periods < 8) {
    if (Math.random() < clamp(homeProb, 0.15, 0.85)) return { winner: "home", periods };
    periods++;
    if (Math.random() >= clamp(homeProb, 0.15, 0.85)) return { winner: "away", periods };
  }
  return { winner: Math.random() < 0.5 ? "home" : "away", periods };
}

/* ---------- Injury check (Master File 5.7) ---------- */
export function checkInjury(team, tag, isIndoor, isFatigued) {
  let base = 0.04;
  base += (team.offRisk - 5) * 0.003;
  base += (team.defRisk - 5) * 0.002;
  base += (team.defPre - 5) * 0.002;
  if (isIndoor) base += 0.01;
  if (isFatigued) base += 0.015;
  if (tag === "Deep Roster") base *= 0.7;
  if (Math.random() > clamp(base, 0.01, 0.15)) return null;

  const roll = Math.random();
  let severity;
  if (roll < 0.60) severity = "Minor";
  else if (roll < 0.85) severity = "Moderate";
  else if (roll < 0.97) severity = "Significant";
  else severity = "Season-Ending";
  return severity;
}

/* ---------- Full Game Simulation ---------- */
export function simulateGame(homeTeamName, awayTeamName, isIndoor, homeFatigued = false, awayFatigued = false) {
  const homeRaw = TEAMS[homeTeamName];
  const awayRaw = TEAMS[awayTeamName];

  const homeBalanced = applyBalance(homeRaw, isIndoor);
  const awayBalanced = applyBalance(awayRaw, isIndoor);

  const home = applyHomeFieldEffects(gameDayTeam(homeBalanced, homeRaw.tag, homeFatigued, homeTeamName), true, isIndoor);
  const away = applyHomeFieldEffects(gameDayTeam(awayBalanced, awayRaw.tag, awayFatigued, awayTeamName), false, isIndoor);

  const homeResult = simulateTeamScore(home, away, true, isIndoor);
  const awayResult = simulateTeamScore(away, home, false, isIndoor);

  const home2pt = simulate2PointCycle(home, away);
  const away2pt = simulate2PointCycle(away, home);

  let homeScore = Math.round(homeResult.score);
  let awayScore = Math.round(awayResult.score);
  let homeTwoPointGoal = false, awayTwoPointGoal = false;

  if (home2pt.attempted) {
    if (home2pt.converted) { homeScore += 1; homeTwoPointGoal = true; }
    else if (home2pt.capitalized) awayScore += 1;
  }
  if (away2pt.attempted) {
    if (away2pt.converted) { awayScore += 1; awayTwoPointGoal = true; }
    else if (away2pt.capitalized) homeScore += 1;
  }

  homeScore = Math.max(0, homeScore);
  awayScore = Math.max(0, awayScore);

  let ot = null;
  if (homeScore === awayScore) {
    ot = simulateOT(home, away, homeRaw.tag, awayRaw.tag);
    if (ot.winner === "home") homeScore += 1; else awayScore += 1;
  }

  const homeInjury = checkInjury(home, homeRaw.tag, isIndoor, homeFatigued);
  const awayInjury = checkInjury(away, awayRaw.tag, isIndoor, awayFatigued);

  return {
    homeTeam: homeTeamName, awayTeam: awayTeamName, homeScore, awayScore, ot,
    isIndoor, homeTwoPointGoal, awayTwoPointGoal,
    homeInjury, awayInjury,
    homeFatigued, awayFatigued,
  };
}
