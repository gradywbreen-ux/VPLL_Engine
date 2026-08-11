import { BoxScore } from "./BoxScore.jsx";

export function PlayoffRound({ title, games, roundKey, seasonType, expandedGameKey, onGameClick, boxScoreFor }) {
  if (!games || !games.length) return null;
  return (
    <div className="vpll-week-block">
      <div className="vpll-week-label">{title}</div>
      {games.map((g) => {
        const gameKey = `p-${seasonType}-${roundKey}-${g.id}`;
        const isExpanded = expandedGameKey === gameKey;
        return (
          <div key={g.id}>
            <div
              className="vpll-game-row"
              onClick={() => g.result && onGameClick && onGameClick(seasonType, roundKey, g)}
              style={g.result ? { cursor: "pointer" } : {}}
              title={g.result ? "Click for box score" : ""}
            >
              <span className="matchup">
                {g.home} vs {g.away}
                {g.region && <span style={{ opacity: 0.55 }}> · {g.region.split("|")[1]}</span>}
                {g.conference && <span style={{ opacity: 0.55 }}> · {g.conference === "Lake" ? "Lakeshore" : "Mountainside"}</span>}
              </span>
              <span className="played">
                {g.result ? `${g.result.homeScore}–${g.result.awayScore}${g.result.ot ? " OT" : ""} → ${g.winner} ${isExpanded ? "▾" : "▸"}` : "—"}
              </span>
            </div>
            {isExpanded && g.result && g.result.homeGoals && boxScoreFor && (
              <div style={{ margin: "6px 0 12px" }}>
                <BoxScore result={boxScoreFor(g)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
