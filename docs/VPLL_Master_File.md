# VPLL MASTER FILE
## Vermont Professional Lacrosse League
### Master Simulation & League Document

This document is the single source of truth for all VPLL simulation mechanics, league structure, team profiles, and narrative systems. All interactions are probabilistic tendencies, not hard rules. Update this document whenever new decisions are made.

---

## FRAMING LINE FOR ENGINE CHATS

> "The following is the complete VPLL Master File — the single source of truth for all simulation mechanics, league structure, and narrative systems. All interactions are probabilistic tendencies, not hard rules. Roster tags modify how reliably teams express their trait tendencies. Use this as the foundation for all simulation decisions going forward."

---

## 1. LEAGUE STRUCTURE

### 1.1 Conferences, Regions & Divisions

The VPLL operates two conferences, each divided into two regions, each region containing two divisions.

**LAKESHORE CONFERENCE**

**North Region:**
- Coastal Division
- Metro West Division

**South Region:**
- Metro East Division
- County Division

**MOUNTAINSIDE CONFERENCE**

**North Region:**
- Kingdom Division
- Capital Division

**South Region:**
- River Division
- Shire Division

### 1.2 Teams by Division

**Lakeshore — Coastal:** Saint Albans Dawnlanders, Milton Machine, Grand Isle Heroes, Missisquoi Bay Muskies

**Lakeshore — Metro West:** Colchester Gryphons, Queen City Battery, North End Horsemen, Onion River Predators

**Lakeshore — Metro East:** Essex Railroaders, South Burlington Aviators, Williston Lynx, Jericho Stags

**Lakeshore — County:** Fair Haven Tycoons, Charlotte Navigators, Shelburne Reapers, Middlebury RiverWolves

**Mountainside — Kingdom:** Jay StormKings, Saint Johnsbury Dinos, Enosburg Owls, Newport Spirits

**Mountainside — Capital:** Stowe Smugglers, Rutland Cryptids, Barre Carvers, Montpelier Congress

**Mountainside — River:** Ludlow Shepherds, Windsor Independents, Woodstock Boilers, Springfield Hardshells

**Mountainside — Shire:** Hartford Bulls, Brattleboro Pioneers, Manchester Black Bears, Bennington Prowlers

### 1.3 Seasons & Trophies

- VPLL Outdoor Season — field lacrosse — **Corkum Trophy**
- VPLL Indoor Season — box lacrosse — **Culkin Trophy**
- Combined points across both seasons determine the **Commissioners Cup** champion
- All temporal references use Year 1, Year 2, etc. — no real-world years

### 1.4 Season Format

- 16 games per season over 13 weeks (NFL-style scheduling formula)
- Week 7 — Interconference Week (includes All-Star Game)
- Week 12 — second Interconference Week
- Week 13 — division/conference rivalry and playoff positioning games

### 1.5 All-Star Game

- Two All-Star games per year: one per season
- Matchup: Lakeshore All-Stars vs Mountainside All-Stars
- Outdoor All-Star Game: played during Interconference Week (Week 7) of Corkum season
- Indoor All-Star Game: played during Interconference Week (Week 7) of Culkin season
- Winning conference earns home field advantage in that season's Trophy Final
- Starters voted in by fans, reserves selected by coaches
- Every team must have minimum one representative
- All-Star MVP becomes a league-wide narrative moment
- Multi-year All-Star winning streak creates psychological edge heading into Trophy Finals

### 1.6 The Commissioner

- Referred to simply as "the Commissioner" — no name, no backstory needed
- Very professional — only weighs in when necessary, always focused on the league itself
- Never takes sides in rivalries or disputes
- Never comments on individual player performance or specific teams with favoritism
- Trophy presentations: measured, gracious, focused on the league's growth
- Disciplinary announcements: firm, brief, no editorializing
- Davidson Award presentation: the one moment he allows something close to warmth
- When the Commissioner speaks it carries weight precisely because he says so little

### 1.7 Franchise Stability

- 32 teams is the established footprint — no expansion planned
- Contraction unlikely but not impossible
- Relocation possible but rare and significant narrative event
- Ownership changes can trigger rebrands — requires Commissioner approval
- Rebrands carry over ratings, roster tag, and rivalry history — the team is the same, the identity shifts

---

## 2. PLAYOFF STRUCTURE & SEEDING

### 2.1 Qualification

- 12 of 16 teams per conference qualify
- 4 division winners receive first round bye
- 8 wild card spots filled by remaining teams by overall record

### 2.2 Bracket Structure (per conference)

```
Round 1 (Cross-Division Wild Card):
  Division A #2 vs Division B #3
  Division B #2 vs Division A #3

Round 2 (Regional Semifinal):
  Division A Winner vs Round 1 winner (cross-division)
  Division B Winner vs Round 1 winner (cross-division)

Round 3 (Regional Final):
  North Regional Winner vs South Regional Winner

Conference Final:
  North Winner vs South Winner

Trophy Final (best of 3):
  Lakeshore Champion vs Mountainside Champion
```

### 2.3 Tiebreaker Order (two teams)

1. Overall Record
2. Conference Record
3. Head to Head
4. Goal Differential

### 2.4 Three-Way Tie

1. Head to Head record among tied teams
2. Goal Differential among tied teams only
3. Overall Goal Differential

### 2.5 Trophy Final OT Momentum Carry

- Winning team gets Clutch/Consistency bump next game
- Probability of carry: 60%
- Magnitude: +5 Clutch and Consistency for winner, -5 for loser
- Double OT+: 75% chance of carry
- Veteran Led: 80% chance of carry
- Young & Inexperienced: 45% chance of carry
- Rebuilding: 50/50

### 2.6 Trophy Final Home Field

- Games 1 and 3 hosted by conference that won the All-Star Game
- Game 2 hosted by opposing conference
- Gives the All-Star Game real stakes all the way through the Trophy Final

---

## 3. RATING ARCHITECTURE

### 3.1 Subcategory-Built Ratings

These parent ratings are derived from weighted subcategories. All probabilistic tendencies, not hard rules.

