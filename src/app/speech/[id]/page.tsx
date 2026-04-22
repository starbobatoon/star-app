'use client';

import React, { useState, useRef, useCallback } from 'react';
import { colors, typography, spacing, radius, glassmorphism } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';

// ─── Mock Data ─────────────────────────────────────────────────────
// Real data comes from API in Wave 3. This represents a complete 5-section speech.

interface SpeechSection {
  id: string;
  title: string;
  content: string;
}

interface SpeechData {
  id: string;
  title: string;
  voice: string;
  voiceLabel: string;
  totalDuration: string;
  sections: SpeechSection[];
}

const mockSpeech: SpeechData = {
  id: 'demo-1',
  title: 'The Future of AI Governance',
  voice: 'arthur',
  voiceLabel: 'Arthur (British Male, Authoritative)',
  totalDuration: '02:30',
  sections: [
    {
      id: 'opening',
      title: 'Opening',
      content:
        'Ladies and gentlemen, distinguished guests, and colleagues. We stand today at a precipice of technological evolution that is unlike any humanity has previously encountered. The tools we are developing are not merely extensions of our physical capabilities, as the steam engine or the printing press were. They are extensions of our cognitive capacities.',
    },
    {
      id: 'problem',
      title: 'The Problem',
      content:
        'This fundamental shift requires a correspondingly profound shift in how we approach governance. We cannot regulate artificial intelligence using the paradigms designed for the industrial age. We must construct frameworks that are as adaptive, as nuanced, and as global as the technology itself.',
    },
    {
      id: 'vision',
      title: 'A Vision for Governance',
      content:
        'The challenge before us is not to stifle innovation, but to steer it. We must ensure that these powerful systems remain aligned with human values, that they promote equity rather than exacerbating division, and that their development is transparent and accountable.',
    },
    {
      id: 'call-to-action',
      title: 'Call to Action',
      content:
        'I call upon every stakeholder in this room — policymakers, technologists, civil society leaders — to commit to three principles: first, transparency in algorithmic decision-making; second, inclusive participation in governance frameworks; and third, accountability mechanisms that hold power to account.',
    },
    {
      id: 'closing',
      title: 'Closing',
      content:
        'Let us not fear the future, but rather, let us shape it with intention and wisdom. The choices we make today will echo through generations. Let those echoes be ones of courage, foresight, and an unwavering commitment to the common good. Thank you.',
    },
  ],
};

// ─── Icon Components ────────────────────────────────────────────────

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

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L5.04 9.81C4.5 9.31 3.79 9 3 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.42-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" fill="currentColor" />
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

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor" />
    </svg>
  );
}

function VoiceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.58 14.48 17 12 17s-4.52-2.42-4.93-5.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3.34 3.18 5.98 6.41 6.36V21c0 .55.45 1 1 1s1-.45 1-1v-2.5c3.23-.38 5.92-3.02 6.41-6.36.1-.6-.39-1.14-1-1.14z" fill="currentColor" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.5v7a4.47 4.47 0 002.5-3.5zM14 3.23v2.06A6.993 6.993 0 0121 12a6.993 6.993 0 01-7 6.71v2.06A8.994 8.994 0 0023 12a8.994 8.994 0 00-9-8.77z" fill="currentColor" />
    </svg>
  );
}

// ─── Page Component ────────────────────────────────────────────────

