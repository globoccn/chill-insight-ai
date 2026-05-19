import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageTitle } from "@/components/layout/PageTitle";
import { CentralBehaviorChart } from "@/components/dashboard/CentralBehaviorChart";
import { ChillersTable } from "@/components/dashboard/ChillersTable";
import { InsightsCard } from "@/components/dashboard/InsightsCard";
import { PerformanceEsgCard } from "@/components/dashboard/EsgCards";
import { kpis, ANALYZED_DATE } from "@/lib/mock-data";
import { Download, FileText, Printer } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Building ESG Performance" }, { name: "description", content: "Relatório diário pronto para exportação executiva em PDF." }] }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <AppShell>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatório Diário</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dia analisado: {ANALYZED_DATE} (D-1) — pronto para exportação</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm shadow-sm"><Printer className="h-4 w-4" /> Imprimir</button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-efficiency px-3.5 py-2 text-sm font-medium text-background shadow-sm"><Download className="h-4 w-4" /> Exportar PDF</button>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-efficiency/15 text-efficiency"><FileText className="h-5 w-5" /></div>
          <div>
            <div className="text-[15px] font-semibold tracking-tight">Resumo executivo</div>
            <div className="text-xs text-muted-foreground">Central de Água Gelada · 5 chillers Carrier 23XRV</div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-foreground/85 max-w-3xl">
          No dia analisado, a central operou com consumo total de <strong>42.350 kWh</strong>, eficiência média de
          <strong> 0,62 kW/TR</strong> e emissão estimada de <strong>18,7 tCO₂e</strong>. O desempenho ficou
          <strong className="text-efficiency"> 9,8% abaixo do baseline</strong>, dentro da meta ESG diária. O pico de
          demanda ocorreu entre 14h15 e 14h30, com participação predominante do Chiller 01.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.slice(0, 6).map((k) => (
          <div key={k.key} className="glass-card rounded-2xl p-4">
            <div className="text-[11px] text-muted-foreground">{k.label}</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tracking-tight">{k.value}</span>
              <span className="text-[11px] text-muted-foreground">{k.unit}</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{k.dod > 0 ? "+" : ""}{k.dod}% vs D-2</div>
          </div>
        ))}
      </div>

      <CentralBehaviorChart />
      <ChillersTable />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7"><PerformanceEsgCard /></div>
        <div className="xl:col-span-5"><InsightsCard /></div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-[15px] font-semibold tracking-tight">Recomendações operacionais</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {[
            "Avaliar redistribuição de carga: Chiller 01 concentra 30,3% do consumo.",
            "Investigar delta-T abaixo da meta entre 13h e 17h (carga parcial).",
            "Manter estratégia de partida escalonada para evitar pico ≥ 1.250 kW.",
            "Considerar reforço de setpoint no horário 18h–22h para acumular ganho ESG mensal.",
          ].map((r, i) => (
            <li key={i} className="flex gap-2 text-foreground/85">
              <span className="text-efficiency">•</span> {r}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
