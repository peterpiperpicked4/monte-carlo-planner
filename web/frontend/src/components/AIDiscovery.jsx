import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Sparkles, Send, User, Bot, SkipForward, Loader2, AlertCircle, RefreshCw, Lightbulb, RotateCcw, ChevronRight } from 'lucide-react';
import { CSS_COLORS } from '../utils/colors';

// What-if scenario definitions
const WHAT_IF_SCENARIOS = [
  {
    id: 'retire_earlier',
    label: 'Retire 2 years earlier',
    description: 'See how retiring at {age} instead of {current} affects your plan',
    getDescription: (profile) => `See how retiring at ${profile.retirement_age - 2} instead of ${profile.retirement_age} affects your plan`,
    changes: (profile) => ({ retirement_age: profile.retirement_age - 2 }),
    check: (profile) => profile.retirement_age > 57
  },
  {
    id: 'retire_later',
    label: 'Retire 2 years later',
    description: 'See how waiting until {age} to retire improves your outlook',
    getDescription: (profile) => `See how waiting until ${profile.retirement_age + 2} to retire improves your outlook`,
    changes: (profile) => ({ retirement_age: profile.retirement_age + 2 }),
    check: (profile) => profile.retirement_age < 70
  },
  {
    id: 'save_more',
    label: 'Save $500 more/month',
    description: 'Increase your monthly contribution to {amount}',
    getDescription: (profile) => `Increase your monthly contribution to $${((profile.monthly_contribution || 0) + 500).toLocaleString()}/month`,
    changes: (profile) => ({ monthly_contribution: (profile.monthly_contribution || 0) + 500 }),
    check: () => true
  },
  {
    id: 'delay_ss',
    label: 'Delay Social Security to 70',
    description: 'Maximize your Social Security benefit by claiming at age 70',
    getDescription: () => 'Maximize your Social Security benefit by claiming at age 70',
    changes: () => ({ ss_claiming_age: 70 }),
    check: (profile) => profile.ss_benefit_at_fra > 0 && profile.ss_claiming_age < 70
  },
  {
    id: 'reduce_spending',
    label: 'Reduce retirement income by 10%',
    description: 'See how a more modest lifestyle affects your success rate',
    getDescription: (profile) => `Reduce target to $${Math.round((profile.retirement_income_goal || 80000) * 0.9).toLocaleString()}/year`,
    changes: (profile) => ({ retirement_income_goal: Math.round((profile.retirement_income_goal || 80000) * 0.9) }),
    check: (profile) => profile.retirement_income_goal > 40000
  },
  {
    id: 'aggressive_portfolio',
    label: 'More aggressive portfolio',
    description: 'Increase risk tolerance for potentially higher returns',
    getDescription: () => 'Increase risk tolerance for potentially higher returns',
    changes: () => ({ risk_tolerance: 8 }),
    check: (profile) => profile.risk_tolerance < 7
  },
  {
    id: 'conservative_portfolio',
    label: 'More conservative portfolio',
    description: 'Reduce risk for more stable but potentially lower returns',
    getDescription: () => 'Reduce risk for more stable but potentially lower returns',
    changes: () => ({ risk_tolerance: 3 }),
    check: (profile) => profile.risk_tolerance > 4
  }
];

