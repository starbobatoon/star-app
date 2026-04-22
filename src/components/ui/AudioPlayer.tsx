'use client';

import React, { type CSSProperties, useRef, useState, useEffect, useCallback } from 'react';
import { colors, spacing, radius, typography, glassmorphism } from '@/lib/design-tokens';

export interface AudioPlayerProps {
  /** Audio source URL. */
  src: string;
  /** Accessible label for the player. */
  'aria-label'?: string;
  /** Additional styles for the outer container. */
  containerStyle?: CSSProperties;
}

/**
 * Floating glassmorphism AudioPlayer component following the Elocutionist design system.
 *
 * Features play/pause, scrubbing, and time display. Uses the `.glass` CSS class
 * for the backdrop blur effect. Waveform visualization uses thin vertical
 * Electric Indigo lines. All values use design tokens.
 */
export function AudioPlayer({
  src,
  'aria-label': ariaLabel,
  containerStyle,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressRatio = duration > 0 ? currentTime / duration : 0;

  const containerStyles: CSSProperties = {
    position: 'fixed',
    bottom: spacing.md,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: spacing.containerMax,
    backdropFilter: `blur(${glassmorphism.backdropBlur})`,
    backgroundColor: glassmorphism.background,
    border: glassmorphism.border,
    borderRadius: radius.lg,
    padding: `${spacing.sm} ${spacing.md}`,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 900,
    ...containerStyle,
  };

  const playBtnStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    color: colors.secondary,
    fontSize: '20px',
    cursor: 'pointer',
    padding: spacing.xs,
    lineHeight: 1,
    borderRadius: radius.DEFAULT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
  };

  const timeStyle: CSSProperties = {
    fontFamily: `var(${typography.caption.fontFamily})`,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    color: colors.onSurfaceVariant,
    whiteSpace: 'nowrap',
    minWidth: '40px',
  };

  const trackStyle: CSSProperties = {
    flex: 1,
    height: '4px',
    backgroundColor: colors.surface.containerHigh,
    borderRadius: radius.full,
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  };

  const fillStyle: CSSProperties = {
    width: `${progressRatio * 100}%`,
    height: '100%',
    background: `linear-gradient(to right, ${colors.secondary}, ${colors.primary})`,
    borderRadius: radius.full,
    transition: 'width 0.1s linear',
  };

  // Generate waveform bars (decorative)
  const barCount = 40;
  const waveformBars = Array.from({ length: barCount }, (_, i) => {
    const height = `${8 + Math.sin(i * 0.4) * 6 + Math.random() * 4}px`;
    return (
      <div
        key={i}
        style={{
          width: '2px',
          height,
          backgroundColor: colors.secondary,
          opacity: 0.4,
          borderRadius: radius.full,
          flexShrink: 0,
        }}
      />
    );
  });

  return (
    <div style={containerStyles} role="region" aria-label={ariaLabel ?? 'Audio player'}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <button
        style={playBtnStyle}
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        type="button"
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      <span style={timeStyle}>{formatTime(currentTime)}</span>
      <div
        ref={progressRef}
        style={trackStyle}
        onClick={handleScrub}
        role="slider"
        aria-label="Scrub audio"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressRatio * 100)}
        tabIndex={0}
      >
        <div style={fillStyle} />
      </div>
      <span style={timeStyle}>{formatTime(duration)}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '24px', overflow: 'hidden' }}>
        {waveformBars}
      </div>
    </div>
  );
}

export default AudioPlayer;