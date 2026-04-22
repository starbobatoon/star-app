'use client';

import { type InputHTMLAttributes, type CSSProperties, forwardRef, useId } from 'react';
import { colors, spacing, typography } from '@/lib/design-tokens';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'style'> {
  /** Label text displayed above the input. */
  label?: string;
  /** Helper or error text displayed below the input. */
  helperText?: string;
  /** Marks the input as having an error state. */
  error?: boolean;
  /** Additional styles applied to the outer wrapper. */
  wrapperStyle?: CSSProperties;
  /** Inline styles applied to the input element. Merged on top of default styles. */
  style?: CSSProperties;
}

/**
 * Underline-style Input component matching the Star Speaker App design system.
 *
 * Features a subtle border-bottom that transitions to Electric Indigo on focus.
 * Supports label above and helper/error text below. Uses design tokens
 * exclusively — no hardcoded values.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error = false, id, wrapperStyle, style: propStyle, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    const labelStyle: CSSProperties = {
      display: 'block',
      fontFamily: `var(${typography.uiLabel.fontFamily})`,
      fontSize: typography.uiLabel.fontSize,
      fontWeight: typography.uiLabel.fontWeight,
      lineHeight: typography.uiLabel.lineHeight,
      letterSpacing: typography.uiLabel.letterSpacing,
      color: colors.onSurfaceVariant,
      marginBottom: spacing.xs,
    };

    const baseInputStyle: CSSProperties = {
      fontFamily: `var(${typography.uiBody.fontFamily})`,
      fontSize: typography.uiBody.fontSize,
      fontWeight: typography.uiBody.fontWeight,
      lineHeight: typography.uiBody.lineHeight,
      color: colors.onSurface,
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: `1px solid ${error ? colors.error : colors.outlineVariant}`,
      borderRadius: 0,
      padding: `${spacing.sm} 0`,
      width: '100%',
      outline: 'none',
      transition: 'border-bottom-color 0.2s ease',
      caretColor: colors.secondary,
    };

    const helperStyle: CSSProperties = {
      fontFamily: `var(${typography.caption.fontFamily})`,
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      lineHeight: typography.caption.lineHeight,
      color: error ? colors.error : colors.onSurfaceVariant,
      marginTop: spacing.xs,
    };

    return (
      <div style={wrapperStyle}>
        {label && (
          <label htmlFor={inputId} style={labelStyle}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error || undefined}
          aria-describedby={helperText ? `${inputId}-helper` : undefined}
          style={{ ...baseInputStyle, ...propStyle }}
          onFocus={(e) => {
            e.currentTarget.style.borderBottomColor = error ? colors.error : colors.secondary;
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderBottomColor = error ? colors.error : colors.outlineVariant;
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {helperText && (
          <p id={`${inputId}-helper`} style={helperStyle} role={error ? 'alert' : undefined}>
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;