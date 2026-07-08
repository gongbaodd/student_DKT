import type { ModelMetadata } from "../dkt/types";

export function amountQuartile(
  amount: number,
  edges: number[],
  maxQuartile: number,
): number {
  if (edges.length < 2) return 0;

  for (let i = 1; i < edges.length; i++) {
    const upper = edges[i];
    if (i === 1) {
      if (amount >= edges[0] && amount <= upper) return 0;
    } else if (amount > edges[i - 1] && amount <= upper) {
      return i - 1;
    }
  }

  if (amount <= edges[0]) return 0;
  return maxQuartile - 1;
}

export function skillId(
  productCD: string,
  quartile: number,
  productCodes: string[],
  amountQuartiles: number,
): number {
  const productIdx = productCodes.indexOf(productCD);
  const productIndex =
    productIdx >= 0 ? productIdx : productCodes.length - 1;
  return productIndex * amountQuartiles + quartile;
}

export function skillLabel(skillIdValue: number, skills: string[]): string {
  return skills[skillIdValue] ?? `Skill ${skillIdValue}`;
}

export function resolveSkill(
  productCD: string,
  amount: number,
  metadata: ModelMetadata,
  edges: number[],
): { quartile: number; skillId: number; skillLabel: string } {
  const quartile = amountQuartile(
    amount,
    edges,
    metadata.amountQuartiles,
  );
  const id = skillId(
    productCD,
    quartile,
    metadata.productCodes,
    metadata.amountQuartiles,
  );
  return {
    quartile,
    skillId: id,
    skillLabel: skillLabel(id, metadata.skills),
  };
}

export function formatAmountRange(
  quartile: number,
  edges: number[],
): string {
  if (edges.length < 2) return "any amount";
  const lower = quartile === 0 ? edges[0] : edges[quartile];
  const upper = edges[quartile + 1];
  return `$${lower.toFixed(2)} – $${upper.toFixed(2)}`;
}