// Local question definitions for fallback when API fails
const FALLBACK_QUESTIONS = [
  {
    id: 'social_security',
    question_type: 'Social Security',
    question: "Have you checked your estimated Social Security benefit? This can significantly impact your retirement income.",
    suggestions: [
      { label: "Yes, about $2,000/month", value: { ss_benefit_at_fra: 2000 } },
      { label: "Yes, about $3,000/month", value: { ss_benefit_at_fra: 3000 } },
      { label: "I haven't checked yet", value: null },
      { label: "I don't expect SS benefits", value: { ss_benefit_at_fra: 0 } }
    ],
    check: (profile) => !profile.ss_benefit_at_fra || profile.ss_benefit_at_fra === 0
  },
  {
    id: 'ss_claiming_age',
    question_type: 'Social Security',
    question: "When are you planning to start claiming Social Security? Claiming early reduces benefits, while delaying increases them.",
    suggestions: [
      { label: "Age 62 (early, reduced)", value: { ss_claiming_age: 62 } },
      { label: "Age 67 (full retirement)", value: { ss_claiming_age: 67 } },
      { label: "Age 70 (maximum benefit)", value: { ss_claiming_age: 70 } }
    ],
    check: (profile) => profile.ss_benefit_at_fra > 0 && (!profile.ss_claiming_age || profile.ss_claiming_age === 67)
  },
  {
    id: 'pension',
    question_type: 'Pension',
    question: "Do you have a pension or defined benefit plan from an employer? Many people forget to include this guaranteed income source.",
    suggestions: [
      { label: "Yes, about $20,000/year", value: { pension_annual_benefit: 20000, pension_start_age: 65 } },
      { label: "Yes, about $40,000/year", value: { pension_annual_benefit: 40000, pension_start_age: 65 } },
      { label: "No pension", value: { pension_annual_benefit: 0 } }
    ],
    check: (profile) => !profile.pension_annual_benefit || profile.pension_annual_benefit === 0
  },
  {
    id: 'healthcare',
    question_type: 'Healthcare',
    question: "Healthcare costs before Medicare (age 65) can be substantial. Have you budgeted for health insurance if you retire early?",
    suggestions: [
      { label: "ACA marketplace plan (~$12k/yr)", value: { hc_pre_medicare_premium: 12000, hc_pre_medicare_oop: 4000 } },
      { label: "COBRA coverage (~$18k/yr)", value: { hc_pre_medicare_premium: 18000, hc_pre_medicare_oop: 3000 } },
      { label: "Spouse's employer plan", value: { hc_pre_medicare_premium: 6000, hc_pre_medicare_oop: 2000 } },
      { label: "I'll work until 65 for insurance", value: null }
    ],
    check: (profile) => !profile.hc_pre_medicare_premium || profile.hc_pre_medicare_premium < 6000
  },
  {
    id: 'risk_tolerance',
    question_type: 'Risk Tolerance',
    question: "How would you describe your investment risk tolerance? This affects your portfolio allocation.",
    suggestions: [
      { label: "Conservative (preserve capital)", value: { risk_tolerance: 3 } },
      { label: "Moderate (balanced growth)", value: { risk_tolerance: 5 } },
      { label: "Aggressive (maximum growth)", value: { risk_tolerance: 8 } }
    ],
    check: (profile) => !profile.risk_tolerance || profile.risk_tolerance === 5
  },
  {
    id: 'retirement_income_goal',
    question_type: 'Goals',
    question: "What annual income do you want in retirement? A common rule is 70-80% of your pre-retirement income.",
    suggestions: [
      { label: "$60,000/year (modest)", value: { retirement_income_goal: 60000 } },
      { label: "$80,000/year (comfortable)", value: { retirement_income_goal: 80000 } },
      { label: "$100,000/year (affluent)", value: { retirement_income_goal: 100000 } },
      { label: "$120,000/year (wealthy)", value: { retirement_income_goal: 120000 } }
    ],
    check: (profile) => !profile.retirement_income_goal || profile.retirement_income_goal === 80000
  },
  {
    id: 'legacy_goal',
    question_type: 'Goals',
    question: "Do you want to leave an inheritance or estate for heirs? This affects how we model your spending.",
    suggestions: [
      { label: "No specific legacy goal", value: { legacy_goal: 0 } },
      { label: "$100,000 minimum", value: { legacy_goal: 100000 } },
      { label: "$500,000 target", value: { legacy_goal: 500000 } },
      { label: "Maximize legacy", value: { legacy_goal: 1000000 } }
    ],
    check: (profile) => !profile.legacy_goal || profile.legacy_goal === 100000
  },
  {
    id: 'employer_match',
    question_type: 'Savings',
    question: "Does your employer offer a 401(k) match? This is free money you don't want to leave on the table!",
    suggestions: [
      { label: "Yes, 3% match", value: { employer_match_percent: 3, employer_match_limit: 6000 } },
      { label: "Yes, 6% match", value: { employer_match_percent: 6, employer_match_limit: 12000 } },
      { label: "No employer match", value: { employer_match_percent: 0 } },
      { label: "Self-employed / no 401k", value: null }
    ],
    check: (profile) => (!profile.employer_match_percent || profile.employer_match_percent === 0) && profile.annual_income > 50000
  },
  {
    id: 'monthly_contribution',
    question_type: 'Savings',
    question: "How much are you currently saving each month for retirement? Consistent contributions are key to building wealth.",
    suggestions: [
      { label: "$500/month", value: { monthly_contribution: 500 } },
      { label: "$1,000/month", value: { monthly_contribution: 1000 } },
      { label: "$1,500/month", value: { monthly_contribution: 1500 } },
      { label: "$2,000+/month", value: { monthly_contribution: 2000 } }
    ],
    check: (profile) => !profile.monthly_contribution || profile.monthly_contribution < 500
  },
  {
    id: 'retirement_age',
    question_type: 'Goals',
    question: "When do you want to retire? Earlier retirement requires more savings; later retirement allows more accumulation.",
    suggestions: [
      { label: "Age 55 (early)", value: { retirement_age: 55 } },
      { label: "Age 60", value: { retirement_age: 60 } },
      { label: "Age 65 (traditional)", value: { retirement_age: 65 } },
      { label: "Age 67 or later", value: { retirement_age: 67 } }
    ],
    check: (profile) => !profile.retirement_age || profile.retirement_age === 65
  }
];

