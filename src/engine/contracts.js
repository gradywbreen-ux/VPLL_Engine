import { TEAM_NAMES, PLAYERS_RAW } from "../data/rawData.js";
import { rand } from "./mathHelpers.js";

/* ============================================================
   CONTRACTS & SALARY CAP (Master File Section 9)
   Player tuple extended: [...9 base fields, aav, yearsRemaining, contractType]
   Soft cap with tiered overage fines, same structure as the standalone roster docs.
   ============================================================ */
export const SALARY_CAP = 2_000_000;
export const CONTRACT_TYPES = { ROOKIE: "R", STANDARD: "S", FRANCHISE: "F", JOURNEYMAN: "J" };

export function baseSalaryFromOverall(overall) {
  if (overall >= 92) return rand(150000, 220000);
  if (overall >= 88) return rand(100000, 150000);
  if (overall >= 82) return rand(65000, 95000);
  if (overall >= 76) return rand(40000, 60000);
  if (overall >= 70) return rand(25000, 38000);
  if (overall >= 62) return rand(14000, 22000);
  if (overall >= 55) return rand(9000, 14000);
  return rand(6000, 10000);
}

export function assignNewContract(p, forceType) {
  // p is the live tuple — mutated in place: [.., aav, yearsRemaining, contractType]
  const ovr = p[4], age = p[3], star = p[5] === 1, leadership = p[6];
  let salary = baseSalaryFromOverall(ovr);
  if (star) salary *= rand(1.20, 1.35);
  if (leadership >= 80) salary *= rand(1.08, 1.13);
  if (age >= 24 && age <= 29) salary *= 1.08;
  if (age >= 33) salary *= age >= 37 ? rand(0.72, 0.82) : rand(0.82, 0.90);
  if (p[1] === "G") salary *= 1.08;
  salary = Math.round(salary / 500) * 500;

  let type = forceType || CONTRACT_TYPES.STANDARD;
  if (!forceType) {
    if (ovr < 55) type = CONTRACT_TYPES.JOURNEYMAN;
    else if (star && ovr >= 88) type = CONTRACT_TYPES.FRANCHISE;
  }
  let length;
  if (type === CONTRACT_TYPES.ROOKIE) length = 3;
  else if (type === CONTRACT_TYPES.JOURNEYMAN) length = 1;
  else if (type === CONTRACT_TYPES.FRANCHISE) length = Math.round(rand(4, 7));
  else length = age <= 24 ? Math.round(rand(2, 5)) : age <= 30 ? Math.round(rand(2, 6)) : age <= 34 ? Math.round(rand(1, 4)) : Math.round(rand(1, 3));

  p[9] = salary;
  p[10] = length;
  p[11] = type;
  return p;
}

export function bootstrapContractsIfNeeded() {
  // Year 1 players are embedded without contracts — assign once, first time the league loads.
  for (const teamName of TEAM_NAMES) {
    for (const p of PLAYERS_RAW[teamName]) {
      if (p[9] === undefined) {
        assignNewContract(p);
        p[10] = Math.max(1, Math.round(rand(1, p[10]))); // stagger initial years-remaining so contracts don't all expire simultaneously
      }
    }
  }
}

export function teamPayroll(teamName) {
  return PLAYERS_RAW[teamName].reduce((sum, p) => sum + (p[9] || 0), 0);
}

export function capFine(payroll) {
  if (payroll <= SALARY_CAP) return 0;
  const overage = payroll - SALARY_CAP;
  const pctOver = (overage / SALARY_CAP) * 100;
  if (pctOver <= 5) return 0;
  if (pctOver <= 10) return Math.round(overage * 0.25);
  if (pctOver <= 20) return Math.round(overage * 0.50);
  if (pctOver <= 30) return Math.round(overage * 1.00);
  return Math.round(overage * 2.00);
}
