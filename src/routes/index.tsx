import { createFileRoute } from "@tanstack/react-router";
import { Bolt, Cloud, Gauge, Snowflake, Activity, Thermometer, Zap, Clock, TrendingDown } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CentralBehaviorChart } from "@/components/dashboard/CentralBehaviorChart";
import { ChillersTable } from "@/components/dashboard/ChillersTable";
import { InsightsCard } from "@/components/dashboard/InsightsCard";
import {
  PerformanceEsgCard,
  ConsumptionByPeriodCard,
  HealthScoreCard,
} from "@/components/dashboard/EsgCards";
import { kpis } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Building ESG Performance" },
      { name: "description", content: "Dashboard executiva ESG e eficiência energética da Central de Água Gelada — dados consolidados de D-1." },
    ],
  }),
  component: Overview,
});

const iconFor: Record<string, React.ReactNode> = {
  energy: <Zap className="h-4 w-4" />,
  carbon: <Cloud className="h-4 w-4" />,
  eff:    <Gauge className="h-4 w-4" />,
  cop:    <Snowflake className="h-4 w-4" />,
  trh:    <Activity className="h-4 w-4" />,
  deltaT: <Thermometer className="h-4 w-4" />,
  peak:   <Bolt className="h-4 w-4" />,
  hours:  <Clock className="h-4 w-4" />,
  baseline: <TrendingDown className="h-4 w-4" />,
};

function Overview() {
  return (
    <AppShell>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
        {kpis.map((k) => <KpiCard key={k.key} kpi={k} icon={iconFor[k.key]} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-6"><CentralBehaviorChart /></div>
        <div className="xl:col-span-4"><ChillersTable /></div>
        <div className="xl:col-span-2"><InsightsCard /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-5"><PerformanceEsgCard /></div>
        <div className="xl:col-span-3"><ConsumptionByPeriodCard /></div>
        <div className="xl:col-span-4"><HealthScoreCard /></div>
      </div>
    </AppShell>
  );
}