export default function SpeechPreviewPage() {
  const speech = mockSpeech;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(45); // mock: 45 seconds in
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const duration = 150; // 2:30 in seconds
  const progressRatio = currentTime / duration;

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setCurrentTime(ratio * duration);
  }, [duration]);

  const handleRegenerate = (sectionId: string) => {
    setRegeneratingId(sectionId);
    // Simulate regeneration delay
    setTimeout(() => {
      setRegeneratingId(null);
    }, 1500);
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.surface.containerLowest }}>
      {/* Main Content Area */}
      <main
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: `80px ${spacing.lg} 160px`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Actions Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap' as const,
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
                textTransform: 'uppercase' as const,
                marginBottom: spacing.sm,
              }}
            >
              Speech Preview
            </div>
            <div
              style={{
                fontFamily: `var(${typography.h2.fontFamily})`,
                fontSize: typography.h2.fontSize,
                fontWeight: typography.h2.fontWeight,
                lineHeight: typography.h2.lineHeight,
                letterSpacing: typography.h2.letterSpacing,
                color: colors.onSurface,
              }}
            >
              {speech.title}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexShrink: 0 }}>
            <Button variant="secondary">
              <ShareIcon />
              Share Link
            </Button>
            <Button variant="primary">
              <DownloadIcon />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Transcript Sections */}
        <article style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          {speech.sections.map((section) => (
            <section key={section.id}>
              {/* Section Title + Regenerate Button */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing.sm,
                }}
              >
                <h3
                  style={{
                    fontFamily: `var(${typography.uiLabel.fontFamily})`,
                    fontSize: typography.uiLabel.fontSize,
                    fontWeight: typography.uiLabel.fontWeight,
                    lineHeight: typography.uiLabel.lineHeight,
                    letterSpacing: typography.uiLabel.letterSpacing,
                    color: colors.secondary,
                    textTransform: 'uppercase' as const,
                  }}
                >
                  {section.title}
                </h3>
                <button
                  onClick={() => handleRegenerate(section.id)}
                  disabled={regeneratingId === section.id}
                  style={{
                    background: 'none',
                    border: `1px solid ${colors.outlineVariant}`,
                    borderRadius: radius.DEFAULT,
                    color: colors.onSurfaceVariant,
                    fontFamily: `var(${typography.uiLabel.fontFamily})`,
                    fontSize: typography.caption.fontSize,
                    fontWeight: typography.caption.fontWeight,
                    letterSpacing: typography.uiLabel.letterSpacing,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    cursor: regeneratingId === section.id ? 'not-allowed' : 'pointer',
                    opacity: regeneratingId === section.id ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                    transition: 'border-color 0.2s ease, color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.color = colors.secondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.outlineVariant;
                    e.currentTarget.style.color = colors.onSurfaceVariant;
                  }}
                >
                  <RefreshIcon />
                  {regeneratingId === section.id ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>

              {/* Section Content — Newsreader serif */}
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

        {/* Download Audio Button */}
        <div
          style={{
            marginTop: spacing.xxl,
            paddingTop: spacing.lg,
            borderTop: `1px solid ${colors.surface.containerHigh}`,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Button variant="secondary" fullWidth>
            <DownloadIcon />
            Download Audio
          </Button>
        </div>
      </main>

      {/* Floating Audio Player — Glassmorphism */}
      <div
        className="glass"
        style={{
          position: 'fixed',
          bottom: spacing.md,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '600px',
          zIndex: 900,
          borderRadius: radius.lg,
          padding: spacing.md,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
        }}
      >
        {/* Voice label and time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: `var(${typography.caption.fontFamily})`,
            fontSize: typography.caption.fontSize,
            fontWeight: typography.caption.fontWeight,
            lineHeight: typography.caption.lineHeight,
            color: colors.onSurfaceVariant,
            padding: `0 ${spacing.sm}`,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
            <VoiceIcon />
            Voice: {speech.voiceLabel}
          </span>
          <span>
            {formatTime(currentTime)} / {speech.totalDuration}
          </span>
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: radius.full,
              background: colors.primary,
              color: colors.onPrimary,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            type="button"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          {/* Waveform Progress Bar */}
          <div
            ref={progressRef}
            onClick={handleScrub}
            style={{
              flex: 1,
              height: '32px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            role="slider"
            aria-label="Scrub audio"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressRatio * 100)}
            tabIndex={0}
          >
            {/* Background track */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                width: '100%',
                height: '2px',
                background: colors.surface.bright,
                borderRadius: radius.full,
              }}
            />
            {/* Progress fill */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                width: `${progressRatio * 100}%`,
                height: '2px',
                background: colors.primary,
                borderRadius: radius.full,
                transition: 'width 0.1s linear',
              }}
            />
            {/* Decorative waveform bars */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
                opacity: 0.5,
              }}
            >
              {Array.from({ length: 15 }, (_, i) => {
                const isPlayed = i / 15 < progressRatio;
                const height = `${8 + Math.sin(i * 0.8) * 12 + Math.abs(Math.cos(i * 0.3)) * 8}px`;
                return (
                  <div
                    key={i}
                    style={{
                      width: '2px',
                      height,
                      backgroundColor: isPlayed ? colors.primary : colors.surface.bright,
                      borderRadius: radius.full,
                      flexShrink: 0,
                      transition: 'background-color 0.3s ease',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Volume & Settings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexShrink: 0 }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: colors.onSurfaceVariant,
                cursor: 'pointer',
                padding: spacing.sm,
                lineHeight: 1,
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.onSurfaceVariant;
              }}
              aria-label="Volume"
              type="button"
            >
              <VolumeIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}