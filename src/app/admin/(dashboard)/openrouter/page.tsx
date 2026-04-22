'use client';

import { useState, useCallback, useEffect } from 'react';
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

// ─── Expanded Model List ─────────────────────────────────────────

interface ModelInfo {
  id: string;
  label: string;
  contextWindow: string;
  promptPrice: string;
  completionPrice: string;
}

const AVAILABLE_MODELS: ModelInfo[] = [
  // Anthropic
  {
    id: 'anthropic/claude-opus-4-7',
    label: 'Anthropic: Claude Opus 4.7',
    contextWindow: '200K',
    promptPrice: '$15.00/M',
    completionPrice: '$75.00/M',
  },
  {
    id: 'anthropic/claude-opus-4-6',
    label: 'Anthropic: Claude Opus 4.6',
    contextWindow: '200K',
    promptPrice: '$15.00/M',
    completionPrice: '$75.00/M',
  },
  {
    id: 'anthropic/claude-sonnet-4-6',
    label: 'Anthropic: Claude Sonnet 4.6',
    contextWindow: '200K',
    promptPrice: '$3.00/M',
    completionPrice: '$15.00/M',
  },
  // Google
  {
    id: 'google/gemini-3.1-pro-preview',
    label: 'Google: Gemini 3.1 Pro Preview',
    contextWindow: '1M',
    promptPrice: '$1.25/M',
    completionPrice: '$10.00/M',
  },
  {
    id: 'google/gemini-3.1-flash-lite-preview',
    label: 'Google: Gemini 3.1 Flash Lite Preview',
    contextWindow: '1M',
    promptPrice: '$0.15/M',
    completionPrice: '$0.60/M',
  },
  // OpenRouter Free
  {
    id: 'openrouter/free',
    label: 'OpenRouter: Free Tier',
    contextWindow: 'Variable',
    promptPrice: '$0.00/M',
    completionPrice: '$0.00/M',
  },
  // Mistral
  {
    id: 'openrouter/mistral/mistral-large-2411',
    label: 'Mistral: Mistral Large',
    contextWindow: '128K',
    promptPrice: '$2.00/M',
    completionPrice: '$6.00/M',
  },
  // Moonshot
  {
    id: 'openrouter/moonshotai/kimi-k2.6',
    label: 'Moonshot: Kimi K2.6',
    contextWindow: '256K',
    promptPrice: '$0.50/M',
    completionPrice: '$2.00/M',
  },
  // Xiaomi MiMo
  {
    id: 'openrouter/xiaomi/mimo-v2-pro',
    label: 'Xiaomi: MiMo V2 Pro',
    contextWindow: '1M',
    promptPrice: '$0.20/M',
    completionPrice: '$0.80/M',
  },
  {
    id: 'openrouter/xiaomi/mimo-v2-omni',
    label: 'Xiaomi: MiMo V2 Omni',
    contextWindow: '262K',
    promptPrice: '$0.30/M',
    completionPrice: '$1.20/M',
  },

  // MiniMax
  {
    id: 'openrouter/minimax/minimax-m2.7',
    label: 'MiniMax: MiniMax M2.7',
    contextWindow: '200K',
    promptPrice: '$0.30/M',
    completionPrice: '$1.20/M',
  },
  {
    id: 'openrouter/minimax/minimax-m2.5-free',
    label: 'MiniMax: MiniMax M2.5 Free',
    contextWindow: '200K',
    promptPrice: '$0.00/M',
    completionPrice: '$0.00/M',
  },
  // OpenAI
  {
    id: 'openai-codex/gpt-5.4',
    label: 'OpenAI: GPT 5.4',
    contextWindow: '256K',
    promptPrice: '$2.50/M',
    completionPrice: '$10.00/M',
  },
  {
    id: 'openai-codex/gpt-5.4-mini',
    label: 'OpenAI: GPT 5.4 Mini',
    contextWindow: '128K',
    promptPrice: '$0.60/M',
    completionPrice: '$2.40/M',
  },
];

const modelToSelectOption = (m: ModelInfo) => ({
  value: m.id,
  label: m.label,
});