// Local fallback analysis
function analyzeProfileLocal(profile) {
  return FALLBACK_QUESTIONS.filter(q => q.check(profile));
}

// Generate local completeness score
function calculateCompleteness(profile, answered) {
  const importantFields = [
    ['current_age', 35],
    ['retirement_age', 65],
    ['current_savings', 0],
    ['annual_income', 0],
    ['monthly_contribution', 0],
    ['risk_tolerance', 5],
    ['ss_benefit_at_fra', 0],
    ['pension_annual_benefit', 0],
    ['retirement_income_goal', 80000],
    ['legacy_goal', 0]
  ];

  let filledCount = 0;
  for (const [field, defaultVal] of importantFields) {
    const value = profile[field];
    if (value !== undefined && value !== defaultVal) {
      filledCount++;
    }
  }

  const baseScore = filledCount / importantFields.length;
  const answeredBonus = answered.size * 0.05;
  return Math.min(1.0, baseScore + answeredBonus);
}

const MessageBubble = memo(function MessageBubble({ message, isUser, onSelectSuggestion, onApplyWhatIf, currentProfile, activeWhatIf }) {
  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in-up`}
      style={{ animationDuration: '300ms' }}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: isUser ? CSS_COLORS.bgHover : 'var(--gradient-emerald)'
        }}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="w-4 h-4" style={{ color: CSS_COLORS.textMuted }} />
        ) : (
          <Bot className="w-4 h-4" style={{ color: CSS_COLORS.bgPrimary }} />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`max-w-[80%] p-4 rounded-2xl ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
        style={{
          background: isUser
            ? 'rgba(16, 185, 129, 0.15)'
            : CSS_COLORS.bgSecondary,
          border: `1px solid ${isUser ? 'rgba(16, 185, 129, 0.3)' : CSS_COLORS.border}`
        }}
      >
        <p
          className="text-sm leading-relaxed"
          style={{ color: CSS_COLORS.textPrimary }}
        >
          {message.text}
        </p>

        {/* Question Type Badge */}
        {message.questionType && (
          <div className="mt-2">
            <span
              className="inline-block px-2 py-0.5 text-xs rounded-full"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: CSS_COLORS.emerald
              }}
            >
              {message.questionType}
            </span>
          </div>
        )}

        {/* Insights list */}
        {message.insights && message.insights.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: CSS_COLORS.border }}>
            <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: CSS_COLORS.textMuted }}>
              Insights
            </p>
            <ul className="space-y-1">
              {message.insights.map((insight, idx) => (
                <li key={idx} className="text-xs" style={{ color: CSS_COLORS.textSecondary }}>
                  • {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations list */}
        {message.recommendations && message.recommendations.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: CSS_COLORS.border }}>
            <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: CSS_COLORS.textMuted }}>
              Recommendations
            </p>
            <ul className="space-y-1">
              {message.recommendations.map((rec, idx) => (
                <li key={idx} className="text-xs" style={{ color: CSS_COLORS.textSecondary }}>
                  • {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* What-If Scenarios */}
        {message.showWhatIf && currentProfile && onApplyWhatIf && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: CSS_COLORS.border }}>
            <p className="text-xs mb-2 uppercase tracking-wider flex items-center gap-1.5" style={{ color: CSS_COLORS.textMuted }}>
              <Lightbulb className="w-3 h-3" />
              What-if scenarios
            </p>
            <div className="space-y-2">
              {WHAT_IF_SCENARIOS
                .filter(scenario => scenario.check(currentProfile))
                .slice(0, 3)
                .map(scenario => (
                  <WhatIfCard
                    key={scenario.id}
                    scenario={scenario}
                    profile={currentProfile}
                    onApply={onApplyWhatIf}
                    isActive={activeWhatIf === scenario.id}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Suggested Answers */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: CSS_COLORS.border }}>
            <p
              className="text-xs mb-2 uppercase tracking-wider"
              style={{ color: CSS_COLORS.textMuted }}
            >
              Quick answers
            </p>
            <div className="flex flex-wrap gap-2">
              {message.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSuggestion?.(suggestion, message.questionId)}
                  className="px-4 py-2.5 min-h-[44px] text-sm rounded-full border transition-all hover:border-[var(--emerald)] hover:text-[var(--emerald)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
                  style={{
                    background: CSS_COLORS.bgElevated,
                    borderColor: CSS_COLORS.border,
                    color: CSS_COLORS.textSecondary
                  }}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skip Option */}
        {message.canSkip && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: CSS_COLORS.border }}>
            <button
              onClick={() => onSelectSuggestion?.({ label: 'Skip', value: null, isSkip: true }, message.questionId)}
              className="flex items-center gap-2 px-3 py-2 min-h-[44px] text-sm rounded-lg transition-colors hover:text-[var(--emerald)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
              style={{ color: CSS_COLORS.textMuted }}
              aria-label="Skip this question and move to the next one"
            >
              <SkipForward className="w-4 h-4" aria-hidden="true" />
              Skip this question
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex gap-3" role="status" aria-label="AI is typing">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: 'var(--gradient-emerald)' }}
        aria-hidden="true"
      >
        <Bot className="w-4 h-4" style={{ color: CSS_COLORS.bgPrimary }} />
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-sm"
        style={{
          background: CSS_COLORS.bgSecondary,
          border: `1px solid ${CSS_COLORS.border}`
        }}
      >
        <div className="flex gap-1">
          <span
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: CSS_COLORS.emerald, animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: CSS_COLORS.emerald, animationDelay: '150ms' }}
          />
          <span
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: CSS_COLORS.emerald, animationDelay: '300ms' }}
          />
        </div>
      </div>
      <span className="sr-only">AI is typing a response</span>
    </div>
  );
});

