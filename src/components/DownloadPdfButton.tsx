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
} from "@react-pdf/renderer";
import type { MarketResearchReport } from "@/lib/types";

const BRAND = "#1612d3";
const INK = "#1a1a1a";
const MUTED = "#6b6b6b";
const BORDER = "#e6e6e6";

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
    padding: 12,
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 6,
  },
  verdictLabel: {
    fontSize: 8,
    fontFamily: "JetBrains Mono",
    color: BRAND,
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
    marginTop: 16,
    marginBottom: 8,
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
    marginTop: 6,
  },
  bulletRow: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 10, fontSize: 10, color: BRAND },
  bulletText: { flex: 1, lineHeight: 1.4 },
  competitorRow: { marginBottom: 8 },
  competitorName: { fontStyle: "italic", fontSize: 11, marginBottom: 2 },
  competitorMeta: { fontSize: 9.5, color: MUTED, lineHeight: 1.4 },
});

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

function ReportPdfDocument({ report }: { report: MarketResearchReport }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>
            fulcrum<Text style={styles.brandDot}>.</Text>
          </Text>
          <Text style={styles.tagline}>Market Research Report</Text>
        </View>

        <View style={styles.verdictBox}>
          <Text style={styles.verdictLabel}>Verdict — {report.verdict.rating}</Text>
          <Text style={styles.verdictText}>{report.verdict.reasoning}</Text>
        </View>

        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <Bullets items={report.executive_summary} />

        <Text style={styles.sectionTitle}>Market Size</Text>
        <Text style={styles.bulletText}>TAM: {report.tam_sam_som.tam}</Text>
        <Text style={styles.bulletText}>SAM: {report.tam_sam_som.sam}</Text>
        <Text style={styles.bulletText}>SOM: {report.tam_sam_som.som}</Text>
        <Text style={[styles.bulletText, { color: MUTED, marginTop: 4 }]}>
          {report.tam_sam_som.methodology}
        </Text>

        <Text style={styles.sectionTitle}>Competitors</Text>
        {report.competitors.map((c) => (
          <View key={c.name} style={styles.competitorRow}>
            <Text style={styles.competitorName}>{c.name}</Text>
            <Text style={styles.competitorMeta}>{c.description}</Text>
            <Text style={styles.competitorMeta}>
              Pricing: {c.pricing} · Positioning: {c.positioning}
            </Text>
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

        <Text style={styles.sectionTitle}>Pros</Text>
        <Bullets items={report.pros} />

        <Text style={styles.sectionTitle}>Cons</Text>
        <Bullets items={report.cons} />

        <Text style={styles.sectionTitle}>Sources</Text>
        {report.sources.map((s) => (
          <View key={s.url} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={[styles.bulletText, { color: BRAND }]}>
              {s.title} — {s.url}
            </Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export function DownloadPdfButton({ report }: { report: MarketResearchReport }) {
  const [fileName] = useState(() => `fulcrum-market-research-${Date.now()}.pdf`);
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
