import { ArrowDown, ArrowUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { Kpi } from "@/lib/mock-data";

const colorVar: Record<Kpi["color"], string> = {
  water: "var(--color-water)",
  efficiency: "var(--color-efficiency)",
  esg: "var(--color-esg)",
  carbon: "var(--color-carbon)",
  warning: "var(--color-warning)",
};

function deltaTone(delta: number, goodWhen: "up" | "down") {
  if (delta === 0) return "text-muted-foreground";
  const isGood = goodWhen === "down" ? delta < 0 : delta > 0;
  return isGood ? "text-positive" : "text-negative";
}

export function KpiCard({ kpi, icon }: { kpi: Kpi; icon?: React.ReactNode }) {
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
        <div className={`flex items-center gap-1 ${deltaTone(kpi.dod, kpi.goodWhen)}`}>
          {kpi.dod < 0 ? <ArrowDown className="h-3 w-3" /> : kpi.dod > 0 ? <ArrowUp className="h-3 w-3" /> : null}
          <span className="font-medium">{kpi.dod > 0 ? "+" : ""}{kpi.dod}%</span>
          <span className="text-muted-foreground">vs D-2</span>
        </div>
        {kpi.extra ? (
          <div className="text-muted-foreground">{kpi.extra}</div>
        ) : (
          <div className={`flex items-center gap-1 ${deltaTone(kpi.d7, kpi.goodWhen)}`}>
            {kpi.d7 < 0 ? <ArrowDown className="h-3 w-3" /> : kpi.d7 > 0 ? <ArrowUp className="h-3 w-3" /> : null}
            <span className="font-medium">{kpi.d7 > 0 ? "+" : ""}{kpi.d7}%</span>
            <span className="text-muted-foreground">vs 7 dias</span>
          </div>
        )}
      </div>

      <div className="mt-3 h-10 -mx-1">
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
      </div>
    </div>
  );
}
