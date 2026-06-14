export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function capabilityLabel(probability: number): string {
  if (probability >= 0.7) return "strong";
  if (probability >= 0.45) return "moderate";
  return "developing";
}