```
Faceoff = (Clamping x 0.70) + (Consistency x 0.30)

Offense = (Possession x 0.30) + (Pace x 0.30) + (Power Play x 0.20) + (Risk x 0.20)

Defense = (Positioning x 0.30) + (Pressure x 0.30) + (Penalty Kill x 0.20) + (Risk x 0.20)

Goalie = (Stopping x 0.40) + (Consistency x 0.40) + (Passing x 0.20)

Transition = (Defensive Pressure x 0.05) + (Defensive Risk x 0.05) + (Faceoff x 0.10)
           + (Offensive Pace x 0.05) + (Offensive Risk x 0.05) + (Riding x 0.30)
           + (Clearing x 0.30) + (Goalie x 0.10)
```

### 3.2 Standalone Ratings

- Power Play
- Penalty Kill
- Clutch
- Consistency
- Riding
- Clearing

### 3.3 Independent Subcategory Values

- Offensive Possession, Offensive Pace, Offensive Risk
- Defensive Positioning, Defensive Pressure, Defensive Risk
- Faceoff Clamping, Faceoff Consistency
- Goalie Stopping, Goalie Consistency, Goalie Passing

### 3.4 Modifiers

- Indoor/Outdoor Balance (1-10 scale): 1 = field lacrosse specialist, 5 = neutral, 10 = box lacrosse specialist
- 2-point shots factor into Offensive Risk and Goalie Consistency

---

## 4. MATCHUP INTERACTION WEB

All interactions are probabilistic tendencies. Roster tags can modify any of them.

### Offensive Possession
- Exploits → high Defensive Risk
- Struggles against → high Defensive Pressure
- Amplified by → Veteran Led
- Undermined by → Young and Inexperienced
- Skews → outdoor

### Offensive Pace
- Exploits → high Defensive Risk
- Exploits → low Goalie Consistency
- Struggles against → high Defensive Positioning
- Struggles against → high Offensive Possession (opponent controlled)
- Struggles against → high Faceoff (opponent controlled)
- Amplified by → overall Transition rating
- Neutral → Indoor/Outdoor Balance

### Offensive Risk
- Exploits → low Goalie Consistency (2-point shots)
- Exploits → high Defensive Pressure
- Struggles against → high Defensive Positioning
- Struggles against → high Goalie Stopping
- Amplified by → Veteran Led, Star Dependent, Deep Roster
- Amplified by → Rebuilding/Unknown Identity (inconsistently)
- Undermined by → Young and Inexperienced
- Generates → penalties (feeds opponent Power Play)
- Generates → turnovers (feeds opponent Transition and Riding)

### Defensive Positioning
- Neutralizes → high Offensive Pace (half court)
- Neutralizes → high Offensive Risk
- Struggles against → high Offensive Possession
- Overwhelmed by → high Offensive Pace + high Transition combined
- Amplified by → Veteran Led, Deep Roster
- Undermined by → Young and Inexperienced
- Skews → outdoor

### Defensive Pressure
- Exploits → low Offensive Possession
- Exploits → Young and Inexperienced offenses
- Exploits → Rebuilding/Unknown Identity offenses
- Struggles against → high Offensive Possession
- Struggles against → Veteran Led and Deep Roster offenses
- Generates → turnovers (feeds Transition and Riding)
- Generates → penalties (feeds opponent Power Play)
- Amplified by → Veteran Led, Star Dependent
- Undermined by → Young and Inexperienced
- Skews → indoor

### Defensive Risk
- Exploits → low Offensive Possession
- Exploits → high Offensive Risk (mutual chaos)
- Exploits → Young and Inexperienced offenses
- Struggles against → high Offensive Possession, high Offensive Pace
- Struggles against → Veteran Led offenses
- Generates → big turnover opportunities when successful
- Generates → penalties especially against Veteran Led and Deep Roster offenses
- Less likely to generate penalties against Young & Inexperienced, Rebuilding
- Amplified by → Star Dependent, Rebuilding (inconsistently)
- Undermined by → Young and Inexperienced
- Skews → indoor

### Power Play
- Exploits → high Defensive Risk (more penalties drawn)
- Exploits → high Defensive Pressure (aggressive teams foul more)
- Exploits → low Penalty Kill
- Amplified by → Veteran Led, Star Dependent
- Amplified by → high Offensive Possession, high Offensive Risk (2-point threats)
- Undermined by → Young and Inexperienced

### Penalty Kill
- Exploits → low Offensive Risk (conservative power plays are killable)
- Exploits → Star Dependent power plays (take away the star)
- Struggles against → high Offensive Possession
- Struggles against → high Offensive Risk (2-point threats stretch the unit)
- Amplified by → Veteran Led, Deep Roster
- Undermined by → Young and Inexperienced

### Riding
- Exploits → low Clearing, low Goalie Passing
- Exploits → Young and Inexperienced, Rebuilding/Unknown Identity
- Struggles against → high Clearing, high Goalie Passing, Veteran Led
- Amplified by → high Defensive Pressure, high Transition
- Feeds → Offensive Pace and Transition when successful
- Skews → outdoor

### Clearing
- Exploits → low Riding, high Defensive Risk (gaps in ride scheme)
- Amplified by → high Goalie Passing, Veteran Led, Deep Roster
- Undermined by → Young and Inexperienced
- Feeds → Offensive Pace and Transition when successful
- Skews → outdoor

### Clutch
- Amplified by → Veteran Led, Star Dependent
- Undermined by → Young and Inexperienced, Rebuilding/Unknown Identity
- Interacts with → Goalie Consistency, Faceoff, Power Play/Penalty Kill
- Variance modifier — weight increases as game tightens and clock runs down

### Consistency
- Amplified by → Veteran Led
- Undermined by → Star Dependent, Young and Inexperienced
- Variance modifier — acts as floor/ceiling regulator on all other ratings

### Indoor/Outdoor Balance Interactions
- Skews Outdoor (1-4): Offensive Possession, Defensive Positioning, Riding, Clearing
- Neutral (5): Offensive Pace
- Skews Indoor (6-10): Defensive Pressure, Defensive Risk, Goalie Passing, Star Dependent rosters
- Possession teams punished by box lacrosse shot clock and tight quarters
- Star Dependent teams more dangerous indoors (harder to contain in small space)

---

## 5. SIMULATION MECHANICS

### 5.1 Indoor/Outdoor Balance

Outdoor ratings are the baseline. Indoor ratings calculated as:

