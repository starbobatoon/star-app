'use client';

import Link from 'next/link';
import { PenLine, BookOpen } from 'lucide-react';
import { colors } from '@/lib/design-tokens';
import type { AppNav } from '@/components/AppHeader';

const ITEMS = [
  { key: 'compose' as const, label: 'Compose', href: '/compose', Icon: PenLine },
  { key: 'library' as const, label: 'Library', href: '/library', Icon: BookOpen },
];

/**
 * The single mobile navigation paradigm: a bottom tab bar with real icons,
 * Compose / Library only. There is deliberately no hamburger and no Settings
 * tab (both were dead controls / 404 targets). Hidden on desktop (≥641px).
 */
export function MobileNav({ active = null }: { active?: AppNav }) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="mobile-tab-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 60,
        display: 'none',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '72px',
        backgroundColor: 'rgba(6, 10, 28, 0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: `1px solid ${colors.outlineVariant}`,
      }}
    >
      {ITEMS.map(({ key, label, href, Icon }) => {
        const isActive = active === key;
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              flex: 1,
              height: '100%',
              textDecoration: 'none',
              color: isActive ? colors.primary : colors.onSurfaceVariant,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <Icon size={22} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
      <style jsx global>{`
        @media (max-width: 640px) {
          .mobile-tab-nav { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}

export default MobileNav;
