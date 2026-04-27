'use client';

import { useState, useEffect } from 'react';
import { colors, typography, radius, spacing } from '@/lib/design-tokens';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import Link from 'next/link';

// ─── Icons ────────────────────────────────────────────────────────

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" x2="5" y1="12" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconSpeeches() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h6" />
      <path d="M8 11h4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

function IconTrendingUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
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

// ─── Types ────────────────────────────────────────────────────────

interface ReportData {
  totalSpeeches: number;
  completedSpeeches: number;
  pendingSpeeches: number;
  failedSpeeches: number;
  totalUsers: number;
  activeUsers: number;
  recentActivity: Array<{
    id: string;
    action: string;
    detail: string;
    timestamp: string;
  }>;
}

// ─── Page Component ──────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching report data (replace with real API calls)
    const loadReport = async () => {
      try {
        setIsLoading(true);

        // Fetch speeches
        const speechesRes = await fetch('/api/speeches').catch(() => null);
        let speeches: unknown[] = [];
        if (speechesRes?.ok) {
          const speechesData = await speechesRes.json();
          speeches = speechesData.speeches || [];
        }

        // Fetch users
        const usersRes = await fetch('/api/admin/users').catch(() => null);
        let users: unknown[] = [];
        if (usersRes?.ok) {
          const usersData = await usersRes.json();
          users = usersData.users || [];
        }

        // Fetch questions for activity context
        const questionsRes = await fetch('/api/admin/questions').catch(() => null);
        let questions: unknown[] = [];
        if (questionsRes?.ok) {
          const questionsData = await questionsRes.json();
          questions = questionsData.questions || [];
        }

        // Build report data
        const speechesArr = speeches as Array<{ status?: string; created_at?: string; title?: string }>;
        const usersArr = users as Array<{ created_at?: string; email?: string }>;

        const completed = speechesArr.filter((s) => s.status === 'complete').length;
        const pending = speechesArr.filter((s) =>
          ['pending', 'upserting_contact', 'generating_text', 'generating_audio', 'uploading', 'syncing_ghl'].includes(s.status || '')
        ).length;
        const failed = speechesArr.filter((s) => s.status === 'failed').length;

        // Build recent activity from available data
        const recentActivity: Array<{ id: string; action: string; detail: string; timestamp: string }> = [];

        // Add recent speeches as activity
        speechesArr.slice(0, 5).forEach((s, i) => {
          recentActivity.push({
            id: `speech-${i}`,
            action: s.status === 'complete' ? 'Speech generated' : s.status === 'failed' ? 'Speech failed' : 'Speech queued',
            detail: s.title || 'Untitled',
            timestamp: s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Recently',
          });
        });

        // Add recent users
        usersArr.slice(0, 3).forEach((u, i) => {
          recentActivity.push({
            id: `user-${i}`,
            action: 'User registered',
            detail: (u as { email?: string }).email || 'New user',
            timestamp: (u as { created_at?: string }).created_at ? new Date((u as { created_at?: string }).created_at!).toLocaleDateString() : 'Recently',
          });
        });

        // Fallback activity if no data
        if (recentActivity.length === 0) {
          recentActivity.push(
            { id: 'a1', action: 'System initialized', detail: 'Report generated', timestamp: 'Just now' },
          );
        }

        setData({
          totalSpeeches: speechesArr.length || 0,
          completedSpeeches: completed,
          pendingSpeeches: pending,
          failedSpeeches: failed,
          totalUsers: usersArr.length || 0,
          activeUsers: usersArr.length || 0,
          recentActivity,
        });
      } catch (err) {
        console.error('[AnalyticsPage] Failed to load report:', err);
        // Provide fallback data so the page still renders
        setData({
          totalSpeeches: 0,
          completedSpeeches: 0,
          pendingSpeeches: 0,
          failedSpeeches: 0,
          totalUsers: 0,
          activeUsers: 0,
          recentActivity: [{ id: 'a1', action: 'No data available', detail: 'Connect your data sources', timestamp: 'Now' }],
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, []);

  return (
    <div style={{ padding: `${spacing.xl} ${spacing.lg}`, minHeight: '100vh' }}>
      {/* Header */}
      <header
        className="flex flex-col gap-4 mb-8 md:flex-row md:items-end md:justify-between pt-16 md:pt-0"
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <Link
              href="/admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                color: colors.outline,
                textDecoration: 'none',
                ...typography.uiLabel,
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = colors.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = colors.outline; }}
            >
              <IconArrowLeft /> Dashboard
            </Link>
          </div>
          <h1
            style={{
              ...typography.h1,
              color: colors.onSurface,
              margin: 0,
              marginBottom: spacing.xs,
            }}
          >
            Analytics Report
          </h1>
          <p
            style={{
              ...typography.uiBody,
              color: colors.outline,
              margin: 0,
            }}
          >
            System telemetry, generation metrics, and user activity.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            fontFamily: `var(${typography.uiLabel.fontFamily})`,
            fontSize: typography.uiLabel.fontSize,
            fontWeight: typography.uiLabel.fontWeight,
            letterSpacing: typography.uiLabel.letterSpacing,
            backgroundColor: 'transparent',
            color: colors.secondary,
            border: `1px solid ${colors.outlineVariant}`,
            borderRadius: radius.DEFAULT,
            padding: `${spacing.sm} ${spacing.md}`,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surface.containerHigh; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <IconDownload /> Export
        </button>
      </header>

      {isLoading ? (
        <div
          style={{
            textAlign: 'center',
            padding: spacing.xxl,
            color: colors.onSurfaceVariant,
            ...typography.uiBody,
          }}
        >
          Generating report...
        </div>
      ) : data ? (
        <>
          {/* Stats Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Speeches */}
            <Card cardStyle={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                <span style={{ ...typography.uiLabel, color: colors.outline, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Total Speeches
                </span>
                <span style={{ color: colors.outline }}><IconSpeeches /></span>
              </div>
              <div>
                <div style={{ ...typography.h2, color: colors.primary, margin: 0 }}>
                  {data.totalSpeeches}
                </div>
                <div style={{ ...typography.caption, color: colors.outlineVariant, marginTop: spacing.xs, display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                  <span style={{ color: colors.primary }}><IconTrendingUp /></span>
                  {' '}{data.completedSpeeches} completed
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
                  {data.totalUsers}
                </div>
                <div style={{ ...typography.caption, color: colors.outlineVariant, marginTop: spacing.xs }}>
                  {data.activeUsers} active
                </div>
              </div>
            </Card>

            {/* Success Rate */}
            <Card cardStyle={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                <span style={{ ...typography.uiLabel, color: colors.outline, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Success Rate
                </span>
                <span style={{ color: colors.outline }}><IconClock /></span>
              </div>
              <div>
                <div style={{ ...typography.h2, color: colors.primary, margin: 0 }}>
                  {data.totalSpeeches > 0 ? Math.round((data.completedSpeeches / data.totalSpeeches) * 100) : 0}
                  <span style={{ ...typography.uiBody, color: colors.outline, fontSize: '16px' }}>%</span>
                </div>
                <div style={{ ...typography.caption, color: colors.outlineVariant, marginTop: spacing.xs }}>
                  {data.failedSpeeches} failed, {data.pendingSpeeches} pending
                </div>
              </div>
            </Card>
          </section>

          {/* Status Breakdown */}
          <section className="flex flex-wrap gap-4 mb-8">
            {[
              { label: 'Completed', count: data.completedSpeeches, color: colors.primary },
              { label: 'Pending', count: data.pendingSpeeches, color: colors.secondary },
              { label: 'Failed', count: data.failedSpeeches, color: colors.error },
            ].map((stat) => (
              <div
                key={stat.label}
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
                <span style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: stat.color }} />
                <span style={{ ...typography.uiLabel, color: stat.color, letterSpacing: '0.05em' }}>
                  {stat.label}: {stat.count}
                </span>
              </div>
            ))}
          </section>

          {/* Recent Activity */}
          <section
            style={{
              backgroundColor: colors.surface.container,
              border: `1px solid ${colors.outlineVariant}`,
              borderRadius: radius.lg,
              overflow: 'hidden',
              marginBottom: spacing.xl,
            }}
          >
            <div style={{ padding: spacing.lg, borderBottom: `1px solid ${colors.outlineVariant}` }}>
              <h2 style={{ ...typography.h2, color: colors.onSurface, margin: 0, fontSize: '20px' }}>
                Recent Activity
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {data.recentActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  style={{
                    padding: `${spacing.md} ${spacing.lg}`,
                    borderBottom: index < data.recentActivity.length - 1 ? `1px solid ${colors.surface.containerHighest}` : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surface.containerHigh; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div>
                    <div style={{ ...typography.uiBody, color: colors.onSurface, marginBottom: '2px' }}>
                      {activity.action}
                    </div>
                    <div style={{ ...typography.caption, color: colors.onSurfaceVariant }}>
                      {activity.detail}
                    </div>
                  </div>
                  <div style={{ ...typography.caption, color: colors.outlineVariant, flexShrink: 0 }}>
                    {activity.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Report Footer */}
          <footer
            style={{
              marginTop: spacing.xl,
              paddingTop: spacing.lg,
              borderTop: `1px solid ${colors.surface.containerLow}`,
              textAlign: 'center',
            }}
          >
            <p style={{ ...typography.caption, textTransform: 'uppercase', letterSpacing: '0.3em', color: colors.outlineVariant, margin: 0 }}>
              Report generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </footer>
        </>
      ) : null}
    </div>
  );
}
