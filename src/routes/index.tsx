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

  const allKpis = data ? buildKpis(data) : [];
  const primaryKpis = allKpis.slice(0, 4);
  const secondaryKpis = allKpis.slice(4);

  return (
    <AppShell>
      {isLoading && <div className="glass-card rounded-2xl p-4 text-sm text-muted-foreground">Carregando dados do n8n...</div>}
      {error && <div className="glass-card rounded-2xl p-4 text-sm text-warning">Não foi possível carregar os dados reais. O dashboard tentou {DASHBOARD_DATA_URL}; verifique se o workflow GET /dashboard-data está ativo e se o Redis tem cag:dashboard:latest.</div>}

      {data && (
        <div className="space-y-5">
          <div className="glass-card relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent_70%)]" />

            <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-tight">
                      Sistema operando dentro da meta
                    </h2>

                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                      Operação estável
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Eficiência operacional recalculada em tempo real com base nos parâmetros atuais da planta.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Eficiência média
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.overview?.kwtr_medio ?? "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Meta atual
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {data.overview?.kwtr_meta ?? "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/20 p-3 col-span-2 xl:col-span-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Desvio da meta
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-emerald-400">
                    <ArrowUpRight className="h-5 w-5" />
                    {data.overview?.desvio_meta_kwtr ?? "—"}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-8">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {primaryKpis.map((k) => (
                  <KpiCard key={k.key} kpi={k} icon={iconFor[k.key]} />
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {secondaryKpis.map((k) => (
                  <div
                    key={k.key}
                    className="glass-card rounded-2xl border border-white/5 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {k.label}
                      </span>

                      <span className="text-muted-foreground/60">
                        {iconFor[k.key]}
                      </span>
                    </div>

                    <div className="mt-2 flex items-end gap-1">
                      <span className="text-2xl font-semibold leading-none">
                        {k.value}
                      </span>

                      <span className="pb-0.5 text-[11px] text-muted-foreground">
                        {k.unit}
                      </span>
                    </div>

                    {k.extra ? (
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {k.extra}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="xl:col-span-4">
              <InsightsCard data={data} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-8">
              <CentralBehaviorChart data={data} />
            </div>

            <div className="xl:col-span-4">
              <ChillersTable data={data} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <PerformanceEsgCard data={data} />
            </div>

            <div className="xl:col-span-3">
              <ConsumptionByPeriodCard data={data} />
            </div>

            <div className="xl:col-span-4">
              <HealthScoreCard data={data} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
