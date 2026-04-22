'use client';

import { useState, useRef, useCallback } from 'react';
import { colors, typography, radius, spacing } from '@/lib/design-tokens';

// ─── Types ────────────────────────────────────────────────────────

interface Voice {
  id: string;
  voiceId: string;
  label: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Mock Data ────────────────────────────────────────────────────

const INITIAL_VOICES: Voice[] = [
  {
    id: 'voice-1',
    voiceId: 'e75e1618ff544059be71409c5126b4c0',
    label: 'Stefan (Default)',
    isActive: true,
    createdAt: '2026-04-15',
  },
];

const PREVIEW_SENTENCE = 'The quick brown fox jumps over the lazy dog.';

// ─── Icon Helpers ─────────────────────────────────────────────────

function SettingsVoiceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 9H5v6h2V9zm4-4H9v14h2V5zm4 2h-2v10h2V7zm4 4h-2v6h2v-6z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function VolumeUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

// ─── Inline Styles ───────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: colors.surface.base,
  fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
  color: colors.onSurface,
};

const mainStyle: React.CSSProperties = {
  maxWidth: spacing.containerMax,
  margin: '0 auto',
  padding: spacing.xl,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.xl,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
};

const h1Style: React.CSSProperties = {
  ...typography.h1,
  color: colors.onSurface,
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  ...typography.uiBody,
  color: colors.onSurfaceVariant,
  margin: 0,
  maxWidth: '640px',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: `1px solid ${colors.outlineVariant}`,
  paddingBottom: spacing.md,
  marginBottom: spacing.md,
};

const sectionTitleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
};

const sectionIconStyle: React.CSSProperties = {
  color: colors.primary,
  display: 'flex',
  alignItems: 'center',
};

const sectionTitleStyle: React.CSSProperties = {
  ...typography.h2,
  color: colors.onSurface,
  fontSize: '20px',
  margin: 0,
};

const cardContainerStyle: React.CSSProperties = {
  backgroundColor: colors.surface.containerLow,
  border: `1px solid ${colors.outlineVariant}`,
  borderRadius: radius.lg,
  padding: spacing.lg,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
};

const voiceCardStyle = (isActive: boolean): React.CSSProperties => ({
  backgroundColor: isActive ? `${colors.primary}08` : colors.surface.container,
  border: `1px solid ${isActive ? colors.primary : colors.outlineVariant}`,
  borderRadius: radius.lg,
  padding: spacing.lg,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
  transition: 'border-color 0.2s ease, background-color 0.2s ease',
});

const voiceCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: spacing.sm,
};

const voiceLabelStyle: React.CSSProperties = {
  ...typography.uiBody,
  color: colors.onSurface,
  fontWeight: 600,
  margin: 0,
};

const voiceIdStyle: React.CSSProperties = {
  ...typography.caption,
  color: colors.onSurfaceVariant,
  fontFamily: 'monospace',
  backgroundColor: colors.surface.containerHighest,
  padding: `${spacing.xs} ${spacing.sm}`,
  borderRadius: radius.DEFAULT,
  wordBreak: 'break-all' as const,
};

const voiceMetaStyle: React.CSSProperties = {
  ...typography.caption,
  color: colors.onSurfaceVariant,
  margin: 0,
};

const buttonBase: React.CSSProperties = {
  fontFamily: `var(${typography.uiLabel.fontFamily})`,
  fontSize: typography.uiLabel.fontSize,
  fontWeight: typography.uiLabel.fontWeight,
  letterSpacing: typography.uiLabel.letterSpacing,
  lineHeight: typography.uiLabel.lineHeight,
  borderRadius: radius.DEFAULT,
  padding: `${spacing.sm} ${spacing.md}`,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacing.xs,
  border: 'none',
  outline: 'none',
  transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease',
  textTransform: 'uppercase' as const,
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonBase,
  backgroundColor: colors.primary,
  color: colors.onPrimary,
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonBase,
  backgroundColor: 'transparent',
  color: colors.secondary,
  border: `1px solid ${colors.outlineVariant}`,
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonBase,
  backgroundColor: 'transparent',
  color: colors.error,
  border: `1px solid ${colors.error}40`,
};

