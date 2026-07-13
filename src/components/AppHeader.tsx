'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { PenLine, BookOpen } from 'lucide-react';
import { colors, spacing } from '@/lib/design-tokens';
import { Logo } from '@/components/Logo';

export type AppNav = 'compose' | 'library' | null;

export interface AppHeaderProps {
  /** Which nav item is active (drives the gold highlight). */
  active?: AppNav;
  /** Optional right-slot content (a single primary action, or nothing). */
  right?: ReactNode;
}

const NAV_ITEMS = [
  { key: 'compose' as const, label: 'Compose', href: '/compose', Icon: PenLine },
  { key: 'library' as const, label: 'Library', href: '/library', Icon: BookOpen },
];

/**
 * The single shared header used by every public page (landing, compose,
 * library). One component, one DOM shape — pages differ only by which nav
 * item is `active`. Sticky, #080D22 background, 1px bottom border #2E3670.
 *
 * Icons come from lucide-react (the app's single icon library) and inherit
 * `currentColor`, so the active item is gold (#cba864) and the rest are the
 * muted on-surface-variant tint (#B8B2D8).
 */
export function AppHeader({ active = null, right }: AppHeaderProps) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.lg,
        height: '64px',
        paddingLeft: spacing.lg,
        paddingRight: spacing.lg,
        backgroundColor: '#080D22',
        borderBottom: `1px solid ${colors.outlineVariant}`,
      }}
    >
      {/* Left: logo lockup */}
      <Link
        href="/"
        aria-label="Star Speaker AI home"
        style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
      >
        <Logo size={26} />
      </Link>

      {/* Center/left: primary nav */}
      <nav
        aria-label="Main navigation"
        style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, flex: 1, justifyContent: 'flex-start', marginLeft: spacing.xl }}
        className="app-header-nav"
      >
        {NAV_ITEMS.map(({ key, label, href, Icon }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                textDecoration: 'none',
                color: isActive ? colors.primary : colors.onSurfaceVariant,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'color 0.2s ease',
              }}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right slot: a single primary action or nothing */}
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>{right}</div>

      <style jsx global>{`
        @media (max-width: 640px) {
          .app-header-nav { display: none !important; }
        }
      `}</style>
    </header>
  );
}

export default AppHeader;
