import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Sparkles, Send, User, Bot, ChevronRight, SkipForward, Check } from 'lucide-react';
import { CSS_COLORS } from '../utils/colors';

// Question definitions with analysis logic
const QUESTION_DEFINITIONS = [
  {
    id: 'social_security',
    type: 'Social Security',
    check: (profile) => !profile.ss_benefit_at_fra || profile.ss_benefit_at_fra === 0,
    question: "Have you checked your estimated Social Security benefit? This can significantly impact your retirement income.",
    suggestions: [
      { label: "Yes, about $2,000/month", value: { ss_benefit_at_fra: 2000 } },
      { label: "Yes, about $3,000/month", value: { ss_benefit_at_fra: 3000 } },
      { label: "I haven't checked yet", value: null },
      { label: "I don't expect SS benefits", value: { ss_benefit_at_fra: 0 } }
    ],
    followUp: "Great! I've updated your Social Security estimate. This will help provide a more accurate projection of your retirement income."
  },
  {
    id: 'ss_claiming_age',
    type: 'Social Security',
    check: (profile) => profile.ss_benefit_at_fra > 0 && (!profile.ss_claiming_age || profile.ss_claiming_age === 67),
    question: "When are you planning to start claiming Social Security? Claiming early reduces benefits, while delaying increases them.",
    suggestions: [
      { label: "Age 62 (early, reduced)", value: { ss_claiming_age: 62 } },
      { label: "Age 67 (full retirement)", value: { ss_claiming_age: 67 } },
      { label: "Age 70 (maximum benefit)", value: { ss_claiming_age: 70 } }
    ],
    followUp: "I've noted your planned claiming age. This affects your monthly benefit amount in our projections."
  },
  {
    id: 'pension',
    type: 'Pension',
    check: (profile) => !profile.pension_annual_benefit || profile.pension_annual_benefit === 0,
    question: "Do you have a pension or defined benefit plan from an employer? Many people forget to include this guaranteed income source.",
    suggestions: [
      { label: "Yes, about $20,000/year", value: { pension_annual_benefit: 20000, pension_start_age: 65 } },
      { label: "Yes, about $40,000/year", value: { pension_annual_benefit: 40000, pension_start_age: 65 } },
      { label: "No pension", value: { pension_annual_benefit: 0 } }
    ],
    followUp: "I've added your pension to the projections. Pensions provide valuable guaranteed income in retirement."
  },
  {
    id: 'healthcare_awareness',
    type: 'Healthcare',
    check: (profile) => !profile.hc_pre_medicare_premium || profile.hc_pre_medicare_premium < 6000,
    question: "Healthcare costs before Medicare (age 65) can be substantial. Have you budgeted for health insurance if you retire early?",
    suggestions: [
      { label: "ACA marketplace plan (~$12k/yr)", value: { hc_pre_medicare_premium: 12000, hc_pre_medicare_oop: 4000 } },
      { label: "COBRA coverage (~$18k/yr)", value: { hc_pre_medicare_premium: 18000, hc_pre_medicare_oop: 3000 } },
      { label: "Spouse's employer plan", value: { hc_pre_medicare_premium: 6000, hc_pre_medicare_oop: 2000 } },
      { label: "I'll work until 65 for insurance", value: null }
    ],
    followUp: "Healthcare costs are a crucial factor in retirement planning. I've updated your estimates."
  },
  {
    id: 'risk_tolerance',
    type: 'Risk Tolerance',
    check: (profile) => !profile.risk_tolerance || profile.risk_tolerance === 5,
    question: "How would you describe your investment risk tolerance? This affects your portfolio allocation.",
    suggestions: [
      { label: "Conservative (preserve capital)", value: { risk_tolerance: 3 } },
      { label: "Moderate (balanced growth)", value: { risk_tolerance: 5 } },
      { label: "Aggressive (maximum growth)", value: { risk_tolerance: 8 } }
    ],
    followUp: "I've adjusted your risk tolerance. This will influence the recommended asset allocation in your portfolio."
  },
  {
    id: 'retirement_income_goal',
    type: 'Goals',
    check: (profile) => !profile.retirement_income_goal || profile.retirement_income_goal === 80000,
    question: "What annual income do you want in retirement? A common rule is 70-80% of your pre-retirement income.",
    suggestions: [
      { label: "$60,000/year (modest)", value: { retirement_income_goal: 60000 } },
      { label: "$80,000/year (comfortable)", value: { retirement_income_goal: 80000 } },
      { label: "$100,000/year (affluent)", value: { retirement_income_goal: 100000 } },
      { label: "$120,000/year (wealthy)", value: { retirement_income_goal: 120000 } }
    ],
    followUp: "I've updated your retirement income goal. This is the target we'll use to measure your plan's success."
  },
  {
    id: 'legacy_goal',
    type: 'Goals',
    check: (profile) => !profile.legacy_goal || profile.legacy_goal === 100000,
    question: "Do you want to leave an inheritance or estate for heirs? This affects how we model your spending.",
    suggestions: [
      { label: "No specific legacy goal", value: { legacy_goal: 0 } },
      { label: "$100,000 minimum", value: { legacy_goal: 100000 } },
      { label: "$500,000 target", value: { legacy_goal: 500000 } },
      { label: "Maximize legacy", value: { legacy_goal: 1000000 } }
    ],
    followUp: "I've set your legacy goal. We'll factor this into your withdrawal strategy projections."
  },
  {
    id: 'employer_match',
    type: 'Savings',
    check: (profile) => (!profile.employer_match_percent || profile.employer_match_percent === 0) && profile.annual_income > 50000,
    question: "Does your employer offer a 401(k) match? This is free money you don't want to leave on the table!",
    suggestions: [
      { label: "Yes, 3% match", value: { employer_match_percent: 3, employer_match_limit: 6000 } },
      { label: "Yes, 6% match", value: { employer_match_percent: 6, employer_match_limit: 12000 } },
      { label: "No employer match", value: { employer_match_percent: 0 } },
      { label: "Self-employed / no 401k", value: null }
    ],
    followUp: "Employer matching is one of the best returns on your money. I've updated your savings projections."
  },
  {
    id: 'monthly_contribution',
    type: 'Savings',
    check: (profile) => !profile.monthly_contribution || profile.monthly_contribution < 500,
    question: "How much are you currently saving each month for retirement? Consistent contributions are key to building wealth.",
    suggestions: [
      { label: "$500/month", value: { monthly_contribution: 500 } },
      { label: "$1,000/month", value: { monthly_contribution: 1000 } },
      { label: "$1,500/month", value: { monthly_contribution: 1500 } },
      { label: "$2,000+/month", value: { monthly_contribution: 2000 } }
    ],
    followUp: "I've updated your monthly contribution. Remember, even small increases can make a big difference over time."
  },
  {
    id: 'retirement_age',
    type: 'Goals',
    check: (profile) => !profile.retirement_age || profile.retirement_age === 65,
    question: "When do you want to retire? Earlier retirement requires more savings; later retirement allows more accumulation.",
    suggestions: [
      { label: "Age 55 (early)", value: { retirement_age: 55 } },
      { label: "Age 60", value: { retirement_age: 60 } },
      { label: "Age 65 (traditional)", value: { retirement_age: 65 } },
      { label: "Age 67 or later", value: { retirement_age: 67 } }
    ],
    followUp: "I've set your target retirement age. This determines how long you have to save and how long your money needs to last."
  }
];

