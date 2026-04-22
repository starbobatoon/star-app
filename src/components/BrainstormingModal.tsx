'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  type CSSProperties,
  type FormEvent,
} from 'react';
import {
  colors,
  spacing,
  radius,
  typography,
  glassmorphism,
  elevation,
} from '@/lib/design-tokens';

// ─── Props ────────────────────────────────────────────────────────

export interface BrainstormingModalProps {
  /** The ID of the question being brainstormed. */
  questionId: string;
  /** The question text shown as context in the modal header. */
  questionText: string;
  /** The current answer already in the field (pre-populated for context). */
  currentAnswer: string;
  /** Called when the user taps "Use this answer" with the chosen AI response. */
  onUseAnswer: (answer: string) => void;
  /** Called when the modal requests to close. */
  onClose: () => void;
  /** Whether the modal is currently open. */
  isOpen: boolean;
}

// ─── Types ────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  isStreaming?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────

/**
 * BrainstormingModal — conversational AI brainstorming overlay.
 *
 * Opens on top of the questionnaire when the user taps "Help me brainstorm."
 * Provides a chat UI with mock SSE streaming. AI messages use Electric Indigo,
 * user messages use Soft Gold. Glass-style modal with backdrop-blur-12.
 * "Use this answer" closes the modal and populates the active question field.
 * Esc key closes.
 */
