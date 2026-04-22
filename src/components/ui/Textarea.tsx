'use client';

import { type TextareaHTMLAttributes, type CSSProperties, forwardRef, useId, useState } from 'react';
import { colors, spacing, radius, typography } from '@/lib/design-tokens';

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'style'> & {
  /** Label text displayed above the textarea. */
  label?: string;
  /** Helper or error text displayed below the textarea. */
  helperText?: string;
  /** Marks the textarea as having an error state. */
  error?: boolean;
  /** Maximum character count. Defaults to 5000. */
  maxLength?: number;
  /** Whether to show the character counter. Defaults to true. */
  showCounter?: boolean;
  /** Additional styles applied to the outer wrapper. */
  wrapperStyle?: CSSProperties;
  /** Inline styles applied to the textarea element. Overrides the default style prop type. */
  style?: CSSProperties;
};

/**
 * Underline-style Textarea matching the Elocutionist Input pattern.
 *
 * Shares the same subtle border-bottom design as Input, extended for
 * multiline content. Includes a character counter (max 5000) and
 * supports label + helper/error text. All values use design tokens.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error = false,
      maxLength = 5000,
      showCounter = true,
      id,
      wrapperStyle,
      style,
      onChange,
      value,
      defaultValue,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;

    const [charCount, setCharCount] = useState(
      typeof value === 'string' ? value.length : typeof defaultValue === 'string' ? defaultValue.length : 0,
    );

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

    const textareaStyle: CSSProperties = {
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
      minHeight: '120px',
      resize: 'vertical',
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

    const counterStyle: CSSProperties = {
      fontFamily: `var(${typography.caption.fontFamily})`,
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      color: charCount >= maxLength ? colors.error : colors.onSurfaceVariant,
      textAlign: 'right',
      marginTop: spacing.xs,
    };

    return (
      <div style={wrapperStyle}>
        {label && (
          <label htmlFor={textareaId} style={labelStyle}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error || undefined}
          aria-describedby={helperText ? `${textareaId}-helper` : undefined}
          maxLength={maxLength}
          style={{ ...textareaStyle, ...style }}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => {
            setCharCount(e.target.value.length);
            onChange?.(e);
          }}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {helperText && (
            <p id={`${textareaId}-helper`} style={helperStyle} role={error ? 'alert' : undefined}>
              {helperText}
            </p>
          )}
          {showCounter && (
            <span style={counterStyle} aria-live="polite">
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export default Textarea;