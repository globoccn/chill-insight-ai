import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CloudSun,
  Coins,
  FileText,
  Leaf,
  LineChart,
  PieChart,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import {
  buildInsights,
  formatDate,
  formatDateTime,
  formatNumber,
  pointTime,
  useDashboardData,
  type DashboardData,
  type DashboardPoint,
} from "@/lib/dashboard-data";
import { periodLabels, useDashboardPeriod } from "@/lib/period";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Building ESG Performance" },
      { name: "description", content: "Relatórios executivos e operacionais da CAG." },
    ],
  }),
  component: ReportsPage,
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

type ReportPoint = {
  timestamp: string;
  label: string;
  date: string;
  kw: number | null;
  kwh: number | null;
  trh: number | null;
  kwtr: number | null;
  cop: number | null;
  carbon: number | null;
  cost: number | null;
  oat: number | null;
  deltaT: number | null;
  cumulativeKwh: number;
  cumulativeCarbon: number;
};

type DailyRow = {
  date: string;
  label: string;
  kwh: number;
  trh: number;
  kwtr: number | null;
  cop: number | null;
  carbon: number;
  cost: number | null;
  peak: number;
  deltaT: number | null;
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

function dateKey(value?: string | null) {
  const parsed = parseDate(value);
  if (!parsed) return value?.split("T")[0]?.slice(0, 10) || "—";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function avg(values: Array<number | null | undefined>) {
  const valid = values.map(Number).filter(Number.isFinite);
  if (!valid.length) return null;
  return valid.reduce((acc, v) => acc + v, 0) / valid.length;
}

function percentChange(current: number | null | undefined, baseline: number | null | undefined) {
  const c = Number(current);
  const b = Number(baseline);
  if (!Number.isFinite(c) || !Number.isFinite(b) || b === 0) return null;
  return ((c - b) / b) * 100;
}

function buildReportSeries(data: DashboardData): ReportPoint[] {
  const factor = asNumber(data.esg?.fator_carbono_kgco2_kwh ?? data.settings?.fator_carbono_kgco2_kwh, 0.0385);
  const tariff = maybeNumber((data.overview as Record<string, unknown>).tarifa_kwh ?? data.settings?.tarifa_kwh);
  let cumulativeKwh = 0;
  let cumulativeCarbon = 0;

  return (data.analytics?.series_15min || [])
    .filter((p) => p.timestamp)
    .map((p) => {
      const kwh = maybeNumber(p.kwh_total) ?? 0;
      const carbon = maybeNumber(p.carbono_ton) ?? (kwh * factor) / 1000;
      cumulativeKwh += kwh;
      cumulativeCarbon += carbon;
      return {
        timestamp: String(p.timestamp),
        label: pointTime(p.timestamp),
        date: dateKey(p.timestamp),
        kw: maybeNumber(p.kw_total),
        kwh,
        trh: maybeNumber(p.trh_total),
        kwtr: maybeNumber(p.kwtr_real),
        cop: maybeNumber(p.cop_real),
        carbon,
        cost: tariff !== null ? kwh * tariff : maybeNumber((p as Record<string, unknown>).custo_energia),
        oat: maybeNumber(p.oat ?? (p as Record<string, unknown>).temp_externa),
        deltaT: maybeNumber(p.deltaT_evap_medio ?? (p as Record<string, unknown>).delta_t_ag ?? (p as Record<string, unknown>).delta_t_medio ?? (p as Record<string, unknown>).deltaT_medio),
        cumulativeKwh: round(cumulativeKwh, 2) ?? 0,
        cumulativeCarbon: round(cumulativeCarbon, 6) ?? 0,
      };
    });
}

function buildDailyRows(points: ReportPoint[]): DailyRow[] {
  const byDate = new Map<string, ReportPoint[]>();
  for (const p of points) {
    if (!byDate.has(p.date)) byDate.set(p.date, []);
    byDate.get(p.date)!.push(p);
  }

  return Array.from(byDate.entries()).map(([date, rows]) => {
    const kwh = rows.reduce((acc, p) => acc + asNumber(p.kwh), 0);
    const trh = rows.reduce((acc, p) => acc + asNumber(p.trh), 0);
    const kwtr = safeDiv(kwh, trh);
    const cop = kwtr ? 3.516 / kwtr : null;
    const carbon = rows.reduce((acc, p) => acc + asNumber(p.carbon), 0);
    const costValues = rows.map((p) => p.cost).filter((v): v is number => Number.isFinite(Number(v)));
    const cost = costValues.length ? costValues.reduce((acc, v) => acc + v, 0) : null;
    const peak = rows.reduce((max, p) => Math.max(max, asNumber(p.kw)), 0);

    return {
      date,
      label: formatDate(date),
      kwh: round(kwh, 2) ?? 0,
      trh: round(trh, 2) ?? 0,
      kwtr: round(kwtr, 3),
      cop: round(cop, 2),
      carbon: round(carbon, 6) ?? 0,
      cost: round(cost, 2),
      peak: round(peak, 2) ?? 0,
      deltaT: round(avg(rows.map((p) => p.deltaT)), 2),
    };
  });
}

function metricComparison(data: DashboardData, key: string) {
  const metric = data.comparisons?.metrics?.[key];
  return {
    previous: metric?.vs_previous_day_percent ?? null,
    week: metric?.vs_7d_avg_percent ?? null,
  };
}

function formatChange(value: number | null | undefined, goodWhen: "up" | "down") {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return { label: "—", className: "text-muted-foreground", Icon: TrendingUp };
  }
  const n = Number(value);
  const good = goodWhen === "down" ? n <= 0 : n >= 0;
  return {
    label: `${n > 0 ? "+" : ""}${formatNumber(n, 1)}%`,
    className: good ? "text-efficiency" : "text-warning",
    Icon: n <= 0 ? TrendingDown : TrendingUp,
  };
}

function ReportsHero({ data, points }: { data: DashboardData; points: ReportPoint[] }) {
  const period = useDashboardPeriod();
  const startDate = formatDate(data.overview.periodo_inicio);
  const endDate = formatDate(data.overview.periodo_fim);
  const label = period === "day" || startDate === endDate ? endDate : `${startDate} – ${endDate}`;
  const insights = data.reports?.insights?.length ?? buildInsights(data).length;
  const hasCost = Number.isFinite(Number((data.overview as Record<string, unknown>).custo_total)) || Number.isFinite(Number(data.settings?.tarifa_kwh));

  return (
    <div className="control-card rounded-2xl p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground">Reports Intelligence Center</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Relatório executivo da operação</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Resumo consolidado, impacto energético, carbono, custo operacional e recomendações para tomada de decisão.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-efficiency/30 bg-efficiency/10 px-3 py-1 text-efficiency">{periodLabels[period]} · {label}</span>
          <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">{points.length} leituras consolidadas</span>
          <span className="rounded-full border border-esg/30 bg-esg/10 px-3 py-1 text-esg">{insights} insights executivos</span>
          <span className={`rounded-full border px-3 py-1 ${hasCost ? "border-warning/30 bg-warning/10 text-warning" : "border-border text-muted-foreground"}`}>{hasCost ? "Custo ativo" : "Tarifa não configurada"}</span>
        </div>
      </div>
    </div>
  );
}

function ReportKpi({ label, value, unit, icon, tone = "water", helper, previous, week, goodWhen = "down" }: { label: string; value: string; unit?: string; icon: ReactNode; tone?: "water" | "efficiency" | "esg" | "carbon" | "warning"; helper?: string; previous?: number | null; week?: number | null; goodWhen?: "up" | "down" }) {
  const color = colors[tone];
  const prev = formatChange(previous, goodWhen);
  const wk = formatChange(week, goodWhen);
  return (
    <div className="control-card group min-h-[138px] rounded-xl p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15">
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-1 text-[11px] font-medium text-muted-foreground">{label}</span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-foreground/[0.04] dark:bg-white/[0.04]" style={{ color }}>{icon}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[25px] font-semibold leading-none tracking-tight tabular-nums">{value}</span>
        {unit ? <span className="text-[11px] text-muted-foreground">{unit}</span> : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <span className={`inline-flex items-center gap-1 rounded-lg border border-border/70 bg-foreground/[0.02] px-2 py-1 dark:bg-white/[0.02] ${prev.className}`}><prev.Icon className="h-3 w-3" /> {prev.label} D-2</span>
        <span className={`inline-flex items-center gap-1 rounded-lg border border-border/70 bg-foreground/[0.02] px-2 py-1 dark:bg-white/[0.02] ${wk.className}`}><wk.Icon className="h-3 w-3" /> {wk.label} 7d</span>
      </div>
      {helper ? <div className="mt-2 text-[11px] leading-4 text-muted-foreground">{helper}</div> : null}
    </div>
  );
}

function PremiumTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-[var(--chart-tooltip-border)] bg-[linear-gradient(180deg,var(--chart-tooltip-bg),var(--chart-tooltip-bg-2))] p-3 text-xs shadow-[0_24px_80px_rgba(0,0,0,.50)] backdrop-blur-xl">
      <div className="font-semibold text-[var(--chart-tooltip-label)]">{label}</div>
      <div className="mt-2 space-y-1.5">
        {payload.map((item: any) => (
          <div key={item.name} className="flex min-w-[190px] items-center justify-between gap-4 text-[var(--chart-tooltip-text)]">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}</span>
            <span className="font-semibold text-[var(--chart-tooltip-label)]">{formatNumber(Number(item.value), item.name?.includes("kW/TR") ? 3 : item.name?.includes("tCO") ? 4 : 1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsumptionReportChart({ data, points }: { data: DashboardData; points: ReportPoint[] }) {
  const meta = asNumber(data.overview.kwtr_meta ?? data.settings?.meta_kwtr, 0.88);
  return (
    <div className="control-card chart-panel rounded-2xl p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Energy report</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Consumo, eficiência e carbono</h3>
          <div className="mt-1 text-[11px] text-muted-foreground">kWh acumulado • kW/TR • carbono acumulado • temperatura externa</div>
        </div>
        <div className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">15 minutos</div>
      </div>
      <div className="chart-stage h-[340px] rounded-xl p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 16, right: 24, left: -10, bottom: 4 }}>
            <defs>
              <linearGradient id="report-kwh" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-water)" stopOpacity={0.48} /><stop offset="100%" stopColor="var(--color-water)" stopOpacity={0} /></linearGradient>
              <linearGradient id="report-carbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-esg)" stopOpacity={0.30} /><stop offset="100%" stopColor="var(--color-esg)" stopOpacity={0} /></linearGradient>
              <filter id="report-bloom" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="2.7" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 8" />
            <XAxis dataKey="label" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} minTickGap={42} />
            <YAxis yAxisId="energy" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} width={46} />
            <YAxis yAxisId="eff" orientation="right" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} width={42} domain={["dataMin - 0.05", "dataMax + 0.05"]} />
            <YAxis yAxisId="carbon" hide />
            <YAxis yAxisId="temp" hide domain={["dataMin - 2", "dataMax + 2"]} />
            <Tooltip content={<PremiumTooltip />} cursor={{ stroke: "var(--chart-axis-line)", strokeDasharray: "4 4" }} />
            <Legend wrapperStyle={{ fontSize: 10, color: "var(--chart-axis)" }} iconType="line" />
            <Area yAxisId="energy" type="monotone" dataKey="cumulativeKwh" name="kWh acumulado" stroke="transparent" fill="url(#report-kwh)" dot={false} isAnimationActive={false} />
            <Area yAxisId="carbon" type="monotone" dataKey="cumulativeCarbon" name="tCO₂e acumulado" stroke="transparent" fill="url(#report-carbon)" dot={false} isAnimationActive={false} />
            <Line yAxisId="energy" type="monotone" dataKey="cumulativeKwh" name="kWh acumulado" stroke="var(--color-water)" strokeWidth={2.3} dot={false} filter="url(#report-bloom)" />
            <Line yAxisId="eff" type="monotone" dataKey="kwtr" name="kW/TR" stroke="var(--color-carbon)" strokeWidth={2.1} dot={false} filter="url(#report-bloom)" />
            <Line yAxisId="eff" type="monotone" dataKey={() => meta} name="Meta kW/TR" stroke="var(--chart-reference)" strokeWidth={1.4} strokeDasharray="6 6" dot={false} />
            <Line yAxisId="carbon" type="monotone" dataKey="cumulativeCarbon" name="tCO₂e acumulado" stroke="var(--color-esg)" strokeWidth={1.8} dot={false} strokeDasharray="4 5" />
            <Line yAxisId="temp" type="monotone" dataKey="oat" name="Temp. externa" stroke="var(--chart-soft-line)" strokeWidth={1.5} dot={false} strokeDasharray="2 7" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DailyReportChart({ rows }: { rows: DailyRow[] }) {
  return (
    <div className="control-card chart-panel rounded-2xl p-4">
      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Daily breakdown</div>
        <h3 className="mt-1 text-lg font-semibold tracking-tight">Comparativo diário do período</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">Consumo, carbono e eficiência por dia consolidado.</p>
      </div>
      <div className="chart-stage h-[278px] rounded-xl p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 14, right: 20, left: -12, bottom: 4 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 8" />
            <XAxis dataKey="label" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} width={44} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} domain={["dataMin - 0.05", "dataMax + 0.05"]} />
            <Tooltip content={<PremiumTooltip />} cursor={{ stroke: "var(--chart-axis-line)", strokeDasharray: "4 4" }} />
            <Bar yAxisId="left" dataKey="kwh" name="kWh" fill="var(--color-water)" opacity={0.42} radius={[8, 8, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="kwtr" name="kW/TR" stroke="var(--color-carbon)" strokeWidth={2.2} dot={{ r: 3 }} />
            <Line yAxisId="left" type="monotone" dataKey="carbon" name="tCO₂e" stroke="var(--color-esg)" strokeWidth={1.8} strokeDasharray="4 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ExecutiveSummary({ data, rows }: { data: DashboardData; rows: DailyRow[] }) {
  const desvio = asNumber(data.overview.desvio_meta_kwtr);
  const bestDay = rows.reduce<DailyRow | null>((best, row) => (row.kwtr !== null && (!best || row.kwtr < asNumber(best.kwtr, Infinity)) ? row : best), null);
  const worstDay = rows.reduce<DailyRow | null>((worst, row) => (row.kwtr !== null && (!worst || row.kwtr > asNumber(worst.kwtr)) ? row : worst), null);
  const tone = desvio <= 0 ? "text-efficiency" : "text-warning";
  return (
    <div className="control-card h-full rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-efficiency/10 text-efficiency"><FileText className="h-4 w-4" /></div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Executive narrative</div>
          <h3 className="text-lg font-semibold tracking-tight">Resumo do relatório</h3>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-foreground/85">
        No período analisado, a CAG consumiu <b>{formatNumber(data.overview.kwh_total)} kWh</b>, produziu <b>{formatNumber(data.overview.trh_total)} TRh</b> e operou com eficiência média de <b>{formatNumber(data.overview.kwtr_medio, 3)} kW/TR</b>.
        O desvio contra a meta foi de <b className={tone}>{formatNumber(data.overview.desvio_meta_kwtr, 2)}%</b>, com pico de demanda de <b>{formatNumber(data.overview.pico_kw)} kW</b> em <b>{formatDateTime(data.overview.hora_pico)}</b>.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-foreground/[0.02] p-3 dark:bg-white/[0.02]">
          <div className="text-muted-foreground">Melhor dia de eficiência</div>
          <div className="mt-1 font-semibold">{bestDay?.label || "—"} · {formatNumber(bestDay?.kwtr, 3)} kW/TR</div>
        </div>
        <div className="rounded-xl border border-border bg-foreground/[0.02] p-3 dark:bg-white/[0.02]">
          <div className="text-muted-foreground">Dia de maior atenção</div>
          <div className="mt-1 font-semibold">{worstDay?.label || "—"} · {formatNumber(worstDay?.kwtr, 3)} kW/TR</div>
        </div>
      </div>
    </div>
  );
}

function ReportInsights({ data, rows }: { data: DashboardData; rows: DailyRow[] }) {
  const nativeInsights = data.reports?.insights || [];
  const generated = buildInsights(data).map((item) => ({ title: item.title, message: item.text, severity: item.type === "warning" ? "warning" : "success" }));
  const insights = nativeInsights.length ? nativeInsights : generated;
  const peakDay = rows.reduce<DailyRow | null>((max, row) => (!max || row.peak > max.peak ? row : max), null);

  const items = [
    ...insights.slice(0, 4),
    peakDay ? { title: "Pico consolidado", message: `Maior demanda diária em ${peakDay.label}, com ${formatNumber(peakDay.peak)} kW.`, severity: "warning" } : null,
  ].filter(Boolean) as Array<{ title?: string; message?: string; severity?: string }>;

  return (
    <div className="control-card h-full rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Report intelligence</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Insights executivos</h3>
        </div>
        <ClipboardList className="h-4 w-4 text-efficiency" />
      </div>
      <div className="space-y-2.5">
        {items.length ? items.map((item, index) => {
          const warning = item.severity === "warning" || item.severity === "critical";
          return (
            <div key={`${item.title}-${index}`} className={`rounded-xl border p-3 ${warning ? "border-warning/25 bg-warning/10" : "border-efficiency/20 bg-efficiency/10"}`}>
              <div className={`flex items-center gap-2 text-xs font-semibold ${warning ? "text-warning" : "text-efficiency"}`}>
                {warning ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {item.title || "Insight operacional"}
              </div>
              <p className="mt-1.5 text-xs leading-5 text-foreground/75">{item.message}</p>
            </div>
          );
        }) : <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">Sem insights disponíveis para o período.</div>}
      </div>
    </div>
  );
}

function ReportTable({ rows }: { rows: DailyRow[] }) {
  return (
    <div className="control-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Technical appendix</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Consolidado por dia</h3>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{rows.length} registros</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-foreground/[0.03] text-muted-foreground dark:bg-white/[0.03]">
            <tr>
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">kWh</th>
              <th className="px-3 py-2 font-medium">TRh</th>
              <th className="px-3 py-2 font-medium">kW/TR</th>
              <th className="px-3 py-2 font-medium">COP</th>
              <th className="px-3 py-2 font-medium">tCO₂e</th>
              <th className="px-3 py-2 font-medium">Pico kW</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.date} className="border-t border-border/70 hover:bg-foreground/[0.02] dark:hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-medium">{row.label}</td>
                <td className="px-3 py-2">{formatNumber(row.kwh)}</td>
                <td className="px-3 py-2">{formatNumber(row.trh)}</td>
                <td className="px-3 py-2">{formatNumber(row.kwtr, 3)}</td>
                <td className="px-3 py-2">{formatNumber(row.cop, 2)}</td>
                <td className="px-3 py-2">{formatNumber(row.carbon, 4)}</td>
                <td className="px-3 py-2">{formatNumber(row.peak)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsPage() {
  const { data, isLoading, error } = useDashboardData();

  if (isLoading) {
    return <AppShell><div className="control-card rounded-2xl p-4 text-sm text-muted-foreground">Carregando reports...</div></AppShell>;
  }

  if (error || !data) {
    return <AppShell><div className="control-card rounded-2xl p-4 text-sm text-warning">Não foi possível carregar reports.</div></AppShell>;
  }

  const points = buildReportSeries(data);
  const rows = buildDailyRows(points);
  const kwhComp = metricComparison(data, "energy");
  const carbonComp = metricComparison(data, "carbon");
  const effComp = metricComparison(data, "eff");
  const copComp = metricComparison(data, "cop");
  const peakComp = metricComparison(data, "peak");
  const trhComp = metricComparison(data, "trh");
  const cost = maybeNumber((data.overview as Record<string, unknown>).custo_total ?? data.reports?.resumo?.custo_total);
  const baseline = maybeNumber((data.overview as Record<string, unknown>).economia_vs_baseline_percent ?? data.reports?.resumo?.economia_vs_baseline_percent);

  return (
    <AppShell>
      <ReportsHero data={data} points={points} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <ReportKpi label="Consumo total" value={formatNumber(data.overview.kwh_total)} unit="kWh" icon={<Zap className="h-3.5 w-3.5" />} tone="water" previous={kwhComp.previous} week={kwhComp.week} goodWhen="down" helper="Energia consolidada" />
        <ReportKpi label="Eficiência média" value={formatNumber(data.overview.kwtr_medio, 3)} unit="kW/TR" icon={<GaugeIcon />} tone="efficiency" previous={effComp.previous} week={effComp.week} goodWhen="down" helper={`Meta ${formatNumber(data.overview.kwtr_meta, 2)} kW/TR`} />
        <ReportKpi label="Carbono emitido" value={formatNumber(data.overview.carbono_ton, 3)} unit="tCO₂e" icon={<Leaf className="h-3.5 w-3.5" />} tone="esg" previous={carbonComp.previous} week={carbonComp.week} goodWhen="down" helper="Inventário operacional" />
        <ReportKpi label="Custo estimado" value={cost !== null ? `R$ ${formatNumber(cost)}` : "—"} icon={<Coins className="h-3.5 w-3.5" />} tone="warning" previous={null} week={null} goodWhen="down" helper="Depende da tarifa kWh" />
        <ReportKpi label="COP médio" value={formatNumber(data.overview.cop_medio, 2)} icon={<LineChart className="h-3.5 w-3.5" />} tone="carbon" previous={copComp.previous} week={copComp.week} goodWhen="up" helper="Performance termodinâmica" />
        <ReportKpi label="Pico de demanda" value={formatNumber(data.overview.pico_kw)} unit="kW" icon={<BarChart3 className="h-3.5 w-3.5" />} tone="warning" previous={peakComp.previous} week={peakComp.week} goodWhen="down" helper="Máximo do período" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8"><ConsumptionReportChart data={data} points={points} /></div>
        <div className="xl:col-span-4"><ReportInsights data={data} rows={rows} /></div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7"><DailyReportChart rows={rows} /></div>
        <div className="xl:col-span-5"><ExecutiveSummary data={data} rows={rows} /></div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <div className="control-card h-full rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Baseline status</div>
            <h3 className="mt-1 text-lg font-semibold tracking-tight">Economia vs baseline</h3>
            <div className="mt-5 flex items-end gap-2">
              <span className={`text-4xl font-semibold tracking-tight ${baseline !== null && baseline >= 0 ? "text-efficiency" : baseline !== null ? "text-warning" : ""}`}>{baseline !== null ? `${baseline >= 0 ? "+" : ""}${formatNumber(baseline, 1)}%` : "—"}</span>
              <span className="pb-1 text-xs text-muted-foreground">frente à referência configurada</span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-foreground/10 dark:bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-efficiency to-esg shadow-[0_0_18px_var(--color-efficiency)]" style={{ width: `${Math.min(100, Math.max(8, baseline !== null ? Math.abs(baseline) : 0))}%` }} />
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Quando o baseline estiver configurado, este módulo mostra o ganho ou perda energética do período contra a referência operacional.</p>
          </div>
        </div>
        <div className="xl:col-span-4">
          <div className="control-card h-full rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Production ratio</div>
            <h3 className="mt-1 text-lg font-semibold tracking-tight">Carga térmica entregue</h3>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-4xl font-semibold tracking-tight text-water">{formatNumber(data.overview.trh_total)}</span>
              <span className="pb-1 text-xs text-muted-foreground">TRh</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-border bg-foreground/[0.02] p-3 dark:bg-white/[0.02]"><span className="text-muted-foreground">vs D-2</span><div className="mt-1 font-semibold">{formatChange(trhComp.previous, "up").label}</div></div>
              <div className="rounded-xl border border-border bg-foreground/[0.02] p-3 dark:bg-white/[0.02]"><span className="text-muted-foreground">vs 7d</span><div className="mt-1 font-semibold">{formatChange(trhComp.week, "up").label}</div></div>
            </div>
          </div>
        </div>
        <div className="xl:col-span-4">
          <div className="control-card h-full rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Climate context</div>
            <h3 className="mt-1 text-lg font-semibold tracking-tight">Condição térmica</h3>
            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-border bg-foreground/[0.02] p-3 dark:bg-white/[0.02]"><CloudSun className="mb-2 h-4 w-4 text-warning" /><span className="text-muted-foreground">OAT média</span><div className="mt-1 text-lg font-semibold">{formatNumber(data.overview.oat_medio, 1)}°C</div></div>
              <div className="rounded-xl border border-border bg-foreground/[0.02] p-3 dark:bg-white/[0.02]"><PieChart className="mb-2 h-4 w-4 text-efficiency" /><span className="text-muted-foreground">ΔT médio</span><div className="mt-1 text-lg font-semibold">{formatNumber(data.overview.deltaT_evap_medio, 1)}°C</div></div>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Contexto climático e térmico para interpretação do consumo e da eficiência.</p>
          </div>
        </div>
      </div>

      <ReportTable rows={rows} />
    </AppShell>
  );
}

function GaugeIcon() {
  return <CalendarDays className="h-3.5 w-3.5" />;
}
