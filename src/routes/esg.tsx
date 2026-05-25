import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDown,
  ArrowUp,
  Cloud,
  Gauge,
  Leaf,
  LineChart,
  Sprout,
  Target,
  TreeDeciduous,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageTitle } from "@/components/layout/PageTitle";
import { PerformanceEsgCard, HealthScoreCard } from "@/components/dashboard/EsgCards";
import { formatDate, formatNumber, pointTime, useDashboardData, type DashboardData, type KpiPoint } from "@/lib/dashboard-data";

export const Route = createFileRoute("/esg")({
  head: () => ({
    meta: [
      { title: "ESG — Building ESG Performance" },
      { name: "description", content: "Central ESG com emissões, intensidade energética, equivalências e inteligência operacional." },
    ],
  }),
  component: EsgPage,
});

const TREE_KG_CO2_YEAR = 22;

const colorVar = {
  water: "var(--color-water)",
  efficiency: "var(--color-efficiency)",
  esg: "var(--color-esg)",
  carbon: "var(--color-carbon)",
  warning: "var(--color-warning)",
} as const;

type ColorKey = keyof typeof colorVar;

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function percentChange(current: number | null, baseline: number | null) {
  if (current === null || baseline === null || !Number.isFinite(current) || !Number.isFinite(baseline) || baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

function scoreFromDeviation(deviation?: number | null) {
  if (deviation === null || deviation === undefined || !Number.isFinite(Number(deviation))) return 72;
  return Math.max(0, Math.min(100, Math.round(100 - Math.max(0, Number(deviation)) * 3)));
}

function buildSparkline(points: KpiPoint[] = []) {
  const values = points.map((p) => Number(p.v)).filter((v) => Number.isFinite(v));
  if (values.length < 2) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  return points.map((p, index) => ({
    ...p,
    index,
    y: range > 0 ? 18 + ((Number(p.v) - min) / range) * 64 : 50,
  }));
}

function TrendValue({ value, goodWhen = "down" }: { value: number; goodWhen?: "up" | "down" }) {
  const neutral = !Number.isFinite(value) || Math.abs(value) < 0.05;
  const good = neutral ? true : goodWhen === "down" ? value <= 0 : value >= 0;
  const Icon = neutral ? null : value > 0 ? ArrowUp : ArrowDown;

  return (
    <span className={good ? "text-efficiency" : "text-warning"}>
      {Icon ? <Icon className="inline h-3 w-3 align-[-2px]" /> : null} {Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
    </span>
  );
}

function EsgSparkline({ points, color }: { points: KpiPoint[]; color: ColorKey }) {
  const c = colorVar[color];
  const series = buildSparkline(points);
  const id = `esg-spark-${color}-${points.length}`;

  if (series.length < 2) return <div className="h-8 rounded-lg bg-[linear-gradient(90deg,transparent,var(--color-border),transparent)] opacity-50" />;

  return (
    <div className="h-8 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity={0.50} />
              <stop offset="60%" stopColor={c} stopOpacity={0.14} />
              <stop offset="100%" stopColor={c} stopOpacity={0} />
            </linearGradient>
            <filter id={`${id}-glow`} x="-20%" y="-70%" width="140%" height="240%">
              <feGaussianBlur stdDeviation="2.3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <Area type="monotone" dataKey="y" stroke={c} strokeWidth={2} fill={`url(#${id})`} dot={false} activeDot={false} isAnimationActive={false} filter={`url(#${id}-glow)`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function EsgMetricCard({
  label,
  value,
  unit,
  icon,
  color,
  points,
  dod,
  d7,
  goodWhen = "down",
  helper,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  color: ColorKey;
  points: KpiPoint[];
  dod: number;
  d7: number;
  goodWhen?: "up" | "down";
  helper?: string;
}) {
  const c = colorVar[color];

  return (
    <div className="control-card group relative min-h-[154px] overflow-hidden rounded-xl p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 opacity-70 blur-xl" style={{ background: `linear-gradient(180deg, transparent, ${c}1f)` }} />
      <div className="relative flex items-start justify-between gap-2">
        <span className="line-clamp-1 text-[11px] font-medium text-muted-foreground">{label}</span>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-foreground/[0.04] dark:bg-white/[0.03]" style={{ color: c }}>{icon}</span>
      </div>
      <div className="relative mt-2 flex items-baseline gap-1.5">
        <span className="text-[24px] font-semibold leading-none tracking-tight tabular-nums">{value}</span>
        {unit ? <span className="text-[11px] text-muted-foreground">{unit}</span> : null}
      </div>
      <div className="relative mt-2 space-y-0.5 text-[11px] leading-4">
        <div><TrendValue value={dod} goodWhen={goodWhen} /> <span className="text-muted-foreground">vs D-2</span></div>
        <div><TrendValue value={d7} goodWhen={goodWhen} /> <span className="text-muted-foreground">vs 7 dias</span></div>
      </div>
      {helper ? <div className="relative mt-1 text-[10.5px] text-muted-foreground line-clamp-1">{helper}</div> : null}
      <div className="relative mt-2"><EsgSparkline points={points} color={color} /></div>
    </div>
  );
}

function buildEsgChartSeries(data: DashboardData) {
  let cumulativeCarbon = 0;
  let cumulativeEnergy = 0;

  return (data.analytics.series_15min ?? []).map((p) => {
    const kwh = asNumber(p.kwh_total);
    const carbonKg = asNumber(p.carbono_kg ?? (p.carbono_ton ? asNumber(p.carbono_ton) * 1000 : 0));
    cumulativeCarbon += carbonKg;
    cumulativeEnergy += kwh;

    return {
      label: pointTime(p.timestamp),
      timestamp: p.timestamp,
      energy: kwh > 0 ? kwh : null,
      carbonKg: carbonKg > 0 ? carbonKg : null,
      cumulativeCarbon: Number(cumulativeCarbon.toFixed(3)),
      cumulativeEnergy: Number(cumulativeEnergy.toFixed(2)),
      kwtr: asNumber(p.kwtr_real) > 0 ? asNumber(p.kwtr_real) : null,
      temp: asNumber(p.oat) > 0 ? asNumber(p.oat) : null,
    };
  }).filter((p) => p.energy !== null || p.carbonKg !== null);
}

function EsgImpactChart({ data }: { data: DashboardData }) {
  const series = buildEsgChartSeries(data);
  const startDate = formatDate(data.overview.periodo_inicio);
  const endDate = formatDate(data.overview.periodo_fim);
  const analyzedDate = startDate !== endDate && startDate !== "—" ? `${startDate} a ${endDate}` : endDate;

  return (
    <div className="control-card chart-panel rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">Impacto ESG da operação <span className="font-normal text-muted-foreground">— {analyzedDate}</span></h3>
          <div className="mt-1 text-[11px] text-muted-foreground">Carbono • Energia • kW/TR • Temperatura externa • Acumulado</div>
        </div>
        <span className="rounded-lg border border-border/70 bg-foreground/[0.04] dark:bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground shadow-inner">ESG intelligence</span>
      </div>

      <div className="chart-stage mt-3 h-[330px] rounded-xl">
        {series.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 12, right: 18, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="esg-carbon-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-efficiency)" stopOpacity={0.46} />
                  <stop offset="36%" stopColor="var(--color-efficiency)" stopOpacity={0.20} />
                  <stop offset="100%" stopColor="var(--color-efficiency)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="esg-energy-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-water)" stopOpacity={0.34} />
                  <stop offset="55%" stopColor="var(--color-water)" stopOpacity={0.10} />
                  <stop offset="100%" stopColor="var(--color-water)" stopOpacity={0} />
                </linearGradient>
                <filter id="esg-line-bloom" x="-35%" y="-35%" width="170%" height="170%">
                  <feGaussianBlur stdDeviation="2.7" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 8" vertical={true} />
              <XAxis dataKey="label" stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} interval="preserveStartEnd" minTickGap={40} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} />
              <YAxis yAxisId="left" stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} width={42} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} />
              <YAxis yAxisId="temp" orientation="right" stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} width={38} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} label={{ value: "°C", position: "insideTopRight", fill: "var(--chart-axis)", fontSize: 10 }} />
              <YAxis yAxisId="acc" orientation="right" hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                cursor={{ stroke: "var(--chart-axis-line)", strokeWidth: 1, strokeDasharray: "4 4" }}
                contentStyle={{
                  background: "linear-gradient(180deg, var(--chart-tooltip-bg) 0%, var(--chart-tooltip-bg-2) 100%)",
                  border: "1px solid var(--chart-tooltip-border)",
                  borderRadius: 18,
                  fontSize: 12,
                  boxShadow: "0 24px 80px rgba(0,0,0,.50)",
                  backdropFilter: "blur(10px)",
                  padding: "12px 14px",
                }}
                itemStyle={{ color: "var(--chart-tooltip-text)", paddingTop: 2, paddingBottom: 2 }}
                labelStyle={{ color: "var(--chart-tooltip-label)", fontWeight: 700, marginBottom: 8, letterSpacing: ".02em" }}
                separator="•"
              />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4, color: "var(--chart-axis)" }} iconType="line" />
              <Area yAxisId="left" type="monotone" dataKey="carbonKg" name="Carbono (kgCO₂e)" stroke="transparent" fill="url(#esg-carbon-area)" dot={false} connectNulls={false} isAnimationActive={false} />
              <Area yAxisId="left" type="monotone" dataKey="energy" name="Energia (kWh)" stroke="transparent" fill="url(#esg-energy-area)" dot={false} connectNulls={false} isAnimationActive={false} />
              <Bar yAxisId="left" dataKey="carbonKg" name="Carbono 15min" fill="var(--color-efficiency)" opacity={0.16} radius={[6, 6, 0, 0]} />
              <Line yAxisId="left" type="monotone" dataKey="energy" name="Energia (kWh)" stroke="var(--color-water)" strokeWidth={2.05} dot={false} activeDot={{ r: 4.5, stroke: "var(--chart-active-dot-stroke)", strokeWidth: 2 }} filter="url(#esg-line-bloom)" />
              <Line yAxisId="left" type="monotone" dataKey="carbonKg" name="Carbono (kgCO₂e)" stroke="var(--color-efficiency)" strokeWidth={2.05} dot={false} activeDot={{ r: 4.5, stroke: "var(--chart-active-dot-stroke)", strokeWidth: 2 }} filter="url(#esg-line-bloom)" />
              <Line yAxisId="left" type="monotone" dataKey="kwtr" name="kW/TR" stroke="var(--color-carbon)" strokeWidth={1.65} dot={false} activeDot={{ r: 4.2, strokeWidth: 1.5 }} strokeDasharray="5 5" />
              <Line yAxisId="temp" type="monotone" dataKey="temp" name="Temp. externa (°C)" stroke="var(--chart-soft-line)" strokeWidth={1.55} dot={false} activeDot={{ r: 4, strokeWidth: 1.5 }} strokeDasharray="4 5" />
              <Line yAxisId="acc" type="monotone" dataKey="cumulativeCarbon" name="CO₂ acumulado" stroke="var(--chart-reference)" strokeWidth={1.75} dot={false} activeDot={{ r: 4, strokeWidth: 1.5 }} strokeDasharray="2 7" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">Sem dados ESG para o período.</div>
        )}
      </div>
    </div>
  );
}

