'use client';

import { useState, useEffect, useCallback } from 'react';
import { colors, typography, radius, spacing } from '@/styles/design-tokens';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';

// ─── Types ─────────────────────────────────────────────────────────

interface FishAudioConfig {
  isConfigured: boolean;
  apiKeyPreview: string | null;
  defaultVoiceId: string | null;
}

// ─── Icons ─────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

// ─── Page Component ────────────────────────────────────────────────

export default function VoicePage() {
  // Config state
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<FishAudioConfig | null>(null);

  // Form fields
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [voiceId, setVoiceId] = useState('');

  // UI state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Load current config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/fish-audio');
      if (res.ok) {
        const data = await res.json();
        if (data.integration) {
          setConfig({
            isConfigured: data.integration.is_configured ?? false,
            apiKeyPreview: data.integration.api_key_preview ?? null,
            defaultVoiceId: data.integration.default_voice_id ?? null,
          });
          if (data.integration.default_voice_id) {
            setVoiceId(data.integration.default_voice_id);
          }
        } else {
          setConfig({ isConfigured: false, apiKeyPreview: null, defaultVoiceId: null });
        }
      }
    } catch (err) {
      console.error('[voice-page] Failed to load config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Test voice handler
  const handleTestVoice = useCallback(async () => {
    if (!apiKey) return;
    setTestStatus('testing');
    setTestMessage('');
    try {
      const res = await fetch('/api/admin/fish-audio/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, voiceId }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestStatus('success');
        setTestMessage('Voice connection successful');
      } else {
        setTestStatus('error');
        setTestMessage(data.message || 'Connection failed');
      }
    } catch {
      setTestStatus('error');
      setTestMessage('Connection error');
    }
  }, [apiKey]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!apiKey) return;
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/admin/fish-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, voiceId }),
      });
      if (res.ok) {
        setSaveStatus('saved');
        setConfig((prev) =>
          prev
            ? {
                ...prev,
                isConfigured: true,
                apiKeyPreview: apiKey.length >= 4 ? `****${apiKey.slice(-4)}` : `****${apiKey}`,
                defaultVoiceId: voiceId,
              }
            : { isConfigured: true, apiKeyPreview: null, defaultVoiceId: voiceId }
        );
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  }, [apiKey, voiceId]);

  // Styles
  const sectionHeaderStyle: React.CSSProperties = {
    borderBottom: `1px solid ${colors.outlineVariant}`,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  };

  const sectionTitleStyle: React.CSSProperties = {
    ...typography.uiLabel,
    color: colors.onSurface,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
  };

  const fieldGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  };

  // ─── Loading ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: colors.surface.dim,
          fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
          padding: spacing.lg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', color: colors.onSurfaceVariant }}>
          <div style={{ marginBottom: spacing.md }}>Loading configuration...</div>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.surface.dim,
        fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
        padding: spacing.lg,
      }}
    >
      <div style={{ maxWidth: spacing.containerMax, margin: '0 auto' }}>
        {/* Page Header */}
        <header style={{ marginBottom: spacing.xl }}>
          <h1
            style={{
              ...typography.h2,
              color: colors.onSurface,
              margin: 0,
            }}
          >
            Voice Configuration
          </h1>
          <p
            style={{
              ...typography.uiBody,
              color: colors.onSurfaceVariant,
              marginTop: spacing.xs,
            }}
          >
            Configure Fish Audio API for voice synthesis.
          </p>
        </header>

        {/* Status Banner */}
        <div style={{ marginBottom: spacing.lg }}>
          {config?.isConfigured ? (
            <Tag variant="success">
              Voice: Enabled
            </Tag>
          ) : (
            <Tag variant="warning">
              Voice not enabled
            </Tag>
          )}
          {config?.apiKeyPreview && (
            <span
              style={{
                ...typography.caption,
                color: colors.onSurfaceVariant,
                marginLeft: spacing.md,
              }}
            >
              Key: {config.apiKeyPreview}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {/* ════ Fish Audio Settings ════ */}
          <Card>
            <div style={sectionHeaderStyle}>
              <h2 style={sectionTitleStyle}>
                <SpeakerIcon />
                Fish Audio
              </h2>
            </div>

            <div style={fieldGroupStyle}>
              {/* API Key Field */}
              <div style={{ position: 'relative' }}>
                <Input
                  label="Fish Audio API Key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestStatus('idle');
                  }}
                  placeholder="Enter your Fish Audio API key"
                  helperText="Your key is stored securely and encrypted."
                  error={testStatus === 'error'}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '24px',
                    background: 'none',
                    border: 'none',
                    color: colors.onSurfaceVariant,
                    cursor: 'pointer',
                    fontFamily: `var(${typography.uiLabel.fontFamily})`,
                    fontSize: typography.uiLabel.fontSize,
                    fontWeight: typography.uiLabel.fontWeight,
                    letterSpacing: typography.uiLabel.letterSpacing,
                    padding: `${spacing.sm} 0`,
                  }}
                >
                  {showApiKey ? 'HIDE' : 'SHOW'}
                </button>
              </div>

              {/* Voice ID Field */}
              <Input
                label="Fish Audio Voice ID"
                type="text"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                placeholder="Enter your Fish Audio voice ID"
                helperText="The voice ID from your Fish Audio dashboard."
                disabled={!voiceId && !config?.defaultVoiceId}
              />

              {/* Actions Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant="secondary"
                  onClick={handleTestVoice}
                  loading={testStatus === 'testing'}
                  disabled={!apiKey}
                >
                  Test Voice
                </Button>

                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={saveStatus === 'saving'}
                  disabled={!apiKey}
                >
                  {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving...' : 'Save Configuration'}
                </Button>

                {testStatus === 'success' && (
                  <Tag variant="success">{testMessage}</Tag>
                )}
                {testStatus === 'error' && (
                  <Tag variant="error">{testMessage}</Tag>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}