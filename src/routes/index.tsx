import { createFileRoute } from "@tanstack/react-router";
import { Bolt, Cloud, Gauge, Snowflake, Activity, Thermometer, Zap, Clock, TrendingDown, Leaf, Info } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CentralBehaviorChart } from "@/components/dashboard/CentralBehaviorChart";
import { ChillersTable } from "@/components/dashboard/ChillersTable";
import { InsightsCard } from "@/components/dashboard/InsightsCard";
import { PerformanceEsgCard, ConsumptionByPeriodCard, HealthScoreCard } from "@/components/dashboard/EsgCards";
import { buildKpis, DASHBOARD_DATA_URL, formatDate, formatDateTime, formatNumber, useDashboardData, type DashboardData } from "@/lib/dashboard-data";

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

function DashboardTopBar({ data }: { data: DashboardData }) {
  const day = formatDate(data.overview.periodo_fim);
  const lastImport = formatDateTime(data.overview.periodo_fim);
  const deviation = Number(data.overview.desvio_meta_kwtr ?? 0);
  const statusText = deviation <= 0 ? "Dados consolidados de D-1" : "Atenção à meta de D-1";

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="control-card flex items-center gap-3 rounded-xl px-4 py-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/15 text-blue-300">
            <Clock className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Dia analisado (D-1)</div>
            <div className="text-sm font-semibold">{day}</div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-efficiency/25 bg-efficiency/10 px-3 py-1.5 text-xs font-medium text-efficiency shadow-[0_0_22px_rgba(34,197,94,.12)]">
          <Leaf className="h-3.5 w-3.5" />
          {statusText}
          <Info className="h-3 w-3 opacity-70" />
        </div>
      </div>

      <div className="flex items-center gap-2 text-right text-xs text-muted-foreground">
        <div>
          <div className="uppercase tracking-wide">Última importação</div>
          <div className="mt-0.5 inline-flex items-center gap-2 font-semibold text-foreground">
            {lastImport}
            <span className="h-2 w-2 rounded-full bg-efficiency shadow-[0_0_10px_var(--color-efficiency)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Overview() {
  const { data, isLoading, error } = useDashboardData();
  const kpis = data ? buildKpis(data) : [];

  return (
    <AppShell>
      {isLoading && <div className="control-card rounded-2xl p-4 text-sm text-muted-foreground">Carregando dados do n8n...</div>}
      {error && <div className="control-card rounded-2xl p-4 text-sm text-warning">Não foi possível carregar os dados reais. O dashboard tentou {DASHBOARD_DATA_URL}; verifique se o workflow GET /dashboard-data está ativo e se o Redis tem cag:dashboard:latest.</div>}

      {data && (
        <div className="space-y-3.5">
          <DashboardTopBar data={data} />

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

          <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
            <div className="control-card rounded-2xl p-4 xl:col-span-7">
              <div className="text-sm font-semibold">Resumo operacional</div>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-xl bg-white/[0.025] p-3">
                  <div className="text-[11px] text-muted-foreground">Meta kW/TR</div>
                  <div className="mt-1 text-xl font-semibold">{formatNumber(data.overview.kwtr_meta, 2)}</div>
                </div>
                <div className="rounded-xl bg-white/[0.025] p-3">
                  <div className="text-[11px] text-muted-foreground">Desvio</div>
                  <div className={Number(data.overview.desvio_meta_kwtr ?? 0) <= 0 ? "mt-1 text-xl font-semibold text-efficiency" : "mt-1 text-xl font-semibold text-warning"}>{formatNumber(data.overview.desvio_meta_kwtr, 2)}%</div>
                </div>
                <div className="rounded-xl bg-white/[0.025] p-3">
                  <div className="text-[11px] text-muted-foreground">Hora pico</div>
                  <div className="mt-1 text-xl font-semibold">{formatDateTime(data.overview.hora_pico)}</div>
                </div>
                <div className="rounded-xl bg-white/[0.025] p-3">
                  <div className="text-[11px] text-muted-foreground">Fator carbono</div>
                  <div className="mt-1 text-xl font-semibold">{formatNumber(data.esg?.fator_carbono_kgco2_kwh, 4)}</div>
                </div>
              </div>
            </div>
            <div className="control-card rounded-2xl p-4 xl:col-span-5">
              <div className="text-sm font-semibold">Comparações calculadas</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Os cards superiores comparam o dia analisado contra D-2 e contra a média dos até 7 dias anteriores disponíveis no próprio <span className="font-medium text-foreground">cag:dashboard:latest</span>. Quando o histórico diário definitivo entrar, o layout permanece igual e só mudamos a fonte.
              </p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