```
Indoor Rating = Outdoor Rating x (1 + Balance Modifier)

Balance 1  → -20% indoors
Balance 2  → -16% indoors
Balance 3  → -12% indoors
Balance 4  → -8%  indoors
Balance 5  →  0%  indoors (baseline carries over)
Balance 6  → +4%  indoors
Balance 7  → +8%  indoors
Balance 8  → +12% indoors
Balance 9  → +16% indoors
Balance 10 → +20% indoors
```

EXCEPTION: Faceoff rating carries over unchanged regardless of Balance modifier

### 5.2 Scoring Formula

```
Final Score = Base Goals
            + Transition Goals
            + Riding Advantage
            + Faceoff Bonus
            + Power Play Goals
            - Opponent Power Play Goals
            + 2-Point Goals
            +/- Variance
```

```
Base Goals = 8 + ((Offense - Opponent Defense) / 10)

Transition Goals = (Team Transition - Opponent Transition) / 15
Riding Advantage = (Team Riding - Opponent Clearing) / 25
                 + (Opponent Offensive Risk - Team Defensive Risk) / 30
                 + (Team Riding - Opponent Goalie Passing) / 30

Faceoff Bonus = (Team Faceoff - Opponent Faceoff) / 20

Power Play Goals = (Team Power Play x Opponent Penalty Generation) / 100

Variance = +/- 1-3 goals weighted by (100 - Consistency) / 100
           High Consistency → variance closer to +/-1
           Low Consistency → variance closer to +/-3
```

- Scoring range: 8-16 goals expected band outdoors, games can fall below or above
- No floor on scoring — a 0 is possible but extremely rare

### 5.3 2-Point Shot System

```
Attempt Frequency:
  Offensive Risk 80+   → frequent 2-point attempts
  Offensive Risk 60-79 → occasional
  Offensive Risk below 60 → rare
```

```
2-Point Conversion = Offensive Risk + (100 - Goalie Consistency)
                   + (100 - Defensive Positioning) + (100 - Defensive Pressure) / 4
```

```
Missed 2-Point Attempt → Transition Trigger:
  Probability of opponent capitalizing = (Opponent Transition + Opponent Riding) / 2
  If capitalized → standard 1 goal added to opponent score
```

Net swing on a single possession: +2 if converted, -1 if missed and opponent capitalizes

### 5.4 OT and Close Game Logic

```
Structure:
  Regulation → if tied → 10 minute sudden death periods
  Repeat until goal scored
  Applies to: regular season, playoffs, both outdoor and indoor
  No shootouts, no ties
```

```
Close Game Definition:
  Within 3 goals → Clutch begins influencing
  Within 1 goal  → Clutch is dominant factor
  OT             → Clutch is primary resolver
```

```
OT Goal Probability = Base Chance
                    + (Team Clutch - Opponent Clutch) / 10
                    + (Team Faceoff - Opponent Faceoff) / 20
                    + (100 - Opponent Goalie Consistency) / 25
                    +/- Roster Tag Modifier
```

```
Roster Tag OT Modifiers:
  Veteran Led           → +10% to Clutch in OT
  Star Dependent        → +7%  to Clutch in OT
  Deep Roster           → +5%  to Clutch in OT
  Rebuilding            → -7%  to Clutch in OT
  Young & Inexperienced → -10% to Clutch in OT
```

```
Streak Modifier in OT:
  Win streak 3+    → +5 to Clutch and Consistency in OT
  Win streak 5+    → +8 to Clutch and Consistency in OT
  Losing streak 3+ → -5 to Clutch and Consistency in OT
  Losing streak 5+ → -8 to Clutch and Consistency in OT
```

- Veteran Led → amplified momentum carry
- Young & Inexperienced → streaks matter less, variance overrides
- Star Dependent on streak → +10 to Clutch in OT

### 5.5 Home Field Advantage

```
Outdoor Home Advantage:
  Home Team → +3 to Clutch and Consistency
            → +2 to Transition
            → +2 to Goalie Passing
  Road Team → -2 to Clutch and Consistency
            → -1 to Transition
```

```
Indoor Home Advantage (General):
  Home Team → +5 to Clutch and Consistency
            → +4 to Transition
            → +3 to Goalie Passing
  Road Team → -3 to Clutch and Consistency
            → -2 to Transition
```

```
Indoor Q2 and Q4 Longer Shift Modifier:
  Home Transition         → additional +6
  Road Transition         → additional -4
  Road Riding effectiveness → reduced by 15%
  Home Clearing           → +5 boost
```

```
Roster Tag Home/Away Modifiers:
  Veteran Led           → home boost 50%, road debuff 25%
  Star Dependent        → home boost amplified +3, road debuff amplified +2
  Young & Inexperienced → home boost full, road debuff 150%
  Rebuilding            → 50% of all modifiers
  Deep Roster           → road debuff 50%
```

### 5.6 Schedule Fatigue

```
Two games in same week → fatigue penalty on second game:
  -3 to Transition
  -3 to Defensive Pressure
  -2 to Offensive Pace
  Variance increased by 10%
```

```
Roster Tag Fatigue Interactions:
  Deep Roster           → fatigue penalty reduced by 50%
  Veteran Led           → fatigue penalty increased by 25%
  Young & Inexperienced → fatigue penalty reduced by 25%
  Star Dependent        → fatigue penalty increased on star-driven ratings
```

### 5.7 Injury System

```
Base Trigger Probability: 3-5% per game
```

```
Increased by:
  High Offensive Risk
  High Defensive Pressure/Risk
  Indoor games (tighter space, more contact)
  Fatigue state (second game of the week)
```

```
Decreased by: Deep Roster
Severity Distribution (once triggered):
  60% — Minor (misses that game only, small rating dip)
  25% — Moderate (1-3 games missed, moderate rating dip)
  12% — Significant (4-8 games missed, real impact)
  3%  — Season-ending (major narrative moment)
```

```
Impact Scaling by Roster Tag:
  Deep Roster           → impact reduced by 40%
  Veteran Led           → impact reduced by 15%
  Young & Inexperienced → impact increased by 15%
  Rebuilding            → impact increased by 10%
  Star Dependent        → impact increased by 30% if injury hits the engine
```

---

## 6. ROSTER TAGS & NUMERICAL MODIFIERS

