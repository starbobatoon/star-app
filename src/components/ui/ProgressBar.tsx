'use client';

import React, { type CSSProperties } from 'react';
import { colors, radius, progressBar } from '@/lib/design-tokens';

export interface ProgressBarProps {
  /** Current progress value (0–100). */
  value: number;
  /** Progress bar height. Defaults to '4px'. */
  height?: string;
  /** Additional CSS for the outer track. */
  trackStyle?: CSSProperties;
  /** Additional CSS for the inner fill. */
  fillStyle?: CSSProperties;
  /** Accessible label describing what the progress represents. */
  'aria-label'?: string;
}

/**
 * Horizontal ProgressBar component following the Elocutionist design system.
 *
 * The track uses surfaceContainerHigh, and the fill uses a gradient
 * from Electric Indigo to Soft Gold. Pill-shaped (full border radius)
 * for fluid motion. All values use design tokens.
 */
export function ProgressBar({
  value,
  height = '4px',
  trackStyle,
  fillStyle,
  'aria-label': ariaLabel,
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  const track: CSSProperties = {
    width: '100%',
    height,
    backgroundColor: colors.surface.containerHigh,
    borderRadius: radius.full,
    overflow: 'hidden',
    ...trackStyle,
  };

  const fill: CSSProperties = {
    width: `${clampedValue}%`,
    height: '100%',
    background: `linear-gradient(to right, ${progressBar.fillFrom}, ${progressBar.fillTo})`,
    borderRadius: radius.full,
    transition: 'width 0.4s ease',
    ...fillStyle,
  };

  return (
    <div style={track} role="progressbar" aria-valuenow={clampedValue} aria-valuemin={0} aria-valuemax={100} aria-label={ariaLabel ?? 'Progress'}>
      <div style={fill} />
    </div>
  );
}

export default ProgressBar;