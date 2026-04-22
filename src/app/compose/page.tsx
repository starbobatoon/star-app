"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { colors, typography, spacing, radius } from "@/lib/design-tokens";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { useVoiceInput } from "@/lib/voice-input";

// ─── Mock Questions (Wave 3 will replace with /api/questions) ──────
const MOCK_QUESTIONS = [
  "What is the occasion for this speech?",
  "Who is your audience? Describe them in detail.",
  "What is the core emotional message you want your audience to feel?",
  "What is the single most important takeaway you want the audience to remember?",
  "Describe a personal story or anecdote that illustrates your main point.",
  "What tone should the speech convey? (e.g., inspiring, solemn, celebratory, urgent)",
  "Are there any key phrases, quotes, or mottos you want included?",
  "What is the desired length of the speech?",
  "Is there anything you want to avoid saying or any sensitive topics to steer clear of?",
  "Anything else you want the AI to know before crafting your speech?",
];

// ─── Types ─────────────────────────────────────────────────────────
interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface DraftData {
  contact: ContactInfo;
  answers: Record<number, string>;
  currentStep: number;
}

interface SpeechStatus {
  id: string;
  status: string;
  transcript?: string;
  audioUrl?: string;
  createdAt?: string;
  completedAt?: string;
}

const STORAGE_KEY_PREFIX = "star-draft-";

