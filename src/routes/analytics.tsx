import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Gauge,
  LineChart,
  Radar as RadarIcon,
  Thermometer,
  Timer,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import {
  formatDate,
  formatNumber,
  pointTime,
  useDashboardData,
  type DashboardData,
  type DashboardPoint,
} from "@/lib/dashboard-data";
import { periodLabels, useDashboardPeriod } from "@/lib/period";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Building ESG Performance" },
      { name: "description", content: "Diagnóstico avançado, correlações climáticas, eficiência e comportamento operacional da CAG." },
    ],
  }),
  component: AnalyticsPage,
});

const colors = {
  water: "var(--color-water)",
  efficiency: "var(--color-efficiency)",
  esg: "var(--color-esg)",
  carbon: "var(--color-carbon)",
  warning: "var(--color-warning)",
  critical: "var(--color-critical)",
  muted: "var(--color-muted-foreground)",
};

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function maybeNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Number(value.toFixed(decimals));
}

function avg(values: Array<number | null | undefined>) {
  const valid = values.map(Number).filter(Number.isFinite);
  if (!valid.length) return null;
  return valid.reduce((acc, v) => acc + v, 0) / valid.length;
}

function safeDiv(a: number, b: number) {
  return b > 0 ? a / b : null;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const native = new Date(value);
  if (!Number.isNaN(native.getTime())) return native;
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[,\s]+(\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh = "00", mi = "00"] = match;
  const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hourOf(value?: string | null) {
  return parseDate(value)?.getHours() ?? null;
}

type AnalyticPoint = {
  timestamp: string;
  label: string;
  hour: number | null;
  kw: number | null;
  tr: number | null;
  kwh: number | null;
  trh: number | null;
  kwtr: number | null;
  cop: number | null;
  oat: number | null;
  deltaT: number | null;
  capAvg: number | null;
  onlineCount: number;
  cumulative: number;
  efficiencyScore: number | null;
};

function getPointChillers(point: DashboardPoint) {
  const raw = Array.isArray(point.chillers) ? point.chillers : [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: String(item.id || item.name || `UR${index + 1}`),
      kw: maybeNumber(item.kw),
      tr: maybeNumber(item.tr),
      kwh: maybeNumber(item.kwh),
      trh: maybeNumber(item.trh),
      kwtr: maybeNumber(item.kwtr),
      cop: maybeNumber(item.cop),
      cap: maybeNumber(item.cap_pct),
      deltaT: maybeNumber(item.deltaT_evap),
      online: Boolean(item.online) || item.status === "Online" || asNumber(item.kw) > 0 || asNumber(item.cap_pct) > 0,
    }));
}

function buildAnalyticsSeries(data: DashboardData): AnalyticPoint[] {
  let cumulative = 0;
  return (data.analytics.series_15min || []).map((point) => {
    cumulative += asNumber(point.kwh_total);
    const chillers = getPointChillers(point).filter((c) => c.online);
    const capAvg = avg(chillers.map((c) => c.cap));
    const kwtr = maybeNumber(point.kwtr_real);
    const meta = asNumber(point.kwtr_meta ?? data.overview.kwtr_meta ?? data.settings?.meta_kwtr, 0.88);
    const efficiencyScore = kwtr && meta ? Math.max(0, Math.min(100, 100 - ((kwtr - meta) / meta) * 100)) : null;
    return {
      timestamp: point.timestamp || "",
      label: pointTime(point.timestamp),
      hour: hourOf(point.timestamp),
      kw: maybeNumber(point.kw_total),
      tr: maybeNumber(point.tr_total),
      kwh: maybeNumber(point.kwh_total),
      trh: maybeNumber(point.trh_total),
      kwtr,
      cop: maybeNumber(point.cop_real),
      oat: maybeNumber(point.oat),
      deltaT: maybeNumber(point.deltaT_evap_medio),
      capAvg,
      onlineCount: chillers.length,
      cumulative: round(cumulative, 2) || 0,
      efficiencyScore,
    };
  });
}

function corrCoef(xs: number[], ys: number[]) {
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < 3) return null;
  const avgX = pairs.reduce((acc, [x]) => acc + x, 0) / pairs.length;
  const avgY = pairs.reduce((acc, [, y]) => acc + y, 0) / pairs.length;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (const [x, y] of pairs) {
    num += (x - avgX) * (y - avgY);
    denX += (x - avgX) ** 2;
    denY += (y - avgY) ** 2;
  }
  const den = Math.sqrt(denX * denY);
  return den ? num / den : null;
}

