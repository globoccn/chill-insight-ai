import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CircleDot,
  Gauge,
  LineChart,
  Snowflake,
  Thermometer,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
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
import { ChillersTable } from "@/components/dashboard/ChillersTable";
import type { ReactNode } from "react";
import { formatNumber, pointTime, useDashboardData, type DashboardChiller, type DashboardData, type DashboardPoint } from "@/lib/dashboard-data";

export const Route = createFileRoute("/chillers")({
  head: () => ({
    meta: [
      { title: "Chillers — Building ESG Performance" },
      { name: "description", content: "Central operacional dos chillers com eficiência, capacidade, correlação climática e insights." },
    ],
  }),
  component: ChillersPage,
});

const colors = {
  ur1: "var(--color-water)",
  ur2: "var(--color-efficiency)",
  ur3: "var(--color-carbon)",
  esg: "var(--color-esg)",
  warning: "var(--color-warning)",
  muted: "var(--color-muted-foreground)",
};

const chillerColor = (id?: string) => {
  const normalized = String(id || "").toUpperCase();
  if (normalized.includes("1")) return colors.ur1;
  if (normalized.includes("2")) return colors.ur2;
  if (normalized.includes("3")) return colors.ur3;
  return colors.esg;
};

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function maybeNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeDiv(a: number, b: number) {
  return b > 0 ? a / b : null;
}

function average(values: Array<number | null | undefined>) {
  const valid = values.map(Number).filter(Number.isFinite);
  if (!valid.length) return null;
  return valid.reduce((acc, value) => acc + value, 0) / valid.length;
}

function statusTone(status?: string) {
  if (status === "Online") return "text-efficiency bg-efficiency/10 border-efficiency/30";
  if (status === "Standby") return "text-warning bg-warning/10 border-warning/30";
  return "text-critical bg-critical/10 border-critical/30";
}

function efficiencyTone(kwtr?: number | null, meta?: number | null) {
  if (!kwtr || !meta) return "text-muted-foreground";
  if (kwtr <= meta) return "text-efficiency";
  if (kwtr <= meta * 1.12) return "text-warning";
  return "text-critical";
}

type ChillerPoint = {
  timestamp: string;
  label: string;
  oat: number | null;
  id: string;
  kw: number | null;
  tr: number | null;
  kwh: number | null;
  trh: number | null;
  kwtr: number | null;
  cop: number | null;
  cap: number | null;
  deltaT: number | null;
  online: boolean;
};

function getPointChillers(point: DashboardPoint): ChillerPoint[] {
  const timestamp = point.timestamp || "";
  const oat = maybeNumber(point.oat);
  const raw = Array.isArray(point.chillers) ? point.chillers : [];

  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => {
      const id = String(item.id || item.name || `UR${index + 1}`);
      return {
        timestamp,
        label: pointTime(timestamp),
        oat,
        id,
        kw: maybeNumber(item.kw),
        tr: maybeNumber(item.tr),
        kwh: maybeNumber(item.kwh),
        trh: maybeNumber(item.trh),
        kwtr: maybeNumber(item.kwtr),
        cop: maybeNumber(item.cop),
        cap: maybeNumber(item.cap_pct),
        deltaT: maybeNumber(item.deltaT_evap),
        online: Boolean(item.online) || item.status === "Online" || asNumber(item.kw) > 0 || asNumber(item.cap_pct) > 0,
      };
    });
}

function buildChillerPointSeries(data: DashboardData) {
  return (data.analytics.series_15min || []).flatMap(getPointChillers);
}

function buildCapacitySeries(data: DashboardData) {
  return (data.analytics.series_15min || []).map((point) => {
    const chillers = getPointChillers(point);
    const row: Record<string, string | number | null> = {
      timestamp: point.timestamp || "",
      label: pointTime(point.timestamp),
      oat: maybeNumber(point.oat),
    };

    chillers.forEach((chiller) => {
      row[`${chiller.id}_cap`] = chiller.online ? chiller.cap ?? 0 : 0;
    });

    return row;
  });
}

function buildScatterSeries(data: DashboardData) {
  const byChiller = new Map<string, Array<{ oat: number; kwtr: number; cap: number; timestamp: string; label: string }>>();

  for (const point of buildChillerPointSeries(data)) {
    if (!point.online || point.oat === null || point.kwtr === null || point.kwtr <= 0) continue;
    if (!byChiller.has(point.id)) byChiller.set(point.id, []);
    byChiller.get(point.id)!.push({
      oat: point.oat,
      kwtr: point.kwtr,
      cap: point.cap ?? 0,
      timestamp: point.timestamp,
      label: point.label,
    });
  }

  return Array.from(byChiller.entries()).map(([id, points]) => ({ id, points }));
}

