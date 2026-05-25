import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { DashboardKpi } from "@/lib/dashboard-data";

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

export function KpiCard({ kpi, icon }: { kpi: DashboardKpi; icon?: React.ReactNode }) {
  const c = colorVar[kpi.color];
  const id = `kpi-${kpi.key}`;

  return (
    <div className="control-card group relative min-h-[154px] overflow-hidden rounded-xl p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 opacity-70 blur-xl" style={{ background: `linear-gradient(180deg, transparent, ${c}20)` }} />

      <div className="relative flex items-start justify-between gap-2">
        <span className="line-clamp-1 text-[11px] font-medium text-muted-foreground">{kpi.label}</span>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/[0.03]" style={{ color: c }}>
          {icon}
        </span>
      </div>

      <div className="relative mt-2 flex items-baseline gap-1.5">
        <span className="text-[24px] font-semibold leading-none tracking-tight tabular-nums">{kpi.value}</span>
        <span className="text-[11px] text-muted-foreground">{kpi.unit}</span>
      </div>

      <div className="relative mt-2 space-y-0.5 text-[11px] leading-4">
        <div><TrendLine value={kpi.dod} goodWhen={kpi.goodWhen} /> <span className="text-muted-foreground">vs D-2</span></div>
        <div><TrendLine value={kpi.d7} goodWhen={kpi.goodWhen} /> <span className="text-muted-foreground">vs 7 dias</span></div>
      </div>

      {kpi.extra ? <div className="relative mt-1 text-[10.5px] text-muted-foreground line-clamp-1">{kpi.extra}</div> : null}

      <div className="relative mt-2 h-9 -mx-1">
        {kpi.sparkline.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={kpi.sparkline} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={c} strokeWidth={1.8} fill={`url(#${id})`} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-lg bg-[linear-gradient(90deg,transparent,var(--color-border),transparent)] opacity-60" />
        )}
      </div>
    </div>
  );
}
