'use client';

import { useState, useCallback } from 'react';
import {
  colors,
  typography,
  radius,
  spacing,
} from '@/styles/design-tokens';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Tag } from '@/components/ui/Tag';

// ─── Mock Data ───────────────────────────────────────────────────

interface ModelInfo {
  id: string;
  label: string;
  contextWindow: string;
  promptPrice: string;
  completionPrice: string;
}

const MOCK_MODELS: ModelInfo[] = [
  {
    id: 'anthropic/claude-sonnet-4',
    label: 'Anthropic: Claude Sonnet 4',
    contextWindow: '200K',
    promptPrice: '$3.00/M',
    completionPrice: '$15.00/M',
  },
  {
    id: 'anthropic/claude-haiku-3.5',
    label: 'Anthropic: Claude 3.5 Haiku',
    contextWindow: '200K',
    promptPrice: '$0.80/M',
    completionPrice: '$4.00/M',
  },
  {
    id: 'google/gemini-2.5-pro',
    label: 'Google: Gemini 2.5 Pro',
    contextWindow: '1M',
    promptPrice: '$1.25/M',
    completionPrice: '$10.00/M',
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Google: Gemini 2.5 Flash',
    contextWindow: '1M',
    promptPrice: '$0.15/M',
    completionPrice: '$0.60/M',
  },
  {
    id: 'openai/gpt-4o',
    label: 'OpenAI: GPT-4o',
    contextWindow: '128K',
    promptPrice: '$2.50/M',
    completionPrice: '$10.00/M',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    label: 'Meta: Llama 3.3 70B Instruct',
    contextWindow: '128K',
    promptPrice: '$0.12/M',
    completionPrice: '$0.30/M',
  },
  {
    id: 'mistralai/mistral-large-2411',
    label: 'Mistral: Mistral Large',
    contextWindow: '128K',
    promptPrice: '$2.00/M',
    completionPrice: '$6.00/M',
  },
];

const modelToSelectOption = (m: ModelInfo) => ({
  value: m.id,
  label: m.label,
});

// ─── Types ───────────────────────────────────────────────────────

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'error';

interface SlotConfig {
  modelId: string;
  temperature: number;
  maxTokens: number;
}

// ─── Component ───────────────────────────────────────────────────

