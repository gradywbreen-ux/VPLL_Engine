/* ---------- Retirement ---------- */
export function evaluateRetirement(player) { // [name,pos,hand,age,ovr,star,leadership,balance,durability]
  const age = player[3], durability = player[8], leadership = player[6];
  if (age < 36) return false;
  let chance;
  if (age <= 37) chance = 0.12;
  else if (age <= 39) chance = 0.25;
  else if (age === 40) chance = 0.45;
  else chance = 0.70;
  chance -= (durability - 50) / 400;
  chance -= (leadership - 50) / 500;
  return Math.random() < Math.max(0.03, chance);
}
