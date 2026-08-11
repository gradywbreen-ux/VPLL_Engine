export function RatingBar({ label, homeVal, awayVal, max = 10 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", alignItems: "center", gap: 8, marginBottom: 5 }}>
      <span className="vpll-bar-label">{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="vpll-bar-val">{homeVal}</span>
        <div className="vpll-bar-track"><div className="vpll-bar-fill home" style={{ width: `${(homeVal / max) * 100}%` }} /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div className="vpll-bar-track"><div className="vpll-bar-fill away" style={{ width: `${(awayVal / max) * 100}%`, marginLeft: "auto" }} /></div>
        <span className="vpll-bar-val">{awayVal}</span>
      </div>
    </div>
  );
}
