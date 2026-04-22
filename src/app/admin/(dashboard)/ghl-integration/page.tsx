'use client';

import { useState, useCallback, useEffect } from 'react';
import { colors, typography, radius, spacing } from '@/styles/design-tokens';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Tag } from '@/components/ui/Tag';

// ─── Constants ────────────────────────────────────────────────────

const STANDARD_FIELDS = [
  { starField: 'First Name', ghlField: 'firstName', description: 'Contact first name' },
  { starField: 'Last Name', ghlField: 'lastName', description: 'Contact last name' },
  { starField: 'Email', ghlField: 'email', description: 'Primary email address' },
  { starField: 'Phone', ghlField: 'phone', description: 'Primary phone number' },
];

interface CustomFieldMap {
  starField: string;
  starKey: string;
  description: string;
  ghlFieldId: string;
}

const DEFAULT_CUSTOM_FIELDS: CustomFieldMap[] = [
  { starField: 'Speech Title', starKey: 'speech_title', description: 'Title of the generated speech', ghlFieldId: '' },
  { starField: 'Speech Type', starKey: 'speech_type', description: 'Type/category (keynote, eulogy, etc.)', ghlFieldId: '' },
  { starField: 'Audience Size', starKey: 'audience_size', description: 'Expected audience size', ghlFieldId: '' },
  { starField: 'Event Name', starKey: 'event_name', description: 'Name of the speaking event', ghlFieldId: '' },
  { starField: 'Event Date', starKey: 'event_date', description: 'Date of the speaking event', ghlFieldId: '' },
  { starField: 'Tone / Style', starKey: 'tone', description: 'Tone of the speech (formal, conversational, etc.)', ghlFieldId: '' },
  { starField: 'Duration (min)', starKey: 'duration', description: 'Target speech duration in minutes', ghlFieldId: '' },
  { starField: 'Key Message', starKey: 'key_message', description: 'Core message or thesis', ghlFieldId: '' },
  { starField: 'Speech Status', starKey: 'speech_status', description: 'Draft / Final / Delivered', ghlFieldId: '' },
  { starField: 'Speech Link (PDF)', starKey: 'speech_link', description: 'URL to generated speech PDF', ghlFieldId: '' },
  { starField: 'Audio Link', starKey: 'audio_link', description: 'URL to TTS audio file', ghlFieldId: '' },
  { starField: 'Last Generated', starKey: 'last_generated', description: 'Timestamp of last generation', ghlFieldId: '' },
  { starField: 'Speaker Notes', starKey: 'speaker_notes', description: 'Internal notes for the speaker', ghlFieldId: '' },
  { starField: 'Outline / Notes', starKey: 'outline_notes', description: 'Raw outline or brainstorming notes', ghlFieldId: '' },
  { starField: 'Revision Count', starKey: 'revision_count', description: 'Number of speech revisions', ghlFieldId: '' },
];

const SUGGESTED_FIELD_NAMES = [
  { starDataPoint: 'Speech Title', suggestedGhlName: 'star_speech_title', fieldType: 'Text' },
  { starDataPoint: 'Speech Type', suggestedGhlName: 'star_speech_type', fieldType: 'Dropdown' },
  { starDataPoint: 'Audience Size', suggestedGhlName: 'star_audience_size', fieldType: 'Number' },
  { starDataPoint: 'Event Name', suggestedGhlName: 'star_event_name', fieldType: 'Text' },
  { starDataPoint: 'Event Date', suggestedGhlName: 'star_event_date', fieldType: 'Date' },
  { starDataPoint: 'Tone / Style', suggestedGhlName: 'star_tone_style', fieldType: 'Dropdown' },
  { starDataPoint: 'Duration (min)', suggestedGhlName: 'star_duration_min', fieldType: 'Number' },
  { starDataPoint: 'Key Message', suggestedGhlName: 'star_key_message', fieldType: 'Text Area' },
  { starDataPoint: 'Speech Status', suggestedGhlName: 'star_speech_status', fieldType: 'Dropdown' },
  { starDataPoint: 'Speech Link (PDF)', suggestedGhlName: 'star_speech_link', fieldType: 'URL' },
  { starDataPoint: 'Audio Link', suggestedGhlName: 'star_audio_link', fieldType: 'URL' },
  { starDataPoint: 'Last Generated', suggestedGhlName: 'star_last_generated', fieldType: 'Date' },
  { starDataPoint: 'Speaker Notes', suggestedGhlName: 'star_speaker_notes', fieldType: 'Text Area' },
  { starDataPoint: 'Outline / Notes', suggestedGhlName: 'star_outline_notes', fieldType: 'Text Area' },
  { starDataPoint: 'Revision Count', suggestedGhlName: 'star_revision_count', fieldType: 'Number' },
];

