"use client";

import { Button } from "@/components/ui/button";

type Stats = {
  leadsCount: number;
  convertedLeads: number;
  leadConversionRate: number;
  customersCount: number;
  ordersCount: number;
  appsCount: number;
  activatedApps: number;
  activationRate: number;
  appsByStatus: Array<{ statusName: string; count: number }>;
  appsByLine: Array<{ productLine: string; count: number }>;
  appsBySource: Array<{ sourceName: string; count: number }>;
};

export function ReportingExport({ stats }: { stats: Stats }) {
  function exportCsv() {
    const lines = [
      "Metric,Value",
      `Leads,${stats.leadsCount}`,
      `Converted Leads,${stats.convertedLeads}`,
      `Lead Conversion %,${stats.leadConversionRate}`,
      `Customers,${stats.customersCount}`,
      `Orders,${stats.ordersCount}`,
      `Applications,${stats.appsCount}`,
      `Activated,${stats.activatedApps}`,
      `Activation %,${stats.activationRate}`,
      "",
      "Status,Count",
      ...stats.appsByStatus.map((r) => `${r.statusName},${r.count}`),
      "",
      "Product Line,Count",
      ...stats.appsByLine.map((r) => `${r.productLine},${r.count}`),
      "",
      "Source,Count",
      ...stats.appsBySource.map((r) => `${r.sourceName},${r.count}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reporting.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={exportCsv}>
      Εξαγωγή CSV
    </Button>
  );
}
