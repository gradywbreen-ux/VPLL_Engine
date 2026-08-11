import { standingsForGroup } from "../engine/standings.js";

export function StandingsTable({ table, teamList }) {
  const rows = standingsForGroup(table, teamList);
  const hasPlayoffBonus = rows.some((r) => r.playoffBonus > 0);
  return (
    <table className="vpll-standings-table">
      <thead>
        <tr>
          <th>Team</th><th className="num">W</th><th className="num">L</th><th className="num">OTL</th>
          <th className="num">CUP&nbsp;PTS</th>
          {hasPlayoffBonus && <th className="num">PO&nbsp;BONUS</th>}
          <th className="num">GF</th><th className="num">GA</th><th className="num">DIFF</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.team}>
            <td>{r.team}</td>
            <td className="num">{r.w}</td>
            <td className="num">{r.l}</td>
            <td className="num">{r.otl}</td>
            <td className="num cup-col">{r.points}</td>
            {hasPlayoffBonus && <td className="num cup-col">{r.playoffBonus > 0 ? `+${r.playoffBonus}` : "—"}</td>}
            <td className="num">{r.gf}</td>
            <td className="num">{r.ga}</td>
            <td className="num">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
