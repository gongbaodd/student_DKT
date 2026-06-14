# Electricity Web Dashboard — Reference

## File tree

```
electricity_web/src/
├── App.tsx
├── hooks/
│   ├── useElectricityMonth.ts
│   └── useBatteryTrading.ts
├── utils/
│   ├── batteryTrading.ts
│   ├── dateTime.ts
│   ├── calendarBands.ts
│   ├── peakBands.ts
│   └── echartsOptions.ts
└── components/
    ├── BatteryIconPanel.tsx
    ├── TemperatureChart.tsx
    └── TradingCostPanel.tsx
```

## Trading types

```typescript
interface Trade {
  id: string;
  ts: number;
  action: "buy" | "sell";
  amount: number;
  price: number; // loadKw
}

interface TradingStats {
  charge: number;
  netCost: number;
  totalBuyCost: number;
  totalSellRevenue: number;
  tradeCount: number;
  isValidEnd: boolean;
}
```

## Constants

| Name | Value |
|------|-------|
| `BATTERY_CAPACITY` | 100 |
| `DEFAULT_TRADE_AMOUNT` | 25 |

## Chart click

```typescript
chart.getZr().on("click", (event) => {
  const [ts] = chart.convertFromPixel({ gridIndex: 0 }, [event.offsetX, event.offsetY]);
  onChartClick(ts);
});
```

## markPoint trades

On `"Electricity price (kW)"` series:

```typescript
markPoint: {
  label: { show: false },
  data: trades.map(t => ({
    coord: [t.ts, t.price],
    itemStyle: { color: t.action === "buy" ? green : red },
  })),
}
```

## Random solution

1. Sample ~80 random intervals sorted by time
2. Buy on low prices when empty; sell on high when charged
3. Append drain sells at month end if charge > 0
4. Discard if still not empty

## Run

```bash
cd electricity_web && npm run dev
```

## Verification checklist

- Click chart → buy/sell dot at nearest interval
- Cannot buy when full; cannot sell when empty
- Sidebar amount respected
- Random solution ends at charge 0
- Bottom panel shows net cost
- Weekend/holiday/peak bands still visible
