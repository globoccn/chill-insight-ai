import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildChartSeries, formatDate, type DashboardData } from "@/lib/dashboard-data";

export function CentralBehaviorChart({ data }: { data: DashboardData }) {
  const series = buildChartSeries(data);
  const analyzedDate = formatDate(data.overview.periodo_fim);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">
            Comportamento da central <span className="text-muted-foreground font-normal">— {analyzedDate}</span>
          </h3>
        </div>
        <button className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">15 minutos</button>
      </div>

      <div className="mt-4 h-[320px]">
        {series.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="time" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} interval={11} />
              <YAxis yAxisId="kw" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="cum" orientation="right" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="line" />
              <Line yAxisId="kw" type="monotone" dataKey="kW" name="kW" stroke="var(--color-water)" strokeWidth={1.8} dot={false} />
              <Line yAxisId="kw" type="monotone" dataKey="trh" name="Carga térmica (TR)" stroke="var(--color-efficiency)" strokeWidth={1.6} dot={false} />
              <Line yAxisId="kw" type="monotone" dataKey="kwPerTr" name="kW/TR" stroke="var(--color-esg)" strokeWidth={1.4} dot={false} />
              <Line yAxisId="kw" type="monotone" dataKey="deltaT" name="Delta-T (°C)" stroke="var(--color-carbon)" strokeWidth={1.4} dot={false} />
              <Line yAxisId="kw" type="monotone" dataKey="extTemp" name="Temp. externa (°C)" stroke="var(--color-warning)" strokeWidth={1.2} strokeDasharray="4 3" dot={false} />
              <Line yAxisId="cum" type="monotone" dataKey="cumulative" name="Consumo acumulado (kWh)" stroke="var(--color-muted-foreground)" strokeWidth={1.4} strokeDasharray="2 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            Aguardando dados do n8n/Redis.
          </div>
        )}
      </div>
    </div>
  );
}
