import React, { useEffect, useState, useMemo, memo } from 'react';
import { CSS_COLORS, getSuccessStatus } from '../utils/colors';

const SuccessGauge = memo(function SuccessGauge({ probability, confidenceZone }) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const percentage = Math.round(probability * 100);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Use requestAnimationFrame for smoother animation, respecting reduced motion
  useEffect(() => {
    // If reduced motion is preferred, skip animation and show final value immediately
    if (prefersReducedMotion) {
      setAnimatedValue(percentage);
      return;
    }

    const duration = 1500;
    const startTime = performance.now();
    let rafId;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(easeOut * percentage);

      setAnimatedValue(currentValue);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [percentage, prefersReducedMotion]);

  // Memoize status calculation using shared utility
  const status = useMemo(() => getSuccessStatus(probability), [probability]);

  // Memoize arc calculations
  // Arc spans 270 degrees (0.75 of circle). strokeDashoffset hides part of the stroke.
  // offset = 0 shows full arc, offset = 0.75*circ shows nothing
  const { circumference, strokeDashoffset } = useMemo(() => {
    const circ = 2 * Math.PI * 120;
    return {
      circumference: circ,
      strokeDashoffset: (1 - probability) * 0.75 * circ
    };
  }, [probability]);

  // Memoize tick marks - calculated in rotated coordinate space
  // The SVG is rotated -135deg, so we calculate ticks to match
  const tickMarks = useMemo(() => {
    return [0, 25, 50, 75, 100].map((tick) => {
      // Start at 135deg (bottom-left in normal coords) and span 270deg clockwise
      const angle = 135 + (tick / 100) * 270;
      const angleRad = (angle * Math.PI) / 180;
      const cosAngle = Math.cos(angleRad);
      const sinAngle = Math.sin(angleRad);
      const x1 = Math.round((130 + 100 * cosAngle) * 100) / 100;
      const y1 = Math.round((130 + 100 * sinAngle) * 100) / 100;
      const x2 = Math.round((130 + 110 * cosAngle) * 100) / 100;
      const y2 = Math.round((130 + 110 * sinAngle) * 100) / 100;
      return { tick, x1, y1, x2, y2 };
    });
  }, []);

  return (
    <div
      className="relative flex flex-col items-center justify-center py-8"
      role="img"
      aria-label={`Success probability gauge showing ${percentage}% - ${status.label}`}
    >
      {/* Pulsing background rings */}
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div
          className="absolute w-56 sm:w-64 md:w-72 aspect-square rounded-full animate-pulse-ring"
          style={{
            border: `1px solid ${status.color}`,
            opacity: 0.1
          }}
        />
        <div
          className="absolute w-64 sm:w-72 md:w-80 aspect-square rounded-full animate-pulse-ring"
          style={{
            border: `1px solid ${status.color}`,
            opacity: 0.05,
            animationDelay: '0.5s'
          }}
        />
        <div
          className="absolute w-72 sm:w-80 md:w-[22rem] aspect-square rounded-full animate-pulse-ring"
          style={{
            border: `1px solid ${status.color}`,
            opacity: 0.025,
            animationDelay: '1s'
          }}
        />
      </div>

      {/* SVG Gauge */}
      <div className="relative w-48 sm:w-56 md:w-64 aspect-square flex items-center justify-center" aria-hidden="true">
        <svg viewBox="0 0 260 260" className="w-full h-full">
          {/* Background track */}
          <circle
            cx="130"
            cy="130"
            r="120"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(135 130 130)"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={CSS_COLORS.coral} />
              <stop offset="50%" stopColor={CSS_COLORS.gold} />
              <stop offset="100%" stopColor={CSS_COLORS.emerald} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Progress arc */}
          <circle
            cx="130"
            cy="130"
            r="120"
            fill="none"
            stroke={status.colorHex}
            strokeWidth="8"
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#glow)"
            transform="rotate(135 130 130)"
            style={{
              transition: prefersReducedMotion ? 'none' : 'stroke-dashoffset 1.5s ease-out, stroke 0.3s ease',
            }}
          />

          {/* Tick marks */}
          {tickMarks.map(({ tick, x1, y1, x2, y2 }) => (
            <line
              key={tick}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-7xl font-semibold tracking-tight"
            style={{ color: status.color }}
            aria-hidden="true"
          >
            {animatedValue}
          </span>
          <span
            className="text-3xl font-light -mt-2"
            style={{ color: status.color }}
            aria-hidden="true"
          >
            %
          </span>
        </div>
      </div>

      {/* Screen reader text */}
      <span className="sr-only">
        {percentage}% probability of success. Status: {status.label}. {status.sublabel}.
      </span>

      {/* Labels */}
      <div className="text-center mt-6">
        <div
          className="text-lg font-semibold tracking-wide"
          style={{ color: status.color }}
        >
          {status.label}
        </div>
        <div className="text-sm mt-1" style={{ color: CSS_COLORS.textMuted }}>
          {status.sublabel}
        </div>
      </div>

      {/* Mini legend - 44px minimum touch targets */}
      <div className="flex items-center gap-4 mt-6" role="list" aria-label="Probability ranges">
        <div className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3" role="listitem">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CSS_COLORS.coral }} aria-hidden="true" />
          <span className="text-xs" style={{ color: CSS_COLORS.textMuted }}>&lt;70%</span>
        </div>
        <div className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3" role="listitem">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CSS_COLORS.gold }} aria-hidden="true" />
          <span className="text-xs" style={{ color: CSS_COLORS.textMuted }}>70-90%</span>
        </div>
        <div className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3" role="listitem">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CSS_COLORS.emerald }} aria-hidden="true" />
          <span className="text-xs" style={{ color: CSS_COLORS.textMuted }}>&gt;90%</span>
        </div>
      </div>
    </div>
  );
});

export default SuccessGauge;
