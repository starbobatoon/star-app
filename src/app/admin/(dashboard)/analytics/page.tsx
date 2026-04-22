'use client';

import { useState, useEffect } from 'react';
import { colors, typography, radius, spacing } from '@/lib/design-tokens';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';

interface Speech {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  created_at: string;
}

interface AnalyticsData {
  totalSpeeches: number;
  totalUsers: number;
  recentSpeeches: Speech[];
}

// ─── Icons ────────────────────────────────────────────────────────

function IconSpeech() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function statusTagVariant(status: string): 'success' | 'default' | 'secondary' | 'error' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'processing':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return 'Complete';
    case 'processing':
      return 'Processing';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

function statusDotColor(status: string): string {
  switch (status) {
    case 'completed':
      return colors.primary;
    case 'processing':
      return colors.outlineVariant;
    case 'pending':
      return colors.secondary;
    case 'failed':
      return colors.error;
    default:
      return colors.outline;
  }
}

// ─── Page Component ───────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);

        // Fetch speeches count and recent 5
        const speechesRes = await fetch('/api/speeches?limit=5&offset=0');
        if (!speechesRes.ok) throw new Error('Failed to fetch speeches');
        const speechesData = await speechesRes.json();

        // Fetch users
        const usersRes = await fetch('/api/admin/users');
        if (!usersRes.ok) throw new Error('Failed to fetch users');
        const usersData = await usersRes.json();

        setData({
          totalSpeeches: speechesData.count || 0,
          totalUsers: Array.isArray(usersData) ? usersData.length : 0,
          recentSpeeches: speechesData.speeches || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: spacing.xl, maxWidth: '1200px', margin: '0 auto' }}>
        <Card cardStyle={{ padding: spacing.xl, textAlign: 'center' }}>
          <p style={{ color: colors.onSurfaceVariant, margin: 0 }}>Loading analytics...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: spacing.xl, maxWidth: '1200px', margin: '0 auto' }}>
        <Card cardStyle={{ padding: spacing.xl, textAlign: 'center', backgroundColor: `${colors.errorContainer}CC` }}>
          <p style={{ color: colors.onErrorContainer, margin: 0 }}>{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: spacing.xl, maxWidth: '1200px', margin: '0 auto' }} className="pb-28 md:pb-xl">
      {/* Page Header */}
      <header style={{ marginBottom: spacing.xl }}>
        <h1 style={{ ...typography.h1, color: colors.onSurface, margin: 0, marginBottom: spacing.xs }}>
          Analytics
        </h1>
        <p style={{ ...typography.uiBody, color: colors.outline, margin: 0 }}>
          Key metrics and recent activity for Elocutionist.
        </p>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Speeches */}
        <Card cardStyle={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
            <span style={{ ...typography.uiLabel, color: colors.outline, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Total Speeches
            </span>
            <span style={{ color: colors.outline }}><IconSpeech /></span>
          </div>
          <div>
            <div style={{ ...typography.h2, color: colors.primary, margin: 0 }}>
              {data?.totalSpeeches ?? 0}
            </div>
            <div style={{ ...typography.caption, color: colors.outlineVariant, marginTop: spacing.xs }}>
              All-time speeches generated
            </div>
          </div>
        </Card>

        {/* Total Users */}
        <Card cardStyle={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
            <span style={{ ...typography.uiLabel, color: colors.outline, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Total Users
            </span>
            <span style={{ color: colors.outline }}><IconUsers /></span>
          </div>
          <div>
            <div style={{ ...typography.h2, color: colors.primary, margin: 0 }}>
              {data?.totalUsers ?? 0}
            </div>
            <div style={{ ...typography.caption, color: colors.outlineVariant, marginTop: spacing.xs }}>
              Registered Elocutionist users
            </div>
          </div>
        </Card>

        {/* Recent Activity Count */}
        <Card cardStyle={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
            <span style={{ ...typography.uiLabel, color: colors.outline, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Recent Activity
            </span>
            <span style={{ color: colors.outline }}><IconClock /></span>
          </div>
          <div>
            <div style={{ ...typography.h2, color: colors.primary, margin: 0 }}>
              {data?.recentSpeeches.length ?? 0}
            </div>
            <div style={{ ...typography.caption, color: colors.outlineVariant, marginTop: spacing.xs }}>
              Latest speeches on record
            </div>
          </div>
        </Card>
      </section>

      {/* Recent Speeches Table */}
      <section
        style={{
          backgroundColor: colors.surface.container,
          border: `1px solid ${colors.outlineVariant}`,
          borderRadius: radius.lg,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: spacing.lg,
            borderBottom: `1px solid ${colors.outlineVariant}`,
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
            Recent Speeches
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.surface.containerHighest}` }}>
                <th style={{ ...typography.uiLabel, color: colors.outline, fontWeight: 400, textTransform: 'uppercase', padding: `${spacing.md} ${spacing.lg}` }}>
                  Status
                </th>
                <th style={{ ...typography.uiLabel, color: colors.outline, fontWeight: 400, textTransform: 'uppercase', padding: spacing.md }}>
                  Contact
                </th>
                <th style={{ ...typography.uiLabel, color: colors.outline, fontWeight: 400, textTransform: 'uppercase', padding: spacing.md }}>
                  Email
                </th>
                <th style={{ ...typography.uiLabel, color: colors.outline, fontWeight: 400, textTransform: 'uppercase', padding: spacing.md }}>
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.recentSpeeches.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: spacing.xl, textAlign: 'center', ...typography.uiBody, color: colors.outline }}>
                    No speeches found.
                  </td>
                </tr>
              ) : (
                data?.recentSpeeches.map((speech) => (
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
                            backgroundColor: statusDotColor(speech.status),
                          }}
                        />
                        <Tag variant={statusTagVariant(speech.status)}>
                          {statusLabel(speech.status)}
                        </Tag>
                      </div>
                    </td>
                    <td style={{ padding: spacing.md, ...typography.uiBody, color: colors.onSurface }}>
                      {speech.first_name} {speech.last_name}
                    </td>
                    <td style={{ padding: spacing.md, ...typography.uiBody, color: colors.onSurfaceVariant }}>
                      {speech.email}
                    </td>
                    <td style={{ padding: spacing.md, ...typography.uiBody, color: colors.onSurfaceVariant }}>
                      {new Date(speech.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
