import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { DashboardKpi } from "@/lib/dashboard-data";

const colorVar: Record<DashboardKpi["color"], string> = {
  water: "var(--color-water)",
  efficiency: "var(--color-efficiency)",
  esg: "var(--color-esg)",
  carbon: "var(--color-carbon)",
  warning: "var(--color-warning)",
};

export function KpiCard({ kpi, icon }: { kpi: DashboardKpi; icon?: React.ReactNode }) {
  const c = colorVar[kpi.color];
  const id = `g-${kpi.key}`;

  return (
    <div className="glass-card group relative overflow-hidden rounded-2xl p-4 transition hover:border-foreground/15">
      <div className="flex items-start justify-between">
        <span className="text-[12px] font-medium text-muted-foreground">{kpi.label}</span>
        <span className="text-muted-foreground/70" style={{ color: c }}>{icon}</span>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[28px] font-semibold tracking-tight leading-none">{kpi.value}</span>
        <span className="text-xs text-muted-foreground">{kpi.unit}</span>
      </div>

      <div className="mt-2.5 space-y-1 text-[11.5px]">
        {kpi.extra ? <div className="text-muted-foreground">{kpi.extra}</div> : <div className="text-muted-foreground">Dados reais do último processamento</div>}
      </div>

      <div className="mt-3 h-10 -mx-1">
        {kpi.sparkline.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={kpi.sparkline}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={c} strokeWidth={1.75} fill={`url(#${id})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-lg bg-muted/30" />
        )}
      </div>
    </div>
  );
}
