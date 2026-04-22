'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { colors, typography, radius, spacing } from '@/lib/design-tokens';

// ─── Types ────────────────────────────────────────────────────────

interface Voice {
  id: string;
  voiceId: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  sampleUrl?: string;
}

interface FishAudioConfig {
  isConfigured: boolean;
  apiKeyPreview: string | null;
  defaultVoiceId: string | null;
  ttsModel: string;
  volume: number;
  speed: number;
  loudnessNormalization: boolean;
  textNormalization: boolean;
}

// ─── Icon Helpers ─────────────────────────────────────────────────

function SettingsVoiceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 9H5v6h2V9zm4-4H9v14h2V5zm4 2h-2v10h2V7zm4 4h-2v6h2v-6z" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
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

const alertStyle = (type: 'error' | 'success' | 'warning'): React.CSSProperties => ({
  padding: spacing.md,
  borderRadius: radius.DEFAULT,
  backgroundColor: type === 'error' ? `${colors.error}10` : type === 'success' ? `${colors.primary}10` : `${colors.secondary}10`,
  border: `1px solid ${type === 'error' ? colors.error : type === 'success' ? colors.primary : colors.secondary}`,
  color: type === 'error' ? colors.error : type === 'success' ? colors.primary : colors.secondary,
  ...typography.uiBody,
});

const DEFAULT_PREVIEW_TEXT = 'Hello! This is a preview of my voice for your STAR speeches.';

// ─── Page Component ───────────────────────────────────────────────

