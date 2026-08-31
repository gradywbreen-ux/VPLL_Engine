import { POS_NAME, TEAMS, COACHES } from "../data/rawData.js";
import { FREE_AGENT_TIER_NAMES } from "../engine/freeAgency.js";

/* ============================================================
   PRESS BOX — Narrative Layer (Phase 5)
   Generates game recaps and columns via the Anthropic API, in the voice of the
   league's media ecosystem. All content stays inside the fiction: Year N only,
   no real-world references, quotes only from named VPLL coaches and players.
   ============================================================ */
export const OUTLET_VOICES = {
  "VPLL.com": "The league's official site. Professional, balanced beat reporting. Focus on what happened and why it matters in the standings. Quotes from both sides. No hot takes.",
  "The Mesh": "The league's analytical outlet. Tactical deep-dives for die-hard fans: transition games, riding pressure, faceoff battles, 2-point shot selection, coaching chess matches. Smart, precise, respectful. Assume the reader knows the league.",
  "The X": "The league's opinion page. A columnist with strong takes and a sharp pen. Calls out underperformers, questions coaching decisions, stokes rivalries, loves the big-market/small-market tension and the resort-town cap violators. Provocative but never cruel.",
  "Hot Stove": "The league's offseason rumor mill and transaction analysis column. Draft grades, coaching carousel gossip, retirement tributes, cap and market speculation. Breathless but informed.",
};

export function teamIdentityNotes(team) {
  const notes = [];
  if (team.riding >= 8) notes.push("elite riding/pressure transition game");
  if (team.clearing >= 8) notes.push("clean clearing unit");
  if (team.offRisk >= 8) notes.push("aggressive 2-point-hunting offense");
  if (team.offPac >= 8) notes.push("up-tempo attack");
  if (team.defPre >= 8) notes.push("suffocating pressure defense");
  if (team.defPos >= 8 && team.defPre < 8) notes.push("disciplined positional defense");
  if (team.glcStp >= 8) notes.push("elite goaltending");
  if (team.fofClm >= 8) notes.push("dominant faceoff unit");
  if (team.tcon <= 5) notes.push("notoriously volatile night to night");
  if (team.clutch >= 8) notes.push("proven in close games");
  return notes.slice(0, 3).join(", ") || "balanced profile";
}

export function buildTeamContext(teamName, standingsTable) {
  const t = TEAMS[teamName];
  const c = COACHES[teamName];
  const rec = standingsTable && standingsTable[teamName]
    ? `${standingsTable[teamName].w}-${standingsTable[teamName].l}${standingsTable[teamName].otl ? `-${standingsTable[teamName].otl} OTL` : ""}`
    : "exhibition";
  return `${teamName} (${t.conf === "Lake" ? "Lakeshore" : "Mountainside"} Conference, ${t.div} Division; record: ${rec}; identity: ${t.tag}, ${teamIdentityNotes(t)}; Head Coach/GM: ${c.hc}, archetype "${c.hcArch}")`;
}

export function summarizeGoals(goals) {
  if (!goals || !goals.length) return "no goals";
  const byScorer = {};
  for (const g of goals) {
    if (!byScorer[g.scorer]) byScorer[g.scorer] = { goals: 0, twoPt: 0, pos: g.pos };
    byScorer[g.scorer].goals++;
    if (g.twoPoint) byScorer[g.scorer].twoPt++;
  }
  return Object.entries(byScorer)
    .sort((a, b) => b[1].goals - a[1].goals)
    .slice(0, 4)
    .map(([name, s]) => `${name} (${POS_NAME[s.pos] || s.pos}) ${s.goals}G${s.twoPt ? ` incl. ${s.twoPt} two-pointer` : ""}`)
    .join("; ");
}

export function buildRecapPrompt({ outlet, yearNum, seasonLabel, homeTeam, awayTeam, homeScore, awayScore, ot, homeGoals, awayGoals, homeCtx, awayCtx }) {
  return `You are a sportswriter for ${outlet}, covering the Vermont Professional Lacrosse League (VPLL) — a fictional 32-team professional lacrosse league spread across small-town Vermont, with rabid EPL-style local fanbases.

OUTLET VOICE: ${OUTLET_VOICES[outlet]}

GAME FACTS (${seasonLabel}, Year ${yearNum}):
- Final: ${homeTeam} ${homeScore}, ${awayTeam} ${awayScore}${ot ? " (overtime)" : ""} — ${homeTeam} was home
- ${homeTeam} scoring: ${summarizeGoals(homeGoals)}
- ${awayTeam} scoring: ${summarizeGoals(awayGoals)}

TEAM CONTEXT:
- ${homeCtx}
- ${awayCtx}

RULES:
- This is a fictional league. Never reference real-world years, leagues, teams, or people. The league calendar is simply "Year ${yearNum}".
- You may invent brief post-game quotes, but attribute them ONLY to the coaches or players named above.
- 200-330 words.
- Respond ONLY with valid JSON in exactly this shape, no markdown fences, no preamble: {"headline": "...", "body": "..."}`;
}

