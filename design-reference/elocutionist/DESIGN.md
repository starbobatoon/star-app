---
name: Star Speaker App
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#bfcdff'
  on-tertiary: '#082b72'
  tertiary-container: '#97b0ff'
  on-tertiary-container: '#254188'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#27438a'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  h1:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  transcript-display:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  transcript-body:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.8'
    letterSpacing: '0'
  ui-body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  ui-label:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: '0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  xxl: 80px
  container-max: 1200px
  gutter: 24px
---

## Brand & Style

This design system is built on the principles of **Minimalism** and **Deep Focus**, designed to evoke the quiet confidence of a high-end atelier. The brand personality is intellectual, precise, and sophisticated, targeting speechwriters, executives, and public figures who require a distraction-free environment for high-stakes composition.

The visual language utilizes heavy whitespace (or "dark space") and a limited color palette to ensure the user's attention remains entirely on the spoken and written word. It blends modern digital precision with a classic literary soul, creating a "Digital Study" feel where the technology serves the craft of rhetoric.

## Colors

The palette is a sophisticated dark mode composed of layered "Ink" and "Charcoal" tones. The background uses a near-black (`#0A0A0A`) to provide infinite depth, while surfaces utilize slightly lighter charcoals to create subtle hierarchy.

- **Primary (Soft Gold):** Used sparingly for high-value actions, successful states, and "finalized" moments. It represents the value of the final speech.
- **Accent (Electric Indigo):** Used for AI-driven features, active states, and focus indicators to provide a modern, technical spark.
- **Neutral:** A range of cool-toned grays that manage the information density without introducing visual noise.

## Typography

This system employs a dual-font strategy to differentiate between the *Application* and the *Artifact*.

1.  **Inter (Sans-Serif):** Handles all UI elements, navigation, admin panels, and metadata. It provides a functional, systematic feel that recedes into the background.
2.  **Newsreader (Serif):** Reserved exclusively for the actual speech content and transcripts. This adds a literary, authoritative character to the writing experience, making the user feel like they are crafting an important document rather than just filling an input field.

Line heights for the serif fonts are generous to ensure maximum readability during speech practice or editing.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** model for the core editing and writing experience to maintain a focused, typewriter-like column in the center of the screen.

- **Main Editor:** Uses a centered single-column layout (max-width 720px) to eliminate eye strain.
- **Admin Panel:** Uses a 12-column fluid grid to handle denser information like user lists, speech archives, and analytics.
- **Spacing Rhythm:** Based on an 8px scale. Large `xl` and `xxl` values are used between major sections to emphasize the minimalist aesthetic and give the content room to breathe.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering** rather than traditional shadows. This keeps the interface feeling "flat" and modern.

1.  **Base Layer:** The darkest tone (#0A0A0A).
2.  **Surface Layer:** Slightly lighter (#1A1A1A) for cards and containers.
3.  **Accent Layer:** Subtle high-contrast outlines (1px solid #2A2A2A) are used to define boundaries without adding bulk.
4.  **Glassmorphism:** Reserved for the Audio Player and sticky navigation bars. A backdrop blur of 12px with a 10% white tint creates a sense of floating, premium utility without breaking the dark aesthetic.

## Shapes

The design system uses **Soft (0.25rem)** roundedness for a precise, architectural feel. 

- **Standard Elements:** Inputs, buttons, and small cards use 4px (`rounded`) corners.
- **Containers:** Larger modules and admin panels use 8px (`rounded-lg`) corners.
- **Progress Bars:** These are the exception, utilizing a fully pill-shaped (rounded-full) geometry to convey fluid motion and "flow."
- **Interactive States:** When hovered, cards should not lift but rather change their border color to the secondary or primary accent.

## Components

### Buttons
- **Primary:** Solid Soft Gold with black text for "Finalize" or "Download."
- **Secondary:** Ghost style with 1px charcoal border and Electric Indigo text on hover.
- **Tertiary:** Text-only with letter-spaced uppercase labels for navigation.

### Minimalist Cards
Cards are flat surfaces with a 1px border. They contain no shadows. Padding is generous (minimum 24px) to ensure content clarity.

### Questionnaire Progress Indicators
A horizontal linear bar at the top of the viewport. The track is deep charcoal, and the progress fill is a gradient from Electric Indigo to Soft Gold, moving smoothly with CSS transitions.

### Sophisticated Audio Player
A floating, translucent bar at the bottom of the screen. Controls are minimalist icons (Play, Pause, Scrub). The waveform visualization uses thin, vertical Indigo lines that animate subtly during playback.

### Input Fields
Underline-only or very subtle border-bottom inputs to mimic a physical sheet of paper. Focus states transition the underline color to Electric Indigo.

### Admin Panel
The admin panel shifts to a higher density. It utilizes Inter for all data points and uses the Neutral palette heavily, reserving the primary Gold and Indigo only for status indicators and primary action buttons.