import { createFileRoute } from "@tanstack/react-router";
import { Bolt, Cloud, Gauge, Snowflake, Activity, Thermometer, Zap, Clock, TrendingDown, ShieldCheck, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CentralBehaviorChart } from "@/components/dashboard/CentralBehaviorChart";
import { ChillersTable } from "@/components/dashboard/ChillersTable";
import { InsightsCard } from "@/components/dashboard/InsightsCard";
import { PerformanceEsgCard, ConsumptionByPeriodCard, HealthScoreCard } from "@/components/dashboard/EsgCards";
import { buildKpis, DASHBOARD_DATA_URL, useDashboardData } from "@/lib/dashboard-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Building ESG Performance" },
      { name: "description", content: "Dashboard executiva ESG e eficiência energética da Central de Água Gelada — dados consolidados do n8n." },
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

  return (
    <AppShell>
      {isLoading && <div className="glass-card rounded-2xl p-4 text-sm text-muted-foreground">Carregando dados do n8n...</div>}
      {error && <div className="glass-card rounded-2xl p-4 text-sm text-warning">Não foi possível carregar os dados reais. O dashboard tentou {DASHBOARD_DATA_URL}; verifique se o workflow GET /dashboard-data está ativo e se o Redis tem cag:dashboard:latest.</div>}
      {data && (() => {
        const kpis = buildKpis(data);
        const primaryKeys = ["eff", "energy", "cop", "peak"];
        const primaryKpis = kpis.filter((k) => primaryKeys.includes(k.key));
        const secondaryKpis = kpis.filter((k) => !primaryKeys.includes(k.key));
        const meta = data.overview?.kwtr_meta ?? 0;
        const eficiencia = data.overview?.kwtr_medio ?? 0;
        const dentroMeta = eficiencia <= meta;

        return (
        <>
          <div className="glass-card relative overflow-hidden rounded-3xl border border-emerald-500/20 p-6">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/5" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <ShieldCheck className="h-7 w-7" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {dentroMeta ? "Sistema operando dentro da meta" : "Sistema operando acima da meta"}
                    </h2>

                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      dentroMeta
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}>
                      {dentroMeta ? "Eficiência estável" : "Atenção operacional"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Eficiência média atual de {eficiencia} kW/TR comparada à meta operacional de {meta} kW/TR.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Performance
                  </div>

                  <div className={`mt-1 text-3xl font-semibold tracking-tight ${
                    dentroMeta ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    {Math.abs(Number(data.overview?.desvio_meta_kwtr ?? 0)).toFixed(2)}%
                  </div>
                </div>

                <div className="hidden h-12 w-px bg-border/60 lg:block" />

                <div className="hidden lg:block">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                    Dados operacionais consolidados pelo n8n
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {primaryKpis.map((k) => (
              <KpiCard key={k.key} kpi={k} icon={iconFor[k.key]} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {secondaryKpis.map((k) => (
              <div key={k.key} className="glass-card rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {k.label}
                  </span>

                  <span className="text-muted-foreground/60">
                    {iconFor[k.key]}
                  </span>
                </div>

                <div className="mt-2 flex items-end gap-1">
                  <span className="text-xl font-semibold tracking-tight">
                    {k.value}
                  </span>

                  <span className="pb-0.5 text-[11px] text-muted-foreground">
                    {k.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="xl:col-span-8"><CentralBehaviorChart data={data} /></div>
            <div className="xl:col-span-4"><InsightsCard data={data} /></div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="xl:col-span-5"><ChillersTable data={data} /></div>
            <div className="xl:col-span-3"><HealthScoreCard data={data} /></div>
            <div className="xl:col-span-4"><PerformanceEsgCard data={data} /></div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="xl:col-span-4"><ConsumptionByPeriodCard data={data} /></div>
          </div>
        </>
      )})()}
    </AppShell>
  );
}
