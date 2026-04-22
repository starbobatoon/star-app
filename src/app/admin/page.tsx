'use client';

import { useState } from 'react';
import { colors, typography, radius, spacing } from '@/lib/design-tokens';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';

// ─── Mock Data ────────────────────────────────────────────────────

type SpeechStatus = 'completed' | 'pending' | 'failed' | 'processing';

interface Speech {
  id: string;
  title: string;
  voiceProfile: string;
  status: SpeechStatus;
  duration: string;
  createdAt: string;
}

interface Activity {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
}

const mockSpeeches: Speech[] = [
  {
    id: '1',
    title: 'Q3 Earnings Narrative',
    voiceProfile: 'Executive - Male 02',
    status: 'completed',
    duration: '24:12',
    createdAt: 'Apr 21, 2026',
  },
  {
    id: '2',
    title: 'Keynote: Annual Summit',
    voiceProfile: 'Authoritative - Female 01',
    status: 'completed',
    duration: '45:00',
    createdAt: 'Apr 20, 2026',
  },
  {
    id: '3',
    title: 'Internal Town Hall Draft',
    voiceProfile: 'Conversational - Male 01',
    status: 'processing',
    duration: '--:--',
    createdAt: 'Apr 21, 2026',
  },
  {
    id: '4',
    title: 'Client Onboarding Welcome',
    voiceProfile: 'Warm - Female 03',
    status: 'pending',
    duration: '--:--',
    createdAt: 'Apr 21, 2026',
  },
  {
    id: '5',
    title: 'Product Launch Announcement',
    voiceProfile: 'Energetic - Male 01',
    status: 'failed',
    duration: '--:--',
    createdAt: 'Apr 19, 2026',
  },
  {
    id: '6',
    title: 'Board Strategy Update',
    voiceProfile: 'Executive - Female 02',
    status: 'completed',
    duration: '18:34',
    createdAt: 'Apr 18, 2026',
  },
];

const mockActivity: Activity[] = [
  {
    id: 'a1',
    action: 'Speech generated',
    detail: 'Q3 Earnings Narrative',
    timestamp: '2 min ago',
  },
  {
    id: 'a2',
    action: 'Voice profile updated',
    detail: 'Executive - Male 02',
    timestamp: '15 min ago',
  },
  {
    id: 'a3',
    action: 'Speech failed',
    detail: 'Product Launch Announcement',
    timestamp: '1 hour ago',
  },
  {
    id: 'a4',
    action: 'New speech queued',
    detail: 'Client Onboarding Welcome',
    timestamp: '2 hours ago',
  },
  {
    id: 'a5',
    action: 'Speech generated',
    detail: 'Keynote: Annual Summit',
    timestamp: 'Yesterday',
  },
];

// ─── Status helpers ───────────────────────────────────────────────

function statusDotColor(status: SpeechStatus): string {
  switch (status) {
    case 'completed':
      return colors.primary;
    case 'processing':
      return colors.outlineVariant;
    case 'pending':
      return colors.secondary;
    case 'failed':
      return colors.error;
  }
}

function statusTagVariant(status: SpeechStatus): 'success' | 'default' | 'secondary' | 'error' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'processing':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'failed':
      return 'error';
  }
}

function statusLabel(status: SpeechStatus): string {
  switch (status) {
    case 'completed':
      return 'Complete';
    case 'processing':
      return 'Processing';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
  }
}

// ─── Icons (inline SVG to avoid external deps) ────────────────────

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

function IconVoice() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
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

// ─── Page Component ──────────────────────────────────────────────

