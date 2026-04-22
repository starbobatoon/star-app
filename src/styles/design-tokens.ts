/**
 * STAR App Design Tokens
 *
 * Single source of truth for all visual values in the STAR App.
 * Derived from DESIGN.md (Elocutionist theme).
 *
 * Design philosophy: Minimalism & Deep Focus — a "Digital Study" feel
 * where technology serves the craft of rhetoric.
 *
 * ⚠️  NEVER hardcode colors, fonts, spacing, or radii in components.
 *     Always import from this file.
 */

// ─── Colors ───────────────────────────────────────────────────────
// A sophisticated dark-mode palette built on layered "Ink" and "Charcoal" tones.
// Primary (Soft Gold) = high-value actions & finalized moments.
// Accent (Electric Indigo) = AI-driven features, active states, focus.
// Neutral = cool-toned grays for information density without visual noise.

export const colors = {
  /** Surface hierarchy — darkest to lightest, for tonal layering */
  surface: {
    base: '#0A0A0A', // Base layer — deepest background
    dim: '#131313', // Surface-dim (YAML value)
    bright: '#393939', // Surface-bright
    containerLowest: '#0e0e0e',
    containerLow: '#1c1b1b',
    container: '#201f1f', // Surface layer — cards & containers (YAML value)
    containerHigh: '#2a2a2a',
    containerHighest: '#353534',
    /** Main surface background (YAML) */
    default: '#131313',
  },

  /** Content colors on surfaces */
  onSurface: '#e5e2e1',
  onSurfaceVariant: '#d0c5af',
  inverseSurface: '#e5e2e1',
  inverseOnSurface: '#313030',

  /** Outlines — subtle boundary definitions, no shadows */
  outline: '#99907c',
  outlineVariant: '#4d4635',

  /** Surface tint */
  surfaceTint: '#e9c349',

  /** Primary — Soft Gold: high-value actions, finalized moments */
  primary: '#f2ca50',
  onPrimary: '#3c2f00',
  primaryContainer: '#d4af37',
  onPrimaryContainer: '#554300',
  inversePrimary: '#735c00',

  /** Secondary — Electric Indigo: AI features, active states, focus */
  secondary: '#c0c1ff',
  onSecondary: '#1000a9',
  secondaryContainer: '#3131c0',
  onSecondaryContainer: '#b0b2ff',

  /** Tertiary — cool blue accent */
  tertiary: '#bfcdff',
  onTertiary: '#082b72',
  tertiaryContainer: '#97b0ff',
  onTertiaryContainer: '#254188',

  /** Error states */
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',

  /** Fixed variants — stable across light/dark mode switches */
  primaryFixed: '#ffe088',
  primaryFixedDim: '#e9c349',
  onPrimaryFixed: '#241a00',
  onPrimaryFixedVariant: '#574500',

  secondaryFixed: '#e1e0ff',
  secondaryFixedDim: '#c0c1ff',
  onSecondaryFixed: '#07006c',
  onSecondaryFixedVariant: '#2f2ebe',

  tertiaryFixed: '#dbe1ff',
  tertiaryFixedDim: '#b4c5ff',
  onTertiaryFixed: '#00174b',
  onTertiaryFixedVariant: '#27438a',

  /** Background & its content color */
  background: '#131313',
  onBackground: '#e5e2e1',

  /** Surface variant */
  surfaceVariant: '#353534',
} as const;

// ─── Typography ───────────────────────────────────────────────────
// Dual-font strategy:
//   Inter (Sans-Serif) = UI, navigation, admin, metadata — functional, systematic.
//   Newsreader (Serif) = Speech content & transcripts — literary, authoritative.