// ─── Styles ───────────────────────────────────────────────────────

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  borderBottom: `1px solid ${colors.surface.containerHigh}`,
  paddingBottom: spacing.md,
  marginBottom: spacing.md,
};

const sectionIconStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
};

const sectionTitleStyle: React.CSSProperties = {
  ...typography.h2,
  fontSize: '20px',
  color: colors.onSurface,
  margin: 0,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const thStyle: React.CSSProperties = {
  ...typography.uiLabel,
  color: colors.onSurfaceVariant,
  textAlign: 'left',
  padding: `${spacing.sm} ${spacing.md}`,
  borderBottom: `1px solid ${colors.outlineVariant}`,
};

const tdStyle: React.CSSProperties = {
  ...typography.uiBody,
  color: colors.onSurface,
  padding: `${spacing.sm} ${spacing.md}`,
  borderBottom: `1px solid ${colors.outlineVariant}`,
};

const monoStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '13px',
  color: colors.secondary,
};

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: colors.surface.containerHighest,
  border: `1px solid ${colors.outlineVariant}`,
  borderRadius: radius.lg,
  padding: spacing.md,
  display: 'flex',
  alignItems: 'flex-start',
  gap: spacing.sm,
  marginTop: spacing.md,
};

const toggleTrackStyle = (active: boolean): React.CSSProperties => ({
  width: 44,
  height: 24,
  borderRadius: radius.full,
  backgroundColor: active ? colors.primary : colors.surface.containerHigh,
  border: `1px solid ${active ? colors.primary : colors.outlineVariant}`,
  cursor: 'pointer',
  position: 'relative',
  transition: 'background-color 0.2s ease, border-color 0.2s ease',
  flexShrink: 0,
});

const toggleThumbStyle = (active: boolean): React.CSSProperties => ({
  width: 18,
  height: 18,
  borderRadius: radius.full,
  backgroundColor: active ? colors.onPrimary : colors.onSurfaceVariant,
  position: 'absolute',
  top: 2,
  left: active ? 22 : 2,
  transition: 'left 0.2s ease, background-color 0.2s ease',
});

// ─── Component ────────────────────────────────────────────────────

