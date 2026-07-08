export function legitToFraudProb(legitProb: number): number {
  return 1 - legitProb;
}

export type RiskLevel = "low" | "medium" | "high";

export function riskLevel(fraudProb: number): RiskLevel {
  if (fraudProb < 0.1) return "low";
  if (fraudProb <= 0.3) return "medium";
  return "high";
}

export function riskLabel(level: RiskLevel): string {
  switch (level) {
    case "low":
      return "Low risk";
    case "medium":
      return "Medium risk";
    case "high":
      return "High risk";
  }
}

export function riskColor(level: RiskLevel): string {
  switch (level) {
    case "low":
      return "green";
    case "medium":
      return "yellow";
    case "high":
      return "red";
  }
}