const LoadingIndicator = memo(function LoadingIndicator() {
  return (
    <div className="flex gap-3" role="status" aria-label="Loading from AI">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: 'var(--gradient-emerald)' }}
        aria-hidden="true"
      >
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: CSS_COLORS.bgPrimary }} />
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-sm"
        style={{
          background: CSS_COLORS.bgSecondary,
          border: `1px solid ${CSS_COLORS.border}`
        }}
      >
        <p className="text-sm" style={{ color: CSS_COLORS.textMuted }}>
          Analyzing your profile...
        </p>
      </div>
    </div>
  );
});

const CompletionBadge = memo(function CompletionBadge({ score }) {
  const percentage = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`Profile ${percentage}% complete`}>
      <div
        className="w-20 h-1.5 rounded-full overflow-hidden"
        style={{ background: CSS_COLORS.bgHover }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            background: 'var(--gradient-emerald)'
          }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color: CSS_COLORS.textMuted }}>
        {percentage}%
      </span>
    </div>
  );
});

// What-if scenario card component
const WhatIfCard = memo(function WhatIfCard({ scenario, profile, onApply, isActive }) {
  const description = scenario.getDescription(profile);

  return (
    <button
      onClick={() => onApply(scenario)}
      disabled={isActive}
      className="group w-full text-left p-3 rounded-lg border transition-all duration-200 hover:border-[var(--emerald)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)] disabled:opacity-50"
      style={{
        background: isActive ? 'rgba(16, 185, 129, 0.1)' : CSS_COLORS.bgSecondary,
        borderColor: isActive ? CSS_COLORS.emerald : CSS_COLORS.border
      }}
      aria-pressed={isActive}
    >
      <div className="flex items-start gap-2">
        <Lightbulb
          className="w-4 h-4 mt-0.5 flex-shrink-0 transition-colors group-hover:text-[var(--emerald)]"
          style={{ color: isActive ? CSS_COLORS.emerald : CSS_COLORS.textMuted }}
        />
        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-medium transition-colors group-hover:text-[var(--emerald)]"
            style={{ color: isActive ? CSS_COLORS.emerald : CSS_COLORS.textPrimary }}
          >
            {scenario.label}
          </span>
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: CSS_COLORS.textMuted }}>
            {description}
          </p>
        </div>
        <ChevronRight
          className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{ color: CSS_COLORS.textMuted }}
        />
      </div>
    </button>
  );
});

