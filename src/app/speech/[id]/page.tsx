'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarDays, ArrowRight, Check } from 'lucide-react';
import { colors, typography, spacing, radius, glassmorphism } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';
import { AudioPlayer } from '@/components/ui/AudioPlayer';

// ─── Types ─────────────────────────────────────────────────────────

interface SpeechSection {
  id: string;
  title: string;
  content: string;
}

interface SpeechStatus {
  id: string;
  status: string;
  transcript?: string | null;
  audioUrl?: string | null;
  createdAt?: string;
  completedAt?: string;
}

// ─── Constants ─────────────────────────────────────────────────────

const SPEAKER_TIPS = [
  'Make eye contact with different sections of the audience.',
  'Pause after your key points to let them land.',
  'Vary your pace — slow down for emphasis, speed up for energy.',
  'Breathe deeply before you begin. Confidence starts with breath.',
  'Your opening 30 seconds set the tone. Own them.',
  'Speak to one person, not to a crowd.',
  'Use silence as a tool. Pauses build anticipation.',
  'Anchor your body. Stand grounded, gesture with purpose.',
  'End with a call to action, not an apology.',
  'Rehearse out loud at least three times before delivering.',
  'Record yourself to hear pacing and tone gaps.',
  'The audience wants you to succeed. Remember that.',
];

const POLL_INTERVAL_MS = 5000;

// ─── Helpers ───────────────────────────────────────────────────────

function parseTranscriptToSections(raw: string): SpeechSection[] {
  if (!raw) return [];
  const sectionRegex = /\*\*(.+?)\*\*/g;
  const parts: SpeechSection[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const allMatches: { title: string; index: number }[] = [];
  while ((match = sectionRegex.exec(raw)) !== null) {
    allMatches.push({ title: match[1].trim(), index: match.index });
  }

  if (allMatches.length === 0) {
    return [{ id: 'full', title: 'Speech', content: raw.trim() }];
  }

  for (let i = 0; i < allMatches.length; i++) {
    const current = allMatches[i];
    const next = allMatches[i + 1];
    const contentStart = current.index + current.title.length + 4;
    const contentEnd = next ? next.index : raw.length;
    const content = raw.slice(contentStart, contentEnd).trim();

    if (content) {
      parts.push({
        id: current.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title: current.title,
        content,
      });
    }
  }

  return parts;
}

function formatStatus(status: string): { label: string; color: string } {
  switch (status) {
    case 'pending':
      return { label: 'Queued', color: colors.outline };
    case 'generating_text':
      return { label: 'Writing your speech', color: colors.secondary };
    case 'generating_audio':
      return { label: 'Recording audio', color: colors.primary };
    case 'complete':
    case 'completed':
      return { label: 'Ready', color: colors.primary };
    case 'failed':
      return { label: 'Generation failed', color: colors.error };
    default:
      return { label: status, color: colors.outline };
  }
}

// ─── Icon Components ───────────────────────────────────────────────

function StarIcon({ filled, size = 28 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? colors.primary : 'none'}
      stroke={filled ? colors.primary : colors.outline}
      strokeWidth="1.5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="currentColor" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="currentColor" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L5.04 9.81C4.5 9.31 3.79 9 3 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.42-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" fill="currentColor" />
    </svg>
  );
}

// ─── Page Component ────────────────────────────────────────────────