export default function AdminDashboard() {
  // First-run state: these would come from API/config in Wave 3
  // For now, toggle these to test the first-run setup cards
  const [openRouterConfigured] = useState(false);
  const [ghlConfigured] = useState(false);

  const showSetupCards = !openRouterConfigured || !ghlConfigured;

  // Compute stats from mock data
  const totalSpeeches = mockSpeeches.length;
  const completedSpeeches = mockSpeeches.filter((s) => s.status === 'completed').length;
  const pendingSpeeches = mockSpeeches.filter((s) => s.status === 'pending' || s.status === 'processing').length;
  const failedSpeeches = mockSpeeches.filter((s) => s.status === 'failed').length;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.surface.containerLowest,
        fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
      }}
    >
      {/* ── Desktop Sidebar ── */}
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: '288px',
          backgroundColor: colors.surface.containerLow,
          borderRight: `1px solid ${colors.outlineVariant}`,
          padding: spacing.lg,
          flexDirection: 'column',
          zIndex: 40,
        }}
        className="hidden md:flex"
      >
        {/* Brand */}
        <div style={{ marginBottom: spacing.xl }}>
          <div
            style={{
              ...typography.h2,
              color: colors.primary,
              fontSize: '20px',
              letterSpacing: '0.15em',
              marginBottom: spacing.lg,
            }}
          >
            ELOCUTIONIST
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.full,
                backgroundColor: colors.surface.containerHighest,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  ...typography.uiLabel,
                  color: colors.onSurface,
                }}
              >
                Admin Console
              </div>
              <div
                style={{
                  ...typography.caption,
                  color: colors.outline,
                }}
              >
                Elocutionist v1.0
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          {/* Dashboard - Active */}
          <a
            href="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.surface.containerHigh,
              color: colors.primary,
              borderLeft: `2px solid ${colors.primary}`,
              textDecoration: 'none',
              ...typography.uiLabel,
              letterSpacing: '0.1em',
            }}
          >
            <IconAutoStories />
            DASHBOARD
          </a>

          {/* Model Settings */}
          <a
            href="/admin/openrouter"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: `${spacing.sm} ${spacing.md}`,
              color: colors.outline,
              borderLeft: '2px solid transparent',
              textDecoration: 'none',
              ...typography.uiLabel,
              letterSpacing: '0.1em',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surface.containerHigh;
              e.currentTarget.style.color = colors.onSurface;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = colors.outline;
            }}
          >
            <IconSettings />
            MODEL SETTINGS
          </a>

          {/* Voice Config */}
          <a
            href="#"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: `${spacing.sm} ${spacing.md}`,
              color: colors.outline,
              borderLeft: '2px solid transparent',
              textDecoration: 'none',
              ...typography.uiLabel,
              letterSpacing: '0.1em',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surface.containerHigh;
              e.currentTarget.style.color = colors.onSurface;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = colors.outline;
            }}
          >
            <IconVoice />
            VOICE CONFIG
          </a>

          {/* Analytics */}
          <a
            href="#"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: `${spacing.sm} ${spacing.md}`,
              color: colors.outline,
              borderLeft: '2px solid transparent',
              textDecoration: 'none',
              ...typography.uiLabel,
              letterSpacing: '0.1em',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surface.containerHigh;
              e.currentTarget.style.color = colors.onSurface;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = colors.outline;
            }}
          >
            <IconClock />
            ANALYTICS
          </a>
        </nav>

        {/* Sign Out */}
        <div style={{ marginTop: 'auto' }}>
          <a
            href="/admin/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: `${spacing.sm} ${spacing.md}`,
              color: colors.outline,
              borderLeft: '2px solid transparent',
              textDecoration: 'none',
              ...typography.uiLabel,
              letterSpacing: '0.1em',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surface.containerHigh;
              e.currentTarget.style.color = colors.onSurface;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = colors.outline;
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            SIGN OUT
          </a>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main
        style={{
          padding: `${spacing.xl} ${spacing.lg}`,
          minHeight: '100vh',
        }}
        className="md:ml-72 pb-28 md:pb-xl"
      >
        {/* ── Mobile Header ── */}
        <header
          className="md:hidden"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `0 ${spacing.lg}`,
            height: 64,
            backgroundColor: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${colors.outlineVariant}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <span
              style={{
                ...typography.h2,
                color: colors.primary,
                fontSize: '18px',
                letterSpacing: '0.2em',
              }}
            >
              ELOCUTIONIST
            </span>
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.full,
              backgroundColor: colors.surface.containerHigh,
            }}
          />
        </header>

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
          <Button variant="primary">Generate Report</Button>
        </header>

        {/* ── First-Run Setup Cards ── */}
        {showSetupCards && (
          <section
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          >
            {!openRouterConfigured && (
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

            {!ghlConfigured && (
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
                {totalSpeeches}
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
                <span style={{ color: colors.primary }}><IconTrendingUp /></span>
                {' '}+12% this month
              </div>
            </div>
          </Card>

          {/* Stat: Active Voice IDs */}
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
                Active Voice IDs
              </span>
              <span style={{ color: colors.outline }}><IconVoice /></span>
            </div>
            <div>
              <div
                style={{
                  ...typography.h2,
                  color: colors.primary,
                  margin: 0,
                }}
              >
                84
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
                <span style={{ color: colors.primary }}><IconCheck /></span>
                {' '}All systems nominal
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
                18.4{' '}
                <span
                  style={{
                    ...typography.uiBody,
                    color: colors.outline,
                    fontSize: '16px',
                  }}
                >
                  min
                </span>
              </div>
              <div
                style={{
                  ...typography.caption,
                  color: colors.outlineVariant,
                  marginTop: spacing.xs,
                }}
              >
                Target: 15-20 min
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
              Completed: {completedSpeeches}
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
              Pending: {pendingSpeeches}
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
              Failed: {failedSpeeches}
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
            <a
              href="#"
              style={{
                ...typography.uiLabel,
                color: colors.primary,
                textDecoration: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.primaryFixed;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.primary;
              }}
            >
              View All
            </a>
          </div>

          <div style={{ overflowX: 'auto' }}>
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
                    Document Ref
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
                      textAlign: 'right',
                      paddingRight: spacing.lg,
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockSpeeches.map((speech) => (
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
                    {/* Status */}
                    <td
                      style={{
                        padding: `${spacing.md} ${spacing.lg}`,
                      }}
                    >
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

                    {/* Document Ref */}
                    <td
                      style={{
                        padding: spacing.md,
                        ...typography.uiBody,
                        color: colors.onSurface,
                      }}
                    >
                      {speech.title}
                    </td>

                    {/* Voice Profile */}
                    <td
                      style={{
                        padding: spacing.md,
                        ...typography.uiBody,
                        color: colors.onSurfaceVariant,
                      }}
                    >
                      {speech.voiceProfile}
                    </td>

                    {/* Duration */}
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

                    {/* Actions */}
                    <td
                      style={{
                        padding: spacing.md,
                        paddingRight: spacing.lg,
                        textAlign: 'right',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: spacing.sm,
                        }}
                      >
                        {speech.status === 'failed' && (
                          <button
                            title="Regenerate"
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
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = colors.secondary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = colors.outline;
                            }}
                          >
                            <IconRefresh />
                          </button>
                        )}
                        {speech.status === 'completed' && (
                          <>
                            <button
                              title="Listen"
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
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = colors.primary;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = colors.outline;
                              }}
                            >
                              <IconPlay />
                            </button>
                            <button
                              title="Download"
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
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = colors.primary;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = colors.outline;
                              }}
                            >
                              <IconDownload />
                            </button>
                          </>
                        )}
                        {(speech.status === 'pending' || speech.status === 'processing') && (
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
          </div>
        </section>

        {/* ── Recent Activity ── */}
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
              Recent Activity
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {mockActivity.map((activity, index) => (
              <div
                key={activity.id}
                style={{
                  padding: `${spacing.md} ${spacing.lg}`,
                  borderBottom:
                    index < mockActivity.length - 1
                      ? `1px solid ${colors.surface.containerHighest}`
                      : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.surface.containerHigh;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div>
                  <div
                    style={{
                      ...typography.uiBody,
                      color: colors.onSurface,
                      marginBottom: '2px',
                    }}
                  >
                    {activity.action}
                  </div>
                  <div
                    style={{
                      ...typography.caption,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    {activity.detail}
                  </div>
                </div>
                <div
                  style={{
                    ...typography.caption,
                    color: colors.outlineVariant,
                    flexShrink: 0,
                  }}
                >
                  {activity.timestamp}
                </div>
              </div>
            ))}
          </div>
        </section>

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
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.outlineVariant;
              }}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.outlineVariant;
              }}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.outlineVariant;
              }}
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
            &copy; 2024 ELOCUTIONIST ATELIER. ALL RIGHTS RESERVED.
          </p>
        </footer>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav
        className="md:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: 80,
          backgroundColor: 'rgba(10, 10, 10, 0.9)',
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${colors.outlineVariant}`,
        }}
      >
        <a
          href="#"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            color: colors.outlineVariant,
            textDecoration: 'none',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
          </svg>
          <span style={{ ...typography.caption, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Compose
          </span>
        </a>
        <a
          href="/admin"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            color: colors.primary,
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          <IconAutoStories />
          <span style={{ ...typography.caption, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Dashboard
          </span>
        </a>
        <a
          href="#"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            color: colors.outlineVariant,
            textDecoration: 'none',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span style={{ ...typography.caption, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Library
          </span>
        </a>
        <a
          href="#"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            color: colors.outlineVariant,
            textDecoration: 'none',
          }}
        >
          <IconSettings />
          <span style={{ ...typography.caption, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Settings
          </span>
        </a>
      </nav>
    </div>
  );
}