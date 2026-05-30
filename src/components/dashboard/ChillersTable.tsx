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

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pct(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${formatNumber(value, 1)}%`;
}

export function ChillersTable({ data }: { data: DashboardData }) {
  const chillers = data.chillers;
  const overview = data.overview;

  const totalChillersKwh = chillers.reduce((acc, c) => acc + safeNumber(c.kwh), 0) || safeNumber(overview.kwh_chillers);

  const totalPlantKwh = safeNumber(overview.kwh_total);
  const auxiliaresKwh = safeNumber(overview.kwh_auxiliares) || Math.max(0, totalPlantKwh - totalChillersKwh);
  const bombasKwh = safeNumber(overview.kwh_bombas);
  const torresKwh = safeNumber(overview.kwh_torres);

  const rows = [...chillers].sort((a, b) => safeNumber(b.kwh) - safeNumber(a.kwh));
  const activeCount = rows.filter((c) => safeNumber(c.kwh) > 0 && safeNumber(c.trh) > 0).length;

  return (
    <div className="control-card h-full rounded-2xl p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight">
          Consumo por sistema <span className="font-normal text-muted-foreground">— Chillers e auxiliares</span>
        </h3>
        <span className="text-xs text-muted-foreground">{activeCount}/{chillers.length} operando</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/[0.06] bg-foreground/[0.03] p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Chillers</div>
          <div className="mt-1 text-base font-bold tabular-nums">{formatNumber(totalChillersKwh)}</div>
          <div className="text-[11px] text-muted-foreground">{pct(totalPlantKwh > 0 ? (totalChillersKwh / totalPlantKwh) * 100 : null)}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-foreground/[0.03] p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bombas</div>
          <div className="mt-1 text-base font-bold tabular-nums">{formatNumber(bombasKwh)}</div>
          <div className="text-[11px] text-muted-foreground">{pct(totalPlantKwh > 0 ? (bombasKwh / totalPlantKwh) * 100 : null)}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-foreground/[0.03] p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Torres</div>
          <div className="mt-1 text-base font-bold tabular-nums">{formatNumber(torresKwh)}</div>
          <div className="text-[11px] text-muted-foreground">{pct(totalPlantKwh > 0 ? (torresKwh / totalPlantKwh) * 100 : null)}</div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 text-left font-medium">Chiller</th>
              <th className="text-left font-medium">Status</th>
              <th className="text-right font-medium">kWh</th>
              <th className="text-right font-medium">Horas</th>
              <th className="text-right font-medium">Carga</th>
              <th className="text-right font-medium pr-1">kW/TR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const share = totalChillersKwh > 0 ? (safeNumber(c.kwh) / totalChillersKwh) * 100 : null;
              const isOff = safeNumber(c.kwh) <= 0 && safeNumber(c.trh) <= 0;
              const status = isOff ? "Off" : c.status;

              return (
                <tr key={c.id} className="border-t border-border/70 dark:border-white/[0.06]">
                  <td className="py-2.5 font-semibold">{c.name}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${isOff ? "bg-muted" : statusDot(c.status)}`} />
                      <span className={isOff ? "text-muted-foreground" : c.status === "Online" ? "text-efficiency" : c.status === "Standby" ? "text-warning" : "text-critical"}>{status}</span>
                    </span>
                  </td>
                  <td className="text-right tabular-nums font-medium">{formatNumber(c.kwh)}</td>
                  <td className="text-right tabular-nums text-muted-foreground">{formatNumber(c.horas_operacao, 1)}</td>
                  <td className="text-right tabular-nums">{pct(share)}</td>
                  <td className="pr-1">
                    <div className="flex items-center justify-end gap-2">
                      <span className="w-10 text-right tabular-nums font-medium">{isOff ? "—" : formatNumber(c.kwtr, 2)}</span>
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-foreground/[0.08] dark:bg-white/[0.08]">
                        <div className="h-full rounded-full" style={isOff ? { width: "0%", background: "var(--color-muted)" } : effBar(c.kwtr)} />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}

            <tr className="border-t border-border dark:border-white/[0.10]">
              <td className="py-2.5 font-semibold text-efficiency">Total chillers</td>
              <td />
              <td className="text-right font-semibold tabular-nums">{formatNumber(totalChillersKwh)}</td>
              <td className="text-right tabular-nums text-muted-foreground">{formatNumber(chillers.reduce((a, c) => a + safeNumber(c.horas_operacao), 0), 1)}</td>
              <td className="text-right font-semibold tabular-nums">100%</td>
              <td className="text-right font-semibold pr-1 tabular-nums">{formatNumber(overview.kwtr_medio, 2)}</td>
            </tr>

            <tr className="border-t border-border/70 dark:border-white/[0.06] text-muted-foreground">
              <td className="py-2.5 font-semibold">Auxiliares</td>
              <td>Bombas + torres</td>
              <td className="text-right font-medium tabular-nums">{formatNumber(auxiliaresKwh)}</td>
              <td />
              <td className="text-right tabular-nums">{pct(totalPlantKwh > 0 ? (auxiliaresKwh / totalPlantKwh) * 100 : null)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
