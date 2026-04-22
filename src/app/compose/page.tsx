"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { colors, typography, spacing, radius } from "@/lib/design-tokens";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { useVoiceInput } from "@/lib/voice-input";

// ─── Questions fetched from API ──────────────────────────────────
interface ApiQuestion {
  id: string;
  question_text: string;
  feeds_section: string;
  is_required: boolean;
  display_order: number;
}

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

const STORAGE_KEY_PREFIX = "star-draft-";

// ─── Main Component ───────────────────────────────────────────────
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
        STAR
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

export default function ComposePage() {
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState<ContactInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showBrainstorm, setShowBrainstorm] = useState(false);
  const [brainstormStep, setBrainstormStep] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitComplete, setSubmitComplete] = useState(false);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Fetch questions from API on mount
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch('/api/questions');
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions || []);
        }
      } catch (err) {
        console.error('[Compose] Failed to load questions:', err);
      } finally {
        setQuestionsLoading(false);
      }
    }
    loadQuestions();
  }, []);

  const totalSteps = questions.length + 1; // +1 for contact step
  const progressPercent = (step / totalSteps) * 100;

  // Auto-save draft every 2 seconds, keyed by email
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveDraft = useCallback(() => {
    if (!contact.email) return;
    try {
      const draft: DraftData = { contact, answers, currentStep: step };
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${contact.email}`,
        JSON.stringify(draft)
      );
    } catch {
      // localStorage may be full or unavailable — silent fail
    }
  }, [contact, answers, step]);

  // Load draft on mount (when email changes)
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
        // Only restore step if user hasn't started navigating yet
        if (step === 0 && draft.currentStep > 0) {
          setStep(draft.currentStep);
        }
      }
    } catch {
      // Corrupt draft — ignore
    }
    // Only run when email changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.email]);

  // Auto-save interval
  useEffect(() => {
    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setInterval(saveDraft, 2000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [saveDraft]);

  // Save on unmount
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

  const canProceedFromQuestion = (idx: number) => {
    // All questions are optional for now — allow proceeding with empty answers
    return true;
  };

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
    try {
      // Mock API call — Wave 3 will replace with real POST to /api/speeches
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // Clear draft on successful submit
      if (contact.email) {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${contact.email}`);
      }
      setSubmitComplete(true);
    } catch {
      // Handle error in Wave 3
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Success Screen ────────────────────────────────────────────
  if (submitComplete) {
    return (
      <div style={pageStyle}>
        <ComposeNav />
        <div style={mainContentStyle}>
          <div style={{ textAlign: "center" as const, maxWidth: 480 }}>
            <div style={successIconStyle}>✓</div>
            <h1 style={successTitleStyle}>Speech Submitted</h1>
            <p style={successBodyStyle}>
              Your responses have been received. We&apos;ll craft a compelling
              5-minute speech based on your answers and deliver it to{" "}
              <strong>{contact.email}</strong>.
            </p>
            <Button variant="primary" fullWidth onClick={() => window.location.reload()}>
              Start a New Speech
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading State ──────────────────────────────────────────────
  if (questionsLoading) {
    return (
      <div style={pageStyle}>
        <ComposeNav />
        <div style={mainContentStyle}>
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant }}>
              Loading questions...
            </p>
          </div>
        </div>
      </div>
    );
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
            <p style={reviewSubtitleStyle}>
              Look over your responses before submitting.
            </p>
          </div>
          <div style={reviewListStyle}>
            <Card>
              <h3 style={reviewSectionTitleStyle}>Contact Information</h3>
              <div style={reviewFieldStyle}>
                <span style={reviewLabelStyle}>Name</span>
                <span style={reviewValueStyle}>
                  {contact.firstName} {contact.lastName}
                </span>
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
            {questions.map((q, i) => (
              <Card key={q.id || i}>
                <p style={reviewQuestionStyle}>{q.question_text}</p>
                <p style={reviewAnswerStyle}>
                  {answers[i] || <em style={{ color: colors.onSurfaceVariant }}>No answer provided</em>}
                </p>
              </Card>
            ))}
          </div>
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
  const question = questions[questionIndex]?.question_text || '';
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
          question={questions[brainstormStep]?.question_text || ''}
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

// ─── Question Input Component ────────────────────────────────────
function QuestionInput({
  questionIndex,
  value,
  onChange,
}: {
  questionIndex: number;
  value: string;
  onChange: (val: string) => void;
}) {
  const { isListening, transcript, start, stop, isSupported, error } =
    useVoiceInput();
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // When voice transcript changes, append to local value
  useEffect(() => {
    if (transcript && isListening) {
      const separator = localValue.trim() ? " " : "";
      setLocalValue((prev) => prev + separator + transcript);
      onChange(localValue + separator + transcript);
    }
    // Only react to transcript changes while listening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    onChange(e.target.value);
  };

  const handleMicToggle = () => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  // Determine if this is a short-answer question (first few) vs long-answer
  const isShortAnswer = questionIndex < 2;
  const textareaRows = isShortAnswer ? 3 : 6;

  return (
    <div style={inputAreaStyle}>
      <div style={textareaWrapperStyle}>
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleTextChange}
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
      </div>

      {/* Mic + Brainstorm row */}
      <div style={actionRowStyle}>
        {isSupported && (
          <button
            onClick={handleMicToggle}
            style={micButtonStyle(isListening)}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            title={isListening ? "Stop recording" : "Record your answer"}
          >
            {isListening ? "⏹ Stop" : "🎤 Voice"}
          </button>
        )}
        {error && (
          <span style={voiceErrorStyle}>{error}</span>
        )}
      </div>
    </div>
  );
}

// ─── Brainstorm Modal ─────────────────────────────────────────────
function BrainstormModal({
  question,
  currentAnswer,
  onApply,
  onClose,
}: {
  question: string;
  currentAnswer: string;
  onApply: (text: string) => void;
  onClose: () => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock brainstorm generation — Wave 3 will call /api/brainstorm
  useEffect(() => {
    const timer = setTimeout(() => {
      setSuggestions([
        "Think about a time when you felt this emotion strongly — what happened?",
        "Consider your audience's perspective — what would move them?",
        "Start with a vivid image or story, then connect it to your message.",
        "What would you say if you were talking to just one person in the audience?",
        "Jot down 3 keywords that capture the feeling you want to convey.",
      ]);
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [customNote, setCustomNote] = useState("");

  const toggleSuggestion = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleApply = () => {
    const parts: string[] = [];
    if (currentAnswer.trim()) parts.push(currentAnswer.trim());
    selected.forEach((idx) => parts.push(suggestions[idx]));
    if (customNote.trim()) parts.push(customNote.trim());
    onApply(parts.join("\n\n"));
  };

  return (
    <Modal open onClose={onClose} title="Brainstorm Ideas">
      <div style={{ padding: spacing.lg }}>
        <p style={{ color: colors.onSurfaceVariant, marginBottom: spacing.md }}>
          {question}
        </p>
        {loading ? (
          <div style={{ textAlign: "center" as const, padding: spacing.xl }}>
            <p style={{ color: colors.onSurfaceVariant }}>Generating ideas...</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => toggleSuggestion(i)}
                  style={suggestionStyle(selected.has(i))}
                >
                  <span style={{ marginRight: spacing.sm }}>
                    {selected.has(i) ? "✓" : "○"}
                  </span>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ marginTop: spacing.lg }}>
              <Input
                label="Add your own idea"
                placeholder="Type a thought or note..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
              />
            </div>
            <div style={{ marginTop: spacing.lg, display: "flex", justifyContent: "flex-end", gap: spacing.sm }}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={handleApply}>
                Apply Selected
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: colors.surface.base,
  color: colors.onSurface,
  display: "flex",
  flexDirection: "column",
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  width: "100%",
  maxWidth: 720,
  margin: "0 auto",
  paddingLeft: spacing.md,
  paddingRight: spacing.md,
  paddingTop: spacing.xxl,
  paddingBottom: spacing.xxl,
  display: "flex",
  flexDirection: "column",
};

const questionAreaStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const stepLabelStyle: React.CSSProperties = {
  fontFamily: `var(${typography.uiLabel.fontFamily})`,
  fontSize: typography.uiLabel.fontSize,
  fontWeight: typography.uiLabel.fontWeight,
  letterSpacing: typography.uiLabel.letterSpacing,
  lineHeight: typography.uiLabel.lineHeight,
  color: colors.onSurfaceVariant,
  textTransform: "uppercase",
  display: "block",
  marginBottom: spacing.md,
};

const questionTitleStyle: React.CSSProperties = {
  fontFamily: `var(${typography.h2.fontFamily})`,
  fontSize: typography.h2.fontSize,
  fontWeight: typography.h2.fontWeight,
  lineHeight: typography.h2.lineHeight,
  letterSpacing: typography.h2.letterSpacing,
  color: colors.onSurface,
  maxWidth: "40rem",
  marginBottom: spacing.xl,
};

const questionSubtitleStyle: React.CSSProperties = {
  fontFamily: `var(${typography.uiBody.fontFamily})`,
  fontSize: typography.uiBody.fontSize,
  fontWeight: typography.uiBody.fontWeight,
  lineHeight: typography.uiBody.lineHeight,
  color: colors.onSurfaceVariant,
  marginTop: 0,
  marginBottom: spacing.md,
};

const inputAreaStyle: React.CSSProperties = {
  width: "100%",
};

const textareaWrapperStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "12rem",
  backgroundColor: `${colors.surface.dim}4D`,
  backdropFilter: "blur(4px)",
  border: "none",
  borderBottom: `1px solid ${colors.outlineVariant}`,
  color: colors.onSurface,
  fontFamily: `var(${typography.transcriptBody.fontFamily})`,
  fontSize: typography.transcriptBody.fontSize,
  fontWeight: typography.transcriptBody.fontWeight,
  lineHeight: typography.transcriptBody.lineHeight,
  letterSpacing: typography.transcriptBody.letterSpacing,
  padding: `${spacing.md} 0`,
  resize: "none" as const,
  outline: "none",
  transition: "border-bottom-color 0.2s ease",
  caretColor: colors.secondary,
};

const focusLineStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  width: "100%",
  height: "1px",
  backgroundColor: colors.primary,
  transform: "scaleX(0)",
  transformOrigin: "left",
  transition: "transform 0.3s ease",
};

const actionRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
  marginTop: spacing.md,
};

const micButtonStyle = (listening: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: spacing.xs,
  padding: `${spacing.sm} ${spacing.md}`,
  backgroundColor: listening ? colors.secondary : "transparent",
  color: listening ? colors.onSecondary : colors.onSurfaceVariant,
  border: `1px solid ${listening ? colors.secondary : colors.outlineVariant}`,
  borderRadius: radius.DEFAULT,
  fontFamily: `var(${typography.uiLabel.fontFamily})`,
  fontSize: typography.uiLabel.fontSize,
  fontWeight: typography.uiLabel.fontWeight,
  letterSpacing: typography.uiLabel.letterSpacing,
  cursor: "pointer",
  transition: "background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease",
  textTransform: "uppercase" as const,
});

const voiceErrorStyle: React.CSSProperties = {
  fontFamily: `var(${typography.caption.fontFamily})`,
  fontSize: typography.caption.fontSize,
  fontWeight: typography.caption.fontWeight,
  color: colors.error,
};

const contactGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: spacing.md,
};

const contactFieldStyle: React.CSSProperties = {
  minWidth: 0, // prevent grid blowout
};

const navStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  paddingTop: spacing.xl,
  marginTop: "auto",
  borderTop: `1px solid ${colors.outlineVariant}80`,
};

// Review step styles
const reviewHeaderStyle: React.CSSProperties = {
  marginBottom: spacing.xl,
};

const reviewTitleStyle: React.CSSProperties = {
  fontFamily: `var(${typography.h2.fontFamily})`,
  fontSize: typography.h2.fontSize,
  fontWeight: typography.h2.fontWeight,
  lineHeight: typography.h2.lineHeight,
  letterSpacing: typography.h2.letterSpacing,
  color: colors.onSurface,
  margin: 0,
};

const reviewSubtitleStyle: React.CSSProperties = {
  fontFamily: `var(${typography.uiBody.fontFamily})`,
  fontSize: typography.uiBody.fontSize,
  color: colors.onSurfaceVariant,
  marginTop: spacing.sm,
};

const reviewListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacing.md,
  maxHeight: "60vh",
  overflowY: "auto",
  paddingRight: spacing.xs,
};

