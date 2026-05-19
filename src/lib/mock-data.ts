// Mock data generator for Building ESG Performance dashboard
// Represents D-1 (last closed day) for a Chilled Water Plant with 5 Carrier 23XRV chillers.

export const ANALYZED_DATE = "17/05/2025"; // D-1
export const ANALYZED_WEEKDAY = "Sábado";
export const LAST_IMPORT = "18/05/2025 08:15";

export type ChillerStatus = "Online" | "Standby" | "Alarm";

export interface Chiller {
  id: string;
  name: string;
  status: ChillerStatus;
  kWh: number;
  hours: number;
  avgCapacity: number; // %
  consumptionShare: number; // %
  alarms: number;
  efficiency: number; // kW/TR
  rank: number;
}

export const chillers: Chiller[] = [
  { id: "ch01", name: "Chiller 01", status: "Online",  kWh: 12850, hours: 20.1, avgCapacity: 72, consumptionShare: 30.3, alarms: 0, efficiency: 0.58, rank: 1 },
  { id: "ch02", name: "Chiller 02", status: "Online",  kWh: 10420, hours: 18.7, avgCapacity: 56, consumptionShare: 24.6, alarms: 0, efficiency: 0.61, rank: 3 },
  { id: "ch03", name: "Chiller 03", status: "Online",  kWh: 11730, hours: 20.3, avgCapacity: 64, consumptionShare: 27.7, alarms: 1, efficiency: 0.60, rank: 2 },
  { id: "ch04", name: "Chiller 04", status: "Standby", kWh:  4120, hours:  9.2, avgCapacity: 28, consumptionShare:  9.7, alarms: 0, efficiency: 0.70, rank: 4 },
  { id: "ch05", name: "Chiller 05", status: "Standby", kWh:  1230, hours:  3.1, avgCapacity: 18, consumptionShare:  2.9, alarms: 0, efficiency: 0.85, rank: 5 },
];

export interface KpiPoint { t: string; v: number }

function sparkline(base: number, variance: number, n = 24): KpiPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const wave = Math.sin(i / 3) * variance * 0.6;
    const noise = (Math.random() - 0.5) * variance;
    return { t: `${i}`, v: +(base + wave + noise).toFixed(2) };
  });
}

export interface Kpi {
  key: string;
  label: string;
  value: string;
  unit: string;
  dod: number; // vs D-2 (%)
  d7: number;  // vs 7d avg (%)
  goodWhen: "down" | "up";
  color: "water" | "efficiency" | "esg" | "carbon" | "warning";
  sparkline: KpiPoint[];
  extra?: string;
}

export const kpis: Kpi[] = [
  { key: "energy",    label: "Energia consumida", value: "42.350", unit: "kWh",   dod: -8.2, d7: -10.4, goodWhen: "down", color: "water",      sparkline: sparkline(1700, 600) },
  { key: "carbon",    label: "Carbono emitido",   value: "18,7",   unit: "tCO₂e", dod: -7.6, d7:  -9.1, goodWhen: "down", color: "carbon",     sparkline: sparkline(0.7, 0.25) },
  { key: "eff",       label: "Eficiência média",  value: "0,62",   unit: "kW/TR", dod: -5.3, d7:  -7.8, goodWhen: "down", color: "efficiency", sparkline: sparkline(0.62, 0.08) },
  { key: "cop",       label: "COP médio",         value: "1,61",   unit: "",      dod:  6.1, d7:   8.7, goodWhen: "up",   color: "esg",        sparkline: sparkline(1.6, 0.2) },
  { key: "trh",       label: "TRh produzido",     value: "68.250", unit: "TRh",   dod: -6.4, d7:  -8.9, goodWhen: "up",   color: "water",      sparkline: sparkline(2800, 700) },
  { key: "deltaT",    label: "Delta-T médio",     value: "5,3",    unit: "°C",    dod: -0.6, d7:  -0.8, goodWhen: "up",   color: "water",      sparkline: sparkline(5.3, 0.5) },
  { key: "peak",      label: "Pico de demanda",   value: "1.245",  unit: "kW",    dod:  3.2, d7:   4.5, goodWhen: "down", color: "warning",    sparkline: sparkline(950, 250) },
  { key: "hours",     label: "Horas operação",    value: "19,8",   unit: "h",     dod: -1.2, d7:  -2.1, goodWhen: "down", color: "efficiency", sparkline: sparkline(0.8, 0.3) },
  { key: "baseline",  label: "Economia vs baseline", value: "-9,8", unit: "%",    dod:  0,    d7:    0,  goodWhen: "down", color: "esg",        sparkline: sparkline(-9, 2), extra: "Meta mensal: -8,0%" },
];