const activeTagStyle: React.CSSProperties = {
  ...typography.uiLabel,
  fontSize: typography.caption.fontSize,
  display: 'inline-flex',
  alignItems: 'center',
  gap: spacing.xs,
  padding: `${spacing.xs} ${spacing.sm}`,
  borderRadius: radius.DEFAULT,
  backgroundColor: `${colors.primary}20`,
  color: colors.primary,
  border: `1px solid ${colors.primary}`,
};

const inactiveTagStyle: React.CSSProperties = {
  ...typography.uiLabel,
  fontSize: typography.caption.fontSize,
  display: 'inline-flex',
  alignItems: 'center',
  gap: spacing.xs,
  padding: `${spacing.xs} ${spacing.sm}`,
  borderRadius: radius.DEFAULT,
  backgroundColor: colors.surface.containerHigh,
  color: colors.onSurfaceVariant,
  border: `1px solid ${colors.outlineVariant}`,
};

const previewSectionStyle: React.CSSProperties = {
  backgroundColor: colors.surface.containerHighest,
  border: `1px solid ${colors.outlineVariant}`,
  borderRadius: radius.lg,
  padding: spacing.md,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
};

const previewInputStyle: React.CSSProperties = {
  ...typography.uiBody,
  backgroundColor: colors.surface.container,
  color: colors.onSurface,
  border: `1px solid ${colors.outlineVariant}`,
  borderRadius: radius.DEFAULT,
  padding: `${spacing.sm} ${spacing.md}`,
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.2s ease',
};

const previewControlsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
};

const addFormStyle: React.CSSProperties = {
  backgroundColor: colors.surface.container,
  border: `1px solid ${colors.outlineVariant}`,
  borderRadius: radius.lg,
  padding: spacing.lg,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
};

const formRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.xs,
};

const labelStyle: React.CSSProperties = {
  ...typography.uiLabel,
  color: colors.onSurfaceVariant,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const textInputStyle: React.CSSProperties = {
  ...typography.uiBody,
  backgroundColor: 'transparent',
  color: colors.onSurface,
  border: 'none',
  borderBottom: `1px solid ${colors.outlineVariant}`,
  borderRadius: 0,
  padding: `${spacing.sm} 0`,
  width: '100%',
  outline: 'none',
  transition: 'border-bottom-color 0.2s ease',
  caretColor: colors.secondary,
};

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: colors.surface.containerHighest,
  border: `1px solid ${colors.outlineVariant}`,
  borderRadius: radius.DEFAULT,
  padding: spacing.md,
  display: 'flex',
  alignItems: 'flex-start',
  gap: spacing.sm,
};

const infoTextStyle: React.CSSProperties = {
  ...typography.caption,
  color: colors.onSurfaceVariant,
  lineHeight: '1.6',
  margin: 0,
};

const actionsRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  flexWrap: 'wrap' as const,
};

// ─── Page Component ───────────────────────────────────────────────

