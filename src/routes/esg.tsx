import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageTitle } from "@/components/layout/PageTitle";
import { PerformanceEsgCard, HealthScoreCard } from "@/components/dashboard/EsgCards";
import { formatNumber, useDashboardData } from "@/lib/dashboard-data";
import { ArrowDown, ArrowUp, Leaf, TreeDeciduous, Wind } from "lucide-react";

export const Route = createFileRoute("/esg")({
  head: () => ({ meta: [{ title: "ESG — Building ESG Performance" }, { name: "description", content: "Indicadores ESG, carbono e progresso vs metas sustentáveis." }] }),
  component: EsgPage,
});

function EsgPage() {
  const { data, isLoading, error } = useDashboardData();
  const deviation = Number(data?.overview.desvio_meta_kwtr ?? 0);
  const better = deviation <= 0;

  return (
    <AppShell>
      <PageTitle title="ESG Performance" subtitle="Indicadores ambientais estimados com fator nacional provisório" />
      {isLoading && <div className="glass-card rounded-2xl p-4 text-sm text-muted-foreground">Carregando ESG...</div>}
      {error && <div className="glass-card rounded-2xl p-4 text-sm text-warning">Não foi possível carregar ESG.</div>}
      {data && <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Leaf className="h-4 w-4 text-efficiency" /> Carbono do período</div>
            <div className="mt-3 flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-tight">{formatNumber(data.overview.carbono_ton, 3)}</span><span className="text-sm text-muted-foreground">tCO₂e</span></div>
            <div className="mt-2 text-sm text-muted-foreground">Fator nacional configurável</div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wind className="h-4 w-4 text-esg" /> Eficiência vs meta</div>
            <div className="mt-3 flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-tight">{formatNumber(data.overview.kwtr_medio, 3)}</span><span className="text-sm text-muted-foreground">kW/TR</span></div>
            <div className={`mt-2 text-sm flex items-center gap-1 ${better ? "text-efficiency" : "text-warning"}`}>{better ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />} {formatNumber(deviation, 2)}% vs meta</div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><TreeDeciduous className="h-4 w-4 text-carbon" /> Consumo específico</div>
            <div className="mt-3 flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-tight">{formatNumber(data.overview.kwh_m2, 6)}</span><span className="text-sm text-muted-foreground">kWh/m²</span></div>
            <div className="mt-2 text-sm text-muted-foreground">Depende da área climatizada em Settings</div>
          </div>
        </div>

        <PerformanceEsgCard data={data} />
        <HealthScoreCard data={data} />
      </>}
    </AppShell>
  );
}
