'use client';

import { useState } from 'react';
import { colors, typography, radius, spacing } from '@/styles/design-tokens';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';

// ─── Mock Data ────────────────────────────────────────────────────

interface PromptVersion {
  id: string;
  version: number;
  content: string;
  isActive: boolean;
  createdAt: string;
  author: string;
}

const MOCK_PROMPTS: PromptVersion[] = [
  {
    id: 'v5',
    version: 5,
    content: `You are the primary intelligence engine for Star Speaker AI, an elite digital atelier for speechwriting and strategic communications.

CORE MANDATES:
1. TONE: Authoritative, restrained, intellectual. Avoid colloquialisms, buzzwords, or overly effusive language. Think 'presidential archivist' meets 'high-end editorial'.
2. STRUCTURE: Prioritize extreme clarity. Use whitespace aggressively. Favor short, punchy paragraphs over walls of text.
3. OUTPUT FORMAT: Adhere strictly to the requested Markdown structures. Do not wrap final outputs in chatty conversational wrappers (e.g., "Here is your speech..."). Deliver the asset directly.
4. COGNITION: When analyzing user inputs, focus on rhetorical intent. What is the emotional core of the argument? Highlight structural weaknesses before offering prose suggestions.

Never break character. Never apologize unnecessarily. Focus on the craft.`,
    isActive: true,
    createdAt: '2026-04-21T14:30:00Z',
    author: 'Christy',
  },
  {
    id: 'v4',
    version: 4,
    content: `You are the primary intelligence engine for Star Speaker AI, an elite digital atelier for speechwriting and strategic communications.

CORE MANDATES:
1. TONE: Authoritative, restrained, intellectual. Avoid colloquialisms and buzzwords.
2. STRUCTURE: Prioritize clarity. Use whitespace aggressively.
3. OUTPUT FORMAT: Adhere strictly to requested Markdown structures. Do not wrap outputs in conversational text.
4. COGNITION: Focus on rhetorical intent. Highlight structural weaknesses before prose suggestions.

Never break character. Never apologize unnecessarily. Focus on the craft.`,
    isActive: false,
    createdAt: '2026-04-15T09:00:00Z',
    author: 'Christy',
  },
  {
    id: 'v3',
    version: 3,
    content: `You are the intelligence engine for Star Speaker AI, a digital atelier for speechwriting.

MANDATES:
1. TONE: Authoritative and intellectual. Avoid colloquialisms.
2. STRUCTURE: Clear and concise. Use whitespace.
3. OUTPUT FORMAT: Markdown only. No conversational wrappers.
4. COGNITION: Analyze rhetorical intent. Surface structural weaknesses.

Never break character. Focus on the craft.`,
    isActive: false,
    createdAt: '2026-04-02T16:45:00Z',
    author: 'Christy',
  },
  {
    id: 'v2',
    version: 2,
    content: `You are Star Speaker AI's speechwriting engine. Write with authority and precision. Use Markdown formatting. No conversational padding. Focus on rhetoric.`,
    isActive: false,
    createdAt: '2026-03-20T11:20:00Z',
    author: 'Trevor',
  },
  {
    id: 'v1',
    version: 1,
    content: `You are a speechwriting assistant. Write speeches in Markdown format.`,
    isActive: false,
    createdAt: '2026-03-10T08:00:00Z',
    author: 'Trevor',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ─── Component ────────────────────────────────────────────────────

export default function PromptSettingsPage() {
  const [versions, setVersions] = useState<PromptVersion[]>(MOCK_PROMPTS);
  const [editContent, setEditContent] = useState(
    () => versions.find((v) => v.isActive)?.content ?? '',
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const activePrompt = versions.find((v) => v.isActive);

  const handleContentChange = (value: string) => {
    setEditContent(value);
    setIsDirty(value !== (activePrompt?.content ?? ''));
  };

  const handleSave = () => {
    if (!editContent.trim()) return;
    setIsSaving(true);

    // Deactivate previous active
    const updated = versions.map((v) => ({ ...v, isActive: false }));
    const nextVersion = Math.max(...versions.map((v) => v.version)) + 1;
    const newPrompt: PromptVersion = {
      id: `v${nextVersion}`,
      version: nextVersion,
      content: editContent.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
      author: 'Christy',
    };
    updated.unshift(newPrompt);

    setVersions(updated);
    setIsDirty(false);
    setIsSaving(false);
    setToast({ message: `Version ${nextVersion} saved and activated.`, type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRollback = (version: PromptVersion) => {
    const updated = versions.map((v) => ({ ...v, isActive: false }));
    const nextVersion = Math.max(...versions.map((v) => v.version)) + 1;
    const rolledBack: PromptVersion = {
      id: `v${nextVersion}`,
      version: nextVersion,
      content: version.content,
      isActive: true,
      createdAt: new Date().toISOString(),
      author: 'Christy',
    };
    updated.unshift(rolledBack);

    setVersions(updated);
    setEditContent(version.content);
    setIsDirty(false);
    setToast({
      message: `Rolled back to v${version.version} content as v${nextVersion}.`,
      type: 'success',
    });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCancel = () => {
    setEditContent(activePrompt?.content ?? '');
    setIsDirty(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
        fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
        color: colors.onBackground,
        padding: `${spacing.xl} ${spacing.gutter}`,
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Page Header */}
        <header style={{ marginBottom: spacing.xl }}>
          <h1
            style={{
              ...typography.h2,
              color: colors.onSurface,
              margin: 0,
              marginBottom: spacing.xs,
            }}
          >
            Prompt Settings
          </h1>
          <p
            style={{
              ...typography.uiBody,
              color: colors.onSurfaceVariant,
              margin: 0,
            }}
          >
            Edit the master speechwriting system prompt. Each save creates a new version. Roll back to any previous version at any time.
          </p>
        </header>

        {/* Prompt Editor Section */}
        <Card padding={spacing.lg} cardStyle={{ marginBottom: spacing.xl }}>
          {/* Section Header */}
          <div
            style={{
              borderBottom: `1px solid ${colors.outlineVariant}`,
              paddingBottom: spacing.sm,
              marginBottom: spacing.md,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2
              style={{
                ...typography.uiLabel,
                color: colors.onSurface,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
              }}
            >
              <span
                style={{
                  fontSize: '18px',
                  lineHeight: 1,
                }}
              >
                terminal
              </span>
              Systemic Imperatives
            </h2>
            {activePrompt && (
              <Tag variant="primary">v{activePrompt.version} Active</Tag>
            )}
          </div>

          {/* Description */}
          <p
            style={{
              ...typography.caption,
              color: colors.outline,
              marginBottom: spacing.sm,
            }}
          >
            These instructions are prepended to every completion request, overriding model defaults to maintain the atelier&apos;s specific tone and formatting rules.
          </p>

          {/* Textarea */}
          <div style={{ position: 'relative' }}>
            <textarea
              value={editContent}
              onChange={(e) => handleContentChange(e.target.value)}
              spellCheck={false}
              rows={14}
              style={{
                width: '100%',
                backgroundColor: colors.surface.containerLowest,
                color: colors.onSurface,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: '14px',
                lineHeight: '1.7',
                padding: spacing.md,
                border: `1px solid ${isDirty ? colors.primary : colors.outlineVariant}`,
                borderRadius: radius.DEFAULT,
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => {
                if (!isDirty) {
                  e.currentTarget.style.borderColor = colors.secondary;
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isDirty
                  ? colors.primary
                  : colors.outlineVariant;
              }}
            />
          </div>

          {/* Character count + dirty indicator */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: spacing.xs,
            }}
          >
            <span
              style={{
                ...typography.caption,
                color: isDirty ? colors.primary : colors.onSurfaceVariant,
              }}
            >
              {isDirty ? 'Unsaved changes' : 'No changes'}
            </span>
            <span style={{ ...typography.caption, color: colors.onSurfaceVariant }}>
              {editContent.length} characters
            </span>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: spacing.md,
              marginTop: spacing.lg,
              paddingTop: spacing.md,
              borderTop: `1px solid ${colors.outlineVariant}`,
            }}
          >
            {isDirty && (
              <Button variant="tertiary" onClick={handleCancel}>
                Cancel Changes
              </Button>
            )}
            <Button
              variant="primary"
              disabled={!isDirty || !editContent.trim()}
              loading={isSaving}
              onClick={handleSave}
            >
              Commit Prompt
            </Button>
          </div>
        </Card>

        {/* Version History Section */}
        <Card padding={spacing.lg}>
          <div
            style={{
              borderBottom: `1px solid ${colors.outlineVariant}`,
              paddingBottom: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            <h2
              style={{
                ...typography.uiLabel,
                color: colors.onSurface,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>history</span>
              Version History
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {versions.map((version, index) => (
              <div
                key={version.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `${spacing.md} 0`,
                  borderBottom:
                    index < versions.length - 1
                      ? `1px solid ${colors.outlineVariant}`
                      : 'none',
                  opacity: version.isActive ? 1 : 0.75,
                }}
              >
                {/* Left: Version info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                  <div
                    style={{
                      ...typography.uiLabel,
                      color: version.isActive ? colors.primary : colors.onSurface,
                      minWidth: '48px',
                    }}
                  >
                    v{version.version}
                  </div>
                  <div>
                    <div
                      style={{
                        ...typography.uiBody,
                        color: colors.onSurface,
                        fontSize: '14px',
                        lineHeight: '1.4',
                        margin: 0,
                      }}
                    >
                      {formatDate(version.createdAt)}
                    </div>
                    <div
                      style={{
                        ...typography.caption,
                        color: colors.onSurfaceVariant,
                        margin: 0,
                      }}
                    >
                      by {version.author} · {version.content.length} chars
                    </div>
                  </div>
                </div>

                {/* Right: Status + Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  {version.isActive ? (
                    <Tag variant="success">Active</Tag>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => handleRollback(version)}
                      style={{
                        fontSize: '12px',
                        padding: `${spacing.xs} ${spacing.sm}`,
                      }}
                    >
                      Roll Back
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Version count footer */}
          <div
            style={{
              marginTop: spacing.md,
              paddingTop: spacing.sm,
              borderTop: `1px solid ${colors.outlineVariant}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ ...typography.caption, color: colors.outline }}>
              {versions.length} versions stored
            </span>
            <span style={{ ...typography.caption, color: colors.outline }}>
              First: {formatShortDate(versions[versions.length - 1].createdAt)} · Latest:{' '}
              {formatShortDate(versions[0].createdAt)}
            </span>
          </div>
        </Card>

        {/* Toast notification */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: spacing.xl,
              right: spacing.xl,
              backgroundColor:
                toast.type === 'success' ? colors.primaryContainer : colors.errorContainer,
              color:
                toast.type === 'success' ? colors.onPrimaryContainer : colors.onErrorContainer,
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: radius.DEFAULT,
              fontFamily: `var(${typography.uiBody.fontFamily})`,
              fontSize: typography.uiBody.fontSize,
              fontWeight: 500,
              zIndex: 1000,
              border: `1px solid ${
                toast.type === 'success' ? colors.primary : colors.error
              }`,
              animation: 'slideUp 0.3s ease',
            }}
          >
            {toast.message}
            <style>{`
              @keyframes slideUp {
                from {
                  transform: translateY(20px);
                  opacity: 0;
                }
                to {
                  transform: translateY(0);
                  opacity: 1;
                }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}