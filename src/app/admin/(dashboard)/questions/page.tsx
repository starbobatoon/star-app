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

interface QuestionFormData {
  question_text: string;
  helper_text: string;
  feeds_section: string;
  is_required: boolean;
  is_active: boolean;
  ghl_field_key: string;
  display_order: number;
}

const EMPTY_FORM: QuestionFormData = {
  question_text: '',
  helper_text: '',
  feeds_section: 'hook',
  is_required: true,
  is_active: true,
  ghl_field_key: '',
  display_order: 0,
};

const SECTION_OPTIONS = ['map', 'hook', 'story', 'point', 'cta', 'exit', 'meta'];

const SECTION_TAG_VARIANT: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'success'> = {
  map: 'secondary',
  hook: 'primary',
  story: 'success',
  point: 'default',
  cta: 'primary',
  exit: 'default',
  meta: 'secondary',
};

// ─── Confirm Dialog ───────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  };

  const dialogStyle: CSSProperties = {
    backgroundColor: colors.surface.container,
    border: `1px solid ${colors.outlineVariant}`,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxWidth: '420px',
    width: '90%',
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ ...typography.h2, color: colors.onSurface, margin: 0, marginBottom: spacing.sm, fontSize: '20px' }}>
          {title}
        </h3>
        <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant, margin: 0, marginBottom: spacing.lg }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            style={{ backgroundColor: colors.error, color: colors.onError }}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Question Form Modal ──────────────────────────────────────────

interface QuestionFormModalProps {
  title: string;
  initialData: QuestionFormData;
  onSave: (data: QuestionFormData) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

function QuestionFormModal({ title, initialData, onSave, onCancel, isSaving }: QuestionFormModalProps) {
  const [form, setForm] = useState<QuestionFormData>(initialData);

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  };

  const modalStyle: CSSProperties = {
    backgroundColor: colors.surface.container,
    border: `1px solid ${colors.outlineVariant}`,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxWidth: '560px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
  };

  const labelStyle: CSSProperties = {
    ...typography.uiLabel,
    color: colors.onSurfaceVariant,
    display: 'block',
    marginBottom: spacing.xs,
    letterSpacing: '0.05em',
  };

  const selectStyle: CSSProperties = {
    fontFamily: `var(${typography.uiBody.fontFamily})`,
    fontSize: typography.uiBody.fontSize,
    color: colors.onSurface,
    backgroundColor: colors.surface.containerHigh,
    border: `1px solid ${colors.outlineVariant}`,
    borderRadius: radius.DEFAULT,
    padding: `${spacing.sm} ${spacing.md}`,
    width: '100%',
    outline: 'none',
  };

