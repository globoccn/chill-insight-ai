import { useQuery } from "@tanstack/react-query";

export const N8N_WEBHOOK_URL =
  import.meta.env.VITE_N8N_WEBHOOK_URL ||
  "https://ancar-n8n.gpfgqx.easypanel.host/webhook/dados-globo-vm22";

export const DASHBOARD_DATA_URL =
  import.meta.env.VITE_DASHBOARD_DATA_URL || "/api/dashboard";

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
  kwtr_real?: number | null;
  kwtr_meta?: number | null;
  desvio_meta_kwtr?: number | null;
  cop_real?: number | null;
  deltaT_evap_medio?: number | null;
  deltaT_cond_medio?: number | null;
  carbono_kg?: number | null;
  carbono_ton?: number | null;
  oat?: number | null;
  vazao?: number | null;
  chillers?: unknown[];
}

export interface DashboardData {
  settings?: Record<string, unknown>;
  overview: {
    periodo_inicio?: string | null;
    periodo_fim?: string | null;
    kwh_total?: number | null;
    trh_total?: number | null;
    kwtr_medio?: number | null;
    kwtr_meta?: number | null;
    desvio_meta_kwtr?: number | null;
    cop_medio?: number | null;
    pico_kw?: number | null;
    hora_pico?: string | null;
    carbono_kg?: number | null;
    carbono_ton?: number | null;
    kwh_m2?: number | null;
    trh_m2?: number | null;
    kw_pico_m2?: number | null;
    deltaT_evap_medio?: number | null;
    deltaT_cond_medio?: number | null;
    oat_medio?: number | null;
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
};

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

  // n8n às vezes retorna: [{ json: {...} }], [{ value: "{...}" }] ou [{ data: {...} }]
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
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const response = await fetch(DASHBOARD_DATA_URL, {
    method: "GET",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar dashboard: ${response.status}`);
  }

  return normalize(await response.json());
}

export async function postDashboardCsv(file: File): Promise<unknown> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("source", "dashboard-upload");

  const response = await fetch("/api/dashboard/upload", {
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
  return useQuery({
    queryKey: ["dashboard-data", DASHBOARD_DATA_URL],
    queryFn: getDashboardData,
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

export function buildKpis(data: DashboardData): DashboardKpi[] {
  const o = data.overview;
  const s = data.analytics.series_15min;
  const totalHours = data.chillers.reduce((acc, c) => acc + Number(c.horas_operacao ?? 0), 0);

  return [
    { key: "energy", label: "Energia consumida", value: formatNumber(o.kwh_total), unit: "kWh", dod: 0, d7: 0, goodWhen: "down", color: "water", sparkline: spark(s, "kwh_total") },
    { key: "carbon", label: "Carbono emitido", value: formatNumber(o.carbono_ton, 3), unit: "tCO₂e", dod: 0, d7: 0, goodWhen: "down", color: "carbon", sparkline: spark(s, "carbono_ton") },
    { key: "eff", label: "Eficiência média", value: formatNumber(o.kwtr_medio, 3), unit: "kW/TR", dod: Number(o.desvio_meta_kwtr ?? 0), d7: 0, goodWhen: "down", color: "efficiency", sparkline: spark(s, "kwtr_real"), extra: `Meta: ${formatNumber(o.kwtr_meta, 2)} kW/TR` },
    { key: "cop", label: "COP médio", value: formatNumber(o.cop_medio, 2), unit: "", dod: 0, d7: 0, goodWhen: "up", color: "esg", sparkline: spark(s, "cop_real") },
    { key: "trh", label: "TRh produzido", value: formatNumber(o.trh_total), unit: "TRh", dod: 0, d7: 0, goodWhen: "up", color: "water", sparkline: spark(s, "trh_total") },
    { key: "deltaT", label: "Delta-T médio", value: formatNumber(o.deltaT_evap_medio, 2), unit: "°C", dod: 0, d7: 0, goodWhen: "up", color: "water", sparkline: spark(s, "deltaT_evap_medio") },
    { key: "peak", label: "Pico de demanda", value: formatNumber(o.pico_kw), unit: "kW", dod: 0, d7: 0, goodWhen: "down", color: "warning", sparkline: spark(s, "kw_total"), extra: `Hora pico: ${formatDateTime(o.hora_pico)}` },
    { key: "hours", label: "Horas operação", value: formatNumber(totalHours, 1), unit: "h", dod: 0, d7: 0, goodWhen: "down", color: "efficiency", sparkline: [] },
    { key: "baseline", label: "Desvio da meta", value: formatNumber(o.desvio_meta_kwtr, 2), unit: "%", dod: Number(o.desvio_meta_kwtr ?? 0), d7: 0, goodWhen: "down", color: "esg", sparkline: [], extra: "Comparado à meta kW/TR" },
  ];
}

export function buildChartSeries(data: DashboardData) {
  let cumulative = 0;
  return data.analytics.series_15min.map((p) => {
    cumulative += Number(p.kwh_total ?? 0);
    return {
      time: pointTime(p.timestamp),
      kW: p.kw_total ?? null,
      trh: p.tr_total ?? null,
      kwPerTr: p.kwtr_real ?? null,
      deltaT: p.deltaT_evap_medio ?? null,
      extTemp: p.oat ?? null,
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

  for (const p of data.analytics.series_15min) {
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
