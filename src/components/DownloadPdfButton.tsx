// src/components/DownloadPdfButton.tsx
"use client";

import { useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
  Link,
} from "@react-pdf/renderer";
import type { MarketResearchReport } from "@/lib/types";

const BRAND = "#1612d3";
const BRAND_LIGHT = "#6187ec";
const PURPLE = "#a855f7";
const INK = "#1a1a1a";
const MUTED = "#6b6b6b";
const BORDER = "#e6e6e6";
const CARD = "#fafafa";

const VERDICT_COLORS: Record<MarketResearchReport["verdict"]["rating"], { bg: string; text: string; label: string }> = {
  red: { bg: "#fdecec", text: "#b42318", label: "Red — high risk" },
  amber: { bg: "#fdf3e0", text: "#93650a", label: "Amber — mixed signals" },
  green: { bg: "#e9f7ef", text: "#1c7a4a", label: "Green — strong signal" },
};

const SWOT_QUADRANTS: {
  key: keyof MarketResearchReport["swot"];
  title: string;
  color: string;
}[] = [
  { key: "strengths", title: "Strengths", color: "#1c9d6f" },
  { key: "weaknesses", title: "Weaknesses", color: "#e0466a" },
  { key: "opportunities", title: "Opportunities", color: BRAND_LIGHT },
  { key: "threats", title: "Threats", color: "#c98a12" },
];

function isInsufficient(value: string) {
  return value.toLowerCase().startsWith("insufficient data");
}

Font.register({
  family: "Playfair Display",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvUDQ.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiukDQ.ttf",
      fontWeight: 700,
    },
    {
      src: "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_qiTbtY.ttf",
      fontStyle: "italic",
    },
  ],
});

Font.register({
  family: "JetBrains Mono",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPQ.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8FqtjPQ.ttf",
      fontWeight: 600,
    },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10.5, fontFamily: "Playfair Display", color: INK },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    paddingBottom: 10,
  },
  brand: { fontSize: 13, fontStyle: "italic", color: INK },
  brandDot: { color: BRAND },
  tagline: { fontSize: 8, fontFamily: "JetBrains Mono", color: MUTED, textTransform: "uppercase", letterSpacing: 1 },
  verdictBox: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 8,
  },
  verdictLabel: {
    fontSize: 8,
    fontFamily: "JetBrains Mono",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  verdictText: { fontSize: 13, fontStyle: "italic" },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "JetBrains Mono",
    color: BRAND,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 18,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
  },
  statLabel: {
    fontSize: 8,
    fontFamily: "JetBrains Mono",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
    marginTop: 8,
  },
  bulletRow: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 10, fontSize: 10, color: BRAND },
  bulletText: { flex: 1, lineHeight: 1.4 },
  card: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 12,
    backgroundColor: CARD,
    marginBottom: 10,
  },
  competitorName: { fontStyle: "italic", fontSize: 11.5, marginBottom: 3, color: INK },
  competitorMeta: { fontSize: 9.5, color: MUTED, lineHeight: 1.45 },
  competitorMetaLabel: { fontFamily: "JetBrains Mono", fontSize: 7.5, textTransform: "uppercase", letterSpacing: 0.8, color: MUTED },
  barRow: { marginBottom: 12 },
  barLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 },
  barTrack: { height: 10, backgroundColor: "#eef0fa", borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 5 },
  swotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swotCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  swotTitle: { fontFamily: "JetBrains Mono", fontSize: 8, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  sourceRow: { flexDirection: "row", marginBottom: 4 },
  sourceDot: { width: 10, fontSize: 10, color: BRAND },
  sourceLink: { flex: 1, fontSize: 9.5, color: BRAND, textDecoration: "none" },
});

