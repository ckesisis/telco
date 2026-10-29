"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TrendGranularity, TrendPoint } from "@/lib/services/reporting.service";

// Categorical slots 1–3 of the validated reference palette (light surface).
export const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a"] as const;

const GRANULARITY_LABELS: Record<TrendGranularity, { per: string; column: string }> = {
  day: { per: "ανά ημέρα", column: "Ημέρα" },
  week: { per: "ανά εβδομάδα", column: "Εβδομάδα" },
  month: { per: "ανά μήνα", column: "Μήνας" },
};

type SeriesKey = keyof Omit<TrendPoint, "bucket" | "label">;

export function TrendChart({
  title,
  points,
  series,
  granularity,
  height = 240,
  footnote,
}: {
  title: string;
  points: TrendPoint[];
  series: { key: SeriesKey; label: string }[];
  granularity: TrendGranularity;
  height?: number;
  footnote?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const colored = series.slice(0, 3).map((item, i) => ({
    ...item,
    color: SERIES_COLORS[i],
    total: points.reduce((sum, point) => sum + point[item.key], 0),
  }));
  const empty = colored.every((item) => item.total === 0);

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{GRANULARITY_LABELS[granularity].per}</p>
        </div>
        <div className="flex rounded-md bg-slate-100 p-0.5 text-xs" role="group" aria-label="Προβολή">
          {[
            { key: false, label: "Γράφημα" },
            { key: true, label: "Πίνακας" },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setShowTable(option.key)}
              aria-pressed={showTable === option.key}
              className={cn(
                "rounded px-2 py-1",
                showTable === option.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend with period totals: identity never relies on colour alone */}
      <ul className="flex flex-wrap gap-x-5 gap-y-1 px-5 pt-3">
        {colored.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-0.5 w-3.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
            {item.label}
            <span className="text-sm font-semibold tabular-nums text-slate-900">
              {item.total.toLocaleString("el-GR")}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex-1 px-5 pt-3 pb-4">
        {showTable ? (
          <div className="overflow-auto" style={{ maxHeight: height }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-1.5 pr-4 font-medium">{GRANULARITY_LABELS[granularity].column}</th>
                  {colored.map((item) => (
                    <th key={item.key} className="py-1.5 pr-4 text-right font-medium">
                      {item.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {points.map((point) => (
                  <tr key={point.bucket}>
                    <td className="py-1.5 pr-4">{point.label}</td>
                    {colored.map((item) => (
                      <td key={item.key} className="py-1.5 pr-4 text-right tabular-nums">
                        {point[item.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : empty ? (
          <div
            className="flex items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-400"
            style={{ height }}
          >
            Δεν υπάρχουν δεδομένα για την περίοδο
          </div>
        ) : (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  minTickGap={20}
                  tickMargin={6}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
                    fontSize: 12,
                    color: "#0f172a",
                    padding: "8px 10px",
                  }}
                  labelStyle={{ color: "#475569", marginBottom: 4, fontWeight: 500 }}
                  itemStyle={{ color: "#0f172a", padding: "1px 0" }}
                />
                {colored.map((item) => (
                  <Line
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    name={item.label}
                    stroke={item.color}
                    strokeWidth={2}
                    dot={points.length <= 12 ? { r: 3, strokeWidth: 0, fill: item.color } : false}
                    activeDot={{ r: 4.5, strokeWidth: 2, stroke: "#ffffff" }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {footnote && <p className="mt-2 text-xs text-slate-400">{footnote}</p>}
      </div>
    </Card>
  );
}