export default function VoiceConfigPage() {
  const [voices, setVoices] = useState<Voice[]>(INITIAL_VOICES);
  const [newVoiceId, setNewVoiceId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [previewTexts, setPreviewTexts] = useState<Record<string, string>>({});
  const [previewStates, setPreviewStates] = useState<Record<string, 'idle' | 'loading' | 'playing' | 'error'>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // ─── Handlers ────────────────────────────────────────────────

  const handleSetVoiceActive = useCallback((voiceId: string) => {
    setVoices((prev) =>
      prev.map((v) => ({
        ...v,
        isActive: v.id === voiceId,
      })),
    );
  }, []);

  const handleDeleteVoice = useCallback((voiceId: string) => {
    setVoices((prev) => {
      const filtered = prev.filter((v) => v.id !== voiceId);
      // If we deleted the active voice and others remain, make the first one active
      if (filtered.length > 0 && !filtered.some((v) => v.isActive)) {
        filtered[0].isActive = true;
      }
      return filtered;
    });
  }, []);

  const handleAddVoice = useCallback(() => {
    if (!newVoiceId.trim() || !newLabel.trim()) return;

    const newVoice: Voice = {
      id: `voice-${Date.now()}`,
      voiceId: newVoiceId.trim(),
      label: newLabel.trim(),
      isActive: false,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setVoices((prev) => [...prev, newVoice]);
    setNewVoiceId('');
    setNewLabel('');
    setShowAddForm(false);
  }, [newVoiceId, newLabel]);

  const handlePreview = useCallback((voiceId: string) => {
    const currentState = previewStates[voiceId];

    // If playing, stop
    if (currentState === 'playing') {
      const audio = audioRefs.current[voiceId];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPreviewStates((prev) => ({ ...prev, [voiceId]: 'idle' }));
      return;
    }

    // Mock: simulate loading then playing
    setPreviewStates((prev) => ({ ...prev, [voiceId]: 'loading' }));

    // Simulate API call delay
    setTimeout(() => {
      setPreviewStates((prev) => ({ ...prev, [voiceId]: 'playing' }));

      // Auto-stop after 3 seconds (mock playback duration)
      setTimeout(() => {
        setPreviewStates((prev) => {
          if (prev[voiceId] === 'playing') {
            return { ...prev, [voiceId]: 'idle' };
          }
          return prev;
        });
      }, 3000);
    }, 800);
  }, [previewStates]);

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      <main style={mainStyle}>
        {/* Page Header */}
        <div style={headerStyle}>
          <h1 style={h1Style}>Voice Configuration</h1>
          <p style={subtitleStyle}>
            Manage Fish Audio voice IDs for speech generation. Configure, label, and preview voices before setting them active for production use.
          </p>
        </div>

        {/* Voices Section */}
        <div style={cardContainerStyle}>
          {/* Section Header */}
          <div style={sectionHeaderStyle}>
            <div style={sectionTitleRowStyle}>
              <span style={sectionIconStyle}><SettingsVoiceIcon /></span>
              <h2 style={sectionTitleStyle}>Fish Audio Voices</h2>
            </div>
            <button
              style={primaryButtonStyle}
              onClick={() => setShowAddForm(true)}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.primaryContainer; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.primary; }}
            >
              <AddIcon />
              Add Voice
            </button>
          </div>

          {/* Add Voice Form */}
          {showAddForm && (
            <div style={addFormStyle}>
              <div style={formRowStyle}>
                <label style={labelStyle}>Voice Label</label>
                <input
                  type="text"
                  placeholder="e.g. Christy Female Pro"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  style={textInputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = colors.secondary; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = colors.outlineVariant; }}
                />
              </div>
              <div style={formRowStyle}>
                <label style={labelStyle}>Fish Audio Voice ID</label>
                <input
                  type="text"
                  placeholder="e.g. e75e1618ff544059be71409c5126b4c0"
                  value={newVoiceId}
                  onChange={(e) => setNewVoiceId(e.target.value)}
                  style={textInputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = colors.secondary; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = colors.outlineVariant; }}
                />
              </div>
              <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
                <button
                  style={secondaryButtonStyle}
                  onClick={() => {
                    setShowAddForm(false);
                    setNewVoiceId('');
                    setNewLabel('');
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.secondary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.outlineVariant; }}
                >
                  Cancel
                </button>
                <button
                  style={primaryButtonStyle}
                  onClick={handleAddVoice}
                  disabled={!newVoiceId.trim() || !newLabel.trim()}
                  onMouseEnter={(e) => {
                    if (e.currentTarget.style.opacity !== '0.5') {
                      e.currentTarget.style.backgroundColor = colors.primaryContainer;
                    }
                  }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.primary; }}
                >
                  <AddIcon />
                  Add Voice
                </button>
              </div>
            </div>
          )}

          {/* Voice Cards */}
          {voices.length === 0 && (
            <div style={infoBoxStyle}>
              <VolumeUpIcon />
              <p style={infoTextStyle}>
                No voices configured. Click &quot;Add Voice&quot; to add a Fish Audio voice ID.
              </p>
            </div>
          )}

          {voices.map((voice) => (
            <div key={voice.id} style={voiceCardStyle(voice.isActive)}>
              {/* Card Header: Label + Status Tag */}
              <div style={voiceCardHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <span style={voiceLabelStyle}>{voice.label}</span>
                  {voice.isActive ? (
                    <span style={activeTagStyle}>
                      <CheckIcon /> Active
                    </span>
                  ) : (
                    <span style={inactiveTagStyle}>Inactive</span>
                  )}
                </div>
                {!voice.isActive && (
                  <button
                    style={{
                      ...buttonBase,
                      backgroundColor: `${colors.primary}20`,
                      color: colors.primary,
                      border: `1px solid ${colors.primary}`,
                      fontSize: '11px',
                      padding: `${spacing.xs} ${spacing.sm}`,
                    }}
                    onClick={() => handleSetVoiceActive(voice.id)}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.primary; e.currentTarget.style.color = colors.onPrimary; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${colors.primary}20`; e.currentTarget.style.color = colors.primary; }}
                  >
                    Set as Active
                  </button>
                )}
              </div>

              {/* Voice ID */}
              <div style={voiceIdStyle}>{voice.voiceId}</div>

              {/* Meta info */}
              <p style={voiceMetaStyle}>Added {voice.createdAt}</p>

              {/* Preview Section */}
              <div style={previewSectionStyle}>
                <label style={{ ...labelStyle, marginBottom: spacing.xs }}>Preview Text</label>
                <input
                  type="text"
                  value={previewTexts[voice.id] ?? PREVIEW_SENTENCE}
                  onChange={(e) =>
                    setPreviewTexts((prev) => ({
                      ...prev,
                      [voice.id]: e.target.value,
                    }))
                  }
                  placeholder={PREVIEW_SENTENCE}
                  style={previewInputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = colors.secondary; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = colors.outlineVariant; }}
                />
                <div style={previewControlsStyle}>
                  <button
                    style={
                      previewStates[voice.id] === 'playing'
                        ? { ...dangerButtonStyle, opacity: 1 }
                        : { ...secondaryButtonStyle, opacity: 1 }
                    }
                    onClick={() => handlePreview(voice.id)}
                    onMouseEnter={(e) => {
                      if (previewStates[voice.id] !== 'playing') {
                        e.currentTarget.style.borderColor = colors.secondary;
                        e.currentTarget.style.color = colors.secondary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (previewStates[voice.id] !== 'playing') {
                        e.currentTarget.style.borderColor = colors.outlineVariant;
                        e.currentTarget.style.color = colors.secondary;
                      }
                    }}
                  >
                    {previewStates[voice.id] === 'loading' && (
                      <>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            border: `2px solid ${colors.secondary}`,
                            borderTopColor: 'transparent',
                            borderRadius: radius.full,
                            animation: 'spin 0.6s linear infinite',
                          }}
                        />
                        Generating...
                      </>
                    )}
                    {previewStates[voice.id] === 'playing' && (
                      <>
                        <StopIcon /> Stop
                      </>
                    )}
                    {previewStates[voice.id] !== 'loading' && previewStates[voice.id] !== 'playing' && (
                      <>
                        <PlayIcon /> Preview
                      </>
                    )}
                  </button>
                  {previewStates[voice.id] === 'playing' && (
                    <span style={{ ...typography.caption, color: colors.primary, display: 'inline-flex', alignItems: 'center', gap: spacing.xs }}>
                      <VolumeUpIcon /> Playing preview...
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Row */}
              <div style={actionsRowStyle}>
                {!voice.isActive && (
                  <button
                    style={dangerButtonStyle}
                    onClick={() => handleDeleteVoice(voice.id)}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${colors.error}20`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <DeleteIcon /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Info Box */}
          <div style={infoBoxStyle}>
            <span style={{ color: colors.onSurfaceVariant, fontSize: '14px', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </span>
            <p style={infoTextStyle}>
              Voice IDs must exactly match those provided in the Fish Audio developer console.
              Only one voice can be active at a time. Setting a new voice as active will deactivate the previous one.
              Invalid IDs will cause speech generation to fail gracefully to text-only mode.
            </p>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}