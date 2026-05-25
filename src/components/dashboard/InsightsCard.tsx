import { Bolt, Droplet, Leaf, Snowflake, TrendingDown } from "lucide-react";
import { buildInsights, type DashboardData } from "@/lib/dashboard-data";

const iconMap = {
  leaf: Leaf,
  drop: Droplet,
  bolt: Bolt,
  trend: TrendingDown,
  chiller: Snowflake,
} as const;

const tintMap = {
  leaf: "text-efficiency bg-efficiency/10 shadow-[0_0_18px_rgba(34,197,94,.15)]",
  drop: "text-water bg-water/10 shadow-[0_0_18px_rgba(56,189,248,.15)]",
  bolt: "text-warning bg-warning/10 shadow-[0_0_18px_rgba(245,158,11,.15)]",
  trend: "text-carbon bg-carbon/10 shadow-[0_0_18px_rgba(168,85,247,.15)]",
  chiller: "text-esg bg-esg/10 shadow-[0_0_18px_rgba(34,211,238,.15)]",
} as const;

export function InsightsCard({ data }: { data: DashboardData }) {
  const insights = buildInsights(data).slice(0, 5);

  return (
    <div className="control-card h-full rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold tracking-tight">Insights do dia</h3>
        <span className="text-[11px] font-medium text-water">Ver todos</span>
      </div>
      <ul className="mt-4 space-y-3.5">
        {insights.length ? insights.map((it, i) => {
          const Icon = iconMap[it.icon as keyof typeof iconMap] ?? Leaf;
          const tint = tintMap[it.icon as keyof typeof tintMap] ?? tintMap.leaf;
          return (
            <li key={i} className="flex gap-3">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${tint}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-[12.5px] leading-snug text-foreground/90">{it.text}</p>
            </li>
          );
        }) : (
          <li className="text-sm text-muted-foreground">Nenhum insight gerado ainda.</li>
        )}
      </ul>
    </div>
  );
}
