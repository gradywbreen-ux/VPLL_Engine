import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import {
  TEAMS, PLAYERS_RAW, COACHES, TEAM_NAMES, POS_NAME, PLAYER_POOL, CAREER_STATS,
} from "./data/rawData.js";
import { migrateLSMIfNeeded } from "./data/migrations.js";
import { resetLeagueDataToYear1 } from "./data/reset.js";
import { formatMoney, rand } from "./engine/mathHelpers.js";
import { SALARY_CAP, CONTRACT_TYPES, assignNewContract, teamPayroll, capFine, bootstrapContractsIfNeeded } from "./engine/contracts.js";
import { simulateGame } from "./engine/simulation.js";
import { attributeGoals, computeGameBoxScore } from "./engine/boxScore.js";
import { accumulateGameStats, subtractSeasonFromCareer, topByStat } from "./engine/playerStats.js";
import { BY_DIVISION, generateFullSchedule } from "./engine/schedule.js";
import { executeTrade, runTradeEngine } from "./engine/trades.js";
import { computeStandings } from "./engine/standings.js";
import {
  initPlayoffs, simulateWildcardRound, simulateRegionalSemisRound,
  simulateRegionalFinalRound, simulateConferenceFinalRound, simulateTrophyFinalSeries,
} from "./engine/playoffs.js";
import { applyLeagueProgression } from "./engine/progression.js";
import { buildDraftOrder, generateProspect } from "./engine/draft.js";
import {
  cutRosterToSize, ensureFloorBeforeRemoval, maintainPlayerPool,
  DRAFT_ROSTER_CAP, SEASON_ROSTER_CAP, MIN_ROSTER_SIZE,
} from "./engine/roster.js";
import { evaluateFiring, generateFreshCoach } from "./engine/coaching.js";
import { evaluateRetirement } from "./engine/retirement.js";
import { runFreeAgency, FREE_AGENT_TIER_NAMES } from "./engine/freeAgency.js";
import { computeSeasonAwards, computeDavidsonAward } from "./engine/awards.js";
import { assignHometown, bootstrapHometownsIfNeeded } from "./engine/hometown.js";
import { mintPlayerId, bootstrapPlayerIdsIfNeeded } from "./engine/playerId.js";
import { computeAllDeactivations } from "./engine/deactivation.js";
import { buildTeamContext, buildRecapPrompt, buildHotStovePrompt, buildWeekInReviewPrompt } from "./pressbox/prompts.js";
import { fetchArticle } from "./pressbox/api.js";
import { STYLES } from "./styles/styles.js";
import { storage } from "./storage.js";
import { buildLeagueSaveExport, validateLeagueSave, applyLeagueSave } from "./saveTransfer.js";
import leagueIconUrl from "./assets/logo/vpll-league-icon.png";

import { RatingBar } from "./components/RatingBar.jsx";
import { TeamCard } from "./components/TeamCard.jsx";
import { BoxScore } from "./components/BoxScore.jsx";
import { PlayoffRound } from "./components/PlayoffRound.jsx";
import { StandingsTable } from "./components/StandingsTable.jsx";
import { Article } from "./components/Article.jsx";
import { CombinedCupTable } from "./components/CombinedCupTable.jsx";
import { TeamLogo } from "./components/TeamLogo.jsx";

