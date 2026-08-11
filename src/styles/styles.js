/* ============================================================
   DESIGN TOKENS
   ============================================================ */
export const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@400;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap');

.vpll-root {
  --paper: #E4DFCE;
  --paper-dim: #DAD4C0;
  --ink: #16241C;
  --ink-soft: #3A4A3E;
  --forest: #1F4430;
  --forest-soft: #2C5A3F;
  --lake: #23576B;
  --lake-soft: #316E85;
  --maple: #C6871F;
  --maple-soft: #E0A542;
  --barn: #8E3B2E;
  --line: rgba(22,36,28,0.16);
  --white: #FAF8F1;
  font-family: 'Lora', Georgia, serif;
  color: var(--ink);
  background: var(--paper);
  min-height: 100%;
  position: relative;
}
.vpll-root * { box-sizing: border-box; }

.vpll-mesh-bg {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.05;
  background-image:
    repeating-linear-gradient(45deg, var(--ink) 0, var(--ink) 1px, transparent 1px, transparent 16px),
    repeating-linear-gradient(-45deg, var(--ink) 0, var(--ink) 1px, transparent 1px, transparent 16px);
}

.vpll-shell { position: relative; max-width: 1100px; margin: 0 auto; padding: 20px 20px 60px; }

/* ---------- Masthead ---------- */
.vpll-masthead {
  border-bottom: 3px solid var(--ink);
  padding-bottom: 14px;
  margin-bottom: 18px;
}
.vpll-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink-soft); margin-bottom: 4px;
}
.vpll-title-row { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.vpll-title {
  font-family: 'Zilla Slab', Georgia, serif; font-weight: 700;
  font-size: clamp(28px, 5vw, 44px); letter-spacing: -0.01em; margin: 0; color: var(--ink);
}
.vpll-title .accent { color: var(--forest); }
.vpll-scoreboard-tag {
  font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.1em;
  background: var(--ink); color: var(--paper); padding: 5px 10px; border-radius: 2px;
}

/* ---------- Tabs ---------- */
.vpll-tabs { display: flex; gap: 2px; margin-bottom: 22px; border-bottom: 1px solid var(--line); }
.vpll-tab {
  font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 10px 18px; cursor: pointer; background: none; border: none; color: var(--ink-soft);
  border-bottom: 3px solid transparent; transition: color 0.15s ease, border-color 0.15s ease;
}
.vpll-tab:hover { color: var(--ink); }
.vpll-tab.active { color: var(--ink); border-bottom-color: var(--maple); font-weight: 700; }
.vpll-tab:focus-visible { outline: 2px solid var(--lake); outline-offset: 2px; }

/* ---------- Section headers ---------- */
.vpll-section-label {
  font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--forest); margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;
}
.vpll-section-label::after { content: ''; flex: 1; height: 1px; background: var(--line); }
.vpll-h2 { font-family: 'Zilla Slab', Georgia, serif; font-weight: 700; font-size: 22px; margin: 0 0 12px 0; }

/* ---------- Matchup builder ---------- */
.vpll-matchup-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: stretch; margin-bottom: 18px; }
@media (max-width: 720px) { .vpll-matchup-grid { grid-template-columns: 1fr; } .vpll-vs-divider { display: none; } }

.vpll-team-card {
  background: var(--white); border: 1px solid var(--line); border-radius: 3px; padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.vpll-team-card.home { border-left: 4px solid var(--forest); }
.vpll-team-card.away { border-left: 4px solid var(--lake); }

.vpll-role-tag {
  font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-soft);
}
.vpll-select {
  font-family: 'Lora', serif; font-size: 16px; font-weight: 600; padding: 8px 10px;
  border: 1px solid var(--line); border-radius: 2px; background: var(--paper); color: var(--ink);
  width: 100%; cursor: pointer;
}
.vpll-select:focus-visible { outline: 2px solid var(--lake); outline-offset: 1px; }

.vpll-team-meta { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-soft); display: flex; gap: 10px; flex-wrap: wrap; }
.vpll-tag-pill {
  display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px;
  background: rgba(31,68,48,0.12); color: var(--forest); font-weight: 600;
}

