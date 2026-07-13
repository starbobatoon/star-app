'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ListChecks,
  Sparkles,
  Volume2,
  Play,
  Pause,
  ArrowRight,
  Quote,
} from 'lucide-react';
import { colors, spacing, radius, typeScale, glassmorphism } from '@/lib/design-tokens';
import { AppHeader } from '@/components/AppHeader';
import { MobileNav } from '@/components/MobileNav';

/**
 * Landing page — "The Keynote Stage".
 * Communicates what the product does, who Star is, and what the output sounds
 * like. Six populated sections; brand palette only; no emoji.
 */

const STEPS = [
  {
    Icon: ListChecks,
    title: 'Answer 11 guided questions',
    body: 'A short, guided interview draws out your message, your story, and your point — no blank page.',
  },
  {
    Icon: Sparkles,
    title: "Star's AI method writes your 5-minute speech",
    body: 'The MAP → Hook → Story → Point → CTA → Exit method structures it into a keynote-ready talk.',
  },
  {
    Icon: Volume2,
    title: 'Hear it delivered in a professional voice',
    body: 'Your speech is voiced in a natural, professional narration you can play, download, and rehearse to.',
  },
];

const METHOD = [
  { step: 'MAP', desc: 'Frame the moment and the audience.' },
  { step: 'Hook', desc: 'Open with something they cannot ignore.' },
  { step: 'Story', desc: 'Earn trust with a real, human story.' },
  { step: 'Point', desc: 'Land the one idea that matters.' },
  { step: 'CTA', desc: 'Ask for the action you want.' },
  { step: 'Exit', desc: 'Close on a line they remember.' },
];

