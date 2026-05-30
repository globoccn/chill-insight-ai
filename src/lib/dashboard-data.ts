import { useQuery } from "@tanstack/react-query";
import { getDashboardPeriod, useDashboardPeriod, type DashboardPeriod } from "@/lib/period";

export const N8N_API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_N8N_API_URL ||
  "https://ancar-n8n.gpfgqx.easypanel.host/webhook";

const n8nBaseUrl = N8N_API_BASE_URL.replace(/\/+$/, "");

export const N8N_DASHBOARD_DATA_URL = `${n8nBaseUrl}/dashboard-data`;
export const N8N_DASHBOARD_DATA_WEEK_URL = `${n8nBaseUrl}/dashboard-data-week`;
export const N8N_DASHBOARD_DATA_MONTH_URL = `${n8nBaseUrl}/dashboard-data-month`;
export const N8N_SETTINGS_URL = `${n8nBaseUrl}/dashboard-settings`;
export const N8N_UPLOAD_WEBHOOK_URL = `${n8nBaseUrl}/dados-globo-vm22`;

// Padrão correto em produção: o browser chama o backend do próprio dashboard.
// O server.ts então faz proxy para o serviço de dados. Isso evita bloqueio de CORS.
export const DASHBOARD_DATA_URL = import.meta.env.VITE_DASHBOARD_DATA_URL || "/api/dashboard";
export const SETTINGS_URL = import.meta.env.VITE_SETTINGS_URL || "/api/settings";
export const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || "/api/dashboard/upload";

export type ChillerStatus = "Online" | "Standby" | "Alarm" | string;

export interface DashboardChiller {
  id: string;
  name: string;
  status: ChillerStatus;
  online?: boolean;
  kwh?: number | null;
  trh?: number | null;
  kwtr?: number | null;
  cop?: number | null;
  horas_operacao?: number | null;
  participacao_consumo?: number | null;
  cap_media?: number | null;
  deltaT_evap_medio?: number | null;
  kw_atual?: number | null;
  tr_atual?: number | null;
  cap_atual?: number | null;
}

export interface DashboardPoint {
  timestamp: string | null;
  kw_total?: number | null;
  tr_total?: number | null;
  kwh_total?: number | null;
  trh_total?: number | null;
  kw_chillers?: number | null;
  kw_bombas?: number | null;
  kw_torres?: number | null;
  kw_auxiliares?: number | null;
  kwh_chillers?: number | null;
  kwh_bombas?: number | null;
  kwh_torres?: number | null;
  kwh_auxiliares?: number | null;
  kwtr_real?: number | null;
  kwtr_meta?: number | null;
  desvio_meta_kwtr?: number | null;
  cop_real?: number | null;
  deltaT_evap_medio?: number | null;
  delta_t_ag?: number | null;
  delta_t_medio?: number | null;
  deltaT_medio?: number | null;
  deltaT_cond_medio?: number | null;
  carbono_kg?: number | null;
  carbono_ton?: number | null;
  oat?: number | null;
  temp_externa?: number | null;
  vazao?: number | null;
  chillers?: unknown[];
}

export interface DashboardData {
  settings?: Record<string, unknown>;
  overview: {
    periodo_inicio?: string | null;
    periodo_fim?: string | null;
    kwh_total?: number | null;
    kwh_chillers?: number | null;
    kwh_bombas?: number | null;
    kwh_torres?: number | null;
    kwh_auxiliares?: number | null;
    trh_total?: number | null;
    kwtr_medio?: number | null;
    kwtr_meta?: number | null;
    desvio_meta_kwtr?: number | null;
    cop_medio?: number | null;
    pico_kw?: number | null;
    hora_pico?: string | null;
    carbono_kg?: number | null;
    carbono_ton?: number | null;
    custo_total?: number | null;
    tarifa_kwh?: number | null;
    baseline_kwh_dia?: number | null;
    baseline_kwh_periodo?: number | null;
    economia_kwh?: number | null;
    economia_percentual?: number | null;
    economia_vs_baseline_kwh?: number | null;
    economia_vs_baseline_percent?: number | null;
    kwh_m2?: number | null;
    trh_m2?: number | null;
    kw_pico_m2?: number | null;
    deltaT_evap_medio?: number | null;
    delta_t_medio?: number | null;
    deltaT_medio?: number | null;
    deltaT_cond_medio?: number | null;
    oat_medio?: number | null;
    temp_externa_media?: number | null;
    vazao_media?: number | null;
  };
  chillers: DashboardChiller[];
  analytics: {
    series_15min: DashboardPoint[];
  };
  esg?: {
    fator_carbono_kgco2_kwh?: number | null;
    carbono_kg?: number | null;
    carbono_ton?: number | null;
    kwh_total?: number | null;
    kwtr_medio?: number | null;
    desvio_meta_kwtr?: number | null;
  };
  reports?: {
    resumo?: Record<string, number | string | null | undefined>;
    insights?: Array<{ type?: string; severity?: string; title?: string; message?: string }>;
  };
  comparisons?: {
    reference_day?: string | null;
    previous_day?: string | null;
    metrics?: Record<string, {
      current: number | null;
      previous_day: number | null;
      seven_day_avg: number | null;
      vs_previous_day_percent: number | null;
      vs_7d_avg_percent: number | null;
    }>;
  };
  daily_trends?: Record<string, KpiPoint[]>;
}

export interface KpiPoint { t: string; v: number }
export interface DashboardKpi {
  key: string;
  label: string;
  value: string;
  unit: string;
  dod: number;
  d7: number;
  goodWhen: "down" | "up";
  color: "water" | "efficiency" | "esg" | "carbon" | "warning";
  sparkline: KpiPoint[];
  extra?: string;
}

const emptyData: DashboardData = {
  overview: {},
  chillers: [],
  analytics: { series_15min: [] },
  esg: {},
  reports: { insights: [] },
  comparisons: { metrics: {} },
  daily_trends: {},
};


