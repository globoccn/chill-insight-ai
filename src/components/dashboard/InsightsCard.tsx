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
  leaf: "text-efficiency bg-efficiency/10",
  drop: "text-water bg-water/10",
  bolt: "text-warning bg-warning/10",
  trend: "text-carbon bg-carbon/10",
  chiller: "text-esg bg-esg/10",
} as const;

export function InsightsCard({ data }: { data: DashboardData }) {
  const insights = buildInsights(data);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight">Insights do período</h3>
      </div>
      <ul className="mt-4 space-y-3.5">
        {insights.length ? insights.map((it, i) => {
          const Icon = iconMap[it.icon as keyof typeof iconMap] ?? Leaf;
          const tint = tintMap[it.icon as keyof typeof tintMap] ?? tintMap.leaf;
          return (
            <li key={i} className="flex gap-3">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tint}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-[13px] leading-snug text-foreground/90">{it.text}</p>
            </li>
          );
        }) : (
          <li className="text-sm text-muted-foreground">Nenhum insight gerado ainda.</li>
        )}
      </ul>
    </div>
  );
}
