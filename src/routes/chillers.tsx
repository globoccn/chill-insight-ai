import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageTitle } from "@/components/layout/PageTitle";
import { ChillersTable } from "@/components/dashboard/ChillersTable";
import { chillers } from "@/lib/mock-data";
import { Snowflake, AlertTriangle, Award } from "lucide-react";

export const Route = createFileRoute("/chillers")({
  head: () => ({ meta: [{ title: "Chillers — Building ESG Performance" }, { name: "description", content: "Visão consolidada dos 5 chillers Carrier 23XRV." }] }),
  component: ChillersPage,
});

function statusTone(s: string) {
  if (s === "Online")  return "text-efficiency bg-efficiency/10 border-efficiency/30";
  if (s === "Standby") return "text-warning bg-warning/10 border-warning/30";
  return "text-critical bg-critical/10 border-critical/30";
}

function ChillerCard({ c }: { c: typeof chillers[number] }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-water/15 text-water">
            <Snowflake className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-tight">{c.name}</div>
            <div className="text-[11px] text-muted-foreground">Carrier 23XRV</div>
          </div>
        </div>
        <span className={`text-[11px] px-2 py-1 rounded-full border ${statusTone(c.status)}`}>{c.status}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-y-3 gap-x-4">
        <div>
          <div className="text-[11px] text-muted-foreground">Consumo</div>
          <div className="text-lg font-semibold tracking-tight">{c.kWh.toLocaleString("pt-BR")} <span className="text-[11px] font-normal text-muted-foreground">kWh</span></div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Horas</div>
          <div className="text-lg font-semibold tracking-tight">{c.hours.toFixed(1)} <span className="text-[11px] font-normal text-muted-foreground">h</span></div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Cap. média</div>
          <div className="text-lg font-semibold tracking-tight">{c.avgCapacity}%</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">% do consumo</div>
          <div className="text-lg font-semibold tracking-tight">{c.consumptionShare.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Eficiência</div>
          <div className="text-lg font-semibold tracking-tight">{c.efficiency.toFixed(2)} <span className="text-[11px] font-normal text-muted-foreground">kW/TR</span></div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Alarmes</div>
          <div className={`text-lg font-semibold tracking-tight flex items-center gap-1 ${c.alarms > 0 ? "text-warning" : ""}`}>
            {c.alarms > 0 && <AlertTriangle className="h-4 w-4" />}{c.alarms}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-[11.5px]">
        <span className="text-muted-foreground">Ranking de eficiência</span>
        <span className="inline-flex items-center gap-1 font-medium">
          <Award className="h-3.5 w-3.5 text-efficiency" /> #{c.rank} de 5
        </span>
      </div>
    </div>
  );
}

function ChillersPage() {
  return (
    <AppShell>
      <PageTitle title="Chillers" subtitle="5 chillers Carrier 23XRV — dados consolidados de D-1" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {chillers.map((c) => <ChillerCard key={c.id} c={c} />)}
      </div>

      <ChillersTable />
    </AppShell>
  );
}