// Analyze profile and find gaps
function analyzeProfileGaps(profile) {
  return QUESTION_DEFINITIONS.filter(q => q.check(profile));
}

// Generate contextual intro based on profile
function generateIntro(profile, gaps) {
  const gapCount = gaps.length;
  if (gapCount === 0) {
    return "Your profile looks comprehensive! I don't have any additional questions at this time. Run a simulation to see your projections.";
  }
  if (gapCount <= 2) {
    return `Your profile is mostly complete! I have ${gapCount === 1 ? 'one question' : 'a couple of questions'} that could help refine your projections.`;
  }
  if (gapCount <= 5) {
    return "I've reviewed your profile and have a few questions that could help create more accurate projections. Let's go through them one at a time.";
  }
  return "Let's walk through some important questions to build out your retirement profile. This will help me give you more accurate projections.";
}

const MessageBubble = memo(function MessageBubble({ message, isUser, onSelectSuggestion }) {
  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      role="listitem"
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
                  className="px-3 py-1.5 text-xs rounded-full border transition-all hover:border-[var(--emerald)] hover:text-[var(--emerald)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
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
              className="flex items-center gap-1 text-xs transition-colors hover:text-[var(--emerald)]"
              style={{ color: CSS_COLORS.textMuted }}
            >
              <SkipForward className="w-3 h-3" />
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

const CompletionBadge = memo(function CompletionBadge({ answered, total }) {
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 100;
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-20 h-1.5 rounded-full overflow-hidden"
        style={{ background: CSS_COLORS.bgHover }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: 'var(--gradient-emerald)'
          }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color: CSS_COLORS.textMuted }}>
        {answered}/{total}
      </span>
    </div>
  );
});

