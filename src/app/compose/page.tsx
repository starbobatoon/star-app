"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { colors, typography, spacing, radius } from "@/lib/design-tokens";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useVoiceInput } from "@/lib/voice-input";
import { BrainstormingModal } from "@/components/BrainstormingModal";

// ─── Live Question Type (from /api/questions) ─────────────────────
interface LiveQuestion {
  id: string;
  question_text: string;
  feeds_section: string | null;
  is_required: boolean;
  display_order: number;
  video_url: string | null;
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
  answers: Record<string, string>;
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

// ─── Video embed URL resolver ────────────────────────────────────
function resolveVideoEmbed(url: string): { src: string; type: 'iframe' | 'video' } {
  // Direct video files
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return { src: url, type: 'video' };
  }
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (yt) {
    return { src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1&autoplay=1`, type: 'iframe' };
  }
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) {
    return { src: `https://player.vimeo.com/video/${vm[1]}?autoplay=1`, type: 'iframe' };
  }
  // Default: treat as embeddable iframe
  return { src: url, type: 'iframe' };
}

// ─── Video Hint Component ─────────────────────────────────────────
// Collapsed: small "Watch explanation" pill. Expanded: 9:16 player.
function VideoHint({ videoUrl }: { videoUrl: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { src, type } = resolveVideoEmbed(videoUrl);

  if (isExpanded) {
    return (
      <div className="video-hint-player">
        <div className="video-hint-player-ratio">
          {type === 'video' ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={src} autoPlay controls playsInline style={{ objectFit: 'cover' }} />
          ) : (
            <iframe
              src={src}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Star explains this question"
            />
          )}
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            marginTop: spacing.sm,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.outline,
            fontFamily: `var(${typography.caption.fontFamily})`,
            fontSize: typography.caption.fontSize,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: 0,
          }}
        >
          ✕ Close video
        </button>
      </div>
    );
  }

  return (
    <button
      className="video-hint-pill"
      onClick={() => setIsExpanded(true)}
      aria-label="Watch Star explain how to answer this question"
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.onPrimary,
          fontSize: '9px',
          flexShrink: 0,
        }}
      >
        ▶
      </div>
      Watch Star explain this question
    </button>
  );
}

// ─── Parse transcript into sections (for beautiful display) ─────
function parseTranscriptSections(transcript: string) {
  if (!transcript) return [{ id: 'full', title: 'Your Speech', content: transcript }];
  const boldRegex = /\*\*(.+?)\*\*/g;
  const matches: { title: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = boldRegex.exec(transcript)) !== null) {
    matches.push({ title: m[1].trim(), index: m.index });
  }
  if (matches.length === 0) {
    return [{ id: 'full', title: 'Your Speech', content: transcript.trim() }];
  }
  return matches.map((match, i) => {
    const contentStart = match.index + match.title.length + 4;
    const contentEnd = matches[i + 1]?.index ?? transcript.length;
    return {
      id: match.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: match.title,
      content: transcript.slice(contentStart, contentEnd).trim(),
    };
  }).filter((s) => s.content);
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
const STANDBY_QUOTES = [
  { text: "It usually takes me more than three weeks to prepare a good impromptu speech.", author: "Mark Twain" },
  { text: "All the great speakers were bad speakers at first.", author: "Ralph Waldo Emerson" },
  { text: "Speech is power: speech is to persuade, to convert, to compel.", author: "Ralph Waldo Emerson" },
  { text: "There are always three speeches for every one you actually gave. The one you practiced, the one you gave, and the one you wish you gave.", author: "Dale Carnegie" },
  { text: "The right word may be effective, but no word was ever as effective as a rightly timed pause.", author: "Mark Twain" },
  { text: "Be sincere; be brief; be seated.", author: "Franklin D. Roosevelt" },
  { text: "Speak clearly, if you speak at all; carve every word before you let it fall.", author: "Oliver Wendell Holmes" },
  { text: "Words are, of course, the most powerful drug used by mankind.", author: "Rudyard Kipling" },
  { text: "The most precious things in speech are the pauses.", author: "Sir Ralph Richardson" },
  { text: "Think twice before you speak, because your words will plant the seed of either success or failure in the mind of another.", author: "Napoleon Hill" },
];

