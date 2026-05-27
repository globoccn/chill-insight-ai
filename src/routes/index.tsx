import { createFileRoute } from "@tanstack/react-router";
import { Bolt, Cloud, Gauge, Snowflake, Activity, Thermometer, Zap, Clock, TrendingDown } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CentralBehaviorChart } from "@/components/dashboard/CentralBehaviorChart";
import { ChillersTable } from "@/components/dashboard/ChillersTable";
import { InsightsCard } from "@/components/dashboard/InsightsCard";
import { PerformanceEsgCard, ConsumptionByPeriodCard, HealthScoreCard } from "@/components/dashboard/EsgCards";
import { buildKpis, DASHBOARD_DATA_URL, useDashboardData, type DashboardData } from "@/lib/dashboard-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Building ESG Performance" },
      { name: "description", content: "Dashboard executiva ESG e eficiência energética da Central de Água Gelada." },
    ],
  }),
  component: Overview,
});

const iconFor: Record<string, React.ReactNode> = {
  energy: <Zap className="h-4 w-4" />,
  carbon: <Cloud className="h-4 w-4" />,
  eff: <Gauge className="h-4 w-4" />,
  cop: <Snowflake className="h-4 w-4" />,
  trh: <Activity className="h-4 w-4" />,
  deltaT: <Thermometer className="h-4 w-4" />,
  peak: <Bolt className="h-4 w-4" />,
  hours: <Clock className="h-4 w-4" />,
  baseline: <TrendingDown className="h-4 w-4" />,
};

function Overview() {
  const { data, isLoading, error } = useDashboardData();
  const kpis = data ? buildKpis(data) : [];

  return (
    <AppShell>
      {isLoading && <div className="control-card rounded-2xl p-4 text-sm text-muted-foreground">Carregando dados...</div>}
      {error && <div className="control-card rounded-2xl p-4 text-sm text-warning">Não foi possível carregar os dados reais. O dashboard tentou {DASHBOARD_DATA_URL}; verifique se o serviço de dados está ativo e se há dados consolidados disponíveis.</div>}

      {data && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-9">
            {kpis.map((k) => (
              <KpiCard key={k.key} kpi={k} icon={iconFor[k.key]} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
            <div className="xl:col-span-6">
              <CentralBehaviorChart data={data} />
            </div>
            <div className="xl:col-span-4">
              <ChillersTable data={data} />
            </div>
            <div className="xl:col-span-2">
              <InsightsCard data={data} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <PerformanceEsgCard data={data} />
            </div>
            <div className="xl:col-span-3">
              <ConsumptionByPeriodCard data={data} />
            </div>
            <div className="xl:col-span-5">
              <HealthScoreCard data={data} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
