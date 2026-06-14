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
  loadKw: number;
  tempC: number;
  timestamp: string;
}

export type CalendarBandType = "weekend" | "holiday";

export interface CalendarBand {
  type: CalendarBandType;
  x1: string;
  x2: string;
  label?: string;
}
