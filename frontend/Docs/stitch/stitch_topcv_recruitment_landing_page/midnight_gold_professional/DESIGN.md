---
name: Midnight & Gold Professional
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#45464d'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#76767e'
  outline-variant: '#c6c6ce'
  surface-tint: '#565d79'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131a33'
  on-primary-container: '#7b83a0'
  inverse-primary: '#bec5e5'
  secondary: '#545d7c'
  on-secondary: '#ffffff'
  secondary-container: '#d0d9fd'
  on-secondary-container: '#555e7d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#2c1603'
  on-tertiary-container: '#a07d5f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#bec5e5'
  on-primary-fixed: '#131a33'
  on-primary-fixed-variant: '#3e4660'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#bdc5e9'
  on-secondary-fixed: '#111a36'
  on-secondary-fixed-variant: '#3d4664'
  tertiary-fixed: '#ffdcc1'
  tertiary-fixed-dim: '#e8bf9d'
  on-tertiary-fixed: '#2c1603'
  on-tertiary-fixed-variant: '#5d4127'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is engineered for the high-end HR-tech sector, targeting enterprise decision-makers and modern professionals. The brand personality is authoritative yet innovative, blending the reliability of traditional corporate structures with the agility of modern technology. 

The visual style follows a **Corporate / Modern** aesthetic with a premium finish. It utilizes generous whitespace, precise alignment, and a sophisticated color palette to evoke an emotional response of trust, clarity, and exclusivity. Design elements focus on high-fidelity execution, using subtle metallic accents to highlight success and premium status within a highly functional, systematic framework.

## Colors
The palette is anchored by "Midnight Navy" for primary navigation and core branding to establish immediate authority. The "Muted Gold" accent is used sparingly for high-value actions, achievement states, and premium indicators, ensuring it feels like an elegant highlight rather than a dominant color.

- **Primary (#0B132B):** Used for headers, primary buttons, and heavy text.
- **Secondary (#1C2541):** Used for sidebars, sub-navigation, and secondary UI containers.
- **Accent (#C8963E):** Reserved for CTA highlights, progress indicators, and "Premium" tier features.
- **Background (#F8F9FA):** Provides a crisp, clean canvas that allows the dark blues to pop without causing eye strain.
- **Success/Error:** Use a desaturated emerald and a deep carmine to maintain the professional tone.

## Typography
This design system utilizes **Hanken Grotesk** for its sharp, contemporary geometry and exceptional legibility in data-heavy environments. The typographic hierarchy is strictly enforced to guide users through complex HR workflows.

Headlines should use tighter letter spacing to maintain a "locked-in" professional appearance. Body text maintains standard spacing for maximum readability in long-form reports. Labels and "Small" caps should be used for metadata and table headers to provide a clear distinction from interactive content.

## Layout & Spacing
The design system employs a **Fixed Grid** model for desktop to ensure a curated, dashboard-like experience that doesn't become overly diluted on ultra-wide monitors.

- **Desktop (1280px+):** 12-column grid with 24px gutters and 40px external margins.
- **Tablet (768px - 1279px):** 8-column grid with 20px gutters and 32px margins.
- **Mobile (Up to 767px):** 4-column fluid grid with 16px gutters and 16px margins.

Vertical rhythm is based on an 8px base unit. All component heights and internal padding must be multiples of 8 (e.g., 8, 16, 24, 32, 48, 64) to maintain mathematical harmony across the interface.

## Elevation & Depth
Hierarchy is conveyed through **Tonal Layers** and **Ambient Shadows**. Surfaces are tiered to create a sense of organized "stacking" without the clutter of heavy borders.

1.  **Level 0 (Background):** #F8F9FA.
2.  **Level 1 (Cards/Containers):** White (#FFFFFF) with a very soft, diffused shadow (0px 4px 20px rgba(11, 19, 43, 0.04)).
3.  **Level 2 (Dropdowns/Modals):** White (#FFFFFF) with a more pronounced shadow (0px 12px 32px rgba(11, 19, 43, 0.12)).

Interactive elements like cards should use a subtle 1px border (#E9ECEF) in their default state, which shifts to a Primary color border on hover to indicate focus.

## Shapes
The shape language is defined by a "Professional Softness." A corner radius of 8px (Standard) is applied to all primary UI elements including buttons, input fields, and cards. This balance avoids the coldness of sharp corners while remaining more structured and serious than fully pill-shaped "playful" designs.

- **Small elements (Checkboxes, Tags):** 4px radius.
- **Standard elements (Buttons, Inputs, Cards):** 8px radius.
- **Large elements (Modals, Feature Sections):** 12px-16px radius.

## Components
### Buttons
- **Primary:** Background #0B132B, Text #FFFFFF. High-gloss finish on hover.
- **Secondary:** Background transparent, Border 1px #0B132B, Text #0B132B.
- **Accent/Premium:** Background #C8963E, Text #FFFFFF. Used for "Upgrade" or "Finalize Hire" actions.

### Input Fields
Inputs use a white background with a 1px #DEE2E6 border. On focus, the border transitions to #0B132B with a 2px outer "glow" in a transparent navy. Labels are placed above the field in `label-md` weight.

### Cards
Cards are the primary container for data. They feature a white background, 8px corner radius, and a subtle #E9ECEF border. Section headers within cards should have a subtle bottom divider.

### Data Tables
Tables are critical for HR-tech. Use `label-sm` for headers with #6C757D color. Row hover states should use a light tint of #F1F3F5 to maintain orientation.

### Status Chips
- **Active:** Light Navy background with Primary Navy text.
- **Gold Tier:** Light Gold background with #C8963E text.
- **Standard:** Neutral Gray background with Secondary Navy text.