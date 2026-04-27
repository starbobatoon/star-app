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
  questionId: string;
  questionText: string;
  currentAnswer: string;
  onUseAnswer: (answer: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

// ─── Types ────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  isStreaming?: boolean;
}

const MAX_EXCHANGES = 5;

// ─── Component ─────────────────────────────────────────────────────

export function BrainstormingModal({
  questionId,
  questionText,
  currentAnswer,
  onUseAnswer,
  onClose,
  isOpen,
}: BrainstormingModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [streamError, setStreamError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Scroll to bottom on new messages ──────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  // ── Focus input when modal opens ──────────────────────────────

  useEffect(() => {
    if (isOpen) {
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
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Call real brainstorm API with SSE ─────────────────────────

  const callBrainstormApi = useCallback(
    async (historyMessages: Array<{ role: 'user' | 'assistant'; content: string }>) => {
      setIsAiThinking(true);
      setStreamError(null);

      const streamId = `ai-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: streamId, role: 'ai', text: '', isStreaming: true },
      ]);

      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/brainstorm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortRef.current.signal,
          body: JSON.stringify({
            questionId,
            questionText,
            currentAnswer,
            messages: historyMessages,
          }),
        });

        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;

            if (trimmed.startsWith('event: error')) continue;

            if (trimmed.startsWith('data: ')) {
              const payload = trimmed.slice(6);
              if (payload === '[DONE]') continue;

              // Check if it's an error event
              try {
                const parsed = JSON.parse(payload);
                if (parsed?.error) {
                  setStreamError(parsed.error);
                  continue;
                }
                // String chunk
                if (typeof parsed === 'string') {
                  fullText += parsed;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === streamId ? { ...m, text: fullText } : m,
                    ),
                  );
                }
              } catch {
                // plain string, not JSON
                fullText += payload;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamId ? { ...m, text: fullText } : m,
                  ),
                );
              }
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamId ? { ...m, isStreaming: false } : m,
          ),
        );
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : 'Connection error';
        setStreamError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== streamId));
      } finally {
        setIsAiThinking(false);
      }
    },
    [questionId, questionText, currentAnswer],
  );

  // ── Send message ─────────────────────────────────────────────

  const handleSend = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed || isAiThinking) return;

      const newCount = exchangeCount + 1;
      setExchangeCount(newCount);

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmed,
      };

      setMessages((prev) => {
        const updated = [...prev, userMsg];
        // Build history for API call
        const history: Array<{ role: 'user' | 'assistant'; content: string }> = updated
          .filter((m) => !m.isStreaming)
          .map((m) => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.text,
          }));

        // Kick off API call asynchronously
        setTimeout(() => callBrainstormApi(history), 0);
        return updated;
      });

      setInputValue('');
    },
    [inputValue, isAiThinking, exchangeCount, callBrainstormApi],
  );

  // ── Use this answer ──────────────────────────────────────────

  const handleUseAnswer = useCallback(
    (text: string) => {
      onUseAnswer(text);
      handleClose();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onUseAnswer],
  );

  // ── Reset on close ────────────────────────────────────────────

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setInputValue('');
    setIsAiThinking(false);
    setExchangeCount(0);
    setStreamError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  // ── Derived state ─────────────────────────────────────────────

  const lastAiMessage = [...messages]
    .reverse()
    .find((m) => m.role === 'ai' && !m.isStreaming);

  const reachedLimit = exchangeCount >= MAX_EXCHANGES;

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
    backgroundColor: `${colors.secondaryContainer}`,
    border: `1px solid ${colors.onSecondaryFixedVariant}33`,
    borderRadius: `${radius.lg} ${radius.lg} ${radius.lg} 2px`,
    padding: `${spacing.md} ${spacing.lg}`,
    fontFamily: `var(${typography.transcriptBody.fontFamily})`,
    fontSize: typography.transcriptBody.fontSize,
    fontWeight: typography.transcriptBody.fontWeight,
    lineHeight: typography.transcriptBody.lineHeight,
    color: colors.secondary,
    whiteSpace: 'pre-wrap',
  };

  const userBubbleStyle: CSSProperties = {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: `${colors.primaryContainer}44`,
    border: `1px solid ${colors.primaryContainer}55`,
    borderRadius: `${radius.lg} ${radius.lg} 2px ${radius.lg}`,
    padding: `${spacing.md} ${spacing.lg}`,
    fontFamily: `var(${typography.uiBody.fontFamily})`,
    fontSize: typography.uiBody.fontSize,
    fontWeight: typography.uiBody.fontWeight,
    lineHeight: typography.uiBody.lineHeight,
    color: colors.primary,
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

  const footerStyle: CSSProperties = {
    padding: `${spacing.md} ${spacing.lg}`,
    borderTop: `1px solid ${colors.outlineVariant}`,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  };

  const inputStyle: CSSProperties = {
    flex: 1,
    fontFamily: `var(${typography.uiBody.fontFamily})`,
    fontSize: typography.uiBody.fontSize,
    color: colors.onSurface,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${colors.outlineVariant}`,
    padding: `${spacing.sm} 0`,
    outline: 'none',
    caretColor: colors.secondary,
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

      <div
        style={backdropStyle}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        role="presentation"
      >
        <div style={modalStyle} role="dialog" aria-modal="true" aria-label="Brainstorming Mode">

          {/* ── Header ─────────────────────────────────────── */}
          <div style={headerStyle}>
            <div>
              <p style={{
                fontFamily: `var(${typography.uiLabel.fontFamily})`,
                fontSize: typography.uiLabel.fontSize,
                fontWeight: typography.uiLabel.fontWeight,
                letterSpacing: typography.uiLabel.letterSpacing,
                color: colors.secondary,
                textTransform: 'uppercase',
                margin: 0,
              }}>
                Brainstorm
                {exchangeCount > 0 && (
                  <span style={{ opacity: 0.6, marginLeft: spacing.sm }}>
                    {exchangeCount}/{MAX_EXCHANGES}
                  </span>
                )}
              </p>
              <p style={{
                fontFamily: `var(${typography.caption.fontFamily})`,
                fontSize: typography.caption.fontSize,
                color: colors.onSurfaceVariant,
                marginTop: spacing.xs,
                maxWidth: 420,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {questionText}
              </p>
            </div>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: colors.onSurfaceVariant,
                fontSize: '20px',
                cursor: 'pointer',
                padding: spacing.xs,
              }}
              onClick={handleClose}
              aria-label="Close brainstorming modal"
            >
              ✕
            </button>
          </div>

          {/* ── Chat Area ───────────────────────────────────── */}
          <div style={chatAreaStyle}>
            {messages.length === 0 && !isAiThinking && (
              <div style={{ textAlign: 'center', padding: spacing.xl }}>
                <div style={{
                  ...avatarStyle,
                  width: '48px',
                  height: '48px',
                  margin: '0 auto',
                  marginBottom: spacing.md,
                  fontSize: '22px',
                }}>
                  ✦
                </div>
                <p style={{
                  fontFamily: `var(${typography.transcriptDisplay.fontFamily})`,
                  fontSize: typography.transcriptDisplay.fontSize,
                  fontWeight: typography.transcriptDisplay.fontWeight,
                  color: colors.onSurface,
                  marginBottom: spacing.sm,
                }}>
                  Let&apos;s think about this together.
                </p>
                <p style={{
                  fontFamily: `var(${typography.uiBody.fontFamily})`,
                  fontSize: typography.uiBody.fontSize,
                  color: colors.onSurfaceVariant,
                }}>
                  Share your thoughts and I&apos;ll help you shape a strong answer.
                </p>
              </div>
            )}

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
                {msg.role === 'ai' && <div style={avatarStyle}>✦</div>}
                <div style={msg.role === 'ai' ? aiBubbleStyle : userBubbleStyle}>
                  {msg.text}
                  {msg.isStreaming && (
                    <span style={{
                      display: 'inline-block',
                      width: '2px',
                      height: '1em',
                      backgroundColor: colors.secondary,
                      marginLeft: '2px',
                      verticalAlign: 'text-bottom',
                      animation: 'typingBounce 0.8s infinite ease-in-out both',
                    }} />
                  )}
                </div>
              </div>
            ))}

            {isAiThinking && (
              <div style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                padding: `${spacing.sm} ${spacing.md}`,
                color: colors.secondary,
              }}>
                <div style={avatarStyle}>✦</div>
                <span className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: radius.full, backgroundColor: colors.secondary, animation: 'typingBounce 1.2s infinite ease-in-out both' }} />
                <span className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: radius.full, backgroundColor: colors.secondary, animation: 'typingBounce 1.2s infinite ease-in-out both', animationDelay: '0.15s' }} />
                <span className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: radius.full, backgroundColor: colors.secondary, animation: 'typingBounce 1.2s infinite ease-in-out both', animationDelay: '0.3s' }} />
              </div>
            )}

            {streamError && (
              <div style={{
                backgroundColor: `${colors.error}15`,
                border: `1px solid ${colors.error}`,
                borderRadius: radius.DEFAULT,
                padding: spacing.sm,
                color: colors.error,
                fontSize: '13px',
              }}>
                {streamError}
              </div>
            )}

            {reachedLimit && !isAiThinking && lastAiMessage && (
              <div style={{
                alignSelf: 'flex-start',
                backgroundColor: `${colors.primary}15`,
                border: `1px solid ${colors.primary}33`,
                borderRadius: radius.DEFAULT,
                padding: spacing.md,
                fontSize: '13px',
                color: colors.onSurfaceVariant,
                fontStyle: 'italic',
              }}>
                We&apos;ve had a great conversation. Ready to use an answer? Click &ldquo;Use this answer&rdquo; below, or keep chatting.
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ── Footer ──────────────────────────────────────── */}
          <div style={footerStyle}>
            {lastAiMessage && (
              <button
                style={useAnswerBtnStyle}
                onClick={() => handleUseAnswer(lastAiMessage.text)}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.primaryFixedDim; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.primary; }}
              >
                Use this answer ↓
              </button>
            )}

            <form
              onSubmit={handleSend}
              style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}
            >
              <input
                ref={inputRef}
                style={inputStyle}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={reachedLimit ? "Keep chatting or use the answer above…" : "Share your thoughts…"}
                disabled={isAiThinking}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = colors.secondary; }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = colors.outlineVariant; }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isAiThinking}
                aria-label="Send message"
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.secondary,
                  cursor: inputValue.trim() && !isAiThinking ? 'pointer' : 'not-allowed',
                  fontSize: '20px',
                  padding: spacing.xs,
                  opacity: inputValue.trim() && !isAiThinking ? 1 : 0.4,
                }}
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