const reviewSectionTitleStyle: React.CSSProperties = {
  fontFamily: `var(${typography.uiLabel.fontFamily})`,
  fontSize: typography.uiLabel.fontSize,
  fontWeight: typography.uiLabel.fontWeight,
  letterSpacing: typography.uiLabel.letterSpacing,
  textTransform: "uppercase" as const,
  color: colors.primary,
  marginTop: 0,
  marginBottom: spacing.md,
};

const reviewFieldStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  padding: `${spacing.xs} 0`,
  borderBottom: `1px solid ${colors.outlineVariant}40`,
};

const reviewLabelStyle: React.CSSProperties = {
  fontFamily: `var(${typography.uiLabel.fontFamily})`,
  fontSize: typography.uiLabel.fontSize,
  color: colors.onSurfaceVariant,
  textTransform: "uppercase" as const,
};

const reviewValueStyle: React.CSSProperties = {
  fontFamily: `var(${typography.uiBody.fontFamily})`,
  fontSize: typography.uiBody.fontSize,
  color: colors.onSurface,
  textAlign: "right" as const,
};

const reviewQuestionStyle: React.CSSProperties = {
  fontFamily: `var(${typography.uiLabel.fontFamily})`,
  fontSize: typography.uiLabel.fontSize,
  fontWeight: typography.uiLabel.fontWeight,
  letterSpacing: typography.uiLabel.letterSpacing,
  color: colors.onSurfaceVariant,
  textTransform: "uppercase" as const,
  marginTop: 0,
  marginBottom: spacing.sm,
};

