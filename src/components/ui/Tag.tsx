'use client';

import React, { type CSSProperties } from 'react';
import { colors, spacing, radius, typography } from '@/lib/design-tokens';

export type TagVariant = 'default' | 'primary' | 'secondary' | 'error' | 'success';

export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'style'> {
  /** Visual variant of the tag. */
  variant?: TagVariant;
  /** Optional icon or emoji prefix. */
  icon?: React.ReactNode;
}

type HTMLAttributes<T extends HTMLElement> = React.HTMLAttributes<T>;

const variantStyles: Record<TagVariant, CSSProperties> = {
  default: {
    backgroundColor: colors.surface.containerHigh,
    color: colors.onSurface,
    border: `1px solid ${colors.outlineVariant}`,
  },
  primary: {
    backgroundColor: `${colors.primary}20`,
    color: colors.primary,
    border: `1px solid ${colors.primary}`,
  },
  secondary: {
    backgroundColor: `${colors.secondary}20`,
    color: colors.secondary,
    border: `1px solid ${colors.secondary}`,
  },
  error: {
    backgroundColor: `${colors.error}20`,
    color: colors.error,
    border: `1px solid ${colors.error}`,
  },
  success: {
    backgroundColor: `${colors.primary}20`,
    color: colors.primary,
    border: `1px solid ${colors.primary}`,
  },
};

/**
 * Tag / Badge component following the Star Speaker App design system.
 *
 * Status indicators using design tokens for colors. Available variants:
 * default, primary (Soft Gold), secondary (Electric Indigo), error, and success.
 * Compact inline display with proper spacing and typography tokens.
 */
export function Tag({
  variant = 'default',
  icon,
  children,
  ...rest
}: TagProps) {
  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.DEFAULT,
    fontFamily: `var(${typography.uiLabel.fontFamily})`,
    fontSize: typography.uiLabel.fontSize,
    fontWeight: typography.uiLabel.fontWeight,
    letterSpacing: typography.uiLabel.letterSpacing,
    lineHeight: typography.uiLabel.lineHeight,
    whiteSpace: 'nowrap',
    ...variantStyles[variant],
  };

  return (
    <span style={baseStyle} {...rest}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

export default Tag;