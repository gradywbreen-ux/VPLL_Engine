import { TEAMS, TEAM_NAMES } from "../data/rawData.js";
import { TeamLogo } from "./TeamLogo.jsx";

export function TeamCard({ role, teamName, onChange, opponentName }) {
  const t = TEAMS[teamName];
  return (
    <div className={`vpll-team-card ${role}`}>
      <div className="vpll-team-name-row">
        <TeamLogo teamName={teamName} size={40} />
        <span className="vpll-role-tag">{role === "home" ? "Home" : "Away"}</span>
      </div>
      <select className="vpll-select" value={teamName} onChange={(e) => onChange(e.target.value)}>
        {TEAM_NAMES.filter((n) => n !== opponentName).map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <div className="vpll-team-meta">
        <span>{t.conf === "Lake" ? "Lakeshore" : "Mountainside"} · {t.div}</span>
      </div>
      <span className="vpll-tag-pill">{t.tag}</span>
    </div>
  );
}