### Veteran Led
- Variance reduced by 15%
- Clutch +10 in close games and OT
- Consistency floor raised by 10
- Progression — slow, stable, gradual decline after peak
- Road debuff reduced to 25%
- Streak amplification moderate
- OT Clutch modifier +10%
- Trophy Final OT momentum carry — 80% chance
- Fatigue penalty increased by 25% (veteran legs feel it more)

### Star Dependent
- Variance increased by 20%
- Clutch +7 in close games and OT
- Consistency floor lowered by 10, ceiling raised by 15
- Progression tied to star's individual arc
- Road boost and road debuff both amplified
- OT Clutch modifier +7%
- Streak bonus — +10 to Clutch in OT when on a win streak
- Fatigue penalty increased on star-driven ratings

**Shut Down the Star Vulnerability:**
- Applies ONLY to teams rated below 74 overall
- Opponent with high Defensive Pressure + Defensive Risk combo triggers -15% to Offense/Clutch
- Teams 74+ overall have enough depth — vulnerability does not apply

### Young and Inexperienced
- Variance increased by 25% (highest of any tag)
- Clutch -10 in close games and OT
- Consistency floor lowered by 15, ceiling uncapped
- Road debuff amplified to 150%
- Losing streak spiral — additional -3 to Clutch on losing streaks of 3+
- OT Clutch modifier -10%
- Trophy Final OT momentum carry — 45% chance
- Fatigue penalty reduced by 25%

**Progression:**
- Growth rate +3 to +6 overall rating per season
- Physical/skill subcategories grow faster
- Instinct/discipline subcategories grow slower
- Growth amplified by success, slowed by losing seasons
- Graduation evaluated after minimum 2 seasons — numbers + narrative judgment
- Graduates to Star Dependent (singular talent) or Deep Roster (balanced growth)
- Eventually matures into Veteran Led after sustained success

### Rebuilding / Unknown Identity
- Variance increased by 20%
- Clutch -7 in close games and OT
- Consistency floor lowered by 10, ceiling raised by 10
- Home/away modifiers dampened to 50%
- Offensive and Defensive Risk amplified inconsistently
- Trophy Final OT momentum carry — 50/50
- Progression — no fixed growth rate, evaluated season by season
- Tag duration — typically resolves within 1-2 seasons

**Acquisition-Driven Shift:**
- Trading for/signing/drafting a difference-maker can immediately shift the tag
- Clear offensive engine acquired → shifts to Star Dependent
- Multiple solid contributors → shifts to Deep Roster
- Young core/draft-heavy approach → shifts to Young & Inexperienced

### Deep Roster
- Variance decreased by 10%
- Clutch +5 in close games and OT
- Consistency floor raised by 12
- Foul-out resistance — Penalty Kill and Defensive ratings degrade slower
- Fatigue resistance — fatigue penalty reduced by 50%
- Road debuff reduced to 50%
- Star Dependent shutdown vulnerability does not apply
- OT Clutch modifier +5%
- Progression — most stable tag, erodes slowly into Rebuilding only if multiple depth pieces lost

### Tag Fluidity Map

```
Young and Inexperienced → Star Dependent or Deep Roster → Veteran Led
Veteran Led → declines into Rebuilding/Unknown Identity as core ages out
Star Dependent → shifts to Deep Roster or declines if star leaves/ages
Rebuilding → stabilizes into Young & Inexperienced, Star Dependent, or Deep Roster
Deep Roster → can erode into Rebuilding if depth pieces lost over time
```

**Franchise Lifecycle Pattern:**
```
Rebuild → Young Core → Identity Forms → Veteran Contender → Decline → Rebuild Again
```

---

## 7. SEASON-TO-SEASON PROGRESSION

### Veteran Led Decline
```
Decline rate: -2 to -4 overall per season
Acceleration after 2 consecutive declining seasons: -4 to -6 per season
Physical subcategories (Pace, Pressure, Riding) decline fastest
Experience subcategories (Clutch, Consistency, Positioning) decline slowest
Triggers shift to Rebuilding once overall drops 10+ points below peak
Or after 3 consecutive losing seasons
```

### Star Dependent Progression
```
Tracks hidden star value modifier separate from team overall:
  Star in prime         → team overall +2 to +5 per season
  Star in decline       → team overall -3 to -6 per season
  Star leaves           → immediate -10 to -15 overall, shifts to Rebuilding
  New star emerges      → fresh cycle begins, +5 to +8 jump that season
```

### Rebuilding Evaluation Criteria
```
Win total above threshold (9+ combined wins) → stabilizes
Win total below threshold, ratings trending up → stays Rebuilding one more season
Win total below threshold, ratings flat/declining → stays Rebuilding
Single subcategory jumps 8+ points → can trigger shift to Star Dependent
Acquisition-driven shift → independent of win total or rating trend
```

### Deep Roster Erosion
```
Single offseason depth loss → -3 to -5 overall, stays Deep Roster if still rated well
Multiple consecutive offseasons of depth loss → cumulative -5 to -8 per season
Shifts to Rebuilding once overall drops 12+ points from peak
```

---

## 8. COACHING SYSTEM

### 8.1 Staff Structure
- 3 coaches per team: Head Coach, Offensive Coordinator, Defensive Coordinator
- **Head Coach is also the General Manager** — controls both the bench and the roster
- Coach and roster are fluid — roster influences coach philosophy, coach influences roster identity over time
- A philosophical mismatch increases variance and creates friction
- A perfect match accelerates development and identity formation

### 8.2 Coach Ratings

```
Competence (1-100) — how reliably philosophy translates into performance
Development (1-100) — how well they develop young players
```

- High Development coaches accelerate Young & Inexperienced progression toward the higher end of +3 to +6

### 8.3 Head Coach Archetypes

- **The Tactician** — system-heavy, disciplined, low Risk teams; builds disciplined system-first rosters
- **The Players Coach** — high morale, veteran relationships, Clutch amplifier; pursues veterans and high character players
- **The Firebrand** — aggressive, high pressure, penalty prone but energizing; aggressive trader, high risk signings
- **The Builder** — excels with Young & Inexperienced, development focused; draft-heavy, patient roster construction
- **The Veteran Whisperer** — maximizes Veteran Led teams, struggles with young rosters; targets aging veterans other teams overlook
- **The Gambler** — high Risk philosophy, volatile results; swings for difference makers, volatile roster decisions

### 8.4 Coordinator Archetypes