export default function GhlIntegrationPage() {
  // Section A state
  const [pit, setPit] = useState('');
  const [locationId, setLocationId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [locationName, setLocationName] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [customFieldCount, setCustomFieldCount] = useState<number | null>(null);

  // Section C state
  const [customFieldMaps, setCustomFieldMaps] = useState<CustomFieldMap[]>(DEFAULT_CUSTOM_FIELDS);
  const [ghlFields, setGhlFields] = useState<SelectOption[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Section E state
  const [workflowId, setWorkflowId] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('star_speech_ready');

  // Section F state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [loaded, setLoaded] = useState(false);

  // ─── Load saved config on mount ─────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/ghl');
        if (!res.ok) return; // not configured yet, that's fine
        const data = await res.json();
        if (!data.configured) return;

        setLocationId(data.locationId ?? '');
        setWorkflowId(data.workflowId ?? '');
        setTriggerEvent(data.triggerEvent ?? 'star_speech_ready');
        setWebhookUrl(data.n8nWebhookUrl ?? '');
        setWebhookEnabled(data.n8nEnabled ?? false);

        // PIT: mark as unchanged so save can reuse the encrypted value
        if (data.pitPreview) {
          setPit(`unchanged:${data.locationId}`);
        }

        // Restore field mappings
        if (Array.isArray(data.fieldMappings) && data.fieldMappings.length > 0) {
          setCustomFieldMaps((prev) =>
            prev.map((m) => {
              const saved = data.fieldMappings.find(
                (fm: { starAppField: string }) => fm.starAppField === m.starKey
              );
              return saved ? { ...m, ghlFieldId: saved.ghlCustomFieldId } : m;
            })
          );
        }
      } catch {
        // Silently ignore load errors — user can still configure manually
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // ─── Real API calls ──────────────────────────────────────────

  const testConnection = useCallback(async () => {
    setConnectionStatus('testing');
    setConnectionError('');
    setLocationName('');
    setCustomFieldCount(null);

    try {
      const res = await fetch('/api/admin/ghl/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pit, locationId }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setConnectionStatus('error');
        const msgs = Array.isArray(data.errors) ? data.errors : [data.error || 'Connection test failed.'];
        setConnectionError(msgs.join(' '));
        return;
      }

      // Real success
      setLocationName(data.locationName ?? '');
      setCustomFieldCount(data.customFieldCount ?? null);
      setConnectionStatus('success');
    } catch (err) {
      setConnectionStatus('error');
      setConnectionError(
        err instanceof Error ? err.message : 'Network error contacting GHL.'
      );
    }
  }, [pit, locationId]);

  const refreshCustomFields = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/ghl/custom-fields');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch custom fields.');
      }
      const data = await res.json();
      const options: SelectOption[] = (data.fields ?? []).map(
        (f: { id: string; name: string }) => ({
          value: f.id,
          label: f.name,
        })
      );
      setGhlFields(options);
    } catch (err) {
      console.error('Refresh custom fields failed:', err);
      // Keep existing ghlFields on error
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleCustomFieldChange = useCallback((starKey: string, ghlFieldId: string) => {
    setCustomFieldMaps((prev) =>
      prev.map((m) => (m.starKey === starKey ? { ...m, ghlFieldId } : m))
    );
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage('');
    setSaveError('');

    try {
      const fieldMappings = customFieldMaps
        .filter((m) => m.ghlFieldId)
        .map((m) => ({ starAppField: m.starKey, ghlCustomFieldId: m.ghlFieldId }));

      const res = await fetch('/api/admin/ghl', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pit,
          locationId,
          fieldMappings,
          workflowId,
          triggerEvent,
          n8nWebhookUrl: webhookEnabled ? webhookUrl : '',
          n8nEnabled: webhookEnabled,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error || data.details ? JSON.stringify(data.details) : 'Save failed.');
        return;
      }

      setSaveMessage('Configuration saved successfully.');
      // After first real save, mark PIT as unchanged
      if (!pit.startsWith('unchanged:')) {
        setPit(`unchanged:${locationId}`);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [pit, locationId, customFieldMaps, workflowId, triggerEvent, webhookUrl, webhookEnabled]);

  // ─── Render ─────────────────────────────────────────────────

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.surface.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...typography.uiBody, color: colors.onSurfaceVariant }}>Loading configuration...</span>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.surface.base,
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        padding: spacing.lg,
        paddingTop: spacing.xl,
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.lg,
        }}
      >
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.lg }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <h1
              style={{
                ...typography.h1,
                fontSize: '36px',
                color: colors.onSurface,
                margin: 0,
              }}
            >
              GoHighLevel Integration
            </h1>
            <p
              style={{
                ...typography.uiBody,
                color: colors.onSurfaceVariant,
                maxWidth: '720px',
                margin: 0,
              }}
            >
              Configure your CRM connection, map custom fields, set up email workflow
              triggers, and optionally enable n8n webhook automation.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: spacing.sm, flexShrink: 0 }}>
            <Button
              variant="primary"
              loading={saving}
              onClick={handleSave}
              disabled={!pit.trim() || !locationId.trim()}
            >
              Save Configuration
            </Button>
            {saveMessage && (
              <span style={{ ...typography.caption, color: colors.primary }}>{saveMessage}</span>
            )}
            {saveError && (
              <span style={{ ...typography.caption, color: colors.error }}>{saveError}</span>
            )}
          </div>
        </div>

        {/* ─── Section A: Credentials & Connection Test ───────── */}
        <Card>
          <div style={sectionHeaderStyle}>
            <span style={sectionIconStyle}>🔑</span>
            <h2 style={sectionTitleStyle}>Credentials & Connection Test</h2>
            {connectionStatus === 'success' && (
              <Tag variant="success" icon="✅">Connected</Tag>
            )}
            {connectionStatus === 'error' && (
              <Tag variant="error" icon="❌">Failed</Tag>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: spacing.lg,
              paddingTop: spacing.xs,
            }}
          >
            <Input
              label="Private Integration Token (PIT)"
              type="password"
              placeholder="Enter your GHL PIT"
              value={pit.startsWith('unchanged:') ? '' : pit}
              onChange={(e) => setPit(e.target.value)}
              error={connectionStatus === 'error' && pit.trim().length === 0}
              helperText={
                connectionStatus === 'error' && pit.trim().length === 0
                  ? 'PIT is required for scope verification'
                  : pit.startsWith('unchanged:')
                    ? 'Token saved. Enter a new value to replace.'
                    : 'Password-masked. Found under Settings > Integrations in GHL.'
              }
            />
            <Input
              label="Location ID"
              type="text"
              placeholder="e.g. abc123XYZ"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              error={connectionStatus === 'error' && locationId.trim().length === 0}
              helperText={
                connectionStatus === 'error' && locationId.trim().length === 0
                  ? 'Location ID is required'
                  : 'The sub-account / location ID from GHL.'
              }
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              marginTop: spacing.lg,
            }}
          >
            <Button
              variant="primary"
              loading={connectionStatus === 'testing'}
              onClick={testConnection}
              disabled={!pit.trim() || !locationId.trim()}
            >
              Test Connection
            </Button>

            {connectionStatus === 'success' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={{ color: colors.primary, fontSize: 18 }}>✅</span>
                <span style={{ ...typography.uiBody, color: colors.onSurface }}>
                  {locationName ? (
                    <><strong>{locationName}</strong> connected</>
                  ) : (
                    <strong>Connection verified</strong>
                  )}
                  {customFieldCount !== null && (
                    <span style={{ color: colors.onSurfaceVariant, marginLeft: spacing.sm }}>
                      ({customFieldCount} custom field{customFieldCount !== 1 ? 's' : ''})
                    </span>
                  )}
                </span>
              </div>
            )}

            {connectionStatus === 'error' && connectionError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={{ color: colors.error, fontSize: 18 }}>❌</span>
                <span style={{ ...typography.uiBody, color: colors.error }}>
                  {connectionError}
                </span>
              </div>
            )}
          </div>

          <div style={infoBoxStyle}>
            <span style={{ color: colors.onSurfaceVariant, fontSize: 16, marginTop: 2 }}>ℹ️</span>
            <p
              style={{
                ...typography.caption,
                color: colors.onSurfaceVariant,
                lineHeight: '1.5',
                margin: 0,
              }}
            >
              Two checks run on Test Connection: (1) GET /locations/[id] to verify the Location ID is valid, and (2) GET /locations/[id]/customFields to confirm the PIT has the correct scope for reading and writing custom fields.
            </p>
          </div>
        </Card>

        {/* ─── Section B: Standard Contact Fields ─────────────── */}
        <Card>
          <div style={sectionHeaderStyle}>
            <span style={sectionIconStyle}>📋</span>
            <h2 style={sectionTitleStyle}>Standard Contact Fields</h2>
            <Tag variant="default">Auto-Mapped</Tag>
          </div>

          <p
            style={{
              ...typography.uiBody,
              color: colors.onSurfaceVariant,
              margin: 0,
              marginBottom: spacing.md,
            }}
          >
            These fields are automatically mapped between STAR App and GHL. No
            configuration needed.
          </p>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>STAR App Field</th>
                <th style={thStyle}>GHL Field Key</th>
                <th style={thStyle}>Description</th>
                <th style={{ ...thStyle, width: 100 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {STANDARD_FIELDS.map((field) => (
                <tr key={field.ghlField}>
                  <td style={tdStyle}>{field.starField}</td>
                  <td style={{ ...tdStyle, ...monoStyle }}>{field.ghlField}</td>
                  <td style={tdStyle}>{field.description}</td>
                  <td style={tdStyle}>
                    <Tag variant="success">Active</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* ─── Section C: Custom Field Mapping ─────────────────── */}
        <Card>
          <div style={sectionHeaderStyle}>
            <span style={sectionIconStyle}>🔗</span>
            <h2 style={sectionTitleStyle}>Custom Field Mapping</h2>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <p
              style={{
                ...typography.uiBody,
                color: colors.onSurfaceVariant,
                margin: 0,
              }}
            >
              Map each STAR App data point to a GHL custom field. Select the matching
              GHL field from the dropdown in each row.
            </p>
            <Button
              variant="secondary"
              loading={refreshing}
              onClick={refreshCustomFields}
            >
              Refresh Fields from GHL
            </Button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 180 }}>STAR Data Point</th>
                  <th style={{ ...thStyle, width: 150 }}>Key</th>
                  <th style={thStyle}>Description</th>
                  <th style={{ ...thStyle, width: 220 }}>GHL Custom Field</th>
                </tr>
              </thead>
              <tbody>
                {customFieldMaps.map((map) => (
                  <tr key={map.starKey}>
                    <td style={tdStyle}>{map.starField}</td>
                    <td style={{ ...tdStyle, ...monoStyle, fontSize: '12px' }}>
                      {map.starKey}
                    </td>
                    <td style={{ ...tdStyle, color: colors.onSurfaceVariant, fontSize: '14px' }}>
                      {map.description}
                    </td>
                    <td style={tdStyle}>
                      <Select
                        options={ghlFields}
                        value={map.ghlFieldId}
                        onChange={(val) => handleCustomFieldChange(map.starKey, val)}
                        placeholder={ghlFields.length > 0 ? 'Select field...' : 'Click Refresh to load fields'}
                        aria-label={`Map ${map.starField} to GHL field`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ─── Section D: Suggested Custom Field Names ─────────── */}
        <Card>
          <div style={sectionHeaderStyle}>
            <span style={sectionIconStyle}>💡</span>
            <h2 style={sectionTitleStyle}>Suggested Custom Field Names</h2>
            <Tag variant="secondary">Reference</Tag>
          </div>

          <p
            style={{
              ...typography.uiBody,
              color: colors.onSurfaceVariant,
              margin: 0,
              marginBottom: spacing.md,
            }}
          >
            Recommended GHL custom field names to create before mapping. Use these
            exact names in GHL for consistency across installations.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>STAR Data Point</th>
                  <th style={thStyle}>Suggested GHL Field Name</th>
                  <th style={{ ...thStyle, width: 120 }}>Field Type</th>
                </tr>
              </thead>
              <tbody>
                {SUGGESTED_FIELD_NAMES.map((field) => (
                  <tr key={field.suggestedGhlName}>
                    <td style={tdStyle}>{field.starDataPoint}</td>
                    <td style={{ ...tdStyle, ...monoStyle }}>
                      {field.suggestedGhlName}
                    </td>
                    <td style={tdStyle}>
                      <Tag variant="default">{field.fieldType}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ─── Section E: Email Workflow Trigger ──────────────── */}
        <Card>
          <div style={sectionHeaderStyle}>
            <span style={sectionIconStyle}>📧</span>
            <h2 style={sectionTitleStyle}>Email Workflow Trigger</h2>
          </div>

          <p
            style={{
              ...typography.uiBody,
              color: colors.onSurfaceVariant,
              margin: 0,
              marginBottom: spacing.md,
            }}
          >
            When a speech is finalized, STAR App can trigger a GHL workflow to
            automatically send the speech to the contact via email. Configure the
            workflow ID and trigger event name below.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: spacing.lg,
            }}
          >
            <Input
              label="GHL Workflow ID"
              type="text"
              placeholder="e.g. wf_abc123XYZ"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              helperText="Found in GHL under Automation > Workflows > Settings."
            />
            <Input
              label="Trigger Event Name"
              type="text"
              placeholder="star_speech_ready"
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value)}
              helperText="Custom trigger event that fires when a speech is finalized."
            />
          </div>

          <div style={infoBoxStyle}>
            <span style={{ color: colors.onSurfaceVariant, fontSize: 16, marginTop: 2 }}>ℹ️</span>
            <p
              style={{
                ...typography.caption,
                color: colors.onSurfaceVariant,
                lineHeight: '1.5',
                margin: 0,
              }}
            >
              The default trigger event is <strong>star_speech_ready</strong>. Create
              a webhook trigger in your GHL workflow with this event name, and STAR
              App will fire it each time a speech is marked as final.
            </p>
          </div>
        </Card>

        {/* ─── Section F: Optional n8n Webhook ────────────────── */}
        <Card>
          <div style={sectionHeaderStyle}>
            <span style={sectionIconStyle}>⚡</span>
            <h2 style={sectionTitleStyle}>Optional n8n Webhook</h2>
            {webhookEnabled ? (
              <Tag variant="primary">Enabled</Tag>
            ) : (
              <Tag variant="default">Disabled</Tag>
            )}
          </div>

          <p
            style={{
              ...typography.uiBody,
              color: colors.onSurfaceVariant,
              margin: 0,
              marginBottom: spacing.md,
            }}
          >
            Optionally forward finalized speech data to an n8n workflow for
            additional processing (CRM sync, Slack notifications, etc.).
            Disabled by default.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing.lg,
            }}
          >
            {/* Toggle */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: spacing.xs,
                paddingTop: spacing.xl,
              }}
            >
              <div
                style={toggleTrackStyle(webhookEnabled)}
                onClick={() => setWebhookEnabled(!webhookEnabled)}
                role="switch"
                aria-checked={webhookEnabled}
                aria-label="Enable n8n webhook"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setWebhookEnabled(!webhookEnabled);
                  }
                }}
              >
                <div style={toggleThumbStyle(webhookEnabled)} />
              </div>
              <span
                style={{
                  ...typography.caption,
                  color: colors.onSurfaceVariant,
                }}
              >
                {webhookEnabled ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* URL Input */}
            <div style={{ flex: 1 }}>
              <Input
                label="n8n Webhook URL"
                type="url"
                placeholder="https://your-n8n.example.com/webhook/star-speech"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                disabled={!webhookEnabled}
                helperText={
                  webhookEnabled
                    ? 'POST request with speech payload is sent to this URL on finalization.'
                    : 'Enable the toggle to configure the webhook URL.'
                }
              />
            </div>
          </div>

          {webhookEnabled && webhookUrl.trim() && (
            <div style={infoBoxStyle}>
              <span style={{ color: colors.primary, fontSize: 16, marginTop: 2 }}>⚡</span>
              <p
                style={{
                  ...typography.caption,
                  color: colors.onSurfaceVariant,
                  lineHeight: '1.5',
                  margin: 0,
                }}
              >
                When enabled, STAR App will POST a JSON payload to this webhook
                containing: contact info, speech content, audio link, and metadata.
                Ensure your n8n workflow is configured to accept this schema.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
