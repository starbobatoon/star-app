'use client';

import React, { type CSSProperties, forwardRef, useId, useState, useRef, useEffect } from 'react';
import { colors, spacing, radius, typography } from '@/lib/design-tokens';

export interface SelectOption {
  /** Value sent on form submission. */
  value: string;
  /** Display label for the option. */
  label: string;
}

export interface SelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style' | 'onChange'> {
  /** Available options in the dropdown. */
  options: SelectOption[];
  /** Currently selected value. */
  value?: string;
  /** Called when a new option is selected. */
  onChange?: (value: string) => void;
  /** Placeholder text when no option is selected. */
  placeholder?: string;
  /** Label text displayed above the select. */
  label?: string;
  /** Marks the select as having an error state. */
  error?: boolean;
  /** Whether the field is required. */
  required?: boolean;
  /** Helper text below the select. */
  helperText?: string;
  /** Accessible name for the select. */
  'aria-label'?: string;
}

/**
 * Dropdown Select component following the Star Speaker App design system.
 *
 * Dark surface with Electric Indigo focus state. Required for GHL
 * field mapping UI. Uses design tokens exclusively.
 */
export const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = 'Select an option…',
      label,
      error = false,
      required = false,
      helperText,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const listboxId = `${generatedId}-listbox`;
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((o) => o.value === value);

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const triggerStyle: CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${spacing.sm} ${spacing.md}`,
      backgroundColor: colors.surface.container,
      border: `1px solid ${error ? colors.error : isOpen ? colors.secondary : colors.outlineVariant}`,
      borderRadius: radius.DEFAULT,
      color: selectedOption ? colors.onSurface : colors.onSurfaceVariant,
      fontFamily: `var(${typography.uiBody.fontFamily})`,
      fontSize: typography.uiBody.fontSize,
      fontWeight: typography.uiBody.fontWeight,
      lineHeight: typography.uiBody.lineHeight,
      cursor: 'pointer',
      transition: 'border-color 0.2s ease',
      width: '100%',
      outline: 'none',
    };

    const listboxStyle: CSSProperties = {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: spacing.xs,
      backgroundColor: colors.surface.container,
      border: `1px solid ${colors.outlineVariant}`,
      borderRadius: radius.DEFAULT,
      maxHeight: '200px',
      overflowY: 'auto',
      zIndex: 100,
      display: isOpen ? 'block' : 'none',
    };

    const optionStyle = (focused: boolean, selected: boolean): CSSProperties => ({
      padding: `${spacing.sm} ${spacing.md}`,
      backgroundColor: selected
        ? `${colors.secondary}20`
        : focused
          ? colors.surface.containerHigh
          : 'transparent',
      color: selected ? colors.secondary : colors.onSurface,
      fontFamily: `var(${typography.uiBody.fontFamily})`,
      fontSize: typography.uiBody.fontSize,
      fontWeight: typography.uiBody.fontWeight,
      lineHeight: typography.uiBody.lineHeight,
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
    });

    const labelStyle: CSSProperties = {
      display: 'block',
      fontFamily: `var(${typography.uiLabel.fontFamily})`,
      fontSize: typography.uiLabel.fontSize,
      fontWeight: typography.uiLabel.fontWeight,
      letterSpacing: typography.uiLabel.letterSpacing,
      color: colors.onSurfaceVariant,
      marginBottom: spacing.xs,
    };

    const helperStyle: CSSProperties = {
      fontFamily: `var(${typography.caption.fontFamily})`,
      fontSize: typography.caption.fontSize,
      fontWeight: typography.caption.fontWeight,
      color: error ? colors.error : colors.onSurfaceVariant,
      marginTop: spacing.xs,
    };

    return (
      <div ref={ref} style={{ position: 'relative', width: '100%' }} {...rest}>
        {label && (
          <label style={labelStyle}>
            {label}
            {required && (
              <span style={{ color: colors.error, marginLeft: spacing.xs }} aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div
          ref={containerRef}
          style={{ position: 'relative' }}
        >
          <div
            style={triggerStyle}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-labelledby={label ? generatedId : undefined}
            tabIndex={0}
            onClick={() => setIsOpen(!isOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(!isOpen);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
                setIsOpen(true);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex((prev) => Math.max(prev - 1, 0));
                setIsOpen(true);
              } else if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
          >
            <span>{selectedOption?.label ?? placeholder}</span>
            <span style={{ color: colors.onSurfaceVariant, fontSize: '12px' }}>
              {isOpen ? '▲' : '▼'}
            </span>
          </div>
          <ul
            id={listboxId}
            style={listboxStyle}
            role="listbox"
            aria-activedescendant={
              focusedIndex >= 0 ? `${generatedId}-option-${focusedIndex}` : undefined
            }
          >
            {options.map((option, idx) => (
              <li
                key={option.value}
                id={`${generatedId}-option-${idx}`}
                style={optionStyle(idx === focusedIndex, option.value === value)}
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange?.(option.value);
                  setIsOpen(false);
                  setFocusedIndex(idx);
                }}
                onMouseEnter={() => setFocusedIndex(idx)}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
        {helperText && (
          <p style={helperStyle} role={error ? 'alert' : undefined}>
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

export default Select;