export const typography = {
  /** Page headings — Inter, large and bold */
  h1: {
    fontFamily: 'var(--font-inter)',
    fontSize: '48px',
    fontWeight: 600,
    lineHeight: '1.2',
    letterSpacing: '-0.02em',
  } as const,

  /** Section headings — Inter, medium weight */
  h2: {
    fontFamily: 'var(--font-inter)',
    fontSize: '32px',
    fontWeight: 500,
    lineHeight: '1.3',
    letterSpacing: '-0.01em',
  } as const,

  /** Speech transcript display — Newsreader serif, generous line height */
  transcriptDisplay: {
    fontFamily: 'var(--font-newsreader)',
    fontSize: '24px',
    fontWeight: 400,
    lineHeight: '1.6',
    letterSpacing: '0',
  } as const,

  /** Speech transcript body — Newsreader serif, very generous line height */
  transcriptBody: {
    fontFamily: 'var(--font-newsreader)',
    fontSize: '20px',
    fontWeight: 400,
    lineHeight: '1.8',
    letterSpacing: '0',
  } as const,

  /** General UI body text — Inter, standard weight */
  uiBody: {
    fontFamily: 'var(--font-inter)',
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: '1.5',
    letterSpacing: '0',
  } as const,

  /** UI labels & navigation — Inter, medium weight, letter-spaced */
  uiLabel: {
    fontFamily: 'var(--font-inter)',
    fontSize: '13px',
    fontWeight: 500,
    lineHeight: '1',
    letterSpacing: '0.05em',
  } as const,

  /** Small captions — Inter, light weight */
  caption: {
    fontFamily: 'var(--font-inter)',
    fontSize: '12px',
    fontWeight: 400,
    lineHeight: '1.4',
    letterSpacing: '0',
  } as const,
} as const;

// ─── Border Radius ───────────────────────────────────────────────
// Soft, architectural roundedness. Standard = 0.25rem for precise feel.
// Progress bars are the exception — full pill shape for fluid motion.

export const radius = {
  /** 2px — minimal rounding */
  sm: '0.125rem',
  /** 4px — standard inputs, buttons, small cards */
  DEFAULT: '0.25rem',
  /** 6px — medium containers */
  md: '0.375rem',
  /** 8px — larger modules, admin panels */
  lg: '0.5rem',
  /** 12px — prominent containers */
  xl: '0.75rem',
  /** 9999px — pill shape for progress bars and chips */
  full: '9999px',
} as const;

// ─── Spacing ─────────────────────────────────────────────────────
// Based on 4px unit / 8px scale rhythm.
// Large xl/xxl values between major sections emphasize minimalism.

export const spacing = {
  /** Base unit: 4px */
  unit: '4px',
  /** Extra small: 4px */
  xs: '4px',
  /** Small: 8px */
  sm: '8px',
  /** Medium: 16px */
  md: '16px',
  /** Large: 24px */
  lg: '24px',
  /** Extra large: 48px — major section gaps */
  xl: '48px',
  /** Extra extra large: 80px — generous breathing room */
  xxl: '80px',
  /** Container max width: 1200px (admin 12-col grid) */
  containerMax: '1200px',
  /** Gutter between grid columns: 24px */
  gutter: '24px',
} as const;

// ─── Elevation (Tonal Layering) ───────────────────────────────────
// NO shadows. Visual hierarchy through tonal differences only.
// Darker = further back. Lighter = closer to user.

export const elevation = {
  /** Base layer — deepest, furthest back */
  base: '#0A0A0A',
  /** Surface layer — cards, containers, floating elements */
  surface: '#1A1A1A',
  /** Accent outline — 1px boundaries without bulk */
  accent: '#2A2A2A',
  /** Border for subtle boundary definition */
  border: '#2A2A2A',
} as const;

// ─── Glassmorphism ────────────────────────────────────────────────
// Reserved for Audio Player & sticky navigation bars.
// Floating, premium utility without breaking the dark aesthetic.

export const glassmorphism = {
  /** Backdrop blur — 12px for frosted glass effect */
  backdropBlur: '12px',
  /** 10% white tint for translucent layering */
  background: 'rgba(255, 255, 255, 0.10)',
  /** Subtle border to define glass edges */
  border: '1px solid rgba(255, 255, 255, 0.08)',
} as const;

// ─── Progress Bar ─────────────────────────────────────────────────
// Horizontal linear bar at top of viewport during questionnaires.
// Track = deep charcoal. Fill gradient: Electric Indigo → Soft Gold.

export const progressBar = {
  /** Gradient start — Electric Indigo */
  fillFrom: '#c0c1ff',
  /** Gradient end — Soft Gold */
  fillTo: '#f2ca50',
} as const;

// ─── Font CSS Variables ──────────────────────────────────────────
// Next.js font optimization registers these as CSS custom properties.
// Use via var(--font-inter) / var(--font-newsreader) in CSS,
// or reference typography tokens above which already use these vars.

export const fontVars = {
  /** Inter — sans-serif for all UI, navigation, admin, metadata */
  inter: '--font-inter',
  /** Newsreader — serif for speech content & transcripts only */
  newsreader: '--font-newsreader',
} as const;