function buildScatter(series: AnalyticPoint[], x: keyof AnalyticPoint, y: keyof AnalyticPoint) {
  return series
    .filter((p) => Number.isFinite(Number(p[x])) && Number.isFinite(Number(p[y])))
    .map((p) => ({ x: Number(p[x]), y: Number(p[y]), cap: Number(p.capAvg ?? 30), label: p.label, timestamp: p.timestamp }));
}

function buildHeatmap(series: AnalyticPoint[], meta: number) {
  const grouped = new Map<number, AnalyticPoint[]>();
  for (const point of series) {
    if (point.hour === null) continue;
    if (!grouped.has(point.hour)) grouped.set(point.hour, []);
    grouped.get(point.hour)!.push(point);
  }

  return Array.from({ length: 24 }, (_, hour) => {
    const points = grouped.get(hour) || [];
    const kwtr = avg(points.map((p) => p.kwtr));
    const cap = avg(points.map((p) => p.capAvg));
    const kw = avg(points.map((p) => p.kw));
    const ratio = kwtr && meta ? kwtr / meta : null;
    const tone = ratio === null ? "empty" : ratio <= 0.95 ? "good" : ratio <= 1.08 ? "watch" : "bad";
    return { hour, kwtr, cap, kw, tone };
  });
}

function buildRadar(data: DashboardData, series: AnalyticPoint[]) {
  const meta = asNumber(data.overview.kwtr_meta ?? data.settings?.meta_kwtr, 0.88);
  const kwtr = maybeNumber(data.overview.kwtr_medio);
  const deltaT = maybeNumber(data.overview.deltaT_evap_medio);
  const deltaTIdeal = asNumber(data.settings?.deltaT_evap_ideal, 5.5);
  const cap = avg(series.map((p) => p.capAvg));
  const cop = maybeNumber(data.overview.cop_medio);
  const validLoadPoints = series
    .map((p) => p.capAvg)
    .filter((v): v is number => Number.isFinite(Number(v)) && Number(v) > 0);

  const idealRangeScore = validLoadPoints.length
    ? (validLoadPoints.filter((v) => v >= 55 && v <= 85).length / validLoadPoints.length) * 100
    : 0;

  return [
    { metric: "Eficiência", score: kwtr && meta ? Math.max(0, Math.min(100, 100 - ((kwtr - meta) / meta) * 100)) : 70 },
    { metric: "COP", score: cop ? Math.max(0, Math.min(100, (cop / 5) * 100)) : 70 },
    { metric: "Delta-T", score: deltaT ? Math.max(0, Math.min(100, (deltaT / deltaTIdeal) * 100)) : 70 },
    { metric: "Carga", score: cap ? Math.max(0, Math.min(100, 100 - Math.abs(cap - 70) * 1.35)) : 65 },
    { metric: "Faixa ideal", score: Math.max(0, Math.min(100, idealRangeScore)) },
  ];
}

function buildDiagnostics(data: DashboardData, series: AnalyticPoint[]) {
  const meta = asNumber(data.overview.kwtr_meta ?? data.settings?.meta_kwtr, 0.88);
  const deltaMin = asNumber(data.settings?.deltaT_evap_min, 4);
  const correlation = corrCoef(series.map((p) => asNumber(p.oat ?? (p as Record<string, unknown>).temp_externa, NaN)), series.map((p) => asNumber(p.kwtr, NaN)));
  const outOfMeta = series.filter((p) => p.kwtr !== null && p.kwtr > meta).length;
  const lowDelta = series.filter((p) => p.deltaT !== null && p.deltaT < deltaMin).length;
  const peak = series.reduce<AnalyticPoint | null>((max, p) => (!max || asNumber(p.kw) > asNumber(max.kw) ? p : max), null);
  const best = series.filter((p) => p.kwtr && p.kwtr > 0).sort((a, b) => asNumber(a.kwtr) - asNumber(b.kwtr))[0];

  const diagnostics = [
    {
      title: "Correlação climática",
      message: correlation === null
        ? "Aguardando série suficiente para calcular impacto da temperatura externa."
        : `Correlação OAT × kW/TR em ${formatNumber(Math.abs(correlation) * 100, 0)}%. ${correlation > 0.45 ? "A temperatura externa influencia fortemente a eficiência." : "Impacto climático moderado no período."}`,
      tone: correlation !== null && correlation > 0.6 ? "warning" : "info",
    },
    {
      title: "Faixa de eficiência",
      message: `${outOfMeta} leituras acima da meta de ${formatNumber(meta, 2)} kW/TR no período selecionado.`,
      tone: outOfMeta > series.length * 0.25 ? "warning" : "success",
    },
    {
      title: "Delta-T operacional",
      message: `${lowDelta} pontos abaixo do mínimo configurado de ${formatNumber(deltaMin, 1)}°C.`,
      tone: lowDelta ? "warning" : "success",
    },
  ];

  if (peak) {
    diagnostics.push({
      title: "Horário crítico",
      message: `Pico de ${formatNumber(peak.kw)} kW às ${peak.label}, com kW/TR em ${formatNumber(peak.kwtr, 3)}.`,
      tone: "info",
    });
  }

  if (best) {
    diagnostics.push({
      title: "Melhor ponto operacional",
      message: `Melhor eficiência registrada às ${best.label}: ${formatNumber(best.kwtr, 3)} kW/TR.`,
      tone: "success",
    });
  }

  return diagnostics.slice(0, 5);
}

function PremiumTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-[var(--chart-tooltip-border)] bg-[linear-gradient(180deg,var(--chart-tooltip-bg),var(--chart-tooltip-bg-2))] p-3 text-xs shadow-[0_24px_80px_rgba(0,0,0,.50)] backdrop-blur-xl">
      <div className="mb-2 font-semibold text-[var(--chart-tooltip-label)]">{label}</div>
      <div className="space-y-1.5">
        {payload.map((item: any) => (
          <div key={item.dataKey || item.name} className="flex items-center justify-between gap-5 text-[var(--chart-tooltip-text)]">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}</span>
            <span className="font-semibold tabular-nums">{formatNumber(Number(item.value), item.name?.includes("kW/TR") ? 3 : 1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  return (
    <div className="rounded-2xl border border-[var(--chart-tooltip-border)] bg-[linear-gradient(180deg,var(--chart-tooltip-bg),var(--chart-tooltip-bg-2))] p-3 text-xs shadow-[0_24px_80px_rgba(0,0,0,.50)] backdrop-blur-xl">
      <div className="font-semibold text-[var(--chart-tooltip-label)]">{p?.label || p?.timestamp}</div>
      <div className="mt-2 space-y-1 text-[var(--chart-tooltip-text)]">
        <div>X: <b>{formatNumber(p?.x, 2)}</b></div>
        <div>Y: <b>{formatNumber(p?.y, 3)}</b></div>
        {p?.cap !== undefined ? <div>Carga: <b>{formatNumber(p.cap, 0)}%</b></div> : null}
      </div>
    </div>
  );
}

function AnalyticsKpi({ label, value, unit, icon, helper, tone = "water" }: { label: string; value: string; unit?: string; icon: ReactNode; helper?: string; tone?: "water" | "efficiency" | "esg" | "carbon" | "warning" | "critical" }) {
  const color = colors[tone];
  return (
    <div className="control-card min-h-[124px] rounded-xl p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15">
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-1 text-[11px] font-medium text-muted-foreground">{label}</span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-foreground/[0.04] dark:bg-white/[0.04]" style={{ color }}>{icon}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[25px] font-semibold leading-none tracking-tight tabular-nums">{value}</span>
        {unit ? <span className="text-[11px] text-muted-foreground">{unit}</span> : null}
      </div>
      {helper ? <div className="mt-2 text-[11px] leading-4 text-muted-foreground">{helper}</div> : null}
    </div>
  );
}

function AnalyticsHero({ data, series }: { data: DashboardData; series: AnalyticPoint[] }) {
  const period = useDashboardPeriod();
  const startDate = formatDate(data.overview.periodo_inicio);
  const endDate = formatDate(data.overview.periodo_fim);
  const label = period === "day" || startDate === endDate ? endDate : `${startDate} – ${endDate}`;
  const meta = asNumber(data.overview.kwtr_meta ?? data.settings?.meta_kwtr, 0.88);
  const outOfMeta = series.filter((p) => p.kwtr !== null && p.kwtr > meta).length;
  const percentage = series.length ? Math.round((outOfMeta / series.length) * 100) : 0;

  return (
    <div className="control-card rounded-2xl p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground">Analytics Intelligence Center</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Diagnóstico avançado da operação</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Correlação climática, faixa ideal, carga parcial, estabilidade e oportunidades de eficiência.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-efficiency/30 bg-efficiency/10 px-3 py-1 text-efficiency">{periodLabels[period]} · {label}</span>
          <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">Meta {formatNumber(meta, 2)} kW/TR</span>
          <span className={`rounded-full border px-3 py-1 ${percentage > 25 ? "border-warning/30 bg-warning/10 text-warning" : "border-efficiency/30 bg-efficiency/10 text-efficiency"}`}>{percentage}% fora da meta</span>
        </div>
      </div>
    </div>
  );
}

function OperationalChart({ data, series }: { data: DashboardData; series: AnalyticPoint[] }) {
  const meta = asNumber(data.overview.kwtr_meta ?? data.settings?.meta_kwtr, 0.88);
  return (
    <div className="control-card chart-panel rounded-2xl p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Operational intelligence</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Comportamento analítico da central</h3>
          <div className="mt-1 text-[11px] text-muted-foreground">kW • kW/TR • capacidade média • temperatura externa • consumo acumulado</div>
        </div>
        <div className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">15 minutos</div>
      </div>
      <div className="chart-stage h-[330px] rounded-xl p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 14, right: 22, left: -12, bottom: 4 }}>
            <defs>
              <linearGradient id="analytics-kw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-water)" stopOpacity={0.46} /><stop offset="100%" stopColor="var(--color-water)" stopOpacity={0} /></linearGradient>
              <linearGradient id="analytics-kwtr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-carbon)" stopOpacity={0.30} /><stop offset="100%" stopColor="var(--color-carbon)" stopOpacity={0} /></linearGradient>
              <filter id="analytics-bloom" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="2.7" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 8" />
            <XAxis dataKey="label" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} minTickGap={40} />
            <YAxis yAxisId="left" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} width={44} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} width={38} domain={["dataMin - 2", "dataMax + 2"]} />
            <YAxis yAxisId="pct" hide domain={[0, 100]} />
            <YAxis yAxisId="cum" hide />
            {meta > 0 ? <ReferenceLine yAxisId="left" y={meta} stroke="var(--chart-reference)" strokeDasharray="6 6" label={{ value: `Meta ${formatNumber(meta, 2)}`, fill: "var(--chart-axis)", fontSize: 10 }} /> : null}
            <Tooltip content={<PremiumTooltip />} cursor={{ stroke: "var(--chart-axis-line)", strokeDasharray: "4 4" }} />
            <Legend wrapperStyle={{ fontSize: 10, color: "var(--chart-axis)" }} iconType="line" />
            <Area yAxisId="left" type="monotone" dataKey="kw" name="kW" stroke="transparent" fill="url(#analytics-kw)" dot={false} isAnimationActive={false} />
            <Area yAxisId="left" type="monotone" dataKey="kwtr" name="kW/TR" stroke="transparent" fill="url(#analytics-kwtr)" dot={false} isAnimationActive={false} />
            <Bar yAxisId="pct" dataKey="capAvg" name="Capacidade média (%)" fill="var(--color-efficiency)" opacity={0.13} radius={[6, 6, 0, 0]} />
            <Line yAxisId="left" type="monotone" dataKey="kw" name="kW" stroke="var(--color-water)" strokeWidth={2.2} dot={false} activeDot={{ r: 4.5 }} filter="url(#analytics-bloom)" />
            <Line yAxisId="left" type="monotone" dataKey="kwtr" name="kW/TR" stroke="var(--color-carbon)" strokeWidth={2} dot={false} activeDot={{ r: 4.5 }} filter="url(#analytics-bloom)" />
            <Line yAxisId="pct" type="monotone" dataKey="capAvg" name="Capacidade (%)" stroke="var(--color-efficiency)" strokeWidth={1.9} strokeDasharray="5 5" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="oat" name="Temp. externa (°C)" stroke="var(--chart-soft-line)" strokeWidth={1.5} strokeDasharray="4 5" dot={false} />
            <Line yAxisId="cum" type="monotone" dataKey="cumulative" name="Consumo acumulado" stroke="var(--chart-soft-line)" strokeWidth={1.65} strokeDasharray="2 7" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CorrelationScatter({ title, subtitle, data, xName, yName, color = colors.efficiency, meta }: { title: string; subtitle: string; data: Array<{ x: number; y: number; cap?: number; label?: string }>; xName: string; yName: string; color?: string; meta?: number | null }) {
  return (
    <div className="control-card chart-panel rounded-2xl p-4">
      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Correlation matrix</div>
        <h3 className="mt-1 text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="chart-stage h-[255px] rounded-xl p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 18, right: 22, left: -12, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis type="number" dataKey="x" name={xName} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
            <YAxis type="number" dataKey="y" name={yName} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} axisLine={false} tickLine={false} domain={["dataMin - 0.05", "dataMax + 0.05"]} />
            <ZAxis type="number" dataKey="cap" range={[34, 126]} />
            <Tooltip content={<ScatterTooltip />} cursor={{ stroke: "var(--chart-reference)", strokeDasharray: "4 4" }} />
            {meta ? <ReferenceLine y={meta} stroke="var(--chart-reference)" strokeDasharray="6 6" label={{ value: "Meta", fill: "var(--chart-axis)", fontSize: 10 }} /> : null}
            <Scatter data={data} fill={color} fillOpacity={0.72} stroke={color} strokeWidth={1.25} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function OperationalHeatmap({ data, meta }: { data: ReturnType<typeof buildHeatmap>; meta: number }) {
  const toneStyle = (tone: string) => {
    if (tone === "good") return { background: "linear-gradient(180deg, color-mix(in oklab, var(--color-efficiency) 76%, transparent), color-mix(in oklab, var(--color-efficiency) 18%, transparent))", boxShadow: "0 0 18px color-mix(in oklab, var(--color-efficiency) 22%, transparent)" };
    if (tone === "watch") return { background: "linear-gradient(180deg, color-mix(in oklab, var(--color-warning) 76%, transparent), color-mix(in oklab, var(--color-warning) 18%, transparent))", boxShadow: "0 0 18px color-mix(in oklab, var(--color-warning) 22%, transparent)" };
    if (tone === "bad") return { background: "linear-gradient(180deg, color-mix(in oklab, var(--color-critical) 76%, transparent), color-mix(in oklab, var(--color-critical) 18%, transparent))", boxShadow: "0 0 18px color-mix(in oklab, var(--color-critical) 22%, transparent)" };
    return { background: "color-mix(in oklab, var(--color-muted-foreground) 10%, transparent)" };
  };

  return (
    <div className="control-card rounded-2xl p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Efficiency heatmap</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Mapa horário de eficiência</h3>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Meta {formatNumber(meta, 2)}</span>
      </div>
      <div className="grid grid-cols-12 gap-1.5">
        {data.map((cell) => (
          <div key={cell.hour} className="group relative h-12 rounded-lg border border-border/60" style={toneStyle(cell.tone)}>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/10 to-transparent opacity-60" />
            <div className="relative flex h-full flex-col items-center justify-center text-[10px] leading-tight">
              <span className="font-semibold tabular-nums">{String(cell.hour).padStart(2, "0")}h</span>
              <span className="text-[9px] text-muted-foreground group-hover:text-foreground">{cell.kwtr ? formatNumber(cell.kwtr, 2) : "—"}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span><b className="text-efficiency">●</b> dentro da meta</span>
        <span><b className="text-warning">●</b> atenção</span>
        <span><b className="text-critical">●</b> acima da meta</span>
      </div>
    </div>
  );
}

function DiagnosticsPanel({ data, series }: { data: DashboardData; series: AnalyticPoint[] }) {
  const diagnostics = buildDiagnostics(data, series);
  return (
    <div className="control-card h-full rounded-2xl p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Operational diagnostics</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Diagnósticos analíticos</h3>
        </div>
        <BrainCircuit className="h-5 w-5 text-esg" />
      </div>
      <div className="space-y-2.5">
        {diagnostics.map((item, index) => {
          const color = item.tone === "success" ? colors.efficiency : item.tone === "warning" ? colors.warning : colors.esg;
          return (
            <div key={`${item.title}-${index}`} className="rounded-xl border border-border/80 bg-foreground/[0.025] p-3 dark:bg-white/[0.025]">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-foreground/[0.04] dark:bg-white/[0.04]" style={{ color, boxShadow: `0 0 18px ${color}18` }}>
                  {item.tone === "warning" ? <AlertTriangle className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <div className="text-sm font-semibold tracking-tight">{item.title}</div>
                  <div className="mt-1 text-[12px] leading-5 text-muted-foreground">{item.message}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RadarPanel({ data, series }: { data: DashboardData; series: AnalyticPoint[] }) {
  const meta = asNumber(data.overview.kwtr_meta ?? data.settings?.meta_kwtr, 0.88);
  const kwtr = asNumber(data.overview.kwtr_medio, meta);
  const cop = asNumber(data.overview.cop_medio, 0);
  const delta = asNumber(data.overview.delta_t_medio, 0);
  const idealLoadPoints = series.filter((p) => p.capAvg !== null && p.capAvg >= 55 && p.capAvg <= 85).length;
  const idealLoadPct = series.length ? (idealLoadPoints / series.length) * 100 : 0;

  const metrics = [
    {
      label: "Eficiência energética",
      value: `${formatNumber(kwtr, 3)} kW/TR`,
      score: Math.max(0, Math.min(100, (meta / Math.max(kwtr, 0.01)) * 100)),
      description: kwtr <= meta ? "Operação dentro da meta" : "Acima da meta operacional",
      tone: "var(--color-efficiency)",
    },
    {
      label: "COP operacional",
      value: formatNumber(cop, 2),
      score: Math.max(0, Math.min(100, (cop / 5.5) * 100)),
      description: cop >= 4 ? "Performance térmica elevada" : "Eficiência térmica moderada",
      tone: "var(--color-water)",
    },
    {
      label: "Delta-T evaporador",
      value: `${formatNumber(delta, 1)}°C`,
      score: Math.max(0, Math.min(100, 100 - Math.abs(delta - 5.5) * 12)),
      description: "Proximidade da faixa ideal",
      tone: "var(--color-carbon)",
    },
    {
      label: "Faixa ideal",
      value: `${formatNumber(idealLoadPct, 0)}%`,
      score: idealLoadPct,
      description: "Tempo em carga operacional eficiente",
      tone: "var(--color-warning)",
    },
  ];

  return (
    <div className="control-card chart-panel rounded-2xl p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Operational health</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Saúde operacional da planta</h3>
        </div>
        <RadarIcon className="h-5 w-5 text-carbon" />
      </div>

      <div className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-border/70 bg-foreground/[0.025] p-3 dark:bg-white/[0.025]">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold tracking-tight">{metric.label}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{metric.description}</div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold tabular-nums">{metric.value}</div>
                <div className="text-[11px] text-muted-foreground">{formatNumber(metric.score, 0)}%</div>
              </div>
            </div>

            <div className="relative h-2.5 overflow-hidden rounded-full bg-white/5 dark:bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${metric.score}%`,
                  background: `linear-gradient(90deg, ${metric.tone}99, ${metric.tone})`,
                  boxShadow: `0 0 18px ${metric.tone}55`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelinePanel({ series }: { series: AnalyticPoint[] }) {
  const hourly = Array.from({ length: 24 }, (_, hour) => {
    const points = series.filter((p) => p.hour === hour);
    return {
      hour: `${String(hour).padStart(2, "0")}h`,
      online: Math.round(avg(points.map((p) => p.onlineCount)) || 0),
      cap: round(avg(points.map((p) => p.capAvg)), 0) || 0,
    };
  });
  return (
    <div className="control-card chart-panel rounded-2xl p-4">
      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Machine timeline</div>
        <h3 className="mt-1 text-lg font-semibold tracking-tight">Linha operacional das unidades</h3>
      </div>
      <div className="chart-stage h-[260px] rounded-xl p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={hourly} margin={{ top: 18, right: 20, left: -18, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="hour" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} minTickGap={16} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip content={<PremiumTooltip />} />
            <Bar yAxisId="left" dataKey="online" name="URs online" fill="var(--color-efficiency)" opacity={0.72} radius={[6, 6, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="cap" name="Carga média %" stroke="var(--color-water)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const { data, isLoading, error } = useDashboardData();

  if (isLoading) {
    return <AppShell><div className="control-card rounded-2xl p-4 text-sm text-muted-foreground">Carregando analytics...</div></AppShell>;
  }

  if (error || !data) {
    return <AppShell><div className="control-card rounded-2xl p-4 text-sm text-warning">Não foi possível carregar analytics.</div></AppShell>;
  }

  const series = buildAnalyticsSeries(data);
  const meta = asNumber(data.overview.kwtr_meta ?? data.settings?.meta_kwtr, 0.88);
  const correlation = corrCoef(series.map((p) => asNumber(p.oat ?? (p as Record<string, unknown>).temp_externa, NaN)), series.map((p) => asNumber(p.kwtr, NaN)));
  const best = series.filter((p) => p.kwtr && p.kwtr > 0).sort((a, b) => asNumber(a.kwtr) - asNumber(b.kwtr))[0];
  const worst = series.filter((p) => p.kwtr && p.kwtr > 0).sort((a, b) => asNumber(b.kwtr) - asNumber(a.kwtr))[0];
  const peak = series.reduce<AnalyticPoint | null>((max, p) => (!max || asNumber(p.kw) > asNumber(max.kw) ? p : max), null);
  const outOfMeta = series.filter((p) => p.kwtr !== null && p.kwtr > meta).length;
  const idealLoadPoints = series.filter((p) => p.capAvg !== null && p.capAvg >= 55 && p.capAvg <= 85).length;
  const idealLoadPct = series.length ? (idealLoadPoints / series.length) * 100 : null;

  const kwtrTemp = buildScatter(series, "oat", "kwtr");
  const loadCop = buildScatter(series, "capAvg", "cop");
  const capEfficiency = buildScatter(series, "capAvg", "efficiencyScore");
  const heatmap = buildHeatmap(series, meta);

  return (
    <AppShell>
      <div className="space-y-3.5">
        <AnalyticsHero data={data} series={series} />

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-6">
          <AnalyticsKpi label="Melhor eficiência" value={formatNumber(best?.kwtr, 3)} unit="kW/TR" icon={<Gauge className="h-4 w-4" />} tone="efficiency" helper={best ? `Registrada às ${best.label}` : "Aguardando dados"} />
          <AnalyticsKpi label="Pior eficiência" value={formatNumber(worst?.kwtr, 3)} unit="kW/TR" icon={<AlertTriangle className="h-4 w-4" />} tone={worst && worst.kwtr && worst.kwtr > meta ? "warning" : "carbon"} helper={worst ? `Registrada às ${worst.label}` : "Aguardando dados"} />
          <AnalyticsKpi label="Horário crítico" value={peak?.label || "—"} icon={<Timer className="h-4 w-4" />} tone="warning" helper={`Pico de ${formatNumber(peak?.kw)} kW`} />
          <AnalyticsKpi label="Correlação climática" value={correlation === null ? "—" : formatNumber(Math.abs(correlation) * 100, 0)} unit="%" icon={<Thermometer className="h-4 w-4" />} tone={correlation && correlation > 0.6 ? "warning" : "esg"} helper="OAT × kW/TR" />
          <AnalyticsKpi label="Fora da meta" value={formatNumber(outOfMeta)} unit="leituras" icon={<LineChart className="h-4 w-4" />} tone={outOfMeta > series.length * 0.25 ? "critical" : "efficiency"} helper={`Meta ${formatNumber(meta, 2)} kW/TR`} />
          <AnalyticsKpi label="Carga ideal" value={formatNumber(idealLoadPct, 0)} unit="%" icon={<BarChart3 className="h-4 w-4" />} tone="water" helper="Faixa 55–85%" />
        </div>

        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
          <div className="xl:col-span-8"><OperationalChart data={data} series={series} /></div>
          <div className="xl:col-span-4"><DiagnosticsPanel data={data} series={series} /></div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
          <div className="xl:col-span-4"><CorrelationScatter title="kW/TR vs temperatura externa" subtitle="Impacto climático na eficiência da planta" data={kwtrTemp} xName="Temp. externa" yName="kW/TR" color={colors.efficiency} meta={meta} /></div>
          <div className="xl:col-span-4"><CorrelationScatter title="Carga vs COP" subtitle="Comportamento termodinâmico em carga parcial" data={loadCop} xName="Carga" yName="COP" color={colors.water} /></div>
          <div className="xl:col-span-4"><CorrelationScatter title="Capacidade vs eficiência" subtitle="Faixa operacional ideal e estabilidade" data={capEfficiency} xName="Capacidade" yName="Score" color={colors.carbon} /></div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
          <div className="xl:col-span-6"><OperationalHeatmap data={heatmap} meta={meta} /></div>
          <div className="xl:col-span-6"><TimelinePanel series={series} /></div>
        </div>
      </div>
    </AppShell>
  );
}
