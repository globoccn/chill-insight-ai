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
        <button className="rounded-lg border border-border/70 bg-foreground/[0.04] dark:bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground shadow-inner">15 minutos</button>
      </div>

      <div className="chart-stage mt-3 h-[310px] rounded-xl">
        {series.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="area-kw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-water)" stopOpacity={0.46} />
                  <stop offset="30%" stopColor="var(--color-water)" stopOpacity={0.24} />
                  <stop offset="72%" stopColor="var(--color-water)" stopOpacity={0.07} />
                  <stop offset="100%" stopColor="var(--color-water)" stopOpacity={0.00} />
                </linearGradient>
                <linearGradient id="area-tr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-efficiency)" stopOpacity={0.42} />
                  <stop offset="34%" stopColor="var(--color-efficiency)" stopOpacity={0.20} />
                  <stop offset="76%" stopColor="var(--color-efficiency)" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="var(--color-efficiency)" stopOpacity={0.00} />
                </linearGradient>
                <linearGradient id="area-kwtr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-carbon)" stopOpacity={0.34} />
                  <stop offset="46%" stopColor="var(--color-carbon)" stopOpacity={0.13} />
                  <stop offset="100%" stopColor="var(--color-carbon)" stopOpacity={0.00} />
                </linearGradient>
                <linearGradient id="area-deltat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-esg)" stopOpacity={0.20} />
                  <stop offset="100%" stopColor="var(--color-esg)" stopOpacity={0.00} />
                </linearGradient>
                <filter id="deep-glow" x="-45%" y="-45%" width="190%" height="190%">
                  <feGaussianBlur stdDeviation="5.5" result="coloredBlur" />
                  <feColorMatrix in="coloredBlur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .72 0" result="softColor" />
                  <feMerge>
                    <feMergeNode in="softColor" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="line-bloom" x="-35%" y="-35%" width="170%" height="170%">
                  <feGaussianBlur stdDeviation="2.6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 8" vertical={true} />
              <XAxis dataKey="label" stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} interval="preserveStartEnd" minTickGap={42} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} />
              <YAxis yAxisId="kw" stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} width={44} axisLine={{ stroke: "var(--chart-axis-line)" }} tickLine={false} />
              <YAxis
                yAxisId="temp"
                orientation="right"
                stroke="var(--chart-axis)"
                tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
                axisLine={{ stroke: "var(--chart-axis-line)" }}
                tickLine={false}
                width={38}
                domain={["dataMin - 2", "dataMax + 2"]}
                label={{ value: "°C", position: "insideTopRight", fill: "var(--chart-axis)", fontSize: 10 }}
              />
              <YAxis yAxisId="cum" orientation="right" hide domain={["dataMin", "dataMax"]} />
              {meta > 0 ? <ReferenceLine yAxisId="kw" y={meta} stroke="var(--chart-reference)" strokeDasharray="6 6" label={{ value: `Meta ${formatNumber(meta, 2)}`, fill: "var(--color-muted-foreground)", fontSize: 10 }} /> : null}
              <Tooltip
                cursor={{ stroke: "var(--chart-axis-line)", strokeWidth: 1, strokeDasharray: "4 4" }}
                contentStyle={{
                  background: "linear-gradient(180deg, var(--chart-tooltip-bg) 0%, var(--chart-tooltip-bg-2) 100%)",
                  border: "1px solid var(--chart-tooltip-border)",
                  borderRadius: 18,
                  fontSize: 12,
                  boxShadow: "0 24px 80px rgba(0,0,0,.55)",
                  backdropFilter: "blur(10px)",
                  padding: "12px 14px",
                }}
                itemStyle={{ color: "var(--chart-tooltip-text)", paddingTop: 2, paddingBottom: 2 }}
                labelStyle={{ color: "var(--chart-tooltip-label)", fontWeight: 700, marginBottom: 8, letterSpacing: ".02em" }}
                separator="•"
              />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4, color: "var(--chart-axis)" }} iconType="line" />

              {/* Atmospheric area layers */}
              <Area yAxisId="kw" type="monotone" dataKey="kW" name="kW" stroke="transparent" fill="url(#area-kw)" strokeWidth={0} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
              <Area yAxisId="kw" type="monotone" dataKey="trh" name="Carga térmica (TR)" stroke="transparent" fill="url(#area-tr)" strokeWidth={0} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
              <Area yAxisId="kw" type="monotone" dataKey="kwPerTr" name="kW/TR" stroke="transparent" fill="url(#area-kwtr)" strokeWidth={0} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
              <Area yAxisId="kw" type="monotone" dataKey="deltaT" name="Delta-T (°C)" stroke="transparent" fill="url(#area-deltat)" strokeWidth={0} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />

              {/* Hidden bloom strokes behind the real lines */}
              <Line yAxisId="kw" type="monotone" dataKey="kW" stroke="var(--color-water)" strokeWidth={8} strokeOpacity={0.18} dot={false} legendType="none" tooltipType="none" connectNulls={false} filter="url(#deep-glow)" />
              <Line yAxisId="kw" type="monotone" dataKey="trh" stroke="var(--color-efficiency)" strokeWidth={8} strokeOpacity={0.18} dot={false} legendType="none" tooltipType="none" connectNulls={false} filter="url(#deep-glow)" />
              <Line yAxisId="kw" type="monotone" dataKey="kwPerTr" stroke="var(--color-carbon)" strokeWidth={6} strokeOpacity={0.18} dot={false} legendType="none" tooltipType="none" connectNulls={false} filter="url(#deep-glow)" />
              <Line yAxisId="kw" type="monotone" dataKey="deltaT" stroke="var(--color-esg)" strokeWidth={5} strokeOpacity={0.16} dot={false} legendType="none" tooltipType="none" connectNulls={false} filter="url(#deep-glow)" />

              {/* Crisp top strokes */}
              <Line yAxisId="kw" type="monotone" dataKey="kW" name="kW" stroke="var(--color-water)" strokeWidth={2.05} dot={false} activeDot={{ r: 4.5, stroke: "var(--chart-active-dot-stroke)", strokeWidth: 2 }} legendType="none" tooltipType="none" connectNulls={false} filter="url(#line-bloom)" />
              <Line yAxisId="kw" type="monotone" dataKey="trh" name="Carga térmica (TR)" stroke="var(--color-efficiency)" strokeWidth={2.05} dot={false} activeDot={{ r: 4.5, stroke: "var(--chart-active-dot-stroke)", strokeWidth: 2 }} legendType="none" tooltipType="none" connectNulls={false} filter="url(#line-bloom)" />
              <Line yAxisId="kw" type="monotone" dataKey="kwPerTr" name="kW/TR" stroke="var(--color-carbon)" strokeWidth={1.8} dot={false} activeDot={{ r: 4.5, stroke: "var(--chart-active-dot-stroke)", strokeWidth: 2 }} legendType="none" tooltipType="none" connectNulls={false} filter="url(#line-bloom)" />
              <Line yAxisId="kw" type="monotone" dataKey="deltaT" name="Delta-T (°C)" stroke="var(--color-esg)" strokeWidth={1.7} dot={false} activeDot={{ r: 4.5, stroke: "var(--chart-active-dot-stroke)", strokeWidth: 2 }} legendType="none" tooltipType="none" connectNulls={false} filter="url(#line-bloom)" />
              <Line yAxisId="temp" type="monotone" dataKey="extTemp" name="Temp. externa (°C)" stroke="var(--chart-soft-line)" strokeWidth={1.6} strokeDasharray="4 5" dot={false} activeDot={{ r: 4, strokeWidth: 1.5 }} connectNulls={false} />
              <Line yAxisId="cum" type="monotone" dataKey="cumulative" name="Consumo acumulado (kWh)" stroke="var(--chart-soft-line)" strokeWidth={1.75} strokeDasharray="2 7" dot={false} activeDot={{ r: 3.5, strokeWidth: 1.5 }} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            Aguardando dados operacionais.
          </div>
        )}
      </div>
    </div>
  );
}
