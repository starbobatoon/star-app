'use client';

import type { CSSProperties } from 'react';
import { colors } from '@/lib/design-tokens';

export interface LogoProps {
  /** Height of the star mark in px. The wordmark scales with it. Default 28. */
  size?: number;
  /** Hide the "STAR" wordmark and render the mark only. */
  markOnly?: boolean;
  style?: CSSProperties;
}

/**
 * Star Speaker AI logo lockup.
 *
 * A simplified 5-point star mark (inline SVG, brand gold #cba864) beside a
 * legible "STAR" wordmark set in Newsreader 500. This replaces the old ~40px
 * PNG with baked-in sub-text that rendered as noise and 404'd on some pages.
 *
 * It is an inline SVG + text lockup — no raster, no baked sub-text — so it
 * stays crisp at every size and inherits brand color from tokens.
 */
export function Logo({ size = 28, markOnly = false, style }: LogoProps) {
  return (
    <span
      aria-label="Star Speaker AI"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${Math.round(size * 0.34)}px`,
        lineHeight: 1,
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={colors.primary}
        aria-hidden="true"
        style={{ display: 'block', flexShrink: 0 }}
      >
        <path d="M12 1.6l2.72 6.6 7.13.55-5.43 4.62 1.68 6.95L12 17.2l-6.1 3.72 1.68-6.95L2.15 9.35l7.13-.55L12 1.6z" />
      </svg>
      {!markOnly && (
        <span
          style={{
            fontFamily: 'var(--font-newsreader), Georgia, serif',
            fontSize: `${Math.round(size * 0.92)}px`,
            fontWeight: 500,
            letterSpacing: '0.14em',
            color: colors.onSurface,
            textTransform: 'uppercase',
          }}
        >
          STAR
        </span>
      )}
    </span>
  );
}

export default Logo;
