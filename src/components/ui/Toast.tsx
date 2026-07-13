'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { colors, spacing, radius, typography } from '@/lib/design-tokens';
import type { CSSProperties } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastConfig {
  /** Message text to display. */
  message: string;
  /** Visual variant. Defaults to 'info'. */
  variant?: ToastVariant;
  /** Duration in milliseconds before auto-dismiss. Defaults to 5000. */
  duration?: number;
}

export interface ToastProps extends ToastConfig {
  /** Called when the toast is dismissed. */
  onDismiss: () => void;
}

const variantColors: Record<ToastVariant, { bg: string; border: string; text: string }> = {
  success: {
    bg: `${colors.primary}15`,
    border: colors.primary,
    text: colors.primary,
  },
  error: {
    bg: `${colors.error}15`,
    border: colors.error,
    text: colors.error,
  },
  info: {
    bg: `${colors.secondary}15`,
    border: colors.secondary,
    text: colors.secondary,
  },
};

/**
 * Individual Toast notification component.
 *
 * Displays success (Soft Gold), error (error color), or info (Electric Indigo)
 * messages with auto-dismiss behavior. Uses design tokens exclusively.
 */
export function Toast({ message, variant = 'info', duration = 5000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // allow exit animation
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const variantStyle = variantColors[variant];

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: variantStyle.bg,
    borderLeft: `3px solid ${variantStyle.border}`,
    borderRadius: radius.DEFAULT,
    color: variantStyle.text,
    fontFamily: `var(${typography.uiBody.fontFamily})`,
    fontSize: typography.uiBody.fontSize,
    fontWeight: typography.uiBody.fontWeight,
    lineHeight: typography.uiBody.lineHeight,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateX(0)' : 'translateX(100%)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    maxWidth: '400px',
  };

  return (
    <div style={containerStyle} role="alert" aria-live="polite">
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onDismiss, 300);
        }}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          color: variantStyle.text,
          cursor: 'pointer',
          fontSize: '16px',
          padding: spacing.xs,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

/**
 * Toast container and hook system.
 *
 * Usage:
 * ```tsx
 * const { addToast } = useToast();
 * addToast({ message: 'Saved!', variant: 'success' });
 * ```
 */
export function ToastContainer({ toasts }: { toasts: Array<ToastConfig & { id: string }> }) {
  const containerStyle: CSSProperties = {
    position: 'fixed',
    top: spacing.md,
    right: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    zIndex: 1100,
  };

  return (
    <div style={containerStyle} aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastWithDismiss key={toast.id} {...toast} />
      ))}
    </div>
  );
}

function ToastWithDismiss(config: ToastConfig & { id: string }) {
  const [, setRemoved] = useState(false);

  const handleDismiss = useCallback(() => {
    setRemoved(true);
  }, []);

  return <Toast {...config} onDismiss={handleDismiss} />;
}

/**
 * React hook for managing toast notifications.
 *
 * Returns an `addToast` function to queue new toasts.
 */
export function useToast() {
  const [toasts, setToasts] = useState<Array<ToastConfig & { id: string }>>([]);

  const addToast = useCallback((config: ToastConfig) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...config, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

export default Toast;