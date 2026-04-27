'use client';

import { useState, useEffect, useCallback } from 'react';
import { colors, typography, radius, spacing } from '@/lib/design-tokens';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// ─── Types ─────────────────────────────────────────────────────────

interface KbDocument {
  id: string;
  title: string;
  contentLength: number;
  createdAt: string;
}

// ─── Page ──────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  // List state
  const [documents, setDocuments] = useState<KbDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Upload form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  // Delete state — id of the row currently being deleted
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ─── Fetch documents ─────────────────────────────────────────────

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/knowledge-base');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to fetch documents');
      }
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ─── Add document ─────────────────────────────────────────────────

  const handleAdd = async () => {
    setAddError(null);
    setAddSuccess(false);

    if (!title.trim()) {
      setAddError('Title is required.');
      return;
    }
    if (!content.trim()) {
      setAddError('Content is required.');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/admin/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to add document');
      }
      setTitle('');
      setContent('');
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
      await fetchDocuments();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add document');
    } finally {
      setAdding(false);
    }
  };

  // ─── Delete document ──────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/knowledge-base?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to delete document');
      }
      await fetchDocuments();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div style={{ padding: spacing.lg, maxWidth: 780 }}>

      {/* Page header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ ...typography.h1, color: colors.onSurface, marginBottom: spacing.xs }}>
          Knowledge Base
        </h1>
        <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant }}>
          Manage reference documents the AI can draw on when helping users craft and refine
          their speech answers. Documents are stored privately and never surfaced to end users.
        </p>
      </div>

      {/* ── Upload Section ── */}
      <Card cardStyle={{ marginBottom: spacing.xl }}>
        <div style={{ padding: spacing.lg }}>
          <h2
            style={{
              ...typography.h2,
              color: colors.onSurface,
              fontSize: '18px',
              marginBottom: spacing.xs,
            }}
          >
            Add Document
          </h2>
          <p
            style={{
              ...typography.uiBody,
              color: colors.onSurfaceVariant,
              marginBottom: spacing.lg,
            }}
          >
            Paste any text — speaking frameworks, brand guidelines, example answers — and give
            it a short descriptive title.
          </p>

          {addError && (
            <div
              style={{
                background: `${colors.error}15`,
                border: `1px solid ${colors.error}`,
                borderRadius: radius.DEFAULT,
                padding: spacing.sm,
                marginBottom: spacing.md,
                color: colors.error,
                fontSize: '14px',
              }}
            >
              {addError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {/* Title input */}
            <div>
              <label
                style={{
                  ...typography.uiLabel,
                  color: colors.onSurfaceVariant,
                  display: 'block',
                  marginBottom: spacing.xs,
                }}
              >
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Star's Speaking Framework"
                maxLength={200}
                style={{
                  width: '100%',
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: colors.surface.containerLow,
                  color: colors.onSurface,
                  border: `1px solid ${colors.outlineVariant}`,
                  borderRadius: radius.DEFAULT,
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = colors.outlineVariant; }}
              />
            </div>

            {/* Content textarea */}
            <div>
              <label
                style={{
                  ...typography.uiLabel,
                  color: colors.onSurfaceVariant,
                  display: 'block',
                  marginBottom: spacing.xs,
                }}
              >
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste the full document text here…"
                maxLength={50000}
                rows={10}
                style={{
                  width: '100%',
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: colors.surface.containerLow,
                  color: colors.onSurface,
                  border: `1px solid ${colors.outlineVariant}`,
                  borderRadius: radius.DEFAULT,
                  fontSize: '15px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: '1.6',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = colors.outlineVariant; }}
              />
              <p style={{ fontSize: '12px', color: colors.outline, marginTop: '6px' }}>
                {content.length.toLocaleString()} / 50,000 characters
              </p>
            </div>

            {/* Submit row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <Button
                variant="primary"
                onClick={handleAdd}
                disabled={adding}
                loading={adding}
              >
                {adding ? 'Adding…' : 'Add Document'}
              </Button>
              {addSuccess && (
                <span style={{ color: colors.primary, fontSize: '14px', fontWeight: 600 }}>
                  ✓ Document added
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Documents List ── */}
      <Card>
        <div style={{ padding: spacing.lg }}>
          <h2
            style={{
              ...typography.h2,
              color: colors.onSurface,
              fontSize: '18px',
              marginBottom: spacing.xs,
            }}
          >
            Documents
          </h2>
          <p
            style={{
              ...typography.uiBody,
              color: colors.onSurfaceVariant,
              marginBottom: spacing.lg,
            }}
          >
            All documents currently available to the AI.
          </p>

          {deleteError && (
            <div
              style={{
                background: `${colors.error}15`,
                border: `1px solid ${colors.error}`,
                borderRadius: radius.DEFAULT,
                padding: spacing.sm,
                marginBottom: spacing.md,
                color: colors.error,
                fontSize: '14px',
              }}
            >
              {deleteError}
            </div>
          )}

          {fetchError && (
            <div
              style={{
                background: `${colors.error}15`,
                border: `1px solid ${colors.error}`,
                borderRadius: radius.DEFAULT,
                padding: spacing.sm,
                marginBottom: spacing.md,
                color: colors.error,
                fontSize: '14px',
              }}
            >
              {fetchError}
            </div>
          )}

          {loading ? (
            <p style={{ color: colors.onSurfaceVariant, fontSize: '14px' }}>Loading…</p>
          ) : documents.length === 0 ? (
            <p style={{ color: colors.onSurfaceVariant, fontSize: '14px' }}>
              No documents yet. Add one above to get started.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                }}
              >
                <thead>
                  <tr>
                    {['Title', 'Characters', 'Date Added', ''].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderBottom: `1px solid ${colors.outlineVariant}`,
                          color: colors.onSurfaceVariant,
                          fontWeight: 600,
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      style={{
                        borderBottom: `1px solid ${colors.outlineVariant}`,
                      }}
                    >
                      {/* Title */}
                      <td
                        style={{
                          padding: `${spacing.sm} ${spacing.sm}`,
                          color: colors.onSurface,
                          fontWeight: 500,
                          maxWidth: 280,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {doc.title}
                      </td>

                      {/* Character count */}
                      <td
                        style={{
                          padding: `${spacing.sm} ${spacing.sm}`,
                          color: colors.onSurfaceVariant,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {doc.contentLength.toLocaleString()}
                      </td>

                      {/* Date added */}
                      <td
                        style={{
                          padding: `${spacing.sm} ${spacing.sm}`,
                          color: colors.onSurfaceVariant,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {new Date(doc.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Delete */}
                      <td
                        style={{
                          padding: `${spacing.sm} ${spacing.sm}`,
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Button
                          variant="secondary"
                          disabled={deletingId === doc.id}
                          loading={deletingId === doc.id}
                          onClick={() => handleDelete(doc.id)}
                          style={{ fontSize: '13px', padding: `4px ${spacing.sm}` }}
                        >
                          {deletingId === doc.id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
