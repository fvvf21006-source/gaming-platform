export function formatPoints(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}