function Bullets({ items }: { items: string[] }) {
  const filtered = items.filter((item) => item.trim().length > 0);
  if (filtered.length === 0) {
    return <Text style={[styles.bulletText, { color: MUTED, fontStyle: "italic" }]}>Insufficient data.</Text>;
  }
  return (
    <>
      {filtered.map((item, i) => (
        <View key={i} style={styles.bulletRow} wrap={false}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

function TamSamSomBars({ tamSamSom }: { tamSamSom: MarketResearchReport["tam_sam_som"] }) {
  const bars: { key: "tam" | "sam" | "som"; label: string; width: number; color: string }[] = [
    { key: "tam", label: "TAM", width: 100, color: BRAND_LIGHT },
    { key: "sam", label: "SAM", width: 65, color: BRAND },
    { key: "som", label: "SOM", width: 35, color: PURPLE },
  ];
  return (
    <View style={styles.card}>
      {bars.map((bar) => {
        const value = tamSamSom[bar.key];
        const insufficient = isInsufficient(value);
        return (
          <View key={bar.key} style={styles.barRow}>
            <View style={styles.barLabelRow}>
              <Text style={[styles.competitorMetaLabel, { color: bar.color }]}>{bar.label}</Text>
              {!insufficient && <Text style={{ fontSize: 10.5, fontStyle: "italic" }}>{value}</Text>}
            </View>
            <View style={styles.barTrack}>
              {!insufficient && (
                <View style={[styles.barFill, { width: `${bar.width}%`, backgroundColor: bar.color }]} />
              )}
            </View>
            {insufficient && (
              <Text style={{ fontSize: 8.5, color: MUTED, fontStyle: "italic", marginTop: 3 }}>{value}</Text>
            )}
          </View>
        );
      })}
      <Text style={{ fontSize: 9, color: MUTED, lineHeight: 1.45, marginTop: 4, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8 }}>
        {tamSamSom.methodology}
      </Text>
    </View>
  );
}

function SwotGrid({ swot }: { swot: MarketResearchReport["swot"] }) {
  return (
    <View style={styles.swotGrid}>
      {SWOT_QUADRANTS.map((q) => (
        <View key={q.key} style={styles.swotCard} wrap={false}>
          <Text style={[styles.swotTitle, { color: q.color }]}>{q.title}</Text>
          <Bullets items={swot[q.key]} />
        </View>
      ))}
    </View>
  );
}

function ReportPdfDocument({ report }: { report: MarketResearchReport }) {
  const verdictColors = VERDICT_COLORS[report.verdict.rating];
  const pros = report.pros.filter((p) => p.trim().length > 0);
  const cons = report.cons.filter((c) => c.trim().length > 0);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.brandRow} fixed>
          <View>
            <Text style={styles.brand}>
              seesaw<Text style={styles.brandDot}>.</Text>
            </Text>
            <Text style={styles.tagline}>by fulcrum.</Text>
          </View>
          <Text style={styles.tagline}>Market Research Report</Text>
        </View>

        <View style={[styles.verdictBox, { backgroundColor: verdictColors.bg }]} wrap={false}>
          <Text style={[styles.verdictLabel, { color: verdictColors.text }]}>
            Verdict — {verdictColors.label}
          </Text>
          <Text style={[styles.verdictText, { color: verdictColors.text }]}>{report.verdict.reasoning}</Text>
        </View>

        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <Bullets items={report.executive_summary} />

        <Text style={styles.sectionTitle}>Market Size</Text>
        <TamSamSomBars tamSamSom={report.tam_sam_som} />

        <Text style={styles.sectionTitle}>Product-Market Fit Signal</Text>
        <View style={styles.card}>
          <Text style={{ fontSize: 9.5, color: MUTED, lineHeight: 1.45, marginBottom: 6 }}>
            {report.pmf_signal.summary}
          </Text>
          {report.pmf_signal.evidence.map((e, i) => (
            <View key={i} style={styles.bulletRow} wrap={false}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                {e.claim}
                {e.source_url && (
                  <>
                    {" "}
                    (<Link src={e.source_url} style={{ color: BRAND }}>source</Link>)
                  </>
                )}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>SWOT</Text>
        <SwotGrid swot={report.swot} />

        <Text style={styles.sectionTitle}>Competitors</Text>
        {report.competitors.map((c) => (
          <View key={c.name} style={styles.card} wrap={false}>
            <Text style={styles.competitorName}>{c.name}</Text>
            <Text style={[styles.competitorMeta, { marginBottom: 5 }]}>{c.description}</Text>
            <Text style={styles.competitorMetaLabel}>Pricing</Text>
            <Text style={[styles.competitorMeta, { marginBottom: 4 }]}>{c.pricing}</Text>
            <Text style={styles.competitorMetaLabel}>Positioning</Text>
            <Text style={styles.competitorMeta}>{c.positioning}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Economics</Text>
        <Text style={styles.statLabel}>Pricing model</Text>
        <Bullets items={report.economics.pricing_model} />
        <Text style={styles.statLabel}>Implied margin</Text>
        <Bullets items={report.economics.implied_margin} />
        <Text style={styles.statLabel}>Capital target to SOM</Text>
        <Bullets items={report.economics.capital_target_to_som} />

        <Text style={styles.sectionTitle}>Feasibility</Text>
        <Text style={styles.statLabel}>Technical</Text>
        <Bullets items={report.feasibility.technical} />
        <Text style={styles.statLabel}>Regulatory</Text>
        <Bullets items={report.feasibility.regulatory} />
        <Text style={styles.statLabel}>Go-to-market</Text>
        <Bullets items={report.feasibility.go_to_market} />
        {report.feasibility.geo.applicable && report.feasibility.geo.analysis && (
          <>
            <Text style={styles.statLabel}>Local market</Text>
            <Bullets items={report.feasibility.geo.analysis} />
          </>
        )}

        {pros.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pros</Text>
            <Bullets items={pros} />
          </>
        )}

        {cons.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Cons</Text>
            <Bullets items={cons} />
          </>
        )}

        <Text style={styles.sectionTitle}>Sources</Text>
        {report.sources.map((s) => (
          <View key={s.url} style={styles.sourceRow} wrap={false}>
            <Text style={styles.sourceDot}>•</Text>
            <Link src={s.url} style={styles.sourceLink}>
              {s.title}
            </Link>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export function DownloadPdfButton({ report }: { report: MarketResearchReport }) {
  const [fileName] = useState(() => `seesaw-market-research-${Date.now()}.pdf`);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      const blob = await pdf(<ReportPdfDocument report={report} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch (error) {
      console.error("PDF generation failed:", error);
      setStatus("error");
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === "loading"}
      className="rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
      style={{ backgroundColor: "var(--brand)", boxShadow: "0 10px 30px -10px var(--brand)" }}
    >
      {status === "loading"
        ? "Preparing PDF…"
        : status === "error"
          ? "PDF failed — retry"
          : "Download PDF"}
    </button>
  );
}
