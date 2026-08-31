# VPLL Free Agency — Tier System & Market Dynamics Spec

For implementation in `runFreeAgencyStep()` and related functions in the VPLL simulation
engine. This extends the existing contract/motivation system already in place — it does not
replace it. Existing mechanics to preserve: the `S`/`R`/`F`/`J` contract types, the
Loyalist/Mercenary/Winner motivation split, `assignNewContract()`'s overall-based salary bands,
`rankTeamsForPlayer()`'s need/room matching, and `capFine()`'s tiered overage penalties.

---

## 1. Free Agent Tiers

Anchor tiers to `p[4]` (overall) and `p[5]` (star flag), consistent with the salary bands
already in `baseSalaryFromOverall()`.

| Tier | Criteria | Behavior |
|---|---|---|
| **1 — Franchise** | Star flag = 1 AND overall ≥ 85 | Rare. Should generate real bidding tension — multiple qualifying teams competing, not a single greedy match. Signing/losing one should be Hot Stove headline material. Motivation should skew Mercenary/Winner (see §3), not the flat league-wide split. |
| **2 — Quality Starter** | Overall 75-84, any star flag | The real competitive market. Multiple teams with room + need should plausibly be "in on" the same player — this is where genuine bidding-war logic matters most. |
| **3 — Rotational** | Overall 62-74 | Moves on fit/need more than glamour. Should skew Loyalist by default — mostly quiet re-signs, occasional need-driven pickup. |
| **4 — Journeyman** | Overall < 62 | Minimum-deal territory. Mostly re-signs cheap or gets released outright (current behavior here is already reasonable — no major change needed). |

**Implementation note:** compute tier as a derived value at the point a contract expires,
not stored on the player — it should always reflect current overall (which can shift via
`developPlayer()` year to year), not overall at draft/signing time.

---

## 2. Position Scarcity Premium

Three positions are structurally rarer/more specialized than the rest of a 25-man roster and
should command market interest above what their raw overall alone would suggest:

| Position | Roster share | Why it's scarce |
|---|---|---|
| **Goalie (`G`)** | 3 of 25 | Whole-game specialist, one starter dominates minutes |
| **FOGO (`F`)** | 2 of 25 | Smallest position group on the roster — pure specialists, faceoff win rate is a distinct skill few players carry |
| **Long-Stick Midfield (`L`)** | 2 of 25 | Dual defensive/transition role, hard to replace like-for-like |

A Tier 2 player at any of these three should generate market interest closer to Tier 1.

**Suggested implementation:** apply a scarcity multiplier to the team's `needScore` calculation
in `rankTeamsForPlayer()`:
```js
const SCARCE_POSITIONS = { G: 1.4, F: 1.4, L: 1.35 };
needScore *= SCARCE_POSITIONS[pos] || 1.0;
```
A smaller multiplier should also apply to the effective tier-for-bidding-purposes calculation,
so e.g. a 78-overall faceoff specialist behaves market-wise more like an 82-84 overall
attackman. FOGO and Goalie get the strongest multiplier since their roster share (2-3 spots)
is smaller than LSM's effective offensive-line-adjacent flexibility.

---

## 3. Star-Biased Motivation Assignment

Currently every expiring player gets motivation from the same flat distribution (55% Loyalist,
25% Mercenary, 20% Winner — see `pickMotivation()`). Replace with a distribution that shifts by
tier, since a true star has real leverage that a role player doesn't:

| Tier | Loyalist | Mercenary | Winner |
|---|---|---|---|
| 1 — Franchise | 35% | 35% | 30% |
| 2 — Quality Starter | 50% | 30% | 20% |
| 3 — Rotational | 65% | 20% | 15% |
| 4 — Journeyman | 80% | 10% | 10% |

Keep the existing per-motivation re-sign chances and market-ranking logic in
`reSignChance()` / `rankTeamsForPlayer()` — only the *assignment* distribution changes.

---

## 4. Additional Signing Influences

Two new signals to fold into the re-sign chance and/or market ranking, alongside the existing
age/leadership/team-record factors:

- **Homegrown bonus.** The roster generator already tracks hometown-matches-team for flavor
  (~55% of players are "homegrown"). If that data is still recoverable/inferable at free agency
  time, a homegrown player should get a re-sign chance bump (+10-15%) regardless of motivation
  type — loyalty to the hometown team is a real pull even for Mercenaries.
- **Coach fit, not just team success.** The archetype-fit mechanic already used for trade-demand
  detection (`HC_TAG_FIT`, checked in `identifyUnhappyStars()`) should also feed free agency:
  a player on a team where the coach archetype *fits* the roster tag gets a re-sign bump even
  if the team's record is mediocre; a mismatch should hurt re-sign odds even on a good team.
  Reuse the existing fit-check logic rather than duplicating it.

---

## 5. Salary Cap Pressure & Luxury Tax Avoidance

This is the mechanism that should generate the most *involuntary* roster movement — not
players choosing to leave, but teams choosing not to keep them because the cap math doesn't
work. It plugs directly into the existing `capFine()` tier structure:

```
0-5% over cap    → no fine (safe zone)
5-10% over cap   → 25% of overage
10-20% over cap  → 50% of overage
20-30% over cap  → 100% of overage
30%+ over cap    → 200% of overage + Commissioner review
```

**Core idea:** teams should behave like they can see these thresholds coming and actively
manage against them, the way real front offices avoid luxury tax aprons.

- **Re-sign reluctance scales with projected cap position, not just current room.** Before
  deciding whether to re-sign an expiring player, project `teamPayroll(team) + newContractAAV`
  against the tier boundaries above. A re-sign that would push a team from the safe zone into
  a 10%+ fine tier should see its `reSignChance` reduced sharply — not blocked outright (teams
  do sometimes pay the tax for a player worth it, especially Tier 1s), but meaningfully less
  likely, scaled by how far over the next threshold the signing would push them.
