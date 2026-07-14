# Fulcrum Market Research MVP — Design

## Purpose

Ship a working, end-to-end Market Research tool as the core YC demo artifact. Given a startup idea, the tool researches it (using live web search) and returns a structured viability report: market sizing, competitors, revenue potential, and a clear verdict. This is Feature 1 from the 10-Day Build Plan — the piece that must be genuinely impressive on its own.

Feature 2 (Intelligence Layer) and PDF branding polish are out of scope for this spec.

## Architecture

- **Framework:** Next.js (App Router, TypeScript), single deployable app on Vercel.
- **Styling:** Tailwind CSS.
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`), called server-side only — API key lives in `.env.local` / Vercel env vars, never exposed to the client.
- **Web search:** Claude's built-in web search tool (server tool use), no separate search API/key.
- **PDF export:** Client-side rendering of the report to PDF (react-pdf or jsPDF + html2canvas), triggered by a "Download PDF" button.
- **No database, no auth.** Stateless — one request in, one report out.

## Data Flow

1. User fills out a form: idea name, description, industry (dropdown), target market.
2. Form submits to `POST /api/research`.
3. API route builds a prompt and calls Claude with:
   - Web search tool enabled (for live competitor/market data).
   - A forced tool call defining the report JSON schema (structured output, not free-text parsing).
4. Claude researches and returns the structured report JSON.
5. API route validates the shape, returns it to the client.
6. Client renders the report in styled cards; user can click "Download PDF" to export the same content.

## Report Schema

```ts
type MarketResearchReport = {
  overview: string;
  tam_sam_som: {
    tam: string;
    sam: string;
    som: string;
    methodology: string;
  };
  competitors: {
    name: string;
    description: string;
    strength: string;
    weakness: string;
  }[]; // exactly 3
  revenue_potential: {
    summary: string;
    estimate_range: string;
  };
  verdict: {
    rating: "green" | "amber" | "red";
    reasoning: string;
  };
  pros: string[];
  cons: string[];
  sources: { title: string; url: string }[];
};
```

Enforced via Claude tool-use with a forced tool call (`tool_choice`) against this JSON schema, so the response is always well-formed — no regex/markdown scraping of free text.

## UI

- Single page (`/`).
- **Form** at top: idea name (text), description (textarea), industry (dropdown), target market (text). Submit button shows a loading state while the request is in flight (web search calls can take 15–30s).
- **Report** renders below the form once returned:
  - Verdict badge at the top, color-coded (green/amber/red) with reasoning.
  - Overview section.
  - TAM/SAM/SOM section with methodology note.
  - 3 competitor cards (name, description, strength, weakness).
  - Revenue potential section.
  - Pros/cons as two columns of bullet lists.
  - Sources listed as links at the bottom.
  - "Download PDF" button.
  - "New Research" button to reset and submit another idea.

## Error Handling

- If the Claude API call fails (network, rate limit, malformed response), show an inline error message with a "Retry" action. No silent failures, no partial/garbled report rendering.
- Basic form validation (required fields) before submission.

## Testing

- Manually run 5 real startup ideas through the flow (per the roadmap's Day 5 check) to validate report quality and confirm no crashes on edge-case inputs (very short/long descriptions, unusual industries).
- No automated test suite for this MVP pass — priority is shipping and validating output quality first.

## Out of Scope (this spec)

- Feature 2 (Intelligence Layer / content calendar analysis).
- Branded PDF styling polish (functional PDF export only for now).
- Accounts, persistence, payment.