.vpll-bar-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.vpll-bar-label { width: 66px; flex-shrink: 0; font-family: 'JetBrains Mono', monospace; color: var(--ink-soft); font-size: 10px; text-transform: uppercase; }
.vpll-bar-track { flex: 1; height: 7px; background: var(--paper-dim); border-radius: 4px; overflow: hidden; }
.vpll-bar-fill { height: 100%; border-radius: 4px; }
.vpll-bar-fill.home { background: var(--forest); }
.vpll-bar-fill.away { background: var(--lake); }
.vpll-bar-val { font-family: 'JetBrains Mono', monospace; font-size: 11px; width: 22px; text-align: right; color: var(--ink-soft); }

.vpll-vs-divider {
  display: flex; align-items: center; justify-content: center;
  font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 20px; color: var(--maple);
  width: 44px;
}

.vpll-controls-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
.vpll-toggle-group { display: inline-flex; border: 1px solid var(--line); border-radius: 3px; overflow: hidden; }
.vpll-toggle-btn {
  font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 7px 14px; background: var(--white);
  border: none; cursor: pointer; color: var(--ink-soft); letter-spacing: 0.05em;
}
.vpll-toggle-btn.active { background: var(--ink); color: var(--paper); }
.vpll-toggle-btn:focus-visible { outline: 2px solid var(--lake); outline-offset: -2px; }

.vpll-btn {
  font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 10px 20px; border-radius: 3px; border: none; cursor: pointer; font-weight: 700;
  background: var(--maple); color: var(--ink); transition: transform 0.1s ease, background 0.15s ease;
}
.vpll-btn:hover { background: var(--maple-soft); }
.vpll-btn:active { transform: scale(0.98); }
.vpll-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.vpll-btn.secondary { background: var(--white); color: var(--ink); border: 1px solid var(--line); }
.vpll-btn.secondary:hover { background: var(--paper-dim); }
.vpll-btn:focus-visible { outline: 2px solid var(--lake); outline-offset: 2px; }

/* ---------- Score reveal ---------- */
@keyframes vpll-flip-in {
  0% { transform: rotateX(90deg); opacity: 0; }
  60% { transform: rotateX(-8deg); opacity: 1; }
  100% { transform: rotateX(0deg); opacity: 1; }
}
.vpll-score-reveal { animation: vpll-flip-in 0.5s ease-out; }
@media (prefers-reduced-motion: reduce) { .vpll-score-reveal { animation: none; } }

/* ---------- Box score ---------- */
.vpll-boxscore {
  background: var(--white); border: 1px solid var(--line); border-radius: 3px; overflow: hidden; margin-bottom: 20px;
}
.vpll-boxscore-header {
  background: var(--ink); color: var(--paper); padding: 18px 20px; display: flex; align-items: center; justify-content: center; gap: 24px;
}
.vpll-bs-team { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
.vpll-bs-team-name { font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 15px; text-align: center; }
.vpll-bs-score { font-family: 'JetBrains Mono', monospace; font-size: 42px; font-weight: 700; line-height: 1; }
.vpll-bs-score.winner { color: var(--maple-soft); }
.vpll-bs-ot-badge {
  font-family: 'JetBrains Mono', monospace; font-size: 10px; background: var(--barn); color: var(--white);
  padding: 3px 8px; border-radius: 10px; letter-spacing: 0.08em;
}

.vpll-bs-body { padding: 18px 20px; }
.vpll-scoring-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
@media (max-width: 640px) { .vpll-scoring-summary { grid-template-columns: 1fr; } }
.vpll-goal-list { list-style: none; margin: 0; padding: 0; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; }
.vpll-goal-item { padding: 6px 0; border-bottom: 1px dashed var(--line); display: flex; justify-content: space-between; gap: 8px; }
.vpll-goal-item:last-child { border-bottom: none; }
.vpll-goal-scorer { color: var(--ink); }
.vpll-goal-assist { color: var(--ink-soft); font-size: 11px; }
.vpll-2pt-badge { color: var(--maple); font-weight: 700; }

.vpll-note-row { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--barn); margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
.vpll-note-row.fatigue { color: var(--lake-soft); }

/* ---------- History log ---------- */
.vpll-history-list { display: flex; flex-direction: column; gap: 6px; }
.vpll-history-item {
  display: flex; justify-content: space-between; align-items: center; padding: 10px 14px;
  background: var(--white); border: 1px solid var(--line); border-radius: 3px;
  font-family: 'JetBrains Mono', monospace; font-size: 12.5px;
}
.vpll-history-score { font-weight: 700; }

/* ---------- Standings ---------- */
.vpll-standings-table { width: 100%; border-collapse: collapse; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; }
.vpll-standings-table th {
  text-align: left; padding: 8px 10px; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-soft); border-bottom: 2px solid var(--ink); font-weight: 700;
}
.vpll-standings-table td { padding: 7px 10px; border-bottom: 1px solid var(--line); }
.vpll-standings-table tr:nth-child(even) { background: rgba(22,36,28,0.03); }
.vpll-standings-table .num { text-align: right; }
.vpll-standings-table .cup-col { color: var(--maple); font-weight: 700; }
.vpll-div-header { font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 15px; margin: 22px 0 8px 0; color: var(--forest); }
.vpll-div-header:first-child { margin-top: 0; }