export default function VoiceConfigPage() {
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fish Audio Config
  const [fishAudioConfig, setFishAudioConfig] = useState<FishAudioConfig | null>(null);
  const [fishAudioKey, setFishAudioKey] = useState('');
  const [showFishAudioKey, setShowFishAudioKey] = useState(false);
  const [isSavingFishKey, setIsSavingFishKey] = useState(false);
  const [fishKeyStatus, setFishKeyStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [fishKeyError, setFishKeyError] = useState<string | null>(null);
  const [defaultVoiceId, setDefaultVoiceId] = useState('e75e1618ff544059be71409c5126b4c0');
  const [testVoiceStatus, setTestVoiceStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testVoiceError, setTestVoiceError] = useState<string | null>(null);

  // Audio Settings
  const [ttsModel, setTtsModel] = useState('s2-pro');
  const [volume, setVolume] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [loudnessNorm, setLoudnessNorm] = useState(true);
  const [textNorm, setTextNorm] = useState(false);
  const [isSavingAudioSettings, setIsSavingAudioSettings] = useState(false);
  const [audioSettingsStatus, setAudioSettingsStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Voices
  const [voices, setVoices] = useState<Voice[]>([]);
  const [newVoiceId, setNewVoiceId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [previewTexts, setPreviewTexts] = useState<Record<string, string>>({});
  const [previewStates, setPreviewStates] = useState<Record<string, 'idle' | 'loading' | 'playing' | 'error'>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // Fish Audio Account Voices (from API)
  const [fishAudioVoices, setFishAudioVoices] = useState<FishAudioVoice[]>([]);
  const [isLoadingFishVoices, setIsLoadingFishVoices] = useState(false);
  const [fishVoicesError, setFishVoicesError] = useState<string | null>(null);
  const [importingVoiceId, setImportingVoiceId] = useState<string | null>(null);

  // ─── Load Data on Mount ─────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // Load Fish Audio config
      const faRes = await fetch('/api/admin/fish-audio');
      if (faRes.ok) {
        const faData = await faRes.json();
        if (faData.integration) {
          setFishAudioConfig({
            isConfigured: faData.integration.is_configured,
            apiKeyPreview: faData.integration.api_key_preview,
            defaultVoiceId: faData.integration.default_voice_id || null,
            ttsModel: faData.integration.tts_model || 's2-pro',
            volume: faData.integration.volume ?? 0,
            speed: faData.integration.speed ?? 1.0,
            loudnessNormalization: faData.integration.loudness_normalization ?? true,
            textNormalization: faData.integration.text_normalization ?? false,
          });
          if (faData.integration.default_voice_id) {
            setDefaultVoiceId(faData.integration.default_voice_id);
          }
          setTtsModel(faData.integration.tts_model || 's2-pro');
          setVolume(faData.integration.volume ?? 0);
          setSpeed(faData.integration.speed ?? 1.0);
          setLoudnessNorm(faData.integration.loudness_normalization ?? true);
          setTextNorm(faData.integration.text_normalization ?? false);
        }
      }

      // Load voices
      const voicesRes = await fetch('/api/admin/voices');
      if (voicesRes.ok) {
        const voicesData = await voicesRes.json();
        setVoices(voicesData.voices?.map((v: { id: string; fish_audio_voice_id: string; label: string; is_active: boolean; created_at: string }) => ({
          id: v.id,
          voiceId: v.fish_audio_voice_id,
          label: v.label,
          isActive: v.is_active,
          createdAt: v.created_at?.split('T')[0] || 'Unknown',
        })) || []);
      }

      // Load Fish Audio account voices (from API) if configured
      const isConfigured = faRes.ok && faData?.integration?.is_configured;
      if (isConfigured) {
        loadFishAudioVoices();
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Load Fish Audio Account Voices ───────────────────────
  const loadFishAudioVoices = async () => {
    setIsLoadingFishVoices(true);
    setFishVoicesError(null);
    try {
      const res = await fetch('/api/admin/fish-audio/voices');
      if (res.ok) {
        const data = await res.json();
        setFishAudioVoices(data.voices || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setFishVoicesError(errData.error || 'Failed to load voices from Fish Audio');
      }
    } catch {
      setFishVoicesError('Network error loading Fish Audio voices');
    } finally {
      setIsLoadingFishVoices(false);
    }
  };

  // ─── Import Fish Audio Voice to Local DB ─────────────────
  const handleImportVoice = async (faVoice: FishAudioVoice) => {
    setImportingVoiceId(faVoice.id);
    try {
      const res = await fetch('/api/admin/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fishAudioVoiceId: faVoice.id,
          label: faVoice.title,
          isActive: voices.length === 0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setVoices((prev) => [
          ...prev,
          {
            id: data.voice.id,
            voiceId: data.voice.fish_audio_voice_id,
            label: data.voice.label,
            isActive: data.voice.is_active,
            createdAt: data.voice.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          },
        ]);
      }
    } catch {
      // ignore
    } finally {
      setImportingVoiceId(null);
    }
  };

  // ─── Fish Audio Config Handlers ─────────────────────────────
  const handleSaveFishAudioKey = async () => {
    if (!fishAudioKey) return;
    setIsSavingFishKey(true);
    setFishKeyStatus('testing');

    try {
      const res = await fetch('/api/admin/fish-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: fishAudioKey,
          voiceId: defaultVoiceId,
          ttsModel,
          volume,
          speed,
          loudnessNormalization: loudnessNorm,
          textNormalization: textNorm,
        }),
      });

      const data = await res.json();
      if (res.ok && data.validationStatus === 'valid') {
        setFishKeyStatus('valid');
        setFishAudioConfig({
          isConfigured: true,
          apiKeyPreview: `****${fishAudioKey.slice(-4)}`,
          defaultVoiceId,
          ttsModel,
          volume,
          speed,
          loudnessNormalization: loudnessNorm,
          textNormalization: textNorm,
        });
        setFishAudioKey('');
      } else {
        setFishKeyStatus('invalid');
        setFishKeyError(data.validationMessage || 'Invalid API key. Please check and try again.');
      }
    } catch (err) {
      setFishKeyStatus('invalid');
      setFishKeyError(err instanceof Error ? err.message : 'Network error. Check your connection.');
    } finally {
      setIsSavingFishKey(false);
    }
  };

  const handleDeleteFishAudioKey = async () => {
    if (!confirm('Are you sure you want to remove the Fish Audio API key?')) return;

    try {
      const res = await fetch('/api/admin/fish-audio', { method: 'DELETE' });
      if (res.ok) {
        setFishAudioConfig(null);
        setFishKeyStatus('idle');
      }
    } catch {
      // ignore
    }
  };

  
  // ─── Audio Settings Handler ───────────────────────────────────

  const handleSaveAudioSettings = async () => {
    setIsSavingAudioSettings(true);
    setAudioSettingsStatus('idle');
    try {
      const res = await fetch('/api/admin/fish-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: undefined,
          voiceId: defaultVoiceId,
          ttsModel,
          volume,
          speed,
          loudnessNormalization: loudnessNorm,
          textNormalization: textNorm,
        }),
      });

      if (res.ok) {
        setAudioSettingsStatus('saved');
      } else {
        setAudioSettingsStatus('error');
      }
    } catch {
      setAudioSettingsStatus('error');
    } finally {
      setIsSavingAudioSettings(false);
    }
  };

