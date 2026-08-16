import { teamLogoUrl } from "../data/teamLogos.js";

// Deterministic per-team accent so placeholder crests aren't all identical.
const PLACEHOLDER_COLORS = ["var(--forest)", "var(--lake)", "var(--maple)", "var(--barn)"];
function placeholderColor(teamName) {
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) hash = (hash * 31 + teamName.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
}
// Team names are "[Town] [Mascot]" — the mascot's first letter reads as a
// small crest a lot better than the town's.
function initialFor(teamName) {
  const words = teamName.trim().split(/\s+/);
  return words[words.length - 1][0].toUpperCase();
}

// Renders a team's logo if one has been supplied yet (src/assets/logos/),
// otherwise a small lettered crest in the team's placeholder color — so a
// team without art yet reads as "not drawn yet," not as a layout bug.
export function TeamLogo({ teamName, size = 28, className = "" }) {
  const url = teamLogoUrl(teamName);
  if (url) {
    return (
      <img
        src={url}
        alt={`${teamName} logo`}
        className={`vpll-team-logo ${className}`}
        style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
      />
    );
  }
  return (
    <span
      className={`vpll-team-logo-placeholder ${className}`}
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: placeholderColor(teamName), color: "var(--paper)",
        fontFamily: "'Zilla Slab', serif", fontWeight: 700, fontSize: size * 0.5, lineHeight: 1,
      }}
    >
      {initialFor(teamName)}
    </span>
  );
}
