import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { buildConsumptionByPeriod, formatNumber, type DashboardData } from "@/lib/dashboard-data";

const COLORS = {
  water: "var(--color-water)",
  efficiency: "var(--color-efficiency)",
  carbon: "var(--color-carbon)",
  esg: "var(--color-esg)",
} as const;

function MiniDonut({ pct, color }: { pct: number; color: string }) {
  const safePct = Math.max(0, Math.min(100, Math.round(pct || 0)));
  const data = [{ v: safePct }, { v: 100 - safePct }];
  return (
    <div className="relative h-16 w-16">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="v" innerRadius={22} outerRadius={30} startAngle={90} endAngle={-270} stroke="none">
            <Cell fill={color} />
            <Cell fill="var(--color-muted)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center text-[10px] font-medium">{safePct}%</div>
    </div>
  );
}

function scoreFromDeviation(deviation?: number | null) {
  if (deviation === null || deviation === undefined) return 0;
  return Math.max(0, Math.min(100, Math.round(100 - Math.max(0, deviation) * 3)));
}

function scoreFromValue(value?: number | null, reference?: number | null, goodWhen: "down" | "up" = "down") {
  if (!value || !reference) return 0;
  const ratio = value / reference;
  const score = goodWhen === "down" ? 100 - Math.max(0, ratio - 1) * 100 : ratio * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getPeriodDays(data: DashboardData) {
  const startRaw = data.overview.periodo_inicio || data.analytics.series_15min[0]?.timestamp;
  const endRaw = data.overview.periodo_fim || data.analytics.series_15min[data.analytics.series_15min.length - 1]?.timestamp;

  const start = startRaw ? new Date(startRaw) : null;
  const end = endRaw ? new Date(endRaw) : null;

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;

  const diffMs = Math.max(0, end.getTime() - start.getTime());
  return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

function getPeriodCarbonTarget(data: DashboardData) {
  const monthlyTarget = Number(data.settings?.meta_co2_mes_ton ?? 0);
  if (!Number.isFinite(monthlyTarget) || monthlyTarget <= 0) return null;

  return (monthlyTarget / 30) * getPeriodDays(data);
}

function getExpectedPoints(data: DashboardData) {
  const intervalHours = Number(data.settings?.intervalo_horas ?? 0.25);
  const safeInterval = Number.isFinite(intervalHours) && intervalHours > 0 ? intervalHours : 0.25;
  return Math.max(1, Math.round((24 / safeInterval) * getPeriodDays(data)));
}

function scoreStatus(score: number) {
  if (score >= 85) return "Muito Bom";
  if (score >= 70) return "Bom";
  if (score > 0) return "Atenção";
  return "Sem dados";
}

export function PerformanceEsgCard({ data }: { data: DashboardData }) {
  const o = data.overview;
  const score = scoreFromDeviation(o.desvio_meta_kwtr);
  const metaCo2Periodo = getPeriodCarbonTarget(data);
  const carbonScore = scoreFromValue(o.carbono_ton, metaCo2Periodo, "down");

  const items = [
    { label: "Carbono", value: formatNumber(o.carbono_ton, 3), unit: "tCO₂e", target: metaCo2Periodo ? `Meta período: ${formatNumber(metaCo2Periodo, 3)} tCO₂e` : "Fator configurado", pct: carbonScore, color: COLORS.carbon },
    { label: "Intensidade energética", value: formatNumber(o.kwtr_medio, 3), unit: "kW/TR", target: `Meta: ≤ ${formatNumber(o.kwtr_meta, 2)}`, pct: score, color: COLORS.efficiency },
    { label: "Desvio da meta", value: formatNumber(o.desvio_meta_kwtr, 2), unit: "%", target: "Meta configurável", pct: score, color: COLORS.esg },
    { label: "COP médio", value: formatNumber(o.cop_medio, 2), unit: "", target: "Calculado por 3,516/kWTR", pct: Math.max(0, Math.min(100, Number(o.cop_medio ?? 0) * 20)), color: COLORS.efficiency },
  ];

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-[15px] font-semibold tracking-tight">Performance ESG</h3>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl border border-border bg-card/60 p-4">
            <div className="text-[11px] text-muted-foreground">{it.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-semibold tracking-tight">{it.value}</span>
              <span className="text-[11px] text-muted-foreground">{it.unit}</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{it.target}</div>
            <div className="mt-3 flex items-center justify-between">
              <MiniDonut pct={it.pct} color={it.color} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConsumptionByPeriodCard({ data }: { data: DashboardData }) {
  const consumptionByPeriod = buildConsumptionByPeriod(data);
  const chartData = consumptionByPeriod.map((d) => ({ name: d.period, value: d.pct, color: COLORS[d.color] }));
  const total = data.overview.kwh_total ?? 0;

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-[15px] font-semibold tracking-tight">Consumo por período</h3>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-44 w-44 shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={chartData} dataKey="value" innerRadius={56} outerRadius={84} paddingAngle={2} stroke="none">
                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-xl font-semibold tracking-tight">{formatNumber(total)}</div>
              <div className="text-[10px] text-muted-foreground">kWh</div>
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-2.5 text-sm">
          {consumptionByPeriod.map((d) => (
            <li key={d.period} className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[d.color] }} />
              <span className="flex-1 text-[12.5px]">{d.period}</span>
              <span className="tabular-nums text-muted-foreground text-[12px]">{d.pct}%</span>
              <span className="w-20 text-right tabular-nums text-[12.5px] font-medium">{formatNumber(d.kWh)} kWh</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function HealthScoreCard({ data }: { data: DashboardData }) {
  const deviation = data.overview.desvio_meta_kwtr ?? null;
  const baseScore = scoreFromDeviation(deviation);
  const onlineCount = data.chillers.filter((c) => c.online || c.status === "Online").length;
  const operationScore = data.chillers.length ? Math.round((onlineCount / data.chillers.length) * 100) : 0;
  const expectedPoints = getExpectedPoints(data);
  const receivedPoints = data.analytics.series_15min.length;
  const stabilityScore = clampScore((receivedPoints / expectedPoints) * 100);
  const metaCo2Periodo = getPeriodCarbonTarget(data);
  const carbonScore = scoreFromValue(data.overview.carbono_ton, metaCo2Periodo, "down");

  const healthScores = [
    { label: "Eficiência", value: baseScore, status: scoreStatus(baseScore) },
    { label: "Carbono", value: carbonScore, status: metaCo2Periodo ? scoreStatus(carbonScore) : "Sem meta" },
    { label: "Operação", value: operationScore, status: data.chillers.length ? `${onlineCount}/${data.chillers.length} online` : "Sem dados" },
    { label: "Cobertura", value: stabilityScore, status: receivedPoints ? `${receivedPoints}/${expectedPoints} pontos` : "Sem dados" },
  ];

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight">Score de saúde</h3>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {healthScores.map((h) => {
          const color = h.value >= 88 ? "var(--color-esg)" : h.value >= 84 ? "var(--color-efficiency)" : h.value >= 70 ? "var(--color-warning)" : "var(--color-critical)";
          return (
            <div key={h.label} className="text-center">
              <div className="text-[11px] text-muted-foreground">{h.label}</div>
              <div className="relative mx-auto mt-2 grid h-16 w-16 place-items-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                  <circle cx="50" cy="50" r="42" stroke="currentColor" className="text-muted/40" strokeWidth="9" fill="none" />
                  <circle cx="50" cy="50" r="42" stroke={color} strokeWidth="9" strokeLinecap="round" fill="none" strokeDasharray={`${(h.value / 100) * 264} 264`} />
                </svg>
                <span className="text-lg font-semibold tabular-nums">{h.value}</span>
              </div>
              <div className="mt-1 text-[11px] font-medium" style={{ color }}>{h.status}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-[12px]">
        <div>
          <div className="text-muted-foreground">kWh/m²</div>
          <div className="mt-0.5 font-semibold">{formatNumber(data.overview.kwh_m2, 6)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">TRh/m²</div>
          <div className="mt-0.5 font-semibold">{formatNumber(data.overview.trh_m2, 6)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">kW pico/m²</div>
          <div className="mt-0.5 font-semibold text-efficiency">{formatNumber(data.overview.kw_pico_m2, 6)}</div>
        </div>
      </div>
    </div>
  );
}
