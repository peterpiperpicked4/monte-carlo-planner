import React, { memo, useMemo } from 'react';
import { CSS_COLORS, HEX_COLORS } from '../utils/colors';

// Asset class display names and colors - all using design system tokens
const ASSET_INFO = {
  us_large_cap: { name: 'US Large Cap', color: HEX_COLORS.emerald, category: 'equity' },
  us_small_cap: { name: 'US Small Cap', color: HEX_COLORS.emeraldLight, category: 'equity' },
  intl_developed: { name: 'Intl Developed', color: HEX_COLORS.indigo, category: 'equity' },
  emerging_markets: { name: 'Emerging Markets', color: HEX_COLORS.purple, category: 'equity' },
  reits: { name: 'REITs', color: HEX_COLORS.purpleLight, category: 'equity' },
  us_bonds: { name: 'US Bonds', color: HEX_COLORS.gold, category: 'fixed' },
  tips: { name: 'TIPS', color: HEX_COLORS.goldLight, category: 'fixed' },
  high_yield: { name: 'High Yield', color: HEX_COLORS.amber, category: 'fixed' },
  intl_bonds: { name: 'Intl Bonds', color: HEX_COLORS.amberDark, category: 'fixed' },
  cash: { name: 'Cash', color: HEX_COLORS.slate, category: 'fixed' },
};

const AssetAllocation = memo(function AssetAllocation({ allocation, statistics }) {
  // Calculate equity vs fixed income totals
  const { equityTotal, fixedTotal, sortedAllocations } = useMemo(() => {
    if (!allocation) return { equityTotal: 0, fixedTotal: 0, sortedAllocations: [] };

    let equity = 0;
    let fixed = 0;
    const sorted = [];

    Object.entries(allocation).forEach(([key, value]) => {
      if (value > 0.001) { // Only show allocations > 0.1%
        const info = ASSET_INFO[key];
        if (info) {
          sorted.push({ key, value, ...info });
          if (info.category === 'equity') {
            equity += value;
          } else {
            fixed += value;
          }
        }
      }
    });

    // Sort by value descending
    sorted.sort((a, b) => b.value - a.value);

    return { equityTotal: equity, fixedTotal: fixed, sortedAllocations: sorted };
  }, [allocation]);

  if (!allocation || Object.keys(allocation).length === 0) {
    return null;
  }

  return (
    <section
      className="surface-elevated p-6 animate-fade-in-up"
      style={{ animationDelay: '0.15s' }}
      aria-labelledby="allocation-title"
    >
      <div className="flex items-baseline justify-between mb-6">
        <h3 id="allocation-title" className="section-title">Asset Allocation</h3>
        <span className="text-xs uppercase tracking-wider" style={{ color: CSS_COLORS.textMuted }}>
          Based on risk profile
        </span>
      </div>

      {/* Equity/Fixed Summary */}
      <div className="flex gap-4 mb-6">
        <div
          className="flex-1 p-4 rounded-xl text-center"
          style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
        >
          <div className="text-2xl font-mono font-semibold" style={{ color: CSS_COLORS.emerald }}>
            {Math.round(equityTotal * 100)}%
          </div>
          <div className="text-xs uppercase tracking-wider mt-1" style={{ color: CSS_COLORS.textMuted }}>
            Equity
          </div>
        </div>
        <div
          className="flex-1 p-4 rounded-xl text-center"
          style={{ background: 'rgba(212, 164, 74, 0.1)', border: '1px solid rgba(212, 164, 74, 0.2)' }}
        >
          <div className="text-2xl font-mono font-semibold" style={{ color: CSS_COLORS.gold }}>
            {Math.round(fixedTotal * 100)}%
          </div>
          <div className="text-xs uppercase tracking-wider mt-1" style={{ color: CSS_COLORS.textMuted }}>
            Fixed Income
          </div>
        </div>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="mb-6">
        <div
          className="h-8 rounded-lg overflow-hidden flex"
          role="img"
          aria-label={`Portfolio allocation: ${Math.round(equityTotal * 100)}% equity, ${Math.round(fixedTotal * 100)}% fixed income`}
        >
          {sortedAllocations.map((asset) => (
            <div
              key={asset.key}
              style={{
                width: `${asset.value * 100}%`,
                backgroundColor: asset.color,
                minWidth: asset.value > 0.02 ? '2px' : '0'
              }}
              title={`${asset.name}: ${(asset.value * 100).toFixed(1)}%`}
            />
          ))}
        </div>
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {sortedAllocations.map((asset) => (
          <div
            key={asset.key}
            className="flex items-center gap-2 p-2 rounded-lg"
            style={{ background: CSS_COLORS.bgSecondary }}
          >
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: asset.color }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs truncate" style={{ color: CSS_COLORS.textSecondary }}>
                {asset.name}
              </div>
              <div className="text-sm font-mono font-semibold" style={{ color: CSS_COLORS.textPrimary }}>
                {(asset.value * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Portfolio Stats */}
      {statistics && (statistics.expected_return || statistics.volatility) && (
        <div
          className="mt-6 pt-4 border-t flex flex-wrap gap-6"
          style={{ borderColor: CSS_COLORS.border }}
        >
          {statistics.expected_return && (
            <div>
              <span className="text-xs uppercase tracking-wider" style={{ color: CSS_COLORS.textMuted }}>
                Expected Return
              </span>
              <span className="ml-2 font-mono font-semibold" style={{ color: CSS_COLORS.emerald }}>
                {statistics.expected_return}%
              </span>
            </div>
          )}
          {statistics.volatility && (
            <div>
              <span className="text-xs uppercase tracking-wider" style={{ color: CSS_COLORS.textMuted }}>
                Portfolio Volatility
              </span>
              <span className="ml-2 font-mono font-semibold" style={{ color: CSS_COLORS.gold }}>
                {statistics.volatility}%
              </span>
            </div>
          )}
          {statistics.annual_fee && (
            <div>
              <span className="text-xs uppercase tracking-wider" style={{ color: CSS_COLORS.textMuted }}>
                Annual Fees
              </span>
              <span className="ml-2 font-mono font-semibold" style={{ color: CSS_COLORS.textSecondary }}>
                {statistics.annual_fee}%
              </span>
            </div>
          )}
        </div>
      )}

      <p className="text-xs mt-4 pt-4 border-t" style={{ color: CSS_COLORS.textMuted, borderColor: CSS_COLORS.border }}>
        Allocation based on risk tolerance with glide path adjustment. Rebalanced annually. Capital market assumptions from Vanguard, BlackRock, and J.P. Morgan.
      </p>
    </section>
  );
});

export default AssetAllocation;
