/**
 * Shared color constants for the application.
 *
 * CSS_COLORS: Use in React style objects where CSS variables work
 * HEX_COLORS: Use in SVG fills/strokes and libraries that need hex values
 */

// CSS variable references - use these in React style objects
export const CSS_COLORS = {
  emerald: 'var(--emerald)',
  emeraldLight: 'var(--emerald-light)',
  emeraldGlow: 'var(--emerald-glow)',
  emeraldMuted: 'var(--emerald-muted)',
  gold: 'var(--gold)',
  goldMuted: 'var(--gold-muted)',
  coral: 'var(--coral)',
  coralMuted: 'var(--coral-muted)',
  purple: 'var(--purple)',
  purpleLight: 'var(--purple-light)',
  indigo: 'var(--indigo)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  bgPrimary: 'var(--bg-primary)',
  bgSecondary: 'var(--bg-secondary)',
  bgElevated: 'var(--bg-elevated)',
  bgHover: 'var(--bg-hover)',
  border: 'var(--border)',
  borderHover: 'var(--border-hover)',
};

// Hex values - use these for SVG fills, Recharts, and other contexts that need raw hex
export const HEX_COLORS = {
  emerald: '#10b981',
  emeraldLight: '#34d399',
  emeraldGlow: '#34d399',
  emeraldMuted: '#065f46',
  gold: '#d4a44a',
  goldLight: '#fbbf24',    // Lighter gold for TIPS
  goldMuted: '#92702f',
  amber: '#f59e0b',        // Amber for High Yield
  amberDark: '#d97706',    // Darker amber for Intl Bonds
  coral: '#f87171',
  coralMuted: '#991b1b',
  purple: '#8b5cf6',
  purpleLight: '#a78bfa',
  indigo: '#6366f1',
  slate: '#64748b',        // Tinted gray (blue-tinted) for Cash - not pure gray
  textPrimary: '#f4f4f5',
  textSecondary: '#a1a1aa',
  textMuted: '#8b8b94',
  bgPrimary: '#0a0a0c',
  bgSecondary: '#111114',
  bgElevated: '#18181c',
  bgHover: '#1f1f24',
  border: 'rgba(255, 255, 255, 0.06)',
  borderHover: 'rgba(255, 255, 255, 0.12)',
};

// Percentile styling - used across multiple components
export const PERCENTILE_STYLES = {
  '99th': {
    bg: 'rgba(16, 185, 129, 0.15)',
    text: HEX_COLORS.emerald,
    cssText: CSS_COLORS.emerald,
    border: 'rgba(16, 185, 129, 0.3)'
  },
  '95th': {
    bg: 'rgba(16, 185, 129, 0.12)',
    text: HEX_COLORS.emerald,
    cssText: CSS_COLORS.emerald,
    border: 'rgba(16, 185, 129, 0.25)'
  },
  '75th': {
    bg: 'rgba(52, 211, 153, 0.1)',
    text: HEX_COLORS.emeraldLight,
    cssText: CSS_COLORS.emeraldLight,
    border: 'rgba(52, 211, 153, 0.2)'
  },
  '50th': {
    bg: 'rgba(255, 255, 255, 0.05)',
    text: HEX_COLORS.textPrimary,
    cssText: CSS_COLORS.textPrimary,
    border: 'rgba(255, 255, 255, 0.1)'
  },
  '25th': {
    bg: 'rgba(212, 164, 74, 0.1)',
    text: HEX_COLORS.gold,
    cssText: CSS_COLORS.gold,
    border: 'rgba(212, 164, 74, 0.2)'
  },
  '5th': {
    bg: 'rgba(248, 113, 113, 0.12)',
    text: HEX_COLORS.coral,
    cssText: CSS_COLORS.coral,
    border: 'rgba(248, 113, 113, 0.25)'
  },
  '1st': {
    bg: 'rgba(248, 113, 113, 0.1)',
    text: HEX_COLORS.coral,
    cssText: CSS_COLORS.coral,
    border: 'rgba(248, 113, 113, 0.2)'
  }
};

// Purple-themed summary box styles
export const PURPLE_SUMMARY_STYLES = {
  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
  border: 'rgba(139, 92, 246, 0.2)',
  glow: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)'
};

// Impact styles for AI recommendations
export const IMPACT_STYLES = {
  high: {
    bg: 'rgba(16, 185, 129, 0.1)',
    text: CSS_COLORS.emerald,
    border: 'rgba(16, 185, 129, 0.2)'
  },
  medium: {
    bg: 'rgba(212, 164, 74, 0.1)',
    text: CSS_COLORS.gold,
    border: 'rgba(212, 164, 74, 0.2)'
  },
  low: {
    bg: 'rgba(139, 139, 148, 0.1)',
    text: CSS_COLORS.textMuted,
    border: 'rgba(139, 139, 148, 0.2)'
  }
};

// Success gauge status thresholds
export const getSuccessStatus = (probability) => {
  if (probability >= 0.9) return {
    color: CSS_COLORS.emerald,
    colorHex: HEX_COLORS.emerald,
    glow: 'rgba(16, 185, 129, 0.3)',
    label: 'Excellent',
    sublabel: 'Above confidence threshold'
  };
  if (probability >= 0.7) return {
    color: CSS_COLORS.gold,
    colorHex: HEX_COLORS.gold,
    glow: 'rgba(212, 164, 74, 0.3)',
    label: 'On Track',
    sublabel: 'Within confidence zone'
  };
  return {
    color: CSS_COLORS.coral,
    colorHex: HEX_COLORS.coral,
    glow: 'rgba(248, 113, 113, 0.3)',
    label: 'Needs Attention',
    sublabel: 'Below confidence threshold'
  };
};