export default function VPLLSimulator() {
  const [activeTab, setActiveTab] = useState("exhibition");
  const [homeTeam, setHomeTeam] = useState("Charlotte Navigators");
  const [awayTeam, setAwayTeam] = useState("Jay StormKings");
  const [isIndoor, setIsIndoor] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [seasons, setSeasons] = useState({ corkum: null, culkin: null }); // each: { schedule, results, playoffs }
  const [activeSeasonType, setActiveSeasonType] = useState("corkum"); // controls Season/Playoffs tab focus
  const [seasonBusy, setSeasonBusy] = useState(false);
  // Names of players drafted last offseason, now playing their true rookie season — set once
  // by beginYear2 (before offseason.draft gets reset to null) so awards.js's Rookie of the
  // Year / All-Rookie Team have a real, explicit signal instead of inferring "rookie" from
  // contract-year arithmetic. Declared early (not alongside the rest of the offseason state
  // below) because advancePlayoffRound's useCallback dependency array references it, and a
  // dependency array is evaluated immediately during render — referencing a not-yet-declared
  // const anywhere above its own declaration throws a real ReferenceError, not just a stale
  // closure risk.
  const [currentRookies, setCurrentRookies] = useState([]);
  const [playoffBusy, setPlayoffBusy] = useState(false);
  const [expandedGameKey, setExpandedGameKey] = useState(null); // composite key: s-{seasonType}-{gameId} or p-{seasonType}-{round}-{gameId}
  const [loaded, setLoaded] = useState(false);
  const [standingsView, setStandingsView] = useState("combined"); // 'combined' | 'cup' | 'culkin' | 'division'
  const [divisionSeason, setDivisionSeason] = useState("corkum"); // which season the By Division view shows
  const [statsSeasonType, setStatsSeasonType] = useState("corkum"); // which season's leaderboard the Stats tab shows
  const [statsScope, setStatsScope] = useState("season"); // 'season' | 'career'
  const [statsCategory, setStatsCategory] = useState("pts");

  /* ---------- Load persisted state ---------- */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const hist = await storage.get("vpll-game-history");
        if (!cancelled && hist) setGameHistory(JSON.parse(hist.value));
      } catch (e) { /* no history yet */ }

      // Restore any offseason mutations to team ratings/coaches/rosters from prior sessions
      try {
        const leagueData = await storage.get("vpll-league-data-state");
        if (!cancelled && leagueData) {
          const saved = JSON.parse(leagueData.value);
          if (saved.teams) Object.assign(TEAMS, saved.teams);
          if (saved.coaches) Object.assign(COACHES, saved.coaches);
          if (saved.players) Object.assign(PLAYERS_RAW, saved.players);
          if (saved.playerPool) { PLAYER_POOL.length = 0; PLAYER_POOL.push(...saved.playerPool); }
          if (saved.careerStats) Object.assign(CAREER_STATS, saved.careerStats);
        }
      } catch (e) { /* no league data mutations yet — using embedded Year 1 defaults */ }

      bootstrapContractsIfNeeded(); // no-op for anyone whose save already has contracts assigned
      migrateLSMIfNeeded(); // no-op for anyone whose save already has the position
      bootstrapHometownsIfNeeded(); // no-op for anyone whose save already has hometowns assigned
      bootstrapPlayerIdsIfNeeded(); // no-op for anyone whose save already has stable player ids

      try {
        const meta = await storage.get("vpll-meta-state");
        if (!cancelled && meta) {
          const parsed = JSON.parse(meta.value);
          if (parsed.yearNumber) setYearNumber(parsed.yearNumber);
          if (parsed.yearHistory) setYearHistory(parsed.yearHistory);
          if (parsed.currentRookies) setCurrentRookies(parsed.currentRookies);
        }
      } catch (e) { /* first time playing — Year 1, no history yet */ }

      let seasonsLoaded = false;
      try {
        const s = await storage.get("vpll-year1-state");
        if (!cancelled && s) { setSeasons(JSON.parse(s.value)); seasonsLoaded = true; }
      } catch (e) { /* no year state yet */ }

      if (!seasonsLoaded) {
        // migrate legacy single-season save (pre-Culkin) into the new corkum slot
        try {
          const legacy = await storage.get("vpll-season-state");
          if (!cancelled && legacy) {
            const migrated = { corkum: JSON.parse(legacy.value), culkin: null };
            setSeasons(migrated);
            await storage.set("vpll-year1-state", JSON.stringify(migrated));
          }
        } catch (e) { /* nothing to migrate */ }
      }
      if (!cancelled) setLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  /* ---------- Exhibition ---------- */
  const runExhibition = useCallback(async () => {
    setSimulating(true);
    await new Promise((r) => setTimeout(r, 380)); // brief beat for the flip-reveal
    const raw = simulateGame(homeTeam, awayTeam, isIndoor);
    const homeGoals = attributeGoals(homeTeam, raw.homeScore, raw.homeTwoPointGoal);
    const awayGoals = attributeGoals(awayTeam, raw.awayScore, raw.awayTwoPointGoal);
    const result = { ...raw, homeGoals, awayGoals, timestamp: Date.now() };
    setLastResult(result);
    setSimulating(false);

    const historyEntry = {
      homeTeam, awayTeam, homeScore: raw.homeScore, awayScore: raw.awayScore,
      ot: !!raw.ot, isIndoor, timestamp: Date.now(),
    };
    const newHistory = [historyEntry, ...gameHistory].slice(0, 50);
    setGameHistory(newHistory);
    try { await storage.set("vpll-game-history", JSON.stringify(newHistory)); } catch (e) { /* best-effort persistence — in-memory state above already updated regardless */ }
  }, [homeTeam, awayTeam, isIndoor, gameHistory]);

  /* ---------- Season (generic across Corkum / Culkin) ---------- */
  const persistSeasons = useCallback(async (newSeasons) => {
    setSeasons(newSeasons);
    try { await storage.set("vpll-year1-state", JSON.stringify(newSeasons)); } catch (e) { /* best-effort persistence — in-memory state above already updated regardless */ }
  }, []);

  const corkumChampion = seasons.corkum?.playoffs?.champion || null;
  const culkinUnlocked = !!corkumChampion; // Culkin training camp opens after the Corkum Trophy Final concludes

  const startNewSeason = useCallback(async (seasonType) => {
    if (seasonType === "culkin" && !culkinUnlocked) return;
    const schedule = generateFullSchedule();
    // Deactivation Lists (Master File 9.8) — decided once, right as the season opens.
    const deactivated = computeAllDeactivations(seasonType === "culkin");
    const newSeasonObj = { schedule, results: {}, playoffs: null, deactivated, playerStats: {} };
    await persistSeasons({ ...seasons, [seasonType]: newSeasonObj });
  }, [seasons, persistSeasons, culkinUnlocked]);

  function currentWeekToPlay(seasonType) {
    const season = seasons[seasonType];
    if (!season) return null;
    const weeksWithUnplayed = season.schedule.filter((g) => !season.results[g.id]).map((g) => g.week);
    return weeksWithUnplayed.length ? Math.min(...weeksWithUnplayed) : null;
  }

  const simulateWeek = useCallback(async (seasonType, weekNum) => {
    const season = seasons[seasonType];
    if (!season) return;
    setSeasonBusy(true);
    await new Promise((r) => setTimeout(r, 200));
    const isIndoorSeason = seasonType === "culkin";
    const weekGames = season.schedule.filter((g) => g.week === weekNum);
    const gamesPlayedThisWeek = {};
    const newResults = { ...season.results };
    const newPlayerStats = { ...(season.playerStats || {}) };
    for (const g of weekGames) {
      const homeFatigued = (gamesPlayedThisWeek[g.home] || 0) >= 1;
      const awayFatigued = (gamesPlayedThisWeek[g.away] || 0) >= 1;
      const res = simulateGame(g.home, g.away, isIndoorSeason, homeFatigued, awayFatigued);
      // Box score attribution happens right here, once, for every game — not lazily on
      // click — so the season's individual leaderboard is guaranteed complete (see
      // src/engine/playerStats.js) and folds straight into CAREER_STATS too.
      const box = computeGameBoxScore(g.home, g.away, isIndoorSeason, res, season.deactivated);
      accumulateGameStats(newPlayerStats, box, g.home, g.away);
      newResults[g.id] = {
        homeScore: res.homeScore, awayScore: res.awayScore, ot: !!res.ot,
        homeTwoPointGoal: !!res.homeTwoPointGoal, awayTwoPointGoal: !!res.awayTwoPointGoal,
        homeGoals: box.home.goals, awayGoals: box.away.goals,
      };
      gamesPlayedThisWeek[g.home] = (gamesPlayedThisWeek[g.home] || 0) + 1;
      gamesPlayedThisWeek[g.away] = (gamesPlayedThisWeek[g.away] || 0) + 1;
    }
    const newSeasonObj = { ...season, results: newResults, playerStats: newPlayerStats };
    await persistSeasons({ ...seasons, [seasonType]: newSeasonObj });
    await persistLeagueData(); // CAREER_STATS was just mutated above
    setSeasonBusy(false);
  }, [seasons, persistSeasons]);

  const simulateFullSeason = useCallback(async (seasonType) => {
    const season = seasons[seasonType];
    if (!season) return;
    setSeasonBusy(true);
    const isIndoorSeason = seasonType === "culkin";
    let workingResults = { ...season.results };
    const workingPlayerStats = { ...(season.playerStats || {}) };
    for (let w = 1; w <= 13; w++) {
      const weekGames = season.schedule.filter((g) => g.week === w && !workingResults[g.id]);
      if (!weekGames.length) continue;
      const gamesPlayedThisWeek = {};
      for (const g of weekGames) {
        const homeFatigued = (gamesPlayedThisWeek[g.home] || 0) >= 1;
        const awayFatigued = (gamesPlayedThisWeek[g.away] || 0) >= 1;
        const res = simulateGame(g.home, g.away, isIndoorSeason, homeFatigued, awayFatigued);
        const box = computeGameBoxScore(g.home, g.away, isIndoorSeason, res, season.deactivated);
        accumulateGameStats(workingPlayerStats, box, g.home, g.away);
        workingResults[g.id] = {
          homeScore: res.homeScore, awayScore: res.awayScore, ot: !!res.ot,
          homeTwoPointGoal: !!res.homeTwoPointGoal, awayTwoPointGoal: !!res.awayTwoPointGoal,
          homeGoals: box.home.goals, awayGoals: box.away.goals,
        };
        gamesPlayedThisWeek[g.home] = (gamesPlayedThisWeek[g.home] || 0) + 1;
        gamesPlayedThisWeek[g.away] = (gamesPlayedThisWeek[g.away] || 0) + 1;
      }
    }
    const newSeasonObj = { ...season, results: workingResults, playerStats: workingPlayerStats };
    await persistSeasons({ ...seasons, [seasonType]: newSeasonObj });
    await persistLeagueData(); // CAREER_STATS was just mutated above
    setSeasonBusy(false);
  }, [seasons, persistSeasons]);

  const resetSeason = useCallback(async (seasonType) => {
    // A scrapped season's games shouldn't linger in the career record once the season
    // itself is gone — undo whatever it had already contributed to CAREER_STATS.
    if (seasons[seasonType]?.playerStats) subtractSeasonFromCareer(seasons[seasonType].playerStats);
    const updates = { ...seasons, [seasonType]: null };
    if (seasonType === "corkum") {
      if (seasons.culkin?.playerStats) subtractSeasonFromCareer(seasons.culkin.playerStats);
      updates.culkin = null; // resetting Corkum also clears the downstream Culkin season
    }
    await persistSeasons(updates);
    await persistLeagueData(); // CAREER_STATS may have just been adjusted above
  }, [seasons, persistSeasons]);

  const standingsFor = useMemo(() => {
    const out = {};
    for (const key of ["corkum", "culkin"]) {
      out[key] = seasons[key] ? computeStandings(seasons[key].schedule, seasons[key].results) : null;
    }
    return out;
  }, [seasons]);

  function gamesPlayedFor(seasonType) {
    const season = seasons[seasonType];
    return season ? Object.keys(season.results).length : 0;
  }
  function totalGamesFor(seasonType) {
    const season = seasons[seasonType];
    return season ? season.schedule.length : 0;
  }
  function seasonCompleteFor(seasonType) {
    const season = seasons[seasonType];
    return !!season && gamesPlayedFor(seasonType) === totalGamesFor(seasonType);
  }

  /* ---------- Playoffs (generic across Corkum / Culkin) ---------- */
  const generateBracket = useCallback(async (seasonType) => {
    const table = standingsFor[seasonType];
    if (!table) return;
    const season = seasons[seasonType];
    const playoffs = initPlayoffs(table, season.schedule, season.results);
    const newSeasonObj = { ...seasons[seasonType], playoffs };
    await persistSeasons({ ...seasons, [seasonType]: newSeasonObj });
  }, [seasons, standingsFor, persistSeasons]);

  const advancePlayoffRound = useCallback(async (seasonType, round) => {
    const season = seasons[seasonType];
    if (!season || !season.playoffs) return;
    setPlayoffBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const playoffs = JSON.parse(JSON.stringify(season.playoffs)); // deep clone for safe mutation
    const table = standingsFor[seasonType];
    if (round === "wildcard") simulateWildcardRound(playoffs);
    else if (round === "regionalSemis") simulateRegionalSemisRound(playoffs, table, season.schedule, season.results);
    else if (round === "regionalFinal") simulateRegionalFinalRound(playoffs, table, season.schedule, season.results);
    else if (round === "conferenceFinal") simulateConferenceFinalRound(playoffs, table, seasonType === "culkin");
    else if (round === "trophyFinal") simulateTrophyFinalSeries(playoffs);
    const newSeasonObj = { ...season, playoffs };

    // Awards are computed once, right when they become decidable, and frozen onto the
    // season object from then on — never recomputed live on every render after that.
    // computeSeasonAwards()/computeDavidsonAward() read the *current* PLAYERS_RAW/TEAMS,
    // which the Offseason tab's own steps (Draft, Free Agency, Trades, Progression) go on
    // to mutate before "Begin Year N+1" — recomputing them live would silently show
    // whatever the roster happens to look like *now* instead of what actually happened
    // in the season being awarded.
    if (round === "trophyFinal" && playoffs.champion) {
      newSeasonObj.awards = computeSeasonAwards(table, playoffs, currentRookies, season.deactivated, season.playerStats);
      // Culkin's Trophy Final always concludes after Corkum's (Culkin can't even start
      // until Corkum has a champion — see culkinUnlocked), so this is always the moment
      // both seasons' results are final and the Commissioners Cup champion — and the
      // Davidson Award — can actually be decided.
      if (seasonType === "culkin" && seasons.corkum?.playoffs) {
        const corkumTable = standingsFor.corkum;
        const corkumPlayoffs = seasons.corkum.playoffs;
        let cupChampion = null, bestPoints = -Infinity;
        for (const name of TEAM_NAMES) {
          const corkumTotal = (corkumTable?.[name]?.points || 0) + (corkumPlayoffs?.ccBonus?.[name] || 0);
          const culkinTotal = (table?.[name]?.points || 0) + (playoffs?.ccBonus?.[name] || 0);
          const points = corkumTotal + culkinTotal;
          if (points > bestPoints) { bestPoints = points; cupChampion = name; }
        }
        newSeasonObj.davidsonAward = computeDavidsonAward(cupChampion);
      }
    }

    await persistSeasons({ ...seasons, [seasonType]: newSeasonObj });
    setPlayoffBusy(false);
  }, [seasons, standingsFor, persistSeasons, currentRookies]);

  function nextPlayoffRoundFor(seasonType) {
    const season = seasons[seasonType];
    if (!season || !season.playoffs) return null;
    const p = season.playoffs;
    if (p.wildcard.some((g) => !g.winner)) return "wildcard";
    if (p.regionalSemis.some((g) => !g.winner)) return "regionalSemis";
    if (p.regionalFinal.some((g) => !g.winner)) return "regionalFinal";
    if (p.conferenceFinal.some((g) => !g.winner)) return "conferenceFinal";
    if (p.trophyFinal && !p.trophyFinal.winner) return "trophyFinal";
    return null;
  }

  /* ---------- Box scores for any played game (lazy scorer generation) ---------- */
  const toggleSeasonBoxScore = useCallback(async (seasonType, game) => {
    const key = `s-${seasonType}-${game.id}`;
    if (expandedGameKey === key) { setExpandedGameKey(null); return; }
    const season = seasons[seasonType];
    const res = season?.results?.[game.id];
    if (!res) return;
    if (!res.homeGoals) {
      // generate scorer attribution once, then persist so the box score stays consistent
      const homeGoals = attributeGoals(game.home, res.homeScore, false);
      const awayGoals = attributeGoals(game.away, res.awayScore, false);
      const newResults = { ...season.results, [game.id]: { ...res, homeGoals, awayGoals } };
      await persistSeasons({ ...seasons, [seasonType]: { ...season, results: newResults } });
    }
    setExpandedGameKey(key);
  }, [seasons, expandedGameKey, persistSeasons]);

  const togglePlayoffBoxScore = useCallback(async (seasonType, roundKey, game) => {
    const key = `p-${seasonType}-${roundKey}-${game.id}`;
    if (expandedGameKey === key) { setExpandedGameKey(null); return; }
    const season = seasons[seasonType];
    if (!season?.playoffs || !game.result) return;
    if (!game.result.homeGoals) {
      const playoffs = JSON.parse(JSON.stringify(season.playoffs));
      const target = playoffs[roundKey].find((g) => g.id === game.id);
      target.result.homeGoals = attributeGoals(game.result.home, game.result.homeScore, false);
      target.result.awayGoals = attributeGoals(game.result.away, game.result.awayScore, false);
      await persistSeasons({ ...seasons, [seasonType]: { ...season, playoffs } });
    }
    setExpandedGameKey(key);
  }, [seasons, expandedGameKey, persistSeasons]);

  function boxScoreResultFor(seasonType, game) {
    const res = seasons[seasonType]?.results?.[game.id];
    if (!res) return null;
    return {
      homeTeam: game.home, awayTeam: game.away, homeScore: res.homeScore, awayScore: res.awayScore,
      ot: res.ot ? { periods: 1 } : null, homeGoals: res.homeGoals || [], awayGoals: res.awayGoals || [],
      homeInjury: null, awayInjury: null, homeFatigued: false, awayFatigued: false,
    };
  }

  function playoffBoxScoreResultFor(game) {
    const r = game.result;
    if (!r) return null;
    return {
      homeTeam: r.home, awayTeam: r.away, homeScore: r.homeScore, awayScore: r.awayScore,
      ot: r.ot ? { periods: 1 } : null, homeGoals: r.homeGoals || [], awayGoals: r.awayGoals || [],
      homeInjury: null, awayInjury: null, homeFatigued: false, awayFatigued: false,
    };
  }

  const ROUND_LABELS = { wildcard: "Simulate Wild Card Round", regionalSemis: "Simulate Regional Semifinals",
    regionalFinal: "Simulate Regional Finals", conferenceFinal: "Simulate Conference Finals", trophyFinal: "Simulate Trophy Final (Best of 3)" };

  const TROPHY_LABEL = { corkum: "Corkum Trophy", culkin: "Culkin Trophy" };
  const SEASON_LABEL = { corkum: "Corkum (Outdoor)", culkin: "Culkin (Indoor)" };

  // Stats tab leaderboard categories. positions restricts who's eligible to lead (a
  // Face-off % or Save % leaderboard full of players who never take a face-off/start
  // in net would be meaningless); null means every position is eligible.
  const STAT_CATEGORIES = [
    { key: "pts", label: "Points", positions: null, detail: (l) => `${l.g}G, ${l.a}A` },
    { key: "g", label: "Goals", positions: null, detail: (l) => `${l.twoPt} on a 2-pointer` },
    { key: "a", label: "Assists", positions: null, detail: () => null },
    { key: "foPct", label: "Face-off %", positions: ["F"], detail: (l) => `${l.foWon}/${l.foTotal}` },
    { key: "ct", label: "Caused Turnovers", positions: ["D", "L"], detail: () => null },
    { key: "savePct", label: "Save %", positions: ["G"], detail: (l) => `${l.sv}/${l.sa}, ${l.ga} GA` },
  ];

  // Single-season standings with that season's own playoff bonus folded in (points + 2/playoff win)
  function seasonCupStandings(seasonType) {
    const table = standingsFor[seasonType];
    if (!table) return null;
    const bonus = seasons[seasonType]?.playoffs?.ccBonus || {};
    const combined = {};
    for (const name of TEAM_NAMES) {
      combined[name] = { ...table[name], points: table[name].points + (bonus[name] || 0), playoffBonus: bonus[name] || 0 };
    }
    return combined;
  }
  const cupStandings = useMemo(() => seasonCupStandings(activeSeasonType), [standingsFor, seasons, activeSeasonType]);

  // TRUE combined Commissioners Cup: Corkum total + Culkin total, across the full year
  const combinedCupStandings = useMemo(() => {
    const combined = {};
    for (const name of TEAM_NAMES) {
      const corkumTable = standingsFor.corkum;
      const culkinTable = standingsFor.culkin;
      const corkumBase = corkumTable ? corkumTable[name].points : 0;
      const corkumBonus = seasons.corkum?.playoffs?.ccBonus?.[name] || 0;
      const culkinBase = culkinTable ? culkinTable[name].points : 0;
      const culkinBonus = seasons.culkin?.playoffs?.ccBonus?.[name] || 0;
      const corkumTotal = corkumBase + corkumBonus;
      const culkinTotal = culkinBase + culkinBonus;
      combined[name] = {
        team: name, corkumTotal, culkinTotal, points: corkumTotal + culkinTotal,
        w: (corkumTable ? corkumTable[name].w : 0) + (culkinTable ? culkinTable[name].w : 0),
        l: (corkumTable ? corkumTable[name].l : 0) + (culkinTable ? culkinTable[name].l : 0),
        gf: (corkumTable ? corkumTable[name].gf : 0) + (culkinTable ? culkinTable[name].gf : 0),
        ga: (corkumTable ? corkumTable[name].ga : 0) + (culkinTable ? culkinTable[name].ga : 0),
        gd: ((corkumTable ? corkumTable[name].gd : 0) + (culkinTable ? culkinTable[name].gd : 0)),
        otl: (corkumTable ? corkumTable[name].otl : 0) + (culkinTable ? culkinTable[name].otl : 0),
      };
    }
    return combined;
  }, [standingsFor, seasons]);

  /* ---------- Offseason ---------- */
  const [yearNumber, setYearNumber] = useState(1);
  const [offseason, setOffseason] = useState({ draft: null, coaching: null, retirement: null, progression: null, freeAgency: null, trades: null });
  const [yearHistory, setYearHistory] = useState([]); // archived summaries of completed years
  const [dataVersion, setDataVersion] = useState(0); // bump to force re-render after mutating TEAMS/COACHES/PLAYERS_RAW
  const [offseasonBusy, setOffseasonBusy] = useState(false);

  const bothTrophiesDecided = !!(seasons.corkum?.playoffs?.champion && seasons.culkin?.playoffs?.champion);

  function playoffTeamSet(seasonType) {
    const p = seasons[seasonType]?.playoffs;
    const set = new Set();
    if (!p) return set;
    for (const g of p.wildcard) { set.add(g.home); set.add(g.away); }
    for (const rk of Object.keys(p.seeds)) { set.add(p.seeds[rk].div1.winner); set.add(p.seeds[rk].div2.winner); }
    return set;
  }

  async function persistOffseasonExtras(newYearNumber, newYearHistory, newCurrentRookies) {
    try {
      await storage.set("vpll-meta-state", JSON.stringify({ yearNumber: newYearNumber, yearHistory: newYearHistory, currentRookies: newCurrentRookies }));
    } catch (e) { /* best-effort persistence — in-memory state above already updated regardless */ }
  }

  async function persistLeagueData() {
    try {
      await storage.set("vpll-league-data-state", JSON.stringify({ teams: TEAMS, coaches: COACHES, players: PLAYERS_RAW, playerPool: PLAYER_POOL, careerStats: CAREER_STATS }));
    } catch (e) { /* best-effort persistence — in-memory state above already updated regardless */ }
  }

  const runDraftStep = useCallback(async () => {
    setOffseasonBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const standingsArr = Object.values(combinedCupStandings);
    const draftOrder = buildDraftOrder(standingsArr);
    const usedNames = new Set();
    for (const t of TEAM_NAMES) { PLAYERS_RAW[t].forEach((p) => usedNames.add(p[0])); COACHES[t] && usedNames.add(COACHES[t].hc); }
    for (const p of PLAYER_POOL) usedNames.add(p[0]);

    // Picks are inserted into the roster immediately, so a team's later picks in the
    // same draft reflect the needs its earlier picks just addressed.
    const results = [];
    let overallPick = 1;
    for (let round = 1; round <= 5; round++) {
      for (const team of draftOrder) {
        const pr = generateProspect(round, usedNames, team);
        results.push({ overallPick, round, team, prospect: pr });
        const leadership = Math.round(rand(30, 60));
        const balance = Math.round(rand(3, 8));
        const durability = Math.round(rand(45, 80));
        const tuple = [pr.name, pr.pos, pr.hand, pr.age, pr.overall, 0, leadership, balance, durability];
        assignNewContract(tuple, CONTRACT_TYPES.ROOKIE);
        const roundScale = [1, 0.75, 0.55, 0.4, 0.3][round - 1];
        tuple[9] = Math.round((tuple[9] * roundScale) / 500) * 500;
        tuple[12] = pr.ceiling; // development target — this is what lets a pick actually pan out (or not)
        tuple[13] = assignHometown();
        tuple[14] = mintPlayerId();
        PLAYERS_RAW[team].push(tuple);
        overallPick++;
      }
    }
    // keep rosters from ballooning indefinitely — release the weakest depth once over the
    // post-draft cap, without cutting any position below its floor
    for (const team of TEAM_NAMES) cutRosterToSize(team, DRAFT_ROSTER_CAP);

    setDataVersion((v) => v + 1);
    setOffseason((prev) => ({ ...prev, draft: { draftOrder, results } }));
    await persistLeagueData();
    setOffseasonBusy(false);
  }, [combinedCupStandings]);

  const runFreeAgencyStep = useCallback(async () => {
    setOffseasonBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const result = runFreeAgency(combinedCupStandings);
    setDataVersion((v) => v + 1);
    setOffseason((prev) => ({ ...prev, freeAgency: result }));
    await persistLeagueData();
    setOffseasonBusy(false);
  }, [combinedCupStandings]);

  const runTradesStep = useCallback(async () => {
    setOffseasonBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const trades = runTradeEngine(combinedCupStandings);
    setDataVersion((v) => v + 1);
    setOffseason((prev) => ({ ...prev, trades: { trades } }));
    await persistLeagueData();
    setOffseasonBusy(false);
  }, [combinedCupStandings]);

  /* ---------- Manual trade override ---------- */
  const [manualTeamA, setManualTeamA] = useState(TEAM_NAMES[0]);
  const [manualTeamB, setManualTeamB] = useState(TEAM_NAMES[1]);
  const [manualPlayerA, setManualPlayerA] = useState("");
  const [manualPlayerB, setManualPlayerB] = useState("");
  const [manualTradeMsg, setManualTradeMsg] = useState(null);

  const executeManualTrade = useCallback(async () => {
    const rosterA = PLAYERS_RAW[manualTeamA], rosterB = PLAYERS_RAW[manualTeamB];
    const playerA = rosterA.find((p) => p[0] === manualPlayerA);
    const playerB = rosterB.find((p) => p[0] === manualPlayerB);
    if (!playerA || !playerB) { setManualTradeMsg("Pick a player from each roster first."); return; }
    const ok = executeTrade(manualTeamA, manualTeamB, playerA, playerB);
    if (ok) {
      setManualTradeMsg(`Done — ${playerA[0]} to ${manualTeamB}, ${playerB[0]} to ${manualTeamA}.`);
      setManualPlayerA(""); setManualPlayerB("");
      setDataVersion((v) => v + 1);
      await persistLeagueData();
    } else {
      setManualTradeMsg("That trade couldn't be completed.");
    }
  }, [manualTeamA, manualTeamB, manualPlayerA, manualPlayerB]);

  const runCoachingStep = useCallback(async () => {
    setOffseasonBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const standingsArr = Object.values(combinedCupStandings).sort((a, b) => b.points - a.points);
    const corkumPlayoffTeams = playoffTeamSet("corkum");
    const culkinPlayoffTeams = playoffTeamSet("culkin");
    const usedNames = new Set();
    for (const t of TEAM_NAMES) { PLAYERS_RAW[t].forEach((p) => usedNames.add(p[0])); usedNames.add(COACHES[t].hc); }
    for (const p of PLAYER_POOL) usedNames.add(p[0]);

    const fired = [];
    standingsArr.forEach((entry, idx) => {
      const coach = COACHES[entry.team];
      const { fired: wasFired, strugglingYears } = evaluateFiring(coach, corkumPlayoffTeams.has(entry.team), culkinPlayoffTeams.has(entry.team), idx + 1, coach.hcComp);
      coach.hcStruggleYears = strugglingYears;
      if (wasFired) fired.push({ team: entry.team, oldCoach: coach.hc, oldArch: coach.hcArch, tenure: coach.hcTenure || 1 });
      else coach.hcTenure = (coach.hcTenure || 1) + 1;
    });

    const hired = [];
    for (const f of fired) {
      const newCoach = generateFreshCoach(usedNames);
      COACHES[f.team].hc = newCoach.name;
      COACHES[f.team].hcArch = newCoach.archetype;
      COACHES[f.team].hcComp = newCoach.competence;
      COACHES[f.team].hcDev = newCoach.development;
      COACHES[f.team].hcTenure = 1;
      COACHES[f.team].hcStruggleYears = 0;
      hired.push({ team: f.team, newCoach: newCoach.name, newArch: newCoach.archetype });
    }
    setDataVersion((v) => v + 1);
    setOffseason((prev) => ({ ...prev, coaching: { fired, hired } }));
    await persistLeagueData();
    setOffseasonBusy(false);
  }, [combinedCupStandings, seasons]);

  const runRetirementStep = useCallback(async () => {
    setOffseasonBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const usedNames = new Set();
    for (const t of TEAM_NAMES) { PLAYERS_RAW[t].forEach((p) => usedNames.add(p[0])); COACHES[t] && usedNames.add(COACHES[t].hc); }
    for (const p of PLAYER_POOL) usedNames.add(p[0]);

    const retirees = [], poolSignings = [];
    for (const teamName of TEAM_NAMES) {
      const roster = PLAYERS_RAW[teamName];
      for (let i = roster.length - 1; i >= 0; i--) {
        if (evaluateRetirement(roster[i])) {
          retirees.push({ team: teamName, name: roster[i][0], age: roster[i][3], pos: roster[i][1] });
          // Never let the roster dip below the floor, even for one tick — claim a
          // same-position replacement before the retiree actually leaves.
          const backfill = ensureFloorBeforeRemoval(teamName, roster[i][1], usedNames);
          if (backfill) poolSignings.push(backfill);
          roster.splice(i, 1);
        }
      }
    }
    setDataVersion((v) => v + 1);
    setOffseason((prev) => ({ ...prev, retirement: { retirees, poolSignings } }));
    await persistLeagueData();
    setOffseasonBusy(false);
  }, []);

  const runProgressionStep = useCallback(async () => {
    setOffseasonBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const { results, developments } = applyLeagueProgression(combinedCupStandings);
    setDataVersion((v) => v + 1);
    setOffseason((prev) => ({ ...prev, progression: { results, developments } }));
    await persistLeagueData();
    setOffseasonBusy(false);
  }, [combinedCupStandings]);

  const allOffseasonStepsComplete = offseason.draft && offseason.coaching && offseason.retirement && offseason.progression && offseason.freeAgency && offseason.trades;

  const beginYear2 = useCallback(async () => {
    // Training camp cuts (Master File 9.7) — the final roster-size pass of the offseason,
    // right before the new season opens. Every earlier step (draft, retirement, free agency)
    // already respects the floor; this only ever trims down to the season cap.
    let rosterCuts = 0;
    for (const team of TEAM_NAMES) rosterCuts += cutRosterToSize(team, SEASON_ROSTER_CAP).length;
    maintainPlayerPool(); // age the pool a year, retire eligible veterans out of it, trim excess

    const summary = {
      year: yearNumber,
      corkumChampion: seasons.corkum?.playoffs?.champion,
      culkinChampion: seasons.culkin?.playoffs?.champion,
      cupChampion: Object.values(combinedCupStandings).sort((a, b) => b.points - a.points)[0]?.team,
      draftFirstPick: offseason.draft?.results?.[0],
      coachesFired: offseason.coaching?.fired?.length || 0,
      retirements: offseason.retirement?.retirees?.length || 0,
      rosterCuts,
    };
    const newHistory = [...yearHistory, summary];
    const newYearNumber = yearNumber + 1;
    // This year's draft class becomes next year's true rookies — snapshot it before
    // offseason.draft gets reset to null below.
    const newRookies = (offseason.draft?.results || []).map((r) => r.prospect.name);
    setYearHistory(newHistory);
    setYearNumber(newYearNumber);
    setCurrentRookies(newRookies);
    setOffseason({ draft: null, coaching: null, retirement: null, progression: null, freeAgency: null, trades: null });
    await persistSeasons({ corkum: null, culkin: null });
    await persistOffseasonExtras(newYearNumber, newHistory, newRookies);
  }, [yearNumber, yearHistory, seasons, combinedCupStandings, offseason, persistSeasons]);

  /* ---------- Reset League to Year 1 ---------- */
  const [confirmReset, setConfirmReset] = useState(false);

  const resetLeagueToYear1 = useCallback(async () => {
    // restore every mutable team/coach/player field to the pristine Year 1 snapshot
    resetLeagueDataToYear1();

    setSeasons({ corkum: null, culkin: null });
    setYearNumber(1);
    setYearHistory([]);
    setCurrentRookies([]);
    setOffseason({ draft: null, coaching: null, retirement: null, progression: null, freeAgency: null, trades: null });
    setGameHistory([]);
    setPressArchive([]);
    setLastResult(null);
    setExhibitionArticle(null);
    setDataVersion((v) => v + 1);

    try {
      await storage.delete("vpll-league-data-state");
      await storage.delete("vpll-meta-state");
      await storage.delete("vpll-year1-state");
      await storage.delete("vpll-season-state");
      await storage.delete("vpll-game-history");
      await storage.delete("vpll-pressbox-archive");
    } catch (e) { /* keys may not exist yet, fine either way */ }
    setConfirmReset(false);
  }, []);

  /* ---------- League Save Export / Import (task #52) ----------
     Persistence is entirely localStorage-backed — losing browser storage loses the whole
     league permanently, with no way to back it up or move it to another machine. Export
     always works with no confirmation (non-destructive); import overwrites everything
     current, so it gets the same two-step confirm as Reset League to Year 1 above, plus
     upfront validation (src/saveTransfer.js) so a bad file fails with a clear message
     instead of silently corrupting storage. Applying an import reloads the page rather
     than trying to hand-resync every piece of React state (and the live TEAMS/COACHES/
     PLAYERS_RAW/PLAYER_POOL/CAREER_STATS singletons) one at a time — the existing load
     effect already knows how to build a consistent app state from storage on mount, so
     reusing that path is far less error-prone than duplicating it here. */
  const [importError, setImportError] = useState(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [pendingImport, setPendingImport] = useState(null); // validated, not-yet-applied import, awaiting confirmation
  const importFileInputRef = useRef(null);

  const exportLeagueSave = useCallback(async () => {
    const save = await buildLeagueSaveExport({ yearNumber });
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vpll-save-year${yearNumber}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [yearNumber]);

  const handleImportFileChosen = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // clears the input so choosing the same file again still fires a change event
    if (!file) return;
    setImportError(null);
    setPendingImport(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = validateLeagueSave(parsed);
      if (!result.ok) { setImportError(result.error); return; }
      setPendingImport(parsed);
      setConfirmImport(true);
    } catch (err) {
      setImportError(`Couldn't read that file: ${err.message}`);
    }
  }, []);

  const confirmImportLeagueSave = useCallback(async () => {
    if (!pendingImport) return;
    await applyLeagueSave(pendingImport);
    window.location.reload(); // simplest way to get every piece of state to match the new storage contents
  }, [pendingImport]);

  const cancelImportLeagueSave = useCallback(() => {
    setConfirmImport(false);
    setPendingImport(null);
  }, []);

  /* ---------- Press Box (Phase 5: narrative layer) ---------- */
  const [pressArchive, setPressArchive] = useState([]);
  const [pressOutlet, setPressOutlet] = useState("VPLL.com");
  const [pressSelection, setPressSelection] = useState("");
  const [pressGenerating, setPressGenerating] = useState(false);
  const [pressError, setPressError] = useState(null);
  const [exhibitionOutlet, setExhibitionOutlet] = useState("VPLL.com");
  const [exhibitionArticle, setExhibitionArticle] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const a = await storage.get("vpll-pressbox-archive");
        if (!cancelled && a) setPressArchive(JSON.parse(a.value));
      } catch (e) { /* no archive yet */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveToArchive = useCallback(async (article) => {
    const newArchive = [article, ...pressArchive].slice(0, 30);
    setPressArchive(newArchive);
    try { await storage.set("vpll-pressbox-archive", JSON.stringify(newArchive)); } catch (e) { /* best-effort persistence — in-memory state above already updated regardless */ }
  }, [pressArchive]);

  // Build the list of recap-able games: all played season + playoff games across both seasons
  const pressGameOptions = useMemo(() => {
    const groups = [];
    for (const seasonType of ["corkum", "culkin"]) {
      const season = seasons[seasonType];
      if (!season) continue;
      const label = seasonType === "corkum" ? "Corkum" : "Culkin";
      const seasonGames = season.schedule
        .filter((g) => season.results[g.id])
        .map((g) => ({
          key: `s|${seasonType}|${g.id}`,
          label: `${label} Wk${g.week}: ${g.home} ${season.results[g.id].homeScore}–${season.results[g.id].awayScore} ${g.away}${season.results[g.id].ot ? " OT" : ""}`,
        }));
      if (seasonGames.length) groups.push({ group: `${label} Season`, options: seasonGames });
      if (season.playoffs) {
        const poGames = [];
        for (const roundKey of ["wildcard", "regionalSemis", "regionalFinal", "conferenceFinal"]) {
          for (const g of season.playoffs[roundKey]) {
            if (g.result) poGames.push({
              key: `p|${seasonType}|${roundKey}|${g.id}`,
              label: `${label} Playoffs: ${g.result.home} ${g.result.homeScore}–${g.result.awayScore} ${g.result.away}${g.result.ot ? " OT" : ""}`,
            });
          }
        }
        if (poGames.length) groups.push({ group: `${label} Playoffs`, options: poGames });
      }
    }
    return groups;
  }, [seasons]);

  const generateGameRecap = useCallback(async () => {
    if (!pressSelection) return;
    setPressGenerating(true);
    setPressError(null);
    try {
      const parts = pressSelection.split("|");
      let gameData;
      let seasonType;
      if (parts[0] === "s") {
        seasonType = parts[1];
        const gameId = Number(parts[2]);
        const season = seasons[seasonType];
        const g = season.schedule.find((x) => x.id === gameId);
        let res = season.results[gameId];
        if (!res.homeGoals) {
          const homeGoals = attributeGoals(g.home, res.homeScore, false);
          const awayGoals = attributeGoals(g.away, res.awayScore, false);
          res = { ...res, homeGoals, awayGoals };
          await persistSeasons({ ...seasons, [seasonType]: { ...season, results: { ...season.results, [gameId]: res } } });
        }
        gameData = { homeTeam: g.home, awayTeam: g.away, homeScore: res.homeScore, awayScore: res.awayScore, ot: res.ot, homeGoals: res.homeGoals, awayGoals: res.awayGoals, seasonLabel: `${seasonType === "corkum" ? "Corkum (outdoor)" : "Culkin (indoor)"} regular season, Week ${g.week}` };
      } else {
        seasonType = parts[1];
        const roundKey = parts[2];
        const gameId = Number(parts[3]);
        const season = seasons[seasonType];
        const g = season.playoffs[roundKey].find((x) => x.id === gameId);
        let r = g.result;
        if (!r.homeGoals) {
          const playoffs = JSON.parse(JSON.stringify(season.playoffs));
          const target = playoffs[roundKey].find((x) => x.id === gameId);
          target.result.homeGoals = attributeGoals(r.home, r.homeScore, false);
          target.result.awayGoals = attributeGoals(r.away, r.awayScore, false);
          await persistSeasons({ ...seasons, [seasonType]: { ...season, playoffs } });
          r = target.result;
        }
        const roundNames = { wildcard: "Wild Card Round", regionalSemis: "Regional Semifinal", regionalFinal: "Regional Final", conferenceFinal: "Conference Final" };
        gameData = { homeTeam: r.home, awayTeam: r.away, homeScore: r.homeScore, awayScore: r.awayScore, ot: r.ot, homeGoals: r.homeGoals, awayGoals: r.awayGoals, seasonLabel: `${seasonType === "corkum" ? "Corkum" : "Culkin"} Playoffs — ${roundNames[roundKey]}` };
      }
      const table = standingsFor[seasonType];
      const prompt = buildRecapPrompt({
        outlet: pressOutlet, yearNum: yearNumber, seasonLabel: gameData.seasonLabel,
        homeTeam: gameData.homeTeam, awayTeam: gameData.awayTeam, homeScore: gameData.homeScore, awayScore: gameData.awayScore,
        ot: gameData.ot, homeGoals: gameData.homeGoals, awayGoals: gameData.awayGoals,
        homeCtx: buildTeamContext(gameData.homeTeam, table), awayCtx: buildTeamContext(gameData.awayTeam, table),
      });
      const article = await fetchArticle(prompt);
      await saveToArchive({ ...article, outlet: pressOutlet, gameLabel: `${gameData.homeTeam} ${gameData.homeScore}–${gameData.awayScore} ${gameData.awayTeam}`, timestamp: Date.now() });
    } catch (e) {
      setPressError("The presses jammed — the article couldn't be generated. Try again.");
    }
    setPressGenerating(false);
  }, [pressSelection, pressOutlet, seasons, standingsFor, yearNumber, persistSeasons, saveToArchive]);

  function latestCompletedWeek(seasonType) {
    const season = seasons[seasonType];
    if (!season) return null;
    const weeksWithGames = [...new Set(season.schedule.map((g) => g.week))].sort((a, b) => b - a);
    for (const w of weeksWithGames) {
      const weekGames = season.schedule.filter((g) => g.week === w);
      if (weekGames.length && weekGames.every((g) => season.results[g.id])) return w;
    }
    return null;
  }

  const [weekReviewSeasonType, setWeekReviewSeasonType] = useState("corkum");

  const generateWeekInReview = useCallback(async () => {
    const seasonType = weekReviewSeasonType;
    const week = latestCompletedWeek(seasonType);
    if (!week) return;
    setPressGenerating(true);
    setPressError(null);
    try {
      const season = seasons[seasonType];
      const weekGames = season.schedule.filter((g) => g.week === week).map((g) => ({ ...g, ...season.results[g.id] }));
      const table = standingsFor[seasonType];
      const totalWeeks = 13;
      const prompt = buildWeekInReviewPrompt({
        yearNum: yearNumber, seasonLabel: seasonType === "corkum" ? "Corkum (outdoor) regular season" : "Culkin (indoor) regular season",
        week, weekGames, standingsTable: table, isFinalWeek: week === totalWeeks,
      });
      const article = await fetchArticle(prompt);
      await saveToArchive({ ...article, outlet: "VPLL.com", gameLabel: `${seasonType === "corkum" ? "Corkum" : "Culkin"} Week ${week} in Review`, timestamp: Date.now() });
    } catch (e) {
      setPressError("The presses jammed — the column couldn't be generated. Try again.");
    }
    setPressGenerating(false);
  }, [weekReviewSeasonType, seasons, standingsFor, yearNumber, saveToArchive]);

  const generateHotStoveColumn = useCallback(async () => {
    setPressGenerating(true);
    setPressError(null);
    try {
      const cupChampion = Object.values(combinedCupStandings).sort((a, b) => b.points - a.points)[0]?.team;
      // Read the frozen snapshots advancePlayoffRound() stored when each Trophy Final
      // concluded — never recompute live here. By the time Hot Stove is generated the
      // offseason may already have run (draft picks added, players traded/released,
      // ratings progressed), and computeSeasonAwards()/computeDavidsonAward() read the
      // *current* roster, so a live call here would silently show the wrong thing.
      const awards = {
        corkum: seasons.corkum?.awards || null,
        culkin: seasons.culkin?.awards || null,
        davidson: seasons.culkin?.davidsonAward || null,
      };
      const prompt = buildHotStovePrompt({
        yearNum: yearNumber,
        corkumChampion: seasons.corkum?.playoffs?.champion || "TBD",
        culkinChampion: seasons.culkin?.playoffs?.champion || "TBD",
        cupChampion: cupChampion || "TBD",
        draft: offseason.draft, coaching: offseason.coaching, retirement: offseason.retirement, progression: offseason.progression,
        freeAgency: offseason.freeAgency, trades: offseason.trades, awards,
      });
      const article = await fetchArticle(prompt);
      await saveToArchive({ ...article, outlet: "Hot Stove", gameLabel: `Year ${yearNumber} Offseason`, timestamp: Date.now() });
    } catch (e) {
      setPressError("The presses jammed — the column couldn't be generated. Try again.");
    }
    setPressGenerating(false);
  }, [yearNumber, seasons, offseason, combinedCupStandings, saveToArchive]);

  const generateExhibitionRecap = useCallback(async () => {
    if (!lastResult) return;
    setPressGenerating(true);
    setPressError(null);
    setExhibitionArticle(null);
    try {
      const prompt = buildRecapPrompt({
        outlet: exhibitionOutlet, yearNum: yearNumber, seasonLabel: `exhibition (${lastResult.isIndoor ? "indoor" : "outdoor"})`,
        homeTeam: lastResult.homeTeam, awayTeam: lastResult.awayTeam, homeScore: lastResult.homeScore, awayScore: lastResult.awayScore,
        ot: !!lastResult.ot, homeGoals: lastResult.homeGoals, awayGoals: lastResult.awayGoals,
        homeCtx: buildTeamContext(lastResult.homeTeam, null), awayCtx: buildTeamContext(lastResult.awayTeam, null),
      });
      const article = await fetchArticle(prompt);
      setExhibitionArticle({ ...article, outlet: exhibitionOutlet });
      await saveToArchive({ ...article, outlet: exhibitionOutlet, gameLabel: `Exhibition: ${lastResult.homeTeam} ${lastResult.homeScore}–${lastResult.awayScore} ${lastResult.awayTeam}`, timestamp: Date.now() });
    } catch (e) {
      setPressError("The presses jammed — the recap couldn't be generated. Try again.");
    }
    setPressGenerating(false);
  }, [lastResult, exhibitionOutlet, yearNumber, saveToArchive]);


  const homeT = TEAMS[homeTeam], awayT = TEAMS[awayTeam];

  return (
    <div className="vpll-root">
      <style>{STYLES}</style>
      <div className="vpll-mesh-bg" />
      <div className="vpll-shell">
        <header className="vpll-masthead">
          <div className="vpll-eyebrow">Vermont Professional Lacrosse League</div>
          <div className="vpll-title-row">
            <div className="vpll-title-lockup">
              <img src={leagueIconUrl} alt="VPLL" className="vpll-league-icon" />
              <h1 className="vpll-title">VPLL <span className="accent">Simulation Engine</span></h1>
            </div>
            <span className="vpll-scoreboard-tag">
              YEAR {yearNumber} · {bothTrophiesDecided ? "OFFSEASON" : seasons.culkin ? "CULKIN SEASON" : corkumChampion ? "OFFSEASON WINDOW" : "CORKUM SEASON"}
            </span>
          </div>
        </header>

        <nav className="vpll-tabs">
          <button className={`vpll-tab ${activeTab === "exhibition" ? "active" : ""}`} onClick={() => setActiveTab("exhibition")}>Exhibition</button>
          <button className={`vpll-tab ${activeTab === "season" ? "active" : ""}`} onClick={() => setActiveTab("season")}>Season</button>
          <button className={`vpll-tab ${activeTab === "playoffs" ? "active" : ""}`} onClick={() => setActiveTab("playoffs")}>Playoffs</button>
          <button className={`vpll-tab ${activeTab === "standings" ? "active" : ""}`} onClick={() => setActiveTab("standings")}>Standings</button>
          <button className={`vpll-tab ${activeTab === "stats" ? "active" : ""}`} onClick={() => setActiveTab("stats")}>Stats</button>
          <button className={`vpll-tab ${activeTab === "offseason" ? "active" : ""}`} onClick={() => setActiveTab("offseason")}>Offseason</button>
          <button className={`vpll-tab ${activeTab === "pressbox" ? "active" : ""}`} onClick={() => setActiveTab("pressbox")}>Press Box</button>
        </nav>

        {activeTab === "exhibition" && (
          <section>
            <div className="vpll-section-label">Build the Matchup</div>
            <div className="vpll-matchup-grid">
              <TeamCard role="home" teamName={homeTeam} onChange={setHomeTeam} opponentName={awayTeam} />
              <div className="vpll-vs-divider">VS</div>
              <TeamCard role="away" teamName={awayTeam} onChange={setAwayTeam} opponentName={homeTeam} />
            </div>

            <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 3, padding: 14, marginBottom: 18 }}>
              <div className="vpll-bar-row" style={{ marginBottom: 6 }}><span className="vpll-bar-label">OFF</span></div>
              <RatingBar label="Offense" homeVal={homeT.offPos} awayVal={awayT.offPos} />
              <RatingBar label="Defense" homeVal={homeT.defPos} awayVal={awayT.defPos} />
              <RatingBar label="Riding" homeVal={homeT.riding} awayVal={awayT.riding} />
              <RatingBar label="Clearing" homeVal={homeT.clearing} awayVal={awayT.clearing} />
              <RatingBar label="Faceoff" homeVal={homeT.fofClm} awayVal={awayT.fofClm} />
              <RatingBar label="Clutch" homeVal={homeT.clutch} awayVal={awayT.clutch} />
            </div>

            <div className="vpll-controls-row">
              <div className="vpll-toggle-group">
                <button className={`vpll-toggle-btn ${!isIndoor ? "active" : ""}`} onClick={() => setIsIndoor(false)}>Outdoor (Corkum)</button>
                <button className={`vpll-toggle-btn ${isIndoor ? "active" : ""}`} onClick={() => setIsIndoor(true)}>Indoor (Culkin)</button>
              </div>
              <button className="vpll-btn" onClick={runExhibition} disabled={simulating}>
                {simulating ? "Simulating…" : "Simulate Game"}
              </button>
            </div>

            {lastResult && <BoxScore result={lastResult} />}

            {lastResult && (
              <div style={{ marginBottom: 18 }}>
                <div className="vpll-controls-row">
                  <div className="vpll-toggle-group">
                    {["VPLL.com", "The Mesh", "The X"].map((o) => (
                      <button key={o} className={`vpll-toggle-btn ${exhibitionOutlet === o ? "active" : ""}`} onClick={() => setExhibitionOutlet(o)}>{o}</button>
                    ))}
                  </div>
                  <button className="vpll-btn secondary" onClick={generateExhibitionRecap} disabled={pressGenerating}>
                    {pressGenerating ? "Writing…" : "Write Recap"}
                  </button>
                </div>
                {pressError && <div className="vpll-press-error">{pressError}</div>}
                {exhibitionArticle && <Article article={exhibitionArticle} />}
              </div>
            )}

            {gameHistory.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div className="vpll-section-label">Recent Games</div>
                <div className="vpll-history-list">
                  {gameHistory.slice(0, 8).map((h, i) => (
                    <div key={i} className="vpll-history-item">
                      <span className="vpll-team-name-row"><TeamLogo teamName={h.homeTeam} size={18} /> {h.homeTeam} vs <TeamLogo teamName={h.awayTeam} size={18} /> {h.awayTeam} {h.isIndoor ? "(Indoor)" : "(Outdoor)"}</span>
                      <span className="vpll-history-score">{h.homeScore} – {h.awayScore}{h.ot ? " OT" : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "season" && (
          <section>
            <div className="vpll-toggle-group" style={{ marginBottom: 18 }}>
              <button className={`vpll-toggle-btn ${activeSeasonType === "corkum" ? "active" : ""}`} onClick={() => setActiveSeasonType("corkum")}>Corkum (Outdoor)</button>
              <button className={`vpll-toggle-btn ${activeSeasonType === "culkin" ? "active" : ""}`} onClick={() => culkinUnlocked && setActiveSeasonType("culkin")} disabled={!culkinUnlocked} style={!culkinUnlocked ? { opacity: 0.4, cursor: "not-allowed" } : {}}>
                Culkin (Indoor) {!culkinUnlocked && "🔒"}
              </button>
            </div>

            {activeSeasonType === "culkin" && !culkinUnlocked && (
              <div className="vpll-empty">The Culkin (Indoor) season unlocks once the Corkum Trophy Final has been decided. Training camp opens mid-August, right after the outdoor championship.</div>
            )}

            {(activeSeasonType === "corkum" || culkinUnlocked) && !seasons[activeSeasonType] && (
              <div className="vpll-empty">
                <p style={{ margin: "0 0 14px 0" }}>No {SEASON_LABEL[activeSeasonType]} season in progress. Generate a full 13-week, 256-game schedule to begin.</p>
                <button className="vpll-btn" onClick={() => startNewSeason(activeSeasonType)}>Generate {SEASON_LABEL[activeSeasonType]} Schedule</button>
              </div>
            )}

            {seasons[activeSeasonType] && (
              <>
                <div className="vpll-season-progress">
                  <span className="vpll-progress-label">{gamesPlayedFor(activeSeasonType)} / {totalGamesFor(activeSeasonType)} games played</span>
                  <div className="vpll-progress-track"><div className="vpll-progress-fill" style={{ width: `${(gamesPlayedFor(activeSeasonType) / totalGamesFor(activeSeasonType)) * 100}%` }} /></div>
                </div>
                <div className="vpll-controls-row">
                  {!seasonCompleteFor(activeSeasonType) && currentWeekToPlay(activeSeasonType) && (
                    <button className="vpll-btn" onClick={() => simulateWeek(activeSeasonType, currentWeekToPlay(activeSeasonType))} disabled={seasonBusy}>
                      {seasonBusy ? "Simulating…" : `Simulate Week ${currentWeekToPlay(activeSeasonType)}`}
                    </button>
                  )}
                  {!seasonCompleteFor(activeSeasonType) && (
                    <button className="vpll-btn secondary" onClick={() => simulateFullSeason(activeSeasonType)} disabled={seasonBusy}>
                      {seasonBusy ? "Simulating…" : "Simulate Rest of Season"}
                    </button>
                  )}
                  <button className="vpll-btn secondary" onClick={() => resetSeason(activeSeasonType)}>Reset {SEASON_LABEL[activeSeasonType]} Season</button>
                </div>
                {seasonCompleteFor(activeSeasonType) && (
                  <div className="vpll-info-banner">
                    {SEASON_LABEL[activeSeasonType]} regular season complete. Head to the Playoffs tab to generate the bracket.
                    {activeSeasonType === "corkum" && !seasons.culkin && " Once the Corkum Trophy is decided, the Culkin season unlocks here."}
                  </div>
                )}

                <div className="vpll-section-label" style={{ marginTop: 20 }}>Schedule by Week</div>
                {Array.from({ length: 13 }, (_, i) => i + 1).map((w) => {
                  const weekGames = seasons[activeSeasonType].schedule.filter((g) => g.week === w);
                  if (!weekGames.length) return null;
                  const label = w === 7 ? `Week ${w} — Interconference` : w === 12 ? `Week ${w} — Interconference` : w === 13 ? `Week ${w} — Rivalry Week` : `Week ${w}`;
                  return (
                    <div className="vpll-week-block" key={w}>
                      <div className="vpll-week-label">{label}</div>
                      {weekGames.map((g) => {
                        const res = seasons[activeSeasonType].results[g.id];
                        const gameKey = `s-${activeSeasonType}-${g.id}`;
                        const isExpanded = expandedGameKey === gameKey;
                        return (
                          <div key={g.id}>
                            <div
                              className="vpll-game-row"
                              onClick={() => res && toggleSeasonBoxScore(activeSeasonType, g)}
                              style={res ? { cursor: "pointer" } : {}}
                              title={res ? "Click for box score" : ""}
                            >
                              <span className="matchup vpll-team-name-row"><TeamLogo teamName={g.home} size={18} /> {g.home} vs <TeamLogo teamName={g.away} size={18} /> {g.away}</span>
                              <span className="played">{res ? `${res.homeScore}–${res.awayScore}${res.ot ? " OT" : ""} ${isExpanded ? "▾" : "▸"}` : "—"}</span>
                            </div>
                            {isExpanded && res && res.homeGoals && (
                              <div style={{ margin: "6px 0 12px" }}>
                                <BoxScore result={boxScoreResultFor(activeSeasonType, g)} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}
          </section>
        )}

        {activeTab === "playoffs" && (
          <section>
            <div className="vpll-toggle-group" style={{ marginBottom: 18 }}>
              <button className={`vpll-toggle-btn ${activeSeasonType === "corkum" ? "active" : ""}`} onClick={() => setActiveSeasonType("corkum")}>Corkum (Outdoor)</button>
              <button className={`vpll-toggle-btn ${activeSeasonType === "culkin" ? "active" : ""}`} onClick={() => culkinUnlocked && setActiveSeasonType("culkin")} disabled={!culkinUnlocked} style={!culkinUnlocked ? { opacity: 0.4, cursor: "not-allowed" } : {}}>
                Culkin (Indoor) {!culkinUnlocked && "🔒"}
              </button>
            </div>

            {!seasons[activeSeasonType] && <div className="vpll-empty">No {SEASON_LABEL[activeSeasonType]} season in progress. Generate and complete a regular season first.</div>}
            {seasons[activeSeasonType] && !seasonCompleteFor(activeSeasonType) && (
              <div className="vpll-empty">
                Playoffs unlock once the {SEASON_LABEL[activeSeasonType]} regular season is complete.<br />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>{gamesPlayedFor(activeSeasonType)} / {totalGamesFor(activeSeasonType)} games played</span>
              </div>
            )}
            {seasons[activeSeasonType] && seasonCompleteFor(activeSeasonType) && !seasons[activeSeasonType].playoffs && (
              <div className="vpll-empty">
                <p style={{ margin: "0 0 14px 0" }}>{SEASON_LABEL[activeSeasonType]} regular season complete. Generate the 12-team-per-conference playoff bracket, seeded from final standings.</p>
                <button className="vpll-btn" onClick={() => generateBracket(activeSeasonType)}>Generate Playoff Bracket</button>
              </div>
            )}
            {seasons[activeSeasonType] && seasons[activeSeasonType].playoffs && (
              <>
                {seasons[activeSeasonType].playoffs.champion && (
                  <div className="vpll-champion-banner">
                    <span className="vpll-champion-label">{TROPHY_LABEL[activeSeasonType]} Champion</span>
                    <TeamLogo teamName={seasons[activeSeasonType].playoffs.champion} size={48} />
                    <span className="vpll-champion-name">{seasons[activeSeasonType].playoffs.champion}</span>
                  </div>
                )}
                {nextPlayoffRoundFor(activeSeasonType) && (
                  <div className="vpll-controls-row">
                    <button className="vpll-btn" onClick={() => advancePlayoffRound(activeSeasonType, nextPlayoffRoundFor(activeSeasonType))} disabled={playoffBusy}>
                      {playoffBusy ? "Simulating…" : ROUND_LABELS[nextPlayoffRoundFor(activeSeasonType)]}
                    </button>
                  </div>
                )}

                <PlayoffRound title="Wild Card Round" games={seasons[activeSeasonType].playoffs.wildcard} roundKey="wildcard" seasonType={activeSeasonType} expandedGameKey={expandedGameKey} onGameClick={togglePlayoffBoxScore} boxScoreFor={playoffBoxScoreResultFor} />
                <PlayoffRound title="Regional Semifinals" games={seasons[activeSeasonType].playoffs.regionalSemis} roundKey="regionalSemis" seasonType={activeSeasonType} expandedGameKey={expandedGameKey} onGameClick={togglePlayoffBoxScore} boxScoreFor={playoffBoxScoreResultFor} />
                <PlayoffRound title="Regional Finals" games={seasons[activeSeasonType].playoffs.regionalFinal} roundKey="regionalFinal" seasonType={activeSeasonType} expandedGameKey={expandedGameKey} onGameClick={togglePlayoffBoxScore} boxScoreFor={playoffBoxScoreResultFor} />
                <PlayoffRound title="Conference Finals" games={seasons[activeSeasonType].playoffs.conferenceFinal} roundKey="conferenceFinal" seasonType={activeSeasonType} expandedGameKey={expandedGameKey} onGameClick={togglePlayoffBoxScore} boxScoreFor={playoffBoxScoreResultFor} />
                {seasons[activeSeasonType].playoffs.allStarGame && (
                  <div className="vpll-week-block">
                    <div className="vpll-week-label">{SEASON_LABEL[activeSeasonType]} All-Star Game</div>
                    <div className="vpll-game-row">
                      <span className="matchup">Lakeshore All-Stars vs Mountainside All-Stars</span>
                      <span className="played">
                        {seasons[activeSeasonType].playoffs.allStarGame.lakeScore}–{seasons[activeSeasonType].playoffs.allStarGame.mounScore}
                        {seasons[activeSeasonType].playoffs.allStarGame.ot ? " OT" : ""}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, fontFamily: "JetBrains Mono, monospace", color: "var(--ink-soft)", padding: "6px 12px" }}>
                      {seasons[activeSeasonType].playoffs.allStarGame.winner === "Lake" ? "Lakeshore" : "Mountainside"} wins — earns Trophy Final Games 1 &amp; 3 home field.
                    </div>
                  </div>
                )}
                {seasons[activeSeasonType].playoffs.trophyFinal && (
                  <div className="vpll-week-block">
                    <div className="vpll-week-label">{TROPHY_LABEL[activeSeasonType]} Final (Best of 3)</div>
                    <div className="vpll-game-row" style={{ marginBottom: 8 }}>
                      <span className="matchup vpll-team-name-row"><TeamLogo teamName={seasons[activeSeasonType].playoffs.trophyFinal.teamA} size={18} /> {seasons[activeSeasonType].playoffs.trophyFinal.teamA} vs <TeamLogo teamName={seasons[activeSeasonType].playoffs.trophyFinal.teamB} size={18} /> {seasons[activeSeasonType].playoffs.trophyFinal.teamB}</span>
                      <span className="played">{seasons[activeSeasonType].playoffs.trophyFinal.winsA}–{seasons[activeSeasonType].playoffs.trophyFinal.winsB}</span>
                    </div>
                    {seasons[activeSeasonType].playoffs.trophyFinal.games.map((g, i) => (
                      <div className="vpll-game-row" key={i}>
                        <span className="matchup vpll-team-name-row">Game {i + 1}: <TeamLogo teamName={g.home} size={18} /> {g.home} vs <TeamLogo teamName={g.away} size={18} /> {g.away}</span>
                        <span className="played">{g.homeScore}–{g.awayScore}{g.ot ? " OT" : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
                {seasons[activeSeasonType].playoffs.champion && seasons[activeSeasonType].awards && (() => {
                  // Read the snapshot advancePlayoffRound() froze the moment the Trophy
                  // Final concluded — not a live recompute, which would drift the moment
                  // any offseason step (Draft/Free Agency/Trades/Progression) mutates the
                  // roster this same panel stays visible through.
                  const awards = seasons[activeSeasonType].awards;
                  const AWARD_ROWS = [
                    ["Most Valuable Player", awards.mvp],
                    ["Offensive Player of the Year", awards.opoy],
                    ["Defensive Player of the Year", awards.dpoy],
                    ["Most Outstanding Goalie", awards.mog],
                    ["Rookie of the Year", awards.roy],
                    [`${TROPHY_LABEL[activeSeasonType]} Final MVP`, awards.finalsMVP],
                  ];
                  return (
                    <div className="vpll-week-block">
                      <div className="vpll-week-label">{SEASON_LABEL[activeSeasonType]} Season Awards</div>
                      {AWARD_ROWS.map(([label, a], i) => (
                        <div className="vpll-game-row" key={i}>
                          <span className="matchup">{label}</span>
                          <span className="played vpll-team-name-row">
                            {a ? <>{a.name} ({POS_NAME[a.pos]}) — <TeamLogo teamName={a.team} size={16} /> {a.team}</> : "—"}
                          </span>
                        </div>
                      ))}
                      <div className="vpll-game-row">
                        <span className="matchup">Coach of the Year</span>
                        <span className="played vpll-team-name-row">
                          {awards.coy ? <>{awards.coy.coach} ({awards.coy.arch}) — <TeamLogo teamName={awards.coy.team} size={16} /> {awards.coy.team}</> : "—"}
                        </span>
                      </div>
                      {[["First Team All-VPLL", awards.allVPLL.firstTeam], ["Second Team All-VPLL", awards.allVPLL.secondTeam], ["All-Rookie Team", awards.allRookie]].map(([label, lineup]) => (
                        lineup.length > 0 && (
                          <div key={label}>
                            <div className="vpll-progress-label" style={{ margin: "8px 0 4px" }}>{label}</div>
                            {lineup.map((a, i) => (
                              <div className="vpll-game-row" key={i}>
                                <span className="matchup vpll-team-name-row">{a.name} ({POS_NAME[a.pos]}) — <TeamLogo teamName={a.team} size={16} /> {a.team}</span>
                                <span className="played">OVR {a.ovr}</span>
                              </div>
                            ))}
                          </div>
                        )
                      ))}
                    </div>
                  );
                })()}
              </>
            )}
          </section>
        )}

        {activeTab === "standings" && (
          <section>
            {!seasons.corkum ? (
              <div className="vpll-empty">No season data yet. Generate and simulate a season from the Season tab to see standings.</div>
            ) : (
              <>
                <div className="vpll-info-banner">
                  Commissioners Cup Points: 1 point per regular season win, 2 points per playoff win, 0 for an OT loss.
                  The full-year Commissioners Cup combines both the Corkum and Culkin seasons.
                </div>
                <div className="vpll-toggle-group" style={{ marginBottom: 18 }}>
                  <button className={`vpll-toggle-btn ${standingsView === "combined" ? "active" : ""}`} onClick={() => setStandingsView("combined")}>Commissioners Cup (Combined)</button>
                  <button className={`vpll-toggle-btn ${standingsView === "cup" ? "active" : ""}`} onClick={() => setStandingsView("cup")}>Corkum</button>
                  <button className={`vpll-toggle-btn ${standingsView === "culkin" ? "active" : ""}`} onClick={() => setStandingsView("culkin")} disabled={!seasons.culkin}>Culkin</button>
                  <button className={`vpll-toggle-btn ${standingsView === "division" ? "active" : ""}`} onClick={() => setStandingsView("division")}>By Division</button>
                  <button className={`vpll-toggle-btn ${standingsView === "cap" ? "active" : ""}`} onClick={() => setStandingsView("cap")}>Salary Cap</button>
                </div>

                {standingsView === "combined" && (
                  <>
                    <div className="vpll-h2">Full-Year Commissioners Cup Standings</div>
                    {!seasons.culkin && <div className="vpll-info-banner">Culkin season hasn't started — totals currently reflect Corkum only.</div>}
                    <CombinedCupTable table={combinedCupStandings} teamList={TEAM_NAMES} />
                  </>
                )}

                {standingsView === "cap" && (
                  <>
                    <div className="vpll-h2">Salary Cap — Soft Cap {formatMoney(SALARY_CAP)}</div>
                    <div className="vpll-info-banner">Teams may exceed the cap but face escalating fines: 5-10% over → 25% of overage, 10-20% → 50%, 20-30% → 100%, 30%+ → 200%.</div>
                    <table className="vpll-standings-table">
                      <thead>
                        <tr><th>Team</th><th className="num">Roster</th><th className="num">Payroll</th><th className="num">% of Cap</th><th className="num">Fine</th></tr>
                      </thead>
                      <tbody>
                        {TEAM_NAMES.map((t) => teamPayroll(t)).length > 0 && TEAM_NAMES
                          .map((t) => ({ t, payroll: teamPayroll(t), roster: PLAYERS_RAW[t].length }))
                          .sort((a, b) => b.payroll - a.payroll)
                          .map((row) => {
                            const fine = capFine(row.payroll);
                            const pct = (row.payroll / SALARY_CAP) * 100;
                            return (
                              <tr key={row.t}>
                                <td><div className="vpll-team-name-row"><TeamLogo teamName={row.t} size={20} />{row.t}</div></td>
                                <td className="num">{row.roster}</td>
                                <td className="num">{formatMoney(row.payroll)}</td>
                                <td className="num">{pct.toFixed(1)}%</td>
                                <td className="num cup-col">{fine > 0 ? formatMoney(fine) : "—"}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </>
                )}

                {standingsView === "cup" && (
                  <>
                    <div className="vpll-h2">Corkum Season — Commissioners Cup Points</div>
                    <StandingsTable table={seasonCupStandings("corkum")} teamList={TEAM_NAMES} />
                  </>
                )}

                {standingsView === "culkin" && seasons.culkin && (
                  <>
                    <div className="vpll-h2">Culkin Season — Commissioners Cup Points</div>
                    <StandingsTable table={seasonCupStandings("culkin")} teamList={TEAM_NAMES} />
                  </>
                )}

                {standingsView === "division" && (
                  <>
                    <div className="vpll-toggle-group" style={{ marginBottom: 14 }}>
                      <button className={`vpll-toggle-btn ${divisionSeason === "corkum" ? "active" : ""}`} onClick={() => setDivisionSeason("corkum")}>Corkum</button>
                      <button className={`vpll-toggle-btn ${divisionSeason === "culkin" ? "active" : ""}`} onClick={() => seasons.culkin && setDivisionSeason("culkin")} disabled={!seasons.culkin} style={!seasons.culkin ? { opacity: 0.4, cursor: "not-allowed" } : {}}>
                        Culkin {!seasons.culkin && "🔒"}
                      </button>
                    </div>
                    {Object.entries(BY_DIVISION).map(([key, teams]) => {
                      const [conf, div] = key.split("|");
                      return (
                        <div key={key}>
                          <div className="vpll-div-header">{conf === "Lake" ? "Lakeshore" : "Mountainside"} — {div}</div>
                          <StandingsTable table={seasonCupStandings(divisionSeason)} teamList={teams} />
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </section>
        )}

        {activeTab === "stats" && (
          <section>
            {!seasons.corkum ? (
              <div className="vpll-empty">No season data yet. Generate and simulate a season from the Season tab to see individual leaderboards.</div>
            ) : (() => {
              const statSourceStore = statsScope === "career" ? CAREER_STATS : (seasons[statsSeasonType]?.playerStats || {});
              const activeCategory = STAT_CATEGORIES.find((c) => c.key === statsCategory);
              const leaders = topByStat(statSourceStore, statsCategory, { positions: activeCategory.positions, n: 10 });
              const isRate = statsCategory === "foPct" || statsCategory === "savePct";
              return (
                <>
                  <div className="vpll-info-banner">
                    Season leaders are regular-season only (Corkum or Culkin, not combined) and reset each year; Career totals
                    accumulate across every regular season a player's ever played, and follow the player even after a trade or
                    free-agent signing. None of this is a literal recorded play-by-play — this engine simulates a final score
                    from team ratings, not individual possessions — so every number here is a weighted attribution of that real
                    outcome onto the players most likely to have produced it, the same way the box score under a played game
                    already worked.
                  </div>
                  <div className="vpll-toggle-group" style={{ marginBottom: 14 }}>
                    <button className={`vpll-toggle-btn ${statsScope === "season" ? "active" : ""}`} onClick={() => setStatsScope("season")}>Season</button>
                    <button className={`vpll-toggle-btn ${statsScope === "career" ? "active" : ""}`} onClick={() => setStatsScope("career")}>Career</button>
                  </div>
                  {statsScope === "season" && (
                    <div className="vpll-toggle-group" style={{ marginBottom: 14 }}>
                      <button className={`vpll-toggle-btn ${statsSeasonType === "corkum" ? "active" : ""}`} onClick={() => setStatsSeasonType("corkum")}>Corkum</button>
                      <button className={`vpll-toggle-btn ${statsSeasonType === "culkin" ? "active" : ""}`} onClick={() => setStatsSeasonType("culkin")} disabled={!seasons.culkin}>Culkin</button>
                    </div>
                  )}
                  <div className="vpll-toggle-group" style={{ marginBottom: 18, flexWrap: "wrap" }}>
                    {STAT_CATEGORIES.map((c) => (
                      <button key={c.key} className={`vpll-toggle-btn ${statsCategory === c.key ? "active" : ""}`} onClick={() => setStatsCategory(c.key)}>{c.label}</button>
                    ))}
                  </div>
                  <div className="vpll-h2">
                    {activeCategory.label} Leaders — {statsScope === "career" ? "Career" : SEASON_LABEL[statsSeasonType]}
                  </div>
                  {leaders.length === 0 ? (
                    <div className="vpll-empty">Nobody qualifies yet — simulate more games.</div>
                  ) : (
                    <table className="vpll-standings-table">
                      <thead>
                        <tr><th>#</th><th>Player</th><th>Team</th><th>Pos</th><th className="num">{activeCategory.label}</th><th className="num">Detail</th></tr>
                      </thead>
                      <tbody>
                        {leaders.map((l, i) => (
                          <tr key={l.id}>
                            <td>{i + 1}</td>
                            <td>{l.name}</td>
                            <td><div className="vpll-team-name-row"><TeamLogo teamName={l.team} size={18} />{l.team}</div></td>
                            <td>{l.pos}</td>
                            <td className="num">{isRate ? `${(l.value * 100).toFixed(1)}%` : l.value}</td>
                            <td className="num">{activeCategory.detail(l)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              );
            })()}
          </section>
        )}

        {activeTab === "offseason" && (
          <section>
            <div className="vpll-week-block" style={{ marginBottom: 18 }}>
              <div className="vpll-week-label">Player Pool ({PLAYER_POOL.length})</div>
              <div className="vpll-info-banner">
                Cut and unsigned players land here instead of vanishing (Master File 9.5) — any
                team can claim one off the pool during Free Agency, and a team that would fall
                below the {MIN_ROSTER_SIZE}-player roster floor draws from here first.
              </div>
              {PLAYER_POOL.length === 0 ? (
                <div style={{ fontSize: 12.5, fontFamily: "JetBrains Mono, monospace", color: "var(--ink-soft)", padding: "6px 12px" }}>
                  Empty — nobody's between teams right now.
                </div>
              ) : (
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {Object.entries(POS_NAME).map(([pos, label]) => {
                    const atPos = PLAYER_POOL.filter((p) => p[1] === pos).sort((a, b) => b[4] - a[4]);
                    if (atPos.length === 0) return null;
                    return (
                      <div key={pos} style={{ marginBottom: 6 }}>
                        <div className="vpll-progress-label" style={{ margin: "6px 0 2px" }}>{label} ({atPos.length})</div>
                        {atPos.map((p, i) => (
                          <div className="vpll-game-row" key={i}>
                            <span className="matchup">{p[0]}</span>
                            <span className="played">OVR {p[4]} · Age {p[3]}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!bothTrophiesDecided && (
              <div className="vpll-empty">
                The offseason unlocks once both the Corkum and Culkin Trophy Finals are complete for Year {yearNumber}.
              </div>
            )}
            {bothTrophiesDecided && (
              <>
                <div className="vpll-champion-banner" style={{ marginBottom: 18 }}>
                  <span className="vpll-champion-label">Year {yearNumber} Complete</span>
                  <span className="vpll-champion-name vpll-team-name-row" style={{ fontSize: 20, justifyContent: "center" }}>
                    Corkum: <TeamLogo teamName={seasons.corkum.playoffs.champion} size={24} /> {seasons.corkum.playoffs.champion} · Culkin: <TeamLogo teamName={seasons.culkin.playoffs.champion} size={24} /> {seasons.culkin.playoffs.champion}
                  </span>
                  {/* Read the snapshot advancePlayoffRound() froze the moment Culkin's Trophy
                      Final concluded (the moment both seasons are final) — not a live recompute,
                      which would drift the moment any offseason step mutates the roster this
                      same banner stays visible through for the rest of the offseason window. */}
                  {seasons.culkin.davidsonAward && (
                    <div className="vpll-team-name-row" style={{ marginTop: 8, fontSize: 13, justifyContent: "center", color: "var(--ink-soft)" }}>
                      The Davidson Award (Commissioners Cup MVP): {seasons.culkin.davidsonAward.name} ({POS_NAME[seasons.culkin.davidsonAward.pos]}) — <TeamLogo teamName={seasons.culkin.davidsonAward.team} size={16} /> {seasons.culkin.davidsonAward.team}
                    </div>
                  )}
                </div>

                {/* 1. Draft */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">1. Draft Lottery &amp; Draft (5 Rounds)</div>
                  {!offseason.draft ? (
                    <button className="vpll-btn" onClick={runDraftStep} disabled={offseasonBusy}>
                      {offseasonBusy ? "Running…" : "Run Draft"}
                    </button>
                  ) : (
                    <>
                      <div className="vpll-info-banner">
                        Draft order seeded from combined Commissioners Cup standings — weighted lottery for the bottom-16 teams determines picks 1-8, remaining lottery teams fill 9-16, the rest pick in straight inverse order. Teams draft for positional need ~60% of the time.
                      </div>
                      {[1, 2, 3, 4, 5].map((round) => (
                        <div key={round} style={{ marginBottom: 8 }}>
                          <div className="vpll-progress-label" style={{ marginBottom: 4 }}>Round {round}</div>
                          {offseason.draft.results.filter((p) => p.round === round).slice(0, round === 1 ? 32 : 8).map((p) => (
                            <div className="vpll-game-row" key={p.overallPick}>
                              <span className="matchup vpll-team-name-row">Pick {p.overallPick} (<TeamLogo teamName={p.team} size={16} /> {p.team}): {p.prospect.name}, {POS_NAME[p.prospect.pos]}, Age {p.prospect.age}</span>
                              <span className="played">OVR {p.prospect.overall} · Ceil {p.prospect.ceiling}</span>
                            </div>
                          ))}
                          {round > 1 && <div style={{ fontSize: 11, color: "var(--ink-soft)", fontFamily: "JetBrains Mono, monospace", padding: "4px 12px" }}>...showing first 8 of 32 picks this round</div>}
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* 2. Coaching */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">2. Coaching Carousel</div>
                  {!offseason.coaching ? (
                    <button className="vpll-btn" onClick={runCoachingStep} disabled={offseasonBusy || !offseason.draft}>
                      {offseasonBusy ? "Running…" : "Process Coaching Changes"}
                    </button>
                  ) : (
                    <>
                      <div className="vpll-info-banner">{offseason.coaching.fired.length} of 32 Head Coach/GM seats turned over this offseason.</div>
                      {offseason.coaching.fired.map((f, i) => (
                        <div className="vpll-game-row" key={i}>
                          <span className="matchup vpll-team-name-row"><TeamLogo teamName={f.team} size={18} /> {f.team}: {f.oldCoach} ({f.oldArch}) fired</span>
                          <span className="played">→ {offseason.coaching.hired[i]?.newCoach} ({offseason.coaching.hired[i]?.newArch})</span>
                        </div>
                      ))}
                      {offseason.coaching.fired.length === 0 && <div style={{ fontSize: 12.5, fontFamily: "JetBrains Mono, monospace", color: "var(--ink-soft)", padding: "6px 12px" }}>Every coach kept their job this offseason.</div>}
                    </>
                  )}
                </div>

                {/* 3. Retirement */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">3. Retirement Wire</div>
                  {!offseason.retirement ? (
                    <button className="vpll-btn" onClick={runRetirementStep} disabled={offseasonBusy || !offseason.coaching}>
                      {offseasonBusy ? "Running…" : "Process Retirements"}
                    </button>
                  ) : (
                    <>
                      <div className="vpll-info-banner">{offseason.retirement.retirees.length} players announced their retirement league-wide.</div>
                      {offseason.retirement.retirees.map((r, i) => (
                        <div className="vpll-game-row" key={i}>
                          <span className="matchup vpll-team-name-row"><TeamLogo teamName={r.team} size={18} /> {r.name} ({POS_NAME[r.pos]}, {r.team})</span>
                          <span className="played">Age {r.age}</span>
                        </div>
                      ))}
                      {offseason.retirement.poolSignings?.length > 0 && (
                        <>
                          <div className="vpll-progress-label" style={{ margin: "8px 0 4px" }}>Roster Floor Backfills</div>
                          {offseason.retirement.poolSignings.map((s, i) => (
                            <div className="vpll-game-row" key={i}>
                              <span className="matchup vpll-team-name-row"><TeamLogo teamName={s.team} size={18} /> {s.team} signs {s.name} ({POS_NAME[s.pos]}){s.source === "pool" ? " — off the Player Pool" : ""}</span>
                              <span className="played">OVR {s.ovr}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* 4. Free Agency */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">4. Free Agency</div>
                  {!offseason.freeAgency ? (
                    <button className="vpll-btn" onClick={runFreeAgencyStep} disabled={offseasonBusy || !offseason.retirement}>
                      {offseasonBusy ? "Running…" : "Run Free Agency"}
                    </button>
                  ) : (
                    <>
                      <div className="vpll-info-banner">
                        {offseason.freeAgency.reSigned.length} re-signed · {offseason.freeAgency.signed.length} changed teams · {offseason.freeAgency.departed.length} released.
                        Players acted as Loyalists ({offseason.freeAgency.reSigned.filter(s => s.motivation === "Loyalist").length}), Mercenaries ({offseason.freeAgency.signed.filter(s => s.motivation === "Mercenary").length} signings), and Winners ({offseason.freeAgency.signed.filter(s => s.motivation === "Winner").length} signings).
                        {offseason.freeAgency.signed.filter(s => s.tier === 1).length > 0 && ` ${offseason.freeAgency.signed.filter(s => s.tier === 1).length} Franchise-tier signing(s) — Hot Stove headline material.`}
                      </div>
                      {offseason.freeAgency.signed.length > 0 && (
                        <>
                          <div className="vpll-progress-label" style={{ margin: "8px 0 4px" }}>Signings</div>
                          {offseason.freeAgency.signed.map((s, i) => (
                            <div className="vpll-game-row" key={i}>
                              <span className="matchup vpll-team-name-row">{s.name} (OVR {s.ovr}, {FREE_AGENT_TIER_NAMES[s.tier] || "?"}, {s.motivation}): {s.from} → <TeamLogo teamName={s.team} size={18} /> {s.team}</span>
                              <span className="played">{formatMoney(s.aav)}/yr</span>
                            </div>
                          ))}
                        </>
                      )}
                      {offseason.freeAgency.poolSignings?.length > 0 && (
                        <>
                          <div className="vpll-progress-label" style={{ margin: "8px 0 4px" }}>Roster Floor Backfills</div>
                          {offseason.freeAgency.poolSignings.map((s, i) => (
                            <div className="vpll-game-row" key={i}>
                              <span className="matchup vpll-team-name-row"><TeamLogo teamName={s.team} size={18} /> {s.team} signs {s.name} ({POS_NAME[s.pos]}){s.source === "pool" ? " — off the Player Pool" : ""}</span>
                              <span className="played">OVR {s.ovr}</span>
                            </div>
                          ))}
                        </>
                      )}
                      {offseason.freeAgency.emergencySigned?.length > 0 && (
                        <>
                          <div className="vpll-progress-label" style={{ margin: "8px 0 4px" }}>Emergency Camp Signings</div>
                          {offseason.freeAgency.emergencySigned.map((s, i) => (
                            <div className="vpll-game-row" key={i}>
                              <span className="matchup vpll-team-name-row"><TeamLogo teamName={s.team} size={18} /> {s.team} signs {s.name} ({POS_NAME[s.pos]}){s.source === "pool" ? " — off the Player Pool" : ""}</span>
                              <span className="played">OVR {s.ovr}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* 5. Trades */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">5. Trades</div>
                  {!offseason.trades ? (
                    <button className="vpll-btn" onClick={runTradesStep} disabled={offseasonBusy || !offseason.freeAgency}>
                      {offseasonBusy ? "Running…" : "Run Trade Window"}
                    </button>
                  ) : (
                    <>
                      <div className="vpll-info-banner">
                        {offseason.trades.trades.length} trades executed league-wide.
                        {offseason.trades.trades.filter(t => t.reason.includes("requested")).length > 0 && ` ${offseason.trades.trades.filter(t => t.reason.includes("requested")).length} initiated by unhappy star trade demands.`}
                        {offseason.trades.trades.filter(t => t.reason.startsWith("salary dump")).length > 0 && ` ${offseason.trades.trades.filter(t => t.reason.startsWith("salary dump")).length} salary dump(s) to duck the luxury tax.`}
                      </div>
                      {offseason.trades.trades.map((t, i) => (
                        <div className="vpll-game-row" key={i}>
                          <span className="matchup vpll-team-name-row"><TeamLogo teamName={t.teamA} size={18} /> {t.teamA}: {t.playerA} ↔ <TeamLogo teamName={t.teamB} size={18} /> {t.teamB}: {t.playerB}</span>
                          <span className="played" style={{ fontSize: 11, maxWidth: 220, textAlign: "right" }}>{t.reason}</span>
                        </div>
                      ))}
                      {offseason.trades.trades.length === 0 && <div style={{ fontSize: 12.5, fontFamily: "JetBrains Mono, monospace", color: "var(--ink-soft)", padding: "6px 12px" }}>A quiet trade window — no deals made.</div>}
                    </>
                  )}
                </div>

                {/* Manual Trade Override */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">Commissioner's Trade Override</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                    <div>
                      <div className="vpll-team-name-row" style={{ marginBottom: 6 }}><TeamLogo teamName={manualTeamA} size={24} /></div>
                      <select className="vpll-select" value={manualTeamA} onChange={(e) => { setManualTeamA(e.target.value); setManualPlayerA(""); }}>
                        {TEAM_NAMES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select className="vpll-select" style={{ marginTop: 6 }} value={manualPlayerA} onChange={(e) => setManualPlayerA(e.target.value)}>
                        <option value="">Select player…</option>
                        {PLAYERS_RAW[manualTeamA].map((p) => <option key={p[0]} value={p[0]}>{p[0]} ({POS_NAME[p[1]]}, OVR {p[4]})</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="vpll-team-name-row" style={{ marginBottom: 6 }}><TeamLogo teamName={manualTeamB} size={24} /></div>
                      <select className="vpll-select" value={manualTeamB} onChange={(e) => { setManualTeamB(e.target.value); setManualPlayerB(""); }}>
                        {TEAM_NAMES.filter((t) => t !== manualTeamA).map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select className="vpll-select" style={{ marginTop: 6 }} value={manualPlayerB} onChange={(e) => setManualPlayerB(e.target.value)}>
                        <option value="">Select player…</option>
                        {PLAYERS_RAW[manualTeamB].map((p) => <option key={p[0]} value={p[0]}>{p[0]} ({POS_NAME[p[1]]}, OVR {p[4]})</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="vpll-controls-row">
                    <button className="vpll-btn secondary" onClick={executeManualTrade} disabled={!manualPlayerA || !manualPlayerB}>Execute Trade</button>
                    {manualTradeMsg && <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--ink-soft)" }}>{manualTradeMsg}</span>}
                  </div>
                </div>

                {/* 6. Team Rating Progression (runs last, after all roster transactions) */}
                <div className="vpll-week-block">
                  <div className="vpll-week-label">6. Team Rating Progression</div>
                  {!offseason.progression ? (
                    <button className="vpll-btn" onClick={runProgressionStep} disabled={offseasonBusy || !offseason.trades}>
                      {offseasonBusy ? "Running…" : "Apply Progression"}
                    </button>
                  ) : (
                    <>
                      <div className="vpll-info-banner">
                        Team ratings updated based on Year {yearNumber} performance, roster composition, and player development.
                        {offseason.progression.developments && offseason.progression.developments.length > 0 && ` ${offseason.progression.developments.filter(d => d.hit).length} players improved, ${offseason.progression.developments.filter(d => !d.hit).length} stagnated or declined.`}
                      </div>
                      {offseason.progression.results.sort((a, b) => b.delta - a.delta).map((r, i) => (
                        <div className="vpll-game-row" key={i}>
                          <span className="matchup vpll-team-name-row"><TeamLogo teamName={r.team} size={18} /> {r.team}{r.tagChanged ? ` — ${r.oldTag} → ${r.newTag}` : ""}</span>
                          <span className="played">{r.oldScore} → {r.newScore} ({r.delta > 0 ? "+" : ""}{r.delta})</span>
                        </div>
                      ))}
                      {offseason.progression.developments && offseason.progression.developments.length > 0 && (
                        <>
                          <div className="vpll-progress-label" style={{ margin: "12px 0 4px" }}>Player Development</div>
                          {offseason.progression.developments.slice(0, 15).map((d, i) => (
                            <div className="vpll-game-row" key={i}>
                              <span className="matchup vpll-team-name-row"><TeamLogo teamName={d.team} size={18} /> {d.name} ({d.team})</span>
                              <span className="played">{d.from} → {d.to} {d.hit ? "📈" : "📉"}</span>
                            </div>
                          ))}
                          {offseason.progression.developments.length > 15 && <div style={{ fontSize: 11, color: "var(--ink-soft)", fontFamily: "JetBrains Mono, monospace", padding: "4px 12px" }}>...and {offseason.progression.developments.length - 15} more</div>}
                        </>
                      )}
                    </>
                  )}
                </div>

                {allOffseasonStepsComplete && (
                  <div className="vpll-controls-row" style={{ marginTop: 20 }}>
                    <button className="vpll-btn" onClick={beginYear2}>Begin Year {yearNumber + 1}</button>
                  </div>
                )}
              </>
            )}

            {yearHistory.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div className="vpll-section-label">League History</div>
                {yearHistory.slice().reverse().map((h, i) => (
                  <div className="vpll-history-item" key={i} style={{ marginBottom: 6 }}>
                    <span className="vpll-team-name-row">Year {h.year}: Corkum — <TeamLogo teamName={h.corkumChampion} size={18} /> {h.corkumChampion} · Culkin — <TeamLogo teamName={h.culkinChampion} size={18} /> {h.culkinChampion}</span>
                    <span className="vpll-history-score vpll-team-name-row">Cup: <TeamLogo teamName={h.cupChampion} size={18} /> {h.cupChampion}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px dashed var(--line)" }}>
              <div className="vpll-section-label">League Save</div>
              <div className="vpll-info-banner">
                Everything lives in this browser's local storage — clearing it, switching browsers, or moving to a
                new device loses the league for good. Export a backup file any time; import one to restore it (this
                overwrites whatever's currently loaded).
              </div>
              <div className="vpll-controls-row">
                <button className="vpll-btn secondary" onClick={exportLeagueSave}>Export League Save</button>
                <button className="vpll-btn secondary" onClick={() => importFileInputRef.current?.click()}>Import League Save…</button>
                <input
                  ref={importFileInputRef} type="file" accept="application/json,.json"
                  style={{ display: "none" }} onChange={handleImportFileChosen}
                />
              </div>
              {importError && <div className="vpll-press-error" style={{ marginTop: 10 }}>{importError}</div>}
              {confirmImport && pendingImport && (
                <div className="vpll-info-banner" style={{ borderColor: "var(--barn)", marginTop: 10 }}>
                  Importing this file replaces the entire league currently loaded — every team rating, coach,
                  roster, season, and history entry — with what's in the file
                  {pendingImport.exportedAt ? ` (exported ${new Date(pendingImport.exportedAt).toLocaleString()})` : ""}.
                  The page will reload to apply it.
                  <div className="vpll-controls-row" style={{ marginTop: 10 }}>
                    <button className="vpll-btn" style={{ background: "var(--barn)", color: "var(--white)" }} onClick={confirmImportLeagueSave}>Yes, Import &amp; Replace</button>
                    <button className="vpll-btn secondary" onClick={cancelImportLeagueSave}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px dashed var(--line)" }}>
              <div className="vpll-section-label">Danger Zone</div>
              {!confirmReset ? (
                <button className="vpll-btn secondary" onClick={() => setConfirmReset(true)}>Reset League to Year 1</button>
              ) : (
                <div className="vpll-info-banner" style={{ borderColor: "var(--barn)" }}>
                  This wipes every team rating, coach, roster, contract, and season back to the original Year 1 embedded state — all progression, trades, drafts, and history are gone for good.
                  <div className="vpll-controls-row" style={{ marginTop: 10 }}>
                    <button className="vpll-btn" style={{ background: "var(--barn)", color: "var(--white)" }} onClick={resetLeagueToYear1}>Yes, Reset Everything</button>
                    <button className="vpll-btn secondary" onClick={() => setConfirmReset(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "pressbox" && (
          <section>
            <div className="vpll-section-label">Generate a Game Recap</div>
            {pressGameOptions.length === 0 ? (
              <div className="vpll-empty">No games on the wire yet. Simulate some season or playoff games and the beat writers will get to work.</div>
            ) : (
              <>
                <div className="vpll-controls-row">
                  <select className="vpll-select" style={{ maxWidth: 480 }} value={pressSelection} onChange={(e) => setPressSelection(e.target.value)}>
                    <option value="">Select a played game…</option>
                    {pressGameOptions.map((grp) => (
                      <optgroup key={grp.group} label={grp.group}>
                        {grp.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="vpll-controls-row">
                  <div className="vpll-toggle-group">
                    {["VPLL.com", "The Mesh", "The X"].map((o) => (
                      <button key={o} className={`vpll-toggle-btn ${pressOutlet === o ? "active" : ""}`} onClick={() => setPressOutlet(o)}>{o}</button>
                    ))}
                  </div>
                  <button className="vpll-btn" onClick={generateGameRecap} disabled={pressGenerating || !pressSelection}>
                    {pressGenerating ? "Writing…" : "Write the Story"}
                  </button>
                </div>
              </>
            )}

            {(seasons.corkum || seasons.culkin) && (
              <>
                <div className="vpll-section-label" style={{ marginTop: 24 }}>Week in Review</div>
                <div className="vpll-controls-row">
                  <div className="vpll-toggle-group">
                    <button className={`vpll-toggle-btn ${weekReviewSeasonType === "corkum" ? "active" : ""}`} onClick={() => setWeekReviewSeasonType("corkum")} disabled={!seasons.corkum}>Corkum</button>
                    <button className={`vpll-toggle-btn ${weekReviewSeasonType === "culkin" ? "active" : ""}`} onClick={() => setWeekReviewSeasonType("culkin")} disabled={!seasons.culkin}>Culkin</button>
                  </div>
                  <button className="vpll-btn secondary" onClick={generateWeekInReview} disabled={pressGenerating || latestCompletedWeek(weekReviewSeasonType) === null}>
                    {pressGenerating ? "Writing…" : latestCompletedWeek(weekReviewSeasonType) ? `Write Week ${latestCompletedWeek(weekReviewSeasonType)} Recap` : "No completed week yet"}
                  </button>
                </div>
              </>
            )}

            {bothTrophiesDecided && (offseason.draft || offseason.coaching || offseason.retirement || offseason.progression) && (
              <>
                <div className="vpll-section-label" style={{ marginTop: 24 }}>Offseason Coverage</div>
                <div className="vpll-controls-row">
                  <button className="vpll-btn secondary" onClick={generateHotStoveColumn} disabled={pressGenerating}>
                    {pressGenerating ? "Writing…" : "Generate Hot Stove Column"}
                  </button>
                </div>
              </>
            )}

            {pressError && <div className="vpll-press-error">{pressError}</div>}

            {pressArchive.length > 0 && (
              <>
                <div className="vpll-section-label" style={{ marginTop: 24 }}>The Archive</div>
                {pressArchive.map((a, i) => <Article key={a.timestamp || i} article={a} />)}
              </>
            )}
            {pressArchive.length === 0 && !pressError && (
              <div className="vpll-empty" style={{ marginTop: 20 }}>Nothing in the archive yet. Every article generated here gets filed away.</div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