const reviewAnswerStyle: React.CSSProperties = {
  fontFamily: `var(${typography.transcriptBody.fontFamily})`,
  fontSize: typography.transcriptBody.fontSize,
  lineHeight: typography.transcriptBody.lineHeight,
  color: colors.onSurface,
  whiteSpace: "pre-wrap" as const,
  margin: 0,
};

// Success screen styles
const successIconStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  backgroundColor: colors.primary,
  color: colors.onPrimary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 32,
  fontWeight: 700,
  margin: "0 auto",
  marginBottom: spacing.lg,
};

const successTitleStyle: React.CSSProperties = {
  fontFamily: `var(${typography.h1.fontFamily})`,
  fontSize: typography.h1.fontSize,
  fontWeight: typography.h1.fontWeight,
  lineHeight: typography.h1.lineHeight,
  letterSpacing: typography.h1.letterSpacing,
  color: colors.onSurface,
  margin: 0,
  marginBottom: spacing.md,
};

const successBodyStyle: React.CSSProperties = {
  fontFamily: `var(${typography.uiBody.fontFamily})`,
  fontSize: typography.uiBody.fontSize,
  lineHeight: typography.uiBody.lineHeight,
  color: colors.onSurfaceVariant,
  marginBottom: spacing.xl,
};

const suggestionStyle = (selected: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "flex-start",
  gap: spacing.sm,
  padding: spacing.md,
  backgroundColor: selected ? `${colors.secondary}20` : "transparent",
  border: `1px solid ${selected ? colors.secondary : colors.outlineVariant}`,
  borderRadius: radius.DEFAULT,
  cursor: "pointer",
  textAlign: "left" as const,
  fontFamily: `var(${typography.uiBody.fontFamily})`,
  fontSize: typography.uiBody.fontSize,
  lineHeight: typography.uiBody.lineHeight,
  color: selected ? colors.secondary : colors.onSurface,
  transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
  width: "100%",
});