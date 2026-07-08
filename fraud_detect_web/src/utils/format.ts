export function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function legitLabel(probability: number): string {
  if (probability >= 0.85) return "very likely legit";
  if (probability >= 0.6) return "likely legit";
  if (probability >= 0.4) return "uncertain";
  return "likely fraud";
}
