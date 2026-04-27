'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors, typography, spacing, radius, glassmorphism } from '@/lib/design-tokens';

const STORAGE_KEY_PREFIX = 'star_draft_';

interface Speech {
  id: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  transcript: string | null;
  hook: string | null;
  audio_url: string | null;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'complete': return 'Complete';
    case 'failed': return 'Failed';
    case 'pending': return 'Pending';
    case 'generating_text': return 'Writing speech…';
    case 'generating_audio': return 'Creating audio…';
    case 'uploading': return 'Uploading…';
    case 'syncing_ghl': return 'Syncing…';
    default: return 'Processing…';
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'complete': return colors.primary;
    case 'failed': return colors.error;
    default: return colors.secondary;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function LibraryPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [speeches, setSpeeches] = useState<Speech[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Find email from any saved draft in localStorage
    let foundEmail: string | null = null;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const draft = JSON.parse(raw);
            if (draft?.contact?.email) {
              foundEmail = draft.contact.email;
              break;
            }
          }
        }
      }
    } catch { /* ignore */ }

    if (!foundEmail) {
      setLoading(false);
      return;
    }

    setEmail(foundEmail);

    fetch(`/api/speeches/mine?email=${encodeURIComponent(foundEmail)}`)
      .then(res => res.json())
      .then(data => {
        if (data.speeches) setSpeeches(data.speeches);
        else setError('Could not load speeches.');
      })
      .catch(() => setError('Could not load speeches.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.background,
      color: colors.onBackground,
      fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
    }}>
      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 50,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingLeft: spacing.lg, paddingRight: spacing.lg, height: '64px',
        backgroundColor: 'rgba(8, 13, 34, 0.88)',
        backdropFilter: `blur(${glassmorphism.backdropBlur})`,
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
      }}>
        <button
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src="/star-logo.png" alt="Star Speaker AI" style={{ height: '36px' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </button>

        <nav style={{ display: 'flex', gap: spacing.lg }}>
          <button onClick={() => router.push('/compose')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            ...typography.uiLabel, color: colors.onSurfaceVariant,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            ✏ Compose
          </button>
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer',
            ...typography.uiLabel, color: colors.primary,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            borderBottom: `2px solid ${colors.primary}`, paddingBottom: '2px',
          }}>
            📚 Library
          </button>
        </nav>

        <div style={{ width: '36px' }} />
      </header>

      {/* Content */}
      <main style={{ paddingTop: '96px', paddingBottom: spacing.xxl, paddingLeft: spacing.lg, paddingRight: spacing.lg, maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ ...typography.h1, color: colors.onSurface, marginBottom: spacing.xs, fontSize: '32px' }}>
          Your Speeches
        </h1>
        <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant, marginBottom: spacing.xl }}>
          {email ? `Showing speeches for ${email}` : 'Your past speeches will appear here.'}
        </p>

        {loading && (
          <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant }}>Loading…</p>
        )}

        {error && (
          <p style={{ ...typography.uiBody, color: colors.error }}>{error}</p>
        )}

        {!loading && !error && !email && (
          <div style={{
            padding: spacing.xl, textAlign: 'center',
            border: `1px solid ${colors.outlineVariant}`, borderRadius: radius.DEFAULT,
          }}>
            <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant, marginBottom: spacing.lg }}>
              No speeches found. Start by composing your first speech.
            </p>
            <button
              onClick={() => router.push('/compose')}
              style={{
                backgroundColor: colors.primary, color: colors.onPrimary,
                border: 'none', borderRadius: radius.full, cursor: 'pointer',
                padding: `${spacing.sm} ${spacing.xl}`,
                ...typography.uiLabel, letterSpacing: '0.06em',
              }}
            >
              ✏ Start Writing
            </button>
          </div>
        )}

        {!loading && !error && email && speeches.length === 0 && (
          <div style={{
            padding: spacing.xl, textAlign: 'center',
            border: `1px solid ${colors.outlineVariant}`, borderRadius: radius.DEFAULT,
          }}>
            <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant, marginBottom: spacing.lg }}>
              No speeches yet. Compose your first one now.
            </p>
            <button
              onClick={() => router.push('/compose')}
              style={{
                backgroundColor: colors.primary, color: colors.onPrimary,
                border: 'none', borderRadius: radius.full, cursor: 'pointer',
                padding: `${spacing.sm} ${spacing.xl}`,
                ...typography.uiLabel, letterSpacing: '0.06em',
              }}
            >
              ✏ Start Writing
            </button>
          </div>
        )}

        {speeches.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {speeches.map(speech => (
              <div
                key={speech.id}
                onClick={() => router.push(`/speech/${speech.id}`)}
                style={{
                  padding: spacing.lg,
                  backgroundColor: colors.surface.container,
                  border: `1px solid ${colors.outlineVariant}`,
                  borderRadius: radius.DEFAULT,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = colors.primary)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = colors.outlineVariant)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
                  <div>
                    <p style={{ ...typography.uiLabel, color: colors.onSurface, margin: 0, marginBottom: '4px' }}>
                      {formatDate(speech.created_at)}
                    </p>
                    {speech.hook && (
                      <p style={{ ...typography.uiBody, color: colors.onSurfaceVariant, margin: 0, fontSize: '14px', maxWidth: '520px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {speech.hook.slice(0, 100)}{speech.hook.length > 100 ? '…' : ''}
                      </p>
                    )}
                  </div>
                  <span style={{
                    ...typography.caption,
                    color: statusColor(speech.status),
                    backgroundColor: `${statusColor(speech.status)}18`,
                    padding: `2px ${spacing.sm}`,
                    borderRadius: radius.full,
                    whiteSpace: 'nowrap',
                    marginLeft: spacing.md,
                  }}>
                    {statusLabel(speech.status)}
                  </span>
                </div>

                {speech.status === 'complete' && (
                  <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.sm }}>
                    <span style={{ ...typography.caption, color: colors.primary }}>
                      View speech →
                    </span>
                    {speech.audio_url && (
                      <span style={{ ...typography.caption, color: colors.onSurfaceVariant }}>
                        · Audio ready
                      </span>
                    )}
                  </div>
                )}

                {speech.status === 'failed' && (
                  <p style={{ ...typography.caption, color: colors.error, margin: `${spacing.sm} 0 0 0` }}>
                    Generation failed — click to retry
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
