---
name: Velocity Talent
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3d4a3d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6d7b6c'
  outline-variant: '#bccbb9'
  surface-tint: '#006e2e'
  primary: '#006e2e'
  on-primary: '#ffffff'
  primary-container: '#00b14f'
  on-primary-container: '#003a15'
  inverse-primary: '#52e078'
  secondary: '#2a6951'
  on-secondary: '#ffffff'
  secondary-container: '#adedcf'
  on-secondary-container: '#2f6e55'
  tertiary: '#545f73'
  on-tertiary: '#ffffff'
  tertiary-container: '#8f9ab0'
  on-tertiary-container: '#273244'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#71fe91'
  primary-fixed-dim: '#52e078'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005321'
  secondary-fixed: '#aff0d2'
  secondary-fixed-dim: '#94d4b6'
  on-secondary-fixed: '#002115'
  on-secondary-fixed-variant: '#0a513b'
  tertiary-fixed: '#d8e3fb'
  tertiary-fixed-dim: '#bcc7de'
  on-tertiary-fixed: '#111c2d'
  on-tertiary-fixed-variant: '#3c475a'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style

The design system is engineered for a high-converting HR-tech platform that balances professional authority with modern efficiency. The brand personality is trustworthy, precise, and empowering, positioning the product as a career catalyst for candidates and a precision tool for recruiters.

The design style follows a **Modern Corporate** aesthetic with a strong emphasis on clarity and high-contrast accessibility. It utilizes generous white space to reduce cognitive load during complex tasks like resume building or application tracking. Subtle tactile cues, such as soft shadows and intentional color pops, guide the user toward primary conversion actions without sacrificing the serious tone required by the recruitment industry.

## Colors

This design system utilizes a tiered green palette to establish brand recognition and functional hierarchy.

*   **Primary (#00B14F):** "Velocity Green." Used for primary call-to-actions, progress indicators, and success states. It is optimized for high visibility against both white and dark slate backgrounds.
*   **Secondary (#054E38):** "Deep Forest." Used for navigation headers, footer backgrounds, and secondary accents to provide a sense of stability and institutional trust.
*   **Neutral Text (#1E293B):** A dark slate grey used for all primary body copy and headings to ensure maximum readability and a softer appearance than pure black.
*   **Backgrounds (#F8FAFC / #F1F5F9):** Cool-toned neutral grays used to differentiate sections and provide a clean canvas for content cards.

## Typography

The typography relies exclusively on **Inter** to maintain a systematic, utilitarian feel that scales perfectly from dense data tables to bold marketing headlines. 

Negative letter-spacing is applied to larger display sizes to maintain visual tension and high-end editorial feel. For body text, a standard line height of 1.5x ensures comfortable long-form reading during resume reviews. Labels use a slightly heavier weight and increased tracking to provide clear "signposting" within complex interfaces.

## Layout & Spacing

This design system employs a **12-column fluid grid** for desktop and a **4-column grid** for mobile. The spacing rhythm is strictly based on an 8px baseline grid to ensure vertical alignment across all components.

*   **Desktop:** 1280px max-width container with 24px gutters. Content should be centered with 32px side margins.
*   **Tablet:** 8-column layout with 20px gutters. 
*   **Mobile:** 4-column layout with 16px gutters and 16px margins. 

Vertical spacing (Stacking) follows a predictable scale: use 12px for internal component spacing (e.g., icon to text) and 24px-48px for section separation.

## Elevation & Depth

To maintain a professional HR-tech feel, elevation is used sparingly to signify interactivity and priority. 

1.  **Level 0 (Flat):** Used for the main canvas and background sections (#F8FAFC).
2.  **Level 1 (Surface):** White containers (#FFFFFF) with a 1px border (#E2E8F0). No shadow. Used for secondary content cards.
3.  **Level 2 (Raised):** White containers with a soft, diffused shadow: `0px 4px 12px rgba(0, 0, 0, 0.05)`. Used for primary interactive cards, such as Job Listings or Profile Cards.
4.  **Level 3 (Overlay):** Used for Modals and Dropdowns. Intense diffusion: `0px 12px 32px rgba(0, 0, 0, 0.1)`.

Backdrop blurs (12px) are used behind modals to maintain context while focusing user attention on the task at hand.

## Shapes

The shape language utilizes "Rounded" settings (8px to 12px) to soften the professional aesthetic and make the platform feel more approachable.

*   **Buttons & Inputs:** 8px (rounded-md) to provide a crisp, modern look.
*   **Cards & Modals:** 12px (rounded-lg) to create a distinct containerized feel.
*   **Avatars & Status Badges:** 100% (pill-shaped) to differentiate human elements and categorical tags from structural UI components.

## Components

### Buttons
*   **Primary:** Velocity Green background with White text. 8px corner radius. Bold weight. High-contrast hover state (darkens to #008F3F).
*   **Secondary:** White background with 1px border (#CBD5E1) and Dark Slate text (#1E293B). 
*   **Ghost:** Transparent background with Primary Green text. Used for less urgent actions.

### Input Fields
Inputs use a white background with a 1px border (#E2E8F0). On focus, the border shifts to Primary Green with a 2px soft outer glow. Labels are positioned above the field in `label-sm` style.

### Cards
Cards are the primary vehicle for job listings and candidate profiles. They feature a white background, Level 2 shadow, and 12px corner radius. Internal padding is strictly 24px.

### Chips & Badges
Small, pill-shaped components used for job categories (e.g., "Full-time"). Use a light tint of the primary color (background: #E6F7ED, text: #054E38) to keep them legible but secondary to the main text.

### Progress Indicators
Critical for resume builders. Use a thick 8px track with a Velocity Green fill to indicate completion percentage, providing immediate visual feedback and encouragement.