# VPLL Engine — Claude Code Migration Starter

This folder is everything needed to move the VPLL simulation engine from a Claude.ai artifact
into a real local project with Claude Code.

## What's here

```
vpll-engine/
├── CLAUDE.md                    ← read this first — project context, conventions, gotchas
├── README.md                    ← this file
├── src/
│   └── VPLL_Simulator.jsx       ← the entire engine + UI, single file (as exported from Claude.ai)
└── docs/
    ├── VPLL_Master_File.md      ← canonical rulebook, source of truth for all lore/rules
    ├── VPLL_Year1_Rosters.md    ← original Year 1 roster generation output (reference)
    ├── VPLL_Year1_Coaches.md    ← original Year 1 coaching staff generation output (reference)
    ├── VPLL_Free_Agent_Pool.md  ← original free agent pool generation output (reference)
    └── VPLL_Name_Pools.md       ← name pools used for all procedural generation
```

## Suggested first session with Claude Code

1. **Init the repo.**
   ```
   cd vpll-engine
   git init && git add . && git commit -m "Import from Claude.ai artifact"
   ```

2. **Point Claude Code at `CLAUDE.md` and ask it to read `src/VPLL_Simulator.jsx` in full**
   before doing anything else. It's large — let it actually read the whole thing rather than
   skimming, since the systems are genuinely interdependent (the offseason steps run in a
   specific order for a reason; the data mutation gotcha in CLAUDE.md matters).

3. **Ask for a project scaffold**, something like:
   > "Set this up as a Vite + React project. Split VPLL_Simulator.jsx into logical modules —
   > don't change any logic yet, just decompose it. Replace window.storage calls with
   > localStorage using the same key names. Get it running locally with `npm run dev` before
   > we change anything else."

4. **Verify parity before building anything new.** Once it runs locally, sanity check that a
   simulated season still produces sane results (win distribution, standings, playoffs) before
   trusting the migration. The multi-year stability numbers in CLAUDE.md are a good target to
   re-validate against.

5. **Decide on Press Box.** Either wire up your own Anthropic API key behind a small local
   proxy server (ask Claude Code to build one — it's a small task), or temporarily disable the
   Press Box tab until you're ready to handle key management.

6. **Set up a real test suite.** The "Testing workflow" section in CLAUDE.md describes the
   manual process used throughout development. Ask Claude Code to formalize it into actual
   `npm test` coverage — especially the multi-year parity/stability check and the roster
   integrity check (no duplicate players, no lost players after trades).

## A note on scope

This is a big, deep project — 6 build phases, an economic simulation with contracts/cap/trades,
an offseason pipeline, and a narrative layer, all built incrementally over many sessions. Don't
expect (or ask for) a rewrite in one sitting. Decomposing the file safely and getting it running
locally is a full, worthwhile first milestone on its own.
