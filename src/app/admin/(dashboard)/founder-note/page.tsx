'use client';

import { useState, useEffect, useRef } from 'react';
import { colors, typography, radius, spacing } from '@/lib/design-tokens';

// ─── Default Sample Text ───────────────────────────────────────────

const DEFAULT_TEXT = `(break) Hey everyone, this is Stefan speaking. (break)

I just wanted to take a moment to personally welcome you to today's webinar. (emphasis)We've got something truly special in store for you.(/emphasis)

I've spent the last decade helping speakers own their stage, and today I'm going to share the exact framework that has transformed hundreds of careers. (break)

Whether you're just starting out or you're a seasoned pro looking to level up, there's something here for everyone. (calm)So sit back, grab your notebook, and let's dive in.(/calm)

(whisper)This is going to be a game-changer.(/whisper)`;

// ─── Component ─────────────────────────────────────────────────────

export default function FounderNotePage() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // ── Load existing audio on mount ──
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    fetch('/api/audio/founder-note')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.exists && data?.url) {
          setAudioUrl(data.url);
          setUpdatedAt(data.updatedAt);
        }
      })
      .catch(() => { /* no existing audio is fine */ });
  }, []);

  // ── Generate audio ──
  async function handleGenerate() {
    if (!text.trim()) {
      setError('Please enter some text for the founder note.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatusMsg('Synthesizing speech with Fish Audio...');
    setAudioUrl(null);

    try {
      const res = await fetch('/api/audio/founder-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      if (data.success && data.url) {
        setAudioUrl(data.url);
        setUpdatedAt(new Date().toISOString());
        setStatusMsg('Audio generated successfully!');
        // Auto-play the new audio
        setTimeout(() => {
          audioRef.current?.load();
          audioRef.current?.play().catch(() => {
            // Autoplay may be blocked by browser
          });
        }, 200);
      } else {
        throw new Error('API returned success but no URL.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setStatusMsg('');
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Styles ──
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.surface.containerLow,
    border: `1px solid ${colors.outlineVariant}`,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  };

  const buttonStyle: React.CSSProperties = {
    ...typography.uiLabel,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.sm} ${spacing.lg}`,
    borderRadius: radius.md,
    border: 'none',
    cursor: isGenerating ? 'not-allowed' : 'pointer',
    opacity: isGenerating ? 0.6 : 1,
    transition: 'opacity 0.2s ease, background-color 0.2s ease',
    letterSpacing: '0.05em',
    fontWeight: 600,
  };

  const primaryBtnStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: colors.primary,
    color: '#000',
  };

  const secondaryBtnStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: colors.surface.containerHigh,
    color: colors.onSurface,
    border: `1px solid ${colors.outlineVariant}`,
  };

  return (
    <div style={{ padding: spacing.lg, maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1
          style={{
            ...typography.h2,
            color: colors.onSurface,
            marginBottom: spacing.xs,
          }}
        >
          Founder Audio Note
        </h1>
        <p style={{ ...typography.body, color: colors.outline }}>
          Generate a personalized audio greeting from Stefan for webinar intros and welcome sequences.
          Uses Fish Audio TTS with Stefan&apos;s voice model.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            ...cardStyle,
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            border: `1px solid rgba(244, 67, 54, 0.3)`,
            color: '#ef5350',
            marginBottom: spacing.lg,
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Status Message */}
      {statusMsg && !error && (
        <div
          style={{
            ...cardStyle,
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            border: `1px solid rgba(76, 175, 80, 0.3)`,
            color: '#66bb6a',
            marginBottom: spacing.lg,
          }}
        >
          ✓ {statusMsg}
        </div>
      )}

      {/* Text Input */}
      <div style={cardStyle}>
        <label
          style={{
            ...typography.uiLabel,
            color: colors.onSurface,
            display: 'block',
            marginBottom: spacing.sm,
            letterSpacing: '0.05em',
          }}
        >
          FOUNDER NOTE SCRIPT
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder="Enter the founder note script here..."
          style={{
            width: '100%',
            padding: spacing.md,
            backgroundColor: colors.surface.containerHighest,
            border: `1px solid ${colors.outlineVariant}`,
            borderRadius: radius.md,
            color: colors.onSurface,
            ...typography.body,
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '1.6',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = colors.outlineVariant;
          }}
        />
        <div
          style={{
            ...typography.caption,
            color: colors.outline,
            marginTop: spacing.xs,
          }}
        >
          {text.length} / 5000 characters • Supports Fish Audio tags: (break), (emphasis)...(/emphasis), (calm)...(/calm), (whisper)...(/whisper)
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          style={primaryBtnStyle}
          onMouseEnter={(e) => {
            if (!isGenerating) e.currentTarget.style.backgroundColor = '#c9a84c';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors.primary;
          }}
        >
          {isGenerating ? (
            <>
              <Spinner /> Generating...
            </>
          ) : (
            <>
              <IconMic /> Generate Audio
            </>
          )}
        </button>

        {audioUrl && (
          <button
            onClick={() => {
              setAudioUrl(null);
              handleGenerate();
            }}
            disabled={isGenerating}
            style={secondaryBtnStyle}
            onMouseEnter={(e) => {
              if (!isGenerating) e.currentTarget.style.backgroundColor = colors.surface.containerHighest;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.surface.containerHigh;
            }}
          >
            <IconRefresh /> Regenerate
          </button>
        )}
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div style={cardStyle}>
          <div
            style={{
              ...typography.uiLabel,
              color: colors.onSurface,
              marginBottom: spacing.md,
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>CURRENT AUDIO</span>
            {updatedAt && (
              <span style={{ ...typography.caption, color: colors.outline }}>
                Updated {new Date(updatedAt).toLocaleString()}
              </span>
            )}
          </div>

          <audio
            ref={audioRef}
            controls
            src={audioUrl}
            style={{
              width: '100%',
              borderRadius: radius.md,
            }}
          />

          <div
            style={{
              ...typography.caption,
              color: colors.outline,
              marginTop: spacing.sm,
              wordBreak: 'break-all',
            }}
          >
            URL: {audioUrl}
          </div>

          <div style={{ marginTop: spacing.md, display: 'flex', gap: spacing.sm }}>
            <a
              href={audioUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...typography.uiLabel,
                color: colors.primary,
                textDecoration: 'none',
                letterSpacing: '0.05em',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              ↗ Open in new tab
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline Icons ──────────────────────────────────────────────────

function IconMic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{
        animation: 'spin 1s linear infinite',
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