// Filtros de segurança para ignorar leituras irreais causadas por perda de referência de sensores.
// Valores acima destes limites não entram em cards, gráficos, comparativos ou agregações do período.
const MAX_VALID_KW = 1000;
const MAX_VALID_KWTR = 5;

function isValidSensorValue(value: unknown, max: number, min = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return true;
  return n >= min && n <= max;
}

function isValidDashboardPoint(point: DashboardPoint) {
  const kwValues = [
    point.kw_total,
    point.kw_chillers,
    point.kw_bombas,
    point.kw_torres,
    point.kw_auxiliares,
  ];

  if (kwValues.some((value) => !isValidSensorValue(value, MAX_VALID_KW))) return false;

  const kwtrValues = [
    point.kwtr_real,
    (point as Record<string, unknown>).kwtr,
    (point as Record<string, unknown>).kwtr_planta,
  ];

  if (kwtrValues.some((value) => !isValidSensorValue(value, MAX_VALID_KWTR))) return false;

  const chillers = Array.isArray(point.chillers) ? point.chillers : [];
  for (const raw of chillers) {
    if (!raw || typeof raw !== "object") continue;
    const chiller = raw as Record<string, unknown>;
    if (!isValidSensorValue(chiller.kw, MAX_VALID_KW)) return false;
    if (!isValidSensorValue(chiller.kwtr, MAX_VALID_KWTR)) return false;
  }

  return true;
}

function filterValidDashboardPoints(points: DashboardPoint[]) {
  return points.filter(isValidDashboardPoint);
}

export function formatNumber(value: number | null | undefined, decimals = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.split("T")[0] || value;
  return d.toLocaleDateString("pt-BR");
}

export function pointTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(11, 16) || value;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function unwrapDashboardPayload(payload: unknown): unknown {
  let current = parseMaybeJson(payload);

  // O serviço de dados às vezes retorna: [{ json: {...} }], [{ value: "{...}" }] ou [{ data: {...} }]
  if (Array.isArray(current)) {
    current = current[0] ?? null;
  }

  current = parseMaybeJson(current);

  if (current && typeof current === "object") {
    const obj = current as Record<string, unknown>;

    if ("json" in obj) return unwrapDashboardPayload(obj.json);
    if ("value" in obj) return unwrapDashboardPayload(obj.value);
    if ("data" in obj) return unwrapDashboardPayload(obj.data);
    if ("body" in obj) return unwrapDashboardPayload(obj.body);
  }

  return current;
}

function normalize(payload: unknown): DashboardData {
  const data = unwrapDashboardPayload(payload) as Partial<DashboardData> | null;
  if (!data || typeof data !== "object") return emptyData;

  return {
    settings: data.settings ?? {},
    overview: data.overview ?? {},
    chillers: Array.isArray(data.chillers) ? data.chillers : [],
    analytics: {
      series_15min: Array.isArray(data.analytics?.series_15min)
        ? data.analytics.series_15min
        : [],
    },
    esg: data.esg ?? {},
    reports: data.reports ?? { insights: [] },
    comparisons: data.comparisons ?? { metrics: {} },
    daily_trends: data.daily_trends ?? {},
  };
}