**Offensive Coordinator:**
- Possession-based — methodical, feeds Offensive Possession
- Up-tempo — pace-first, amplifies Offensive Pace
- Risk Taker — 2-point heavy, amplifies Offensive Risk
- Special Teams Specialist — Power Play focused

**Defensive Coordinator:**
- Zone/Positioning — disciplined, structure-first
- Pressure-based — aggressive, foul prone but turnover generating
- Hybrid — reads opponent, adapts scheme
- Penalty Kill Specialist

### 8.5 Coaching Movement

```
Firing triggers:
  2 consecutive losing seasons below expectations
  Missing playoffs 3 consecutive seasons
  Catastrophic single season underperformance (bottom 5 in conference)
  Fired for poor roster construction OR poor coaching — no separation (HC = GM)
```

```
Hiring:
  Teams hire from coaching pool
  Better teams attract higher Competence coaches
  Rebuilding teams more likely to get high Development unproven coaches
```

```
Retirement:
  After extended careers, especially after winning championships
  Retiring coach who won multiple trophies becomes VPLL legend
```

```
Poaching:
  Successful coordinators can be hired away as Head Coaches elsewhere
  Losing an OC to a rival is a real strategy hit
```

---

## 9. PLAYER MOVEMENT & ROSTER MANAGEMENT

### 9.1 Calendar
- Between-season Summer Roster Window opens after Corkum Trophy Final
- Official free agency opens after Culkin Trophy season concludes
- Draft follows free agency period

### 9.2 Draft

```
Format: 5 rounds
Order: Worst overall combined record picks first
Combined record prevents tanking one season for better pick position
```

```
Lottery (bottom 8 teams per conference — teams missing the playoffs):
  Weighted lottery determines all top 8 picks
  Worst Commissioners Cup team has best odds but not guaranteed #1
  Teams 9-32 pick in straight inverse Commissioners Cup order after lottery
```

```
Draft Classes:
  Each year generates a class with top prospect, mid-round contributors, depth
  Class quality varies year to year — some loaded, some thin
  Top prospect entering Young & Inexperienced team accelerates development arc
```

### 9.3 Player Hometown System

```
Every player has a hometown team based on their junior program
→ Assigned randomly during generation, weighted by market size
→ Burlington metro produces more players than Newport — reflects real demographics
→ Every team's junior program produces some talent
→ Hometown assignment is permanent — where you grew up, not where you play

Narrative implications:
→ Drafted by hometown team = feel-good local hero story
→ Drafted by a rival = complicated loyalty
→ Playing against hometown team = personal stakes
→ Traded to hometown team = homecoming narrative
→ Released by hometown team = emotional gut punch
→ Star leaving hometown team for big market = betrayal narrative
```

### 9.4 Free Agency Tiers
- **Top Free Agents** — difference makers, multiple teams compete, can trigger tag shifts
- **Mid-tier Free Agents** — role players and specialists, depth additions
- **Journeymen** — waiver wire type players, emergency depth

### 9.5 Player Pool
- Undrafted players, released veterans, journeymen
- Always available for waiver claims
- Depth of pool fluctuates based on league activity
- Benefits Rebuilding teams most — quick fixes available

### 9.6 Retirement
- Veterans can announce retirement during free agency period
- Surprise retirements also possible — narrative trigger for Star Dependent teams
- Major narrative moment when a franchise cornerstone retires

### 9.7 Training Camp

```
Training Camp Roster: 30-35 players
Regular Season Roster: 20-25 players
→ 5-10 players cut before regular season opens
→ Cut players enter player pool immediately — available for waiver claims
→ Veterans cut in camp become journeymen free agents
→ No formal practice squad — deactivation list serves as de facto reserve
```

### 9.8 Between-Season Roster Rules

```
Carry-Over Requirement:
  → Minimum 80% of Corkum roster must carry over to Culkin roster
  → Maximum 20% of spots can be turned over via signings, releases, or waivers
  → Trades do NOT count against the 20%
```

```
Deactivation Provision:
  → Up to 5 players can be deactivated for the Culkin season
  → Up to 5 players can be deactivated for the Corkum season
  → Deactivated players retain roster spot — not released, not available to other teams
  → Indoor specialists can be deactivated for Corkum season and reactivated for Culkin
  → Core Corkum players unsuited for box lacrosse can be deactivated for Culkin season
```

```
Indoor Specialist Market:
  → Teams use 20% turnover allowance to sign box lacrosse specialists
  → Creates journeyman market of indoor-only players cycling through teams
  → Team's Indoor/Outdoor Balance rating influences pursuit of specialists
```

---

## 10. AWARDS STRUCTURE

### 10.1 Seasonal Awards (given for both Corkum and Culkin seasons separately)

**Most Valuable Player**
- Most impactful player FOR their team — not automatically best player on best team
- Context matters — elevating a struggling team weighs heavily
- Star on a rebuilding squad dragging them to playoffs is a legitimate candidate

**Offensive Player of the Year**
- Best offensive performer, stats and impact weighted
- Natural home for high Offensive Risk/Pace players

**Defensive Player of the Year**
- Best defensive performer
- Recognizes elite Defensive Positioning/Pressure and Penalty Kill performers

**Most Outstanding Goalie**
- Separate from Defensive POY — recognizes the position specifically
- Stopping, Consistency, and Passing all factor into the narrative case

**Rookie of the Year**
- Best first year performer
- Almost exclusively from Young & Inexperienced tagged teams
- Breakout signal for a team's developmental arc

**Coach of the Year**
- Best coaching performance relative to expectations
- Overachieving with a lower rated roster weighs heavily
- Naturally tied to Rebuilding or Young & Inexperienced teams punching above weight

**Comeback Player of the Year**
- Player who rebounded from prior injury or struggles
- Requires simulation history — most meaningful Year 2+
- Narrative anchor for the injury system

### 10.2 Postseason Awards

**Corkum Trophy Finals MVP**
- Best performer across the Outdoor Trophy Final series

**Culkin Trophy Finals MVP**
- Best performer across the Indoor Trophy Final series

**The Davidson Award**
- Commissioners Cup MVP — the league's most prestigious individual honor
- Named after Zach Davidson — the best player to come out of Vermont high school lacrosse
- Evaluated on overall success and impact across BOTH full seasons combined
- Rewards the most complete two-season player in the league
- A player with poor Indoor/Outdoor Balance is almost by definition ineligible
- Presented at the Commissioners Cup ceremony — the league's biggest night

