'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, ArrowRight } from 'lucide-react';
import { colors, typography, typeScale, spacing, radius } from '@/lib/design-tokens';
import { AppHeader } from '@/components/AppHeader';
import { MobileNav } from '@/components/MobileNav';

// MUST match the key the compose wizard writes drafts under (star-draft-).
// The previous value used underscores instead of hyphens, so the email was
// never recovered and the library always showed empty.
const STORAGE_KEY_PREFIX = 'star-draft-';

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
    case 'complete':
    case 'completed': return 'Ready';
    case 'failed': return 'Failed';
    case 'pending': return 'Queued';
    case 'generating_text': return 'Writing…';
    case 'generating_audio': return 'Recording…';
    case 'uploading': return 'Uploading…';
    case 'syncing_ghl': return 'Delivering…';
    default: return 'Working…';
  }
}

// Gold = ready, blue = working, red = failed.
function chipColor(status: string): string {
  if (status === 'complete' || status === 'completed') return colors.primary;
  if (status === 'failed') return colors.error;
  return colors.secondary;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function findDraftEmail(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft?.contact?.email) return draft.contact.email;
        }
      }
    }
  } catch { /* ignore */ }
  return null;
}

function SpeechCard({ speech, onOpen }: { speech: Speech; onOpen: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const ready = speech.status === 'complete' || speech.status === 'completed';

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!speech.audio_url) return;
    let a = audio;
    if (!a) {
      a = new Audio(speech.audio_url);
      a.onended = () => setPlaying(false);
      setAudio(a);
    }
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().catch(() => setPlaying(false)); setPlaying(true); }
  }, [audio, playing, speech.audio_url]);

  return (
    <div
      onClick={onOpen}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: spacing.lg,
        backgroundColor: colors.surface.container,
        border: `1px solid ${colors.outlineVariant}`,
        borderRadius: radius.xl,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        gap: spacing.md,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = colors.primary)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = colors.outlineVariant)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }}>
        <span style={{ ...typography.caption, color: colors.onSurfaceVariant }}>{formatDate(speech.created_at)}</span>
        <span
          style={{
            ...typeScale.label,
            fontSize: 11,
            letterSpacing: '0.08em',
            color: chipColor(speech.status),
            backgroundColor: `${chipColor(speech.status)}1f`,
            padding: '3px 10px',
            borderRadius: radius.full,
            whiteSpace: 'nowrap',
          }}
        >
          {statusLabel(speech.status)}
        </span>
      </div>

      <p
        style={{
          fontFamily: 'var(--font-newsreader), Georgia, serif',
          fontSize: 17,
          lineHeight: 1.5,
          color: colors.onSurface,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {speech.hook ? speech.hook : 'Your speech'}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginTop: 'auto' }}>
        {ready && speech.audio_url && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'transparent',
              border: `1px solid ${colors.outlineVariant}`,
              color: colors.primary,
              borderRadius: radius.full,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {playing ? <Pause size={14} fill={colors.primary} /> : <Play size={14} fill={colors.primary} />}
            {playing ? 'Pause' : 'Play'}
          </button>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: colors.onSurfaceVariant, fontSize: 12, fontWeight: 600, marginLeft: 'auto' }}>
          Open <ArrowRight size={14} />
        </span>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [speeches, setSpeeches] = useState<Speech[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((addr: string) => {
    setLoading(true);
    setError(null);
    fetch(`/api/speeches/mine?email=${encodeURIComponent(addr)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.speeches) setSpeeches(data.speeches);
        else setError('Could not load speeches.');
      })
      .catch(() => setError('Could not load speeches.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const found = findDraftEmail();
    if (found) {
      setEmail(found);
      load(found);
    } else {
      setLoading(false);
    }
  }, [load]);

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const addr = emailInput.trim().toLowerCase();
    if (!addr) return;
    setEmail(addr);
    load(addr);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.surface.base, color: colors.onBackground, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <AppHeader active="library" />

      <main style={{ maxWidth: 960, margin: '0 auto', padding: `${spacing.xl} ${spacing.lg} 112px` }}>
        <h1 style={{ ...typeScale.section, color: colors.onSurface, margin: `0 0 ${spacing.xs}` }}>Your speeches</h1>
        <p style={{ ...typeScale.ui, color: colors.onSurfaceVariant, margin: `0 0 ${spacing.xl}` }}>
          {email ? `Showing speeches for ${email}` : 'Enter your email to see the speeches you have created.'}
        </p>

        {/* Email identity fallback — never a bare dead-end empty state. */}
        {!email && !loading && (
          <form onSubmit={handleSubmitEmail} style={{ display: 'flex', gap: spacing.sm, maxWidth: 460, marginBottom: spacing.xl, flexWrap: 'wrap' }}>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              style={{
                flex: 1,
                minWidth: 220,
                backgroundColor: colors.surface.containerLow,
                color: colors.onSurface,
                border: `1px solid ${colors.outlineVariant}`,
                borderRadius: radius.md,
                padding: '12px 14px',
                fontSize: 15,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                backgroundColor: colors.primary,
                color: colors.onPrimary,
                border: 'none',
                borderRadius: radius.md,
                padding: '12px 22px',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              Show my speeches
            </button>
          </form>
        )}

        {loading && <p style={{ ...typeScale.ui, color: colors.onSurfaceVariant }}>Loading…</p>}
        {error && <p style={{ ...typeScale.ui, color: colors.error }}>{error}</p>}

        {email && !loading && !error && speeches.length === 0 && (
          <div style={{ padding: spacing.xl, textAlign: 'center', border: `1px solid ${colors.outlineVariant}`, borderRadius: radius.xl }}>
            <p style={{ ...typeScale.ui, color: colors.onSurfaceVariant, marginBottom: spacing.lg }}>
              No speeches found for {email}. Compose your first one now.
            </p>
            <button
              onClick={() => router.push('/compose')}
              style={{ backgroundColor: colors.primary, color: colors.onPrimary, border: 'none', borderRadius: radius.full, cursor: 'pointer', padding: '12px 26px', fontWeight: 700, letterSpacing: '0.04em' }}
            >
              Start composing
            </button>
          </div>
        )}

        {speeches.length > 0 && (
          <div
            className="library-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.lg }}
          >
            {speeches.map((s) => (
              <SpeechCard key={s.id} speech={s} onOpen={() => router.push(`/speech/${s.id}`)} />
            ))}
          </div>
        )}
      </main>

      <MobileNav active="library" />
    </div>
  );
}