// Reset banner shown when a what-if scenario is active
const WhatIfBanner = memo(function WhatIfBanner({ scenarioLabel, onReset }) {
  return (
    <div
      className="px-6 py-3 flex items-center justify-between animate-slide-down"
      style={{
        background: 'rgba(16, 185, 129, 0.1)',
        borderBottom: `1px solid ${CSS_COLORS.emerald}`
      }}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4" style={{ color: CSS_COLORS.emerald }} />
        <span className="text-sm" style={{ color: CSS_COLORS.emerald }}>
          Previewing: <strong>{scenarioLabel}</strong>
        </span>
      </div>
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
        style={{
          borderColor: CSS_COLORS.emerald,
          color: CSS_COLORS.emerald
        }}
        aria-label="Reset to original values"
      >
        <RotateCcw className="w-3 h-3" />
        Reset
      </button>
    </div>
  );
});

const AIDiscovery = memo(function AIDiscovery({ onUpdateProfile, formData }) {
  // Merge formData prop with default profile for analysis
  const currentProfile = useMemo(() => ({
    current_age: 35,
    retirement_age: 65,
    life_expectancy: 90,
    risk_tolerance: 5,
    annual_income: 100000,
    current_savings: 150000,
    monthly_contribution: 1500,
    employer_match_percent: 3,
    retirement_income_goal: 80000,
    legacy_goal: 100000,
    ss_benefit_at_fra: 2500,
    ss_claiming_age: 67,
    pension_annual_benefit: 0,
    hc_pre_medicare_premium: 12000,
    ...formData
  }), [formData]);

  // Track state
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [completenessScore, setCompletenessScore] = useState(0);
  const [apiQuestions, setApiQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const [apiError, setApiError] = useState(null);

  // What-if scenario state
  const [activeWhatIf, setActiveWhatIf] = useState(null);
  const [originalValues, setOriginalValues] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch discovery data from API
  const fetchDiscovery = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch('http://localhost:8000/api/discovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: currentProfile,
          answered_questions: Array.from(answeredQuestions)
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      setCompletenessScore(data.completeness_score || 0);
      setApiQuestions(data.questions || []);
      setUseLocalFallback(false);

      return data;
    } catch (error) {
      console.error('Discovery API error:', error);
      setApiError(error.message);
      setUseLocalFallback(true);

      // Use local fallback
      const localGaps = analyzeProfileLocal(currentProfile);
      const localScore = calculateCompleteness(currentProfile, answeredQuestions);
      setCompletenessScore(localScore);
      setApiQuestions(localGaps.map(q => ({
        id: q.id,
        question: q.question,
        question_type: q.question_type,
        suggestions: q.suggestions
      })));

      return {
        questions: localGaps,
        completeness_score: localScore,
        insights: [],
        recommendations: []
      };
    } finally {
      setIsLoading(false);
    }
  }, [currentProfile, answeredQuestions]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const localGaps = analyzeProfileLocal(currentProfile);
      const gapCount = localGaps.length;

      let intro;
      if (gapCount === 0) {
        intro = "Your profile looks comprehensive! I don't have any additional questions at this time. Run a simulation to see your projections.";
      } else if (gapCount <= 2) {
        intro = `Your profile is mostly complete! I have ${gapCount === 1 ? 'one question' : 'a couple of questions'} that could help refine your projections.`;
      } else if (gapCount <= 5) {
        intro = "I've reviewed your profile and have a few questions that could help create more accurate projections. Let's go through them one at a time.";
      } else {
        intro = "Let's walk through some important questions to build out your retirement profile. This will help me give you more accurate projections.";
      }

      setMessages([{
        id: 1,
        text: intro,
        isUser: false,
        suggestions: gapCount > 0 ? [
          { label: "Let's get started", value: 'start' },
          { label: "Review my profile first", value: 'review' }
        ] : [],
        questionId: 'intro'
      }]);

      // Set initial completeness
      setCompletenessScore(calculateCompleteness(currentProfile, answeredQuestions));
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Get next question (from API or local fallback)
  const getNextQuestion = useCallback(() => {
    const unanswered = apiQuestions.filter(q => !answeredQuestions.has(q.id));
    if (unanswered.length > 0) {
      return unanswered[0];
    }
    return null;
  }, [apiQuestions, answeredQuestions]);

  // Ask the next question
  const askNextQuestion = useCallback(async () => {
    // First try to get fresh questions from API
    const data = await fetchDiscovery();

    const unanswered = (data.questions || []).filter(q => !answeredQuestions.has(q.id));

    if (unanswered.length === 0) {
      // All questions answered - show what-if scenarios
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "Excellent! I've gathered all the information I need. Your profile is now more complete. Would you like to explore some what-if scenarios to see how different choices might affect your retirement?",
          isUser: false,
          suggestions: [],
          insights: data.insights || [],
          recommendations: data.recommendations || [],
          showWhatIf: true
        }]);
        setIsTyping(false);
      }, 300);
      return;
    }

    const nextQuestion = unanswered[0];

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: nextQuestion.question,
        isUser: false,
        suggestions: nextQuestion.suggestions,
        questionType: nextQuestion.question_type,
        questionId: nextQuestion.id,
        canSkip: true
      }]);
      setIsTyping(false);
    }, 300);
  }, [fetchDiscovery, answeredQuestions]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(async (suggestion, questionId) => {
    // Add user's response as a message
    const userMessage = {
      id: Date.now(),
      text: suggestion.label,
      isUser: true
    };
    setMessages(prev => [...prev, userMessage]);

    // Handle intro options
    if (questionId === 'intro') {
      setIsTyping(true);
      setIsStarted(true);

      if (suggestion.value === 'review') {
        // First fetch from API to show insights
        setIsLoading(true);
        const data = await fetchDiscovery();
        setIsLoading(false);

        const reviewMessage = {
          id: Date.now() + 1,
          text: `Based on your current profile, I see you're ${currentProfile.current_age} years old, planning to retire at ${currentProfile.retirement_age}, with $${currentProfile.current_savings.toLocaleString()} in savings. ${data.insights?.length ? '' : 'Now let me ask a few questions to fill in some gaps.'}`,
          isUser: false,
          insights: data.insights || [],
          recommendations: data.recommendations || []
        };

        setMessages(prev => [...prev, reviewMessage]);

        // Then ask first question
        setTimeout(() => {
          setIsTyping(true);
          askNextQuestion();
        }, 1500);
      } else {
        askNextQuestion();
      }
      return;
    }

    // Mark question as answered
    setAnsweredQuestions(prev => new Set([...prev, questionId]));

    // Update profile if suggestion has a value (and isn't a skip)
    if (suggestion.value && !suggestion.isSkip && typeof suggestion.value === 'object') {
      onUpdateProfile?.(suggestion.value);
    }

    setIsTyping(true);

    // Show follow-up and then next question
    if (suggestion.value && !suggestion.isSkip) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: "I've updated your profile with that information.",
          isUser: false
        }]);
        setIsTyping(false);

        // Ask next question after a brief pause
        setTimeout(() => {
          setIsTyping(true);
          askNextQuestion();
        }, 800);
      }, 500);
    } else {
      // Skipped or no value - just move to next question
      askNextQuestion();
    }
  }, [currentProfile, onUpdateProfile, askNextQuestion, fetchDiscovery]);

  // Handle free-form input
  const handleSendMessage = useCallback((text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: text.trim(),
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "Thanks for that information! Let me continue with some specific questions to help complete your profile.",
        isUser: false
      }]);
      setIsTyping(false);

      if (!isStarted) {
        setIsStarted(true);
        setTimeout(() => {
          setIsTyping(true);
          askNextQuestion();
        }, 1000);
      }
    }, 800);
  }, [isStarted, askNextQuestion]);

  // Handle form submit
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  }, [inputValue, handleSendMessage]);

  // Retry API connection
  const handleRetry = useCallback(async () => {
    setApiError(null);
    await fetchDiscovery();
  }, [fetchDiscovery]);

  // Apply a what-if scenario
  const handleApplyWhatIf = useCallback((scenario) => {
    // Save original values if not already in a what-if state
    if (!originalValues) {
      const changesKeys = Object.keys(scenario.changes(currentProfile));
      const originals = {};
      changesKeys.forEach(key => {
        originals[key] = currentProfile[key];
      });
      setOriginalValues(originals);
    }

    // Apply the scenario changes
    const changes = scenario.changes(currentProfile);
    onUpdateProfile?.(changes);
    setActiveWhatIf(scenario.id);

    // Add a message about the what-if
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: `I've temporarily applied "${scenario.label}" to your profile. Run a simulation to see how this change affects your retirement outlook. Click "Reset" when you're done exploring.`,
      isUser: false
    }]);
  }, [currentProfile, onUpdateProfile, originalValues]);

  // Reset to original values
  const handleResetWhatIf = useCallback(() => {
    if (originalValues) {
      onUpdateProfile?.(originalValues);
      setOriginalValues(null);
      setActiveWhatIf(null);

      // Add confirmation message
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "I've reset your profile to the original values. Feel free to try another what-if scenario or continue exploring.",
        isUser: false,
        showWhatIf: true
      }]);
    }
  }, [originalValues, onUpdateProfile]);

  return (
    <section
      className="surface-elevated overflow-hidden animate-fade-in"
      aria-labelledby="ai-discovery-title"
    >
      {/* Header */}
      <div
        className="px-4 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
        style={{ borderColor: CSS_COLORS.border }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--gradient-emerald)' }}
            aria-hidden="true"
          >
            <Sparkles className="w-5 h-5" style={{ color: CSS_COLORS.bgPrimary }} />
          </div>
          <div>
            <h3
              id="ai-discovery-title"
              className="font-medium"
              style={{ color: CSS_COLORS.textPrimary }}
            >
              AI Discovery
            </h3>
            <span className="text-xs" style={{ color: CSS_COLORS.textMuted }}>
              Let's complete your financial profile
            </span>
          </div>
        </div>

        {/* Progress indicator */}
        {isStarted && (
          <CompletionBadge score={completenessScore} />
        )}
      </div>

      {/* API Error Banner */}
      {apiError && useLocalFallback && (
        <div
          className="px-6 py-3 flex items-center justify-between text-xs"
          style={{
            background: 'rgba(251, 191, 36, 0.1)',
            borderBottom: `1px solid ${CSS_COLORS.border}`
          }}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-2" style={{ color: CSS_COLORS.gold }}>
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            <span>Using offline mode - API connection unavailable</span>
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg transition-colors hover:text-[var(--emerald)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
            style={{ color: CSS_COLORS.textMuted }}
            aria-label="Retry connecting to AI service"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      {/* What-If Active Banner */}
      {activeWhatIf && (
        <WhatIfBanner
          scenarioLabel={WHAT_IF_SCENARIOS.find(s => s.id === activeWhatIf)?.label || 'Scenario'}
          onReset={handleResetWhatIf}
        />
      )}

      {/* Messages Area */}
      <div
        className="p-4 sm:p-6 space-y-4 overflow-y-auto"
        style={{
          maxHeight: '400px',
          minHeight: '300px'
        }}
        role="log"
        aria-live="polite"
        aria-label="Conversation messages"
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isUser={message.isUser}
            onSelectSuggestion={handleSelectSuggestion}
            onApplyWhatIf={handleApplyWhatIf}
            currentProfile={currentProfile}
            activeWhatIf={activeWhatIf}
          />
        ))}

        {isLoading && <LoadingIndicator />}
        {isTyping && !isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="px-4 sm:px-6 py-4 border-t"
        style={{ borderColor: CSS_COLORS.border }}
      >
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your response..."
            className="flex-1 px-4 py-3 min-h-[44px] rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
            style={{
              background: CSS_COLORS.bgSecondary,
              border: `1px solid ${CSS_COLORS.border}`,
              color: CSS_COLORS.textPrimary
            }}
            aria-label="Type your response to the AI assistant"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping || isLoading}
            className="px-4 py-3 min-w-[44px] min-h-[44px] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]"
            style={{ background: 'var(--gradient-emerald)' }}
            aria-label="Send message"
          >
            <Send className="w-5 h-5" style={{ color: CSS_COLORS.bgPrimary }} aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  );
});

export default AIDiscovery;