function buildComparisonBars(chillers: DashboardChiller[]) {
  return chillers.map((c) => ({
    name: c.name || c.id,
    kwh: asNumber(c.kwh),
    kwtr: maybeNumber(c.kwtr),
    cop: maybeNumber(c.cop),
    hours: asNumber(c.horas_operacao),
    cap: maybeNumber(c.cap_media),
    color: chillerColor(c.id || c.name),
  }));
}

function buildOperationalInsights(data: DashboardData) {
  const chillers = data.chillers || [];
  const meta = maybeNumber(data.overview.kwtr_meta ?? data.settings?.meta_kwtr) ?? 0.88;
  const online = chillers.filter((c) => c.online || c.status === "Online");
  const best = chillers.filter((c) => Number.isFinite(Number(c.kwtr)) && asNumber(c.kwtr) > 0).sort((a, b) => asNumber(a.kwtr) - asNumber(b.kwtr))[0];
  const worst = chillers.filter((c) => Number.isFinite(Number(c.kwtr)) && asNumber(c.kwtr) > 0).sort((a, b) => asNumber(b.kwtr) - asNumber(a.kwtr))[0];
  const biggestConsumer = chillers.slice().sort((a, b) => asNumber(b.participacao_consumo) - asNumber(a.participacao_consumo))[0];
  const lowDeltaT = chillers.filter((c) => asNumber(c.deltaT_evap_medio) > 0 && asNumber(c.deltaT_evap_medio) < asNumber(data.settings?.deltaT_evap_min, 4));
  const avgCap = average(chillers.map((c) => c.cap_media));

  const insights = [
    {
      title: "Disponibilidade operacional",
      message: `${online.length} de ${chillers.length || 3} unidades em operação no último ponto consolidado.`,
      severity: online.length ? "success" : "warning",
    },
  ];

  if (best) {
    insights.push({
      title: "Melhor eficiência",
      message: `${best.name} lidera o período com ${formatNumber(best.kwtr, 3)} kW/TR.`,
      severity: asNumber(best.kwtr) <= meta ? "success" : "warning",
    });
  }

  if (biggestConsumer) {
    insights.push({
      title: "Concentração de consumo",
      message: `${biggestConsumer.name} responde por ${formatNumber(biggestConsumer.participacao_consumo, 1)}% do consumo dos chillers.`,
      severity: asNumber(biggestConsumer.participacao_consumo) > 55 ? "warning" : "info",
    });
  }

  if (worst && best && worst.id !== best.id) {
    insights.push({
      title: "Spread de eficiência",
      message: `Diferença entre ${worst.name} e ${best.name}: ${formatNumber(asNumber(worst.kwtr) - asNumber(best.kwtr), 3)} kW/TR.`,
      severity: asNumber(worst.kwtr) > meta ? "warning" : "info",
    });
  }

  if (lowDeltaT.length) {
    insights.push({
      title: "Delta-T abaixo do ideal",
      message: `${lowDeltaT.map((c) => c.name).join(", ")} abaixo do mínimo configurado no período.`,
      severity: "warning",
    });
  } else if (avgCap !== null) {
    insights.push({
      title: "Balanceamento de carga",
      message: `Carga média operacional em ${formatNumber(avgCap)}%, útil para avaliar sequenciamento das unidades.`,
      severity: "info",
    });
  }

  return insights.slice(0, 5);
}

function KpiTile({ label, value, unit, icon, tone = "water", helper }: { label: string; value: string; unit?: string; icon: ReactNode; tone?: "water" | "efficiency" | "esg" | "carbon" | "warning"; helper?: string }) {
  const color = tone === "water" ? colors.ur1 : tone === "efficiency" ? colors.ur2 : tone === "carbon" ? colors.ur3 : tone === "warning" ? colors.warning : colors.esg;
  return (
    <div className="control-card group min-h-[126px] rounded-xl p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15">
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-1 text-[11px] font-medium text-muted-foreground">{label}</span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-foreground/[0.04] dark:bg-white/[0.03]" style={{ color }}>{icon}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[25px] font-semibold leading-none tracking-tight tabular-nums">{value}</span>
        {unit ? <span className="text-[11px] text-muted-foreground">{unit}</span> : null}
      </div>
      {helper ? <div className="mt-2 text-[11px] leading-4 text-muted-foreground">{helper}</div> : null}
    </div>
  );
}

