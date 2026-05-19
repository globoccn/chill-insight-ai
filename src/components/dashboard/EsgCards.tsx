import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { consumptionByPeriod, esgPerformance, healthScores } from "@/lib/mock-data";

const COLORS = {
  water: "var(--color-water)",
  efficiency: "var(--color-efficiency)",
  carbon: "var(--color-carbon)",
  esg: "var(--color-esg)",
} as const;

function MiniDonut({ pct, color }: { pct: number; color: string }) {
  const data = [{ v: pct }, { v: 100 - pct }];
  return (
    <div className="relative h-16 w-16">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="v" innerRadius={22} outerRadius={30} startAngle={90} endAngle={-270} stroke="none">
            <Cell fill={color} />
            <Cell fill="var(--color-muted)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center text-[10px] font-medium">{pct}%</div>
    </div>
  );
}

export function PerformanceEsgCard() {
  const items = [
    { label: "Carbono (D-1)",         value: "18,7", unit: "tCO₂e",   target: "Meta: ≤ 20,0 tCO₂e", pct: 93,  color: COLORS.carbon,     hint: "" },
    { label: "Intensidade energética",value: "0,62", unit: "kWh/TRh", target: "Meta: ≤ 0,68",       pct: 91,  color: COLORS.efficiency, hint: "" },
    { label: "Economia vs baseline",  value: "-9,8", unit: "%",       target: "Meta: ≤ -8,0%",      pct: 95,  color: COLORS.esg,        hint: "" },
    { label: "Progresso mensal (Maio)",value:"-8,6", unit: "%",       target: "Meta mensal: ≤ -8,0%", pct: 86, color: COLORS.efficiency, hint: "Meta atingida 86%" },
  ];

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-[15px] font-semibold tracking-tight">Performance ESG</h3>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl border border-border bg-card/60 p-4">
            <div className="text-[11px] text-muted-foreground">{it.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-semibold tracking-tight">{it.value}</span>
              <span className="text-[11px] text-muted-foreground">{it.unit}</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{it.target}</div>
            <div className="mt-3 flex items-center justify-between">
              <MiniDonut pct={it.pct} color={it.color} />
              <div className="text-right text-[11px] text-efficiency font-medium">{it.hint || ""}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConsumptionByPeriodCard() {
  const data = consumptionByPeriod.map((d) => ({ name: d.period, value: d.pct, color: COLORS[d.color] }));
  const total = "42.350";
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-[15px] font-semibold tracking-tight">Consumo por período (D-1)</h3>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-44 w-44 shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={56} outerRadius={84} paddingAngle={2} stroke="none">
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-xl font-semibold tracking-tight">{total}</div>
              <div className="text-[10px] text-muted-foreground">kWh</div>
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-2.5 text-sm">
          {consumptionByPeriod.map((d) => (
            <li key={d.period} className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[d.color] }} />
              <span className="flex-1 text-[12.5px]">{d.period}</span>
              <span className="tabular-nums text-muted-foreground text-[12px]">{d.pct}%</span>
              <span className="w-20 text-right tabular-nums text-[12.5px] font-medium">{d.kWh.toLocaleString("pt-BR")} kWh</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function HealthScoreCard() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight">Score de saúde</h3>
        <button className="text-xs font-medium text-efficiency hover:underline">Ver detalhes</button>
      </div>
      <div className="mt-5 grid grid-cols-5 gap-3">
        {healthScores.map((h) => {
          const color = h.value >= 88 ? "var(--color-esg)" : h.value >= 84 ? "var(--color-efficiency)" : h.value >= 80 ? "var(--color-warning)" : "var(--color-critical)";
          return (
            <div key={h.label} className="text-center">
              <div className="text-[11px] text-muted-foreground">{h.label}</div>
              <div className="relative mx-auto mt-2 grid h-16 w-16 place-items-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                  <circle cx="50" cy="50" r="42" stroke="currentColor" className="text-muted/40" strokeWidth="9" fill="none" />
                  <circle cx="50" cy="50" r="42" stroke={color} strokeWidth="9" strokeLinecap="round" fill="none"
                    strokeDasharray={`${(h.value / 100) * 264} 264`} />
                </svg>
                <span className="text-lg font-semibold tabular-nums">{h.value}</span>
              </div>
              <div className="mt-1 text-[11px] font-medium" style={{ color }}>{h.status}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-[12px]">
        <div>
          <div className="text-muted-foreground">Árvores equivalentes</div>
          <div className="mt-0.5 font-semibold">{esgPerformance.treesEquivalent.toLocaleString("pt-BR")} 🌳</div>
        </div>
        <div>
          <div className="text-muted-foreground">Km evitados</div>
          <div className="mt-0.5 font-semibold">{esgPerformance.kmAvoided.toLocaleString("pt-BR")} km</div>
        </div>
        <div>
          <div className="text-muted-foreground">Meta ESG mensal</div>
          <div className="mt-0.5 font-semibold text-efficiency">{esgPerformance.goalReachedPct}% atingida</div>
        </div>
      </div>
    </div>
  );
}