export function buildHotStovePrompt({ yearNum, corkumChampion, culkinChampion, cupChampion, draft, coaching, retirement, progression, freeAgency, trades }) {
  const topPicks = draft ? draft.results.slice(0, 5).map((p) => `Pick ${p.overallPick}: ${p.team} selects ${p.prospect.name} (${POS_NAME[p.prospect.pos]}, age ${p.prospect.age}, ceiling ${p.prospect.ceiling})`).join("; ") : "draft pending";
  const firings = coaching && coaching.fired.length
    ? coaching.fired.map((f, i) => `${f.team} fired ${f.oldCoach} (${f.oldArch}), hired ${coaching.hired[i]?.newCoach} (${coaching.hired[i]?.newArch})`).join("; ")
    : "no coaching changes";
  const retirements = retirement && retirement.retirees.length
    ? retirement.retirees.slice(0, 6).map((r) => `${r.name} (${POS_NAME[r.pos]}, ${r.team}, age ${r.age})`).join("; ") + (retirement.retirees.length > 6 ? ` and ${retirement.retirees.length - 6} others` : "")
    : "no retirements";
  const movers = progression
    ? [...progression.results].sort((a, b) => b.delta - a.delta).slice(0, 3).map((r) => `${r.team} (${r.oldScore}→${r.newScore})`).join(", ") + "; fallers: " +
      [...progression.results].sort((a, b) => a.delta - b.delta).slice(0, 3).map((r) => `${r.team} (${r.oldScore}→${r.newScore})`).join(", ")
    : "progression pending";
  const topSignings = freeAgency && freeAgency.signed.length
    ? [...freeAgency.signed].sort((a, b) => (b.aav || 0) - (a.aav || 0)).slice(0, 5)
      .map((s) => `${s.name} (${FREE_AGENT_TIER_NAMES[s.tier] || "unranked"}, ${s.motivation}): ${s.from} → ${s.team}`).join("; ")
    : "a quiet free agency period";
  const salaryDumps = trades && trades.trades.length
    ? trades.trades.filter((t) => t.reason.startsWith("salary dump")).map((t) => t.reason).join("; ")
    : "";
  const otherTrades = trades && trades.trades.length
    ? trades.trades.filter((t) => !t.reason.startsWith("salary dump")).slice(0, 3)
      .map((t) => `${t.teamA} ↔ ${t.teamB}: ${t.playerA} for ${t.playerB} (${t.reason})`).join("; ")
    : "no major trades";

  return `You are the writer of Hot Stove, the offseason rumor and transaction column covering the Vermont Professional Lacrosse League (VPLL) — a fictional 32-team professional lacrosse league in small-town Vermont with rabid EPL-style fanbases and a soft salary cap that resort-town teams love to violate.

OUTLET VOICE: ${OUTLET_VOICES["Hot Stove"]}

YEAR ${yearNum} OFFSEASON FACTS:
- Corkum Trophy (outdoor) champion: ${corkumChampion}
- Culkin Trophy (indoor) champion: ${culkinChampion}
- Commissioners Cup (combined) champion: ${cupChampion}
- Draft: ${topPicks}
- Coaching carousel: ${firings}
- Retirements: ${retirements}
- Risers/fallers heading into next year: ${movers}
- Free agency's biggest moves: ${topSignings}
- Trade activity: ${otherTrades}${salaryDumps ? `\n- Cap-driven salary dumps (teams shedding contracts purely to duck the luxury tax — a distinct storyline from a needs-based or star-demanded trade): ${salaryDumps}` : ""}

RULES:
- This is a fictional league. Never reference real-world years, leagues, teams, or people. The league calendar is simply "Year ${yearNum}".
- You may invent brief quotes from "league sources" or the named coaches.
- 250-400 words. Cover the draft's biggest storyline, the most interesting coaching or free agency/trade move, and one bold prediction. A Franchise-tier free agent signing or a cap-driven salary dump, if either happened, is exactly the kind of thing this column should lead with.
- Respond ONLY with valid JSON in exactly this shape, no markdown fences, no preamble: {"headline": "...", "body": "..."}`;
}

export function buildWeekInReviewPrompt({ yearNum, seasonLabel, week, weekGames, standingsTable, isFinalWeek }) {
  const gameLines = weekGames.map((g) =>
    `${g.home} ${g.homeScore}–${g.awayScore} ${g.away}${g.ot ? " (OT)" : ""}`
  ).join("; ");

  const ranked = Object.values(standingsTable).sort((a, b) => b.points - a.points || b.gd - a.gd);
  const top5 = ranked.slice(0, 5).map((t) => `${t.team} (${t.w}-${t.l}${t.otl ? `-${t.otl}` : ""})`).join(", ");
  const bottom5 = ranked.slice(-5).map((t) => `${t.team} (${t.w}-${t.l}${t.otl ? `-${t.otl}` : ""})`).join(", ");

  return `You are the writer of "The Week Ahead," VPLL.com's recurring weekly wrap-up column covering the Vermont Professional Lacrosse League (VPLL) — a fictional 32-team professional lacrosse league in small-town Vermont with rabid EPL-style local fanbases.

OUTLET VOICE: ${OUTLET_VOICES["VPLL.com"]} This is the weekly roundup format specifically — hit multiple games and storylines briskly rather than deep-diving one game. Think "around the league" column.

WEEK ${week} FACTS (${seasonLabel}, Year ${yearNum}):
- Results this week: ${gameLines}
- Current top 5 in the standings: ${top5}
- Current bottom 5 in the standings: ${bottom5}
${isFinalWeek ? "- This is the final week of the regular season — playoff positioning is now locked in." : ""}

RULES:
- This is a fictional league. Never reference real-world years, leagues, teams, or people. The league calendar is simply "Year ${yearNum}".
- Cover 3-4 of the most interesting results or storylines from the week — upsets, statement wins, teams trending up or down, playoff race implications. You do not need to mention every game.
- You may invent brief reactions attributed generically ("fans in [town]") but only name coaches/players who appear in the facts above.
- 220-350 words.
- Respond ONLY with valid JSON in exactly this shape, no markdown fences, no preamble: {"headline": "...", "body": "..."}`;
}
