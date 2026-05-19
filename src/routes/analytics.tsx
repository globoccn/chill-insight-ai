import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageTitle } from "@/components/layout/PageTitle";
import { CentralBehaviorChart } from "@/components/dashboard/CentralBehaviorChart";
import { ConsumptionByPeriodCard } from "@/components/dashboard/EsgCards";
import { InsightsCard } from "@/components/dashboard/InsightsCard";
import { daySeries } from "@/lib/mock-data";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Building ESG Performance" }, { name: "description", content: "Análise predial: padrões, correlações e desperdício." }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const corr = daySeries.map((p) => ({ x: p.extTemp, y: p.kW }));

  return (
    <AppShell>
      <PageTitle title="Building Analytics" subtitle="Padrões operacionais, correlações e oportunidades de eficiência" />

      <CentralBehaviorChart />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 glass-card rounded-2xl p-5">
          <h3 className="text-[15px] font-semibold tracking-tight">Consumo x Temperatura externa</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Correlação observada nos 96 pontos do dia (D-1)</p>
          <div className="mt-4 h-[300px]">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
                <XAxis type="number" dataKey="x" name="Temp ext" unit="°C" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
                <YAxis type="number" dataKey="y" name="kW" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ stroke: "var(--color-efficiency)", strokeDasharray: "3 3" }}
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
                />
                <Scatter data={corr} fill="var(--color-water)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="xl:col-span-5"><ConsumptionByPeriodCard /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 glass-card rounded-2xl p-5">
          <h3 className="text-[15px] font-semibold tracking-tight">Operação em horário útil vs fora de horário</h3>
          <div className="mt-5 grid grid-cols-3 gap-4">
            {[
              { label: "Horário útil (08h–18h)", v: "27.840", u: "kWh", pct: 66, color: "var(--color-water)" },
              { label: "Fora de horário",        v: "14.510", u: "kWh", pct: 34, color: "var(--color-carbon)" },
              { label: "Desperdício estimado",   v: "1.820",  u: "kWh", pct: 4.3, color: "var(--color-warning)" },
            ].map((b) => (
              <div key={b.label} className="rounded-xl border border-border bg-card/60 p-4">
                <div className="text-xs text-muted-foreground">{b.label}</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight">{b.v}</span>
                  <span className="text-xs text-muted-foreground">{b.u}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{b.pct}% do total</div>
              </div>
            ))}
          </div>
        </div>
        <div className="xl:col-span-4"><InsightsCard /></div>
      </div>
    </AppShell>
  );
}
