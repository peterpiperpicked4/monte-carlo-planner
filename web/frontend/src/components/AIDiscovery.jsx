import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, Send, User, Bot, ChevronRight } from 'lucide-react';
import { CSS_COLORS } from '../utils/colors';

const MessageBubble = memo(function MessageBubble({ message, isUser }) {
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
                  onClick={() => message.onSelectSuggestion?.(suggestion)}
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

const AIDiscovery = memo(function AIDiscovery({ onUpdateProfile, formData }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your AI financial assistant. I can help you complete your retirement profile by asking a few questions. Let's make sure we haven't missed anything important.",
      isUser: false,
      suggestions: [
        { label: "Let's get started", value: 'start' },
        { label: "Review my profile", value: 'review' }
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = useCallback((text) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: text.trim(),
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response (this will be replaced with actual API call in US-005)
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        text: "Thanks for sharing! I'll use this information to help refine your retirement projections. Is there anything else you'd like to tell me about your financial situation?",
        isUser: false,
        suggestions: [
          { label: "I have more details", value: 'more' },
          { label: "That's all for now", value: 'done' }
        ]
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);
  }, []);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion) => {
    handleSendMessage(suggestion.label);
  }, [handleSendMessage]);

  // Handle form submit
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  }, [inputValue, handleSendMessage]);

  // Add suggestion handler to messages
  const messagesWithHandlers = messages.map(msg => ({
    ...msg,
    onSelectSuggestion: msg.isUser ? undefined : handleSelectSuggestion
  }));

  return (
    <section
      className="surface-elevated overflow-hidden animate-fade-in"
      aria-labelledby="ai-discovery-title"
    >
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center gap-3"
        style={{ borderColor: CSS_COLORS.border }}
      >
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
        {messagesWithHandlers.map((message) => (
          <MessageBubble key={message.id} message={message} isUser={message.isUser} />
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
