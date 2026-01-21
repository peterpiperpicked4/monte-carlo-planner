import React, { memo, useMemo } from 'react';
import { HEX_COLORS, CSS_COLORS, PERCENTILE_STYLES } from '../utils/colors';
import { formatCurrencyTable } from '../utils/format';

// Mobile card component for responsive display
const MobileCard = memo(function MobileCard({ row, style }) {
  return (
    <div
      className="p-4 rounded-xl border mb-3"
      style={{ background: CSS_COLORS.bgSecondary, borderColor: CSS_COLORS.border }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono" style={{ color: CSS_COLORS.textMuted }}>
            Trial {row.trial_number}
          </span>
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: style.bg,
              color: style.text,
              border: `1px solid ${style.border}`
            }}
          >
            {row.percentile}
          </span>
        </div>
        {row.year_money_zero && (
          <span className="text-xs" style={{ color: HEX_COLORS.coral }}>
            Depleted: {row.year_money_zero}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-xs block mb-1" style={{ color: CSS_COLORS.textMuted }}>End of Analysis (Future $)</span>
          <span className="font-mono font-semibold" style={{ color: HEX_COLORS.emerald }}>
            {formatCurrencyTable(row.end_value_future)}
          </span>
        </div>
        <div>
          <span className="text-xs block mb-1" style={{ color: CSS_COLORS.textMuted }}>End of Analysis (Current $)</span>
          <span className="font-mono font-semibold" style={{ color: HEX_COLORS.gold }}>
            {formatCurrencyTable(row.end_value_current)}
          </span>
        </div>
        <div>
          <span className="text-xs block mb-1" style={{ color: CSS_COLORS.textMuted }}>Year 10</span>
          <span className="font-mono" style={{ color: CSS_COLORS.textSecondary }}>
            {formatCurrencyTable(row.year_10)}
          </span>
        </div>
        <div>
          <span className="text-xs block mb-1" style={{ color: CSS_COLORS.textMuted }}>Year 20</span>
          <span className="font-mono" style={{ color: CSS_COLORS.textSecondary }}>
            {formatCurrencyTable(row.year_20)}
          </span>
        </div>
      </div>
    </div>
  );
});

const PercentileTable = memo(function PercentileTable({ data }) {
  // Memoize row styling lookup
  const rowsWithStyles = useMemo(() => {
    if (!data) return [];
    return data.map(row => ({
      ...row,
      style: PERCENTILE_STYLES[row.percentile] || PERCENTILE_STYLES['50th']
    }));
  }, [data]);

  // Calculate summary stats for improved caption
  const summaryStats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const bestOutcome = data.find(r => r.percentile === '99th') || data[0];
    const medianOutcome = data.find(r => r.percentile === '50th') || data[Math.floor(data.length / 2)];
    const worstOutcome = data.find(r => r.percentile === '1st') || data[data.length - 1];
    const depletedCount = data.filter(r => r.year_money_zero).length;

    return {
      bestFinal: bestOutcome?.end_value_future,
      medianFinal: medianOutcome?.end_value_future,
      worstFinal: worstOutcome?.end_value_future,
      depletedCount
    };
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <section
      className="surface-elevated p-6 overflow-hidden animate-fade-in-up"
      style={{ animationDelay: '0.1s' }}
      aria-labelledby="scenario-analysis-title"
    >
      <div className="flex items-baseline justify-between mb-4">
        <h3 id="scenario-analysis-title" className="section-title">Inside the Numbers</h3>
        <span className="text-xs uppercase tracking-wider" style={{ color: CSS_COLORS.textMuted }}>
          {data.length} Key Trials
        </span>
      </div>

      {/* Explanatory text like Edward Jones */}
      <div className="mb-6 space-y-2 text-sm leading-relaxed" style={{ color: CSS_COLORS.textSecondary }}>
        <p>
          In the table below, values are shown for the 99th, 75th, 50th, 25th and 1st percentile trials based on the
          End of Analysis value. For each trial displayed, the corresponding value of assets available to fund expenses
          is illustrated for specific years of the analysis.
        </p>
        <p>
          Although the graph and table help illustrate a general range of results you may expect, neither of them
          reflect the Final Result, your Probability of Success.
        </p>
      </div>

      {/* Mobile View - Cards */}
      <div className="lg:hidden" role="list" aria-label="Scenario outcomes by percentile">
        {rowsWithStyles.map((row, idx) => (
          <MobileCard key={idx} row={row} style={row.style} />
        ))}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden lg:block overflow-x-auto -mx-6 px-6">
        <table className="data-table" role="table">
          <caption className="sr-only">
            Scenario analysis showing portfolio values at different percentile outcomes.
            Best case (99th percentile): {formatCurrencyTable(summaryStats?.bestFinal)}.
            Median outcome: {formatCurrencyTable(summaryStats?.medianFinal)}.
            Worst case (1st percentile): {formatCurrencyTable(summaryStats?.worstFinal)}.
            {summaryStats?.depletedCount > 0 && ` ${summaryStats.depletedCount} scenarios show portfolio depletion.`}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="text-center" style={{ width: '70px' }}>Trial</th>
              <th scope="col" style={{ width: '100px' }}>Percentile</th>
              <th scope="col" className="text-right">Year 5</th>
              <th scope="col" className="text-right">Year 10</th>
              <th scope="col" className="text-right">Year 15</th>
              <th scope="col" className="text-right">Year 20</th>
              <th scope="col" className="text-right">Year 25</th>
              <th scope="col" className="text-right" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                End of Analysis<br /><span className="font-normal text-xs">(Future Dollars)</span>
              </th>
              <th scope="col" className="text-right" style={{ background: 'rgba(212, 164, 74, 0.05)' }}>
                End of Analysis<br /><span className="font-normal text-xs">(Current Dollars)</span>
              </th>
              <th scope="col" className="text-right">Year Money<br />Goes to $0</th>
            </tr>
          </thead>
          <tbody>
            {rowsWithStyles.map((row, idx) => (
              <tr key={idx}>
                <td className="text-center font-mono" style={{ color: CSS_COLORS.textMuted }}>
                  {row.trial_number}
                </td>
                <td>
                  <span
                    className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: row.style.bg,
                      color: row.style.text,
                      border: `1px solid ${row.style.border}`
                    }}
                  >
                    {row.percentile}
                  </span>
                </td>
                <td className="text-right font-mono">{formatCurrencyTable(row.year_5)}</td>
                <td className="text-right font-mono">{formatCurrencyTable(row.year_10)}</td>
                <td className="text-right font-mono">{formatCurrencyTable(row.year_15)}</td>
                <td className="text-right font-mono">{formatCurrencyTable(row.year_20)}</td>
                <td className="text-right font-mono">{formatCurrencyTable(row.year_25)}</td>
                <td
                  className="text-right font-mono font-semibold"
                  style={{ color: HEX_COLORS.emerald, background: 'rgba(16, 185, 129, 0.03)' }}
                >
                  {formatCurrencyTable(row.end_value_future)}
                </td>
                <td
                  className="text-right font-mono font-semibold"
                  style={{ color: HEX_COLORS.gold, background: 'rgba(212, 164, 74, 0.03)' }}
                >
                  {formatCurrencyTable(row.end_value_current)}
                </td>
                <td className="text-right font-mono" style={{ color: row.year_money_zero ? HEX_COLORS.coral : CSS_COLORS.textMuted }}>
                  {row.year_money_zero || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs mt-4 pt-4 border-t" style={{ color: CSS_COLORS.textMuted, borderColor: CSS_COLORS.border }}>
        Trial numbers correspond to ranked simulation paths. "Current Dollars" adjusts for projected inflation to show purchasing power in today's terms.
      </p>
    </section>
  );
});

export default PercentileTable;
