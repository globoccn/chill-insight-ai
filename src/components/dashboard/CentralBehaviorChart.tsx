import {
  CartesianGrid,
  Area,
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
                <linearGradient id="area-kw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-water)" stopOpacity={0.32} />
                  <stop offset="52%" stopColor="var(--color-water)" stopOpacity={0.10} />
                  <stop offset="100%" stopColor="var(--color-water)" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="area-tr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-efficiency)" stopOpacity={0.26} />
                  <stop offset="55%" stopColor="var(--color-efficiency)" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="var(--color-efficiency)" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="area-kwtr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-esg)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--color-esg)" stopOpacity={0.01} />
                </linearGradient>
                <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.8" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,.11)" strokeDasharray="3 5" vertical={true} />
              <XAxis dataKey="label" stroke="var(--color-muted-foreground)" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={42} />
              <YAxis yAxisId="kw" stroke="var(--color-muted-foreground)" tick={{ fontSize: 10 }} width={44} />
              <YAxis
                yAxisId="temp"
                orientation="right"
                stroke="rgba(226,232,240,.62)"
                tick={{ fontSize: 10 }}
                width={38}
                domain={["dataMin - 2", "dataMax + 2"]}
                label={{ value: "°C", position: "insideTopRight", fill: "rgba(226,232,240,.55)", fontSize: 10 }}
              />
              <YAxis yAxisId="cum" orientation="right" hide domain={["dataMin", "dataMax"]} />
              {meta > 0 ? <ReferenceLine yAxisId="kw" y={meta} stroke="rgba(255,255,255,.42)" strokeDasharray="6 6" label={{ value: `Meta ${formatNumber(meta, 2)}`, fill: "var(--color-muted-foreground)", fontSize: 10 }} /> : null}
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,.13)", strokeWidth: 1 }}
                contentStyle={{ background: "rgba(8,13,24,.96)", border: "1px solid rgba(148,163,184,.18)", borderRadius: 14, fontSize: 12, boxShadow: "0 20px 60px rgba(0,0,0,.45)" }}
                labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconType="line" />
              <Area yAxisId="kw" type="monotone" dataKey="kW" name="kW" stroke="var(--color-water)" fill="url(#area-kw)" strokeWidth={2} dot={false} connectNulls={false} filter="url(#soft-glow)" />
              <Area yAxisId="kw" type="monotone" dataKey="trh" name="Carga térmica (TR)" stroke="var(--color-efficiency)" fill="url(#area-tr)" strokeWidth={1.9} dot={false} connectNulls={false} filter="url(#soft-glow)" />
              <Area yAxisId="kw" type="monotone" dataKey="kwPerTr" name="kW/TR" stroke="var(--color-esg)" fill="url(#area-kwtr)" strokeWidth={1.65} dot={false} connectNulls={false} />
              <Line yAxisId="kw" type="monotone" dataKey="deltaT" name="Delta-T (°C)" stroke="var(--color-carbon)" strokeWidth={1.55} dot={false} connectNulls={false} />
              <Line yAxisId="temp" type="monotone" dataKey="extTemp" name="Temp. externa (°C)" stroke="rgba(226,232,240,.78)" strokeWidth={1.55} strokeDasharray="4 5" dot={false} connectNulls={false} />
              <Line yAxisId="cum" type="monotone" dataKey="cumulative" name="Consumo acumulado (kWh)" stroke="rgba(226,232,240,.50)" strokeWidth={1.55} strokeDasharray="2 6" dot={false} connectNulls={false} />
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
