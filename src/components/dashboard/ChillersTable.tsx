import { formatNumber, type DashboardData } from "@/lib/dashboard-data";

function statusDot(s: string) {
  if (s === "Online") return "bg-efficiency shadow-[0_0_6px_var(--color-efficiency)]";
  if (s === "Standby") return "bg-warning";
  return "bg-critical";
}

function effBar(eff?: number | null) {
  if (eff === null || eff === undefined) return { width: "0%", background: "var(--color-muted)" };
  const pct = Math.max(0, Math.min(1, 1 - (eff - 0.55) / 0.6));
  const color = pct > 0.7 ? "var(--color-efficiency)" : pct > 0.4 ? "var(--color-warning)" : "var(--color-critical)";
  return { width: `${pct * 100}%`, background: color };
}

export function ChillersTable({ data }: { data: DashboardData }) {
  const chillers = data.chillers;

  return (
    <div className="glass-card rounded-2xl p-5 overflow-x-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight">
          Chillers <span className="text-muted-foreground font-normal">— Resumo do período</span>
        </h3>
        <span className="text-xs text-muted-foreground">{chillers.length} chillers</span>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="text-left font-medium py-2">Chiller</th>
            <th className="text-left font-medium">Status</th>
            <th className="text-right font-medium">kWh</th>
            <th className="text-right font-medium">Horas</th>
            <th className="text-right font-medium">Cap. média</th>
            <th className="text-right font-medium">% consumo</th>
            <th className="text-right font-medium">Delta-T</th>
            <th className="text-right font-medium pr-2">Eficiência<br/>(kW/TR)</th>
          </tr>
        </thead>
        <tbody>
          {chillers.map((c) => (
            <tr key={c.id} className="border-t border-border/60">
              <td className="py-2.5 font-medium">{c.name}</td>
              <td>
                <span className="inline-flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDot(c.status)}`} />
                  <span className="text-muted-foreground">{c.status}</span>
                </span>
              </td>
              <td className="text-right tabular-nums">{formatNumber(c.kwh)}</td>
              <td className="text-right tabular-nums text-muted-foreground">{formatNumber(c.horas_operacao, 1)}</td>
              <td className="text-right tabular-nums">{formatNumber(c.cap_media, 0)}%</td>
              <td className="text-right tabular-nums">{formatNumber(c.participacao_consumo, 1)}%</td>
              <td className="text-right tabular-nums">{formatNumber(c.deltaT_evap_medio, 2)} °C</td>
              <td className="pr-2">
                <div className="flex items-center justify-end gap-2">
                  <span className="tabular-nums">{formatNumber(c.kwtr, 3)}</span>
                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={effBar(c.kwtr)} />
                  </div>
                </div>
              </td>
            </tr>
          ))}
          <tr className="border-t border-border">
            <td className="py-2.5 font-semibold text-efficiency">Total</td>
            <td />
            <td className="text-right font-semibold tabular-nums">{formatNumber(data.overview.kwh_total)}</td>
            <td className="text-right tabular-nums text-muted-foreground">{formatNumber(chillers.reduce((a, c) => a + Number(c.horas_operacao ?? 0), 0), 1)}</td>
            <td className="text-right text-muted-foreground">—</td>
            <td className="text-right font-semibold tabular-nums">100%</td>
            <td className="text-right font-semibold tabular-nums">{formatNumber(data.overview.deltaT_evap_medio, 2)} °C</td>
            <td className="text-right font-semibold pr-2 tabular-nums">{formatNumber(data.overview.kwtr_medio, 3)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
