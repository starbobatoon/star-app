/**
 * Star Speaker App Design Tokens
 *
 * Single source of truth for all visual values in the Star Speaker App.
 *
 * Brand palette:
 *   Navy   #0B1472 — rich surfaces, depth, structural backgrounds
 *   Gold   #cba864 — primary actions, highlights, key moments
 *   Gray   #9d9d9d — outlines, muted text, neutral accents
 *
 * ⚠️  NEVER hardcode colors, fonts, spacing, or radii in components.
 *     Always import from this file.
 */

// ─── Colors ───────────────────────────────────────────────────────
// Navy-tinted dark palette. Surfaces derive from #0B1472 so the app
// feels richly branded instead of purely black.
// Primary (Warm Gold) = high-value actions & finalized moments.
// Secondary (Clear Blue) = AI features, active states, labels.

export const colors = {
  /** Surface hierarchy — darkest to lightest, tonal navy layering */
  surface: {
    base: '#05081A',             // Near-black navy base
    dim: '#080D22',              // Deep navy default surface
    bright: '#1E2B60',           // Brighter navy for emphasis areas
    containerLowest: '#060A1C',
    containerLow: '#0B1030',
    container: '#0E1640',        // Main card / panel background
    containerHigh: '#131C52',
    containerHighest: '#182460',
    default: '#080D22',
  },

  /** Content colors on navy surfaces */
  onSurface: '#EDE9FC',          // Soft lavender-white — high contrast on navy
  onSurfaceVariant: '#B8B2D8',   // Muted lavender for secondary text
  inverseSurface: '#EDE9FC',
  inverseOnSurface: '#1A1A40',

  /** Outlines — brand gray as the neutral boundary definition */
  outline: '#9d9d9d',            // Brand accent gray
  outlineVariant: '#2E3670',     // Navy-tinted muted outline

  /** Surface tint — gold tint for elevated surfaces */
  surfaceTint: '#cba864',

  /** Primary — Warm Gold: high-value actions, buttons, highlights */
  primary: '#cba864',
  onPrimary: '#3A2800',          // Dark brown for text on gold
  primaryContainer: '#7A5A28',   // Deeper gold for containers
  onPrimaryContainer: '#F5E0A8', // Light gold text on dark container
  inversePrimary: '#4A3200',

  /** Secondary — Clear Blue: AI features, labels, active states */
  secondary: '#7B93E8',          // Medium blue derived from brand navy
  onSecondary: '#0A1060',
  secondaryContainer: '#0B1472', // Pure brand navy as container
  onSecondaryContainer: '#C0CCFF',

  /** Tertiary — cool sky blue accent */
  tertiary: '#A8C8FF',
  onTertiary: '#0A2060',
  tertiaryContainer: '#1A3080',
  onTertiaryContainer: '#C8DCFF',

  /** Error states */
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',

  /** Fixed variants — stable color references */
  primaryFixed: '#F5DFA8',
  primaryFixedDim: '#D4AC5A',
  onPrimaryFixed: '#2A1800',
  onPrimaryFixedVariant: '#4A3000',

  secondaryFixed: '#C8D4FF',
  secondaryFixedDim: '#8898E8',
  onSecondaryFixed: '#050840',
  onSecondaryFixedVariant: '#0B1472',

  tertiaryFixed: '#D0E0FF',
  tertiaryFixedDim: '#90B4FF',
  onTertiaryFixed: '#001840',
  onTertiaryFixedVariant: '#182868',

  /** Background */
  background: '#080D22',
  onBackground: '#EDE9FC',

  /** Surface variant */
  surfaceVariant: '#182460',
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

// ─── Fluid Type Scale ("The Keynote Stage") ──────────────────────
// A single defined scale for the redesigned shell. Display/hero uses
// Newsreader (serif); UI uses Inter (sans). Uppercase-letterspaced
// treatment is reserved for the ≤13px `label` tier ONLY.
//   hero    64 → 48 (Newsreader 500)
//   section 32 (Newsreader/Inter)
//   body    20 (Newsreader serif reading)
//   ui      16 (Inter)
//   label   13 (Inter, uppercase-letterspaced — labels only)

export const typeScale = {
  hero: {
    fontFamily: 'var(--font-newsreader)',
    fontSize: 'clamp(2.5rem, 5vw + 1rem, 4rem)', // 40 → 64px
    fontWeight: 500,
    lineHeight: 1.05,
    letterSpacing: '-0.02em',
  } as const,
  section: {
    fontFamily: 'var(--font-newsreader)',
    fontSize: 'clamp(1.75rem, 2.5vw + 0.75rem, 2rem)', // 28 → 32px
    fontWeight: 500,
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  } as const,
  bodySerif: {
    fontFamily: 'var(--font-newsreader)',
    fontSize: 'clamp(1.125rem, 1vw + 0.9rem, 1.25rem)', // 18 → 20px
    fontWeight: 400,
    lineHeight: 1.7,
    letterSpacing: '0',
  } as const,
  ui: {
    fontFamily: 'var(--font-inter)',
    fontSize: '1rem', // 16px
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0',
  } as const,
  label: {
    fontFamily: 'var(--font-inter)',
    fontSize: '0.8125rem', // 13px
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
  } as const,
} as const;

// ─── Border Radius ───────────────────────────────────────────────
export const radius = {
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  full: '9999px',
} as const;

// ─── Spacing ─────────────────────────────────────────────────────
export const spacing = {
  unit: '4px',
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '48px',
  xxl: '80px',
  containerMax: '1200px',
  gutter: '24px',
} as const;

// ─── Elevation (Tonal Layering) ───────────────────────────────────
// NO shadows. Visual hierarchy through tonal navy differences only.

export const elevation = {
  base: '#05081A',
  surface: '#0B1236',
  accent: '#131C52',
  border: '#131C52',
} as const;

// ─── Glassmorphism ────────────────────────────────────────────────
// Navy-tinted glass for the floating audio player & sticky nav.

export const glassmorphism = {
  backdropBlur: '12px',
  background: 'rgba(11, 20, 114, 0.30)',    // Navy-tinted glass
  border: '1px solid rgba(203, 168, 100, 0.20)', // Gold-tinted border
} as const;

// ─── Progress Bar ─────────────────────────────────────────────────
// Navy → Gold gradient: brand journey metaphor.

export const progressBar = {
  fillFrom: '#0B1472',  // Brand navy start
  fillTo: '#cba864',    // Brand gold finish
} as const;

// ─── Font CSS Variables ──────────────────────────────────────────
export const fontVars = {
  inter: '--font-inter',
  newsreader: '--font-newsreader',
} as const;
