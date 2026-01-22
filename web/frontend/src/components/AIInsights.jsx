import React, { memo, useMemo } from 'react';
import { Sparkles, TrendingUp, Shield, Wallet, AlertTriangle } from 'lucide-react';
import { CSS_COLORS, IMPACT_STYLES, PURPLE_SUMMARY_STYLES } from '../utils/colors';

const categoryIcons = {
  savings: Wallet,
  retirement: TrendingUp,
  risk: Shield,
  debt: AlertTriangle
};

const RecommendationCard = memo(function RecommendationCard({ recommendation, index }) {
  const Icon = categoryIcons[recommendation.category] || Wallet;
  const style = IMPACT_STYLES[recommendation.impact] || IMPACT_STYLES.medium;

  return (
    <article
      className="group relative p-5 rounded-xl border transition-all duration-300 hover:border-[var(--border-hover)] focus-within:ring-2 focus-within:ring-[var(--emerald)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--bg-elevated)]"
      style={{
        background: CSS_COLORS.bgElevated,
        borderColor: CSS_COLORS.border,
        animationDelay: `${0.1 + index * 0.05}s`
      }}
    >
      <div className="flex gap-4">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: style.bg }}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5" style={{ color: style.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="font-medium" style={{ color: CSS_COLORS.textPrimary }}>
              {recommendation.title}
            </h4>
            <span
              className="flex-shrink-0 text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
              style={{
                background: style.bg,
                color: style.text,
                border: `1px solid ${style.border}`
              }}
              aria-label={`Impact: ${recommendation.impact}`}
            >
              {recommendation.impact}
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: CSS_COLORS.textSecondary }}>
            {recommendation.description}
          </p>
        </div>
      </div>
    </article>
  );
});

const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="surface-elevated p-6" role="status" aria-label="Loading AI analysis">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg skeleton" aria-hidden="true"></div>
        <div className="h-6 w-32 skeleton rounded" aria-hidden="true"></div>
      </div>
      <div className="space-y-4">
        <div className="h-4 skeleton rounded w-3/4" aria-hidden="true"></div>
        <div className="h-4 skeleton rounded w-full" aria-hidden="true"></div>
        <div className="h-4 skeleton rounded w-5/6" aria-hidden="true"></div>
        <div className="h-24 skeleton rounded mt-6" aria-hidden="true"></div>
        <div className="h-24 skeleton rounded" aria-hidden="true"></div>
      </div>
      <span className="sr-only">Loading AI analysis, please wait...</span>
    </div>
  );
});

const AIInsights = memo(function AIInsights({ analysis, isLoading }) {
  // Memoize confidence score
  const confidencePercent = useMemo(() => {
    return Math.round((analysis?.confidence_score || 0.85) * 100);
  }, [analysis?.confidence_score]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!analysis) return null;

  return (
    <section
      className="surface-elevated p-6 animate-fade-in-up"
      style={{ animationDelay: '0.2s' }}
      aria-labelledby="ai-insights-title"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--gradient-purple)' }}
          aria-hidden="true"
        >
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 id="ai-insights-title" className="section-title mb-0">AI Analysis</h3>
          <span className="text-xs" style={{ color: CSS_COLORS.textMuted }}>Powered by Claude</span>
        </div>
      </div>

      {/* Summary */}
      <div
        className="relative p-5 rounded-xl mb-6 overflow-hidden"
        style={{
          background: PURPLE_SUMMARY_STYLES.background,
          border: `1px solid ${PURPLE_SUMMARY_STYLES.border}`
        }}
      >
        {/* Decorative element */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20"
          style={{ background: PURPLE_SUMMARY_STYLES.glow }}
          aria-hidden="true"
        />

        <p className="relative text-base leading-relaxed" style={{ color: CSS_COLORS.textPrimary }}>
          {analysis.summary}
        </p>
      </div>

      {/* Recommendations */}
      <div className="mb-6">
        <h4
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: CSS_COLORS.textMuted }}
          id="recommendations-heading"
        >
          Recommendations
        </h4>
        <div
          className="space-y-3 stagger-children"
          role="list"
          aria-labelledby="recommendations-heading"
        >
          {analysis.recommendations.map((rec, idx) => (
            <RecommendationCard key={idx} recommendation={rec} index={idx} />
          ))}
        </div>
      </div>

      {/* Risk Assessment */}
      <div
        className="p-5 rounded-xl"
        style={{
          background: CSS_COLORS.bgSecondary,
          border: `1px solid ${CSS_COLORS.border}`
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4" style={{ color: CSS_COLORS.textMuted }} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: CSS_COLORS.textMuted }}>
            Risk Profile
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: CSS_COLORS.textSecondary }}>
          {analysis.risk_assessment}
        </p>
      </div>

      {/* Confidence indicator */}
      <div
        className="flex items-center justify-end gap-2 mt-4 pt-4 border-t"
        style={{ borderColor: CSS_COLORS.border }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: CSS_COLORS.emerald }}
          aria-hidden="true"
        ></div>
        <span className="text-xs" style={{ color: CSS_COLORS.textMuted }}>
          Analysis confidence: {confidencePercent}%
        </span>
      </div>
    </section>
  );
});

export default AIInsights;
