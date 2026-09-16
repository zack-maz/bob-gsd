# Plan: Improving `covers/gsd-bob-architecture-ibm.svg`

Response to `improving-covers.md`. Scope: the IBM Carbon variant only (plain/mono variants get one sync fix noted in Findings, otherwise untouched).

---

## Review Findings

### Problem 1 — Newcomers can't tell what the cover depicts

- The header tagline ("GSD spec-driven planning, native to IBM Bob") assumes the viewer already knows what GSD **and** Bob are. Neither is defined anywhere on the canvas.
- Section labels are insider vocabulary: "CAPABILITY GATE · GENERATED ROSTER", "UPSTREAM MOVE → gsd-core 1.6.1", "artifact contract". A first-time viewer has no anchor for *gate*, *roster*, *upstream*, or why "4 OF 6 ARTIFACTS ARE PURE DATA" matters.
- The pipeline band is the only self-explanatory section ("SOURCE → TRANSFORM → EMIT"), but its payoff line ("→ .planning/ artifacts identical to every runtime") lands only if you know GSD's artifact contract.

### Problem 2 — Flat hierarchy, undersized text

Font-size audit (960-wide viewBox; a README render at ~800px shrinks everything ~17% further):

| Size used | Where | Verdict |
|---|---|---|
| 26px | "gsd-bob" title | only true hero on the canvas |
| 16.5px | 4 panel headlines | all equal — no single focal point per band |
| 11–12.5px | ~80% of all text | body, key claims, and fine print all in the same range |
| 9.5–10.5px | upstream card captions, "DATA" tags, scope note | **too small** — sub-9px effective at README width |

Repetition / low-value content competing with key facts:

- "28 skills emitted" headline is restated by 5 chips that sum to 28 — the chips carry category info but the counts are redundant with the headline.
- Five function names in Stage 2 get identical weight; only the converter pair + `gateArtifact()` are load-bearing to the story.
- The backend-agnostic point appears twice (footer line + `<desc>`); the legend explains colors that mostly explain themselves.
- Key facts that *should* pop but don't: the one-command install, **byte-identical `.planning/` artifacts**, **28 / 1 gate**, **4-of-6-pure-data upstream** — each currently set at 12.5–16.5px, same as their supporting fine print.

### Problem 3 — Still reads as Claude-produced

Tells identified:

- **Typography is aspirational, not real**: `IBM Plex Sans/Mono` is named in `font-family` but never embedded — GitHub's `<img>` sandbox and most viewers fall back to system fonts, so the single strongest IBM signal silently disappears.
- **Generic layout DNA**: three equal panels + arrows, uniform padding, evenly distributed density, em-dash-heavy caption prose — the default LLM-diagram idiom.
- **Partial Carbon compliance**: colors are real Carbon tokens (`#0f62fe`, `#161616`, `#525252`, `#24a148`, `#e0e0e0`) but spacing is not on Carbon's 8px 2x-grid, there's no Carbon type ramp, and no Carbon pictograms/icons anywhere.
- **Near-square 960×920 aspect** — unusual for a repo cover; GitHub social preview is 2:1 (1280×640).

### Bonus finding (fact drift — cheap fix, flag now)

The sibling covers (`gsd-bob-architecture.svg`, `-mono.svg`) still say **"28 EMITTED · 2 WITHHELD"** and claim `gsd-autonomous` is offline because Bob "lacks isolated subagents" — contradicting the corrected capability facts (isolation **confirmed**, `gsd-autonomous` **supported**, only parallel fan-out gated, **1 withheld**) that the IBM variant already reflects. They also show stale `v0.1.1` vs. `package.json` `0.2.2`. Version/counts are hand-kept in three SVGs — drift is structural, not accidental.

---

## Plan

### Phase 1 — Comprehension strip (Problem 1)

1. Add a 2-line plain-English explainer directly under the header rule, e.g.:
   > *GSD is an open-source planning framework for AI coding agents; IBM Bob is IBM's AI coding assistant. gsd-bob translates GSD's commands and skills into Bob's native format — one install command in, the same planning artifacts out.*
   Set at Tier-2 size (13–14px), muted ink, full width — it's context, not a headline.
