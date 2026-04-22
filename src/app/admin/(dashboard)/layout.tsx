'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { colors, typography, radius, spacing } from '@/lib/design-tokens';

// ─── Icon Components ──────────────────────────────────────────────

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

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
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

function IconQuiz() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}

function IconGHL() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconAiSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function IconSignOut() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

// ─── Navigation Config ────────────────────────────────────────────

function IconAnalytics() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}

const NAV_ITEMS = [
  { label: 'DASHBOARD', href: '/admin', icon: IconAutoStories },
  { label: 'MODEL SETTINGS', href: '/admin/openrouter', icon: IconSettings },
  { label: 'VOICE CONFIG', href: '/admin/voices', icon: IconVoice },
  { label: 'USERS', href: '/admin/users', icon: IconUsers },
  { label: 'QUESTIONS', href: '/admin/questions', icon: IconQuiz },
  { label: 'GHL INTEGRATION', href: '/admin/ghl-integration', icon: IconGHL },
  { label: 'ANALYTICS', href: '/admin/analytics', icon: IconAnalytics },
  { label: 'AI SETTINGS', href: '/admin/instructions', icon: IconAiSettings },
];

// ─── Breadcrumb Config ────────────────────────────────────────────

const BREADCRUMB_LABELS: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/openrouter': 'Model Settings',
  '/admin/voices': 'Voice Config',
  '/admin/users': 'Users',
  '/admin/questions': 'Questions',
  '/admin/ghl-integration': 'GHL Integration',
  '/admin/login': 'Login',
  '/admin/prompt': 'Prompt',
  '/admin/analytics': 'Analytics',
  '/admin/instructions': 'AI Settings',
};

// ─── Layout Component ─────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Determine active nav item (exact match or prefix)
  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  // Build breadcrumb
  const breadcrumbLabel = BREADCRUMB_LABELS[pathname] || 'Admin';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: colors.surface.containerLowest,
        fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, sans-serif`,
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          flexShrink: 0,
          width: '288px',
          backgroundColor: colors.surface.containerLow,
          borderRight: `1px solid ${colors.outlineVariant}`,
          padding: spacing.lg,
          display: 'flex',
          flexDirection: 'column',
          alignSelf: 'flex-start',
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
              <div style={{ ...typography.uiLabel, color: colors.onSurface }}>
                Admin Console
              </div>
              <div style={{ ...typography.caption, color: colors.outline }}>
                Elocutionist v1.0
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: active ? colors.surface.containerHigh : 'transparent',
                  color: active ? colors.primary : colors.outline,
                  borderLeft: active ? `2px solid ${colors.primary}` : '2px solid transparent',
                  textDecoration: 'none',
                  ...typography.uiLabel,
                  letterSpacing: '0.1em',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = colors.surface.containerHigh;
                    e.currentTarget.style.color = colors.onSurface;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = colors.outline;
                  }
                }}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div style={{ marginTop: 'auto' }}>
          <Link
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
            <IconSignOut />
            SIGN OUT
          </Link>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main style={{ flex: 1, minWidth: 0, paddingBottom: '96px' }} className="md:pb-0">
        {/* Mobile Header */}
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
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.full,
              backgroundColor: colors.surface.containerHigh,
            }}
          />
        </header>

        {/* Breadcrumb */}
        <div
          style={{
            padding: `${spacing.md} ${spacing.lg}`,
            paddingTop: `calc(${spacing.md} + 0px)`,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            borderBottom: `1px solid ${colors.outlineVariant}`,
            backgroundColor: colors.surface.containerLow,
          }}
          className="pt-16 md:pt-0"
        >
          <Link
            href="/admin"
            style={{
              ...typography.uiLabel,
              color: colors.outline,
              textDecoration: 'none',
              letterSpacing: '0.05em',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = colors.outline;
            }}
          >
            Admin
          </Link>
          {breadcrumbLabel !== 'Dashboard' && (
            <>
              <span style={{ ...typography.uiLabel, color: colors.outlineVariant }}>/</span>
              <span
                style={{
                  ...typography.uiLabel,
                  color: colors.onSurface,
                  letterSpacing: '0.05em',
                }}
              >
                {breadcrumbLabel}
              </span>
            </>
          )}
        </div>

        {/* Page Content */}
        {children}
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
        <Link
          href="/compose"
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
        </Link>
        <Link
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
        </Link>
        <Link
          href="/admin"
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
        </Link>
        <Link
          href="/admin"
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
        </Link>
      </nav>
    </div>
  );
}
