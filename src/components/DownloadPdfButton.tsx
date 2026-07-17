// src/components/DownloadPdfButton.tsx
"use client";

import { useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import type { MarketResearchReport } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica" },
  header: { fontSize: 20, marginBottom: 4 },
  brand: { fontSize: 10, color: "#666", marginBottom: 16 },
  verdict: { fontSize: 14, marginBottom: 16, fontFamily: "Helvetica-Bold" },
  sectionTitle: { fontSize: 14, marginTop: 16, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  text: { marginBottom: 4, lineHeight: 1.4 },
  bullet: { marginBottom: 2 },
});

function ReportPdfDocument({ report }: { report: MarketResearchReport }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>Fulcrum — Market Research Report</Text>
        <Text style={styles.verdict}>
          Verdict: {report.verdict.rating.toUpperCase()} — {report.verdict.reasoning}
        </Text>

        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <Text style={styles.text}>{report.executive_summary}</Text>

        <Text style={styles.sectionTitle}>Market Size</Text>
        <Text style={styles.text}>TAM: {report.tam_sam_som.tam}</Text>
        <Text style={styles.text}>SAM: {report.tam_sam_som.sam}</Text>
        <Text style={styles.text}>SOM: {report.tam_sam_som.som}</Text>
        <Text style={styles.text}>{report.tam_sam_som.methodology}</Text>

        <Text style={styles.sectionTitle}>Competitors</Text>
        {report.competitors.map((c) => (
          <View key={c.name} style={{ marginBottom: 6 }}>
            <Text style={styles.text}>
              {c.name} — {c.description} (Pricing: {c.pricing}, Positioning: {c.positioning})
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Economics</Text>
        <Text style={styles.text}>Pricing model: {report.economics.pricing_model}</Text>
        <Text style={styles.text}>Implied margin: {report.economics.implied_margin}</Text>
        <Text style={styles.text}>
          Capital target to SOM: {report.economics.capital_target_to_som}
        </Text>

        <Text style={styles.sectionTitle}>Feasibility</Text>
        <Text style={styles.text}>Technical: {report.feasibility.technical}</Text>
        <Text style={styles.text}>Regulatory: {report.feasibility.regulatory}</Text>
        <Text style={styles.text}>Go-to-market: {report.feasibility.go_to_market}</Text>
        {report.feasibility.geo.applicable && (
          <Text style={styles.text}>Local market: {report.feasibility.geo.analysis}</Text>
        )}

        <Text style={styles.sectionTitle}>Pros</Text>
        {report.pros.map((p, i) => (
          <Text key={i} style={styles.bullet}>
            • {p}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>Cons</Text>
        {report.cons.map((c, i) => (
          <Text key={i} style={styles.bullet}>
            • {c}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>Sources</Text>
        {report.sources.map((s) => (
          <Text key={s.url} style={styles.bullet}>
            • {s.title} — {s.url}
          </Text>
        ))}
      </Page>
    </Document>
  );
}

export function DownloadPdfButton({ report }: { report: MarketResearchReport }) {
  const [fileName] = useState(() => `fulcrum-market-research-${Date.now()}.pdf`);

  return (
    <PDFDownloadLink
      document={<ReportPdfDocument report={report} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <button className="bg-black text-white rounded px-4 py-2 font-medium">
          {loading ? "Preparing PDF..." : "Download PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
}