function ChillerMachineCard({ c, meta }: { c: DashboardChiller; meta: number }) {
  const color = chillerColor(c.id || c.name);
  const online = c.online || c.status === "Online";
  const cap = Math.max(0, Math.min(100, asNumber(c.cap_media ?? c.cap_atual)));
  const consumption = Math.max(0, Math.min(100, asNumber(c.participacao_consumo)));
  const effRatio = c.kwtr && meta ? Math.max(0, Math.min(100, 100 - ((asNumber(c.kwtr) - meta) / meta) * 100)) : 0;
  const stateLabel = online
    ? asNumber(c.kwtr) > 0 && asNumber(c.kwtr) <= meta ? "Operação eficiente" : "Operação ativa"
    : "Pronta para partida";
  const statusColor = online ? color : colors.warning;

  return (
    <div className="control-card group relative overflow-hidden rounded-2xl p-4 transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full opacity-40 blur-3xl" style={{ background: statusColor }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 opacity-70 blur-2xl" style={{ background: `linear-gradient(180deg, transparent, ${statusColor}28)` }} />
      <div className="pointer-events-none absolute left-0 top-0 h-full w-1" style={{ background: `linear-gradient(180deg, ${statusColor}, transparent)` }} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-foreground/[0.04] shadow-[inset_0_0_24px_rgba(255,255,255,0.04)] dark:bg-white/[0.04]" style={{ color: statusColor, boxShadow: `0 0 24px ${statusColor}22` }}>
            <Snowflake className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold tracking-tight">{c.name}</div>
              <span className="h-2 w-2 rounded-full" style={{ background: statusColor, boxShadow: `0 0 12px ${statusColor}` }} />
            </div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{stateLabel}</div>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusTone(c.status)}`}>{c.status}</span>
      </div>

      <div className="relative mt-5 grid grid-cols-[1.2fr_0.8fr] gap-4">
        <div>
          <div className="text-[11px] text-muted-foreground">Eficiência instantânea</div>
          <div className={`mt-1 text-4xl font-semibold leading-none tracking-tight ${efficiencyTone(c.kwtr, meta)}`}>{formatNumber(c.kwtr, 3)}</div>
          <div className="mt-1 text-[10.5px] text-muted-foreground">kW/TR · meta {formatNumber(meta, 2)}</div>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/40 p-3 text-right dark:bg-white/[0.03]">
          <div className="text-[11px] text-muted-foreground">COP</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{formatNumber(c.cop, 2)}</div>
          <div className="text-[10.5px] text-muted-foreground">performance</div>
        </div>
      </div>

      <div className="relative mt-5 space-y-3.5">
        <MetricBar label="Carga operacional" value={cap} suffix="%" color={statusColor} />
        <MetricBar label="Participação consumo" value={consumption} suffix="%" color={colors.warning} />
        <MetricBar label="Score eficiência" value={effRatio} suffix="%" color={effRatio >= 75 ? colors.ur2 : colors.warning} />
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2 border-t border-border/70 pt-3 text-center">
        <MiniStat label="kWh" value={formatNumber(c.kwh)} />
        <MiniStat label="Horas" value={formatNumber(c.horas_operacao, 1)} />
        <MiniStat label="ΔT" value={`${formatNumber(c.deltaT_evap_medio, 1)}°`} />
      </div>
    </div>
  );
}

function MetricBar({ label, value, suffix, color }: { label: string; value: number; suffix: string; color: string }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{formatNumber(value, 0)}{suffix}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06] dark:bg-white/[0.06]">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}66, ${color})`, boxShadow: `0 0 16px ${color}66` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--chart-tooltip-border)] bg-[linear-gradient(180deg,var(--chart-tooltip-bg),var(--chart-tooltip-bg-2))] px-3 py-2 text-[12px] shadow-2xl backdrop-blur-xl">
      <div className="mb-1 text-[11px] font-semibold text-[var(--chart-tooltip-label)]">{label}</div>
      <div className="space-y-1">
        {payload.map((entry: any) => (
          <div key={`${entry.name}-${entry.dataKey}`} className="flex min-w-[150px] items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-[var(--chart-tooltip-text)]"><span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />{entry.name}</span>
            <span className="font-semibold tabular-nums text-[var(--chart-tooltip-label)]">{formatNumber(entry.value, entry.dataKey?.includes("kwtr") || entry.dataKey?.includes("cop") ? 2 : 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-[var(--chart-tooltip-border)] bg-[linear-gradient(180deg,var(--chart-tooltip-bg),var(--chart-tooltip-bg-2))] px-3 py-2 text-[12px] shadow-2xl backdrop-blur-xl">
      <div className="mb-1 font-semibold text-[var(--chart-tooltip-label)]">{point?.label}</div>
      <div className="space-y-1 text-[var(--chart-tooltip-text)]">
        <div>Temp. externa: <b>{formatNumber(point?.oat, 1)}°C</b></div>
        <div>Eficiência: <b>{formatNumber(point?.kwtr, 3)} kW/TR</b></div>
        <div>Capacidade: <b>{formatNumber(point?.cap, 0)}%</b></div>
      </div>
    </div>
  );
}

function CapacityChart({ data }: { data: DashboardData }) {
  const rows = buildCapacitySeries(data);
  const chillers = data.chillers || [];

  return (
    <div className="control-card chart-panel rounded-2xl p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Capacity profile</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Capacidade operacional</h3>
        </div>
        <div className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Carga % por unidade</div>
      </div>
      <div className="chart-stage h-[270px] rounded-xl p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 20, right: 18, left: -18, bottom: 8 }}>
            <defs>
              {chillers.map((c) => (
                <linearGradient key={c.id} id={`cap-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chillerColor(c.id)} stopOpacity={0.42} />
                  <stop offset="70%" stopColor={chillerColor(c.id)} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={chillerColor(c.id)} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} minTickGap={34} />
            <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--chart-reference)", strokeDasharray: "4 4" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {chillers.map((c) => (
              <Area key={c.id} type="monotone" dataKey={`${c.id}_cap`} name={c.name} stackId="cap" stroke={chillerColor(c.id)} fill={`url(#cap-${c.id})`} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--chart-active-dot-stroke)", strokeWidth: 2 }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EfficiencyClimateScatter({ data }: { data: DashboardData }) {
  const series = buildScatterSeries(data);
  const meta = maybeNumber(data.overview.kwtr_meta ?? data.settings?.meta_kwtr);

  return (
    <div className="control-card chart-panel rounded-2xl p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Climate correlation</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">kW/TR vs temperatura externa</h3>
        </div>
        <div className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Scatter operacional</div>
      </div>
      <div className="chart-stage h-[270px] rounded-xl p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 24, left: -12, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis type="number" dataKey="oat" name="Temp. externa" unit="°C" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
            <YAxis type="number" dataKey="kwtr" name="kW/TR" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} axisLine={false} tickLine={false} domain={["dataMin - 0.05", "dataMax + 0.05"]} />
            <ZAxis type="number" dataKey="cap" range={[34, 130]} />
            <Tooltip content={<ScatterTooltip />} cursor={{ stroke: "var(--chart-reference)", strokeDasharray: "4 4" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {meta ? <ReferenceLine y={meta} stroke="var(--chart-reference)" strokeDasharray="6 6" label={{ value: "Meta", fill: "var(--chart-axis)", fontSize: 11, position: "insideTopRight" }} /> : null}
            {series.map(({ id, points }) => (
              <Scatter key={id} name={id} data={points} fill={chillerColor(id)} fillOpacity={0.72} stroke={chillerColor(id)} strokeWidth={1.3} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ComparativeChart({ data }: { data: DashboardData }) {
  const rows = buildComparisonBars(data.chillers || []);
  const meta = maybeNumber(data.overview.kwtr_meta ?? data.settings?.meta_kwtr);

  return (
    <div className="control-card chart-panel rounded-2xl p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Machine benchmark</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Benchmark entre chillers</h3>
        </div>
      </div>
      <div className="chart-stage h-[250px] rounded-xl p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 18, right: 22, left: -16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="name" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "color-mix(in oklab, var(--color-muted-foreground) 8%, transparent)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="kwh" name="kWh" radius={[8, 8, 2, 2]} fill="var(--color-water)">
              {rows.map((entry) => <Cell key={entry.name} fill={entry.color} fillOpacity={0.78} />)}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="kwtr" name="kW/TR" stroke="var(--color-warning)" strokeWidth={2.4} dot={{ r: 4 }} activeDot={{ r: 5 }} />
            {meta ? <ReferenceLine yAxisId="right" y={meta} stroke="var(--chart-reference)" strokeDasharray="6 6" /> : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function OperationalInsights({ data }: { data: DashboardData }) {
  const insights = buildOperationalInsights(data);

  return (
    <div className="control-card h-full rounded-2xl p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Operational intelligence</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Insights dos chillers</h3>
        </div>
        <LineChart className="h-5 w-5 text-esg" />
      </div>
      <div className="space-y-2.5">
        {insights.map((insight, index) => {
          const color = insight.severity === "success" ? colors.ur2 : insight.severity === "warning" ? colors.warning : colors.esg;
          return (
            <div key={`${insight.title}-${index}`} className="rounded-xl border border-border/80 bg-foreground/[0.025] p-3 dark:bg-white/[0.025]">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-foreground/[0.04] dark:bg-white/[0.04]" style={{ color }}>
                  {insight.severity === "warning" ? <AlertTriangle className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <div className="text-sm font-semibold tracking-tight">{insight.title}</div>
                  <div className="mt-1 text-[12px] leading-5 text-muted-foreground">{insight.message}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChillersPage() {
  const { data, isLoading, error } = useDashboardData();

  if (isLoading) {
    return <AppShell><div className="control-card rounded-2xl p-4 text-sm text-muted-foreground">Carregando chillers...</div></AppShell>;
  }

  if (error || !data) {
    return <AppShell><div className="control-card rounded-2xl p-4 text-sm text-warning">Não foi possível carregar dados dos chillers.</div></AppShell>;
  }

  const chillers = data.chillers || [];
  const online = chillers.filter((c) => c.online || c.status === "Online").length;
  const totalKwh = chillers.reduce((acc, c) => acc + asNumber(c.kwh), 0);
  const totalTrh = chillers.reduce((acc, c) => acc + asNumber(c.trh), 0);
  const avgKwtr = safeDiv(totalKwh, totalTrh);
  const avgCop = avgKwtr ? 3.516 / avgKwtr : null;
  const avgCap = average(chillers.map((c) => c.cap_media));
  const best = chillers.filter((c) => asNumber(c.kwtr) > 0).sort((a, b) => asNumber(a.kwtr) - asNumber(b.kwtr))[0];
  const peakConsumer = chillers.slice().sort((a, b) => asNumber(b.participacao_consumo) - asNumber(a.participacao_consumo))[0];
  const meta = maybeNumber(data.overview.kwtr_meta ?? data.settings?.meta_kwtr) ?? 0.88;

  return (
    <AppShell>
      <div className="space-y-3.5">
        <div className="control-card rounded-2xl p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground">Chiller Operations Center</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Operação das unidades resfriadoras</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Eficiência, capacidade, correlação climática e balanceamento de carga dos chillers.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-efficiency/30 bg-efficiency/10 px-3 py-1 text-efficiency">{online}/{chillers.length || 3} online</span>
              <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">Meta {formatNumber(meta, 2)} kW/TR</span>
              <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">Último ponto {pointTime(data.overview.periodo_fim)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-6">
          <KpiTile label="Chillers online" value={`${online}/${chillers.length || 3}`} icon={<Snowflake className="h-4 w-4" />} tone="efficiency" helper="Estado do último ponto" />
          <KpiTile label="Consumo chillers" value={formatNumber(totalKwh)} unit="kWh" icon={<Zap className="h-4 w-4" />} tone="water" helper="Soma das unidades" />
          <KpiTile label="Eficiência média" value={formatNumber(avgKwtr, 3)} unit="kW/TR" icon={<Gauge className="h-4 w-4" />} tone={avgKwtr && avgKwtr <= meta ? "efficiency" : "warning"} helper="Ponderada por TRh" />
          <KpiTile label="COP médio" value={formatNumber(avgCop, 2)} icon={<Activity className="h-4 w-4" />} tone="esg" helper="Conversão termodinâmica" />
          <KpiTile label="Carga média operacional" value={formatNumber(avgCap)} unit="%" icon={<BarChart3 className="h-4 w-4" />} tone="carbon" helper="Média das unidades online" />
          <KpiTile label="Maior participação" value={peakConsumer?.name || "—"} icon={<Thermometer className="h-4 w-4" />} tone="warning" helper={`${formatNumber(peakConsumer?.participacao_consumo, 1)}% do consumo`} />
        </div>

        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
          {chillers.map((chiller) => <ChillerMachineCard key={chiller.id} c={chiller} meta={meta} />)}
        </div>

        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
          <div className="xl:col-span-7"><CapacityChart data={data} /></div>
          <div className="xl:col-span-5"><EfficiencyClimateScatter data={data} /></div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
          <div className="xl:col-span-7"><ComparativeChart data={data} /></div>
          <div className="xl:col-span-5"><OperationalInsights data={data} /></div>
        </div>

        <ChillersTable data={data} />
      </div>
    </AppShell>
  );
}
