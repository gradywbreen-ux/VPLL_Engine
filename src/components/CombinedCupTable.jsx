import { TeamLogo } from "./TeamLogo.jsx";

export function CombinedCupTable({ table, teamList }) {
  const rows = teamList
    .map((name) => table[name])
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  return (
    <table className="vpll-standings-table">
      <thead>
        <tr>
          <th>Team</th><th className="num">W</th><th className="num">L</th>
          <th className="num">Corkum&nbsp;Pts</th><th className="num">Culkin&nbsp;Pts</th>
          <th className="num">Total&nbsp;Cup&nbsp;Pts</th><th className="num">DIFF</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.team}>
            <td><div className="vpll-team-name-row"><TeamLogo teamName={r.team} size={20} />{r.team}</div></td>
            <td className="num">{r.w}</td>
            <td className="num">{r.l}</td>
            <td className="num">{r.corkumTotal}</td>
            <td className="num">{r.culkinTotal > 0 ? r.culkinTotal : "—"}</td>
            <td className="num cup-col">{r.points}</td>
            <td className="num">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