// ─── Test Voice Handler ───────────────────────────────────
  const handleTestVoice = async () => {
    setTestVoiceStatus('testing');
    setTestVoiceError(null);
    try {
      const res = await fetch('/api/admin/fish-audio/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: fishAudioKey || undefined, voiceId: defaultVoiceId }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setTestVoiceStatus('success');
      } else {
        setTestVoiceStatus('failed');
        setTestVoiceError(data.message || 'Voice test failed. Check your API key and Voice ID.');
      }
    } catch (err) {
      setTestVoiceStatus('failed');
      setTestVoiceError(err instanceof Error ? err.message : 'Network error. Check your connection.');
    }
  };

  // ─── Voice Handlers ─────────────────────────────────────────
  const handleSetVoiceActive = async (voiceId: string) => {
    try {
      const res = await fetch(`/api/admin/voices/${voiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });

      if (res.ok) {
        setVoices((prev) =>
          prev.map((v) => ({
            ...v,
            isActive: v.id === voiceId,
          })),
        );
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteVoice = async (voiceId: string) => {
    const voice = voices.find(v => v.id === voiceId);
    const confirmMsg = voice?.isActive
      ? 'Delete this active voice? Another voice will be activated automatically if available.'
      : 'Delete this voice?';
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/voices/${voiceId}`, { method: 'DELETE' });
      if (res.ok) {
        setVoices((prev) => {
          const filtered = prev.filter((v) => v.id !== voiceId);
          if (filtered.length > 0 && !filtered.some((v) => v.isActive)) {
            return filtered.map((v, i) => i === 0 ? { ...v, isActive: true } : v);
          }
          return filtered;
        });
      }
    } catch {
      // ignore
    }
  };

  const handleAddVoice = async () => {
    if (!newVoiceId.trim() || !newLabel.trim()) return;

    try {
      const res = await fetch('/api/admin/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fishAudioVoiceId: newVoiceId.trim(),
          label: newLabel.trim(),
          isActive: voices.length === 0,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setVoices((prev) => [
          ...prev,
          {
            id: data.voice.id,
            voiceId: data.voice.fish_audio_voice_id,
            label: data.voice.label,
            isActive: data.voice.is_active,
            createdAt: data.voice.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          },
        ]);
        setNewVoiceId('');
        setNewLabel('');
        setShowAddForm(false);
      }
    } catch {
      // ignore
    }
  };

  // ─── Preview Handler (Real Fish Audio API) ─────────────────
  const handlePreview = async (voiceId: string) => {
    const voice = voices.find((v) => v.id === voiceId);
    if (!voice) return;

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

    setPreviewStates((prev) => ({ ...prev, [voiceId]: 'loading' }));

    try {
      const text = previewTexts[voiceId] || DEFAULT_PREVIEW_TEXT;
      const res = await fetch('/api/admin/voices/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fishAudioVoiceId: voice.voiceId, text }),
      });

      if (!res.ok) {
        let errorMsg = 'Preview failed';
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch {
          // response was not JSON
        }
        setPreviewErrors((prev) => ({ ...prev, [voiceId]: errorMsg }));
        setPreviewStates((prev) => ({ ...prev, [voiceId]: 'error' }));
        return;
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audioRefs.current[voiceId] = audio;

      audio.addEventListener('ended', () => {
        setPreviewStates((prev) => ({ ...prev, [voiceId]: 'idle' }));
        URL.revokeObjectURL(audioUrl);
      });

      audio.addEventListener('error', () => {
        setPreviewStates((prev) => ({ ...prev, [voiceId]: 'error' }));
        URL.revokeObjectURL(audioUrl);
      });

      await audio.play();
      setPreviewStates((prev) => ({ ...prev, [voiceId]: 'playing' }));
    } catch {
      setPreviewStates((prev) => ({ ...prev, [voiceId]: 'error' }));
    }
  };

  // ─── Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={pageStyle}>
        <main style={mainStyle}>
          <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.onSurfaceVariant }}>
            Loading configuration...
          </div>
        </main>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <main style={mainStyle}>
        {/* Page Header */}
        <div style={headerStyle}>
          <h1 style={h1Style}>Voice Configuration</h1>
          <p style={subtitleStyle}>
            Manage Fish Audio voice IDs for speech generation. Configure your API key, add voices, and test them before setting them active for production use.
          </p>
        </div>

        {loadError && (
          <div style={alertStyle('error')}>Error: {loadError}</div>
        )}

        {/* Fish Audio Configuration Section */}
        <div style={cardContainerStyle}>
          <div style={sectionHeaderStyle}>
            <div style={sectionTitleRowStyle}>
              <span style={sectionIconStyle}><KeyIcon /></span>
              <h2 style={sectionTitleStyle}>Fish Audio Configuration</h2>
            </div>
            {fishAudioConfig?.isConfigured && (
              <span style={{ ...typography.uiLabel, color: colors.primary }}>
                Voice: Enabled
              </span>
            )}
          </div>

          {/* Status Badge */}
          {fishAudioConfig?.isConfigured ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.md,
              backgroundColor: `${colors.primary}08`,
              border: `1px solid ${colors.primary}`,
              borderRadius: radius.DEFAULT,
              marginBottom: spacing.md,
            }}>
              <span style={{ color: colors.primary, fontSize: '20px' }}>✓</span>
              <div style={{ flex: 1 }}>
                <span style={{ ...typography.uiBody, color: colors.onSurface }}>
                  API Key configured: <strong>{fishAudioConfig.apiKeyPreview}</strong>
                </span>
                {fishAudioConfig.defaultVoiceId && (
                  <p style={{ ...typography.caption, color: colors.onSurfaceVariant, margin: 0 }}>
                    Default Voice ID: {fishAudioConfig.defaultVoiceId.slice(0, 8)}...{fishAudioConfig.defaultVoiceId.slice(-4)}
                  </p>
                )}
              </div>
              <button
                style={dangerButtonStyle}
                onClick={handleDeleteFishAudioKey}
              >
                <DeleteIcon /> Remove
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: spacing.md }}>
              <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant, marginBottom: spacing.md }}>
                Configure Fish Audio to enable voice synthesis for speeches.
              </p>

              {/* API Key Field */}
              <div style={{ marginBottom: spacing.md }}>
                <label style={{ ...typography.uiLabel, color: colors.onSurfaceVariant, display: 'block', marginBottom: spacing.xs }}>
                  Fish Audio API Key
                </label>
                <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type={showFishAudioKey ? 'text' : 'password'}
                      value={fishAudioKey}
                      onChange={(e) => setFishAudioKey(e.target.value)}
                      placeholder="Enter Fish Audio API key..."
                      style={{
                        ...previewInputStyle,
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFishAudioKey((p) => !p)}
                    style={secondaryButtonStyle}
                  >
                    {showFishAudioKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                {fishKeyStatus === 'invalid' && (
                  <p style={{ ...typography.caption, color: colors.error, marginTop: spacing.xs }}>
                    {fishKeyError || 'Invalid API key. Please check and try again.'}
                  </p>
                )}
              </div>

              {/* Voice ID Field */}
              <div style={{ marginBottom: spacing.md }}>
                <label style={{ ...typography.uiLabel, color: colors.onSurfaceVariant, display: 'block', marginBottom: spacing.xs }}>
                  Fish Audio Voice ID
                </label>
                <input
                  type="text"
                  value={defaultVoiceId}
                  onChange={(e) => setDefaultVoiceId(e.target.value)}
                  placeholder="Enter Fish Audio Voice ID..."
                  style={{
                    ...previewInputStyle,
                    fontFamily: 'monospace',
                    marginBottom: spacing.xs,
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' as const }}>
                <button
                  style={{ ...secondaryButtonStyle, opacity: fishAudioKey ? 1 : 0.5 }}
                  onClick={handleTestVoice}
                  disabled={!fishAudioKey || testVoiceStatus === 'testing'}
                >
                  {testVoiceStatus === 'testing' ? (
                    <>
                      <span style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        border: `2px solid ${colors.secondary}`,
                        borderTopColor: 'transparent',
                        borderRadius: radius.full,
                        animation: 'spin 0.6s linear infinite',
                      }} />
                      Testing...
                    </>
                  ) : testVoiceStatus === 'success' ? (
                    <>✓ Tested</>
                  ) : (
                    <>Test Voice</>
                  )}
                </button>
                <button
                  style={{ ...primaryButtonStyle, opacity: fishAudioKey ? 1 : 0.5 }}
                  onClick={handleSaveFishAudioKey}
                  disabled={!fishAudioKey || isSavingFishKey}
                >
                  {isSavingFishKey ? 'Testing...' : fishKeyStatus === 'valid' ? '✓ Saved' : 'Save'}
                </button>
              </div>

              {testVoiceStatus === 'failed' && (
                <p style={{ ...typography.caption, color: colors.error, marginTop: spacing.xs }}>
                  {testVoiceError || 'Voice test failed. Please check your API key and Voice ID.'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Audio Settings Section */}
        {fishAudioConfig?.isConfigured && (
          <div style={cardContainerStyle}>
            <div style={sectionHeaderStyle}>
              <div style={sectionTitleRowStyle}>
                <span style={sectionIconStyle}><VolumeUpIcon /></span>
                <h2 style={{...sectionTitleStyle}}>Audio Settings</h2>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {/* TTS Model */}
              <div style={formRowStyle}>
                <label style={labelStyle}>TTS Model</label>
                <select
                  value={ttsModel}
                  onChange={(e) => setTtsModel(e.target.value)}
                  style={{
                    ...previewInputStyle,
                    cursor: 'pointer',
                  }}
                >
                  <option value="s2-pro">S2 Pro</option>
                  <option value="s2">S2</option>
                </select>
              </div>

              {/* Volume Slider */}
              <div style={formRowStyle}>
                <label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: spacing.xs}}>
                  Volume <span style={{ color: colors.onSurface }}>({volume})</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <span style={{...typography.caption, color: colors.onSurfaceVariant, minWidth: '24px', textAlign: 'right'}}>-5</span>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.5"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: colors.primary }}
                  />
                  <span style={{...typography.caption, color: colors.onSurfaceVariant, minWidth: '24px'}}>5</span>
                </div>
              </div>

              {/* Speed Slider */}
              <div style={formRowStyle}>
                <label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: spacing.xs}}>
                  Speed <span style={{ color: colors.onSurface }}>({speed.toFixed(1)}x)</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <span style={{...typography.caption, color: colors.onSurfaceVariant, minWidth: '24px', textAlign: 'right'}}>0.7</span>
                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: colors.primary }}
                  />
                  <span style={{...typography.caption, color: colors.onSurfaceVariant, minWidth: '24px'}}>1.3</span>
                </div>
              </div>

              {/* Loudness Normalization Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${spacing.sm} 0` }}>
                <div>
                  <span style={{...labelStyle}}>Loudness Normalization</span>
                  <p style={{...typography.caption, color: colors.onSurfaceVariant, margin: 0}}>Normalize audio loudness across different voices</p>
                </div>
                <button
                  onClick={() => setLoudnessNorm(!loudnessNorm)}
                  style={{
                    width: '48px',
                    height: '26px',
                    borderRadius: radius.full,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: loudnessNorm ? colors.primary : colors.surface.containerHighest,
                    position: 'relative',
                    transition: 'background-color 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '3px',
                    left: loudnessNorm ? '25px' : '3px',
                    width: '20px',
                    height: '20px',
                    borderRadius: radius.full,
                    backgroundColor: loudnessNorm ? colors.onPrimary : colors.onSurfaceVariant,
                    transition: 'left 0.2s ease',
                  }} />
                </button>
              </div>

              {/* Text Normalization Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${spacing.sm} 0` }}>
                <div>
                  <span style={{...labelStyle}}>Text Normalization</span>
                  <p style={{...typography.caption, color: colors.onSurfaceVariant, margin: 0}}>Normalize text before synthesis (numbers, dates, etc.)</p>
                </div>
                <button
                  onClick={() => setTextNorm(!textNorm)}
                  style={{
                    width: '48px',
                    height: '26px',
                    borderRadius: radius.full,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: textNorm ? colors.primary : colors.surface.containerHighest,
                    position: 'relative',
                    transition: 'background-color 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '3px',
                    left: textNorm ? '25px' : '3px',
                    width: '20px',
                    height: '20px',
                    borderRadius: radius.full,
                    backgroundColor: textNorm ? colors.onPrimary : colors.onSurfaceVariant,
                    transition: 'left 0.2s ease',
                  }} />
                </button>
              </div>

              {/* Save Button */}
              <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end', paddingTop: spacing.sm }}>
                <button
                  style={primaryButtonStyle}
                  onClick={handleSaveAudioSettings}
                  disabled={isSavingAudioSettings}
                >
                  {isSavingAudioSettings ? 'Saving...' : audioSettingsStatus === 'saved' ? '✓ Saved' : 'Save Audio Settings'}
                </button>
              </div>
              {audioSettingsStatus === 'error' && (
                <p style={{...typography.caption, color: colors.error}}>Failed to save audio settings.</p>
              )}
            </div>
          </div>
        )}

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
              disabled={!fishAudioConfig?.isConfigured}
            >
              <AddIcon />
              Add Voice
            </button>
          </div>

          {!fishAudioConfig?.isConfigured && (
            <div style={alertStyle('warning')}>
              ⚠️ Configure your Fish Audio API key above to add and test voices.
            </div>
          )}

          {/* Add Voice Form */}
          {showAddForm && (
            <div style={addFormStyle}>
              <div style={formRowStyle}>
                <label style={labelStyle}>Voice Label</label>
                <input
                  type="text"
                  placeholder="e.g. Default Voice"
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
                  style={{ ...textInputStyle, fontFamily: 'monospace' }}
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
                >
                  Cancel
                </button>
                <button
                  style={primaryButtonStyle}
                  onClick={handleAddVoice}
                  disabled={!newVoiceId.trim() || !newLabel.trim()}
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
                  value={previewTexts[voice.id] ?? DEFAULT_PREVIEW_TEXT}
                  onChange={(e) =>
                    setPreviewTexts((prev) => ({
                      ...prev,
                      [voice.id]: e.target.value,
                    }))
                  }
                  placeholder={DEFAULT_PREVIEW_TEXT}
                  style={previewInputStyle}
                  disabled={!fishAudioConfig?.isConfigured}
                />
                <div style={previewControlsStyle}>
                  <button
                    style={
                      previewStates[voice.id] === 'playing'
                        ? { ...dangerButtonStyle, opacity: 1 }
                        : { ...secondaryButtonStyle, opacity: fishAudioConfig?.isConfigured ? 1 : 0.5 }
                    }
                    onClick={() => handlePreview(voice.id)}
                    disabled={!fishAudioConfig?.isConfigured || previewStates[voice.id] === 'loading'}
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
                    {previewStates[voice.id] === 'error' && (
                      <>❌ Error</>
                    )}
                    {previewStates[voice.id] !== 'loading' && previewStates[voice.id] !== 'playing' && previewStates[voice.id] !== 'error' && (
                      <>
                        <PlayIcon /> Preview
                      </>
                    )}
                  </button>
                  {previewStates[voice.id] === 'error' && previewErrors[voice.id] && (
                    <span style={{ ...typography.caption, color: colors.error, maxWidth: '320px' }}>
                      {previewErrors[voice.id]}
                    </span>
                  )}
                  {previewStates[voice.id] === 'playing' && (
                    <span style={{ ...typography.caption, color: colors.primary, display: 'inline-flex', alignItems: 'center', gap: spacing.xs }}>
                      <VolumeUpIcon /> Playing...
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Row */}
              <div style={actionsRowStyle}>
                <button
                  style={dangerButtonStyle}
                  onClick={() => handleDeleteVoice(voice.id)}
                >
                  <DeleteIcon /> Delete
                </button>
              </div>
            </div>
          ))}

          {/* Fish Audio Account Voices (from API) */}
          {fishAudioConfig?.isConfigured && (
            <>
              <div style={{
                ...sectionHeaderStyle,
                borderTop: `1px solid ${colors.outlineVariant}`,
                paddingTop: spacing.md,
                marginTop: spacing.md,
              }}>
                <div style={sectionTitleRowStyle}>
                  <span style={sectionIconStyle}><CloudSyncIcon /></span>
                  <h2 style={sectionTitleStyle}>Voices in Your Fish Audio Account</h2>
                </div>
                <button
                  style={secondaryButtonStyle}
                  onClick={loadFishAudioVoices}
                  disabled={isLoadingFishVoices}
                >
                  {isLoadingFishVoices ? 'Refreshing...' : <><CloudSyncIcon /> Refresh</>}
                </button>
              </div>

              {fishVoicesError && (
                <div style={alertStyle('error')}>{fishVoicesError}</div>
              )}

              {fishAudioVoices.length === 0 && !isLoadingFishVoices && !fishVoicesError && (
                <div style={infoBoxStyle}>
                  <VolumeUpIcon />
                  <p style={infoTextStyle}>
                    No trained voices found in your Fish Audio account.
                    Create or train voices at{' '}<a href="https://fish.audio" target="_blank" rel="noopener noreferrer" style={{ color: colors.primary }}>fish.audio</a>,
                    then click Refresh.
                  </p>
                </div>
              )}

              {fishAudioVoices.map((fv) => {
                const isSaved = voices.some((v) => v.voiceId === fv.id);
                return (
                  <div
                    key={fv.id}
                    style={{
                      backgroundColor: isSaved ? `${colors.primary}05` : colors.surface.container,
                      border: `1px solid ${isSaved ? colors.primary + '40' : colors.outlineVariant}`,
                      borderRadius: radius.lg,
                      padding: spacing.md,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: spacing.md,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <span style={{ ...voiceLabelStyle, fontSize: '14px' }}>{fv.title}</span>
                        {isSaved && (
                          <span style={{
                            ...typography.caption,
                            color: colors.primary,
                            backgroundColor: `${colors.primary}15`,
                            padding: `${spacing.xs} ${spacing.sm}`,
                            borderRadius: radius.DEFAULT,
                          }}>
                            Saved locally
                          </span>
                        )}
                      </div>
                      <div style={{ ...typography.caption, color: colors.onSurfaceVariant, fontFamily: 'monospace', marginTop: spacing.xs }}>
                        {fv.id}
                      </div>
                      {fv.description && (
                        <p style={{ ...typography.caption, color: colors.onSurfaceVariant, margin: 0, marginTop: spacing.xs }}>
                          {fv.description.slice(0, 120)}{fv.description.length > 120 ? '...' : ''}
                        </p>
                      )}
                    </div>
                    {!isSaved ? (
                      <button
                        style={{
                          ...primaryButtonStyle,
                          fontSize: '11px',
                          padding: `${spacing.xs} ${spacing.sm}`,
                          opacity: importingVoiceId === fv.id ? 0.6 : 1,
                        }}
                        onClick={() => handleImportVoice(fv)}
                        disabled={importingVoiceId === fv.id}
                      >
                        {importingVoiceId === fv.id ? 'Adding...' : <><AddIcon /> Add to Saved</>}
                      </button>
                    ) : (
                      <span style={{ ...typography.caption, color: colors.onSurfaceVariant }}>
                        Already saved
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          )}

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