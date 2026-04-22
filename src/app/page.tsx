'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors, spacing, radius, typography, elevation, glassmorphism } from '@/lib/design-tokens';

/**
 * Landing page — the first thing users see.
 * Matches the Star Speaker AI design reference.
 * Dark mode only, tonal layering, no shadows.
 */

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleStartWriting = useCallback(() => {
    router.push('/compose');
  }, [router]);

  const handleBrainstorm = useCallback(() => {
    router.push('/compose?mode=brainstorm');
  }, [router]);

  const navItems = [
    { label: 'Compose', icon: 'edit_note', href: '/compose', active: true },
    { label: 'Brainstorm', icon: 'psychology', href: '/compose?mode=brainstorm', active: false },
    { label: 'Library', icon: 'auto_stories', href: '/library', active: false },
  ] as const;

  const bottomNavItems = [
    ...navItems,
    { label: 'Settings', icon: 'settings', href: '/settings', active: false },
  ] as const;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.background,
        color: colors.onBackground,
        fontFamily: `var(${typography.uiBody.fontFamily}), system-ui, -apple-system, sans-serif`,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.03) 0%, transparent 60%)',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* ── Top App Bar ── */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          width: '100%',
          zIndex: 50,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: spacing.lg,
          paddingRight: spacing.lg,
          height: '64px',
          backgroundColor: 'rgba(10, 10, 10, 0.8)',
          backdropFilter: `blur(${glassmorphism.backdropBlur})`,
          WebkitBackdropFilter: `blur(${glassmorphism.backdropBlur})`,
          borderBottom: `1px solid ${elevation.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          {/* Mobile menu button */}
          <button
            aria-label="Open navigation menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            style={{
              display: 'none',
              color: colors.outline,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: spacing.xs,
              transition: 'color 0.3s ease',
            }}
            className="mobile-menu-btn"
          >
            <span
              aria-hidden="true"
              style={{ fontSize: '24px', lineHeight: 1 }}
            >
              ☰
            </span>
          </button>

          {/* Logo */}
          <img
            src="/logo.png"
            alt="Star Speaker AI"
            style={{
              height: '40px',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main navigation"
          style={{ display: 'flex', alignItems: 'center', gap: spacing.xxl }}
          className="desktop-nav"
        >
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              aria-label={`Navigate to ${item.label}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                color: item.active ? colors.primaryContainer : colors.outline,
                textDecoration: 'none',
                fontFamily: `var(${typography.uiLabel.fontFamily}), Georgia, serif`,
                fontSize: typography.uiLabel.fontSize,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                transition: 'color 0.3s ease',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '16px', lineHeight: 1 }}>
                {item.icon === 'edit_note' ? '✏️' : item.icon === 'psychology' ? '🧠' : '📖'}
              </span>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Profile button */}
        <button
          aria-label="User profile"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: radius.full,
            backgroundColor: colors.surface.containerHigh,
            border: `1px solid ${colors.outlineVariant}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.3s ease',
            padding: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              color: colors.onSurfaceVariant,
              fontSize: '14px',
              lineHeight: 1,
            }}
          >
            👤
          </span>
        </button>
      </header>

      {/* ── Main Content ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          paddingLeft: spacing.gutter,
          paddingRight: spacing.gutter,
          paddingTop: '96px',
          paddingBottom: '112px',
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '720px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: spacing.xl,
            width: '100%',
          }}
        >
          {/* Typography Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, maxWidth: '640px' }}>
            <h1
              style={{
                fontFamily: `var(${typography.h1.fontFamily}), system-ui, sans-serif`,
                fontSize: typography.h1.fontSize,
                fontWeight: typography.h1.fontWeight,
                lineHeight: typography.h1.lineHeight,
                letterSpacing: typography.h1.letterSpacing,
                color: colors.onSurface,
                margin: 0,
              }}
            >
              Your Five-Minute Masterpiece.
            </h1>
            <p
              style={{
                fontFamily: `var(${typography.transcriptDisplay.fontFamily}), Georgia, serif`,
                fontSize: typography.transcriptDisplay.fontSize,
                fontWeight: typography.transcriptDisplay.fontWeight,
                lineHeight: typography.transcriptDisplay.lineHeight,
                letterSpacing: typography.transcriptDisplay.letterSpacing,
                color: colors.onSurfaceVariant,
                opacity: 0.9,
                margin: '0 auto',
                maxWidth: '560px',
              }}
            >
              Craft perfectly structured speeches in minutes with the power of AI.
            </p>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: spacing.md,
              paddingTop: spacing.lg,
              width: '100%',
            }}
            className="cta-group"
          >
            <button
              onClick={handleStartWriting}
              aria-label="Start writing a speech"
              style={{
                width: '100%',
                maxWidth: '320px',
                padding: '16px 32px',
                backgroundColor: colors.primary,
                color: colors.onPrimary,
                borderRadius: radius.full,
                fontFamily: `var(${typography.uiLabel.fontFamily}), system-ui, sans-serif`,
                fontSize: typography.uiLabel.fontSize,
                fontWeight: typography.uiLabel.fontWeight,
                letterSpacing: typography.uiLabel.letterSpacing,
                lineHeight: typography.uiLabel.lineHeight,
                textTransform: 'uppercase' as const,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                transition: 'background-color 0.3s ease',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '18px', lineHeight: 1 }}>✏️</span>
              Start Writing
            </button>
            <button
              onClick={handleBrainstorm}
              aria-label="Brainstorm speech ideas"
              style={{
                width: '100%',
                maxWidth: '320px',
                padding: '16px 32px',
                backgroundColor: 'transparent',
                color: colors.onSurface,
                borderRadius: radius.full,
                fontFamily: `var(${typography.uiLabel.fontFamily}), system-ui, sans-serif`,
                fontSize: typography.uiLabel.fontSize,
                fontWeight: typography.uiLabel.fontWeight,
                letterSpacing: typography.uiLabel.letterSpacing,
                lineHeight: typography.uiLabel.lineHeight,
                textTransform: 'uppercase' as const,
                border: `1px solid ${colors.outlineVariant}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                transition: 'border-color 0.3s ease, color 0.3s ease',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '18px', lineHeight: 1 }}>💡</span>
              Brainstorm Ideas
            </button>
          </div>
        </div>
      </main>

      {/* ── Bottom Navigation Bar (Mobile Only) ── */}
      <nav
        aria-label="Mobile navigation"
        className="bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          width: '100%',
          zIndex: 50,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: '80px',
          backgroundColor: 'rgba(10, 10, 10, 0.9)',
          backdropFilter: `blur(${glassmorphism.backdropBlur})`,
          WebkitBackdropFilter: `blur(${glassmorphism.backdropBlur})`,
          borderTop: `1px solid ${elevation.border}`,
        }}
      >
        {bottomNavItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            aria-label={`Navigate to ${item.label}`}
            aria-current={item.active ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              width: '100%',
              height: '100%',
              color: item.active ? colors.primaryContainer : colors.outlineVariant,
              textDecoration: 'none',
              fontFamily: `var(${typography.uiLabel.fontFamily}), system-ui, sans-serif`,
              fontSize: '10px',
              fontWeight: item.active ? 700 : 400,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              transition: 'color 0.3s ease',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '20px', lineHeight: 1 }}>
              {item.icon === 'edit_note' ? '✏️' : item.icon === 'psychology' ? '🧠' : item.icon === 'auto_stories' ? '📖' : '⚙️'}
            </span>
            {item.label}
          </a>
        ))}
      </nav>

      {/* ── Responsive Styles ── */}
      <style jsx global>{`
        /* Mobile menu button visibility */
        .mobile-menu-btn {
          display: none !important;
        }
        @media (max-width: 767px) {
          .mobile-menu-btn {
            display: flex !important;
          }
          .desktop-nav {
            display: none !important;
          }
        }

        /* CTA buttons row on larger screens */
        @media (min-width: 640px) {
          .cta-group {
            flex-direction: row !important;
            width: auto !important;
          }
        }

        /* Bottom nav hidden on desktop */
        @media (min-width: 768px) {
          .bottom-nav {
            display: none !important;
          }
        }

        /* Responsive heading sizes */
        @media (max-width: 767px) {
          main h1 {
            font-size: 32px !important;
          }
          main p {
            font-size: 18px !important;
          }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          main h1 {
            font-size: 40px !important;
          }
        }
        @media (min-width: 1440px) {
          main h1 {
            font-size: 48px !important;
          }
        }

        /* Hover states */
        .cta-group button:hover {
          filter: brightness(1.1);
        }
        .cta-group button:focus-visible {
          outline: 2px solid var(--color-secondary);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}