# Report Visual Redesign — Design

Redesigns the Market Research report output (`src/components/Report/*`, currently plain black/white/gray Tailwind) into a colorful, tabbed, interactive dashboard. Scope is the report screen only — the idea form, voice/text intake, and pipeline-loading screen are unchanged.

## Approved via brainstorming (visual companion)

- **Layout:** Tabbed dashboard, not a single long scroll or a slide deck.
- **Style:** Playful/colorful — pill-shaped tabs, pastel-filled cards, rounded corners, light emoji accents. Not the dark "bold startup" or the muted "clean editorial" direction.
- **Interactivity (all approved):** animated TAM/SAM/SOM bars, color-coded SWOT quadrant, flippable competitor cards, an animated verdict gauge/meter, expandable PMF evidence list, and a confetti burst on green verdicts.

## Tabs

Adapting the original 4-tab sketch to fit every field in `MarketResearchReport` (`src/lib/types.ts`) with no section dropped:

1. **Overview** — verdict gauge, executive summary, economics, feasibility, pros/cons.
2. **Market** — TAM/SAM/SOM animated bar chart + methodology text.
3. **SWOT** — 2×2 color-coded quadrant.
4. **Competitors** — flippable cards.
5. **PMF & Sources** — PMF signal (with expandable evidence) + the sources list. Grouped together since both are "supporting evidence" and neither is large enough alone to justify its own tab.

Tab state (`activeTab`) lives in the new top-level `ReportView` — switching tabs doesn't re-fetch anything, it's pure client-side show/hide of already-loaded report data.

## Components

All new/changed files live in `src/components/Report/`, following the existing one-component-per-file pattern.

- **`ReportView.tsx`** (rewritten) — becomes the tab-container orchestrator: renders the pill tab bar, the `DownloadPdfButton` (kept as-is, unchanged from the plain `MarketResearchReport` prop it already takes), and swaps between five new tab-panel components based on `activeTab`. Keeps its existing `{ report, onNewResearch }` prop signature — no changes needed in `page.tsx` beyond a style pass.
- **`VerdictGauge.tsx`** (new) — replaces `VerdictBadge.tsx` in the live report UI. `VerdictBadge.tsx` is only ever used by `ReportView` (confirmed: `DownloadPdfButton`'s PDF renderer builds its own separate `Text`-based verdict line and never imports `VerdictBadge`), so it's deleted outright rather than kept as dead code. `VerdictGauge` is a semicircle SVG gauge with three colored zones (red/amber/green); a needle rotates via CSS transform to the verdict's angle, animating from a resting position on mount (CSS transition, no animation library). Verdict reasoning text renders below the gauge.
- **`TamSamSomChart.tsx`** (new) — three horizontal bars (TAM largest, SAM nested/shorter, SOM shortest), each bar's width animates from 0% to its target percentage on mount (CSS transition). Values are free-text strings (e.g. `"insufficient data: ..."`), not guaranteed numbers — see Error Handling below for how bar width is derived.
- **`SwotQuadrant.tsx`** (new) — CSS grid, 2 columns × 2 rows, one pastel-colored panel per category (green=strengths, red=weaknesses, blue=opportunities, amber=threats), each panel lists its bullet items.
- **`CompetitorCard.tsx`** (new) — single flippable card: front shows `name` + `description`; back shows `pricing` + `positioning`. Flip triggered by click (not hover, for touch-device compatibility), implemented with a CSS 3D transform (`rotateY`) on click-toggled state, no library needed.
- **`PmfEvidenceList.tsx`** (new) — extracted from `ReportView`'s current inline PMF rendering. Shows first 3 evidence items; a "Show N more" button reveals the rest (local `expanded` boolean state). Keeps the existing insufficient-data styling (italic/gray for null `source_url` entries).
- **`SourcesList.tsx`** (unchanged) — reused as-is inside the PMF & Sources tab.
- **`confetti.ts`** (new, `src/lib/`) — thin wrapper around the `canvas-confetti` package, exporting a single `fireConfetti()` function. Called once from `ReportView` on mount when `verdict.rating === "green"`, guarded by a ref so it fires exactly once even if the component re-renders.

## Data → Visual Mapping Details

- **Verdict gauge angle:** red = -60°, amber = 0°, green = 60° (semicircle from -90° to 90°, three equal zones). A lookup object, not computed math — avoids any ambiguity for an enum of exactly 3 values.
- **TAM/SAM/SOM bar widths:** these are free-text strings from the LLM (e.g. `"$10B"`, `"insufficient data: no public estimates found"`), not parsed numbers — parsing arbitrary currency/magnitude text reliably is out of scope. Bar widths are therefore **fixed proportions** (TAM 100%, SAM 65%, SOM 35%) representing the conceptual nesting, not a data-driven scale — the actual figures are printed as text on/beside each bar. If a field's value starts with `"insufficient data"`, that bar renders in a muted gray-striped pattern instead of its normal color, and the bar's printed text shows the full insufficient-data reason instead of a number.

## Error Handling

No new error states — this redesign is purely presentational and receives an already-validated `MarketResearchReport` from the existing pipeline. The existing `page.tsx` error/retry step (before a report exists) is unchanged. The one edge case addressed: any TAM/SAM/SOM/economics/feasibility field can legitimately contain `"insufficient data: <reason>"` per the grounding rule — every new visual component that displays such a field must render the reason text visibly, never hide or truncate it in service of the visual design (e.g., the gray-striped bar treatment above, and the flip-card back showing full pricing/positioning text even if long).

## Out of Scope

- Idea form, intake choice screen, voice/text intake UI, and pipeline-loading screen — unchanged.
- `DownloadPdfButton`'s PDF output — unchanged; PDF stays plain/print-friendly (a gauge/flip-card/confetti has no meaningful PDF equivalent, and the existing PDF brief never asked for one).
- Any new dependency beyond `canvas-confetti` (~3kb, single-purpose, no charting library needed since bars/gauge are hand-built SVG/CSS).

## Testing

Manual visual verification in a running dev server (per this project's established pattern of `npm run dev` + browser check, since these are React UI components with no meaningful unit-test surface): confirm all five tabs render correct data for a real report, the gauge points to the right zone for each of green/amber/red, bars animate in, competitor cards flip on click, PMF evidence expands, and confetti fires only on a green-verdict report.