### 10.3 All-VPLL Teams (per season)
- First Team All-VPLL
- Second Team All-VPLL
- All-Rookie Team
- Returning All-VPLL selections become narrative anchors year over year

---

## 11. TROPHY LORE

### The Corkum Trophy (Outdoor Championship)
- Named after Dean Corkum — long-time Vermont high school lacrosse coach who built the culture of field lacrosse in the state
- Tall, vase-like, silver, narrow base — elegant and classic
- Represents outdoor excellence and the deep Vermont lacrosse roots
- The crown piece of the full trophy assembly — most visible element when complete

### The Culkin Trophy (Indoor Championship)
- Named after Jeff Culkin — brought box lacrosse to Vermont, coached at multiple levels throughout the state
- Wide, symmetrical, hollow center — like the World Series trophy but more balanced
- Represents indoor dominance and the expansion of the sport's reach
- The middle piece — hollow center is designed to receive the Corkum Trophy
- Displayed alone it's impressive but visibly incomplete

### The Commissioners Cup (Combined Championship)
- Large, wide, heavy base — the foundation of the full trophy assembly
- Awarded to the team with the best combined Commissioners Cup points across both seasons
- Davidson Award presented at the same ceremony — the league's biggest night

### The Full Trophy Assembly
```
Corkum Trophy mounts inside → Culkin Trophy → which mounts onto → Commissioners Cup base

A team that wins all three in one year displays the complete trophy
A team with only one or two pieces has a visibly incomplete display
The physical incompleteness tells the story — the job isn't finished
The first team to assemble the complete trophy is a landmark moment in league history
```

---

## 12. RIVALRY MAP

### 12.1 Confirmed Core Rivalries

**Jay StormKings vs Newport Spirits**
Kingdom division bragging rights. Two small town northern Vermont programs with deep local pride. Every matchup feels personal and physical.

**Essex Railroaders vs South Burlington Aviators**
Metro East suburban neighbors. Clean, competitive, consistent. One of the league's most reliable divisional matchups.

**Barre Carvers vs Montpelier Congress**
Working class Barre vs the seat of Vermont government. Capital region tension with a chip-on-the-shoulder edge on both sides.

### 12.2 Metro West Division — The Contentious Division

All four Metro West teams have specific reasons to dislike each other. Every divisional game carries extra weight.

**Queen City Battery vs North End Horsemen**
The big brother vs the upstart. Battery fans see the Horsemen as the younger brother who showed up uninvited — scrappy, physical, stylistically clashing with the Battery's identity. The Horsemen know they aren't respected and that chip fuels every matchup. Long-term thread: what happens when the Horsemen surpass the Battery?

**Queen City Battery vs Colchester Gryphons**
Suburb vs city. Colchester thinks they're the better team but never get the headlines. Battery fans barely think about Colchester, which infuriates Gryphons fans more than outright dislike would.

**Queen City Battery vs Onion River Predators**
Burlington vs Winooski across the river. Winooski is tight-knit and constantly overshadowed. Predators fans carry the biggest chip on their shoulder of any Metro West team specifically toward the Battery.

**North End Horsemen vs Onion River Predators**
Two working class, scrappy identities. The most physical Metro West rivalry — less narrative, more two tough teams that genuinely don't like each other.

**North End Horsemen vs Colchester Gryphons**
Border rivalry. Geographically adjacent, neighborhood line tension. Both feel overlooked relative to the Battery.

**Colchester Gryphons vs Onion River Predators**
The quiet rivalry. Colchester sees themselves as the class of the division while Onion River sees an opportunity to knock off the favorite.

### 12.3 Lakeshore Conference Rivalries

**Saint Albans Dawnlanders vs Missisquoi Bay Muskies**
The most culturally loaded rivalry in the league. Two teams drawing from the same northern Lake Champlain geography with deep regional resonance. This one means something beyond lacrosse.

**Grand Isle Heroes vs Milton Machine**
Island vs mainland. Two smaller market teams that define themselves against each other.

**Essex Railroaders vs Williston Lynx**
Quiet but consistent suburban rivalry. Geographically close, competitively reliable.

**South Burlington Aviators vs Jericho Stags**
Division's best vs division's worst. Could develop into a bully/underdog dynamic — if the Stags ever pull an upset it becomes a landmark moment.

**Charlotte Navigators vs Shelburne Reapers**
The premier County division rivalry. Two of the best teams in Lakeshore South. Most competitive divisional matchup in the conference.

**Middlebury RiverWolves vs Fair Haven Tycoons**
Two lower rated teams on opposite ends of the county. Fierce precisely because neither has much else to play for.

### 12.4 Mountainside Conference Rivalries

**Jay StormKings vs Enosburg Owls**
Jay is the class of the Kingdom at 85 overall. Enosburg at 76 sees themselves as the only team that can realistically challenge the StormKings.

**Saint Johnsbury Dinos vs Newport Spirits**
Two struggling teams at the bottom of the Kingdom. Scrappy rivalry with nothing but pride on the line.

**Stowe Smugglers vs Rutland Cryptids**
Premium Capital division matchup. Stowe is the glamour team, Rutland has the mysterious identity. Stylistically very different — a chess match every time.

**Stowe Smugglers vs Montpelier Congress**
Resort town elite vs grassroots capital city. Different cultures, different identities, shared regional geography.

**Springfield Hardshells vs Windsor Independents**
The River division's premier matchup. Both rated 81 overall — the most evenly matched rivalry in the entire league.

**Woodstock Boilers vs Ludlow Shepherds**
Quiet Connecticut River valley rivalry. Two lower rated teams that know each other well.

**Bennington Prowlers vs Brattleboro Pioneers**
Southern Vermont pride. Shire division rivalry with genuine geographic and cultural roots.

**Manchester Black Bears vs Hartford Bulls**
Physical Shire division rivalry. Geographically close, most hard-nosed matchup in the division.

**Bennington Prowlers vs Manchester Black Bears**
Both at 75 overall, both with strong visual identities. The Shire's most competitive matchup on paper.

### 12.5 Cross-Conference Rivalries

**Jay StormKings vs Charlotte Navigators**
The league's marquee matchup. The only two 85-rated teams in the VPLL. Commissioners Cup implications every time they meet. When these two face off during Interconference Weeks it should feel like a championship preview.

