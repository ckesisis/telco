"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/shared/page-header";
import { ColumnPicker } from "@/components/shared/column-picker";
import {
  normalizeColumns,
  TABLE_COLUMNS,
  type ColumnPref,
  type TableKey,
} from "@/lib/table-columns";

export type ConfigurableRow = {
  id: string;
  href: string;
  cells: Record<string, React.ReactNode>;
};

/** A list table whose columns each user can show, hide and reorder. */
export function ConfigurableTable({
  table,
  columns: initialColumns,
  rows,
  toolbar,
}: {
  table: TableKey;
  columns: ColumnPref[];
  rows: ConfigurableRow[];
  toolbar?: React.ReactNode;
}) {
  const defs = TABLE_COLUMNS[table];
  const labels = new Map<string, string>(defs.map((column) => [column.id, column.label]));
  const [columns, setColumns] = useState(initialColumns);
  const [error, setError] = useState("");
  const visible = columns.filter((column) => column.visible);

  async function persist(next: ColumnPref[]) {
    const normalized = normalizeColumns(defs, next);
    const previous = columns;
    setColumns(normalized);
    setError("");
    const response = await fetch("/api/v1/me/table-columns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, columns: normalized }),
    });
    if (!response.ok) {
      setColumns(previous);
      setError("Η αποθήκευση απέτυχε");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">{toolbar}</div>
        <ColumnPicker
          columns={columns}
          labels={labels}
          onChange={(next) => void persist(next)}
          error={error}
        />
      </div>
      <DataTable
        nowrap
        headers={[...visible.map((column) => labels.get(column.id) ?? column.id), ""]}
        rows={rows.map((row) => [
          ...visible.map((column) => {
            const value = row.cells[column.id];
            return value == null || value === "" ? (
              <span key={column.id} className="text-slate-400">—</span>
            ) : (
              value
            );
          }),
          <Link key={`link-${row.id}`} href={row.href} className="text-sm text-blue-600 hover:underline">
            Προβολή
          </Link>,
        ])}
      />
    </div>
  );
}
