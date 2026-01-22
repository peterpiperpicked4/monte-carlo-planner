import React, { useMemo, useState, useCallback, memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { HEX_COLORS, CSS_COLORS } from '../utils/colors';
import { formatCurrency } from '../utils/format';

const CustomTooltip = memo(function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className="p-4 rounded-lg border backdrop-blur-sm"
        style={{
          background: 'rgba(17, 17, 20, 0.95)',
          borderColor: CSS_COLORS.border
        }}
        role="tooltip"
        aria-live="polite"
      >
        <p className="font-display text-lg mb-3" style={{ color: CSS_COLORS.textPrimary }}>{label}</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-6">
            <span style={{ color: HEX_COLORS.emerald }}>95th Percentile</span>
            <span className="font-mono" style={{ color: HEX_COLORS.emerald }}>{formatCurrency(data.p95)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span style={{ color: HEX_COLORS.emeraldLight }}>75th Percentile</span>
            <span className="font-mono" style={{ color: HEX_COLORS.emeraldLight }}>{formatCurrency(data.p75)}</span>
          </div>
          <div className="flex justify-between gap-6 py-1 border-y" style={{ borderColor: CSS_COLORS.border }}>
            <span style={{ color: CSS_COLORS.textPrimary }}>Median</span>
            <span className="font-mono font-semibold" style={{ color: CSS_COLORS.textPrimary }}>{formatCurrency(data.p50)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span style={{ color: HEX_COLORS.gold }}>25th Percentile</span>
            <span className="font-mono" style={{ color: HEX_COLORS.gold }}>{formatCurrency(data.p25)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span style={{ color: HEX_COLORS.coral }}>5th Percentile</span>
            <span className="font-mono" style={{ color: HEX_COLORS.coral }}>{formatCurrency(data.p5)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
});

const FanChart = memo(function FanChart({ paths, years, milestones = [] }) {
  const [showDataTable, setShowDataTable] = useState(false);

  const chartData = useMemo(() => {
    if (!paths || !years || paths.length === 0) return [];

    return years.map((year, i) => {
      const values = paths.map(p => p[i]).filter(v => v !== undefined && v !== null && isFinite(v));
      if (values.length === 0) return { year, p5: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 };

      const sorted = [...values].sort((a, b) => a - b);

      const getPercentile = (arr, p) => {
        const index = Math.floor(arr.length * p / 100);
        return arr[Math.min(index, arr.length - 1)] || 0;
      };

      return {
        year,
        p5: getPercentile(sorted, 5),
        p10: getPercentile(sorted, 10),
        p25: getPercentile(sorted, 25),
        p50: getPercentile(sorted, 50),
        p75: getPercentile(sorted, 75),
        p90: getPercentile(sorted, 90),
        p95: getPercentile(sorted, 95),
      };
    });
  }, [paths, years]);

  const toggleDataTable = useCallback(() => {
    setShowDataTable(prev => !prev);
  }, []);

  if (chartData.length === 0) {
    return (
      <div className="surface-elevated p-8 h-96 flex items-center justify-center">
        <p style={{ color: CSS_COLORS.textMuted }}>Run a simulation to see results</p>
      </div>
    );
  }

  // Calculate summary for improved caption
  const startYear = years[0];
  const endYear = years[years.length - 1];
  const finalMedian = chartData[chartData.length - 1]?.p50;
  const final5th = chartData[chartData.length - 1]?.p5;
  const final95th = chartData[chartData.length - 1]?.p95;

  return (
    <div className="surface-elevated p-6 animate-fade-in-up">
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="section-title">Wealth Projection</h3>
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-wider" style={{ color: CSS_COLORS.textMuted }}>
            {paths.length} simulated outcomes
          </span>
          <button
            onClick={toggleDataTable}
            className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
            style={{
              color: CSS_COLORS.emerald,
              background: showDataTable ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              border: `1px solid ${CSS_COLORS.emerald}`
            }}
            aria-expanded={showDataTable}
            aria-controls="chart-data-table"
          >
            {showDataTable ? 'Hide Data' : 'Show Data'}
          </button>
        </div>
      </div>

      {/* Accessible data table alternative */}
      {showDataTable && (
        <div
          id="chart-data-table"
          className="mb-6 overflow-x-auto"
          role="region"
          aria-label="Wealth projection data table"
        >
          <table className="data-table text-sm">
            <caption className="sr-only">
              Wealth projection percentiles from {startYear} to {endYear}.
              Shows portfolio values at 5th, 25th, 50th (median), 75th, and 95th percentiles.
              Final median value: {formatCurrency(finalMedian)}.
            </caption>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col" className="text-right">5th %ile</th>
                <th scope="col" className="text-right">25th %ile</th>
                <th scope="col" className="text-right">Median</th>
                <th scope="col" className="text-right">75th %ile</th>
                <th scope="col" className="text-right">95th %ile</th>
              </tr>
            </thead>
            <tbody>
              {chartData.filter((_, i) => i % 5 === 0 || i === chartData.length - 1).map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td className="text-right" style={{ color: HEX_COLORS.coral }}>{formatCurrency(row.p5)}</td>
                  <td className="text-right" style={{ color: HEX_COLORS.gold }}>{formatCurrency(row.p25)}</td>
                  <td className="text-right font-semibold" style={{ color: CSS_COLORS.textPrimary }}>{formatCurrency(row.p50)}</td>
                  <td className="text-right" style={{ color: HEX_COLORS.emeraldLight }}>{formatCurrency(row.p75)}</td>
                  <td className="text-right" style={{ color: HEX_COLORS.emerald }}>{formatCurrency(row.p95)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Responsive chart height: smaller on mobile, taller on desktop */}
      <div
        className="h-60 md:h-80"
        role="img"
        aria-label={`Wealth projection chart showing portfolio values from ${startYear} to ${endYear}. Median final value: ${formatCurrency(finalMedian)}. Range from ${formatCurrency(final5th)} (5th percentile) to ${formatCurrency(final95th)} (95th percentile).`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={HEX_COLORS.emerald} stopOpacity={0.15} />
                <stop offset="100%" stopColor={HEX_COLORS.emerald} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />

            <XAxis
              dataKey="year"
              stroke="rgba(255,255,255,0.2)"
              tick={{ fill: HEX_COLORS.textMuted, fontSize: 11, fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              stroke="rgba(255,255,255,0.2)"
              tick={{ fill: HEX_COLORS.textMuted, fontSize: 11, fontFamily: 'JetBrains Mono' }}
              tickFormatter={formatCurrency}
              tickLine={false}
              axisLine={false}
              width={70}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Area fill between 25-75 percentile */}
            <Area
              dataKey="p75"
              stroke="none"
              fill="url(#areaGradient)"
              isAnimationActive={true}
            />

            {/* Percentile lines */}
            <Line
              dataKey="p95"
              stroke={HEX_COLORS.emerald}
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              strokeOpacity={0.6}
            />
            <Line
              dataKey="p75"
              stroke={HEX_COLORS.emeraldLight}
              strokeWidth={1}
              strokeDasharray="2 2"
              dot={false}
              strokeOpacity={0.5}
            />
            <Line
              dataKey="p50"
              stroke={HEX_COLORS.textPrimary}
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              dataKey="p25"
              stroke={HEX_COLORS.gold}
              strokeWidth={1}
              strokeDasharray="2 2"
              dot={false}
              strokeOpacity={0.5}
            />
            <Line
              dataKey="p5"
              stroke={HEX_COLORS.coral}
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              strokeOpacity={0.6}
            />

            {/* Milestone markers */}
            {milestones.map((milestone, idx) => (
              <ReferenceLine
                key={`milestone-${idx}`}
                x={milestone.year}
                stroke={HEX_COLORS.purple}
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: milestone.name,
                  position: 'top',
                  fill: HEX_COLORS.purple,
                  fontSize: 11,
                  fontWeight: 500
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Caption */}
      <p className="text-xs text-center mt-4" style={{ color: CSS_COLORS.textMuted }}>
        Hover over the chart to see detailed values at each year. Toggle "Show Data" for a tabular view.
      </p>

      {/* Legend - 44px minimum touch targets with visual dash patterns matching chart */}
      <div
        className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t"
        style={{ borderColor: CSS_COLORS.border }}
        role="list"
        aria-label="Chart legend"
      >
        {/* Median - solid line */}
        <div className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3" role="listitem">
          <div className="w-6 h-[3px] rounded" style={{ backgroundColor: HEX_COLORS.textPrimary }} aria-hidden="true"></div>
          <span className="text-xs" style={{ color: CSS_COLORS.textMuted }}>Median</span>
        </div>
        {/* 95th percentile - dashed (4 4) */}
        <div className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3" role="listitem">
          <svg width="24" height="3" aria-hidden="true">
            <line x1="0" y1="1.5" x2="24" y2="1.5" stroke={HEX_COLORS.emerald} strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.6" />
          </svg>
          <span className="text-xs" style={{ color: CSS_COLORS.textMuted }}>95th %ile</span>
        </div>
        {/* 75th percentile - dashed (2 2) */}
        <div className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3" role="listitem">
          <svg width="24" height="3" aria-hidden="true">
            <line x1="0" y1="1.5" x2="24" y2="1.5" stroke={HEX_COLORS.emeraldLight} strokeWidth="2" strokeDasharray="2 2" strokeOpacity="0.5" />
          </svg>
          <span className="text-xs" style={{ color: CSS_COLORS.textMuted }}>75th %ile</span>
        </div>
        {/* 25th percentile - dashed (2 2) */}
        <div className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3" role="listitem">
          <svg width="24" height="3" aria-hidden="true">
            <line x1="0" y1="1.5" x2="24" y2="1.5" stroke={HEX_COLORS.gold} strokeWidth="2" strokeDasharray="2 2" strokeOpacity="0.5" />
          </svg>
          <span className="text-xs" style={{ color: CSS_COLORS.textMuted }}>25th %ile</span>
        </div>
        {/* 5th percentile - dashed (4 4) */}
        <div className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3" role="listitem">
          <svg width="24" height="3" aria-hidden="true">
            <line x1="0" y1="1.5" x2="24" y2="1.5" stroke={HEX_COLORS.coral} strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.6" />
          </svg>
          <span className="text-xs" style={{ color: CSS_COLORS.textMuted }}>5th %ile</span>
        </div>
      </div>
    </div>
  );
});

export default FanChart;
