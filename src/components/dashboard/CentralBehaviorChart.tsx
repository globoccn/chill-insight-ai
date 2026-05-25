import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { buildChartSeries, formatDate, formatNumber, type DashboardData } from "@/lib/dashboard-data";

export function CentralBehaviorChart({ data }: { data: DashboardData }) {
  const series = buildChartSeries(data);
  const startDate = formatDate(data.overview.periodo_inicio);
  const endDate = formatDate(data.overview.periodo_fim);
  const analyzedDate = startDate !== endDate && startDate !== "—" ? `${startDate} a ${endDate}` : endDate;
  const meta = Number(data.overview.kwtr_meta ?? data.settings?.meta_kwtr ?? 0);

  return (
    <div className="control-card chart-panel rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">
            Comportamento da central <span className="font-normal text-muted-foreground">— {analyzedDate} (D-1)</span>
          </h3>
          <div className="mt-1 text-[11px] text-muted-foreground">kW / TR • kW/TR • Delta-T • Temperatura externa • Consumo acumulado</div>
        </div>
        <button className="rounded-lg border border-border/70 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground shadow-inner">15 minutos</button>
      </div>

      <div className="mt-3 h-[310px]">
        {series.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 10, right: 14, left: -10, bottom: 0 }}>
              <defs>
                <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,.13)" strokeDasharray="3 5" vertical={true} />
              <XAxis dataKey="label" stroke="var(--color-muted-foreground)" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={42} />
              <YAxis yAxisId="kw" stroke="var(--color-muted-foreground)" tick={{ fontSize: 10 }} width={44} />
              <YAxis yAxisId="cum" orientation="right" stroke="var(--color-muted-foreground)" tick={{ fontSize: 10 }} width={50} />
              {meta > 0 ? <ReferenceLine yAxisId="kw" y={meta} stroke="rgba(255,255,255,.55)" strokeDasharray="6 6" label={{ value: `Meta ${formatNumber(meta, 2)}`, fill: "var(--color-muted-foreground)", fontSize: 10 }} /> : null}
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,.13)", strokeWidth: 1 }}
                contentStyle={{ background: "rgba(8,13,24,.96)", border: "1px solid rgba(148,163,184,.18)", borderRadius: 14, fontSize: 12, boxShadow: "0 20px 60px rgba(0,0,0,.45)" }}
                labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconType="line" />
              <Line yAxisId="kw" type="monotone" dataKey="kW" name="kW" stroke="var(--color-water)" strokeWidth={2.2} dot={false} connectNulls={false} filter="url(#glow-blue)" />
              <Line yAxisId="kw" type="monotone" dataKey="trh" name="Carga térmica (TR)" stroke="var(--color-efficiency)" strokeWidth={2} dot={false} connectNulls={false} />
              <Line yAxisId="kw" type="monotone" dataKey="kwPerTr" name="kW/TR" stroke="var(--color-esg)" strokeWidth={1.8} dot={false} connectNulls={false} />
              <Line yAxisId="kw" type="monotone" dataKey="deltaT" name="Delta-T (°C)" stroke="var(--color-carbon)" strokeWidth={1.7} dot={false} connectNulls={false} />
              <Line yAxisId="kw" type="monotone" dataKey="extTemp" name="Temp. externa (°C)" stroke="var(--color-warning)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              <Line yAxisId="cum" type="monotone" dataKey="cumulative" name="Consumo acumulado (kWh)" stroke="rgba(226,232,240,.72)" strokeWidth={1.8} strokeDasharray="3 5" dot={false} />
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
