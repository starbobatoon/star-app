'use client';

import React, { type HTMLAttributes, type CSSProperties, forwardRef, useEffect, useCallback } from 'react';
import { colors, spacing, radius, typography, glassmorphism } from '@/lib/design-tokens';

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  /** Whether the modal is open. */
  open: boolean;
  /** Called when the modal requests to close (backdrop click, Esc key, close button). */
  onClose: () => void;
  /** Modal title displayed in the header. */
  title?: string;
  /** Uses glass-style header instead of solid surface. Defaults to false. */
  glassHeader?: boolean;
  /** Additional styles for the modal content area. */
  contentStyle?: CSSProperties;
}

/**
 * Overlay Modal component following the Elocutionist design system.
 *
 * Features a backdrop overlay, close button, and optional title bar.
 * Supports a glass-style header via the `glassHeader` prop. Closes on
 * Escape key press and backdrop click. Uses design tokens exclusively.
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ open, onClose, title, glassHeader = false, contentStyle, children, ...rest }, ref) => {
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      },
      [onClose],
    );

    useEffect(() => {
      if (open) {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }, [open, handleKeyDown]);

    if (!open) return null;

    const backdropStyle: CSSProperties = {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    };

    const modalStyle: CSSProperties = {
      backgroundColor: colors.surface.container,
      border: `1px solid ${colors.outlineVariant}`,
      borderRadius: radius.lg,
      width: '90%',
      maxWidth: spacing.containerMax,
      maxHeight: '90vh',
      overflow: 'auto',
    };

    const headerStyle: CSSProperties = glassHeader
      ? {
          backdropFilter: `blur(${glassmorphism.backdropBlur})`,
          backgroundColor: glassmorphism.background,
          borderBottom: glassmorphism.border,
          padding: spacing.md,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }
      : {
          backgroundColor: colors.surface.containerHigh,
          borderBottom: `1px solid ${colors.outlineVariant}`,
          padding: spacing.md,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        };

    const titleStyle: CSSProperties = {
      fontFamily: `var(${typography.h2.fontFamily})`,
      fontSize: typography.h2.fontSize,
      fontWeight: typography.h2.fontWeight,
      lineHeight: typography.h2.lineHeight,
      color: colors.onSurface,
      margin: 0,
    };

    const closeBtnStyle: CSSProperties = {
      background: 'none',
      border: 'none',
      color: colors.onSurfaceVariant,
      fontSize: '24px',
      cursor: 'pointer',
      padding: spacing.xs,
      lineHeight: 1,
      borderRadius: radius.DEFAULT,
      transition: 'color 0.2s ease',
    };

    const bodyStyle: CSSProperties = {
      padding: spacing.lg,
      ...contentStyle,
    };

    return (
      <div
        style={backdropStyle}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="presentation"
      >
        <div
          ref={ref}
          style={modalStyle}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          {...rest}
        >
          {title && (
            <div style={headerStyle}>
              <h2 style={titleStyle}>{title}</h2>
              <button
                style={closeBtnStyle}
                onClick={onClose}
                aria-label="Close modal"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = colors.onSurface;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors.onSurfaceVariant;
                }}
              >
                ✕
              </button>
            </div>
          )}
          <div style={bodyStyle}>{children}</div>
        </div>
      </div>
    );
  },
);

Modal.displayName = 'Modal';

export default Modal;