**Springfield Hardshells vs Essex Railroaders**
Two evenly matched programs from different conferences. Could develop into a deep playoff rivalry over time.

### 12.6 Emergent Rivalry Framework

**Playoff Eliminator Rivalry**
A team that repeatedly knocks another out in the first round develops a psychological edge that compounds over time.

**Trophy Final Rematch**
A Corkum or Culkin Trophy Finals rematch becomes the defining series of the league's early history.

**Upset Origin Rivalry**
A Rebuilding or Young and Inexperienced team shocks a contender. The contender never forgets it. A new rivalry is born from a single result.

**Streak Rivalry**
One team dominates the series for several seasons. When the losing team finally breaks through it resets the entire dynamic.

### 12.7 Rivalry Tiers

**Marquee — Highest Stakes:**
- Jay StormKings vs Charlotte Navigators
- Springfield Hardshells vs Windsor Independents
- Charlotte Navigators vs Shelburne Reapers
- Queen City Battery vs North End Horsemen

**Conference Defining:**
- Stowe Smugglers vs Rutland Cryptids
- Jay StormKings vs Newport Spirits
- Essex Railroaders vs South Burlington Aviators
- Jay StormKings vs Enosburg Owls

**Culturally Loaded:**
- Saint Albans Dawnlanders vs Missisquoi Bay Muskies
- Barre Carvers vs Montpelier Congress
- Queen City Battery vs Onion River Predators

**Scrappy/Pride:**
- Saint Johnsbury Dinos vs Newport Spirits
- Middlebury RiverWolves vs Fair Haven Tycoons
- Bennington Prowlers vs Manchester Black Bears
- North End Horsemen vs Onion River Predators
- Woodstock Boilers vs Ludlow Shepherds

---

## 13. MARKET TIERS & FAN CULTURE

### 13.1 Market Tiers

**Tier 1 — Big Market / High Payroll**
Burlington Metro: Queen City Battery, North End Horsemen, Colchester Gryphons, South Burlington Aviators, Essex Railroaders, Onion River Predators
Resort Money: Stowe Smugglers, Jay StormKings
Lakeshore South Wealth: Charlotte Navigators, Shelburne Reapers

**Tier 2 — Mid Market / Competitive Payroll**
Rutland Cryptids, Bennington Prowlers, Springfield Hardshells, Windsor Independents, Hartford Bulls, Montpelier Congress, Middlebury RiverWolves, Williston Lynx, Saint Albans Dawnlanders, Manchester Black Bears, Woodstock Boilers, Missisquoi Bay Muskies

**Tier 3 — Small Market / Lean Payroll**
Newport Spirits, Saint Johnsbury Dinos, Barre Carvers, Brattleboro Pioneers, Ludlow Shepherds, Milton Machine, Jericho Stags, Fair Haven Tycoons, Enosburg Owls, Grand Isle Heroes

### 13.2 Market Dynamics

```
Big Market Teams:
→ Hit the salary cap comfortably, spend to the limit every year
→ Can absorb bad contracts without catastrophic consequences
→ Attract top free agents because of market size and resources
→ Front office mistakes are recoverable
→ Playoff expectation every year — failure is a bigger story

Small Market Teams:
→ Can hit the cap but every dollar has to work harder
→ No margin for error on contracts
→ Draft and develop is survival, not just strategy
→ One bad contract can cripple a roster for years
→ Trades have to be smarter — can't just outbid everyone
→ A resourceful, cunning GM is essential
→ Winning a championship is a historic, Moneyball-level story
```

### 13.3 Fan Culture

Fan bases are rabid and loyal, consumed with how well their team does — similar to English Premier League culture. In a state as small as Vermont, the VPLL isn't background noise — it's the sport.

```
Big Market Fans — Demanding and Vocal
→ Battery fans expect trophies, anything less is failure
→ Gryphons fans feel perpetually disrespected
→ Stowe fans are wealthy and passionate but fair-weather risk

Small Market Fans — Fierce and Personal
→ Newport fans take every loss personally — this team is all they have
→ Barre fans see their team as a reflection of their town's dignity
→ A losing season in a small market is a community wound

Mid Market Fans — Passionate but Complicated
→ Rutland fans are proud but anxious about their ceiling
→ Bennington fans are fiercely independent of the Burlington buzz
→ Springfield fans are quietly intense — show up every game

Star Leaving Dynamic:
→ In a small state a player leaving for a bigger market is personal
→ It's not just a roster move — it's a kid from your town choosing Burlington over home
→ Every time the hometown team plays the new team, that storyline is in the building
```

---

## 14. VPLL MEDIA

### 14.1 Local Media

```
Print/Digital:
→ Burlington Free Press, Times Argus, Rutland Herald, Caledonian-Record
→ Brattleboro Reformer, and other local papers
→ Each covers their local teams with outsized passion

Radio:
→ 101.3 WVMT — the home of VPLL radio
→ Game coverage, interviews, call-in shows
→ The place Vermont lacrosse lives on the airwaves
→ Small market teams especially — radio is how their fans stay connected
```

### 14.2 VPLL Official Media

```
VPLL.com / League Reporting
→ Standard game coverage, scores, standings, stats, press conferences
→ The authoritative source — clean, professional, institutional tone
```

### 14.3 The Mesh (Analysis)

```
→ VPLL's signature analysis section
→ Named after the lacrosse net — where everything comes together
→ Deeper dives into matchups, trends, team trajectories
→ Statistical and tactical breakdowns
→ Think The Athletic or ESPN Analytics
→ Tone: informed, measured, evidence-based
```

### 14.4 The X (Opinion)

```
→ VPLL's opinionated commentary section
→ Named after the X in lacrosse — behind the goal, where playmakers operate
→ Writers take firm stances on league news
→ Hot takes, unpopular opinions, bold predictions
→ Holds coaches and front offices accountable
→ Think Bill Simmons or PTI energy
→ Tone: confident, provocative, fan-facing
```

### 14.5 Hot Stove (Offseason)

```
→ VPLL's offseason rumor and transaction coverage
→ Runs December through February — the full offseason window
→ Trade rumors, free agency targets, draft prospect rankings
→ The Summer Roster Window gets its own Hot Stove mini-cycle in July
→ Think MLB Trade Rumors or NBA insider reporting
→ Tone: speculative but sourced, rumor-aware
```