- **Teams already in a fine tier should actively shed salary.** A team currently paying a
  luxury fine (payroll already >105% of cap) should have a standing bias in the trade engine
  toward moving out expensive, replaceable contracts even without a specific need-based match
  driving it — a "salary dump" trade motivation distinct from the existing need/surplus and
  unhappy-star triggers. Suggested: add a third trigger type to `runTradeEngine()` alongside
  unhappy-star trades and complementary-need trades — teams with `capFine(teamPayroll(t)) > 0`
  get a bonus chance to initiate a trade prioritizing their highest-AAV movable player,
  even at a below-market return, since the fine itself is the cost being avoided.
- **Market-wide cap tightness should dampen aggressive bidding league-wide.** Compute
  `avgCapRoom = mean(SALARY_CAP - teamPayroll(t) for all t)` each offseason. When this is low
  (most teams tight to the cap), scale down the Mercenary-branch weighting in
  `rankTeamsForPlayer()` — fewer teams can actually afford to chase a big contract, so outcomes
  should skew toward more Loyalist-style stay-home signings even for players who rolled
  Mercenary, and toward more teams passing entirely on Tier 1/2 bidding wars.
- **This should be a real Hot Stove storyline, not just background math.** A team dumping a
  quality player purely for cap reasons ("forced to move a fan favorite to duck the luxury
  tax") is exactly the kind of financially-driven drama the league's resort-town/big-market
  cap-violator narrative already leans into — worth surfacing explicitly in
  `buildHotStovePrompt()`'s context once this trigger exists, distinct from a needs-based or
  star-demanded trade.

---

## Summary of concrete code touchpoints

- `pickMotivation()` → needs tier-aware distribution (§3)
- `rankTeamsForPlayer()` → needs position scarcity multiplier (§2), homegrown/coach-fit
  signals (§4), projected-cap-position dampening (§5), and league-wide cap-tightness scaling (§5)
- `reSignChance()` → needs homegrown/coach-fit bump (§4) and projected-cap-position penalty (§5)
- `runTradeEngine()` → needs a third trigger type for salary-dump trades from teams already
  paying a luxury fine (§5), alongside the existing unhappy-star and complementary-need triggers
- New: a `freeAgentTier(player)` helper computing tier from current overall + star flag (§1),
  called wherever tier-dependent behavior is needed rather than inlining thresholds repeatedly
- New: a `projectedCapFine(team, additionalAAV)` helper for pre-signing cap-impact checks (§5)
- `buildHotStovePrompt()` → future hooks for surfacing expiration-wave storylines (§5, prior
  draft) and cap-driven salary dump stories (§5), once history tracking supports the former

---

## 6. Tier Mobility — Current State & the Stats Dependency

Everything above assumes a player's tier (§1) reflects real, earned performance. Worth being
precise about how much of that is actually true today, because it's less than it sounds like.

### What actually moves a player's overall right now

Only `developPlayer()`, and it's narrower than it might appear:

- It only runs for players with a stored `ceiling` (`p[12]`) — which is **only draft picks**.
  An established/embedded player has no ceiling stored and is permanently excluded from this
  function (the gap check returns immediately).
- It only runs while the player is **26 or younger**. Past that, development stops entirely
  regardless of ceiling gap.
- Each eligible year, it's a coin flip weighted by the team's coach Development rating: either
  a step toward the stored ceiling (hit) or a small flat/negative nudge (bust/stagnation).

This is real tier mobility, but it's about a prospect fulfilling or missing *drafted
potential* — a predetermined outcome being revealed over time — not about performance in
games actually simulated that season.

### Two real gaps

1. **Veterans never move.** A 28-year-old established player has a static `overall` forever,
   aside from the league-wide `pullRatingsTowardRoster()` effect — and that adjusts the
   *team's* subcategory ratings, not the player's own number. There is currently no breakout
   mechanic for an established player and no decline curve for anyone once they age out of the
   26-and-under development window. A veteran having a career year, or aging into a decline,
   are both invisible to the simulation right now.

2. **Star flag (`p[5]`) is permanent.** Set once at generation or draft (all draftees start at
   `0`) and never changes afterward. A non-star can't break out into one; an aging star can't
   decline out of it. Since Tier 1 in §1 requires the star flag, this is a hard ceiling on tier
   mobility as currently specified — a player who should plausibly be a Tier 1 free agent by
   age 30 based on a great run of seasons has no path there if they didn't start with the flag.

### Why this can't really be fixed yet

Genuine performance-driven movement needs an actual performance signal to drive it — goals,
assists, maybe a plus/minus by game — and that's exactly the season-long stat tracking system
that's been explicitly deferred pending its own design conversation. Without it, "performance"
can only mean "did the dice roll toward or away from a stored ceiling," which is a development
mechanic wearing performance's clothes, not real merit-based movement.

**This section is a marker, not a spec** — don't implement against it yet. Once season-long
stat tracking exists, revisit tier mobility with:

- **A breakout check for any player**, not just draftees — a season's stats significantly
  outperforming what current `overall` would predict should create a real chance to jump a
  tier, independent of any pre-set ceiling.
- **A genuine aging curve for veterans** — gradual decline starting somewhere around age 30-32,
  rather than a flat `overall` forever once the current development window closes.
- **A dynamic star flag** — earned by sustained multi-year performance rather than fixed at
  creation/draft, and capable of being lost the same way through sustained decline.

Until then, treat every tier assignment in §1 as accurate at the moment a player was
created/drafted, drifting only via the narrow draft-pick development path above — not as a
living reflection of how they're actually playing.