export default function OpenRouterPage() {
  // Section A: API Key
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [credits, setCredits] = useState<string | null>(null);

  // Section B: Available Models
  const [models, setModels] = useState<ModelInfo[]>(MOCK_MODELS);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [selectedPreviewModel, setSelectedPreviewModel] = useState<string>('');

  // Section C: Model Slots
  const [primarySlot, setPrimarySlot] = useState<SlotConfig>({
    modelId: 'anthropic/claude-sonnet-4',
    temperature: 0.7,
    maxTokens: 4096,
  });
  const [brainstormSlot, setBrainstormSlot] = useState<SlotConfig>({
    modelId: 'google/gemini-2.5-flash',
    temperature: 1.2,
    maxTokens: 2048,
  });
  const [usePrimaryForBrainstorm, setUsePrimaryForBrainstorm] = useState(false);

  // Section A: Test Connection (mock)
  const handleTestConnection = useCallback(() => {
    setConnectionStatus('testing');
    setCredits(null);
    // Simulate API call
    setTimeout(() => {
      if (apiKey.length >= 20) {
        setConnectionStatus('connected');
        setCredits('$14.37 remaining');
      } else {
        setConnectionStatus('error');
      }
    }, 1500);
  }, [apiKey]);

  // Section B: Refresh Models (mock)
  const handleRefreshModels = useCallback(() => {
    setRefreshingModels(true);
    setTimeout(() => {
      setModels([...MOCK_MODELS]);
      setRefreshingModels(false);
    }, 1000);
  }, []);

  // Section C: Use Primary shortcut
  const handleToggleUsePrimary = useCallback(() => {
    setUsePrimaryForBrainstorm((prev) => !prev);
    if (!usePrimaryForBrainstorm) {
      setBrainstormSlot((prev) => ({
        ...prev,
        modelId: primarySlot.modelId,
      }));
    }
  }, [usePrimaryForBrainstorm, primarySlot.modelId]);

  // Find selected model info for preview
  const previewModel = models.find((m) => m.id === selectedPreviewModel);

  // Save handler (mock)
  const handleSave = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('Saving configuration:', {
      apiKey: apiKey ? '••••••••' : '(empty)',
      primarySlot,
      brainstormSlot: usePrimaryForBrainstorm ? '(uses primary)' : brainstormSlot,
    });
    alert('Configuration saved! (mock)');
  }, [apiKey, primarySlot, brainstormSlot, usePrimaryForBrainstorm]);

  // ─── Styles ──────────────────────────────────────────────────

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

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.lg,
  };

  const sliderContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  };

  const sliderLabelsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    ...typography.caption,
    color: colors.outline,
    marginTop: '2px',
  };

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.surface.dim,
        fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
        padding: spacing.lg,
      }}
    >
      <div
        style={{
          maxWidth: spacing.containerMax,
          margin: '0 auto',
        }}
      >
        {/* Page Header */}
        <header style={{ marginBottom: spacing.xl }}>
          <h1
            style={{
              ...typography.h2,
              color: colors.onSurface,
              margin: 0,
            }}
          >
            OpenRouter Integration
          </h1>
          <p
            style={{
              ...typography.uiBody,
              color: colors.onSurfaceVariant,
              marginTop: spacing.xs,
            }}
          >
            Configure the AI model provider used at runtime for speech generation and brainstorming.
          </p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {/* ═══════ Section A: API Key ═══════ */}
          <Card>
            <div style={sectionHeaderStyle}>
              <h2 style={sectionTitleStyle}>
                <span style={{ fontSize: '18px' }}>🔑</span>
                API Key
              </h2>
            </div>

            <div style={fieldGroupStyle}>
              <div style={{ position: 'relative' }}>
                <Input
                  label="OpenRouter API Key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (connectionStatus !== 'idle') setConnectionStatus('idle');
                  }}
                  placeholder="sk-or-v1-..."
                  helperText={
                    connectionStatus === 'connected'
                      ? undefined
                      : connectionStatus === 'error'
                        ? 'Invalid API key. Please check and try again.'
                        : 'Your OpenRouter API key is stored securely and never shared.'
                  }
                  error={connectionStatus === 'error'}
                  style={{
                    paddingRight: '80px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((prev) => !prev)}
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
                  {showKey ? 'HIDE' : 'SHOW'}
                </button>
              </div>

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
                  onClick={handleTestConnection}
                  loading={connectionStatus === 'testing'}
                  disabled={!apiKey}
                >
                  Test Connection
                </Button>

                {connectionStatus === 'connected' && (
                  <Tag variant="success">Connected</Tag>
                )}
                {connectionStatus === 'error' && (
                  <Tag variant="error">Connection Failed</Tag>
                )}
                {credits && connectionStatus === 'connected' && (
                  <span
                    style={{
                      ...typography.caption,
                      color: colors.primary,
                    }}
                  >
                    {credits}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* ═══════ Section B: Available Models ═══════ */}
          <Card>
            <div
              style={{
                ...sectionHeaderStyle,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={sectionTitleStyle}>
                <span style={{ fontSize: '18px' }}>📦</span>
                Available Models
              </h2>
              <Button
                variant="tertiary"
                onClick={handleRefreshModels}
                loading={refreshingModels}
              >
                Refresh List
              </Button>
            </div>

            <div style={fieldGroupStyle}>
              <Select
                label="Preview Model Details"
                options={models.map(modelToSelectOption)}
                value={selectedPreviewModel}
                onChange={setSelectedPreviewModel}
                placeholder="Select a model to view details..."
              />

              {previewModel && (
                <div
                  style={{
                    backgroundColor: colors.surface.containerLow,
                    border: `1px solid ${colors.outlineVariant}`,
                    borderRadius: radius.DEFAULT,
                    padding: spacing.md,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: spacing.md,
                  }}
                >
                  <div>
                    <span
                      style={{
                        ...typography.uiLabel,
                        color: colors.onSurfaceVariant,
                        display: 'block',
                        marginBottom: '2px',
                      }}
                    >
                      Model ID
                    </span>
                    <span
                      style={{
                        ...typography.uiBody,
                        color: colors.onSurface,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: '14px',
                      }}
                    >
                      {previewModel.id}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        ...typography.uiLabel,
                        color: colors.onSurfaceVariant,
                        display: 'block',
                        marginBottom: '2px',
                      }}
                    >
                      Context Window
                    </span>
                    <span style={{ ...typography.uiBody, color: colors.onSurface }}>
                      {previewModel.contextWindow}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        ...typography.uiLabel,
                        color: colors.onSurfaceVariant,
                        display: 'block',
                        marginBottom: '2px',
                      }}
                    >
                      Prompt Price
                    </span>
                    <span style={{ ...typography.uiBody, color: colors.onSurface }}>
                      {previewModel.promptPrice}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        ...typography.uiLabel,
                        color: colors.onSurfaceVariant,
                        display: 'block',
                        marginBottom: '2px',
                      }}
                    >
                      Completion Price
                    </span>
                    <span style={{ ...typography.uiBody, color: colors.onSurface }}>
                      {previewModel.completionPrice}
                    </span>
                  </div>
                </div>
              )}

              <p style={{ ...typography.caption, color: colors.outline }}>
                {models.length} models available via OpenRouter. Select a model above to view pricing and context details.
              </p>
            </div>
          </Card>

          {/* ═══════ Section C: Model Slots ═══════ */}
          <Card>
            <div style={sectionHeaderStyle}>
              <h2 style={sectionTitleStyle}>
                <span style={{ fontSize: '18px' }}>🎯</span>
                Model Slots
              </h2>
            </div>

            <div style={rowStyle}>
              {/* Primary Slot */}
              <div style={fieldGroupStyle}>
                <span
                  style={{
                    ...typography.uiLabel,
                    color: colors.primary,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.08em',
                  }}
                >
                  Primary (Speech Generation)
                </span>
                <Select
                  options={models.map(modelToSelectOption)}
                  value={primarySlot.modelId}
                  onChange={(val) =>
                    setPrimarySlot((prev) => ({ ...prev, modelId: val }))
                  }
                  placeholder="Select primary model..."
                />
                <p style={{ ...typography.caption, color: colors.outline, margin: 0 }}>
                  Used for deep drafting, rhetorical structuring, and final speech output.
                </p>
              </div>

              {/* Brainstorm Slot */}
              <div style={fieldGroupStyle}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      ...typography.uiLabel,
                      color: colors.secondary,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.08em',
                    }}
                  >
                    Brainstorm (Ideation Mode)
                  </span>
                </div>
                <Select
                  options={models.map(modelToSelectOption)}
                  value={
                    usePrimaryForBrainstorm
                      ? primarySlot.modelId
                      : brainstormSlot.modelId
                  }
                  onChange={(val) =>
                    setBrainstormSlot((prev) => ({ ...prev, modelId: val }))
                  }
                  placeholder="Select brainstorm model..."
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}
                >
                  <button
                    type="button"
                    onClick={handleToggleUsePrimary}
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: radius.sm,
                      border: `1px solid ${
                        usePrimaryForBrainstorm
                          ? colors.primary
                          : colors.outlineVariant
                      }`,
                      backgroundColor: usePrimaryForBrainstorm
                        ? colors.primary
                        : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      transition: 'all 0.15s ease',
                    }}
                    aria-label="Use primary model for brainstorming"
                  >
                    {usePrimaryForBrainstorm && (
                      <span
                        style={{
                          color: colors.onPrimary,
                          fontSize: '10px',
                          lineHeight: 1,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                  <span
                    style={{
                      ...typography.caption,
                      color: usePrimaryForBrainstorm
                        ? colors.primary
                        : colors.onSurfaceVariant,
                      cursor: 'pointer',
                    }}
                    onClick={handleToggleUsePrimary}
                  >
                    Use Primary model for brainstorming
                  </span>
                </div>
                <p style={{ ...typography.caption, color: colors.outline, margin: 0 }}>
                  Used for free-form ideation, brainstorming sessions, and creative exploration.
                </p>
              </div>
            </div>
          </Card>

          {/* ═══════ Section D: Temperature & Settings ═══════ */}
          <Card>
            <div style={sectionHeaderStyle}>
              <h2 style={sectionTitleStyle}>
                <span style={{ fontSize: '18px' }}>⚙️</span>
                Temperature &amp; Settings
              </h2>
            </div>

            <div style={rowStyle}>
              {/* Primary Temperature & Tokens */}
              <div style={fieldGroupStyle}>
                <span
                  style={{
                    ...typography.uiLabel,
                    color: colors.primary,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.08em',
                  }}
                >
                  Primary Slot
                </span>

                {/* Temperature Slider */}
                <div style={sliderContainerStyle}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <label
                      style={{
                        ...typography.uiLabel,
                        color: colors.onSurfaceVariant,
                      }}
                    >
                      Creativity Variance (Temperature)
                    </label>
                    <span
                      style={{
                        ...typography.uiLabel,
                        color: colors.primary,
                      }}
                    >
                      {primarySlot.temperature.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={primarySlot.temperature}
                    onChange={(e) =>
                      setPrimarySlot((prev) => ({
                        ...prev,
                        temperature: parseFloat(e.target.value),
                      }))
                    }
                    style={{
                      width: '100%',
                      height: '4px',
                      backgroundColor: colors.surface.containerHighest,
                      borderRadius: radius.full,
                      appearance: 'none' as React.CSSProperties['appearance'],
                      cursor: 'pointer',
                      accentColor: colors.primary,
                    }}
                  />
                  <div style={sliderLabelsStyle}>
                    <span>Precise (0.0)</span>
                    <span>Expressive (2.0)</span>
                  </div>
                </div>

                {/* Max Output Tokens */}
                <div>
                  <label
                    style={{
                      ...typography.uiLabel,
                      color: colors.onSurfaceVariant,
                      display: 'block',
                      marginBottom: spacing.xs,
                    }}
                  >
                    Max Output Tokens
                  </label>
                  <input
                    type="number"
                    min={256}
                    max={131072}
                    step={256}
                    value={primarySlot.maxTokens}
                    onChange={(e) =>
                      setPrimarySlot((prev) => ({
                        ...prev,
                        maxTokens: parseInt(e.target.value, 10) || 4096,
                      }))
                    }
                    style={{
                      ...typography.uiBody,
                      backgroundColor: colors.surface.containerLow,
                      color: colors.onSurface,
                      border: `1px solid ${colors.outlineVariant}`,
                      borderBottom: `2px solid ${colors.outlineVariant}`,
                      borderRadius: radius.DEFAULT,
                      padding: `${spacing.sm} ${spacing.md}`,
                      outline: 'none',
                      width: '100%',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderBottomColor = colors.primary;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderBottomColor = colors.outlineVariant;
                    }}
                  />
                  <span
                    style={{
                      ...typography.caption,
                      color: colors.outline,
                      display: 'block',
                      marginTop: '2px',
                    }}
                  >
                    Default: 4096
                  </span>
                </div>
              </div>

              {/* Brainstorm Temperature & Tokens */}
              <div style={fieldGroupStyle}>
                <span
                  style={{
                    ...typography.uiLabel,
                    color: colors.secondary,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.08em',
                  }}
                >
                  Brainstorm Slot
                </span>

                {/* Temperature Slider */}
                <div style={sliderContainerStyle}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <label
                      style={{
                        ...typography.uiLabel,
                        color: colors.onSurfaceVariant,
                      }}
                    >
                      Creativity Variance (Temperature)
                    </label>
                    <span
                      style={{
                        ...typography.uiLabel,
                        color: colors.secondary,
                      }}
                    >
                      {brainstormSlot.temperature.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={brainstormSlot.temperature}
                    onChange={(e) =>
                      setBrainstormSlot((prev) => ({
                        ...prev,
                        temperature: parseFloat(e.target.value),
                      }))
                    }
                    disabled={usePrimaryForBrainstorm}
                    style={{
                      width: '100%',
                      height: '4px',
                      backgroundColor: colors.surface.containerHighest,
                      borderRadius: radius.full,
                      appearance: 'none' as React.CSSProperties['appearance'],
                      cursor: usePrimaryForBrainstorm ? 'not-allowed' : 'pointer',
                      accentColor: colors.secondary,
                      opacity: usePrimaryForBrainstorm ? 0.4 : 1,
                    }}
                  />
                  <div style={sliderLabelsStyle}>
                    <span>Precise (0.0)</span>
                    <span>Expressive (2.0)</span>
                  </div>
                </div>

                {/* Max Output Tokens */}
                <div>
                  <label
                    style={{
                      ...typography.uiLabel,
                      color: colors.onSurfaceVariant,
                      display: 'block',
                      marginBottom: spacing.xs,
                    }}
                  >
                    Max Output Tokens
                  </label>
                  <input
                    type="number"
                    min={256}
                    max={131072}
                    step={256}
                    value={brainstormSlot.maxTokens}
                    onChange={(e) =>
                      setBrainstormSlot((prev) => ({
                        ...prev,
                        maxTokens: parseInt(e.target.value, 10) || 2048,
                      }))
                    }
                    disabled={usePrimaryForBrainstorm}
                    style={{
                      ...typography.uiBody,
                      backgroundColor: colors.surface.containerLow,
                      color: colors.onSurface,
                      border: `1px solid ${colors.outlineVariant}`,
                      borderBottom: `2px solid ${colors.outlineVariant}`,
                      borderRadius: radius.DEFAULT,
                      padding: `${spacing.sm} ${spacing.md}`,
                      outline: 'none',
                      width: '100%',
                      transition: 'border-color 0.2s',
                      opacity: usePrimaryForBrainstorm ? 0.4 : 1,
                      cursor: usePrimaryForBrainstorm ? 'not-allowed' : 'text',
                    }}
                    onFocus={(e) => {
                      if (!usePrimaryForBrainstorm) {
                        e.currentTarget.style.borderBottomColor = colors.secondary;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderBottomColor = colors.outlineVariant;
                    }}
                  />
                  <span
                    style={{
                      ...typography.caption,
                      color: colors.outline,
                      display: 'block',
                      marginTop: '2px',
                    }}
                  >
                    Default: 2048
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* ═══════ Actions ═══════ */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: spacing.md,
              paddingTop: spacing.md,
              borderTop: `1px solid ${colors.outlineVariant}`,
            }}
          >
            <Button variant="tertiary">Cancel Changes</Button>
            <Button variant="primary" onClick={handleSave}>
              Save Configuration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}