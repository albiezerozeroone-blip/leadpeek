export function fmtEur(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—";
  const neg = v < 0;
  const a = Math.abs(v);
  let s: string;
  if (a >= 1e9) s = `€${(a / 1e9).toFixed(1)}B`;
  else if (a >= 1e6) s = `€${(a / 1e6).toFixed(1)}M`;
  else if (a >= 1e3) s = `€${(a / 1e3).toFixed(0)}K`;
  else s = `€${a.toFixed(0)}`;
  return neg ? `-${s}` : s;
}

export function fmtCbe(n: string): string {
  const s = n.padStart(10, "0");
  return `${s.slice(0, 4)}.${s.slice(4, 7)}.${s.slice(7)}`;
}

export function fmtPct(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}

export function fmtNumber(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—";
  return Math.round(v).toLocaleString("en-US");
}
