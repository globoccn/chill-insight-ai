import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageTitle } from "@/components/layout/PageTitle";
import { CentralBehaviorChart } from "@/components/dashboard/CentralBehaviorChart";
import { ChillersTable } from "@/components/dashboard/ChillersTable";
import { PerformanceEsgCard } from "@/components/dashboard/EsgCards";
import { InsightsCard } from "@/components/dashboard/InsightsCard";
import { buildInsights, buildKpis, formatDateTime, formatNumber, useDashboardDataFull } from "@/lib/dashboard-data";
import { Download, FileText } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Building ESG Performance" }, { name: "description", content: "Relatórios executivos e operacionais da CAG." }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data, isLoading, error } = useDashboardDataFull();

  return (
    <AppShell>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <PageTitle title="Reports" subtitle="Relatórios automáticos consolidados pelo n8n" />
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm"><Download className="h-4 w-4" /> Exportar PDF</button>
        </div>
      </div>

      {isLoading && <div className="glass-card rounded-2xl p-4 text-sm text-muted-foreground">Carregando relatório...</div>}
      {error && <div className="glass-card rounded-2xl p-4 text-sm text-warning">Não foi possível carregar relatório.</div>}
      {data && <>
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-efficiency/15 text-efficiency"><FileText className="h-5 w-5" /></div>
            <div>
              <div className="text-[15px] font-semibold tracking-tight">Resumo executivo</div>
              <div className="text-xs text-muted-foreground">Central de Água Gelada · {data.chillers.length} chillers · {formatDateTime(data.overview.periodo_inicio)} até {formatDateTime(data.overview.periodo_fim)}</div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-foreground/85 max-w-3xl">
            No período analisado, a central operou com consumo total de <strong>{formatNumber(data.overview.kwh_total)} kWh</strong>, eficiência média de
            <strong> {formatNumber(data.overview.kwtr_medio, 3)} kW/TR</strong> e emissão estimada de <strong>{formatNumber(data.overview.carbono_ton, 3)} tCO₂e</strong>.
            O desvio em relação à meta de <strong>{formatNumber(data.overview.kwtr_meta, 2)} kW/TR</strong> foi de
            <strong className={Number(data.overview.desvio_meta_kwtr ?? 0) <= 0 ? "text-efficiency" : "text-warning"}> {formatNumber(data.overview.desvio_meta_kwtr, 2)}%</strong>.
            O pico de demanda ocorreu em <strong>{formatDateTime(data.overview.hora_pico)}</strong> com <strong>{formatNumber(data.overview.pico_kw)} kW</strong>.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {buildKpis(data).slice(0, 6).map((k) => (
            <div key={k.key} className="glass-card rounded-2xl p-4">
              <div className="text-[11px] text-muted-foreground">{k.label}</div>
              <div className="mt-1 flex items-baseline gap-1.5"><span className="text-xl font-semibold tracking-tight">{k.value}</span><span className="text-[11px] text-muted-foreground">{k.unit}</span></div>
              <div className="mt-1 text-[11px] text-muted-foreground">Dados do último processamento</div>
            </div>
          ))}
        </div>

        <CentralBehaviorChart data={data} />
        <ChillersTable data={data} />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-7"><PerformanceEsgCard data={data} /></div>
          <div className="xl:col-span-5"><InsightsCard data={data} /></div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-[15px] font-semibold tracking-tight">Recomendações operacionais</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {buildInsights(data).map((r, i) => (
              <li key={i} className="flex gap-2 text-foreground/85"><span className="text-efficiency">•</span> {r.text}</li>
            ))}
          </ul>
        </div>
      </>}
    </AppShell>
  );
}