// 96 readings (15-min interval) for the closed day
export interface SeriesPoint {
  time: string;
  kW: number;
  trh: number;       // carga térmica (TR)
  kwPerTr: number;
  deltaT: number;
  extTemp: number;
  cumulative: number;
}

function buildSeries(): SeriesPoint[] {
  const pts: SeriesPoint[] = [];
  let cum = 0;
  for (let i = 0; i < 96; i++) {
    const hour = i / 4;
    // load curve: low night, ramp morning, peak afternoon
    const loadFactor =
      0.25 +
      0.6 * Math.max(0, Math.sin(((hour - 6) / 18) * Math.PI)) +
      (hour > 13 && hour < 16 ? 0.25 : 0);
    const noise = (Math.random() - 0.5) * 0.08;
    const kW = +(400 + 1700 * (loadFactor + noise)).toFixed(0);
    const trh = +(kW / (0.55 + Math.random() * 0.15)).toFixed(0);
    const kwPerTr = +(kW / Math.max(trh, 1)).toFixed(2);
    const extTemp = +(18 + 10 * Math.max(0, Math.sin(((hour - 8) / 18) * Math.PI)) + (Math.random() - 0.5)).toFixed(1);
    const deltaT = +(5.5 + Math.sin(hour / 4) * 0.8 + (Math.random() - 0.5) * 0.4).toFixed(1);
    cum += kW * 0.25; // 15-min kWh
    const hh = String(Math.floor(hour)).padStart(2, "0");
    const mm = String((i % 4) * 15).padStart(2, "0");
    pts.push({ time: `${hh}:${mm}`, kW, trh, kwPerTr, deltaT, extTemp, cumulative: +cum.toFixed(0) });
  }
  return pts;
}

export const daySeries = buildSeries();

export const consumptionByPeriod = [
  { period: "Madrugada (00h–06h)", pct: 12, kWh: 5080, color: "water" as const },
  { period: "Manhã (06h–12h)",     pct: 20, kWh: 8460, color: "efficiency" as const },
  { period: "Tarde (13h–18h)",     pct: 42, kWh: 17780, color: "carbon" as const },
  { period: "Noite (18h–24h)",     pct: 26, kWh: 11030, color: "esg" as const },
];

export const insights = [
  { icon: "leaf",    text: "Consumo 10,4% abaixo da média dos últimos 7 dias." },
  { icon: "drop",    text: "Delta-T abaixo da meta por 4h15min durante o dia." },
  { icon: "bolt",    text: "Pico de demanda ocorreu entre 14:15 e 14:30." },
  { icon: "trend",   text: "Eficiência reduzida em períodos de carga parcial (13h às 17h)." },
  { icon: "leaf",    text: "Emissões dentro da meta ESG diária." },
  { icon: "chiller", text: "Chiller 01 teve a maior participação no consumo do dia (30,3%)." },
];

export const esgPerformance = {
  carbonDay: 18.7,        // tCO2e
  carbonMonth: 312.4,     // tCO2e accumulated
  intensity: 0.62,        // kWh/TRh
  baselineDelta: -9.8,    // %
  monthProgress: -8.6,    // % vs baseline
  monthTarget: -8.0,
  treesEquivalent: 312,
  kmAvoided: 76800,
  goalReachedPct: 86,
};

export const healthScores = [
  { label: "Energia",      value: 88, status: "Muito Bom" },
  { label: "Eficiência",   value: 85, status: "Muito Bom" },
  { label: "Carbono",      value: 90, status: "Excelente" },
  { label: "Operação",     value: 82, status: "Bom" },
  { label: "Estabilidade", value: 78, status: "Bom" },
];

export const esgScore = {
  total: 87,
  label: "Muito Bom",
  delta: 6,
};

export const comparatives = [
  { label: "D-1 vs D-2",                  delta: -8.2, unit: "%" },
  { label: "D-1 vs Média 7 dias",         delta: -10.4, unit: "%" },
  { label: "D-1 vs Mesmo dia semana ant.", delta: -6.1, unit: "%" },
  { label: "Mês atual vs Mês anterior",   delta: -4.3, unit: "%" },
  { label: "Acumulado mensal vs Meta",    delta: -1.5, unit: "%" },
  { label: "Acumulado anual vs Meta",     delta: -2.8, unit: "%" },
];
