'use client';

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { colors, typography, radius, spacing } from '@/styles/design-tokens';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tag } from '@/components/ui/Tag';

// ─── Types ────────────────────────────────────────────────────────

interface Question {
  id: string;
  display_order: number;
  question_text: string;
  helper_text: string | null;
  feeds_section: string;
  is_required: boolean;
  is_active: boolean;
  ghl_field_key: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Sidebar is provided by admin/layout.tsx ──────────────────────

// ─── Question Row Component ───────────────────────────────────────

const SECTION_TAG_VARIANT: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'success'> = {
  map: 'secondary',
  hook: 'primary',
  story: 'success',
  point: 'default',
  cta: 'primary',
  exit: 'default',
  meta: 'secondary',
};

interface QuestionRowProps {
  question: Question;
  onSave: (id: string, questionText: string) => Promise<void>;
  isSaving: boolean;
}

function QuestionRow({ question, onSave, isSaving }: QuestionRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(question.question_text);

  const handleSave = async () => {
    if (editValue.trim() !== question.question_text) {
      await onSave(question.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(question.question_text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const rowStyle: CSSProperties = {
    backgroundColor: colors.surface.container,
    border: `1px solid ${colors.outlineVariant}`,
    borderRadius: radius.lg,
    padding: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    transition: 'border-color 0.2s ease',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  };

  const orderBadgeStyle: CSSProperties = {
    ...typography.uiLabel,
    backgroundColor: colors.surface.containerHigh,
    color: colors.onSurfaceVariant,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.DEFAULT,
    minWidth: '28px',
    textAlign: 'center',
  };

  const metaStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  };

  const helperTextStyle: CSSProperties = {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    margin: 0,
    fontStyle: 'italic',
  };

  const editContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  };

  const buttonRowStyle: CSSProperties = {
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  };

  return (
    <div style={rowStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flex: 1 }}>
          <span style={orderBadgeStyle}>{question.display_order}</span>
          {isEditing ? (
            <div style={{ flex: 1, ...editContainerStyle }}>
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                style={{ width: '100%' }}
              />
              <div style={buttonRowStyle}>
                <Button
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={isSaving}
                  style={{ padding: `${spacing.xs} ${spacing.sm}`, fontSize: '12px' }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={isSaving || !editValue.trim()}
                  style={{ padding: `${spacing.xs} ${spacing.sm}`, fontSize: '12px' }}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setIsEditing(true)}>
              <span
                style={{
                  ...typography.uiBody,
                  color: colors.onSurface,
                } as CSSProperties}
              >
                {question.question_text}
              </span>
              <span
                style={{
                  ...typography.caption,
                  color: colors.outline,
                  marginLeft: spacing.sm,
                } as CSSProperties}
              >
                (click to edit)
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={metaStyle}>
        <Tag variant={SECTION_TAG_VARIANT[question.feeds_section] || 'default'}>
          {question.feeds_section.toUpperCase()}
        </Tag>
        {question.is_required && (
          <Tag variant="error">Required</Tag>
        )}
        {question.is_active ? (
          <Tag variant="success">Active</Tag>
        ) : (
          <Tag variant="default">Inactive</Tag>
        )}
        {question.ghl_field_key && (
          <span
            style={{
              ...typography.caption,
              color: colors.outline,
            } as CSSProperties}
          >
            GHL: {question.ghl_field_key}
          </span>
        )}
      </div>

      {question.helper_text && (
        <p style={helperTextStyle}>{question.helper_text}</p>
      )}
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Fetch questions on mount
  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/questions');
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please log in as admin.');
        }
        if (response.status === 403) {
          throw new Error('Forbidden. Admin access required.');
        }
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch questions (${response.status})`);
      }

      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.error('[QuestionsPage] Failed to fetch:', err);
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = useCallback(async (id: string, questionText: string) => {
    try {
      setSavingId(id);
      
      const response = await fetch('/api/admin/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, question_text: questionText }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to update question (${response.status})`);
      }

      // Update local state
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, question_text: questionText } : q
        )
      );
    } catch (err) {
      console.error('[QuestionsPage] Failed to save:', err);
      alert(err instanceof Error ? err.message : 'Failed to save question');
    } finally {
      setSavingId(null);
    }
  }, []);

  const containerStyle: CSSProperties = {
    minHeight: '100vh',
    backgroundColor: colors.surface.base,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  };

  const contentStyle: CSSProperties = {
    maxWidth: 900,
    margin: '0 auto',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottom: `1px solid ${colors.surface.containerHigh}`,
  };

  const titleStyle: CSSProperties = {
    ...typography.h1,
    color: colors.onSurface,
    margin: 0,
    marginBottom: spacing.sm,
  };

  const subtitleStyle: CSSProperties = {
    ...typography.uiBody,
    color: colors.onSurfaceVariant,
    margin: 0,
  };

  const listStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  };

  const errorStyle: CSSProperties = {
    backgroundColor: colors.errorContainer,
    color: colors.onErrorContainer,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...typography.uiBody,
  };

  const loadingStyle: CSSProperties = {
    textAlign: 'center',
    padding: spacing.xxl,
    color: colors.onSurfaceVariant,
    ...typography.uiBody,
  };

  const emptyStyle: CSSProperties = {
    textAlign: 'center',
    padding: spacing.xxl,
    color: colors.onSurfaceVariant,
    border: `1px dashed ${colors.outlineVariant}`,
    borderRadius: radius.lg,
    ...typography.uiBody,
  };

  return (
    <div>
      <main style={containerStyle}>
        <div style={contentStyle}>
          {/* Header */}
          <header style={headerStyle}>
            <div>
              <h1 style={titleStyle}>Question Manager</h1>
              <p style={subtitleStyle}>
                Click any question text to edit it inline. Changes are saved immediately.
              </p>
            </div>
            <Button variant="secondary" onClick={fetchQuestions} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </header>

          {/* Error */}
          {error && (
            <div style={errorStyle}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div style={loadingStyle}>Loading questions...</div>
          )}

          {/* Questions List */}
          {!isLoading && !error && (
            <div style={listStyle}>
              {questions.map((question) => (
                <QuestionRow
                  key={question.id}
                  question={question}
                  onSave={handleSave}
                  isSaving={savingId === question.id}
                />
              ))}

              {/* Empty State */}
              {questions.length === 0 && (
                <div style={emptyStyle}>
                  <p>No questions found in the database.</p>
                </div>
              )}
            </div>
          )}

          {/* Count Footer */}
          {!isLoading && !error && questions.length > 0 && (
            <div
              style={{
                marginTop: spacing.lg,
                paddingTop: spacing.lg,
                borderTop: `1px solid ${colors.surface.containerHigh}`,
                textAlign: 'center',
              } as CSSProperties}
            >
              <span
                style={{
                  ...typography.caption,
                  color: colors.onSurfaceVariant,
                } as CSSProperties}
              >
                {questions.length} question{questions.length !== 1 ? 's' : ''} total
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