/* ---------- Empty / info states ---------- */
.vpll-empty {
  padding: 40px 20px; text-align: center; color: var(--ink-soft); font-family: 'Lora', serif; font-style: italic;
  border: 1px dashed var(--line); border-radius: 4px; background: var(--white);
}
.vpll-info-banner {
  background: rgba(198,135,31,0.12); border: 1px solid rgba(198,135,31,0.3); border-radius: 3px;
  padding: 10px 14px; font-size: 12.5px; margin-bottom: 16px; font-family: 'JetBrains Mono', monospace;
  color: var(--ink-soft);
}

.vpll-season-progress { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.vpll-progress-track { flex: 1; min-width: 160px; height: 8px; background: var(--paper-dim); border-radius: 4px; overflow: hidden; }
.vpll-progress-fill { height: 100%; background: var(--forest); border-radius: 4px; transition: width 0.3s ease; }
.vpll-progress-label { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--ink-soft); white-space: nowrap; }

.vpll-week-block { margin-bottom: 14px; }
.vpll-week-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--forest); font-weight: 700; margin-bottom: 6px; letter-spacing: 0.06em; }
.vpll-game-row {
  display: flex; justify-content: space-between; align-items: center; padding: 7px 12px;
  background: var(--white); border: 1px solid var(--line); border-radius: 2px; margin-bottom: 4px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
}
.vpll-game-row .matchup { color: var(--ink); }
.vpll-game-row .played { color: var(--ink-soft); font-weight: 700; }

.vpll-champion-banner {
  background: linear-gradient(135deg, var(--ink) 0%, var(--forest) 100%);
  border-radius: 4px; padding: 22px 24px; margin-bottom: 22px;
  display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;
}
.vpll-champion-label {
  font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--maple-soft);
}
.vpll-champion-name {
  font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 28px; color: var(--white);
}

/* ---------- Press Box articles ---------- */
.vpll-article {
  background: var(--white); border: 1px solid var(--line); border-top: 4px solid var(--maple);
  border-radius: 3px; padding: 24px 26px; margin-bottom: 18px;
}
.vpll-article-outlet {
  font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--barn); margin-bottom: 8px;
}
.vpll-article-headline {
  font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 24px; line-height: 1.2;
  color: var(--ink); margin: 0 0 6px 0;
}
.vpll-article-meta {
  font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-soft);
  padding-bottom: 12px; border-bottom: 1px solid var(--line); margin-bottom: 14px;
}
.vpll-article-body {
  font-family: 'Lora', serif; font-size: 15px; line-height: 1.65; color: var(--ink);
  white-space: pre-wrap;
}
.vpll-article-body::first-letter {
  font-family: 'Zilla Slab', serif; font-size: 2.6em; font-weight: 700; float: left;
  line-height: 0.85; padding-right: 8px; color: var(--forest);
}
.vpll-press-error {
  background: rgba(142,59,46,0.1); border: 1px solid rgba(142,59,46,0.35); border-radius: 3px;
  padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--barn); margin-bottom: 14px;
}
`;
