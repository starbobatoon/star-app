'use client';

import { type InputHTMLAttributes, type CSSProperties, forwardRef, useId } from 'react';
import { colors, spacing, radius, typography } from '@/lib/design-tokens';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'style'> {
  /** Label text displayed above the input. */
  label?: string;
  /** Helper or error text displayed below the input. */
  helperText?: string;
  /** Marks the input as having an error state. */
  error?: boolean;
  /** Additional styles applied to the outer wrapper. */
  wrapperStyle?: CSSProperties;
  /** Inline styles applied to the input element. Overrides the default style. */
  inputStyle?: CSSProperties;
}

/**
 * Underline-style Input matching the Elocutionist design system.
 *
 * Uses a subtle border-bottom design with focus and error states.
 * All values use design tokens.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error = false,
      id,
      wrapperStyle,
      inputStyle,
      ...rest
    },
    ref,
  ) => {
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

    const inputStyle: CSSProperties = {
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
      ...style,
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
          style={inputStyle}
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