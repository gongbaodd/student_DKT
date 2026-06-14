---
name: electricity-web-dashboard
description: >-
  Build and extend electricity_web: Vite + React + Mantine battery-agent demo
  with June 2014 electricity price arbitrage. Use when working on electricity_web,
  battery trading game, ECharts markArea/markPoint, buy/sell chart clicks, or the
  Battery Agent Measurement Demo dashboard.
---

# Electricity Web Dashboard

Reference app: `electricity_web/` — **Battery Agent Measurement Demo** (June 2014).

Data source: `electricity_data/` (UCI load as price + Lisbon weather). No ONNX/DKT.

Visual spec: `electricity_data/electricity_usage_2014.py` and `electricity_data/image.png`.

## Game rules

| Rule | Implementation |
|------|----------------|
| Price | `loadKw` treated as electricity price |
| Battery | Capacity 100 units; starts **0**, should end **0** |
| Buy | Adds player-chosen amount; blocked if full |
| Sell | Subtracts amount; blocked if empty |
| Mark trades | Click ECharts price line → nearest 15-min interval |
| Net cost | `Σ(buy amount×price) − Σ(sell amount×price)` |

## Layout

```
Container fluid
└─ Flex row
   ├─ BatteryIconPanel (sidebar): charge, buy/sell mode, amount
   └─ Stack (main)
      ├─ TemperatureChart (price + optional temp + trade dots)
      └─ TradingCostPanel (net cost, random solution, clear)
```

## Key modules

| File | Role |
|------|------|
| `utils/batteryTrading.ts` | Validation, stats, snap, random solution |
| `hooks/useBatteryTrading.ts` | trades, mode, amount, placeTrade |
| `utils/echartsOptions.ts` | price line + markArea bands + markPoint trades |
| `components/BatteryIconPanel.tsx` | SOC, mode, amount controls |
| `components/TradingCostPanel.tsx` | cost summary + buttons |
| `components/TemperatureChart.tsx` | ECharts click → placeTrade |

## Chart stack

- **Apache ECharts** via `echarts-for-react`
- Price always visible; temperature optional overlay
- Buy dots: green markPoint; sell dots: red markPoint
- Weekend/holiday/peak bands via `markArea` on price series
- Tooltip disabled; no per-band labels

## Data pipeline

Unchanged: `scripts/prepare_june.py` → `public/2014-06.json`

## Pitfalls

- Use `dateTime.ts` local ms helpers — never `toISOString()` for day boundaries
- Clamp trade amount when charge/mode changes
- Random generator drains remaining charge with sell trades at month end

Details: [reference.md](reference.md)
