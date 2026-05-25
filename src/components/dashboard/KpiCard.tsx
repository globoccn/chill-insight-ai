import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { DashboardKpi } from "@/lib/dashboard-data";
import { useDashboardPeriod } from "@/lib/period";

const colorVar: Record<DashboardKpi["color"], string> = {
  water: "var(--color-water)",
  efficiency: "var(--color-efficiency)",
  esg: "var(--color-esg)",
  carbon: "var(--color-carbon)",
  warning: "var(--color-warning)",
};

function TrendLine({ value, goodWhen }: { value: number; goodWhen: DashboardKpi["goodWhen"] }) {
  const isNeutral = !Number.isFinite(value) || value === 0;
  const isGood = isNeutral ? true : goodWhen === "down" ? value <= 0 : value >= 0;
  const Icon = isNeutral ? Minus : value > 0 ? ArrowUp : ArrowDown;

  return (
    <span className={isGood ? "text-efficiency" : "text-warning"}>
      <Icon className="inline h-3 w-3 align-[-2px]" /> {Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
    </span>
  );
}

function buildVisualSparkline(points: DashboardKpi["sparkline"]) {
  const values = points
    .map((p) => Number(p.v))
    .filter((v) => Number.isFinite(v));

  if (values.length < 2) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // O sparkline do KPI é visual: ele deve mostrar a forma das leituras dos últimos 7 dias.
  // Normalizamos para a altura do mini gráfico, evitando que métricas de base alta fiquem retas.
  return points.map((p, index) => {
    const value = Number(p.v);
    const normalized = range > 0
      ? 18 + ((value - min) / range) * 64
      : 50;

    return {
      ...p,
      index,
      y: normalized,
      raw: value,
    };
  });
}

export function KpiCard({ kpi, icon }: { kpi: DashboardKpi; icon?: React.ReactNode }) {
  const period = useDashboardPeriod();
  const primaryComparisonLabel = period === "day" ? "vs D-2" : period === "week" ? "vs semana ant." : "vs mês ant.";
  const secondaryComparisonLabel = period === "day" ? "vs 7 dias" : "vs 7 dias ant.";
  const c = colorVar[kpi.color];
  const id = `kpi-${kpi.key}`;
  const showSparkline = kpi.key !== "hours";
  const sparklineData = showSparkline ? buildVisualSparkline(kpi.sparkline) : [];

  return (
    <div className="control-card group relative min-h-[154px] overflow-hidden rounded-xl p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 opacity-70 blur-xl" style={{ background: `linear-gradient(180deg, transparent, ${c}20)` }} />

      <div className="relative flex items-start justify-between gap-2">
        <span className="line-clamp-1 text-[11px] font-medium text-muted-foreground">{kpi.label}</span>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-foreground/[0.04] dark:bg-white/[0.03]" style={{ color: c }}>
          {icon}
        </span>
      </div>

      <div className="relative mt-2 flex items-baseline gap-1.5">
        <span className="text-[24px] font-semibold leading-none tracking-tight tabular-nums">{kpi.value}</span>
        <span className="text-[11px] text-muted-foreground">{kpi.unit}</span>
      </div>

      <div className="relative mt-2 space-y-0.5 text-[11px] leading-4">
        <div><TrendLine value={kpi.dod} goodWhen={kpi.goodWhen} /> <span className="text-muted-foreground">{primaryComparisonLabel}</span></div>
        <div><TrendLine value={kpi.d7} goodWhen={kpi.goodWhen} /> <span className="text-muted-foreground">{secondaryComparisonLabel}</span></div>
      </div>

      {kpi.extra ? <div className="relative mt-1 text-[10.5px] text-muted-foreground line-clamp-1">{kpi.extra}</div> : null}

      <div className="relative mt-2 h-9 -mx-1">
        {showSparkline && sparklineData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.50} />
                  <stop offset="62%" stopColor={c} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={c} stopOpacity={0} />
                </linearGradient>
                <filter id={`${id}-glow`} x="-20%" y="-60%" width="140%" height="220%">
                  <feGaussianBlur stdDeviation="2.4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <Area
                type="monotone"
                dataKey="y"
                stroke={c}
                strokeWidth={2.2}
                fill={`url(#${id})`}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                filter={`url(#${id}-glow)`}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : showSparkline ? (
          <div className="h-full rounded-lg bg-[linear-gradient(90deg,transparent,var(--color-border),transparent)] opacity-60" />
        ) : null}
      </div>
    </div>
  );
}
