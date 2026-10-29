"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  REPORT_PRESETS,
  addDays,
  labelDay,
  presetRange,
  type ReportPreset,
} from "@/lib/reporting/filters";

export type DateRangeValue = { preset: ReportPreset; from: string; to: string };

const MONTHS = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];
const WEEKDAYS = ["Δε", "Τρ", "Τε", "Πε", "Πα", "Σα", "Κυ"];

const PRESET_GROUPS: Exclude<ReportPreset, "custom">[][] = [
  ["today", "yesterday"],
  ["week", "last_week"],
  ["month", "last_month"],
  ["quarter", "last_quarter"],
  ["year", "last_year"],
  ["last_7", "last_30", "last_90"],
];

function monthStart(ymd: string) {
  return `${ymd.slice(0, 7)}-01`;
}

function shiftMonth(ymd: string, months: number) {
  const [year, month] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, 1)).toISOString().slice(0, 10);
}

/** Calendar weeks (Monday first) covering the month; null = padding cell. */
function monthWeeks(first: string) {
  const days: (string | null)[] = [];
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  for (let i = 0; i < lead; i++) days.push(null);
  for (let day = first; day.slice(0, 7) === first.slice(0, 7); day = addDays(day, 1)) days.push(day);
  while (days.length % 7) days.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function matchPreset(from: string, to: string, today: string): ReportPreset {
  for (const group of PRESET_GROUPS) {
    for (const preset of group) {
      const range = presetRange(preset, today);
      if (range.from === from && range.to === to) return preset;
    }
  }
  return "custom";
}

export function DateRangePicker({
  value,
  today,
  onApply,
  className,
}: {
  value: DateRangeValue;
  className?: string;
  /** Current day (YYYY-MM-DD) in the business time zone, provided by the server. */
  today: string;
  onApply: (value: DateRangeValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<string | null>(value.from);
  const [to, setTo] = useState<string | null>(value.to);
  const [hover, setHover] = useState<string | null>(null);
  // Left-most visible month: show the selected end month on the right.
  const [view, setView] = useState(() => shiftMonth(monthStart(value.to), -1));
  const valueKey = `${value.preset}|${value.from}|${value.to}`;
  const [seenKey, setSeenKey] = useState(valueKey);
  if (seenKey !== valueKey) {
    setSeenKey(valueKey);
    setFrom(value.from);
    setTo(value.to);
  }

  function reset() {
    setFrom(value.from);
    setTo(value.to);
    setHover(null);
    setView(shiftMonth(monthStart(value.to), -1));
  }

  function apply(next: DateRangeValue) {
    setOpen(false);
    onApply(next);
  }

  function pickDay(day: string) {
    if (!from || to) {
      setFrom(day);
      setTo(null);
    } else if (day < from) {
      setFrom(day);
    } else {
      setTo(day);
    }
  }

  const draftEnd = to ?? (from && hover && hover >= from ? hover : null);
  const draftPreset = from && to ? matchPreset(from, to, today) : "custom";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
            className
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span className="truncate">
            {value.preset !== "custom" && (
              <span className="font-medium">{REPORT_PRESETS[value.preset]} · </span>
            )}
            <span className={cn(value.preset !== "custom" && "text-slate-500")}>
              {value.from === value.to
                ? labelDay(value.from)
                : `${labelDay(value.from)} – ${labelDay(value.to)}`}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto max-w-[calc(100vw-2rem)] p-0"
        collisionPadding={16}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Presets */}
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2 sm:max-h-[360px] sm:w-48 sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0">
            {PRESET_GROUPS.map((group, i) => (
              <div key={i} className="flex gap-1 sm:flex-col">
                {i > 0 && <div className="hidden border-t border-slate-100 sm:my-1 sm:block" />}
                {group.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => apply({ preset, ...presetRange(preset, today) })}
                    className={cn(
                      "whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-slate-100",
                      value.preset === preset && "bg-slate-900 text-white hover:bg-slate-800"
                    )}
                  >
                    {REPORT_PRESETS[preset]}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <div className="flex gap-6">
              {[0, 1].map((offset) => {
                const first = shiftMonth(view, offset);
                const [year, month] = first.split("-").map(Number);
                return (
                  <div key={offset} className={cn("w-[252px]", offset === 1 && "hidden md:block")}>
                    <div className="mb-2 flex h-8 items-center justify-between">
                      {offset === 0 ? (
                        <button
                          type="button"
                          onClick={() => setView(shiftMonth(view, -1))}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                          aria-label="Προηγούμενος μήνας"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="w-7" />
                      )}
                      <span className="text-sm font-medium">
                        {MONTHS[month - 1]} {year}
                      </span>
                      <button
                        type="button"
                        onClick={() => setView(shiftMonth(view, 1))}
                        className={cn(
                          "rounded-md p-1.5 text-slate-500 hover:bg-slate-100",
                          offset === 0 && "md:invisible"
                        )}
                        aria-label="Επόμενος μήνας"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <table className="w-full border-collapse text-center text-sm" role="grid">
                      <thead>
                        <tr>
                          {WEEKDAYS.map((day) => (
                            <th key={day} className="h-8 text-xs font-normal text-slate-400">
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody onMouseLeave={() => setHover(null)}>
                        {monthWeeks(first).map((week, w) => (
                          <tr key={w}>
                            {week.map((day, d) => {
                              if (!day) return <td key={d} className="h-9" />;
                              const disabled = day > today;
                              const isStart = day === from;
                              const isEnd = day === draftEnd;
                              const inRange = !!from && !!draftEnd && day > from && day < draftEnd;
                              return (
                                <td
                                  key={d}
                                  className={cn(
                                    "h-9 p-0",
                                    inRange && "bg-slate-100",
                                    isStart && draftEnd && draftEnd !== from && "rounded-l-md bg-slate-100",
                                    isEnd && from !== draftEnd && "rounded-r-md bg-slate-100"
                                  )}
                                >
                                  <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => pickDay(day)}
                                    onMouseEnter={() => setHover(day)}
                                    aria-pressed={isStart || isEnd}
                                    aria-label={labelDay(day)}
                                    className={cn(
                                      "h-9 w-9 rounded-md text-sm tabular-nums",
                                      disabled
                                        ? "cursor-not-allowed text-slate-300"
                                        : "hover:bg-slate-200",
                                      day === today && !isStart && !isEnd && "font-semibold underline underline-offset-4",
                                      (isStart || isEnd) && "bg-slate-900 text-white hover:bg-slate-800"
                                    )}
                                  >
                                    {Number(day.slice(8))}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <span className="text-sm text-slate-600">
                {from ? labelDay(from) : "—"} – {to ? labelDay(to) : from ? "επιλέξτε λήξη" : "—"}
                {from && to && draftPreset !== "custom" && (
                  <span className="ml-2 text-xs text-slate-400">({REPORT_PRESETS[draftPreset]})</span>
                )}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Ακύρωση
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!from || !to}
                  onClick={() => from && to && apply({ preset: draftPreset, from, to })}
                >
                  Εφαρμογή
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