const AIDiscovery = memo(function AIDiscovery({ onUpdateProfile, formData }) {
  // Merge formData prop with default profile for analysis
  const currentProfile = useMemo(() => ({
    // Default values that match InputForm defaults
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

  // Analyze gaps
  const profileGaps = useMemo(() => analyzeProfileGaps(currentProfile), [currentProfile]);

  // Track which questions have been answered
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Get unanswered questions
  const unansweredQuestions = useMemo(() =>
    profileGaps.filter(q => !answeredQuestions.has(q.id)),
    [profileGaps, answeredQuestions]
  );

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const intro = generateIntro(currentProfile, profileGaps);
      setMessages([{
        id: 1,
        text: intro,
        isUser: false,
        suggestions: profileGaps.length > 0 ? [
          { label: "Let's get started", value: 'start' },
          { label: "Review my profile first", value: 'review' }
        ] : [],
        questionId: 'intro'
      }]);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ask the next question
  const askNextQuestion = useCallback(() => {
    if (unansweredQuestions.length === 0) {
      // All questions answered
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "Excellent! I've gathered all the information I need. Your profile is now more complete, which will help create more accurate retirement projections. Go ahead and run a simulation to see your results!",
          isUser: false,
          suggestions: []
        }]);
        setIsTyping(false);
      }, 800);
      return;
    }

    const nextQuestion = unansweredQuestions[0];

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: nextQuestion.question,
        isUser: false,
        suggestions: nextQuestion.suggestions,
        questionType: nextQuestion.type,
        questionId: nextQuestion.id,
        canSkip: true
      }]);
      setIsTyping(false);
    }, 800);
  }, [unansweredQuestions]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion, questionId) => {
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
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            text: `Based on your current profile, I see you're ${currentProfile.current_age} years old, planning to retire at ${currentProfile.retirement_age}, with $${currentProfile.current_savings.toLocaleString()} in savings. Now let me ask a few questions to fill in some gaps.`,
            isUser: false
          }]);
          setIsTyping(false);
          // Then ask first question
          setTimeout(() => {
            setIsTyping(true);
            askNextQuestion();
          }, 1500);
        }, 800);
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

    // Find the question definition for follow-up
    const questionDef = QUESTION_DEFINITIONS.find(q => q.id === questionId);

    setIsTyping(true);

    // Show follow-up and then next question
    if (questionDef && suggestion.value && !suggestion.isSkip) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: questionDef.followUp,
          isUser: false
        }]);
        setIsTyping(false);

        // Ask next question after a brief pause
        setTimeout(() => {
          setIsTyping(true);
          askNextQuestion();
        }, 1000);
      }, 800);
    } else {
      // Skipped or no value - just move to next question
      askNextQuestion();
    }
  }, [currentProfile, onUpdateProfile, askNextQuestion]);

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

    // Simple response for free-form input
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

  return (
    <section
      className="surface-elevated overflow-hidden animate-fade-in"
      aria-labelledby="ai-discovery-title"
    >
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
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
        {isStarted && profileGaps.length > 0 && (
          <CompletionBadge
            answered={answeredQuestions.size}
            total={profileGaps.length}
          />
        )}
      </div>

      {/* Messages Area */}
      <div
        className="p-6 space-y-4 overflow-y-auto"
        style={{
          maxHeight: '400px',
          minHeight: '300px'
        }}
        role="list"
        aria-label="Conversation messages"
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isUser={message.isUser}
            onSelectSuggestion={handleSelectSuggestion}
          />
        ))}

        {isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="px-6 py-4 border-t"
        style={{ borderColor: CSS_COLORS.border }}
      >
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your response..."
            className="flex-1 px-4 py-3 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
            style={{
              background: CSS_COLORS.bgSecondary,
              border: `1px solid ${CSS_COLORS.border}`,
              color: CSS_COLORS.textPrimary
            }}
            aria-label="Your message"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="px-4 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]"
            style={{ background: 'var(--gradient-emerald)' }}
            aria-label="Send message"
          >
            <Send className="w-5 h-5" style={{ color: CSS_COLORS.bgPrimary }} />
          </button>
        </div>
      </form>
    </section>
  );
});

export default AIDiscovery;
