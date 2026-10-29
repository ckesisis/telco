"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Headline, ReportData } from "@/lib/services/reporting.service";

function headlineRows(label: string, current: Headline, previous: Headline) {
  const row = (metric: string, pick: (h: Headline) => number | null) => ({
    Metric: metric,
    [label]: pick(current),
    "Προηγούμενη περίοδος": pick(previous),
  });
  return [
    row("Leads", (h) => h.leads),
    row("Πωλήσεις (Μετατράπηκε)", (h) => h.sales),
    row("% Lead → Πώληση", (h) => h.saleRate),
    row("Leads με καταχωρημένη αίτηση", (h) => h.applied),
    row("Leads με επιτυχημένη αίτηση", (h) => h.success),
    row("Speed to lead (διάμεσος, λεπτά)", (h) =>
      h.speed.medianMinutes == null ? null : Math.round(h.speed.medianMinutes)
    ),
    row("% κλήση σε 15λ", (h) => h.speed.within15Pct),
    row("% κλήση σε 1ω", (h) => h.speed.within60Pct),
    row("% χωρίς κλήση (7 ημ.)", (h) => h.speed.notCalledPct),
    row("Κλήσεις", (h) => h.calls.total),
    row("Εισερχόμενες", (h) => h.calls.incoming),
    row("Εξερχόμενες", (h) => h.calls.outgoing),
    row("Αναπάντητες", (h) => h.calls.missed),
    row("% Απάντησης εισερχ.", (h) => h.calls.answerRate),
    row("Χρόνος ομιλίας (λεπτά)", (h) => Math.round(h.calls.talkSeconds / 60)),
  ];
}

function breakdown(rows: ReportData["leads"]["bySource"], dimension: string) {
  return rows.map((row) => ({
    [dimension]: row.label,
    Leads: row.leads,
    Πωλήσεις: row.sales,
    "% Πώλησης": row.saleRate,
    "Με αίτηση": row.applied,
    "Επιτυχείς αιτήσεις": row.success,
  }));
}

export function ReportingExport({ report }: { report: ReportData }) {
  const [busy, setBusy] = useState(false);

  async function exportXlsx() {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const book = XLSX.utils.book_new();
      const add = (name: string, rows: Record<string, unknown>[]) =>
        XLSX.utils.book_append_sheet(
          book,
          XLSX.utils.json_to_sheet(rows.length ? rows : [{ "—": "Χωρίς δεδομένα" }]),
          name
        );

      add("KPIs", headlineRows(report.period.label, report.current, report.previous));
      if (report.leaderboard) {
        add(
          "Agents",
          report.leaderboard.map((row) => ({
            Agent: row.name,
            Leads: row.leads,
            Πωλήσεις: row.sales,
            "% Πώλησης": row.saleRate,
            "Με αίτηση": row.applied,
            "Επιτυχείς αιτήσεις": row.success,
            Κλήσεις: row.calls,
            Εξερχόμενες: row.outgoing,
            Αναπάντητες: row.missed,
            "Ομιλία (λεπτά)": Math.round(row.talkSeconds / 60),
            "Speed to lead (λεπτά)":
              row.medianSpeedMinutes == null ? null : Math.round(row.medianSpeedMinutes),
          }))
        );
      }
      add("Ανά πηγή", breakdown(report.leads.bySource, "Πηγή"));
      add("Ανά campaign", breakdown(report.leads.byCampaign, "Campaign"));
      add(
        "Ανά γραμμή",
        report.conversion.byProductLine.map((row) => ({
          Γραμμή: row.label,
          Αιτήσεις: row.apps,
          Επιτυχείς: row.success,
          "%": row.successRate,
        }))
      );
      add(
        "Κλήσεις ανά agent",
        report.calls.byAgent.map((row) => ({
          Agent: row.label,
          Σύνολο: row.total,
          Εισερχόμενες: row.incoming,
          Εξερχόμενες: row.outgoing,
          Αναπάντητες: row.missed,
          "% Απάντησης": row.answerRate,
          "Ομιλία (λεπτά)": Math.round(row.talkSeconds / 60),
        }))
      );
      add(
        "Τάση",
        report.trend.points.map((point) => ({
          [{ day: "Ημέρα", week: "Εβδομάδα από", month: "Μήνας" }[report.trend.granularity]]: point.bucket,
          Leads: point.leads,
          "Πωλήσεις (κατά ημ. lead)": point.sales,
          Αιτήσεις: point.applications,
          "Επιτυχείς αιτήσεις": point.successApplications,
          Εισερχόμενες: point.incoming,
          Εξερχόμενες: point.outgoing,
          Αναπάντητες: point.missed,
        }))
      );

      XLSX.writeFile(book, `reporting_${report.filters.from}_${report.filters.to}.xlsx`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={exportXlsx} disabled={busy}>
      <Download className="mr-2 h-4 w-4" />
      {busy ? "Εξαγωγή…" : "Εξαγωγή Excel"}
    </Button>
  );
}