export function BrainstormingModal({
  questionId,
  questionText,
  currentAnswer,
  onUseAnswer,
  onClose,
  isOpen,
}: BrainstormingModalProps) {
  // ── State ─────────────────────────────────────────────────────

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Scroll to bottom on new messages ──────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking, streamingText]);

  // ── Focus input when modal opens ──────────────────────────────

  useEffect(() => {
    if (isOpen) {
      // Small delay so the DOM is painted
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ── Lock body scroll ─────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ── Esc to close ──────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // ── Mock SSE streaming ───────────────────────────────────────

  const mockAiResponse = useCallback(
    (userMessage: string) => {
      setIsAiThinking(true);

      // Simulate a brief "thinking" delay
      const thinkDelay = 800 + Math.random() * 600;

      setTimeout(() => {
        setIsAiThinking(false);

        // Mock AI responses based on the question context
        const responses = getMockResponses(questionText, userMessage, currentAnswer);
        const fullText = responses[Math.floor(Math.random() * responses.length)];

        // Stream the response character by character
        let charIndex = 0;
        const streamId = `ai-${Date.now()}`;

        setMessages((prev) => [
          ...prev,
          { id: streamId, role: 'ai', text: '', isStreaming: true },
        ]);

        const streamInterval = setInterval(() => {
          charIndex += 1;
          const partial = fullText.slice(0, charIndex);
          setStreamingText(partial);

          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamId ? { ...m, text: partial } : m,
            ),
          );

          if (charIndex >= fullText.length) {
            clearInterval(streamInterval);
            setStreamingText('');
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamId ? { ...m, isStreaming: false } : m,
              ),
            );
          }
        }, 18); // ~55 chars/sec — natural reading speed
      }, thinkDelay);
    },
    [questionText, currentAnswer],
  );

  // ── Send message ─────────────────────────────────────────────

  const handleSend = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed || isAiThinking) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmed,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      mockAiResponse(trimmed);
    },
    [inputValue, isAiThinking, mockAiResponse],
  );

  // ── Use this answer ──────────────────────────────────────────

  const handleUseAnswer = useCallback(
    (text: string) => {
      onUseAnswer(text);
      onClose();
    },
    [onUseAnswer, onClose],
  );

  // ── Reset on close ────────────────────────────────────────────

  const handleClose = useCallback(() => {
    setMessages([]);
    setInputValue('');
    setIsAiThinking(false);
    setStreamingText('');
    onClose();
  }, [onClose]);

  // ── Early return if not open ──────────────────────────────────

  if (!isOpen) return null;

  // ── Styles ────────────────────────────────────────────────────

  const backdropStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle: CSSProperties = {
    backdropFilter: `blur(${glassmorphism.backdropBlur})`,
    WebkitBackdropFilter: `blur(${glassmorphism.backdropBlur})`,
    backgroundColor: glassmorphism.background,
    border: glassmorphism.border,
    borderRadius: radius.xl,
    width: '92%',
    maxWidth: '680px',
    height: '80vh',
    maxHeight: '720px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: `0 0 0 1px ${elevation.accent}`,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${spacing.md} ${spacing.lg}`,
    borderBottom: `1px solid ${colors.outlineVariant}`,
    flexShrink: 0,
  };

  const headerTitleStyle: CSSProperties = {
    fontFamily: `var(${typography.uiLabel.fontFamily})`,
    fontSize: typography.uiLabel.fontSize,
    fontWeight: typography.uiLabel.fontWeight,
    letterSpacing: typography.uiLabel.letterSpacing,
    color: colors.secondary, // Electric Indigo
    textTransform: 'uppercase',
    margin: 0,
  };

  const headerSubtitleStyle: CSSProperties = {
    fontFamily: `var(${typography.caption.fontFamily})`,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    lineHeight: typography.caption.lineHeight,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  };

  const closeBtnStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    color: colors.onSurfaceVariant,
    fontSize: '20px',
    cursor: 'pointer',
    padding: spacing.xs,
    lineHeight: 1,
    borderRadius: radius.DEFAULT,
    transition: 'color 0.2s ease',
  };

  const chatAreaStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  };

  const aiBubbleStyle: CSSProperties = {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    backgroundColor: `${colors.secondaryContainer}`, // Indigo container
    border: `1px solid ${colors.onSecondaryFixedVariant}33`,
    borderRadius: `${radius.lg} ${radius.lg} ${radius.lg} 2px`,
    padding: `${spacing.md} ${spacing.lg}`,
    fontFamily: `var(${typography.transcriptBody.fontFamily})`,
    fontSize: typography.transcriptBody.fontSize,
    fontWeight: typography.transcriptBody.fontWeight,
    lineHeight: typography.transcriptBody.lineHeight,
    color: colors.secondary, // Electric Indigo text
  };

  const userBubbleStyle: CSSProperties = {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: `${colors.primaryContainer}44`, // Soft Gold container w/ alpha
    border: `1px solid ${colors.primaryContainer}55`,
    borderRadius: `${radius.lg} ${radius.lg} 2px ${radius.lg}`,
    padding: `${spacing.md} ${spacing.lg}`,
    fontFamily: `var(${typography.uiBody.fontFamily})`,
    fontSize: typography.uiBody.fontSize,
    fontWeight: typography.uiBody.fontWeight,
    lineHeight: typography.uiBody.lineHeight,
    color: colors.primary, // Soft Gold text
  };

  const avatarStyle: CSSProperties = {
    width: '28px',
    height: '28px',
    borderRadius: radius.full,
    backgroundColor: colors.secondaryContainer,
    border: `1px solid ${colors.onSecondaryFixedVariant}44`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontFamily: `var(${typography.caption.fontFamily})`,
    fontSize: '13px',
    color: colors.secondary,
  };

  const typingIndicatorStyle: CSSProperties = {
    alignSelf: 'flex-start',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.md}`,
    color: colors.secondary,
    fontFamily: `var(${typography.caption.fontFamily})`,
    fontSize: typography.caption.fontSize,
    fontStyle: 'italic',
  };

  const dotStyle: CSSProperties = {
    width: '6px',
    height: '6px',
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    animation: 'typingBounce 1.2s infinite ease-in-out both',
  };

  const footerStyle: CSSProperties = {
    padding: `${spacing.md} ${spacing.lg}`,
    borderTop: `1px solid ${colors.outlineVariant}`,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  };

  const inputRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  };

  const inputStyle: CSSProperties = {
    flex: 1,
    fontFamily: `var(${typography.uiBody.fontFamily})`,
    fontSize: typography.uiBody.fontSize,
    fontWeight: typography.uiBody.fontWeight,
    lineHeight: typography.uiBody.lineHeight,
    color: colors.onSurface,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${colors.outlineVariant}`,
    padding: `${spacing.sm} 0`,
    outline: 'none',
    caretColor: colors.secondary,
    transition: 'border-bottom-color 0.2s ease',
  };

  const sendBtnStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    color: colors.secondary,
    cursor: inputValue.trim() && !isAiThinking ? 'pointer' : 'not-allowed',
    fontSize: '20px',
    padding: spacing.xs,
    opacity: inputValue.trim() && !isAiThinking ? 1 : 0.4,
    transition: 'color 0.2s ease, opacity 0.2s ease',
  };

  const useAnswerBtnStyle: CSSProperties = {
    fontFamily: `var(${typography.uiLabel.fontFamily})`,
    fontSize: typography.uiLabel.fontSize,
    fontWeight: typography.uiLabel.fontWeight,
    letterSpacing: typography.uiLabel.letterSpacing,
    backgroundColor: colors.primary,
    color: colors.onPrimary,
    border: 'none',
    borderRadius: radius.full,
    padding: `${spacing.sm} ${spacing.lg}`,
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    transition: 'background-color 0.2s ease',
  };

  // ── Find the last completed AI message for "Use this answer" ─

  const lastAiMessage = [...messages]
    .reverse()
    .find((m) => m.role === 'ai' && !m.isStreaming);

  // ── Render ────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }
      `}</style>

      {/* Backdrop */}
      <div
        style={backdropStyle}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
        role="presentation"
      >
        {/* Glass Modal */}
        <div style={modalStyle} role="dialog" aria-modal="true" aria-label="Brainstorming Mode">
          {/* ── Header ─────────────────────────────────────── */}
          <div style={headerStyle}>
            <div>
              <p style={headerTitleStyle}>Brainstorm</p>
              <p style={headerSubtitleStyle}>{questionText}</p>
            </div>
            <button
              style={closeBtnStyle}
              onClick={handleClose}
              aria-label="Close brainstorming modal"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.onSurface;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.onSurfaceVariant;
              }}
            >
              ✕
            </button>
          </div>

          {/* ── Chat Area ───────────────────────────────────── */}
          <div style={chatAreaStyle}>
            {/* Welcome message when empty */}
            {messages.length === 0 && !isAiThinking && (
              <div style={{ textAlign: 'center', padding: spacing.xl }}>
                <div
                  style={{
                    ...avatarStyle,
                    width: '48px',
                    height: '48px',
                    margin: '0 auto',
                    marginBottom: spacing.md,
                    fontSize: '22px',
                  }}
                >
                  ✦
                </div>
                <p
                  style={{
                    fontFamily: `var(${typography.transcriptDisplay.fontFamily})`,
                    fontSize: typography.transcriptDisplay.fontSize,
                    fontWeight: typography.transcriptDisplay.fontWeight,
                    lineHeight: typography.transcriptDisplay.lineHeight,
                    color: colors.onSurface,
                    marginBottom: spacing.sm,
                  }}
                >
                  Let&apos;s think about this together.
                </p>
                <p
                  style={{
                    fontFamily: `var(${typography.uiBody.fontFamily})`,
                    fontSize: typography.uiBody.fontSize,
                    fontWeight: typography.uiBody.fontWeight,
                    lineHeight: typography.uiBody.lineHeight,
                    color: colors.onSurfaceVariant,
                  }}
                >
                  Describe your thoughts and I&apos;ll help you shape a strong answer.
                </p>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: spacing.sm,
                  alignItems: 'flex-start',
                  flexDirection: msg.role === 'ai' ? 'row' : 'row-reverse',
                }}
              >
                {/* Avatar */}
                {msg.role === 'ai' && (
                  <div style={avatarStyle}>✦</div>
                )}

                {/* Bubble */}
                <div style={msg.role === 'ai' ? aiBubbleStyle : userBubbleStyle}>
                  {msg.text}
                  {msg.isStreaming && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: '2px',
                        height: '1em',
                        backgroundColor: colors.secondary,
                        marginLeft: '2px',
                        verticalAlign: 'text-bottom',
                        animation: 'typingBounce 0.8s infinite ease-in-out both',
                      }}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isAiThinking && (
              <div style={typingIndicatorStyle}>
                <div style={avatarStyle}>✦</div>
                <span className="typing-dot" style={dotStyle} />
                <span className="typing-dot" style={dotStyle} />
                <span className="typing-dot" style={dotStyle} />
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ── Footer ──────────────────────────────────────── */}
          <div style={footerStyle}>
            {/* Use this answer button — shows when there's a completed AI message */}
            {lastAiMessage && (
              <button
                style={useAnswerBtnStyle}
                onClick={() => handleUseAnswer(lastAiMessage.text)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.primaryFixedDim;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.primary;
                }}
              >
                Use this answer
                <span style={{ fontSize: '16px' }}>↓</span>
              </button>
            )}

            {/* Input row */}
            <form onSubmit={handleSend} style={inputRowStyle}>
              <input
                ref={inputRef}
                style={inputStyle}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Share your thoughts..."
                disabled={isAiThinking}
                onFocus={(e) => {
                  e.currentTarget.style.borderBottomColor = colors.secondary;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderBottomColor = colors.outlineVariant;
                }}
              />
              <button
                type="submit"
                style={sendBtnStyle}
                disabled={!inputValue.trim() || isAiThinking}
                aria-label="Send message"
              >
                ↑
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default BrainstormingModal;

// ─── Mock Response Generator ──────────────────────────────────────

function getMockResponses(
  questionText: string,
  userMessage: string,
  currentAnswer: string,
): string[] {
  // Contextual mock responses that feel natural for a brainstorming AI
  const contextual = [
    `That's a strong starting point. Here's how I'd refine it: Think about the specific impact you want to have. Instead of staying general, narrow your focus to one vivid moment or decision that changed everything. That gives your answer both credibility and emotional weight. What part of your experience feels most essential to share?`,

    `I like where your head is at. Consider structuring your answer around a "before and after" — what was the situation, and what changed? That contrast is what makes any answer memorable. You could start with "${currentAnswer ? currentAnswer.slice(0, 40) : 'the moment you realized'}..." and build from there. Want me to draft a fuller version?`,

    `Good instinct. Here's a different angle: What if you answered this from the perspective of what you learned, not just what you did? The question "${questionText.slice(0, 60)}" is really asking about growth. Frame your response around a lesson, and it becomes a story rather than a list. Does that resonate?`,

    `Let me push you a bit. Your instinct is solid, but the strongest answers to this kind of question usually have three elements: a specific situation, the choice you made, and the result. Right now you have the situation. Can you tell me more about the choice and what happened next? That's where the real answer lives.`,

    `Here's a framework that might help: Answer the question in three sentences. First sentence: what you believe. Second: why you believe it. Third: what you did because of it. That forces clarity and eliminates filler. Based on what you've said, it might look something like this — try filling in the specifics and see if it feels right.`,
  ];

  return contextual;
}