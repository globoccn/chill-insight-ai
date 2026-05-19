import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageTitle } from "@/components/layout/PageTitle";
import { PerformanceEsgCard, HealthScoreCard } from "@/components/dashboard/EsgCards";
import { comparatives, esgPerformance } from "@/lib/mock-data";
import { ArrowDown, ArrowUp, Leaf, TreeDeciduous, Wind } from "lucide-react";

export const Route = createFileRoute("/esg")({
  head: () => ({ meta: [{ title: "ESG — Building ESG Performance" }, { name: "description", content: "Indicadores ESG, carbono e progresso vs metas sustentáveis." }] }),
  component: EsgPage,
});

function EsgPage() {
  return (
    <AppShell>
      <PageTitle title="ESG Performance" subtitle="Indicadores ambientais consolidados do último dia fechado (D-1)" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Leaf className="h-4 w-4 text-efficiency" /> Carbono diário (D-1)</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight">{esgPerformance.carbonDay}</span>
            <span className="text-sm text-muted-foreground">tCO₂e</span>
          </div>
          <div className="mt-2 text-sm text-efficiency flex items-center gap-1"><ArrowDown className="h-3.5 w-3.5" /> -7,6% vs D-2</div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wind className="h-4 w-4 text-esg" /> Acumulado mensal</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight">{esgPerformance.carbonMonth}</span>
            <span className="text-sm text-muted-foreground">tCO₂e</span>
          </div>
          <div className="mt-2 text-sm text-efficiency flex items-center gap-1"><ArrowDown className="h-3.5 w-3.5" /> -8,6% vs baseline</div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TreeDeciduous className="h-4 w-4 text-efficiency" /> Equivalente ambiental</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-2xl font-semibold tracking-tight">{esgPerformance.treesEquivalent}</div>
              <div className="text-xs text-muted-foreground">árvores plantadas</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-tight">{esgPerformance.kmAvoided.toLocaleString("pt-BR")}</div>
              <div className="text-xs text-muted-foreground">km evitados</div>
            </div>
          </div>
        </div>
      </div>

      <PerformanceEsgCard />
      <HealthScoreCard />

      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-[15px] font-semibold tracking-tight">Comparativos</h3>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {comparatives.map((c) => {
            const good = c.delta < 0;
            return (
              <div key={c.label} className="rounded-xl border border-border bg-card/60 p-4">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className={`mt-1 flex items-center gap-1.5 text-2xl font-semibold ${good ? "text-positive" : "text-negative"}`}>
                  {good ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                  {Math.abs(c.delta)}{c.unit}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