  const textareaStyle: CSSProperties = {
    fontFamily: `var(${typography.uiBody.fontFamily})`,
    fontSize: typography.uiBody.fontSize,
    color: colors.onSurface,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${colors.outlineVariant}`,
    padding: `${spacing.sm} 0`,
    width: '100%',
    outline: 'none',
    resize: 'vertical',
    minHeight: '60px',
  };

  const checkboxRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  };

  const handleSubmit = async () => {
    if (!form.question_text.trim()) return;
    await onSave(form);
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ ...typography.h2, color: colors.onSurface, margin: 0, marginBottom: spacing.lg, fontSize: '20px' }}>
          {title}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {/* Question Text */}
          <div>
            <label style={labelStyle}>Question Text</label>
            <textarea
              value={form.question_text}
              onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
              style={textareaStyle}
              placeholder="Enter the question text..."
              rows={2}
            />
          </div>

          {/* Helper Text */}
          <div>
            <label style={labelStyle}>Helper Text (optional)</label>
            <Input
              value={form.helper_text}
              onChange={(e) => setForm((f) => ({ ...f, helper_text: e.target.value }))}
              placeholder="Guidance text shown below the question"
            />
          </div>

          {/* Section & Order Row */}
          <div style={{ display: 'flex', gap: spacing.md }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Section</label>
              <select
                value={form.feeds_section}
                onChange={(e) => setForm((f) => ({ ...f, feeds_section: e.target.value }))}
                style={selectStyle}
              >
                {SECTION_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Display Order</label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm((f) => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          {/* GHL Field Key */}
          <div>
            <label style={labelStyle}>GHL Field Key (optional)</label>
            <Input
              value={form.ghl_field_key}
              onChange={(e) => setForm((f) => ({ ...f, ghl_field_key: e.target.value }))}
              placeholder="e.g. custom_question_1"
            />
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'flex', gap: spacing.lg }}>
            <div style={checkboxRowStyle}>
              <input
                type="checkbox"
                id="is_required"
                checked={form.is_required}
                onChange={(e) => setForm((f) => ({ ...f, is_required: e.target.checked }))}
              />
              <label htmlFor="is_required" style={{ ...typography.uiBody, color: colors.onSurface, cursor: 'pointer' }}>
                Required
              </label>
            </div>
            <div style={checkboxRowStyle}>
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <label htmlFor="is_active" style={{ ...typography.uiBody, color: colors.onSurface, cursor: 'pointer' }}>
                Active
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.lg, paddingTop: spacing.lg, borderTop: `1px solid ${colors.surface.containerHigh}` }}>
          <Button variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSaving || !form.question_text.trim()}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Question Row Component ───────────────────────────────────────

interface QuestionRowProps {
  question: Question;
  onEdit: (question: Question) => void;
  onDelete: (question: Question) => void;
}

function QuestionRow({ question, onEdit, onDelete }: QuestionRowProps) {
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

  const iconBtnStyle: CSSProperties = {
    background: 'none',
    border: `1px solid ${colors.outlineVariant}`,
    cursor: 'pointer',
    color: colors.outline,
    padding: `${spacing.xs} ${spacing.sm}`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.DEFAULT,
    ...typography.uiLabel,
    transition: 'all 0.2s ease',
  };

  return (
    <div style={rowStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flex: 1 }}>
          <span style={orderBadgeStyle}>{question.display_order}</span>
          <span style={{ ...typography.uiBody, color: colors.onSurface, flex: 1 } as CSSProperties}>
            {question.question_text}
          </span>
        </div>
        <div style={{ display: 'flex', gap: spacing.sm, flexShrink: 0 }}>
          <button
            style={iconBtnStyle}
            onClick={() => onEdit(question)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.secondary;
              e.currentTarget.style.color = colors.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.outlineVariant;
              e.currentTarget.style.color = colors.outline;
            }}
          >
            Edit
          </button>
          <button
            style={{ ...iconBtnStyle, color: colors.error }}
            onClick={() => onDelete(question)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.error;
              e.currentTarget.style.backgroundColor = `${colors.error}15`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.outlineVariant;
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Delete
          </button>
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
          <span style={{ ...typography.caption, color: colors.outline } as CSSProperties}>
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
  const [saving, setSaving] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [deleteQuestion, setDeleteQuestion] = useState<Question | null>(null);

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

  // CREATE
  const handleCreate = useCallback(async (formData: QuestionFormData) => {
    try {
      setSaving(true);

      const response = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create question (${response.status})`);
      }

      const data = await response.json();
      setQuestions((prev) => [...prev, data.question].sort((a, b) => a.display_order - b.display_order));
      setShowAddModal(false);
    } catch (err) {
      console.error('[QuestionsPage] Failed to create:', err);
      alert(err instanceof Error ? err.message : 'Failed to create question');
    } finally {
      setSaving(false);
    }
  }, []);

  // UPDATE
  const handleUpdate = useCallback(async (formData: QuestionFormData) => {
    if (!editQuestion) return;

    try {
      setSaving(true);

      const response = await fetch('/api/admin/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editQuestion.id, ...formData }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to update question (${response.status})`);
      }

      const data = await response.json();
      setQuestions((prev) =>
        prev.map((q) => (q.id === editQuestion.id ? data.question : q))
            .sort((a, b) => a.display_order - b.display_order)
      );
      setEditQuestion(null);
    } catch (err) {
      console.error('[QuestionsPage] Failed to update:', err);
      alert(err instanceof Error ? err.message : 'Failed to update question');
    } finally {
      setSaving(false);
    }
  }, [editQuestion]);

  // DELETE
  const handleDelete = useCallback(async () => {
    if (!deleteQuestion) return;

    try {
      setSaving(true);

      const response = await fetch(`/api/admin/questions?id=${deleteQuestion.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to delete question (${response.status})`);
      }

      setQuestions((prev) => prev.filter((q) => q.id !== deleteQuestion.id));
      setDeleteQuestion(null);
    } catch (err) {
      console.error('[QuestionsPage] Failed to delete:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete question');
    } finally {
      setSaving(false);
    }
  }, [deleteQuestion]);

  // Convert Question to form data for editing
  const questionToForm = (q: Question): QuestionFormData => ({
    question_text: q.question_text,
    helper_text: q.helper_text || '',
    feeds_section: q.feeds_section,
    is_required: q.is_required,
    is_active: q.is_active,
    ghl_field_key: q.ghl_field_key || '',
    display_order: q.display_order,
  });

  // ─── Styles ───────────────────────────────────────────────────

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
                Add, edit, and manage the questions shown on the compose page.
              </p>
            </div>
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <Button variant="secondary" onClick={fetchQuestions} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                Add Question
              </Button>
            </div>
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
                  onEdit={(q) => setEditQuestion(q)}
                  onDelete={(q) => setDeleteQuestion(q)}
                />
              ))}

              {/* Empty State */}
              {questions.length === 0 && (
                <div style={emptyStyle}>
                  <p>No questions found. Click "Add Question" to create one.</p>
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
              <span style={{ ...typography.caption, color: colors.onSurfaceVariant } as CSSProperties}>
                {questions.length} question{questions.length !== 1 ? 's' : ''} total
              </span>
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <QuestionFormModal
          title="Add New Question"
          initialData={{ ...EMPTY_FORM, display_order: questions.length > 0 ? Math.max(...questions.map((q) => q.display_order)) + 1 : 1 }}
          onSave={handleCreate}
          onCancel={() => setShowAddModal(false)}
          isSaving={saving}
        />
      )}

      {/* Edit Modal */}
      {editQuestion && (
        <QuestionFormModal
          title="Edit Question"
          initialData={questionToForm(editQuestion)}
          onSave={handleUpdate}
          onCancel={() => setEditQuestion(null)}
          isSaving={saving}
        />
      )}

      {/* Delete Confirmation */}
      {deleteQuestion && (
        <ConfirmDialog
          title="Delete Question"
          message={`Are you sure you want to delete "${deleteQuestion.question_text}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteQuestion(null)}
        />
      )}
    </div>
  );
}