// ─── Types ───────────────────────────────────────────────────────

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'error' | 'loading';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SlotConfig {
  modelId: string;
  temperature: number;
  maxTokens: number;
}

interface OpenRouterConfig {
  apiKey: string;
  primary: SlotConfig;
  brainstorm: SlotConfig & { usePrimary: boolean };
}

// ─── Component ───────────────────────────────────────────────────

export default function OpenRouterPage() {
  // Page load state
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Section A: API Key
  const [apiKey, setApiKey] = useState('');
  const [apiKeyPreview, setApiKeyPreview] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [credits, setCredits] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Section B: Available Models
  const [models, setModels] = useState<ModelInfo[]>(AVAILABLE_MODELS);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [selectedPreviewModel, setSelectedPreviewModel] = useState<string>('');

  // Section C: Model Slots
  const [primarySlot, setPrimarySlot] = useState<SlotConfig>({
    modelId: 'anthropic/claude-sonnet-4-6',
    temperature: 0.7,
    maxTokens: 4096,
  });
  const [brainstormSlot, setBrainstormSlot] = useState<SlotConfig>({
    modelId: 'google/gemini-3.1-flash-lite-preview',
    temperature: 1.2,
    maxTokens: 2048,
  });
  const [usePrimaryForBrainstorm, setUsePrimaryForBrainstorm] = useState(false);

  // Section C2: Speechwriter Slot
  const [speechwriterSlot, setSpeechwriterSlot] = useState<SlotConfig>({
    modelId: 'openrouter/xiaomi/mimo-v2-pro',
    temperature: 0.7,
    maxTokens: 4096,
  });

  // Section D: Custom Prompts
  const [brainstormPrompt, setBrainstormPrompt] = useState('');
  const [speechwriterPrompt, setSpeechwriterPrompt] = useState('');

  // ─── Load Config on Mount ────────────────────────────────────
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/openrouter');
      if (!res.ok) throw new Error('Failed to load config');
      const data = await res.json();

      if (data.integration) {
        setApiKeyPreview(data.integration.api_key_preview);
        setIsConfigured(data.integration.is_configured);
      }

      if (data.slots && data.slots.length > 0) {
        const primaryData = data.slots.find((s: { slot: string }) => s.slot === 'primary');
        const brainstormData = data.slots.find((s: { slot: string }) => s.slot === 'brainstorm');

        if (primaryData) {
          setPrimarySlot({
            modelId: primaryData.model_id,
            temperature: primaryData.temperature,
            maxTokens: primaryData.max_output_tokens,
          });
        }
        if (brainstormData) {
          setBrainstormSlot({
            modelId: brainstormData.model_id,
            temperature: brainstormData.temperature,
            maxTokens: brainstormData.max_output_tokens,
          });
          setBrainstormPrompt(brainstormData.custom_prompt || '');
          // Check if brainstorm uses primary
          if (primaryData && brainstormData.model_id === primaryData.model_id &&
              brainstormData.temperature === primaryData.temperature &&
              brainstormData.max_output_tokens === primaryData.max_output_tokens) {
            setUsePrimaryForBrainstorm(true);
          }
        }

        // Load speechwriter slot
        const speechwriterData = data.slots.find((s: { slot: string }) => s.slot === 'speechwriter');
        if (speechwriterData) {
          setSpeechwriterSlot({
            modelId: speechwriterData.model_id,
            temperature: speechwriterData.temperature,
            maxTokens: speechwriterData.max_output_tokens,
          });
          setSpeechwriterPrompt(speechwriterData.custom_prompt || '');
        }
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Section A: Test Connection ───────────────────────────────
  const handleTestConnection = useCallback(async () => {
    if (!apiKey) return;
    setConnectionStatus('testing');
    setCredits(null);
    setConnectionError(null);

    try {
      const res = await fetch('/api/admin/openrouter/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();

      if (data.ok) {
        setConnectionStatus('connected');
        if (data.credits !== undefined) {
          setCredits(`$${data.credits.toFixed(2)} remaining`);
        }
      } else {
        setConnectionStatus('error');
        setConnectionError(data.error || 'Connection failed. Please check your API key.');
      }
    } catch (err) {
      setConnectionStatus('error');
      setConnectionError(err instanceof Error ? err.message : 'Network error. Check your connection.');
    }
  }, [apiKey]);

  // ─── Delete Key ───────────────────────────────────────────────
  const handleDeleteKey = useCallback(async () => {
    if (!confirm('Are you sure you want to remove the OpenRouter API key?')) return;

    setConnectionStatus('loading');
    try {
      const res = await fetch('/api/admin/openrouter', { method: 'DELETE' });
      if (res.ok) {
        setApiKey('');
        setApiKeyPreview(null);
        setIsConfigured(false);
        setConnectionStatus('idle');
        setCredits(null);
      } else {
        setConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
    }
  }, []);

  // ─── Section B: Refresh Models ────────────────────────────────
  const [modelsError, setModelsError] = useState<string | null>(null);

  const handleRefreshModels = useCallback(async () => {
    setRefreshingModels(true);
    setModelsError(null);
    try {
      const res = await fetch('/api/admin/openrouter/models');
      const data = await res.json();
      if (res.ok) {
        if (data.models && data.models.length > 0) {
          const newModels = data.models
            .filter((m: { id: string }) => !AVAILABLE_MODELS.some(am => am.id === m.id))
            .map((m: { id: string; name?: string; context_length?: number; pricing?: { prompt?: string; completion?: string } }) => ({
              id: m.id,
              label: m.name || m.id,
              contextWindow: m.context_length ? `${m.context_length / 1000}K` : 'Unknown',
              promptPrice: m.pricing?.prompt ? `$${(parseFloat(m.pricing.prompt) * 1000000).toFixed(2)}/M` : 'N/A',
              completionPrice: m.pricing?.completion ? `$${(parseFloat(m.pricing.completion) * 1000000).toFixed(2)}/M` : 'N/A',
            }));
          setModels([...AVAILABLE_MODELS, ...newModels]);
        }
      } else {
        setModelsError(data.error || 'Failed to fetch models from OpenRouter.');
      }
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Network error fetching models.');
    } finally {
      setRefreshingModels(false);
    }
  }, []);

  // ─── Section C: Use Primary shortcut ──────────────────────────
  const handleToggleUsePrimary = useCallback(() => {
    setUsePrimaryForBrainstorm((prev) => {
      const newValue = !prev;
      if (newValue) {
        setBrainstormSlot((prev) => ({
          ...prev,
          modelId: primarySlot.modelId,
          temperature: primarySlot.temperature,
          maxTokens: primarySlot.maxTokens,
        }));
      }
      return newValue;
    });
  }, [primarySlot]);

  // Update brainstorm when primary changes if linked
  useEffect(() => {
    if (usePrimaryForBrainstorm) {
      setBrainstormSlot({
        ...primarySlot,
      });
    }
  }, [primarySlot, usePrimaryForBrainstorm]);

  // Find selected model info for preview
  const previewModel = models.find((m) => m.id === selectedPreviewModel);

  // ─── Save Handler ─────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!apiKey && !isConfigured) {
      alert('Please enter an API key or test connection first');
      return;
    }

    setSaveStatus('saving');
    setSaveError(null);
    try {
      const payload = {
        apiKey: apiKey || undefined, // Don't send empty string if using existing
        slots: {
          primary: primarySlot,
          brainstorm: {
            ...brainstormSlot,
            usePrimary: usePrimaryForBrainstorm,
          },
          speechwriter: speechwriterSlot,
        },
        prompts: {
          brainstorm: brainstormPrompt,
          speechwriter: speechwriterPrompt,
        },
      };

      const res = await fetch('/api/admin/openrouter', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        // Reload to get updated preview
        await loadConfig();
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveStatus('error');
        const errMsg = data.error || 'Failed to save configuration. Check your inputs and try again.';
        setSaveError(errMsg);
      }
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : 'Network error. Check your connection.');
    }
  }, [apiKey, isConfigured, primarySlot, brainstormSlot, usePrimaryForBrainstorm, speechwriterSlot, brainstormPrompt, speechwriterPrompt]);

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

  // ─── Loading State ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.surface.dim,
        fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
        padding: spacing.lg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: colors.onSurfaceVariant }}>
          <div style={{ marginBottom: spacing.md }}>⏳ Loading configuration...</div>
        </div>
      </div>
    );
  }

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

        {loadError && (
          <Card cardStyle={{ marginBottom: spacing.lg, borderColor: colors.error }}>
            <Tag variant="error">Error: {loadError}</Tag>
          </Card>
        )}

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
              {/* Show existing key preview if configured */}
              {apiKeyPreview && (
                <div style={{
                  padding: spacing.sm,
                  backgroundColor: colors.surface.containerLow,
                  borderRadius: radius.DEFAULT,
                  marginBottom: spacing.sm,
                }}>
                  <span style={{ ...typography.caption, color: colors.onSurfaceVariant }}>
                    Currently configured: <strong>{apiKeyPreview}</strong>
                  </span>
                </div>
              )}

              <div style={{ position: 'relative' }}>
                <Input
                  label={isConfigured ? "Update API Key (leave empty to keep current)" : "OpenRouter API Key"}
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
                        ? (connectionError || 'Invalid API key. Please check and try again.')
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

                {isConfigured && (
                  <Button
                    variant="tertiary"
                    onClick={handleDeleteKey}
                    loading={connectionStatus === 'loading'}
                  >
                    Remove Key
                  </Button>
                )}

                {connectionStatus === 'connected' && (
                  <Tag variant="success">Connected</Tag>
                )}
                {connectionStatus === 'error' && (
                  <Tag variant="error">{connectionError ? `Failed: ${connectionError}` : 'Connection Failed'}</Tag>
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
                Refresh from OpenRouter
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
                      }}
                    >
                      Context Window
                    </span>
                    <p
                      style={{
                        ...typography.uiBody,
                        color: colors.onSurface,
                        margin: 0,
                      }}
                    >
                      {previewModel.contextWindow}
                    </p>
                  </div>
                  <div>
                    <span
                      style={{
                        ...typography.uiLabel,
                        color: colors.onSurfaceVariant,
                      }}
                    >
                      Prompt Price
                    </span>
                    <p
                      style={{
                        ...typography.uiBody,
                        color: colors.onSurface,
                        margin: 0,
                      }}
                    >
                      {previewModel.promptPrice}
                    </p>
                  </div>
                  <div>
                    <span
                      style={{
                        ...typography.uiLabel,
                        color: colors.onSurfaceVariant,
                      }}
                    >
                      Completion Price
                    </span>
                    <p
                      style={{
                        ...typography.uiBody,
                        color: colors.onSurface,
                        margin: 0,
                      }}
                    >
                      {previewModel.completionPrice}
                    </p>
                  </div>
                  <div>
                    <span
                      style={{
                        ...typography.uiLabel,
                        color: colors.onSurfaceVariant,
                      }}
                    >
                      Model ID
                    </span>
                    <code
                      style={{
                        ...typography.caption,
                        backgroundColor: colors.surface.containerHigh,
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: radius.sm,
                        display: 'block',
                        marginTop: spacing.xs,
                      }}
                    >
                      {previewModel.id}
                    </code>
                  </div>
                </div>
              )}

              {modelsError && (
                <div style={{
                  padding: spacing.sm,
                  backgroundColor: `${colors.error}10`,
                  border: `1px solid ${colors.error}`,
                  borderRadius: radius.DEFAULT,
                  marginTop: spacing.sm,
                }}>
                  <span style={{ ...typography.caption, color: colors.error }}>
                    {modelsError}
                  </span>
                </div>
              )}
              <div
                style={{
                  ...typography.caption,
                  color: colors.onSurfaceVariant,
                  marginTop: spacing.sm,
                }}
              >
                Showing {models.length} models. Select a model below to configure your slots.
              </div>
            </div>
          </Card>

          {/* ═══════ Section C: Model Slots ═══════ */}
          <Card>
            <div style={sectionHeaderStyle}>
              <h2 style={sectionTitleStyle}>
                <span style={{ fontSize: '18px' }}>⚙️</span>
                Model Slots
              </h2>
            </div>

            {/* Primary Slot */}
            <div style={{ marginBottom: spacing.lg }}>
              <h3
                style={{
                  ...typography.h2,
                  fontSize: '24px',
                  color: colors.onSurface,
                  margin: `0 0 ${spacing.md} 0`,
                }}
              >
                Primary Slot
              </h3>
              <div style={rowStyle}>
                <div>
                  <Select
                    label="Model"
                    options={models.map(modelToSelectOption)}
                    value={primarySlot.modelId}
                    onChange={(value) =>
                      setPrimarySlot((prev) => ({ ...prev, modelId: value }))
                    }
                  />
                </div>

                {/* Temperature */}
                <div style={sliderContainerStyle}>
                  <label
                    style={{
                      ...typography.uiLabel,
                      color: colors.onSurfaceVariant,
                      display: 'block',
                      marginBottom: spacing.xs,
                    }}
                  >
                    Temperature: {primarySlot.temperature.toFixed(1)}
                  </label>
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
            </div>

            {/* Brainstorm Slot */}
            <div>
              <h3
                style={{
                  ...typography.h2,
                  fontSize: '24px',
                  color: colors.onSurface,
                  margin: `0 0 ${spacing.md} 0`,
                }}
              >
                Brainstorm Slot
              </h3>

              {/* Use Primary toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  marginBottom: spacing.md,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={usePrimaryForBrainstorm}
                  onChange={handleToggleUsePrimary}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: colors.primary,
                    cursor: 'pointer',
                  }}
                />
                <span style={{ ...typography.uiBody, color: colors.onSurface }}>
                  Use Primary model settings for Brainstorm
                </span>
              </label>

              <div style={{ ...rowStyle, opacity: usePrimaryForBrainstorm ? 0.5 : 1 }}>
                <div>
                  <Select
                    label="Model"
                    options={models.map(modelToSelectOption)}
                    value={brainstormSlot.modelId}
                    onChange={(value) =>
                      setBrainstormSlot((prev) => ({ ...prev, modelId: value }))
                    }
                  />
                </div>

                {/* Temperature */}
                <div style={sliderContainerStyle}>
                  <label
                    style={{
                      ...typography.uiLabel,
                      color: colors.onSurfaceVariant,
                      display: 'block',
                      marginBottom: spacing.xs,
                    }}
                  >
                    Temperature: {brainstormSlot.temperature.toFixed(1)}
                  </label>
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

            {/* Speechwriter Slot */}
            <div style={{ marginTop: spacing.xl, paddingTop: spacing.lg, borderTop: `1px solid ${colors.outlineVariant}` }}>
              <h3
                style={{
                  ...typography.h2,
                  fontSize: '24px',
                  color: colors.onSurface,
                  margin: `0 0 ${spacing.md} 0`,
                }}
              >
                Speechwriter Slot
              </h3>

              <div style={rowStyle}>
                <div>
                  <Select
                    label="Model"
                    options={models.map(modelToSelectOption)}
                    value={speechwriterSlot.modelId}
                    onChange={(value) =>
                      setSpeechwriterSlot((prev) => ({ ...prev, modelId: value }))
                    }
                  />
                </div>

                {/* Temperature */}
                <div style={sliderContainerStyle}>
                  <label
                    style={{
                      ...typography.uiLabel,
                      color: colors.onSurfaceVariant,
                      display: 'block',
                      marginBottom: spacing.xs,
                    }}
                  >
                    Temperature: {speechwriterSlot.temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={speechwriterSlot.temperature}
                    onChange={(e) =>
                      setSpeechwriterSlot((prev) => ({
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
                    value={speechwriterSlot.maxTokens}
                    onChange={(e) =>
                      setSpeechwriterSlot((prev) => ({
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
            </div>
          </Card>

          {/* ═══════ Section D: Custom Prompts ═══════ */}
          <Card>
            <div style={sectionHeaderStyle}>
              <h2 style={sectionTitleStyle}>
                <span style={{ fontSize: '18px' }}>🧠</span>
                Custom Bot Prompts
              </h2>
            </div>
            <p
              style={{
                ...typography.uiBody,
                color: colors.onSurfaceVariant,
                marginBottom: spacing.lg,
              }}
            >
              Define guiding prompts that shape how each bot thinks. Use these to embed your beliefs, instructions, framework, and intellectual IP into the AI behavior.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
              {/* Brainstorm Prompt */}
              <div>
                <label
                  style={{
                    ...typography.uiLabel,
                    color: colors.onSurface,
                    display: 'block',
                    marginBottom: spacing.xs,
                  }}
                >
                  Brainstorming Bot Prompt
                </label>
                <span
                  style={{
                    ...typography.caption,
                    color: colors.onSurfaceVariant,
                    display: 'block',
                    marginBottom: spacing.sm,
                  }}
                >
                  Overall instructions and framework for the brainstorming assistant. This prompt shapes how the AI approaches ideation, creative thinking, and collaborative problem-solving.
                </span>
                <textarea
                  value={brainstormPrompt}
                  onChange={(e) => setBrainstormPrompt(e.target.value)}
                  placeholder="Example: You are a strategic brainstorming partner. Always consider multiple perspectives before suggesting ideas. Challenge assumptions constructively. Focus on actionable outcomes..."
                  rows={5}
                  style={{
                    ...typography.uiBody,
                    backgroundColor: colors.surface.containerLow,
                    color: colors.onSurface,
                    border: `1px solid ${colors.outlineVariant}`,
                    borderRadius: radius.DEFAULT,
                    padding: `${spacing.sm} ${spacing.md}`,
                    outline: 'none',
                    width: '100%',
                    resize: 'vertical',
                    fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.primary;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.outlineVariant;
                  }}
                />
              </div>

              {/* Speechwriter Prompt */}
              <div>
                <label
                  style={{
                    ...typography.uiLabel,
                    color: colors.onSurface,
                    display: 'block',
                    marginBottom: spacing.xs,
                  }}
                >
                  Speechwriter Bot Prompt
                </label>
                <span
                  style={{
                    ...typography.caption,
                    color: colors.onSurfaceVariant,
                    display: 'block',
                    marginBottom: spacing.sm,
                  }}
                >
                  Overall instructions and framework for the speechwriter. This prompt defines your voice, rhetorical style, values, and the intellectual foundation behind every speech generated.
                </span>
                <textarea
                  value={speechwriterPrompt}
                  onChange={(e) => setSpeechwriterPrompt(e.target.value)}
                  placeholder="Example: Write speeches that are bold, clear, and rooted in lived experience. Use vivid storytelling over abstract language. Lead with conviction. Every speech should move the audience to action..."
                  rows={5}
                  style={{
                    ...typography.uiBody,
                    backgroundColor: colors.surface.containerLow,
                    color: colors.onSurface,
                    border: `1px solid ${colors.outlineVariant}`,
                    borderRadius: radius.DEFAULT,
                    padding: `${spacing.sm} ${spacing.md}`,
                    outline: 'none',
                    width: '100%',
                    resize: 'vertical',
                    fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.outlineVariant;
                  }}
                />
              </div>
            </div>
          </Card>

          {/* ═══════ Actions ═══════ */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.sm,
              paddingTop: spacing.md,
              borderTop: `1px solid ${colors.outlineVariant}`,
            }}
          >
            {saveError && (
              <div style={{
                padding: spacing.sm,
                backgroundColor: `${colors.error}10`,
                border: `1px solid ${colors.error}`,
                borderRadius: radius.DEFAULT,
              }}>
                <span style={{ ...typography.caption, color: colors.error }}>
                  {saveError}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.md }}>
              <Button variant="tertiary" onClick={() => { loadConfig(); setSaveError(null); }}>
                Reset Changes
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saveStatus === 'saving'}
              >
                {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}