function parseDateLike(value?: string | null) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  const native = new Date(text);
  if (!Number.isNaN(native.getTime())) return native;

  // Aceita formatos comuns vindos do serviço de dados/CSV, como "24/05/2026, 23:45" ou "24/05/2026 23:45".
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[,\s]+(\d{2}):(\d{2}))?/);
  if (match) {
    const [, dd, mm, yyyy, hh = "00", mi = "00"] = match;
    const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function dateKey(value?: string | null) {
  const parsed = parseDateLike(value);
  if (!parsed) return value?.split("T")[0]?.slice(0, 10) || null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeValue(value?: string | null) {
  return parseDateLike(value)?.getTime() ?? 0;
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickNumber(...values: unknown[]) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pointDeltaT(point: DashboardPoint) {
  return pickNumber(
    point.deltaT_evap_medio,
    point.delta_t_ag,
    point.delta_t_medio,
    point.deltaT_medio,
    (point as Record<string, unknown>).deltaT
  );
}

function pointOat(point: DashboardPoint) {
  return pickNumber(point.oat, point.temp_externa, (point as Record<string, unknown>).temperatura_externa);
}

function chillerCap(chiller: Record<string, unknown>) {
  return pickNumber(chiller.cap_pct, chiller.capacidade_pct, chiller.cap_atual, chiller.cap_media);
}

function chillerDeltaT(chiller: Record<string, unknown>) {
  return pickNumber(chiller.deltaT_evap, chiller.delta_t_ag, chiller.deltaT_evap_medio, chiller.delta_t_medio);
}

function chillerKwh(chiller: Record<string, unknown>, intervalHours: number) {
  return pickNumber(chiller.kwh) ?? asNumber(chiller.kw) * intervalHours;
}

function chillerTrh(chiller: Record<string, unknown>, intervalHours: number) {
  return pickNumber(chiller.trh) ?? asNumber(chiller.tr) * intervalHours;
}

function isChillerOnline(chiller: Record<string, unknown>) {
  return Boolean(chiller.online) || chiller.status === "Online" || asNumber(chiller.kw) > 0 || asNumber(chiller.tr) > 0 || asNumber(chillerCap(chiller)) > 0;
}

function sumValues<T>(arr: T[], selector: (item: T) => unknown) {
  return arr.reduce((acc, item) => acc + asNumber(selector(item)), 0);
}

function pointEnergy(point: DashboardPoint, kwhKey: keyof DashboardPoint, kwKey: keyof DashboardPoint, intervalHours: number) {
  const kwh = pickNumber(point[kwhKey]);
  if (kwh !== null) return kwh;
  const kw = pickNumber(point[kwKey]);
  return kw !== null ? kw * intervalHours : 0;
}

function avgValues<T>(arr: T[], selector: (item: T) => unknown) {
  const values = arr.map(selector).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  if (!values.length) return null;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function safeRatio(a: number, b: number) {
  return b > 0 ? a / b : null;
}

function roundValue(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Number(value.toFixed(decimals));
}

type DailyAggregate = {
  date: string;
  kwh_total: number | null;
  carbono_ton: number | null;
  kwtr_medio: number | null;
  cop_medio: number | null;
  trh_total: number | null;
  deltaT_evap_medio: number | null;
  pico_kw: number | null;
  horas_operacao: number | null;
};

function percentChange(current: number | null, baseline: number | null, decimals = 1) {
  if (current === null || baseline === null || !Number.isFinite(current) || !Number.isFinite(baseline) || baseline === 0) return null;
  return roundValue(((current - baseline) / baseline) * 100, decimals);
}

function aggregatePointsForDay(date: string, points: DashboardPoint[], settings: Record<string, unknown> = {}, esg: DashboardData["esg"] = {}): DailyAggregate {
  const dayPoints = points.filter((p) => dateKey(p.timestamp) === date);
  const intervalHours = asNumber(settings.intervalo_horas, 0.25);
  const carbonFactor = asNumber(esg?.fator_carbono_kgco2_kwh ?? settings.fator_carbono_kgco2_kwh, 0.0385);
  const kwh = sumValues(dayPoints, (p) => p.kwh_total);
  const trh = sumValues(dayPoints, (p) => p.trh_total);
  const kwtr = safeRatio(kwh, trh);
  const cop = kwtr ? 3.516 / kwtr : null;
  const picoKw = dayPoints.reduce((max, p) => Math.max(max, asNumber(p.kw_total)), 0);
  const horas = dayPoints.reduce((acc, p) => acc + (asNumber(p.kw_total) > 0 || asNumber(p.tr_total) > 0 ? intervalHours : 0), 0);

  return {
    date,
    kwh_total: roundValue(kwh, 2),
    carbono_ton: roundValue((kwh * carbonFactor) / 1000, 6),
    kwtr_medio: roundValue(kwtr, 3),
    cop_medio: roundValue(cop, 2),
    trh_total: roundValue(trh, 2),
    deltaT_evap_medio: roundValue(avgValues(dayPoints.filter((p) => asNumber(p.tr_total) > 0), (p) => pointDeltaT(p)), 2),
    pico_kw: roundValue(picoKw, 2),
    horas_operacao: roundValue(horas, 2),
  };
}

function aggregatePointsForDates(dates: string[], points: DashboardPoint[], settings: Record<string, unknown> = {}, esg: DashboardData["esg"] = {}): DailyAggregate {
  const allowed = new Set(dates);
  const periodPoints = points.filter((p) => allowed.has(dateKey(p.timestamp) || ""));
  const intervalHours = asNumber(settings.intervalo_horas, 0.25);
  const carbonFactor = asNumber(esg?.fator_carbono_kgco2_kwh ?? settings.fator_carbono_kgco2_kwh, 0.0385);
  const kwh = sumValues(periodPoints, (p) => p.kwh_total);
  const trh = sumValues(periodPoints, (p) => p.trh_total);
  const kwtr = safeRatio(kwh, trh);
  const cop = kwtr ? 3.516 / kwtr : null;
  const picoKw = periodPoints.reduce((max, p) => Math.max(max, asNumber(p.kw_total)), 0);
  const horas = periodPoints.reduce((acc, p) => acc + (asNumber(p.kw_total) > 0 || asNumber(p.tr_total) > 0 ? intervalHours : 0), 0);
  return {
    date: dates.at(-1) || "",
    kwh_total: roundValue(kwh, 2),
    carbono_ton: roundValue((kwh * carbonFactor) / 1000, 6),
    kwtr_medio: roundValue(kwtr, 3),
    cop_medio: roundValue(cop, 2),
    trh_total: roundValue(trh, 2),
    deltaT_evap_medio: roundValue(avgValues(periodPoints.filter((p) => asNumber(p.tr_total) > 0), (p) => pointDeltaT(p)), 2),
    pico_kw: roundValue(picoKw, 2),
    horas_operacao: roundValue(horas, 2),
  };
}

function aggregateAverageForDates(dates: string[], points: DashboardPoint[], settings: Record<string, unknown> = {}, esg: DashboardData["esg"] = {}): DailyAggregate | null {
  const daily = dates
    .map((date) => aggregatePointsForDay(date, points, settings, esg))
    .filter((item) => item.kwh_total !== null || item.trh_total !== null);

  if (!daily.length) return null;

  const avgMetric = (key: keyof DailyAggregate) => roundValue(avgValues(daily, (item) => item[key]), key === "carbono_ton" ? 6 : 2);

  return {
    date: daily.at(-1)?.date || dates.at(-1) || "",
    kwh_total: avgMetric("kwh_total"),
    carbono_ton: avgMetric("carbono_ton"),
    kwtr_medio: roundValue(avgValues(daily, (item) => item.kwtr_medio), 3),
    cop_medio: avgMetric("cop_medio"),
    trh_total: avgMetric("trh_total"),
    deltaT_evap_medio: avgMetric("deltaT_evap_medio"),
    pico_kw: avgMetric("pico_kw"),
    horas_operacao: avgMetric("horas_operacao"),
  };
}

function periodWindowDates(dates: string[], reference: string | null, period: DashboardPeriod) {
  const ref = reference || dates.at(-1) || null;
  if (!ref) return [];
  const upToReference = dates.filter((d) => d <= ref);
  const size = period === "month" ? 30 : period === "week" ? 7 : 1;
  return upToReference.slice(-size);
}

function downsampleSparkline(points: KpiPoint[], maxPoints = 42): KpiPoint[] {
  const valid = points.filter((p) => Number.isFinite(Number(p.v)));
  if (valid.length <= maxPoints) return valid;

  const bucketSize = Math.ceil(valid.length / maxPoints);
  const sampled: KpiPoint[] = [];

  for (let i = 0; i < valid.length; i += bucketSize) {
    const bucket = valid.slice(i, i + bucketSize);
    if (!bucket.length) continue;

    // Preserva melhor picos/vales que uma média simples: alterna pontos extremos por bucket.
    const values = bucket.map((p) => Number(p.v));
    const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
    const extreme = bucket.reduce((chosen, point) =>
      Math.abs(Number(point.v) - avg) > Math.abs(Number(chosen.v) - avg) ? point : chosen,
    bucket[0]);

    sampled.push({ t: extreme.t, v: Number(extreme.v) });
  }

  return sampled;
}

function buildDailyTrends(allPoints: DashboardPoint[], selectedDate: string | null, settings: Record<string, unknown> = {}, esg: DashboardData["esg"] = {}): Record<string, KpiPoint[]> {
  const dates = Array.from(new Set(allPoints.map((p) => dateKey(p.timestamp)).filter(Boolean) as string[])).sort();
  const reference = selectedDate || dates.at(-1) || null;
  const trendDates = reference
    ? dates.filter((d) => d <= reference).slice(-7)
    : dates.slice(-7);
  const allowedDates = new Set(trendDates);
  const intervalHours = asNumber(settings.intervalo_horas, 0.25);
  const carbonFactor = asNumber(esg?.fator_carbono_kgco2_kwh ?? settings.fator_carbono_kgco2_kwh, 0.0385);
  const meta = asNumber(settings.meta_kwtr, 0.88);

  const points = allPoints
    .filter((p) => allowedDates.has(dateKey(p.timestamp) || ""))
    .slice()
    .sort((a, b) => timeValue(a.timestamp) - timeValue(b.timestamp));

  const point = (p: DashboardPoint, value: number | null | undefined): KpiPoint => ({
    t: p.timestamp || "",
    v: Number.isFinite(Number(value)) ? Number(value) : 0,
  });

  const hoursAccumulator = (() => {
    let total = 0;
    return (p: DashboardPoint) => {
      if (asNumber(p.kw_total) > 0 || asNumber(p.tr_total) > 0) total += intervalHours;
      return roundValue(total, 2);
    };
  })();

  return {
    // Mini trends dos cards: leituras reais dos últimos 7 dias, reamostradas para manter picos e vales.
    energy: downsampleSparkline(points.map((p) => point(p, p.kwh_total))),
    carbon: downsampleSparkline(points.map((p) => point(p, ((asNumber(p.kwh_total) * carbonFactor) / 1000)))),
    eff: downsampleSparkline(points.map((p) => point(p, p.kwtr_real))),
    cop: downsampleSparkline(points.map((p) => point(p, p.cop_real))),
    trh: downsampleSparkline(points.map((p) => point(p, p.trh_total))),
    deltaT: downsampleSparkline(points.map((p) => point(p, p.deltaT_evap_medio))),
    peak: downsampleSparkline(points.map((p) => point(p, p.kw_total))),
    hours: downsampleSparkline(points.map((p) => point(p, hoursAccumulator(p)))),
    baseline: downsampleSparkline(points.map((p) => {
      const kwtr = asNumber(p.kwtr_real);
      const desvio = kwtr > 0 && meta > 0 ? ((kwtr - meta) / meta) * 100 : null;
      return point(p, roundValue(desvio, 2));
    })),
  };
}

function buildComparisons(allPoints: DashboardPoint[], selectedDate: string | null, settings: Record<string, unknown> = {}, esg: DashboardData["esg"] = {}, period: DashboardPeriod = "day"): DashboardData["comparisons"] {
  const dates = Array.from(new Set(allPoints.map((p) => dateKey(p.timestamp)).filter(Boolean) as string[])).sort();
  const currentDates = periodWindowDates(dates, selectedDate, period);
  const reference = currentDates.at(-1) || selectedDate || dates.at(-1) || null;
  if (!reference || !currentDates.length) return { reference_day: null, previous_day: null, metrics: {} };

  const firstCurrent = currentDates[0];
  const periodSize = currentDates.length;
  const previousDates = dates.filter((d) => d < firstCurrent).slice(-periodSize);
  const sevenDayDates = dates.filter((d) => d < firstCurrent).slice(-7);

  const currentAgg = aggregatePointsForDates(currentDates, allPoints, settings, esg);
  const previousAgg = previousDates.length ? aggregatePointsForDates(previousDates, allPoints, settings, esg) : null;

  // Em D-1, "vs 7 dias" deve comparar o dia atual contra a média diária dos dias
  // anteriores disponíveis, não contra a soma deles. Em semana/mês, usamos o
  // período anterior equivalente.
  const sevenAgg = period === "day"
    ? (sevenDayDates.length ? aggregateAverageForDates(sevenDayDates, allPoints, settings, esg) : null)
    : previousAgg;

  const metric = (key: keyof DailyAggregate) => {
    const current = currentAgg[key] as number | null;
    const prev = previousAgg ? previousAgg[key] as number | null : null;
    const seven = sevenAgg ? sevenAgg[key] as number | null : null;
    return {
      current,
      previous_day: prev,
      seven_day_avg: seven,
      vs_previous_day_percent: percentChange(current, prev),
      vs_7d_avg_percent: percentChange(current, seven),
    };
  };

  return {
    reference_day: reference,
    previous_day: previousDates.at(-1) || null,
    metrics: {
      energy: metric("kwh_total"),
      carbon: metric("carbono_ton"),
      eff: metric("kwtr_medio"),
      cop: metric("cop_medio"),
      trh: metric("trh_total"),
      deltaT: metric("deltaT_evap_medio"),
      peak: metric("pico_kw"),
      hours: metric("horas_operacao"),
    },
  };
}

function buildDailyChillers(points: DashboardPoint[], totalChillersKwh: number, intervalHours: number): DashboardChiller[] {
  const byId = new Map<string, Record<string, unknown>[]>();

  for (const point of points) {
    const chillers = Array.isArray(point.chillers) ? point.chillers : [];
    for (const raw of chillers) {
      if (!raw || typeof raw !== "object") continue;
      const c = raw as Record<string, unknown>;
      const id = String(c.id || c.name || "UR");
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id)!.push(c);
    }
  }

  return Array.from(byId.entries()).map(([id, registros]) => {
    const last = registros[registros.length - 1] ?? {};
    const kwh = sumValues(registros, (r) => chillerKwh(r, intervalHours));
    const trh = sumValues(registros, (r) => chillerTrh(r, intervalHours));
    const kwtr = safeRatio(kwh, trh);
    const cop = kwtr ? 3.516 / kwtr : null;
    const horas = registros.filter((r) => isChillerOnline(r)).length * intervalHours;
    const capMedia = avgValues(registros.filter((r) => isChillerOnline(r) && asNumber(chillerCap(r)) > 0), (r) => chillerCap(r));
    const deltaT = avgValues(registros.filter((r) => isChillerOnline(r) && chillerDeltaT(r) !== null), (r) => chillerDeltaT(r));

    return {
      id,
      name: String(last.name || id),
      status: String(last.status || (last.online ? "Online" : "Standby")),
      online: isChillerOnline(last),
      kwh: roundValue(kwh, 2),
      trh: roundValue(trh, 2),
      kwtr: roundValue(kwtr, 3),
      cop: roundValue(cop, 2),
      horas_operacao: roundValue(horas, 2),
      participacao_consumo: totalChillersKwh > 0 ? roundValue((kwh / totalChillersKwh) * 100, 2) : 0,
      cap_media: roundValue(capMedia, 0),
      deltaT_evap_medio: roundValue(deltaT, 2),
      kw_atual: roundValue(asNumber(last.kw), 2),
      tr_atual: roundValue(asNumber(last.tr), 2),
      cap_atual: roundValue(asNumber(chillerCap(last)), 0),
    };
  });
}

function scopeDashboardData(data: DashboardData, period: DashboardPeriod = "day"): DashboardData {
  const rawPoints = Array.isArray(data.analytics?.series_15min) ? data.analytics.series_15min : [];
  const allPoints = filterValidDashboardPoints(rawPoints);
  const allDates = Array.from(new Set(allPoints.map((p) => dateKey(p.timestamp)).filter(Boolean) as string[])).sort();
  const selectedDate = dateKey(data.overview?.periodo_fim) || dateKey(allPoints.at(-1)?.timestamp) || allDates.at(-1) || null;
  const periodDates = periodWindowDates(allDates, selectedDate, period);
  const comparisons = buildComparisons(allPoints, selectedDate, data.settings ?? {}, data.esg ?? {}, period);
  const daily_trends = buildDailyTrends(allPoints, selectedDate, data.settings ?? {}, data.esg ?? {});

  if (!selectedDate || !allPoints.length || !periodDates.length) return { ...data, comparisons, daily_trends };

  const allowedDates = new Set(periodDates);
  const points = allPoints.filter((point) => allowedDates.has(dateKey(point.timestamp) || ""));
  if (!points.length) return { ...data, comparisons, daily_trends };

  const intervalHours = asNumber(data.settings?.intervalo_horas, 0.25);
  const metaKwtr = asNumber(data.overview.kwtr_meta ?? data.settings?.meta_kwtr, 0.88);
  const carbonFactor = asNumber(data.esg?.fator_carbono_kgco2_kwh ?? data.settings?.fator_carbono_kgco2_kwh, 0.0385);
  const area = asNumber(data.settings?.area_climatizada_m2, 0);

  const totalKwh = sumValues(points, (p) => p.kwh_total);
  const totalTrh = sumValues(points, (p) => p.trh_total);
  const totalKwhChillers = sumValues(points, (p) => pointEnergy(p, "kwh_chillers", "kw_chillers", intervalHours));
  const totalKwhBombas = sumValues(points, (p) => pointEnergy(p, "kwh_bombas", "kw_bombas", intervalHours));
  const totalKwhTorres = sumValues(points, (p) => pointEnergy(p, "kwh_torres", "kw_torres", intervalHours));
  const totalKwhAuxiliaresRaw = sumValues(points, (p) => pointEnergy(p, "kwh_auxiliares", "kw_auxiliares", intervalHours));
  const totalKwhAuxiliares = totalKwhAuxiliaresRaw > 0
    ? totalKwhAuxiliaresRaw
    : (totalKwhBombas + totalKwhTorres > 0 ? totalKwhBombas + totalKwhTorres : Math.max(0, totalKwh - totalKwhChillers));
  const kwtr = safeRatio(totalKwh, totalTrh);
  const cop = kwtr ? 3.516 / kwtr : null;
  const desvio = kwtr && metaKwtr > 0 ? ((kwtr - metaKwtr) / metaKwtr) * 100 : null;
  const picoPoint = points.reduce<DashboardPoint | null>((max, point) => {
    const kw = asNumber(point.kw_total);
    if (!max || kw > asNumber(max.kw_total)) return point;
    return max;
  }, null);
  const picoKw = asNumber(picoPoint?.kw_total, 0);
  const carbonoKg = totalKwh * carbonFactor;
  const carbonoTon = carbonoKg / 1000;
  const tariff = pickNumber(data.overview.tarifa_kwh, data.settings?.tarifa_kwh);
  const baselineKwhDia = pickNumber(data.overview.baseline_kwh_dia, data.settings?.baseline_kwh_dia);
  const baselineKwhPeriodo = pickNumber(data.overview.baseline_kwh_periodo) ?? (baselineKwhDia !== null ? baselineKwhDia * periodDates.length : null);
  const economiaKwh = baselineKwhPeriodo !== null ? baselineKwhPeriodo - totalKwh : null;
  const economiaPercentual = baselineKwhPeriodo && baselineKwhPeriodo > 0 ? (economiaKwh! / baselineKwhPeriodo) * 100 : null;
  const custoTotal = tariff !== null ? totalKwh * tariff : null;
  const deltaTMedio = roundValue(avgValues(points.filter((p) => asNumber(p.tr_total) > 0), (p) => pointDeltaT(p)), 2);
  const oatMedio = roundValue(avgValues(points, (p) => pointOat(p)), 2);

  const overview: DashboardData["overview"] = {
    ...data.overview,
    periodo_inicio: points[0]?.timestamp ?? data.overview.periodo_inicio,
    periodo_fim: points.at(-1)?.timestamp ?? data.overview.periodo_fim,
    kwh_total: roundValue(totalKwh, 2),
    kwh_chillers: roundValue(totalKwhChillers, 2),
    kwh_bombas: roundValue(totalKwhBombas, 2),
    kwh_torres: roundValue(totalKwhTorres, 2),
    kwh_auxiliares: roundValue(totalKwhAuxiliares, 2),
    trh_total: roundValue(totalTrh, 2),
    kwtr_medio: roundValue(kwtr, 3),
    kwtr_meta: metaKwtr,
    desvio_meta_kwtr: roundValue(desvio, 2),
    cop_medio: roundValue(cop, 2),
    pico_kw: roundValue(picoKw, 2),
    hora_pico: picoPoint?.timestamp ?? null,
    carbono_kg: roundValue(carbonoKg, 3),
    carbono_ton: roundValue(carbonoTon, 6),
    tarifa_kwh: tariff,
    custo_total: roundValue(custoTotal, 2),
    baseline_kwh_dia: baselineKwhDia,
    baseline_kwh_periodo: roundValue(baselineKwhPeriodo, 2),
    economia_kwh: roundValue(economiaKwh, 2),
    economia_percentual: roundValue(economiaPercentual, 2),
    economia_vs_baseline_kwh: roundValue(economiaKwh, 2),
    economia_vs_baseline_percent: roundValue(economiaPercentual, 2),
    kwh_m2: area > 0 ? roundValue(totalKwh / area, 6) : null,
    trh_m2: area > 0 ? roundValue(totalTrh / area, 6) : null,
    kw_pico_m2: area > 0 ? roundValue(picoKw / area, 6) : null,
    deltaT_evap_medio: deltaTMedio,
    delta_t_medio: deltaTMedio,
    deltaT_medio: deltaTMedio,
    deltaT_cond_medio: roundValue(avgValues(points.filter((p) => asNumber(p.tr_total) > 0), (p) => p.deltaT_cond_medio), 2),
    oat_medio: oatMedio,
    temp_externa_media: oatMedio,
    vazao_media: roundValue(avgValues(points, (p) => p.vazao), 2),
  };

  const chillers = buildDailyChillers(points, totalKwhChillers, intervalHours);

  return {
    ...data,
    overview,
    chillers,
    analytics: { series_15min: points },
    esg: {
      ...(data.esg ?? {}),
      fator_carbono_kgco2_kwh: carbonFactor,
      carbono_kg: overview.carbono_kg,
      carbono_ton: overview.carbono_ton,
      kwh_total: overview.kwh_total,
      kwtr_medio: overview.kwtr_medio,
      desvio_meta_kwtr: overview.desvio_meta_kwtr,
    },
    comparisons,
    daily_trends,
    reports: {
      ...(data.reports ?? {}),
      resumo: {
        ...(data.reports?.resumo ?? {}),
        consumo_total_kwh: overview.kwh_total,
        carga_total_trh: overview.trh_total,
        eficiencia_media_kwtr: overview.kwtr_medio,
        meta_kwtr: overview.kwtr_meta,
        desvio_meta_percentual: overview.desvio_meta_kwtr,
        pico_kw: overview.pico_kw,
        hora_pico: overview.hora_pico,
        carbono_ton: overview.carbono_ton,
      },
      insights: [],
    },
  };
}


function urlWithPeriod(url: string, period: DashboardPeriod) {
  const separator = url.includes("?") ? "&" : "?";
  const days = period === "month" ? 30 : 7;

  // Mesmo no D-1 buscamos um payload histórico curto para comparações locais.
  return `${url}${separator}period=${encodeURIComponent(period)}&days=${days}`;
}

function dashboardUrlForPeriod(baseUrl: string, period: DashboardPeriod) {
  // O frontend precisa receber payload histórico para calcular D-1 vs D-2,
  // tendências e comparações locais. Semana usa 7 dias; mês usa até 30 dias.
  if (baseUrl === DASHBOARD_DATA_URL) {
    return urlWithPeriod(baseUrl, period);
  }

  const periodUrl = period === "month" ? N8N_DASHBOARD_DATA_MONTH_URL : N8N_DASHBOARD_DATA_WEEK_URL;
  return urlWithPeriod(periodUrl, period);
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function getDashboardDataForPeriod(period: DashboardPeriod = getDashboardPeriod()): Promise<DashboardData> {
  async function fetchAndNormalize(url: string): Promise<DashboardData> {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json,text/plain,*/*" },
      cache: "no-store",
    });

    const payload = await readResponsePayload(response);

    if (!response.ok) {
      throw new Error(`Falha ao buscar dashboard em ${url}: ${response.status}`);
    }

    if (payload && typeof payload === "object" && "error" in (payload as Record<string, unknown>)) {
      throw new Error(String((payload as { message?: unknown }).message || "serviço de dados retornou erro"));
    }

    const data = scopeDashboardData(normalize(payload), period);

    if (!data.overview || Object.keys(data.overview).length === 0) {
      throw new Error(`Resposta sem overview em ${url}`);
    }

    return data;
  }

  try {
    return await fetchAndNormalize(dashboardUrlForPeriod(DASHBOARD_DATA_URL, period));
  } catch (proxyError) {
    // Fallback útil em preview/local quando o /api do dashboard não está ativo.
    // Em produção normal, o /api deve funcionar e evitar CORS.
    if (DASHBOARD_DATA_URL !== N8N_DASHBOARD_DATA_URL) {
      try {
        return await fetchAndNormalize(dashboardUrlForPeriod(N8N_DASHBOARD_DATA_URL, period));
      } catch (directError) {
        throw new Error(
          `Não foi possível carregar dados reais. Proxy: ${(proxyError as Error).message}. Direto serviço de dados: ${(directError as Error).message}`,
        );
      }
    }

    throw proxyError;
  }
}

async function fetchDashboardPayload(url: string): Promise<unknown> {
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json,text/plain,*/*" },
    cache: "no-store",
  });

  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new Error(`Falha ao buscar dashboard em ${url}: ${response.status}`);
  }

  if (payload && typeof payload === "object" && "error" in (payload as Record<string, unknown>)) {
    throw new Error(String((payload as { message?: unknown }).message || "serviço de dados retornou erro"));
  }

  return payload;
}

export async function getDashboardData(): Promise<DashboardData> {
  return getDashboardDataForPeriod(getDashboardPeriod());
}

export async function getDashboardDataFull(): Promise<DashboardData> {
  async function fetchAndNormalizeFull(url: string): Promise<DashboardData> {
    const data = normalize(await fetchDashboardPayload(url));

    if (!data.overview || Object.keys(data.overview).length === 0) {
      throw new Error(`Resposta sem overview em ${url}`);
    }

    return scopeDashboardData(data, "week");
  }

  try {
    return await fetchAndNormalizeFull(dashboardUrlForPeriod(DASHBOARD_DATA_URL, "week"));
  } catch (proxyError) {
    if (DASHBOARD_DATA_URL !== N8N_DASHBOARD_DATA_URL) {
      try {
        return await fetchAndNormalizeFull(dashboardUrlForPeriod(N8N_DASHBOARD_DATA_URL, "week"));
      } catch (directError) {
        throw new Error(
          `Não foi possível carregar dados reais. Proxy: ${(proxyError as Error).message}. Direto serviço de dados: ${(directError as Error).message}`,
        );
      }
    }

    throw proxyError;
  }
}

export async function postDashboardCsv(file: File): Promise<unknown> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("source", "dashboard-upload");

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar CSV: ${response.status}`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function useDashboardData() {
  const period = useDashboardPeriod();
  return useQuery({
    queryKey: ["dashboard-data", period, DASHBOARD_DATA_URL],
    queryFn: () => getDashboardDataForPeriod(period),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useDashboardDataFull() {
  return useQuery({
    queryKey: ["dashboard-data", "full-period", DASHBOARD_DATA_URL],
    queryFn: getDashboardDataFull,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

function spark(points: DashboardPoint[], key: keyof DashboardPoint): KpiPoint[] {
  return points.slice(-24).map((p, i) => ({
    t: String(i),
    v: Number(p[key] ?? 0),
  }));
}

function trend(data: DashboardData, key: string, fallbackPoints: DashboardPoint[] = [], fallbackKey?: keyof DashboardPoint): KpiPoint[] {
  const daily = data.daily_trends?.[key] ?? [];
  if (daily.length > 1) return daily;
  return fallbackKey ? spark(fallbackPoints, fallbackKey) : [];
}

export function buildKpis(data: DashboardData): DashboardKpi[] {
  const o = data.overview;
  const s = data.analytics.series_15min;
  const totalHours = data.chillers.reduce((acc, c) => acc + Number(c.horas_operacao ?? 0), 0);
  const comp = data.comparisons?.metrics ?? {};
  const withComp = (key: string) => ({
    dod: comp[key]?.vs_previous_day_percent ?? 0,
    d7: comp[key]?.vs_7d_avg_percent ?? 0,
  });

  return [
    { key: "energy", label: "Energia consumida", value: formatNumber(o.kwh_total), unit: "kWh", ...withComp("energy"), goodWhen: "down", color: "water", sparkline: trend(data, "energy", s, "kwh_total") },
    { key: "carbon", label: "Carbono emitido", value: formatNumber(o.carbono_ton, 3), unit: "tCO₂e", ...withComp("carbon"), goodWhen: "down", color: "carbon", sparkline: trend(data, "carbon", s, "carbono_ton") },
    { key: "eff", label: "Eficiência média", value: formatNumber(o.kwtr_medio, 3), unit: "kW/TR", ...withComp("eff"), goodWhen: "down", color: "efficiency", sparkline: trend(data, "eff", s, "kwtr_real"), extra: `Meta: ${formatNumber(o.kwtr_meta, 2)} kW/TR` },
    { key: "cop", label: "COP médio", value: formatNumber(o.cop_medio, 2), unit: "", ...withComp("cop"), goodWhen: "up", color: "esg", sparkline: trend(data, "cop", s, "cop_real") },
    { key: "trh", label: "TRh produzido", value: formatNumber(o.trh_total), unit: "TRh", ...withComp("trh"), goodWhen: "up", color: "water", sparkline: trend(data, "trh", s, "trh_total") },
    { key: "deltaT", label: "Delta-T médio", value: formatNumber(o.deltaT_evap_medio, 2), unit: "°C", ...withComp("deltaT"), goodWhen: "up", color: "water", sparkline: trend(data, "deltaT", s, "deltaT_evap_medio") },
    { key: "peak", label: "Pico de demanda", value: formatNumber(o.pico_kw), unit: "kW", ...withComp("peak"), goodWhen: "down", color: "warning", sparkline: trend(data, "peak", s, "kw_total"), extra: `Hora pico: ${formatDateTime(o.hora_pico)}` },
    { key: "hours", label: "Horas operação", value: formatNumber(totalHours, 1), unit: "h", ...withComp("hours"), goodWhen: "up", color: "warning", sparkline: trend(data, "hours") },
    { key: "baseline", label: "Economia vs baseline", value: formatNumber(o.economia_vs_baseline_percent ?? o.economia_percentual, 2), unit: "%", dod: Number(o.economia_vs_baseline_percent ?? o.economia_percentual ?? 0), d7: 0, goodWhen: "up", color: "efficiency", sparkline: trend(data, "baseline"), extra: o.economia_kwh !== null && o.economia_kwh !== undefined ? `${formatNumber(o.economia_kwh)} kWh economizados` : "Baseline energético" },
  ];
}

function chartLabel(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 16);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function positiveOrNull(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function buildChartSeries(data: DashboardData) {
  let cumulative = 0;
  const rawSeries = data.analytics.series_15min ?? [];
  const operationalSeries = filterValidDashboardPoints(rawSeries).filter((p) => {
    const kw = Number(p.kw_total ?? 0);
    const tr = Number(p.tr_total ?? 0);
    return (Number.isFinite(kw) && kw > 0) || (Number.isFinite(tr) && tr > 0);
  });

  const dates = new Set(operationalSeries.map((p) => dateKey(p.timestamp)).filter(Boolean));
  const isMultiDay = dates.size > 1;

  return operationalSeries.map((p) => {
    const kw = positiveOrNull(p.kw_total);
    const tr = positiveOrNull(p.tr_total);
    const hasAnyOperation = kw !== null || tr !== null;
    const hasCompleteOperation = kw !== null && tr !== null;

    cumulative += Number(p.kwh_total ?? 0);

    return {
      label: isMultiDay ? chartLabel(p.timestamp) : pointTime(p.timestamp),
      time: pointTime(p.timestamp),
      timestamp: p.timestamp,
      // Pontos sem operação são removidos da série para evitar espaços vazios no gráfico.
      kW: kw,
      trh: tr,
      kwPerTr: hasCompleteOperation ? positiveOrNull(p.kwtr_real) : null,
      deltaT: hasCompleteOperation ? positiveOrNull(p.deltaT_evap_medio) : null,
      extTemp: hasAnyOperation ? positiveOrNull(p.oat) : null,
      cumulative: Number(cumulative.toFixed(2)),
    };
  });
}

export function buildConsumptionByPeriod(data: DashboardData) {
  const buckets = [
    { period: "Madrugada (00h–06h)", start: 0, end: 6, color: "water" as const, kWh: 0 },
    { period: "Manhã (06h–12h)", start: 6, end: 12, color: "efficiency" as const, kWh: 0 },
    { period: "Tarde (12h–18h)", start: 12, end: 18, color: "carbon" as const, kWh: 0 },
    { period: "Noite (18h–24h)", start: 18, end: 24, color: "esg" as const, kWh: 0 },
  ];

  for (const p of filterValidDashboardPoints(data.analytics.series_15min)) {
    const d = new Date(p.timestamp ?? "");
    if (Number.isNaN(d.getTime())) continue;
    const hour = d.getHours();
    const bucket = buckets.find((b) => hour >= b.start && hour < b.end);
    if (bucket) bucket.kWh += Number(p.kwh_total ?? 0);
  }

  const total = buckets.reduce((acc, b) => acc + b.kWh, 0);
  return buckets.map((b) => ({
    period: b.period,
    color: b.color,
    kWh: b.kWh,
    pct: total ? Math.round((b.kWh / total) * 100) : 0,
  }));
}

export function buildInsights(data: DashboardData) {
  const o = data.overview ?? {};
  const items: Array<{ icon: string; text: string }> = [];

  const kwtrMedio = Number(o.kwtr_medio);
  const kwtrMeta = Number(o.kwtr_meta ?? data.settings?.meta_kwtr ?? 0.88);

  if (Number.isFinite(kwtrMedio) && Number.isFinite(kwtrMeta) && kwtrMeta > 0) {
    const deviation = ((kwtrMedio - kwtrMeta) / kwtrMeta) * 100;
    const pct = Math.abs(deviation);

    if (deviation <= 0) {
      items.push({
        icon: "leaf",
        text: `CAG operando ${formatNumber(pct, 2)}% melhor que a meta de eficiência (${formatNumber(kwtrMeta, 2)} kW/TR). Eficiência média do período: ${formatNumber(kwtrMedio, 3)} kW/TR.`,
      });
    } else {
      items.push({
        icon: "trend",
        text: `CAG operando ${formatNumber(pct, 2)}% acima da meta de eficiência (${formatNumber(kwtrMeta, 2)} kW/TR). Eficiência média do período: ${formatNumber(kwtrMedio, 3)} kW/TR.`,
      });
    }
  }

  const fromReports = data.reports?.insights?.map((it) => ({
    icon: it.type === "thermal" ? "drop" : it.type === "demand" ? "bolt" : it.type === "efficiency" ? "trend" : "leaf",
    text: `${it.title ?? "Insight"}${it.message ? `: ${it.message}` : ""}`,
  })) ?? [];

  const reportInsightsWithoutGenericEfficiency = fromReports.filter((it) => {
    const normalized = it.text.toLowerCase();
    return !(normalized.includes("eficiência") && normalized.includes("meta"));
  });

  items.push(...reportInsightsWithoutGenericEfficiency);

  if (o.hora_pico) {
    items.push({ icon: "bolt", text: `Pico de demanda em ${formatDateTime(o.hora_pico)} com ${formatNumber(o.pico_kw)} kW.` });
  }

  if (o.deltaT_evap_medio !== undefined && o.deltaT_evap_medio !== null) {
    items.push({ icon: "drop", text: `Delta-T médio do evaporador: ${formatNumber(o.deltaT_evap_medio, 2)} °C.` });
  }

  return items;
}