export default function SpeechPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const speechId = resolvedParams.id;

  const [speech, setSpeech] = useState<SpeechStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [rating, setRating] = useState<number | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSaved, setRatingSaved] = useState(false);
  const [bookingUrl, setBookingUrl] = useState('');

  // Coaching CTA config (renders the gold panel only when set).
  useEffect(() => {
    fetch('/api/app-config')
      .then((r) => r.json())
      .then((d) => setBookingUrl(d.bookingUrl ?? ''))
      .catch(() => {});
  }, []);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isGenerating = speech
    ? ['pending', 'generating_text', 'generating_audio'].includes(speech.status)
    : true;

  // ─── Fetch speech status ─────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/speeches/${speechId}/status`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to fetch speech');
      }
      const data: SpeechStatus = await res.json();
      setSpeech(data);
      setError(null);

      const done = data.status === 'complete' || data.status === 'completed' || data.status === 'failed';
      if (done && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [speechId]);

  // ─── Polling on mount ────────────────────────────────────────────
  useEffect(() => {
    fetchStatus();
    pollingRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchStatus]);

  // ─── Rotating tips while generating ──────────────────────────────
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % SPEAKER_TIPS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // ─── Rating handler ──────────────────────────────────────────────
  const handleRate = async (value: number) => {
    if (ratingSubmitting || ratingSaved) return;
    setRating(value);
    setRatingSubmitting(true);
    try {
      const res = await fetch(`/api/speeches/${speechId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: value }),
      });
      if (!res.ok) throw new Error('Failed to submit rating');
      setRatingSaved(true);
    } catch {
      setRatingSaved(false);
    } finally {
      setRatingSubmitting(false);
    }
  };

  // ─── Parse sections from transcript ──────────────────────────────
  const sections: SpeechSection[] = speech?.transcript
    ? parseTranscriptToSections(speech.transcript)
    : [];

  const statusInfo = formatStatus(speech?.status ?? 'pending');

  // ─── Loading state ───────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.surface.containerLowest,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{
          fontFamily: `var(${typography.uiLabel.fontFamily})`,
          fontSize: typography.uiLabel.fontSize,
          color: colors.onSurfaceVariant,
        }}>
          Loading your speech...
        </p>
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────
  if (error && !speech) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.surface.containerLowest,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{
            fontFamily: `var(${typography.h2.fontFamily})`,
            fontSize: typography.h2.fontSize,
            fontWeight: typography.h2.fontWeight,
            color: colors.error,
            marginBottom: spacing.md,
          }}>
            Something went wrong
          </p>
          <p style={{
            fontFamily: `var(${typography.uiLabel.fontFamily})`,
            fontSize: typography.uiLabel.fontSize,
            color: colors.onSurfaceVariant,
          }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  // ─── Failed state ────────────────────────────────────────────────
  if (speech?.status === 'failed') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.surface.containerLowest,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{
            fontFamily: `var(${typography.h2.fontFamily})`,
            fontSize: typography.h2.fontSize,
            fontWeight: typography.h2.fontWeight,
            color: colors.error,
            marginBottom: spacing.md,
          }}>
            Generation Failed
          </p>
          <p style={{
            fontFamily: `var(${typography.uiLabel.fontFamily})`,
            fontSize: typography.uiLabel.fontSize,
            color: colors.onSurfaceVariant,
            marginBottom: spacing.lg,
          }}>
            We could not generate your speech. Please try submitting again.
          </p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.surface.containerLowest }}>
      {/* ── Top Nav Header ── */}
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
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
          }}
        >
          <img
            src="/logo.png"
            alt="Star Speaker AI"
            style={{
              height: '40px',
              objectFit: 'contain',
            }}
          />
        </a>
        <a
          href="/"
          style={{
            fontFamily: `var(${typography.uiLabel.fontFamily})`,
            fontSize: typography.uiLabel.fontSize,
            fontWeight: typography.uiLabel.fontWeight,
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
      <main
        className="speech-main"
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: `80px ${spacing.lg} 160px`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ─── Header ──────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: spacing.lg,
            paddingBottom: spacing.lg,
            marginBottom: spacing.xl,
            borderBottom: `1px solid ${colors.surface.containerHigh}`,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: `var(${typography.uiLabel.fontFamily})`,
                fontSize: typography.uiLabel.fontSize,
                fontWeight: typography.uiLabel.fontWeight,
                lineHeight: typography.uiLabel.lineHeight,
                letterSpacing: typography.uiLabel.letterSpacing,
                color: colors.outline,
                textTransform: 'uppercase',
                marginBottom: spacing.sm,
              }}
            >
              Speech Preview
            </div>
            {/* Status badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontFamily: `var(${typography.uiLabel.fontFamily})`,
                fontSize: typography.caption.fontSize,
                fontWeight: typography.caption.fontWeight,
                color: statusInfo.color,
                background: `${statusInfo.color}15`,
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: radius.DEFAULT,
                marginBottom: spacing.sm,
              }}
            >
              {isGenerating && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: statusInfo.color,
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
              )}
              {statusInfo.label}
            </div>
          </div>
          {sections.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexShrink: 0 }}>
              <Button
                variant="secondary"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'My STAR Speech', url: window.location.href }).catch(() => {});
                  } else {
                    navigator.clipboard?.writeText(window.location.href).then(
                      () => alert('Link copied to clipboard'),
                      () => alert(window.location.href)
                    );
                  }
                }}
              >
                <ShareIcon />
                Share Link
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  // Plain text download
                  const text = sections.map(s => `${s.title.toUpperCase()}\n\n${s.content}`).join('\n\n\n');
                  const blob = new Blob([text], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `STAR_Speech_${speechId.slice(0,8)}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <DownloadIcon />
                Download Text
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  window.open(`/api/speeches/${speechId}/pdf`, '_blank');
                }}
              >
                <DownloadIcon />
                Download PDF
              </Button>
            </div>
          )}
        </div>

        {/* ─── Waiting State ───────────────────────────────────────── */}
        {isGenerating && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: `${spacing.xxl} ${spacing.lg}`,
              textAlign: 'center',
            }}
          >
            {/* Animated speaker icon */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${colors.secondaryContainer}, ${colors.primaryContainer})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.onPrimaryContainer,
                marginBottom: spacing.xl,
                animation: 'pulse 2.5s ease-in-out infinite',
              }}
            >
              <SpeakerIcon />
            </div>

            <h2
              style={{
                fontFamily: `var(${typography.h2.fontFamily})`,
                fontSize: '24px',
                fontWeight: typography.h2.fontWeight,
                lineHeight: typography.h2.lineHeight,
                color: colors.onSurface,
                margin: `0 0 ${spacing.sm} 0`,
              }}
            >
              Please wait, we&apos;re generating your speech.
            </h2>

            <p
              style={{
                fontFamily: `var(${typography.caption.fontFamily})`,
                fontSize: typography.caption.fontSize,
                fontWeight: typography.caption.fontWeight,
                lineHeight: typography.caption.lineHeight,
                color: colors.onSurfaceVariant,
                margin: `0 0 ${spacing.xl} 0`,
              }}
            >
              This usually takes 1-3 minutes. Hang tight.
            </p>

            {/* Rotating speaker tip */}
            <div
              key={tipIndex}
              style={{
                maxWidth: '480px',
                background: colors.surface.containerHigh,
                border: `1px solid ${colors.outlineVariant}`,
                borderRadius: radius.lg,
                padding: spacing.md,
                animation: 'fadeIn 0.5s ease-in',
              }}
            >
              <p
                style={{
                  fontFamily: `var(${typography.uiLabel.fontFamily})`,
                  fontSize: typography.uiLabel.fontSize,
                  fontWeight: typography.uiLabel.fontWeight,
                  lineHeight: typography.uiLabel.lineHeight,
                  color: colors.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: typography.uiLabel.letterSpacing,
                  margin: `0 0 ${spacing.xs} 0`,
                }}
              >
                Speaker Tip
              </p>
              <p
                style={{
                  fontFamily: `var(${typography.uiLabel.fontFamily})`,
                  fontSize: typography.uiLabel.fontSize,
                  fontWeight: 400,
                  lineHeight: '1.5',
                  color: colors.onSurface,
                  margin: 0,
                }}
              >
                {SPEAKER_TIPS[tipIndex]}
              </p>
            </div>
          </div>
        )}

        {/* ─── Generated Speech Content ────────────────────────────── */}
        {!isGenerating && sections.length > 0 && (
          <>
            {/* ── "Your speech is ready" moment card (gold-border glass) ── */}
            <div
              className="glass"
              style={{
                border: `1px solid ${colors.primary}`,
                borderRadius: radius.lg,
                padding: spacing.lg,
                marginBottom: spacing.xl,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <span
                style={{
                  width: 40, height: 40, borderRadius: radius.full, flexShrink: 0,
                  backgroundColor: colors.primary, color: colors.onPrimary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Check size={22} />
              </span>
              <div>
                <p style={{ fontFamily: `var(${typography.h2.fontFamily})`, fontSize: '20px', fontWeight: 600, color: colors.onSurface, margin: 0 }}>
                  Your speech is ready
                </p>
                <p style={{ fontFamily: `var(${typography.caption.fontFamily})`, fontSize: '13px', color: colors.onSurfaceVariant, margin: '2px 0 0' }}>
                  Read it below, then press play to hear it delivered.
                </p>
              </div>
            </div>

            {/* Transcript flows with the page — no inner scrollbox. */}
            <article
              className="speech-article"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing.xl,
              }}
            >
              {sections.map((section, i) => (
                <section key={section.id}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.md, marginBottom: spacing.sm }}>
                    <span
                      style={{
                        fontFamily: `var(${typography.transcriptDisplay.fontFamily})`,
                        fontSize: '22px',
                        fontWeight: 500,
                        color: colors.primary,
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3
                      style={{
                        fontFamily: `var(${typography.transcriptDisplay.fontFamily})`,
                        fontSize: '22px',
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                        color: colors.onSurface,
                        margin: 0,
                      }}
                    >
                      {section.title}
                    </h3>
                  </div>
                  <p
                    style={{
                      fontFamily: `var(${typography.transcriptBody.fontFamily})`,
                      fontSize: typography.transcriptBody.fontSize,
                      fontWeight: typography.transcriptBody.fontWeight,
                      lineHeight: typography.transcriptBody.lineHeight,
                      letterSpacing: typography.transcriptBody.letterSpacing,
                      color: colors.onSurface,
                      margin: 0,
                    }}
                  >
                    {section.content}
                  </p>
                </section>
              ))}
            </article>

            {/* ─── Audio Player ─────────────────────────────────────── */}
            {speech?.audioUrl && (
              <div style={{ marginTop: spacing.xxl }}>
                <AudioPlayer src={speech.audioUrl} aria-label="Speech audio" />
              </div>
            )}

            {/* ─── Coaching CTA (gold panel) — only when bookingUrl set ── */}
            {bookingUrl && (
              <div
                style={{
                  marginTop: spacing.xxl,
                  background: `linear-gradient(135deg, ${colors.primary}14, ${colors.secondary}14)`,
                  border: `1px solid ${colors.primary}`,
                  borderRadius: radius.lg,
                  padding: spacing.xl,
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: radius.full, backgroundColor: `${colors.primary}22`, color: colors.primary, marginBottom: spacing.md }}>
                  <CalendarDays size={24} />
                </div>
                <h3 style={{ fontFamily: `var(${typography.h2.fontFamily})`, fontSize: '22px', fontWeight: 600, color: colors.onSurface, margin: `0 0 ${spacing.xs}` }}>
                  Want help perfecting your speech?
                </h3>
                <p style={{ fontFamily: `var(${typography.uiBody.fontFamily})`, fontSize: '16px', color: colors.onSurfaceVariant, margin: `0 0 ${spacing.lg}`, lineHeight: 1.6 }}>
                  Schedule a 1-on-1 coaching session with Star Bobatoon to refine your message and delivery.
                </p>
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    background: colors.primary,
                    color: colors.onPrimary,
                    padding: `${spacing.sm} ${spacing.xl}`,
                    borderRadius: radius.full,
                    fontWeight: 700,
                    fontSize: '16px',
                    textDecoration: 'none',
                    letterSpacing: '0.02em',
                  }}
                >
                  Schedule a Coaching Session <ArrowRight size={18} />
                </a>
              </div>
            )}

            {/* ─── Rating UI ────────────────────────────────────────── */}
            <div
              style={{
                marginTop: spacing.xxl,
                paddingTop: spacing.lg,
                borderTop: `1px solid ${colors.surface.containerHigh}`,
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontFamily: `var(${typography.uiLabel.fontFamily})`,
                  fontSize: typography.uiLabel.fontSize,
                  fontWeight: typography.uiLabel.fontWeight,
                  lineHeight: typography.uiLabel.lineHeight,
                  letterSpacing: typography.uiLabel.letterSpacing,
                  color: colors.onSurfaceVariant,
                  textTransform: 'uppercase',
                  margin: `0 0 ${spacing.md} 0`,
                }}
              >
                How was your speech?
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.md,
                }}
              >
                {[1, 2, 3, 4].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleRate(value)}
                    disabled={ratingSubmitting || ratingSaved}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: ratingSubmitting || ratingSaved ? 'default' : 'pointer',
                      padding: spacing.sm,
                      borderRadius: radius.DEFAULT,
                      transition: 'transform 0.15s ease, opacity 0.2s ease',
                      opacity: ratingSaved && rating !== value ? 0.3 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!ratingSaved) e.currentTarget.style.transform = 'scale(1.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    aria-label={`Rate ${value} out of 4`}
                    type="button"
                  >
                    <StarIcon filled={rating !== null && value <= rating} size={32} />
                  </button>
                ))}
              </div>

              {/* Rating labels */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: spacing.xl,
                  marginTop: spacing.sm,
                }}
              >
                {['Needs Work', 'Okay', 'Good', 'Excellent'].map((label, i) => (
                  <span
                    key={label}
                    style={{
                      fontFamily: `var(${typography.caption.fontFamily})`,
                      fontSize: '11px',
                      fontWeight: typography.caption.fontWeight,
                      color:
                        rating !== null && i + 1 <= rating
                          ? colors.primary
                          : colors.outline,
                      width: '64px',
                      textAlign: 'center',
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {ratingSaved && (
                <p
                  style={{
                    fontFamily: `var(${typography.caption.fontFamily})`,
                    fontSize: typography.caption.fontSize,
                    fontWeight: typography.caption.fontWeight,
                    color: colors.primary,
                    marginTop: spacing.md,
                  }}
                >
                  Thank you for your feedback!
                </p>
              )}
            </div>
          </>
        )}
      </main>

      {/* ─── CSS Animations ───────────────────────────────────────── */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.97); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