function StandByScreen({ email, speechId }: { email: string; speechId: string }) {
  const TOTAL_SECONDS = 300; // 5-minute max estimate
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteFading, setQuoteFading] = useState(false);

  // Elapsed timer — drives the progress bar
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => Math.min(s + 1, TOTAL_SECONDS)), 1000);
    return () => clearInterval(t);
  }, []);

  // Rotate quotes every 15 seconds with a fade transition
  useEffect(() => {
    const t = setInterval(() => {
      setQuoteFading(true);
      setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % STANDBY_QUOTES.length);
        setQuoteFading(false);
      }, 600);
    }, 15000);
    return () => clearInterval(t);
  }, []);

  // Poll for speech status every 5 seconds.
  // Only surface an error after 6 consecutive failures (~30 s) — transient
  // network blips and the brief window before the row is fully committed
  // should not show alarming red text to the user.
  useEffect(() => {
    if (!speechId) return;
    let failCount = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    const poll = async () => {
      try {
        const res = await fetch(`/api/speeches/${speechId}/status`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        failCount = 0;
        setError(null);
        setSpeechStatus(data);
      } catch {
        failCount += 1;
        if (failCount >= 6) {
          setError("Having trouble checking status — we'll keep trying. Your speech is still being created.");
        }
      }
    };
    // Brief delay so the speech row is fully committed before first fetch
    const initialTimer = setTimeout(() => {
      poll();
      interval = setInterval(poll, 5000);
    }, 2000);
    return () => {
      clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
  }, [speechId]);

  // When the speech is fully complete, send the user to the dedicated speech
  // page which has the polished UI: pretty rendering, audio player, Download
  // PDF / Download Text / Share Link buttons, rating UI.
  useEffect(() => {
    if (speechStatus?.status === 'complete' || speechStatus?.status === 'completed') {
      window.location.replace(`/speech/${speechId}`);
    }
  }, [speechStatus?.status, speechId]);

  // Inline preview as soon as transcript is ready (audio still rendering) —
  // keeps the user engaged while audio finishes. Once status flips to complete,
  // the effect above redirects them to /speech/[id].
  if (speechStatus?.transcript) {
    return <SpeechViewer speech={speechStatus} email={email} />;
  }

  const remaining = Math.max(0, TOTAL_SECONDS - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progressPct = Math.min(100, (elapsed / TOTAL_SECONDS) * 100);
  const quote = STANDBY_QUOTES[quoteIndex];

  return (
    <div style={pageStyle}>
      <ComposeNav />
      <style>{`
        @keyframes standbyPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes standbyOrbit {
          from { transform: rotate(0deg) translateX(36px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(36px) rotate(-360deg); }
        }
        @keyframes standbyFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .standby-quote-wrap {
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .standby-quote-wrap.fading {
          opacity: 0 !important;
          transform: translateY(-6px) !important;
        }
      `}</style>

      <div style={{ ...mainContentStyle, textAlign: 'center' as const, maxWidth: 600, gap: spacing.xl }}>

        {/* Orbital animation */}
        <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto' }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${colors.secondary}33, ${colors.primary}22)`,
            border: `2px solid ${colors.primary}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'standbyPulse 3s ease-in-out infinite',
          }}>
            <span style={{ fontSize: '36px', lineHeight: 1 }}>✍️</span>
          </div>
          {[0, 120, 240].map((deg, i) => (
            <div key={i} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 8, height: 8, marginTop: -4, marginLeft: -4,
              borderRadius: '50%',
              backgroundColor: i === 0 ? colors.primary : i === 1 ? colors.secondary : colors.outline,
              animation: `standbyOrbit ${2.4 + i * 0.4}s linear infinite`,
              animationDelay: `${-i * 0.8}s`,
              transformOrigin: '0 0',
              transform: `rotate(${deg}deg) translateX(52px)`,
            }} />
          ))}
        </div>

        {/* Headline */}
        <div>
          <h1 style={{ color: colors.onSurface, fontSize: '26px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Crafting Your Masterpiece
          </h1>
          <p style={{ color: colors.onSurfaceVariant, fontSize: '15px', margin: 0 }}>
            AI writing + voice recording in progress — this takes 1–5 minutes
          </p>
        </div>

        {/* Countdown + progress */}
        <div style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ color: colors.outline, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Est. time remaining
            </span>
            <span style={{ color: colors.primary, fontSize: '32px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {mins}:{secs.toString().padStart(2, '0')}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, borderRadius: 3, background: colors.surface.containerHigh, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              borderRadius: 3,
              background: `linear-gradient(to right, #0B1472, ${colors.primary})`,
              transition: 'width 1s linear',
            }} />
          </div>
        </div>

        {/* Rotating quote */}
        <div
          className={`standby-quote-wrap${quoteFading ? ' fading' : ''}`}
          style={{
            maxWidth: 480,
            padding: '20px 24px',
            borderRadius: 12,
            background: `${colors.secondary}11`,
            border: `1px solid ${colors.secondary}33`,
            opacity: 1,
            transform: 'translateY(0)',
          }}
        >
          <p style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '16px',
            lineHeight: 1.65,
            color: colors.onSurface,
            margin: '0 0 10px',
            fontStyle: 'italic',
          }}>
            &ldquo;{quote.text}&rdquo;
          </p>
          <p style={{ fontSize: '12px', color: colors.primary, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            — {quote.author}
          </p>
        </div>

        {/* Email / SMS note */}
        <p style={{ color: colors.outline, fontSize: '13px', lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
          No need to wait here — we&apos;ll email your speech to <strong style={{ color: colors.onSurfaceVariant }}>{email}</strong> and send you a text the moment it&apos;s ready.
        </p>

        {error && (
          <p style={{ color: colors.error, fontSize: '13px', marginTop: 0 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Speech Viewer Component ─────────────────────────────────────
function SpeechViewer({ speech: initialSpeech, email }: { speech: SpeechStatus; email: string }) {
  const [speech, setSpeech] = useState(initialSpeech);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // If audio is still generating when transcript first appears, keep polling for it
  useEffect(() => {
    if (speech.audioUrl) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/speeches/${speech.id}/status`);
        if (!res.ok) return;
        const data: SpeechStatus = await res.json();
        if (data.audioUrl) setSpeech((prev) => ({ ...prev, audioUrl: data.audioUrl }));
      } catch { /* silent — will retry */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [speech.audioUrl, speech.id]);

  const toggleAudio = () => {
    if (!speech.audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(speech.audioUrl);
      audioRef.current.onloadedmetadata = () => {
        setAudioDuration(audioRef.current?.duration ?? 0);
      };
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setAudioProgress(0);
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      };
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      progressTimerRef.current = setInterval(() => {
        setAudioProgress(audioRef.current?.currentTime ?? 0);
      }, 500);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const [bookingUrl, setBookingUrl] = useState('');
  useEffect(() => {
    fetch('/api/app-config').then(r => r.json()).then(d => setBookingUrl(d.bookingUrl ?? '')).catch(() => {});
  }, []);

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div style={pageStyle}>
      <ComposeNav />
      <div style={{ ...mainContentStyle, maxWidth: 740 }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
          <div style={{
            display: 'inline-block',
            background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`,
            border: `1px solid ${colors.primary}44`,
            borderRadius: radius.lg,
            padding: `6px ${spacing.md}`,
            marginBottom: spacing.sm,
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: colors.primary, letterSpacing: '0.06em' }}>
              ✓ YOUR SPEECH IS READY
            </span>
          </div>
          <h1 style={{ ...typography.h2, color: colors.onSurface, marginBottom: spacing.sm }}>
            Here&apos;s Your Personalized 5-Minute Speech
          </h1>
          <p style={{ fontSize: '16px', color: colors.onSurfaceVariant, lineHeight: 1.6 }}>
            We&apos;ve sent this to <strong style={{ color: colors.onSurface }}>{email}</strong> and will text you the link shortly.
          </p>
        </div>

        {/* ── Audio Player ── */}
        <Card cardStyle={{ marginBottom: spacing.lg }}>
          <div style={{ padding: `${spacing.sm} ${spacing.xs}` }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              color: colors.secondary, marginBottom: spacing.md,
            }}>
              🎙 Listen to Your Speech
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <button
                onClick={toggleAudio}
                disabled={!speech.audioUrl}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                style={{
                  width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
                  background: speech.audioUrl ? colors.primary : colors.outlineVariant,
                  color: colors.onPrimary, border: 'none', cursor: speech.audioUrl ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => { if (speech.audioUrl) e.currentTarget.style.transform = 'scale(1.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: colors.onSurface, marginBottom: '6px' }}>
                  {!speech.audioUrl ? 'Audio is being prepared…' : isPlaying ? 'Now Playing' : 'Your Speech — Star\'s Voice'}
                </div>
                {speech.audioUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <div style={{
                      flex: 1, height: '5px', background: colors.outlineVariant,
                      borderRadius: '3px', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', background: colors.primary, transition: 'width 0.4s linear',
                        width: audioDuration > 0 ? `${(audioProgress / audioDuration) * 100}%` : '0%',
                      }} />
                    </div>
                    <span style={{ fontSize: '13px', color: colors.onSurfaceVariant, whiteSpace: 'nowrap' }}>
                      {fmtTime(audioProgress)}{audioDuration > 0 ? ` / ${fmtTime(audioDuration)}` : ''}
                    </span>
                  </div>
                ) : (
                  <p style={{ fontSize: '14px', color: colors.onSurfaceVariant, margin: 0 }}>
                    Generating your audio — it will appear here in a moment.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Transcript ── */}
        <div style={{
          background: colors.surface.container,
          borderRadius: radius.lg,
          border: `1px solid ${colors.outlineVariant}`,
          marginBottom: spacing.xl,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: `${spacing.md} ${spacing.lg}`,
            borderBottom: `1px solid ${colors.outlineVariant}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: colors.secondary }}>
              📄 Your Written Speech
            </span>
            <span style={{ fontSize: '12px', color: colors.outline }}>Scroll to read ↕</span>
          </div>
          <div style={{
            padding: spacing.lg,
            maxHeight: '520px',
            overflowY: 'auto' as const,
            scrollbarWidth: 'thin' as const,
            scrollbarColor: `${colors.outlineVariant} transparent`,
          }}>
            {parseTranscriptSections(speech.transcript ?? '').map((section) => (
              <div key={section.id} style={{ marginBottom: spacing.xl }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  marginBottom: spacing.sm,
                }}>
                  <div style={{ width: '3px', height: '16px', background: colors.primary, borderRadius: '2px', flexShrink: 0 }} />
                  <span style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    color: colors.secondary,
                  }}>
                    {section.title}
                  </span>
                </div>
                <p style={{
                  fontFamily: 'Georgia, "Book Antiqua", Palatino, serif',
                  fontSize: '18px',
                  lineHeight: '1.9',
                  color: colors.onSurface,
                  margin: 0,
                  whiteSpace: 'pre-wrap' as const,
                }}>
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Schedule CTA ── */}
        {bookingUrl && (
          <div style={{
            background: `linear-gradient(135deg, ${colors.primary}14, ${colors.secondary}14)`,
            border: `1px solid ${colors.primary}33`,
            borderRadius: radius.lg,
            padding: spacing.xl,
            textAlign: 'center',
            marginBottom: spacing.xl,
          }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: colors.onSurface, marginBottom: spacing.xs }}>
              Want Help Perfecting Your Speech?
            </div>
            <p style={{ fontSize: '16px', color: colors.onSurfaceVariant, marginBottom: spacing.lg, lineHeight: 1.6 }}>
              Schedule a 1-on-1 coaching session with Star Bobatoon to refine your message and delivery.
            </p>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: colors.primary,
                color: colors.onPrimary,
                padding: `${spacing.sm} ${spacing.xl}`,
                borderRadius: radius.DEFAULT,
                fontWeight: 700,
                fontSize: '16px',
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              Schedule a Coaching Session →
            </a>
          </div>
        )}

        {/* ── Bottom actions ── */}
        <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'center', flexWrap: 'wrap' as const }}>
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

  // Snapshot the textarea value at the moment listening starts. Every interim
  // transcript update REPLACES (base + transcript), instead of appending —
  // that's what was duplicating the text 30 times as the user spoke.
  const baseValueRef = useRef(value);
  const wasListeningRef = useRef(false);

  useEffect(() => {
    setShowListening(isListening);
    if (isListening && !wasListeningRef.current) {
      // Just started listening — capture the baseline once.
      baseValueRef.current = value;
    }
    wasListeningRef.current = isListening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  useEffect(() => {
    if (!transcript || !wasListeningRef.current) return;
    const base = baseValueRef.current;
    const separator = base.trim() && !base.endsWith(' ') ? ' ' : '';
    onChange(base + separator + transcript);
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

        {/* Listening indicator — full overlay so textarea text doesn't bleed through */}
        {showListening && (
          <div style={listeningOverlayStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
              <LiveWaveformBars isListening={isListening} />
              <span style={{ ...typography.uiLabel, color: colors.primary }}>Listening...</span>
            </div>
            <p style={{ ...typography.caption, color: colors.onSurface, margin: 0, lineHeight: 1.6, overflowY: 'auto' as const, maxHeight: '120px' }}>
              {transcript || 'Speak now — your words will appear here'}
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

// ─── Live Waveform Bars — driven by real microphone audio levels ─
function LiveWaveformBars({ isListening }: { isListening: boolean }) {
  const [levels, setLevels] = useState<number[]>(Array.from({ length: 8 }, () => 0));
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isListening) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
      analyserRef.current = null;
      setLevels(Array.from({ length: 8 }, () => 0));
      return;
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    let active = true;
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
      if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!active) return;
        analyser.getByteFrequencyData(data);
        setLevels(Array.from({ length: 8 }, (_, i) => data[Math.floor((i / 8) * data.length)] / 255));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    }).catch(() => { /* mic permission already granted by SpeechRecognition — ignore */ });

    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    };
  }, [isListening]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '32px' }}>
      {levels.map((level, i) => (
        <div
          key={i}
          style={{
            width: '3px',
            height: `${Math.max(3, Math.round(level * 28))}px`,
            backgroundColor: colors.primary,
            borderRadius: '2px',
            transition: 'height 60ms ease-out',
          }}
        />
      ))}
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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [brainstormStep, setBrainstormStep] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitComplete, setSubmitComplete] = useState(false);
  const [speechId, setSpeechId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Fetch live questions from DB on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/questions');
        if (!res.ok) throw new Error('Failed to load questions');
        const data = await res.json();
        if (!cancelled) setQuestions(data.questions || []);
      } catch {
        if (!cancelled) setQuestions([]);
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalSteps = questions.length + 1;
  const progressPercent = (step / totalSteps) * 100;

  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Holds draft answers loaded when email matches — applied on Begin click, not immediately.
  // Using a ref avoids a state update (and re-render) in the email effect.
  const pendingDraftAnswersRef = useRef<Record<string, string>>({});

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
        // Only restore contact fields here — no setAnswers, no setStep.
        // Restoring answers via setAnswers here triggers extra re-renders that
        // interact badly with browser autocomplete and can advance the step.
        // Answers are applied later in handleNext when the user clicks Begin →.
        setContact((prev) => ({
          ...prev,
          firstName: draft.contact.firstName || prev.firstName,
          lastName: draft.contact.lastName || prev.lastName,
          phone: draft.contact.phone || prev.phone,
        }));
        pendingDraftAnswersRef.current = draft.answers || {};
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

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const canProceedFromContact =
    contact.firstName.trim().length > 0 &&
    contact.lastName.trim().length > 0 &&
    contact.email.trim().length > 0 &&
    contact.phone.trim().length > 0;

  const handleNext = () => {
    if (step < totalSteps) {
      // Apply any draft answers that were loaded when the email matched —
      // batched with the step increment so they land in the same render.
      if (step === 0 && Object.keys(pendingDraftAnswersRef.current).length > 0) {
        setAnswers((prev) => ({ ...prev, ...pendingDraftAnswersRef.current }));
        pendingDraftAnswersRef.current = {};
      }
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
      // Prepare answers array from live questions
      const answersArray = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || '',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                <h3 style={reviewSectionTitleStyle}>Contact Information</h3>
                <button
                  onClick={() => setStep(0)}
                  style={{
                    background: 'none',
                    border: `1px solid ${colors.outlineVariant}`,
                    color: colors.primary,
                    padding: `${spacing.xs} ${spacing.md}`,
                    borderRadius: radius.full,
                    cursor: 'pointer',
                    ...typography.uiLabel,
                    letterSpacing: '0.06em',
                  }}
                >
                  ✎ Edit
                </button>
              </div>
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
            {questions.map((q, idx) => (
              <Card key={q.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.sm }}>
                  <p style={{ ...reviewQuestionStyle, flex: 1, margin: 0 }}>{q.question_text}</p>
                  <button
                    onClick={() => setStep(idx + 1)}
                    style={{
                      background: 'none',
                      border: `1px solid ${colors.outlineVariant}`,
                      color: colors.primary,
                      padding: `${spacing.xs} ${spacing.md}`,
                      borderRadius: radius.full,
                      cursor: 'pointer',
                      flexShrink: 0,
                      ...typography.uiLabel,
                      letterSpacing: '0.06em',
                    }}
                  >
                    ✎ Edit
                  </button>
                </div>
                <p style={reviewAnswerStyle}>
                  {answers[q.id] || <em style={{ color: colors.onSurfaceVariant }}>No answer provided</em>}
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
                    label="First Name *"
                    placeholder="First name"
                    value={contact.firstName}
                    onChange={(e) => handleContactChange("firstName", e.target.value)}
                    required
                  />
                </div>
                <div style={contactFieldStyle}>
                  <Input
                    label="Last Name *"
                    placeholder="Last name"
                    value={contact.lastName}
                    onChange={(e) => handleContactChange("lastName", e.target.value)}
                    required
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

  // ─── Loading State ─────────────────────────────────────────────
  if (questionsLoading) {
    return (
      <div style={pageStyle}>
        <ComposeNav />
        <div style={{ ...mainContentStyle, textAlign: 'center' as const, paddingTop: spacing.xxl }}>
          <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant }}>Loading questions...</p>
        </div>
      </div>
    );
  }

  // ─── Question Steps (1–N) ──────────────────────────────────────
  const questionIndex = step - 1;
  const currentQuestion = questions[questionIndex];
  const questionText = currentQuestion?.question_text ?? '';
  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] || "") : "";

  return (
    <div style={pageStyle}>
      <ComposeNav />
      <ProgressBar value={progressPercent} height="2px" aria-label="Questionnaire progress" />
      <div className="compose-content" style={mainContentStyle}>
        <div style={questionAreaStyle}>
          <span style={stepLabelStyle}>
            Question {step} of {totalSteps}
          </span>
          <h1 className="compose-question-title" style={questionTitleStyle}>{questionText}</h1>
          {currentQuestion?.video_url && (
            <VideoHint videoUrl={currentQuestion.video_url} />
          )}
          <QuestionInput
            questionIndex={questionIndex}
            value={currentAnswer}
            onChange={(val) => currentQuestion && handleAnswerChange(currentQuestion.id, val)}
          />
          {currentQuestion && (
            <button
              onClick={() => setBrainstormStep(questionIndex)}
              style={{
                background: 'none',
                border: `1px solid ${colors.outlineVariant}`,
                borderRadius: radius.full,
                padding: `${spacing.xs} ${spacing.md}`,
                color: colors.secondary,
                cursor: 'pointer',
                fontFamily: `var(${typography.caption.fontFamily})`,
                fontSize: typography.caption.fontSize,
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                marginTop: spacing.sm,
                transition: 'border-color 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.secondary; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.outlineVariant; }}
            >
              ✦ Need help? Brainstorm with AI
            </button>
          )}
        </div>
        <div className="compose-nav" style={navStyle}>
          <Button variant="secondary" onClick={handlePrevious}>
            ← Previous
          </Button>
          <Button variant="primary" onClick={handleNext}>
            {step === totalSteps - 1 ? "Review →" : "Next →"}
          </Button>
        </div>
      </div>

      {/* Real brainstorming modal */}
      {currentQuestion && (
        <BrainstormingModal
          questionId={currentQuestion.id}
          questionText={currentQuestion.question_text}
          currentAnswer={currentAnswer}
          isOpen={brainstormStep === questionIndex}
          onUseAnswer={(text) => {
            handleAnswerChange(currentQuestion.id, text);
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
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: colors.surface.containerHigh,
  border: `1px solid ${colors.primary}`,
  borderRadius: 0,
  padding: spacing.md,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
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
