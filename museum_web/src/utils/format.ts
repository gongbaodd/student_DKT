export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function affinityLabel(probability: number): string {
  if (probability >= 0.7) return "strong interest";
  if (probability >= 0.45) return "moderate interest";
  return "low interest";
}