// ─── Compose Nav Header ──────────────────────────────────────────
function ComposeNav() {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${spacing.md} ${spacing.lg}`,
        borderBottom: `1px solid ${colors.outlineVariant}`,
        backgroundColor: colors.surface.containerLow,
      }}
    >
      <a
        href="/"
        style={{
          ...typography.h2,
          color: colors.primary,
          fontSize: '20px',
          letterSpacing: '0.15em',
          textDecoration: 'none',
        }}
      >
        ELOCUTIONIST
      </a>
      <a
        href="/"
        style={{
          ...typography.uiLabel,
          color: colors.outline,
          textDecoration: 'none',
          letterSpacing: '0.05em',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = colors.primary; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = colors.outline; }}
      >
        Home
      </a>
    </header>
  );
}

// ─── Play Icon Component ─────────────────────────────────────────
function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="currentColor" />
    </svg>
  );
}

// ─── Countdown Timer Component ───────────────────────────────────
function CountdownTimer({ startSeconds, onComplete }: { startSeconds: number; onComplete?: () => void }) {
  const [seconds, setSeconds] = useState(startSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      onComplete?.();
      return;
    }
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          onComplete?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds, onComplete]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <span style={{ fontFamily: 'var(--font-inter)', fontSize: '48px', fontWeight: 600, color: colors.primary }}>
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

// ─── Stand By Screen ─────────────────────────────────────────────
function StandByScreen({ email, speechId }: { email: string; speechId: string }) {
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll for speech status
  useEffect(() => {
    if (!speechId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/speeches/${speechId}/status`);
        if (!res.ok) throw new Error('Failed to fetch status');
        const data = await res.json();
        setSpeechStatus(data);
      } catch (e) {
        setError('Unable to check speech status. Please refresh the page.');
      }
    };

    // Poll immediately, then every 5 seconds
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [speechId]);

  // If transcript is available, show the speech viewer
  if (speechStatus?.transcript) {
    return <SpeechViewer speech={speechStatus} email={email} />;
  }

  return (
    <div style={pageStyle}>
      <ComposeNav />
      <div style={{ ...mainContentStyle, textAlign: 'center' as const, maxWidth: 560 }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.secondary}22, ${colors.primary}22)`,
          border: `2px solid ${colors.outlineVariant}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <span style={{ fontSize: '28px' }}>✍️</span>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.02); }
          }
        `}</style>

        <h1 style={{ ...typography.h1, color: colors.onSurface, fontSize: '28px', marginBottom: spacing.lg }}>
          Your Speech Is Being Written
        </h1>

        <div style={{ marginBottom: spacing.lg }}>
          <CountdownTimer startSeconds={120} />
        </div>

        <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant, marginBottom: spacing.md }}>
          We&apos;re crafting your personalized speech now. This typically takes 2-3 minutes.
        </p>

        <p style={{ ...typography.caption, color: colors.outline }}>
          If you have somewhere to be, don&apos;t worry — we&apos;ll also send this to you by email at <strong>{email}</strong> and text you when it&apos;s ready.
        </p>

        {error && (
          <p style={{ ...typography.caption, color: colors.error, marginTop: spacing.lg }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Speech Viewer Component ─────────────────────────────────────
function SpeechViewer({ speech, email }: { speech: SpeechStatus; email: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudio = () => {
    if (!speech.audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(speech.audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div style={pageStyle}>
      <ComposeNav />
      <div style={{ ...mainContentStyle, maxWidth: 720 }}>
        <div style={{ marginBottom: spacing.xl }}>
          <span style={{ ...typography.uiLabel, color: colors.outline }}>YOUR SPEECH IS READY</span>
          <h1 style={{ ...typography.h2, color: colors.onSurface, marginTop: spacing.sm }}>
            Here&apos;s Your Personalized Speech
          </h1>
          <p style={{ ...typography.caption, color: colors.onSurfaceVariant, marginTop: spacing.xs }}>
            We&apos;ve also sent this to {email}
          </p>
        </div>

        <Card cardStyle={{ marginBottom: spacing.lg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
            <button
              onClick={toggleAudio}
              disabled={!speech.audioUrl}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: colors.primary,
                color: colors.onPrimary,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: speech.audioUrl ? 'pointer' : 'not-allowed',
                opacity: speech.audioUrl ? 1 : 0.5,
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => { if (speech.audioUrl) e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div>
              <div style={{ ...typography.uiLabel, color: colors.onSurface }}>
                {isPlaying ? 'Playing...' : 'Listen to Your Speech'}
              </div>
              <div style={{ ...typography.caption, color: colors.onSurfaceVariant }}>
                {speech.audioUrl ? 'Click to play audio version' : 'Audio generation in progress...'}
              </div>
            </div>
          </div>
        </Card>

        <div style={{
          background: colors.surface.container,
          borderRadius: radius.lg,
          padding: spacing.lg,
          border: `1px solid ${colors.outlineVariant}`,
        }}>
          <div style={{ ...typography.uiLabel, color: colors.secondary, marginBottom: spacing.md, textTransform: 'uppercase' as const }}>
            Transcript
          </div>
          <div
            style={{
              ...typography.transcriptBody,
              color: colors.onSurface,
              whiteSpace: 'pre-wrap',
              lineHeight: '1.8',
            }}
          >
            {speech.transcript}
          </div>
        </div>

        <div style={{ marginTop: spacing.xl, display: 'flex', gap: spacing.md, justifyContent: 'center' }}>
          <Button variant="secondary" onClick={() => window.location.href = '/'}>
            ← Back to Home
          </Button>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Create Another Speech
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Brainstorm Modal ────────────────────────────────────────────
interface BrainstormModalProps {
  question: string;
  currentAnswer: string;
  onApply: (text: string) => void;
  onClose: () => void;
}

function BrainstormModal({ question, currentAnswer, onApply, onClose }: BrainstormModalProps) {
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBrainstorm = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, currentAnswer }),
      });
      const data = await res.json();
      setSuggestion(data.suggestion || 'Try thinking about personal experiences that relate to this topic.');
    } catch {
      setSuggestion('Think about your audience. What would resonate with them most?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleBrainstorm();
  }, []);

  return (
    <Modal open onClose={onClose} title="Brainstorm Ideas">
      <div style={{ padding: spacing.md }}>
        <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant, marginBottom: spacing.md }}>
          <strong>Question:</strong> {question}
        </p>
        <div style={{ background: colors.surface.container, padding: spacing.md, borderRadius: radius.DEFAULT, marginBottom: spacing.md }}>
          {loading ? (
            <p style={{ ...typography.caption, color: colors.outline }}>Generating ideas...</p>
          ) : (
            <p style={{ ...typography.uiBody, color: colors.onSurface }}>{suggestion}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={handleBrainstorm} disabled={loading}>
            Try Another
          </Button>
          <Button variant="primary" onClick={() => onApply(suggestion)} disabled={loading || !suggestion}>
            Use This
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Question Input Component (with Voice) ───────────────────────
function QuestionInput({
  questionIndex,
  value,
  onChange,
}: {
  questionIndex: number;
  value: string;
  onChange: (val: string) => void;
}) {
  const { isListening, transcript, start, stop, isSupported, error } = useVoiceInput();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showListening, setShowListening] = useState(false);

  // When listening starts/stops, update UI state
  useEffect(() => {
    setShowListening(isListening);
  }, [isListening]);

  // When transcript changes from voice input, update the text
  useEffect(() => {
    if (transcript) {
      // Combine existing text with new transcript
      const separator = value.trim() && !value.endsWith(' ') ? ' ' : '';
      const newValue = value + separator + transcript;
      onChange(newValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  const handleMicClick = () => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  const isShortAnswer = questionIndex < 2;
  const textareaRows = isShortAnswer ? 3 : 6;

  return (
    <div style={inputAreaStyle}>
      <div style={textareaWrapperStyle}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Begin typing your thoughts here..."
          rows={textareaRows}
          spellCheck={false}
          style={textareaStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderBottomColor = colors.secondary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderBottomColor = colors.outlineVariant;
          }}
        />
        <div style={focusLineStyle} />

        {/* Listening indicator overlay */}
        {showListening && (
          <div style={listeningOverlayStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <div style={pulsingMicStyle}>
                <MicIcon active />
              </div>
              <span style={{ ...typography.uiLabel, color: colors.primary }}>Listening...</span>
            </div>
            <p style={{ ...typography.caption, color: colors.onSurfaceVariant, marginTop: spacing.sm }}>
              {transcript || 'Speak now'}
            </p>
          </div>
        )}
      </div>

      {/* Voice input button */}
      {isSupported ? (
        <button
          type="button"
          onClick={handleMicClick}
          style={{
            ...micButtonStyle,
            background: isListening ? colors.error : colors.surface.containerHigh,
            color: isListening ? colors.onError : colors.onSurfaceVariant,
          }}
          onMouseEnter={(e) => {
            if (!isListening) e.currentTarget.style.backgroundColor = colors.surface.containerHighest;
          }}
          onMouseLeave={(e) => {
            if (!isListening) e.currentTarget.style.backgroundColor = colors.surface.containerHigh;
          }}
          title={isListening ? 'Stop recording' : 'Use voice input'}
        >
          <MicIcon active={isListening} />
          {isListening ? 'Stop' : 'Voice'}
        </button>
      ) : (
        <div style={{ ...typography.caption, color: colors.outline, marginTop: spacing.sm }}>
          Voice input not supported in this browser
        </div>
      )}

      {error && (
        <div style={{ ...typography.caption, color: colors.error, marginTop: spacing.sm }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Mic Icon Component ──────────────────────────────────────────
function MicIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: active ? 'pulse 1s ease-in-out infinite' : undefined }}
    >
      <path
        d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.58 14.48 17 12 17s-4.52-2.42-4.93-5.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3.34 3.18 5.98 6.41 6.36V21c0 .55.45 1 1 1s1-.45 1-1v-2.5c3.23-.38 5.92-3.02 6.41-6.36.1-.6-.39-1.14-1-1.14z"
        fill="currentColor"
      />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function ComposePage() {
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState<ContactInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [brainstormStep, setBrainstormStep] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitComplete, setSubmitComplete] = useState(false);
  const [speechId, setSpeechId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totalSteps = MOCK_QUESTIONS.length + 1;
  const progressPercent = (step / totalSteps) * 100;

  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveDraft = useCallback(() => {
    if (!contact.email) return;
    try {
      const draft: DraftData = { contact, answers, currentStep: step };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${contact.email}`, JSON.stringify(draft));
    } catch {
      // Silent fail
    }
  }, [contact, answers, step]);

  useEffect(() => {
    if (!contact.email) return;
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${contact.email}`);
      if (!raw) return;
      const draft: DraftData = JSON.parse(raw);
      if (draft.contact.email === contact.email) {
        setContact((prev) => ({
          ...prev,
          firstName: draft.contact.firstName || prev.firstName,
          lastName: draft.contact.lastName || prev.lastName,
          phone: draft.contact.phone || prev.phone,
        }));
        setAnswers((prev) => ({ ...prev, ...draft.answers }));
        if (step === 0 && draft.currentStep > 0) {
          setStep(draft.currentStep);
        }
      }
    } catch {
      // Corrupt draft — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.email]);

  useEffect(() => {
    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setInterval(saveDraft, 2000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [saveDraft]);

  useEffect(() => {
    return () => saveDraft();
  }, [saveDraft]);

  const handleContactChange = (field: keyof ContactInfo, value: string) => {
    setContact((prev) => ({ ...prev, [field]: value }));
  };

  const handleAnswerChange = (questionIndex: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: value }));
  };

  const canProceedFromContact =
    contact.email.trim().length > 0 && contact.phone.trim().length > 0;

  const handleNext = () => {
    if (step < totalSteps) {
      saveDraft();
      setStep((s) => s + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 0) {
      saveDraft();
      setStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Prepare answers array
      const answersArray = MOCK_QUESTIONS.map((_, i) => ({
        questionId: i.toString(),
        answer: answers[i] || '',
      }));

      const res = await fetch('/api/speeches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact,
          answers: answersArray,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit speech');
      }

      // Clear draft on success
      if (contact.email) {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${contact.email}`);
      }

      setSpeechId(data.speech?.id || null);
      setSubmitComplete(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Stand By Screen (after submission) ─────────────────────────
  if (submitComplete && speechId) {
    return <StandByScreen email={contact.email} speechId={speechId} />;
  }

  // ─── Review Step ────────────────────────────────────────────────
  if (step === totalSteps) {
    return (
      <div style={pageStyle}>
        <ComposeNav />
        <ProgressBar value={100} height="2px" aria-label="Questionnaire progress" />
        <div style={mainContentStyle}>
          <div style={reviewHeaderStyle}>
            <span style={stepLabelStyle}>Review</span>
            <h1 style={reviewTitleStyle}>Review Your Answers</h1>
            <p style={reviewSubtitleStyle}>Look over your responses before submitting.</p>
          </div>
          <div style={reviewListStyle}>
            <Card>
              <h3 style={reviewSectionTitleStyle}>Contact Information</h3>
              <div style={reviewFieldStyle}>
                <span style={reviewLabelStyle}>Name</span>
                <span style={reviewValueStyle}>{contact.firstName} {contact.lastName}</span>
              </div>
              <div style={reviewFieldStyle}>
                <span style={reviewLabelStyle}>Email</span>
                <span style={reviewValueStyle}>{contact.email}</span>
              </div>
              {contact.phone && (
                <div style={reviewFieldStyle}>
                  <span style={reviewLabelStyle}>Phone</span>
                  <span style={reviewValueStyle}>{contact.phone}</span>
                </div>
              )}
            </Card>
            {MOCK_QUESTIONS.map((q, i) => (
              <Card key={i}>
                <p style={reviewQuestionStyle}>{q}</p>
                <p style={reviewAnswerStyle}>
                  {answers[i] || <em style={{ color: colors.onSurfaceVariant }}>No answer provided</em>}
                </p>
              </Card>
            ))}
          </div>
          {submitError && (
            <div style={{ color: colors.error, marginBottom: spacing.md, textAlign: 'center' }}>
              {submitError}
            </div>
          )}
          <div style={navStyle}>
            <Button variant="secondary" onClick={handlePrevious} disabled={isSubmitting}>
              ← Back
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>
              Submit Speech
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Contact Step (Step 0) ─────────────────────────────────────
  if (step === 0) {
    return (
      <div style={pageStyle}>
        <ComposeNav />
        <ProgressBar value={progressPercent} height="2px" aria-label="Questionnaire progress" />
        <div style={mainContentStyle}>
          <div style={questionAreaStyle}>
            <span style={stepLabelStyle}>Step 1 of {totalSteps}</span>
            <h1 style={questionTitleStyle}>Tell us about yourself</h1>
            <p style={questionSubtitleStyle}>
              We need a few details to save your progress and deliver your speech.
            </p>
            <Card cardStyle={{ marginTop: spacing.lg }}>
              <div style={contactGridStyle}>
                <div style={contactFieldStyle}>
                  <Input
                    label="First Name"
                    placeholder="First name"
                    value={contact.firstName}
                    onChange={(e) => handleContactChange("firstName", e.target.value)}
                  />
                </div>
                <div style={contactFieldStyle}>
                  <Input
                    label="Last Name"
                    placeholder="Last name"
                    value={contact.lastName}
                    onChange={(e) => handleContactChange("lastName", e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginTop: spacing.md }}>
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={contact.email}
                  onChange={(e) => handleContactChange("email", e.target.value)}
                  error={contact.email.length === 0 ? false : !contact.email.includes("@")}
                  helperText={
                    contact.email.length > 0 && !contact.email.includes("@")
                      ? "Please enter a valid email address"
                      : "Required — we'll send your speech here"
                  }
                />
              </div>
              <div style={{ marginTop: spacing.md }}>
                <Input
                  label="Phone *"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={contact.phone}
                  onChange={(e) => handleContactChange("phone", e.target.value)}
                  required
                  helperText="Required — we'll text you when your speech is ready"
                />
              </div>
            </Card>
          </div>
          <div style={navStyle}>
            <div />
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceedFromContact}
            >
              Begin →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Question Steps (1–10) ──────────────────────────────────────
  const questionIndex = step - 1;
  const question = MOCK_QUESTIONS[questionIndex];
  const currentAnswer = answers[questionIndex] || "";

  return (
    <div style={pageStyle}>
      <ComposeNav />
      <ProgressBar value={progressPercent} height="2px" aria-label="Questionnaire progress" />
      <div style={mainContentStyle}>
        <div style={questionAreaStyle}>
          <span style={stepLabelStyle}>
            Question {step} of {totalSteps}
          </span>
          <h1 style={questionTitleStyle}>{question}</h1>
          <QuestionInput
            questionIndex={questionIndex}
            value={currentAnswer}
            onChange={(val) => handleAnswerChange(questionIndex, val)}
          />
        </div>
        <div style={navStyle}>
          <Button variant="secondary" onClick={handlePrevious}>
            ← Previous
          </Button>
          <Button variant="primary" onClick={handleNext}>
            {step === totalSteps - 1 ? "Review →" : "Next →"}
          </Button>
        </div>
      </div>
      {brainstormStep !== null && (
        <BrainstormModal
          question={MOCK_QUESTIONS[brainstormStep]}
          currentAnswer={answers[brainstormStep] || ""}
          onApply={(text) => {
            handleAnswerChange(brainstormStep, text);
            setBrainstormStep(null);
          }}
          onClose={() => setBrainstormStep(null)}
        />
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: colors.surface.containerLowest,
};

const mainContentStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: `${spacing.xl} ${spacing.lg} ${spacing.xxl}`,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.lg,
};

const questionAreaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
};

const stepLabelStyle: React.CSSProperties = {
  ...typography.uiLabel,
  color: colors.outline,
  textTransform: 'uppercase' as const,
};

const questionTitleStyle: React.CSSProperties = {
  ...typography.h2,
  color: colors.onSurface,
};

const questionSubtitleStyle: React.CSSProperties = {
  ...typography.uiBody,
  color: colors.onSurfaceVariant,
  marginTop: spacing.xs,
};

const inputAreaStyle: React.CSSProperties = {
  marginTop: spacing.md,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
};

const textareaWrapperStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '120px',
  padding: `${spacing.md}`,
  fontFamily: 'var(--font-inter)',
  fontSize: typography.uiBody.fontSize,
  lineHeight: '1.6',
  color: colors.onSurface,
  background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${colors.outlineVariant}`,
  borderRadius: 0,
  outline: 'none',
  resize: 'vertical' as const,
};

const focusLineStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '100%',
  height: '1px',
  background: colors.secondary,
  transform: 'scaleX(0)',
  transformOrigin: 'left',
  transition: 'transform 0.3s ease',
};

const listeningOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '8px',
  left: '8px',
  right: '8px',
  background: colors.surface.containerHigh,
  border: `1px solid ${colors.primary}`,
  borderRadius: radius.md,
  padding: spacing.md,
  display: 'flex',
  flexDirection: 'column',
};

const pulsingMicStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: colors.primary,
  color: colors.onPrimary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'pulse 1.5s ease-in-out infinite',
};

const micButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: spacing.xs,
  padding: `${spacing.xs} ${spacing.sm}`,
  borderRadius: radius.DEFAULT,
  border: 'none',
  cursor: 'pointer',
  ...typography.uiLabel,
  transition: 'background-color 0.2s ease',
  alignSelf: 'flex-start',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: spacing.lg,
};

const contactGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: spacing.md,
};

const contactFieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const reviewHeaderStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  marginBottom: spacing.lg,
};

const reviewTitleStyle: React.CSSProperties = {
  ...typography.h2,
  color: colors.onSurface,
  marginTop: spacing.sm,
};

const reviewSubtitleStyle: React.CSSProperties = {
  ...typography.uiBody,
  color: colors.onSurfaceVariant,
  marginTop: spacing.xs,
};

const reviewListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
};

const reviewSectionTitleStyle: React.CSSProperties = {
  ...typography.uiLabel,
  color: colors.outline,
  marginBottom: spacing.sm,
  textTransform: 'uppercase' as const,
};

const reviewFieldStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: `${spacing.xs} 0`,
  borderBottom: `1px solid ${colors.surface.containerHigh}`,
};

const reviewLabelStyle: React.CSSProperties = {
  ...typography.uiLabel,
  color: colors.onSurfaceVariant,
};

const reviewValueStyle: React.CSSProperties = {
  ...typography.uiBody,
  color: colors.onSurface,
  textAlign: 'right' as const,
};

const reviewQuestionStyle: React.CSSProperties = {
  ...typography.uiLabel,
  color: colors.secondary,
  marginBottom: spacing.xs,
};

const reviewAnswerStyle: React.CSSProperties = {
  ...typography.uiBody,
  color: colors.onSurface,
};