function EsgIntelligenceCard({ data, trees, intensity, avoidedKg }: { data: DashboardData; trees: number; intensity: number | null; avoidedKg: number | null }) {
  const deviation = asNumber(data.overview.desvio_meta_kwtr, 0);
  const better = deviation <= 0;
  const carbonComp = data.comparisons?.metrics?.carbon;
  const energyComp = data.comparisons?.metrics?.energy;
  const insights = [
    {
      icon: <Leaf className="h-4 w-4" />,
      title: better ? "Operação eficiente reduz impacto" : "Eficiência pressiona emissões",
      text: better
        ? `A central operou ${formatNumber(Math.abs(deviation), 2)}% melhor que a meta de eficiência, reduzindo o impacto energético do período.`
        : `A central operou ${formatNumber(Math.abs(deviation), 2)}% acima da meta. A prioridade ESG é recuperar eficiência térmica.`,
      tone: better ? "text-efficiency" : "text-warning",
    },
    {
      icon: <TreeDeciduous className="h-4 w-4" />,
      title: "Equivalência climática",
      text: avoidedKg && avoidedKg > 0
        ? `A economia frente ao baseline representa cerca de ${formatNumber(trees, 0)} árvores/ano em CO₂ evitado.`
        : `A pegada estimada do período exigiria cerca de ${formatNumber(trees, 0)} árvores/ano para neutralização ilustrativa.`,
      tone: "text-esg",
    },
    {
      icon: <LineChart className="h-4 w-4" />,
      title: "Tendência semanal",
      text: `Carbono ${formatNumber(carbonComp?.vs_7d_avg_percent ?? 0, 1)}% vs média 7 dias; energia ${formatNumber(energyComp?.vs_7d_avg_percent ?? 0, 1)}% vs média 7 dias.`,
      tone: "text-water",
    },
    {
      icon: <Gauge className="h-4 w-4" />,
      title: "Intensidade operacional",
      text: intensity !== null
        ? `A intensidade do período ficou em ${formatNumber(intensity, 3)} kgCO₂e/TRh.`
        : "Configure TRh e fator de carbono para acompanhar intensidade operacional.",
      tone: "text-carbon",
    },
  ];

  return (
    <div className="control-card rounded-2xl p-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">ESG Intelligence</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">Leitura executiva do impacto ambiental operacional.</p>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground">AI-ready</span>
      </div>
      <div className="mt-4 space-y-3">
        {insights.map((item) => (
          <div key={item.title} className="rounded-xl border border-border/80 bg-foreground/[0.025] dark:bg-white/[0.025] p-3">
            <div className={`flex items-center gap-2 text-[12px] font-semibold ${item.tone}`}>
              {item.icon}
              <span>{item.title}</span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImpactEquivalences({ data, trees, avoidedKg, intensity }: { data: DashboardData; trees: number; avoidedKg: number | null; intensity: number | null }) {
  const monthlyTarget = asNumber(data.settings?.meta_co2_mes_ton, 0);
  const carbonTon = asNumber(data.overview.carbono_ton, 0);
  const progress = monthlyTarget > 0 ? Math.min(100, (carbonTon / monthlyTarget) * 100) : null;
  const area = asNumber(data.settings?.area_climatizada_m2, 0);
  const carbonM2 = area > 0 ? (asNumber(data.overview.carbono_kg, 0) / area) : null;

  const items = [
    { label: avoidedKg && avoidedKg > 0 ? "Árvores equivalentes evitadas" : "Árvores p/ neutralizar", value: formatNumber(trees, 0), unit: "árv/ano", icon: <TreeDeciduous className="h-4 w-4" />, color: "text-efficiency" },
    { label: "Intensidade carbono", value: formatNumber(intensity, 3), unit: "kgCO₂e/TRh", icon: <Cloud className="h-4 w-4" />, color: "text-esg" },
    { label: "Carbono por área", value: formatNumber(carbonM2, 4), unit: "kgCO₂e/m²", icon: <Sprout className="h-4 w-4" />, color: "text-carbon" },
    { label: "Progresso meta mensal", value: progress === null ? "—" : formatNumber(progress, 1), unit: progress === null ? "" : "%", icon: <Target className="h-4 w-4" />, color: "text-water" },
  ];

  return (
    <div className="control-card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight">Impacto traduzido</h3>
        <span className="text-[10px] text-muted-foreground">estimativas operacionais</span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-border/80 bg-foreground/[0.025] dark:bg-white/[0.025] p-3">
            <div className={`flex items-center gap-2 text-[11px] ${item.color}`}>{item.icon}<span>{item.label}</span></div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">{item.value}</span>
              <span className="text-[11px] text-muted-foreground">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">Equivalência de árvores usa fator ilustrativo de {TREE_KG_CO2_YEAR} kgCO₂e/árvore/ano. Ajustável futuramente em Settings.</div>
    </div>
  );
}

function EsgPage() {
  const { data, isLoading, error } = useDashboardData();

  if (!data) {
    return (
      <AppShell>
        <PageTitle title="ESG Performance" subtitle="Central executiva de impacto ambiental da operação da CAG" />
        {isLoading && <div className="control-card rounded-2xl p-4 text-sm text-muted-foreground">Carregando ESG...</div>}
        {error && <div className="control-card rounded-2xl p-4 text-sm text-warning">Não foi possível carregar ESG.</div>}
      </AppShell>
    );
  }

  const o = data.overview;
  const comp = data.comparisons?.metrics ?? {};
  const carbonKg = asNumber(o.carbono_kg, asNumber(o.carbono_ton) * 1000);
  const trh = asNumber(o.trh_total, 0);
  const intensity = trh > 0 ? carbonKg / trh : null;
  const baselineKwh = asNumber(data.settings?.baseline_kwh_dia, 0);
  const carbonFactor = asNumber(data.esg?.fator_carbono_kgco2_kwh ?? data.settings?.fator_carbono_kgco2_kwh, 0.0385);
  const avoidedKwh = baselineKwh > 0 ? Math.max(0, baselineKwh - asNumber(o.kwh_total, 0)) : 0;
  const avoidedKg = avoidedKwh > 0 ? avoidedKwh * carbonFactor : null;
  const trees = Math.max(0, (avoidedKg && avoidedKg > 0 ? avoidedKg : carbonKg) / TREE_KG_CO2_YEAR);
  const deviation = asNumber(o.desvio_meta_kwtr, 0);
  const esgScore = scoreFromDeviation(deviation);
  const carbonTrend = data.daily_trends?.carbon ?? [];
  const energyTrend = data.daily_trends?.energy ?? [];
  const effTrend = data.daily_trends?.eff ?? [];
  const treeTrend = carbonTrend.map((p) => ({ t: p.t, v: asNumber(p.v) * 1000 / TREE_KG_CO2_YEAR }));
  const intensityTrend = (data.daily_trends?.carbon ?? []).map((p, i) => {
    const trhPoint = data.daily_trends?.trh?.[i]?.v;
    const kg = asNumber(p.v) * 1000;
    const value = asNumber(trhPoint) > 0 ? kg / asNumber(trhPoint) : 0;
    return { t: p.t, v: value };
  });

  return (
    <AppShell>
      <PageTitle title="ESG Intelligence Center" subtitle="Carbono, eficiência, equivalências ambientais e leitura executiva do impacto da operação" />
      <div className="space-y-3.5">
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-6">
          <EsgMetricCard label="Carbono emitido" value={formatNumber(o.carbono_ton, 3)} unit="tCO₂e" icon={<Cloud className="h-4 w-4" />} color="carbon" points={carbonTrend} dod={comp.carbon?.vs_previous_day_percent ?? 0} d7={comp.carbon?.vs_7d_avg_percent ?? 0} goodWhen="down" helper={`Fator: ${formatNumber(data.esg?.fator_carbono_kgco2_kwh, 4)} kg/kWh`} />
          <EsgMetricCard label="Energia consumida" value={formatNumber(o.kwh_total)} unit="kWh" icon={<Zap className="h-4 w-4" />} color="water" points={energyTrend} dod={comp.energy?.vs_previous_day_percent ?? 0} d7={comp.energy?.vs_7d_avg_percent ?? 0} goodWhen="down" helper="Base operacional do carbono" />
          <EsgMetricCard label="Intensidade carbono" value={formatNumber(intensity, 3)} unit="kg/TRh" icon={<Gauge className="h-4 w-4" />} color="esg" points={intensityTrend} dod={0} d7={0} goodWhen="down" helper="kgCO₂e por TRh produzido" />
          <EsgMetricCard label="Eficiência ESG" value={formatNumber(o.kwtr_medio, 3)} unit="kW/TR" icon={<Leaf className="h-4 w-4" />} color="efficiency" points={effTrend} dod={comp.eff?.vs_previous_day_percent ?? 0} d7={comp.eff?.vs_7d_avg_percent ?? 0} goodWhen="down" helper={`Meta: ${formatNumber(o.kwtr_meta, 2)} kW/TR`} />
          <EsgMetricCard label="Árvores equivalentes" value={formatNumber(trees, 0)} unit="árv/ano" icon={<TreeDeciduous className="h-4 w-4" />} color="efficiency" points={treeTrend} dod={comp.carbon?.vs_previous_day_percent ?? 0} d7={comp.carbon?.vs_7d_avg_percent ?? 0} goodWhen="down" helper={avoidedKg && avoidedKg > 0 ? "CO₂ evitado vs baseline" : "neutralização ilustrativa"} />
          <EsgMetricCard label="ESG Score" value={formatNumber(esgScore)} unit="/100" icon={<Target className="h-4 w-4" />} color="esg" points={effTrend} dod={-deviation} d7={comp.eff?.vs_7d_avg_percent ? -comp.eff.vs_7d_avg_percent : 0} goodWhen="up" helper={deviation <= 0 ? "Operação dentro da meta" : "Atenção à eficiência"} />
        </div>

        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
          <div className="xl:col-span-8"><EsgImpactChart data={data} /></div>
          <div className="xl:col-span-4"><EsgIntelligenceCard data={data} trees={trees} intensity={intensity} avoidedKg={avoidedKg} /></div>
        </div>

        <ImpactEquivalences data={data} trees={trees} avoidedKg={avoidedKg} intensity={intensity} />

        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
          <div className="xl:col-span-5"><PerformanceEsgCard data={data} /></div>
          <div className="xl:col-span-7"><HealthScoreCard data={data} /></div>
        </div>
      </div>
    </AppShell>
  );
}