function SampleAudioCard() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(true);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      a.play().catch(() => setAvailable(false));
    }
    setPlaying(!playing);
  }, [playing]);

  return (
    <div
      className="glass"
      style={{
        borderRadius: radius.xl,
        padding: spacing.lg,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.lg,
        maxWidth: 640,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause sample' : 'Play sample'}
        disabled={!available}
        style={{
          flexShrink: 0,
          width: 56,
          height: 56,
          borderRadius: radius.full,
          backgroundColor: colors.primary,
          color: colors.onPrimary,
          border: 'none',
          cursor: available ? 'pointer' : 'not-allowed',
          opacity: available ? 1 : 0.4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {playing ? <Pause size={24} fill={colors.onPrimary} /> : <Play size={24} fill={colors.onPrimary} />}
      </button>
      <div style={{ textAlign: 'left', flex: 1 }}>
        <p style={{ ...labelStyle, color: colors.primary, margin: '0 0 6px' }}>Sample speech</p>
        <p style={{ ...typeScale.ui, color: colors.onSurface, margin: 0 }}>
          Hear a finished 5-minute speech in the delivery voice.
        </p>
        {!available && (
          <p style={{ ...typeScale.label, color: colors.onSurfaceVariant, margin: '8px 0 0', letterSpacing: '0.06em' }}>
            Sample coming soon
          </p>
        )}
      </div>
      {/* When public/sample-speech.mp3 is present, this plays it. */}
      <audio
        ref={audioRef}
        src="/sample-speech.mp3"
        preload="none"
        onEnded={() => setPlaying(false)}
        onError={() => setAvailable(false)}
      />
    </div>
  );
}

const labelStyle = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
};

export default function LandingPage() {
  const router = useRouter();
  const goCompose = useCallback(() => router.push('/compose'), [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.surface.base,
        color: colors.onBackground,
        fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      <AppHeader
        active={null}
        right={
          <button
            onClick={goCompose}
            style={{
              backgroundColor: colors.primary,
              color: colors.onPrimary,
              border: 'none',
              borderRadius: radius.full,
              padding: '8px 18px',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Compose
          </button>
        }
      />

      <main style={{ flex: 1 }}>
        {/* ── 1. HERO ── */}
        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '96px 24px 80px',
            backgroundColor: colors.surface.base,
            // Gold radial glow at 7% alpha over #05081A (replaces the old
            // hardcoded legacy-gold hero glow with the brand gold #cba864).
            backgroundImage:
              'radial-gradient(circle at 50% 0%, rgba(203, 168, 100, 0.07) 0%, transparent 62%)',
          }}
        >
          <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <span style={{ ...labelStyle, color: colors.primary }}>Star Speaker AI</span>
            <h1 style={{ ...typeScale.hero, color: colors.onSurface, margin: 0 }}>
              Your five-minute masterpiece.
            </h1>
            <p style={{ ...typeScale.bodySerif, color: colors.onSurfaceVariant, maxWidth: 620, margin: '0 auto' }}>
              Answer a few guided questions and Star&apos;s AI method writes a keynote-ready speech —
              then delivers it back to you in a professional voice.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: spacing.sm }}>
              <button
                onClick={goCompose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  backgroundColor: colors.primary,
                  color: colors.onPrimary,
                  border: 'none',
                  borderRadius: radius.full,
                  padding: '16px 34px',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '15px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.primaryFixedDim; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.primary; }}
              >
                Compose your speech
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* ── 2. HOW IT WORKS ── */}
        <section style={sectionStyle}>
          <div style={sectionInner}>
            <h2 style={{ ...typeScale.section, color: colors.onSurface, textAlign: 'center', margin: `0 0 ${spacing.xl}` }}>
              How it works
            </h2>
            <div className="landing-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.lg }}>
              {STEPS.map(({ Icon, title, body }, i) => (
                <div key={i} style={cardStyle}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.lg,
                      backgroundColor: colors.surface.containerHigh,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.primary,
                      marginBottom: spacing.md,
                    }}
                  >
                    <Icon size={22} />
                  </div>
                  <p style={{ ...labelStyle, color: colors.onSurfaceVariant, margin: '0 0 8px', letterSpacing: '0.1em' }}>
                    Step {i + 1}
                  </p>
                  <h3 style={{ ...typeScale.ui, fontWeight: 600, fontSize: '18px', color: colors.onSurface, margin: '0 0 8px' }}>
                    {title}
                  </h3>
                  <p style={{ ...typeScale.ui, color: colors.onSurfaceVariant, margin: 0, fontSize: '15px' }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. SAMPLE AUDIO ── */}
        <section style={{ ...sectionStyle, backgroundColor: colors.surface.dim }}>
          <div style={sectionInner}>
            <h2 style={{ ...typeScale.section, color: colors.onSurface, textAlign: 'center', margin: `0 0 ${spacing.lg}` }}>
              Hear the output
            </h2>
            <SampleAudioCard />
          </div>
        </section>

        {/* ── 4. CREDIBILITY: Star Bobatoon + the STAR method ── */}
        <section style={sectionStyle}>
          <div style={{ ...sectionInner, maxWidth: 900 }}>
            <div className="landing-credibility" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: spacing.xl, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: radius.full,
                    background: `linear-gradient(135deg, ${colors.secondaryContainer}, ${colors.primaryContainer})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-newsreader), Georgia, serif',
                    fontSize: 48,
                    fontWeight: 500,
                    color: colors.onPrimaryContainer,
                    border: `1px solid ${colors.outlineVariant}`,
                  }}
                >
                  SB
                </div>
                <span style={{ ...labelStyle, color: colors.primary, letterSpacing: '0.1em' }}>Star Bobatoon</span>
              </div>
              <div>
                <h2 style={{ ...typeScale.section, color: colors.onSurface, margin: `0 0 ${spacing.md}` }}>
                  Built on a proven speaking method
                </h2>
                <p style={{ ...typeScale.bodySerif, color: colors.onSurfaceVariant, margin: `0 0 ${spacing.lg}` }}>
                  Star Bobatoon has coached leaders and speakers for years. Star Speaker AI encodes that
                  same method — <strong style={{ color: colors.onSurface }}>MAP → Hook → Story → Point → CTA → Exit</strong> —
                  so every speech is structured the way a great talk actually lands.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                  {METHOD.map(({ step, desc }) => (
                    <div
                      key={step}
                      title={desc}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: radius.full,
                        border: `1px solid ${colors.outlineVariant}`,
                        backgroundColor: colors.surface.containerLow,
                        color: colors.onSurface,
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. TESTIMONIAL ── */}
        <section style={{ ...sectionStyle, backgroundColor: colors.surface.dim }}>
          <div style={{ ...sectionInner, maxWidth: 720, textAlign: 'center' }}>
            <Quote size={32} color={colors.primary} style={{ margin: '0 auto' }} />
            <p style={{ ...typeScale.section, fontWeight: 400, color: colors.onSurface, margin: `${spacing.lg} 0`, fontSize: 'clamp(1.375rem, 2vw + 0.75rem, 1.75rem)', lineHeight: 1.4 }}>
              &ldquo;I walked in with a blank page and walked out with a speech I was proud to deliver.
              It sounded like me — only sharper.&rdquo;
            </p>
            <p style={{ ...labelStyle, color: colors.primary, letterSpacing: '0.1em' }}>A Star Speaker AI speaker</p>
          </div>
        </section>

        {/* ── 6. FINAL CTA ── */}
        <section style={{ ...sectionStyle, textAlign: 'center' }}>
          <div style={sectionInner}>
            <h2 style={{ ...typeScale.hero, fontSize: 'clamp(2rem, 4vw + 1rem, 3rem)', color: colors.onSurface, margin: `0 0 ${spacing.md}` }}>
              Own your stage.
            </h2>
            <p style={{ ...typeScale.bodySerif, color: colors.onSurfaceVariant, maxWidth: 560, margin: `0 auto ${spacing.lg}` }}>
              Your next speech is a few questions away.
            </p>
            <button
              onClick={goCompose}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.sm,
                backgroundColor: colors.primary,
                color: colors.onPrimary,
                border: 'none',
                borderRadius: radius.full,
                padding: '16px 34px',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              Compose your speech
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: `1px solid ${colors.outlineVariant}`,
          backgroundColor: colors.surface.base,
          padding: `${spacing.xl} 24px 96px`,
        }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <span style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>© {new Date().getFullYear()} Star Speaker AI</span>
          <nav style={{ display: 'flex', gap: spacing.lg }}>
            <Link href="/compose" style={footerLink}>Compose</Link>
            <Link href="/library" style={footerLink}>Library</Link>
            <Link href="/terms" style={footerLink}>Terms of Service</Link>
          </nav>
        </div>
      </footer>

      <MobileNav active={null} />

      <style jsx global>{`
        @media (max-width: 860px) {
          .landing-steps { grid-template-columns: 1fr !important; }
          .landing-credibility { grid-template-columns: 1fr !important; text-align: center; }
        }
      `}</style>
    </div>
  );
}

const sectionStyle = {
  padding: '80px 24px',
  backgroundColor: colors.surface.base,
} as const;

const sectionInner = {
  maxWidth: 1000,
  margin: '0 auto',
} as const;

const cardStyle = {
  backgroundColor: colors.surface.container,
  border: `1px solid ${colors.outlineVariant}`,
  borderRadius: radius.xl,
  padding: spacing.lg,
} as const;

const footerLink = {
  color: colors.onSurfaceVariant,
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 500,
} as const;
