export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 0,
  }).format(num);
}
