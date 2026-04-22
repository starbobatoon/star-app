'use client';

import React, { type HTMLAttributes, type CSSProperties, forwardRef, useState } from 'react';
import { colors, spacing, radius } from '@/lib/design-tokens';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  /** Card padding. Defaults to 24px (lg token). */
  padding?: string;
  /** Hover effect: changes border color to secondary (Electric Indigo). */
  hoverable?: boolean;
  /** Additional styles applied to the card. */
  cardStyle?: CSSProperties;
}

/**
 * Minimalist Card component following the Star Speaker App design system.
 *
 * Flat surface with a 1px border using the outlineVariant token, 8px
 * border radius, and generous default padding (24px). No shadows —
 * visual hierarchy is achieved through tonal layering only.
 *
 * When `hoverable` is true, hovering transitions the border to
 * Electric Indigo (secondary token).
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding, hoverable = false, cardStyle, children, ...rest }, ref) => {
    const [isHovered, setIsHovered] = useState(false);

    const baseStyle: CSSProperties = {
      backgroundColor: colors.surface.container,
      border: `1px solid ${hoverable && isHovered ? colors.secondary : colors.outlineVariant}`,
      borderRadius: radius.lg,
      padding: padding ?? spacing.lg,
      transition: 'border-color 0.2s ease',
    };

    return (
      <div
        ref={ref}
        style={{ ...baseStyle, ...cardStyle }}
        onMouseEnter={(e) => {
          setIsHovered(true);
          rest.onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setIsHovered(false);
          rest.onMouseLeave?.(e);
        }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

export default Card;