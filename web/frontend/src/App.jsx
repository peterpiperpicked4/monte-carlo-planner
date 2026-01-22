import React, { useState, useCallback, useMemo } from 'react';
import { TrendingUp, Loader2, Sparkles } from 'lucide-react';
import InputForm from './components/InputForm';
import FanChart from './components/FanChart';
import SuccessGauge from './components/SuccessGauge';
import PercentileTable from './components/PercentileTable';
import AssetAllocation from './components/AssetAllocation';
import AIInsights from './components/AIInsights';
import AIDiscovery from './components/AIDiscovery';
import ErrorBoundary from './components/ErrorBoundary';
import { CSS_COLORS } from './utils/colors';
import { formatCurrency } from './utils/format';

// API URL - uses environment variable in production, proxy in development
const API_URL = import.meta.env.VITE_API_URL || '';

function App() {
  const [results, setResults] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [showAIDiscovery, setShowAIDiscovery] = useState(false);
  const [formData, setFormData] = useState({});

  // Callback for AI Discovery to update form data
  const handleUpdateProfile = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSubmit = useCallback(async (payload) => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setAnalysis(null);

    try {
      const response = await fetch(`${API_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Simulation failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);

      setIsAnalyzing(true);
      try {
        const analysisResponse = await fetch(`${API_URL}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: payload.profile,
            simulation_results: {
              success_probability: data.success_probability,
              confidence_zone: data.confidence_zone,
              statistics: data.statistics,
              percentiles: {
                p5: data.statistics.var_95,
                p95: data.percentile_table[0]?.end_value_future
              },
              num_simulations: payload.params.num_simulations
            }
          })
        });

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          setAnalysis(analysisData);
        }
      } catch {
        // Silently fail for analysis - it's optional
      } finally {
        setIsAnalyzing(false);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoize success rate color
  const successRateColor = useMemo(() => {
    if (!results) return CSS_COLORS.emerald;
    if (results.success_probability >= 0.9) return CSS_COLORS.emerald;
    if (results.success_probability >= 0.7) return CSS_COLORS.gold;
    return CSS_COLORS.coral;
  }, [results]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen" style={{ background: CSS_COLORS.bgPrimary }}>
        {/* Skip Link for Keyboard Navigation */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Header */}
        <header
          className="sticky top-0 z-50 backdrop-blur-xl border-b"
          style={{
            background: 'rgba(10, 10, 12, 0.8)',
            borderColor: CSS_COLORS.border
          }}
        >
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-xl blur-lg opacity-50"
                    style={{ background: 'var(--gradient-emerald)' }}
                    aria-hidden="true"
                  />
                  <div
                    className="relative w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--gradient-emerald)' }}
                    aria-hidden="true"
                  >
                    <TrendingUp className="w-5 h-5" style={{ color: CSS_COLORS.bgPrimary }} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <h1 className="font-display text-xl font-medium tracking-tight" style={{ color: CSS_COLORS.textPrimary }}>
                    Monte Carlo
                  </h1>
                  <p className="text-xs tracking-wide" style={{ color: CSS_COLORS.textMuted }}>
                    Financial Planning
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* AI Discovery Toggle */}
                <button
                  onClick={() => setShowAIDiscovery(!showAIDiscovery)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)] ${showAIDiscovery ? 'ring-2 ring-[var(--emerald)]' : ''}`}
                  style={{
                    background: showAIDiscovery ? 'rgba(16, 185, 129, 0.15)' : CSS_COLORS.bgHover,
                    color: showAIDiscovery ? CSS_COLORS.emerald : CSS_COLORS.textSecondary,
                    border: `1px solid ${showAIDiscovery ? 'rgba(16, 185, 129, 0.3)' : CSS_COLORS.border}`
                  }}
                  aria-pressed={showAIDiscovery}
                  aria-label={showAIDiscovery ? 'Hide AI Discovery' : 'Show AI Discovery'}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">AI Discovery</span>
                </button>

                {results && (
                  <div className="hidden md:flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider mb-1" style={{ color: CSS_COLORS.textMuted }}>
                      Success Rate
                    </div>
                    <div
                      className="font-mono text-2xl font-semibold"
                      style={{ color: successRateColor }}
                      aria-live="polite"
                    >
                      {Math.round(results.success_probability * 100)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider mb-1" style={{ color: CSS_COLORS.textMuted }}>
                      Median Outcome
                    </div>
                    <div className="font-mono text-2xl font-semibold" style={{ color: CSS_COLORS.textPrimary }}>
                      {formatCurrency(results.statistics.median, { millionDecimals: 2 })}
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main id="main-content" className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Input Form */}
            <aside className="lg:col-span-3" aria-label="Simulation configuration">
              <div className="sticky top-24">
                <div className="surface-elevated p-6 glow-border">
                  <h2
                    className="text-xs font-semibold uppercase tracking-widest mb-6"
                    style={{ color: CSS_COLORS.textMuted }}
                  >
                    Configuration
                  </h2>
                  <InputForm onSubmit={handleSubmit} isLoading={isLoading} />
                </div>
              </div>
            </aside>

            {/* Right Column - Results */}
            <div className="lg:col-span-9 space-y-8">
              {error && (
                <div
                  className="p-4 rounded-xl border animate-fade-in"
                  style={{
                    background: 'rgba(248, 113, 113, 0.1)',
                    borderColor: 'rgba(248, 113, 113, 0.3)',
                    color: CSS_COLORS.coral
                  }}
                  role="alert"
                >
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* AI Discovery Panel */}
              {showAIDiscovery && (
                <AIDiscovery
                  onUpdateProfile={handleUpdateProfile}
                  formData={formData}
                />
              )}

              {!results && !isLoading && !showAIDiscovery && (
                <div
                  className="surface-elevated text-center py-24 animate-fade-in"
                >
                  <div
                    className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
                    style={{ background: CSS_COLORS.bgHover }}
                    aria-hidden="true"
                  >
                    <TrendingUp className="w-10 h-10" style={{ color: CSS_COLORS.textMuted }} strokeWidth={1} />
                  </div>
                  <h2 className="font-display text-2xl mb-3" style={{ color: CSS_COLORS.textPrimary }}>
                    Ready to simulate
                  </h2>
                  <p className="max-w-md mx-auto" style={{ color: CSS_COLORS.textMuted }}>
                    Configure your financial profile and run a Monte Carlo simulation to visualize thousands of possible outcomes.
                  </p>
                </div>
              )}

              {isLoading && (
                <div
                  className="surface-elevated text-center py-24 animate-fade-in"
                  role="status"
                  aria-live="polite"
                >
                  <div
                    className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 animate-pulse-ring"
                    style={{ background: 'rgba(16, 185, 129, 0.1)' }}
                    aria-hidden="true"
                  >
                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: CSS_COLORS.emerald }} />
                  </div>
                  <h2 className="font-display text-2xl mb-3" style={{ color: CSS_COLORS.textPrimary }}>
                    Running simulation
                  </h2>
                  <p style={{ color: CSS_COLORS.textMuted }}>
                    Analyzing thousands of potential outcomes...
                  </p>
                  <span className="sr-only">Simulation in progress, please wait...</span>
                </div>
              )}

              {results && (
                <div className="space-y-8 stagger-children">
                  {/* Hero Stats Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Success Gauge - Takes 2 columns */}
                    <div className="lg:col-span-2 surface-elevated overflow-hidden">
                      <SuccessGauge
                        probability={results.success_probability}
                        confidenceZone={results.confidence_zone}
                      />
                    </div>

                    {/* Key Stats */}
                    <div className="lg:col-span-3 grid grid-cols-2 gap-4">
                      <div className="surface-elevated p-6">
                        <div className="text-xs uppercase tracking-wider mb-2" style={{ color: CSS_COLORS.textMuted }}>
                          Mean Outcome
                        </div>
                        <div className="font-mono text-3xl font-semibold" style={{ color: CSS_COLORS.textPrimary }}>
                          {formatCurrency(results.statistics.mean, { millionDecimals: 2 })}
                        </div>
                        <div className="mt-2 text-xs" style={{ color: CSS_COLORS.textMuted }}>
                          Expected final value
                        </div>
                      </div>

                      <div className="surface-elevated p-6">
                        <div className="text-xs uppercase tracking-wider mb-2" style={{ color: CSS_COLORS.textMuted }}>
                          Median Outcome
                        </div>
                        <div className="font-mono text-3xl font-semibold" style={{ color: CSS_COLORS.emerald }}>
                          {formatCurrency(results.statistics.median, { millionDecimals: 2 })}
                        </div>
                        <div className="mt-2 text-xs" style={{ color: CSS_COLORS.textMuted }}>
                          50th percentile
                        </div>
                      </div>

                      <div className="surface-elevated p-6">
                        <div className="text-xs uppercase tracking-wider mb-2" style={{ color: CSS_COLORS.textMuted }}>
                          Downside Risk
                        </div>
                        <div className="font-mono text-3xl font-semibold" style={{ color: CSS_COLORS.coral }}>
                          {formatCurrency(results.statistics.var_95, { millionDecimals: 2 })}
                        </div>
                        <div className="mt-2 text-xs" style={{ color: CSS_COLORS.textMuted }}>
                          5th percentile
                        </div>
                      </div>

                      <div className="surface-elevated p-6">
                        <div className="text-xs uppercase tracking-wider mb-2" style={{ color: CSS_COLORS.textMuted }}>
                          Volatility
                        </div>
                        <div className="font-mono text-3xl font-semibold" style={{ color: CSS_COLORS.gold }}>
                          {formatCurrency(results.statistics.std, { millionDecimals: 2 })}
                        </div>
                        <div className="mt-2 text-xs" style={{ color: CSS_COLORS.textMuted }}>
                          Standard deviation
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fan Chart */}
                  <FanChart
                    paths={results.paths}
                    years={results.years}
                    milestones={results.milestones}
                  />

                  {/* Asset Allocation */}
                  <AssetAllocation
                    allocation={results.allocation}
                    statistics={results.statistics}
                  />

                  {/* Percentile Table */}
                  <PercentileTable data={results.percentile_table} />

                  {/* AI Insights */}
                  <AIInsights analysis={analysis} isLoading={isAnalyzing} />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t mt-16" style={{ borderColor: CSS_COLORS.border }}>
          <div className="max-w-[1600px] mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: 'var(--gradient-emerald)' }}
                  aria-hidden="true"
                >
                  <TrendingUp className="w-3 h-3" style={{ color: CSS_COLORS.bgPrimary }} strokeWidth={2.5} />
                </div>
                <span className="font-display text-sm" style={{ color: CSS_COLORS.textSecondary }}>
                  Monte Carlo Financial Planning
                </span>
              </div>
              <p className="text-xs text-center md:text-right" style={{ color: CSS_COLORS.textMuted }}>
                Simulations are for educational purposes only. Consult a qualified financial advisor for personalized advice.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
