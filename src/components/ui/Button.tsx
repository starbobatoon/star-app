'use client';

import { type ButtonHTMLAttributes, type CSSProperties, forwardRef } from 'react';
import { colors, spacing, radius, typography } from '@/lib/design-tokens';

/**
 * Button variants for the Star Speaker App design system.
 *
 * - **Primary**: Solid Soft Gold background with dark text. Used for "Finalize", "Download", and other high-value actions.
 * - **Secondary**: Ghost style with Electric Indigo text on hover. Used for secondary actions.
 * - **Tertiary**: Text-only with uppercase tracking. Used for navigation links and subtle actions.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button. Defaults to 'primary'. */
  variant?: ButtonVariant;
  /** When true, shows a loading spinner and disables the button. */
  loading?: boolean;
  /** Full-width button that stretches to its container. */
  fullWidth?: boolean;
}

/**
 * Reusable Button component following the Star Speaker App design system.
 *
 * Uses design tokens exclusively — no hardcoded colors, spacing, or radii.
 * Supports three variants (Primary, Secondary, Tertiary), loading and
 * disabled states, and proper focus-ring accessibility.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      loading = false,
      fullWidth = false,
      disabled,
      children,
      style,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    const baseStyles: CSSProperties = {
      fontFamily: `var(${typography.uiLabel.fontFamily})`,
      fontSize: typography.uiLabel.fontSize,
      fontWeight: typography.uiLabel.fontWeight,
      lineHeight: typography.uiLabel.lineHeight,
      letterSpacing: typography.uiLabel.letterSpacing,
      borderRadius: radius.DEFAULT,
      padding: `${spacing.sm} ${spacing.md}`,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      border: 'none',
      outline: 'none',
      transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease',
      // Disabled = 40% opacity of the variant's own color (a dimmed version of
      // the same hue — never a distinct "muddy" color). For the primary button
      // this reads as a dimmed gold, fixing the "Begin looks broken" complaint.
      opacity: isDisabled ? 0.4 : 1,
      width: fullWidth ? '100%' : undefined,
    };

    const variantStyles: Record<ButtonVariant, CSSProperties> = {
      primary: {
        backgroundColor: colors.primary,
        color: colors.onPrimary,
      },
      secondary: {
        backgroundColor: 'transparent',
        color: colors.secondary,
        border: `1px solid ${colors.outlineVariant}`,
      },
      tertiary: {
        backgroundColor: 'transparent',
        color: colors.onSurface,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        padding: `${spacing.xs} 0`,
      },
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        style={{ ...baseStyles, ...variantStyles[variant], ...style }}
        {...rest}
      >
        {loading && (
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              border: `2px solid ${variant === 'primary' ? colors.onPrimary : colors.onSurface}`,
              borderTopColor: 'transparent',
              borderRadius: radius.full,
              animation: 'spin 0.6s linear infinite',
              marginRight: spacing.xs,
            }}
          />
        )}
        {children}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;