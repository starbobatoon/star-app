'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { colors, typography, radius, spacing } from '@/lib/design-tokens';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';

// ─── Types ────────────────────────────────────────────────────────

type SpeechStatus = string;

interface RecentSpeech {
  id: string;
  title: string;
  status: string;
  voiceProfile: string;
  duration: string;
  createdAt: string;
}

interface DashboardData {
  totalSpeeches: number;
  completedSpeeches: number;
  pendingSpeeches: number;
  failedSpeeches: number;
  avgDurationSeconds: number | null;
  avgRating: number | null;
  ratedSpeechesCount: number;
  openRouterConfigured: boolean;
  ghlConfigured: boolean;
  recentSpeeches: RecentSpeech[];
}

// ─── Status helpers ───────────────────────────────────────────────

function statusTagVariant(status: string): 'success' | 'default' | 'secondary' | 'error' {
  switch (status) {
    case 'complete':
      return 'success';
    case 'failed':
      return 'error';
    case 'pending':
      return 'secondary';
    default:
      return 'default';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'failed':
      return 'Failed';
    case 'pending':
      return 'Pending';
    case 'generating_text':
      return 'Generating';
    case 'generating_audio':
      return 'Audio';
    case 'uploading':
      return 'Uploading';
    case 'syncing_ghl':
      return 'Syncing';
    case 'upserting_contact':
      return 'Contact';
    default:
      return 'Processing';
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'complete':
      return colors.primary;
    case 'failed':
      return colors.error;
    case 'pending':
      return colors.secondary;
    default:
      return colors.outlineVariant;
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}.${Math.round(secs / 6)} min`;
}

function formatCreatedAt(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Icons (inline SVG) ───────────────────────────────────────────

function IconAutoStories() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h6" />
      <path d="M8 11h4" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function IconTrendingUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconStar({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? colors.secondary : 'none'}
      stroke={filled ? colors.secondary : colors.outlineVariant}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function StarRating({ rating, max }: { rating: number; max: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {Array.from({ length: max }, (_, i) => (
        <IconStar key={i} filled={i < Math.round(rating)} />
      ))}
    </div>
  );
}

// ─── Page Component ──────────────────────────────────────────────

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/dashboard-stats');
      if (!res.ok) {
        throw new Error(`Failed to fetch stats: ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('[Dashboard] Failed to fetch stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const showSetupCards = data && (!data.openRouterConfigured || !data.ghlConfigured);

  return (
    <div style={{ padding: `${spacing.xl} ${spacing.lg}`, minHeight: '100vh' }} className="pb-28 md:pb-xl">

        {/* ── Page Header ── */}
        <header
          className="flex flex-col gap-4 mb-8 md:flex-row md:items-end md:justify-between pt-16 md:pt-0"
        >
          <div>
            <h1
              style={{
                ...typography.h1,
                color: colors.onSurface,
                margin: 0,
                marginBottom: spacing.xs,
              }}
            >
              Overview
            </h1>
            <p
              style={{
                ...typography.uiBody,
                color: colors.outline,
                margin: 0,
              }}
            >
              System telemetry and generation metrics.
            </p>
          </div>
          <Link href="/admin/analytics" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Generate Report</Button>
          </Link>
        </header>

        {/* ── Loading State ── */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: spacing.xxl, color: colors.onSurfaceVariant, ...typography.uiBody }}>
            Loading dashboard...
          </div>
        )}

        {/* ── Error State ── */}
        {error && (
          <Card cardStyle={{ borderColor: colors.error, border: `1px solid ${colors.error}`, marginBottom: spacing.lg, padding: spacing.lg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.error }}>
              <IconAlert />
              <span>{error}</span>
              <Button variant="secondary" onClick={fetchStats} style={{ marginLeft: spacing.md }}>Retry</Button>
            </div>
          </Card>
        )}

        {data && (
          <>
            {/* ── First-Run Setup Cards ── */}
            {showSetupCards && (
              <section
                className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
              >
                {!data.openRouterConfigured && (
                  <Card
                    hoverable
                    cardStyle={{
                      cursor: 'pointer',
                      borderColor: colors.secondary,
                      border: `1px solid ${colors.secondary}`,
                      minHeight: 'auto',
                    }}
                  >
                    <a
                      href="/admin/openrouter"
                      style={{
                        textDecoration: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: spacing.md,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.sm,
                          color: colors.secondary,
                        }}
                      >
                        <IconAlert />
                        <span
                          style={{
                            ...typography.uiLabel,
                            color: colors.secondary,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                          }}
                        >
                          Setup Required
                        </span>
                      </div>
                      <div>
                        <h3
                          style={{
                            ...typography.h2,
                            color: colors.onSurface,
                            margin: 0,
                            marginBottom: spacing.xs,
                            fontSize: '20px',
                          }}
                        >
                          Connect OpenRouter
                        </h3>
                        <p
                          style={{
                            ...typography.uiBody,
                            color: colors.onSurfaceVariant,
                            margin: 0,
                            fontSize: '14px',
                          }}
                        >
                          Configure your OpenRouter API key to enable AI-powered speech generation. Required before generating any speeches.
                        </p>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.xs,
                          color: colors.secondary,
                          ...typography.uiLabel,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Complete Setup <IconArrow />
                      </div>
                    </a>
                  </Card>
                )}

                {!data.ghlConfigured && (
                  <Card
                    hoverable
                    cardStyle={{
                      cursor: 'pointer',
                      borderColor: colors.secondary,
                      border: `1px solid ${colors.secondary}`,
                      minHeight: 'auto',
                    }}
                  >
                    <a
                      href="/admin/ghl-integration"
                      style={{
                        textDecoration: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: spacing.md,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.sm,
                          color: colors.secondary,
                        }}
                      >
                        <IconAlert />
                        <span
                          style={{
                            ...typography.uiLabel,
                            color: colors.secondary,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                          }}
                        >
                          Setup Required
                        </span>
                      </div>
                      <div>
                        <h3
                          style={{
                            ...typography.h2,
                            color: colors.onSurface,
                            margin: 0,
                            marginBottom: spacing.xs,
                            fontSize: '20px',
                          }}
                        >
                          Connect GHL
                        </h3>
                        <p
                          style={{
                            ...typography.uiBody,
                            color: colors.onSurfaceVariant,
                            margin: 0,
                            fontSize: '14px',
                          }}
                        >
                          Link your GoHighLevel account to sync contacts, triggers, and delivery pipelines. Required for automated speech distribution.
                        </p>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.xs,
                          color: colors.secondary,
                          ...typography.uiLabel,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Complete Setup <IconArrow />
                      </div>
                    </a>
                  </Card>
                )}
              </section>
            )}

            {/* ── Stats Grid ── */}
            <section
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
            >
              {/* Stat: Total Speeches */}
              <Card cardStyle={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                  <span
                    style={{
                      ...typography.uiLabel,
                      color: colors.outline,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Speeches Generated
                  </span>
                  <span style={{ color: colors.outline }}><IconAutoStories /></span>
                </div>
                <div>
                  <div
                    style={{
                      ...typography.h2,
                      color: colors.primary,
                      margin: 0,
                    }}
                  >
                    {data.totalSpeeches}
                  </div>
                  <div
                    style={{
                      ...typography.caption,
                      color: colors.outlineVariant,
                      marginTop: spacing.xs,
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.xs,
                    }}
                  >
                    {data.completedSpeeches > 0 && (
                      <><span style={{ color: colors.primary }}><IconTrendingUp /></span>{' '}{data.completedSpeeches} completed</>
                    )}
                    {data.completedSpeeches === 0 && <span>No completions yet</span>}
                  </div>
                </div>
              </Card>

              {/* Stat: Avg Speech Length */}
              <Card cardStyle={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                  <span
                    style={{
                      ...typography.uiLabel,
                      color: colors.outline,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Avg Speech Length
                  </span>
                  <span style={{ color: colors.outline }}><IconClock /></span>
                </div>
                <div>
                  <div
                    style={{
                      ...typography.h2,
                      color: colors.primary,
                      margin: 0,
                    }}
                  >
                    {data.avgDurationSeconds != null ? (
                      <>
                        {formatDuration(data.avgDurationSeconds)}
                      </>
                    ) : (
                      <span style={{ ...typography.uiBody, color: colors.outlineVariant, fontSize: '18px' }}>
                        No data yet
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      ...typography.caption,
                      color: colors.outlineVariant,
                      marginTop: spacing.xs,
                    }}
                  >
                    {data.avgDurationSeconds != null ? 'Based on completed speeches' : 'Complete a speech to see stats'}
                  </div>
                </div>
              </Card>

              {/* Stat: Average Rating (1-4 stars) */}
              <Card cardStyle={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                  <span
                    style={{
                      ...typography.uiLabel,
                      color: colors.outline,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Avg Rating
                  </span>
                  <span style={{ color: colors.outline }}><IconSettings /></span>
                </div>
                <div>
                  {data.avgRating != null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                      <div
                        style={{
                          ...typography.h2,
                          color: colors.primary,
                          margin: 0,
                        }}
                      >
                        {data.avgRating}
                      </div>
                      <StarRating rating={data.avgRating} max={4} />
                    </div>
                  ) : (
                    <div style={{ ...typography.uiBody, color: colors.outlineVariant, fontSize: '18px' }}>
                      No ratings yet
                    </div>
                  )}
                  <div
                    style={{
                      ...typography.caption,
                      color: colors.outlineVariant,
                      marginTop: spacing.xs,
                    }}
                  >
                    {data.avgRating != null
                      ? `Based on ${data.ratedSpeechesCount} rated speech${data.ratedSpeechesCount === 1 ? '' : 'es'}`
                      : '1-4 star scale'}
                  </div>
                </div>
              </Card>
            </section>

            {/* ── Quick Stats Bar ── */}
            <section
              className="flex flex-wrap gap-4 mb-8"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: colors.surface.container,
                  borderRadius: radius.DEFAULT,
                  border: `1px solid ${colors.outlineVariant}`,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: radius.full,
                    backgroundColor: colors.primary,
                  }}
                />
                <span style={{ ...typography.uiLabel, color: colors.primary, letterSpacing: '0.05em' }}>
                  Completed: {data.completedSpeeches}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: colors.surface.container,
                  borderRadius: radius.DEFAULT,
                  border: `1px solid ${colors.outlineVariant}`,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: radius.full,
                    backgroundColor: colors.secondary,
                  }}
                />
                <span style={{ ...typography.uiLabel, color: colors.secondary, letterSpacing: '0.05em' }}>
                  Pending: {data.pendingSpeeches}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: colors.surface.container,
                  borderRadius: radius.DEFAULT,
                  border: `1px solid ${colors.outlineVariant}`,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: radius.full,
                    backgroundColor: colors.error,
                  }}
                />
                <span style={{ ...typography.uiLabel, color: colors.error, letterSpacing: '0.05em' }}>
                  Failed: {data.failedSpeeches}
                </span>
              </div>
            </section>

            {/* ── Recent Output Streams Table ── */}
            <section
              style={{
                backgroundColor: colors.surface.container,
                border: `1px solid ${colors.outlineVariant}`,
                borderRadius: radius.lg,
                overflow: 'hidden',
                marginBottom: spacing.xl,
              }}
            >
              <div
                style={{
                  padding: spacing.lg,
                  borderBottom: `1px solid ${colors.outlineVariant}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h2
                  style={{
                    ...typography.h2,
                    color: colors.onSurface,
                    margin: 0,
                    fontSize: '20px',
                  }}
                >
                  Recent Output Streams
                </h2>
                <Link
                  href="/admin/analytics"
                  style={{
                    ...typography.uiLabel,
                    color: colors.primary,
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    transition: 'color 0.2s ease',
                  }}
                >
                  View All
                </Link>
              </div>

              <div style={{ overflowX: 'auto' }}>
                {data.recentSpeeches.length === 0 ? (
                  <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.outlineVariant, ...typography.uiBody }}>
                    No speeches generated yet. Create your first speech to see it here.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.surface.containerHighest}` }}>
                        <th
                          style={{
                            ...typography.uiLabel,
                            color: colors.outline,
                            fontWeight: 400,
                            textTransform: 'uppercase',
                            padding: `${spacing.md} ${spacing.lg}`,
                          }}
                        >
                          Status
                        </th>
                        <th
                          style={{
                            ...typography.uiLabel,
                            color: colors.outline,
                            fontWeight: 400,
                            textTransform: 'uppercase',
                            padding: spacing.md,
                          }}
                        >
                          Contact
                        </th>
                        <th
                          style={{
                            ...typography.uiLabel,
                            color: colors.outline,
                            fontWeight: 400,
                            textTransform: 'uppercase',
                            padding: spacing.md,
                          }}
                        >
                          Voice Profile
                        </th>
                        <th
                          style={{
                            ...typography.uiLabel,
                            color: colors.outline,
                            fontWeight: 400,
                            textTransform: 'uppercase',
                            padding: spacing.md,
                          }}
                        >
                          Duration
                        </th>
                        <th
                          style={{
                            ...typography.uiLabel,
                            color: colors.outline,
                            fontWeight: 400,
                            textTransform: 'uppercase',
                            padding: spacing.md,
                          }}
                        >
                          Created
                        </th>
                        <th
                          style={{
                            ...typography.uiLabel,
                            color: colors.outline,
                            fontWeight: 400,
                            textTransform: 'uppercase',
                            padding: spacing.md,
                            textAlign: 'right',
                            paddingRight: spacing.lg,
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentSpeeches.map((speech) => (
                        <tr
                          key={speech.id}
                          style={{
                            borderBottom: `1px solid ${colors.surface.containerHighest}`,
                            transition: 'background-color 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.surface.containerHigh;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td style={{ padding: `${spacing.md} ${spacing.lg}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: radius.full,
                                  backgroundColor: statusColor(speech.status),
                                }}
                              />
                              <Tag variant={statusTagVariant(speech.status)}>
                                {statusLabel(speech.status)}
                              </Tag>
                            </div>
                          </td>
                          <td style={{ padding: spacing.md, ...typography.uiBody, color: colors.onSurface }}>
                            {speech.title}
                          </td>
                          <td style={{ padding: spacing.md, ...typography.uiBody, color: colors.onSurfaceVariant }}>
                            {speech.voiceProfile}
                          </td>
                          <td
                            style={{
                              padding: spacing.md,
                              ...typography.uiBody,
                              color: colors.onSurfaceVariant,
                              opacity: speech.duration === '--:--' ? 0.5 : 1,
                            }}
                          >
                            {speech.duration}
                          </td>
                          <td style={{ padding: spacing.md, ...typography.uiBody, color: colors.onSurfaceVariant }}>
                            {formatCreatedAt(speech.createdAt)}
                          </td>
                          <td style={{ padding: spacing.md, paddingRight: spacing.lg, textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm }}>
                              {speech.status === 'failed' && (
                                <button
                                  title="Regenerate"
                                  onClick={async () => {
                                    try {
                                      await fetch(`/api/speeches/${speech.id}/regenerate`, { method: 'POST' });
                                      fetchStats();
                                    } catch { /* ignore */ }
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: colors.outline,
                                    padding: spacing.xs,
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'color 0.2s ease',
                                    borderRadius: radius.DEFAULT,
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = colors.secondary; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = colors.outline; }}
                                >
                                  <IconRefresh />
                                </button>
                              )}
                              {speech.status === 'complete' && (
                                <>
                                  <button
                                    title="Listen"
                                    onClick={() => {
                                      window.open(`/api/speeches/${speech.id}/audio`, '_blank');
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: colors.outline,
                                      padding: spacing.xs,
                                      display: 'flex',
                                      alignItems: 'center',
                                      transition: 'color 0.2s ease',
                                      borderRadius: radius.DEFAULT,
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = colors.primary; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = colors.outline; }}
                                  >
                                    <IconPlay />
                                  </button>
                                  <button
                                    title="Download"
                                    onClick={async () => {
                                      const a = document.createElement('a');
                                      a.href = `/api/speeches/${speech.id}/audio`;
                                      a.download = `speech-${speech.id}.mp3`;
                                      a.click();
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: colors.outline,
                                      padding: spacing.xs,
                                      display: 'flex',
                                      alignItems: 'center',
                                      transition: 'color 0.2s ease',
                                      borderRadius: radius.DEFAULT,
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = colors.primary; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = colors.outline; }}
                                  >
                                    <IconDownload />
                                  </button>
                                </>
                              )}
                              {!['complete', 'failed'].includes(speech.status) && (
                                <span
                                  style={{
                                    ...typography.caption,
                                    color: colors.outlineVariant,
                                    fontStyle: 'italic',
                                  }}
                                >
                                  In progress...
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}

        {/* ── Footer ── */}
        <footer
          style={{
            marginTop: spacing.xl,
            paddingTop: spacing.xxl,
            borderTop: `1px solid ${colors.surface.containerLow}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: spacing.md,
              ...typography.caption,
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              color: colors.outlineVariant,
            }}
          >
            <a
              href="#"
              style={{
                color: colors.outlineVariant,
                textDecoration: 'none',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = colors.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = colors.outlineVariant; }}
            >
              Privacy
            </a>
            <a
              href="#"
              style={{
                color: colors.outlineVariant,
                textDecoration: 'none',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = colors.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = colors.outlineVariant; }}
            >
              Terms
            </a>
            <a
              href="#"
              style={{
                color: colors.outlineVariant,
                textDecoration: 'none',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = colors.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = colors.outlineVariant; }}
            >
              Methodology
            </a>
          </div>
          <p
            style={{
              ...typography.caption,
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              color: colors.outlineVariant,
              margin: 0,
            }}
          >
            &copy; {new Date().getFullYear()} STAR SPEAKER AI. ALL RIGHTS RESERVED.
          </p>
        </footer>
    </div>
  );
}
