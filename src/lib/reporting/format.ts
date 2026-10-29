export function formatNumber(value: number) {
  return value.toLocaleString("el-GR");
}

export function formatPct(value: number) {
  return `${value.toLocaleString("el-GR", { maximumFractionDigits: 1 })}%`;
}

/** 3725 → "1ω 2λ", 125 → "2λ 5δ" */
export function formatDuration(seconds: number) {
  if (!seconds) return "0λ";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}ω ${m}λ`;
  if (m > 0) return s ? `${m}λ ${s}δ` : `${m}λ`;
  return `${s}δ`;
}

/** Minutes (possibly fractional) → readable response time. */
export function formatMinutes(minutes: number | null) {
  if (minutes == null) return "—";
  if (minutes < 1) return "<1λ";
  if (minutes < 60) return `${Math.round(minutes)}λ`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toLocaleString("el-GR", { maximumFractionDigits: 1 })}ω`;
  return `${(hours / 24).toLocaleString("el-GR", { maximumFractionDigits: 1 })}ημ`;
}
