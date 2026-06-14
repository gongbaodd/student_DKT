export interface ElectricityStats {
  loadMin: number;
  loadMean: number;
  loadMax: number;
  tempMin: number;
  tempMean: number;
  tempMax: number;
}

export interface HolidayEntry {
  date: string;
  name: string;
}

export interface ElectricityPoint {
  t: string;
  loadKw: number;
  tempC: number;
}

export interface ElectricityMonthData {
  month: string;
  intervalMinutes: number;
  stats: ElectricityStats;
  holidays: HolidayEntry[];
  points: ElectricityPoint[];
}

export interface ChartRow {
  date: string;
  ts: number;
  loadKw: number;
  tempC: number;
  timestamp: string;
}

export type CalendarBandType = "weekend" | "holiday";

export type PeakBandKind = "morning" | "evening";

export interface PeakBand {
  kind: PeakBandKind;
  x1: number;
  x2: number;
}

export interface CalendarBand {
  type: CalendarBandType;
  x1: number;
  x2: number;
  label?: string;
}

export type TradeAction = "buy" | "sell";

export interface Trade {
  id: string;
  ts: number;
  action: TradeAction;
  amount: number;
  price: number;
}

export interface TradingStats {
  charge: number;
  netCost: number;
  totalBuyCost: number;
  totalSellRevenue: number;
  tradeCount: number;
  isValidEnd: boolean;
}
