export interface ProductOption {
  value: string;
  label: string;
  description: string;
}

export const PRODUCT_OPTIONS: ProductOption[] = [
  {
    value: "W",
    label: "W — Ad hoc",
    description: "Ad hoc purchases (WHO product code)",
  },
  {
    value: "C",
    label: "C — Credit card",
    description: "Credit card transactions",
  },
  {
    value: "H",
    label: "H — Hero",
    description: "Hero product category",
  },
  {
    value: "R",
    label: "R — Retail",
    description: "Retail purchases",
  },
  {
    value: "S",
    label: "S — Service",
    description: "Service transactions",
  },
];

export function productLabel(productCD: string): string {
  return PRODUCT_OPTIONS.find((option) => option.value === productCD)?.label
    ?? productCD;
}
