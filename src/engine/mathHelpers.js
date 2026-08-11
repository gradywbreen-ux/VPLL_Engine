/* ---------- MATH HELPERS ---------- */
export function gauss(mean = 0, sd = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export function formatMoney(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export function pickWeighted(items, weightFn) {
  const weights = items.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function clamp10(v) { return Math.max(1, Math.min(10, v)); }
export function rand(min, max) { return min + Math.random() * (max - min); }