2. Rewrite section labels to carry their own meaning:
   - `CAPABILITY GATE · GENERATED ROSTER` → `WHAT BOB CAN RUN · 28 OF 29 GSD COMMANDS` (gate/roster wording moves into the caption)
   - `UPSTREAM MOVE → gsd-core 1.6.1 · 4 OF 6 ARTIFACTS ARE PURE DATA` → `PATH TO MERGING UPSTREAM INTO GSD-CORE · ONLY 2 OF 6 PIECES ARE NEW CODE`
3. Update `<title>`/`<desc>` to match.

### Phase 2 — Hierarchy redesign (Problem 2)

1. Adopt a 3-tier type scale, minimum floor **11px**:
   - **Tier 1 (20–24px, bold): one hero statement per band** — pipeline: "One install → Bob-native GSD"; capability: "28 emitted · 1 withheld"; upstream: "4 of 6 artifacts are pure data".
   - **Tier 2 (13–14px)**: supporting facts (byte-identical artifacts, isolation confirmed, converter names that survive the cut).
   - **Tier 3 (11–12px)**: paths, mono details, footer. Nothing below 11px — bump all 9.5/10/10.5px text or delete it.
2. Cut list:
   - Stage 2: keep `convertClaudeCmdToBobCommand()` / `...Skill()` / `gateArtifact()`; drop `mergeCustomModes()` + `buildSupportRoster()` (they live in README/ARCHITECTURE).
   - Chips: keep category names, drop per-chip counts **or** keep counts and demote the headline restatement — not both at equal weight.
   - Footer: merge legend to one line; the backend-agnostic sentence becomes the single footer statement.
3. Re-verify vertical rhythm after cuts (likely reclaims 40–60px — use it for breathing room, not more content).

### Phase 3 — Identity & craft spike (Problem 3)

Investigate, in order of expected payoff:

1. **Real IBM Plex** — the highest-leverage fix. Two routes to test:
   - a. Subset IBM Plex Sans + Mono (OFL-licensed) to used glyphs, embed as base64 woff2 `@font-face` inside the SVG. Verify whether GitHub's `<img>` sandbox honors data-URI fonts (known to be inconsistent).
   - b. **Render pipeline (recommended fallback and likely primary)**: `scripts/render-covers.cjs` using `resvg-js` (or `rsvg-convert`) with Plex installed → export `covers/*.png` at 2x. PNG guarantees typography everywhere the SVG can't.
2. **Carbon compliance pass**: snap all spacing to the 8px 2x-grid; adopt Carbon type ramp sizes for the three tiers; inline 2–3 Carbon pictograms (Apache-2.0, path data from `@carbon/icons` — e.g. *code*, *deployment-unit*, *arrow-flow*) to replace bare rules/arrows.
3. **De-Claude the prose**: strip em-dash caption constructions, cut hedging phrases, prefer Carbon's terse label voice (already partially there in `.lbl`).
4. **MCP/plugin survey** (the explicit ask): no design MCPs are connected to this session. Candidates worth evaluating: Figma MCP (design in Figma w/ Carbon kit, export SVG), Carbon's official Figma libraries, `@carbon/charts` for the chip band. Realistic conclusion to validate: **no MCP required** — embedded Plex + Carbon grid/pictograms + render script achieves the professional feel with zero new dependencies; record the survey outcome either way.
5. Optional: add a 1280×640 (2:1) export for GitHub social preview.

### Phase 4 — Sync & guardrails

1. Fix the plain/mono covers' stale facts (2→1 withheld, isolation-confirmed wording, v0.1.1→current) *or* explicitly deprecate them in favor of the IBM variant — decide with user.
2. Extend `scripts/` with a cover-stamp step (reads `package.json` version + roster counts from the gate, patches text nodes) so cover facts are generated, matching the project's "generated from the gate, never hand-kept" rule.

### Verification

- Render the SVG at 800px and 400px widths; screenshot-check every text node ≥ effective 9px.
- Confirm counts/version on the cover match `SUPPORT-ROSTER.md` and `package.json` (`0.2.2`).
- Show a non-project reader (or cold-context agent) the cover and ask "what does this project do?" — Phase 1 passes if the answer names GSD-into-Bob translation.

### Suggested execution order

Phase 1 + 2 are one edit session on the IBM SVG (`/gsd-quick`). Phase 3 is a spike → then apply (`/gsd-quick` or a planned phase if the render pipeline lands). Phase 4 rides along with Phase 3's script work.
