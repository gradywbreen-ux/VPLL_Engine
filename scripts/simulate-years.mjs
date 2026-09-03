#!/usr/bin/env node
/* ============================================================
   Multi-year league simulation benchmark — formalizes the manual process
   described in CLAUDE.md's "Testing Workflow" (run N years, inspect output
   by hand). Reports the same kind of numbers as the last manual tuning pass
   (16 years: rating SD 6.9-10.0, ~6% coach firing rate, 23/32 teams touched
   a top-5, 20/32 touched a bottom-5, zero Year-1/Year-N top-5 overlap) so a
   new run can be compared against that baseline.

   Usage: node scripts/simulate-years.mjs [years]   (default 16)
   ============================================================ */
import { simulateYears } from "./lib/simulateLeague.mjs";

const YEARS = Number(process.argv[2]) || 16;

console.log(`Simulating ${YEARS} years from a fresh Year 1 baseline...\n`);

const start = Date.now();
const years = simulateYears(YEARS, {
  onYearComplete: (y) => {
    const violationNote = y.rosterIntegrityViolations.length ? `  !! ${y.rosterIntegrityViolations.length} integrity violations` : "";
    console.log(
      `Year ${String(y.year).padStart(2)}: Corkum=${y.corkumChampion.padEnd(24)} Culkin=${y.culkinChampion.padEnd(24)} Cup=${y.cupChampion.padEnd(24)} SD=${y.ratingSD.toFixed(2)}  fires=${y.coachesFired}${violationNote}`
    );
  },
});
const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);

const sds = years.map((y) => y.ratingSD);
const sdMin = Math.min(...sds), sdMax = Math.max(...sds);

const totalFires = years.reduce((s, y) => s + y.coachesFired, 0);
const teamSeasons = years.length * 32;
const fireRate = ((totalFires / teamSeasons) * 100).toFixed(1);

const top5Union = new Set(years.flatMap((y) => y.top5));
const bottom5Union = new Set(years.flatMap((y) => y.bottom5));

const year1Top5 = new Set(years[0].top5);
const yearNTop5 = new Set(years[years.length - 1].top5);
const top5Overlap = [...year1Top5].filter((t) => yearNTop5.has(t)).length;

const corkumChamps = new Set(years.map((y) => y.corkumChampion));
const culkinChamps = new Set(years.map((y) => y.culkinChampion));
const cupChamps = new Set(years.map((y) => y.cupChampion));

function championCounts(field) {
  const counts = {};
  for (const y of years) counts[y[field]] = (counts[y[field]] || 0) + 1;
  return counts;
}
const cupChampCounts = championCounts("cupChampion");
const mostSuccessfulTeam = Object.entries(cupChampCounts).sort((a, b) => b[1] - a[1])[0];

const totalViolations = years.reduce((s, y) => s + y.rosterIntegrityViolations.length, 0);

console.log(`\n${"=".repeat(70)}`);
console.log(`SUMMARY — ${YEARS} years, ${elapsedSec}s`);
console.log("=".repeat(70));
console.log(`Rating SD range:            ${sdMin.toFixed(2)} - ${sdMax.toFixed(2)}  (benchmark: 6.9-10.0)`);
console.log(`Coach firing rate:          ${fireRate}% per team-season  (benchmark: ~6%)`);
console.log(`Teams that touched top-5:   ${top5Union.size}/32  (benchmark: 23/32 over 16yr)`);
console.log(`Teams that touched bottom-5:${bottom5Union.size}/32  (benchmark: 20/32 over 16yr)`);
console.log(`Year 1 vs Year ${YEARS} top-5 overlap: ${top5Overlap}/5  (benchmark: 0 over 16yr)`);
console.log(`Distinct Corkum champions:  ${corkumChamps.size}/${YEARS}`);
console.log(`Distinct Culkin champions:  ${culkinChamps.size}/${YEARS}`);
console.log(`Distinct Cup champions:     ${cupChamps.size}/${YEARS}`);
console.log(`Most Cup titles by one team: ${mostSuccessfulTeam[1]} (${mostSuccessfulTeam[0]}) — dynasties possible, not guaranteed if this is well below ${YEARS}`);
console.log(`Roster integrity violations: ${totalViolations}  (should be 0)`);
console.log("=".repeat(70));

if (totalViolations > 0) {
  console.log("\nIntegrity violations found:");
  for (const y of years) for (const v of y.rosterIntegrityViolations) console.log(`  Year ${y.year}: ${v}`);
  process.exitCode = 1;
}
