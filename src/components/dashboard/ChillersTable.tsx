import { formatNumber, type DashboardData } from "@/lib/dashboard-data";

function statusDot(s: string) {
  if (s === "Online") return "bg-efficiency shadow-[0_0_8px_var(--color-efficiency)]";
  if (s === "Standby") return "bg-warning shadow-[0_0_8px_var(--color-warning)]";
  return "bg-critical shadow-[0_0_8px_var(--color-critical)]";
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
    <div className="control-card h-full rounded-2xl p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight">
          Chillers <span className="font-normal text-muted-foreground">— Resumo do dia (D-1)</span>
        </h3>
        <span className="text-xs text-muted-foreground">{chillers.length} chillers</span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 text-left font-medium">Chiller</th>
              <th className="text-left font-medium">Status</th>
              <th className="text-right font-medium">kWh</th>
              <th className="text-right font-medium">Horas</th>
              <th className="text-right font-medium">Cap.</th>
              <th className="text-right font-medium">%</th>
              <th className="text-right font-medium pr-1">Eficiência</th>
            </tr>
          </thead>
          <tbody>
            {chillers.map((c) => (
              <tr key={c.id} className="border-t border-border/70 dark:border-white/[0.06]">
                <td className="py-2.5 font-semibold">{c.name}</td>
                <td>
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDot(c.status)}`} />
                    <span className={c.status === "Online" ? "text-efficiency" : c.status === "Standby" ? "text-warning" : "text-critical"}>{c.status}</span>
                  </span>
                </td>
                <td className="text-right tabular-nums font-medium">{formatNumber(c.kwh)}</td>
                <td className="text-right tabular-nums text-muted-foreground">{formatNumber(c.horas_operacao, 1)}</td>
                <td className="text-right tabular-nums">{formatNumber(c.cap_media, 0)}%</td>
                <td className="text-right tabular-nums">{formatNumber(c.participacao_consumo, 1)}%</td>
                <td className="pr-1">
                  <div className="flex items-center justify-end gap-2">
                    <span className="w-10 text-right tabular-nums font-medium">{formatNumber(c.kwtr, 2)}</span>
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-foreground/[0.08] dark:bg-white/[0.08]">
                      <div className="h-full rounded-full" style={effBar(c.kwtr)} />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="border-t border-border dark:border-white/[0.10]">
              <td className="py-2.5 font-semibold text-efficiency">Total</td>
              <td />
              <td className="text-right font-semibold tabular-nums">{formatNumber(data.overview.kwh_total)}</td>
              <td className="text-right tabular-nums text-muted-foreground">{formatNumber(chillers.reduce((a, c) => a + Number(c.horas_operacao ?? 0), 0), 1)}</td>
              <td className="text-right text-muted-foreground">—</td>
              <td className="text-right font-semibold tabular-nums">100%</td>
              <td className="text-right font-semibold pr-1 tabular-nums">{formatNumber(data.overview.kwtr_medio, 2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
