export function BoxScore({ result }) {
  if (!result) return null;
  const { homeTeam, awayTeam, homeScore, awayScore, ot, homeGoals, awayGoals, homeInjury, awayInjury, homeFatigued, awayFatigued } = result;
  const homeWon = homeScore > awayScore;
  return (
    <div className="vpll-boxscore vpll-score-reveal">
      <div className="vpll-boxscore-header">
        <div className="vpll-bs-team">
          <span className="vpll-bs-team-name">{homeTeam}</span>
          <span className={`vpll-bs-score ${homeWon ? "winner" : ""}`}>{homeScore}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, opacity: 0.7 }}>FINAL</span>
          {ot && <span className="vpll-bs-ot-badge">OT{ot.periods > 1 ? ` (${ot.periods})` : ""}</span>}
        </div>
        <div className="vpll-bs-team">
          <span className="vpll-bs-team-name">{awayTeam}</span>
          <span className={`vpll-bs-score ${!homeWon ? "winner" : ""}`}>{awayScore}</span>
        </div>
      </div>
      <div className="vpll-bs-body">
        <div className="vpll-scoring-summary">
          <div>
            <div className="vpll-section-label">{homeTeam} Scoring</div>
            <ul className="vpll-goal-list">
              {homeGoals.map((g, i) => (
                <li key={i} className="vpll-goal-item">
                  <span className="vpll-goal-scorer">{g.scorer} {g.twoPoint && <span className="vpll-2pt-badge">2PT</span>}</span>
                  {g.assist && <span className="vpll-goal-assist">ast. {g.assist}</span>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="vpll-section-label">{awayTeam} Scoring</div>
            <ul className="vpll-goal-list">
              {awayGoals.map((g, i) => (
                <li key={i} className="vpll-goal-item">
                  <span className="vpll-goal-scorer">{g.scorer} {g.twoPoint && <span className="vpll-2pt-badge">2PT</span>}</span>
                  {g.assist && <span className="vpll-goal-assist">ast. {g.assist}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {(homeInjury || awayInjury) && (
          <div className="vpll-note-row">
            {homeInjury && <div>⚠ {homeTeam}: a player left the game with what's being called a {homeInjury.toLowerCase()} injury.</div>}
            {awayInjury && <div>⚠ {awayTeam}: a player left the game with what's being called a {awayInjury.toLowerCase()} injury.</div>}
          </div>
        )}
        {(homeFatigued || awayFatigued) && (
          <div className="vpll-note-row fatigue">
            {homeFatigued && <div>◐ {homeTeam} played on short rest — second game of the week.</div>}
            {awayFatigued && <div>◐ {awayTeam} played on short rest — second game of the week.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
