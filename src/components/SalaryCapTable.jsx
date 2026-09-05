import { TEAM_NAMES, PLAYERS_RAW } from "../data/rawData.js";
import { SALARY_CAP, teamPayroll, capFine } from "../engine/contracts.js";
import { formatMoney } from "../engine/mathHelpers.js";
import { TeamLogo } from "./TeamLogo.jsx";

// Every payroll number here is computed fresh from the live TEAM_NAMES/PLAYERS_RAW
// singletons on every render — never a stored or frozen snapshot — so this table is
// accurate the instant any roster-mutating step runs (Draft, Free Agency, Trades, the
// Manual Trade Override, or the Commissioner's manual cut/sign). That's the opposite
// of the "second gotcha" CLAUDE.md warns about for awards/box scores: there, reading
// live data mid-offseason was the bug, because awards need to describe a *finished*
// season. Payroll has no such finished moment to freeze — it should always describe
// the roster as it stands right now, so live-reading is correct here, not a shortcut.
export function SalaryCapTable({ highlightTeam } = {}) {
  const rows = TEAM_NAMES
    .map((t) => ({ t, payroll: teamPayroll(t), roster: PLAYERS_RAW[t].length }))
    .sort((a, b) => b.payroll - a.payroll);

  return (
    <table className="vpll-standings-table">
      <thead>
        <tr><th>Team</th><th className="num">Roster</th><th className="num">Payroll</th><th className="num">% of Cap</th><th className="num">Fine</th></tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const fine = capFine(row.payroll);
          const pct = (row.payroll / SALARY_CAP) * 100;
          const over = row.payroll > SALARY_CAP;
          return (
            <tr key={row.t} style={row.t === highlightTeam ? { background: "rgba(198,135,31,0.12)" } : undefined}>
              <td><div className="vpll-team-name-row"><TeamLogo teamName={row.t} size={20} />{row.t}</div></td>
              <td className="num">{row.roster}</td>
              <td className="num">{formatMoney(row.payroll)}</td>
              <td className="num">
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                  <div className="vpll-progress-track" style={{ minWidth: 50, maxWidth: 80 }}>
                    <div className="vpll-progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: over ? "var(--barn)" : "var(--forest)" }} />
                  </div>
                  <span>{pct.toFixed(1)}%</span>
                </div>
              </td>
              <td className="num cup-col">{fine > 0 ? formatMoney(fine) : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