---

## 15. VPLL FULL CALENDAR

### 15.1 Outdoor Season (Corkum Trophy)

```
Second weekend of February  → Outdoor training camp opens
Late February               → Outdoor preseason games (3 per team)
Mid March                   → Outdoor regular season opens
Late April/Early May        → Week 7: Interconference Week + Outdoor All-Star Game
Late May                    → Week 12: Second Interconference Week
Early June                  → Week 13: Rivalry/Playoff Push games
Two weeks before playoffs   → Trade Deadline
Mid June                    → Playoffs begin
Late June                   → Corkum Trophy Final
```

### 15.2 Preseason Format

```
3 preseason games per team
→ Joint practice atmosphere — less competitive, more evaluative
→ Training camp roster (30-35) being cut to regular season (20-25)
→ Cross-conference scheduling only:
   Priority 1: Same region cross-conference (Lakeshore North vs Mountainside North)
   Priority 2: Cross-region cross-conference (Lakeshore North vs Mountainside South and vice versa)
→ Guarantees no regular season preview matchups
→ Rich narrative potential — roster battles, system installation, early signs of team direction
```

### 15.3 Summer Roster Window (July)

```
Permitted moves (max 4 non-trade moves per team):
  → Trades between teams (unlimited, draft picks can be included)
  → Waiver claims from player pool
  → Releasing players
  → Signing journeymen/depth pieces from player pool

NOT Permitted in Summer Roster Window:
  → Major free agent signings (full offseason only)
  → Star player contract extensions (full offseason only)

Notes:
  → July moves count against the 20% between-season turnover allowance
  → Trades do not count against the 20% or the 4-move limit
```

### 15.4 Indoor Season (Culkin Trophy)

```
Mid August                  → Indoor training camp opens
Late August                 → Indoor preseason games
Early September             → Indoor regular season opens
Early October               → Week 7: Interconference Week + Indoor All-Star Game
Late October                → Week 12: Second Interconference Week
Early November              → Week 13: Rivalry/Playoff Push games
Two weeks before playoffs   → Trade Deadline
Mid November                → Playoffs begin
Late November/Early Dec     → Culkin Trophy Final
```

### 15.5 Full Offseason (December → February)

```
Early December     → Free agency window opens
                   → Teams can release players immediately after Culkin Trophy
                   → Top free agents sign, mid-tier and journeymen market develops
                   → Trade window open throughout
January            → Draft
                   → Weighted lottery for bottom 8 teams per conference (determines top 8 picks)
                   → 5 rounds, inverse Commissioners Cup order
January/February   → Roster building and depth signings
                   → Player pool available for waiver claims
                   → Teams finalizing rosters ahead of training camp
2nd weekend Feb    → Outdoor training camp opens — new year begins
```

### 15.6 Playoff Schedule

```
Trade Deadline: Two weeks before playoffs begin (each season)

Week 1:
  Wednesday → Wild Card Games
  Saturday  → Regional Semifinal Games

Week 2:
  Wednesday → Regional Finals
  Saturday  → Conference Finals

Week 3+:
  Saturday  → Trophy Final Game 1
  Wednesday → Trophy Final Game 2
  Saturday  → Trophy Final Game 3 (if necessary)
```

### 15.7 Draft Order

- Inverse of final Commissioners Cup standings
- Last place Commissioners Cup team picks first
- Weighted lottery for bottom 8 teams per conference (teams missing playoffs) — worst Commissioners Cup team has best odds — determines top 8 picks
- Teams 9-32 pick in straight inverse Commissioners Cup order
- Rewards complete full-year performance, penalizes complete full-year failure

---

## 16. KEY NARRATIVE ENGINES

These are the simulation's built-in storytelling triggers. Claude should reference these when writing game recaps, season summaries, and league narratives.

- High Risk on both sides → penalty-fest, momentum swings, volatile game
- Pace + high Transition → fast break identity, overwhelming if opponent can't clear
- Veteran Led vs Young and Inexperienced → veterans win close games
- Star Dependent vs Deep Roster → deep teams wear down the star
- Rebuilding teams → genuine wildcard, trap game potential for favorites
- Possession vs Pace → battle of identity, possession starves the pace team
- High Riding vs low Clearing/Goalie Passing → turnover chaos in defensive zone
- Clutch rating → increasingly dominant as games tightens in final minutes
- Young team + Builder coach growing together → dynasty origin story
- Veteran Led team making one last championship push → window closing narrative
- Star leaves a Star Dependent team → immediate decline, rebuild begins
- Rebuilding team makes a blockbuster acquisition → identity shift overnight
- Injury to a Star Dependent engine → season-defining moment
- A 0-0 or historically low score → once a decade legendary game
- Double or triple OT Trophy Final game → franchise-defining moment
- All-Star Game winner earns home field → mid-season stakes moment
- Davidson Award back-to-back winner → dynasty conversation
- Comeback Player of the Year after season-ending injury → redemption arc
- Small market team winning a championship → Moneyball story, community celebration
- Big market team missing playoffs → dysfunction story, fan outrage
- Homegrown player leaving for a bigger market → betrayal and rivalry fuel
- A cunning small market GM outmaneuvering a big market team at the deadline → legend-making moment

---

## 17. DOCUMENT MAINTENANCE NOTES

This document should be updated whenever new decisions are made. The following sections are flagged as still in development:

- **Team Profiles** — individual team ratings, balance scores, and roster tags to be added as a dedicated section once all 32 are finalized
- **Rosters** — 20-25 man rosters with fictional named players and lightweight attributes, pending scope decision on attribute depth
- **Season History** — to be added as a running log once simulation begins (Year 1 results, standings, award winners, etc.)
- **Logos** — 32 team logos with alpha channels, pending completion of Gemini/Canva work
- **Coaches** — individual coaching staff assignments for all 32 teams, pending roster build
- **League founding lore** — pending development
- **Davidson Award ceremony timing** — confirmed at Commissioners Cup ceremony; ceremony format TBD
- **Preseason game format and length** — to be defined
- **Division reputations** — beyond Metro West as "the contentious division"
- **Venue culture** — indoor arena vs outdoor stadium atmosphere details
- **Conference stylistic identities** — less about Lakeshore vs Mountainside, more about big market vs small market cutting across both
