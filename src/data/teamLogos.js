/* ============================================================
   TEAM LOGOS
   32 team names map deterministically to a lowercase-hyphenated slug
   ("Fair Haven Tycoons" -> "fair-haven-tycoons"), which is also the
   filename convention for anything dropped in src/assets/logos/. Not every
   team has art yet — teamLogoUrl() returns undefined for a team without a
   file, and callers (TeamLogo.jsx) are expected to render nothing rather
   than a broken image. As more logos land in src/assets/logos/, they pick
   up automatically — nothing else needs to change.
   ============================================================ */

// Vite-only: resolves every PNG under src/assets/logos/ at build time into
// a { "/absolute/module/path.png": "<resolved-asset-url>" } map. No network
// request or 404 is ever attempted for a team that doesn't have a file yet.
const LOGO_MODULES = import.meta.glob("/src/assets/logos/*.png", { eager: true, import: "default" });

const LOGO_URLS_BY_SLUG = {};
for (const [path, url] of Object.entries(LOGO_MODULES)) {
  const slug = path.split("/").pop().replace(/\.png$/, "");
  LOGO_URLS_BY_SLUG[slug] = url;
}

export function teamLogoSlug(teamName) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function teamLogoUrl(teamName) {
  return LOGO_URLS_BY_SLUG[teamLogoSlug(teamName)];
}

export function hasTeamLogo(teamName) {
  return teamLogoSlug(teamName) in LOGO_URLS_BY_SLUG;
}
