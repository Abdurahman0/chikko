# Design System Strategy: High-Precision CRM

## 1. Overview & Creative North Star
**Creative North Star: The Executive Lens**
The objective for this design system is to transcend the "generic SaaS" aesthetic by adopting a high-precision, editorial approach to CRM data. Instead of a cluttered dashboard, we treat the interface as a high-end financial publication—where whitespace is a functional tool and typography establishes an immediate sense of authority.

We break the "template" look through **Intentional Asymmetry** and **Tonal Depth**. By moving away from rigid 1px borders and toward layered surfaces, we create a UI that feels "carved" rather than "drawn." The experience must feel operational yet premium, inspired by the efficiency of Linear and the polish of Stripe.

---

## 2. Colors & Surface Architecture
The palette is built on a foundation of cool slates and a high-energy primary blue, utilizing Material Design layering logic to define hierarchy.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off major layout areas. 
- Boundaries must be defined through background color shifts.
- Use `surface_container_low` (#f2f4f6) for sidebar/navigation areas sitting against a `surface` (#f7f9fb) main stage.
- Separation is achieved through the proximity of tonal shifts, not "containers with lines."

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use a "Nested Elevation" model:
1.  **Base Layer:** `surface` (#f7f9fb) — The canvas.
2.  **Sectional Layer:** `surface_container` (#eceef0) — Used for grouping related content blocks.
3.  **Actionable Layer:** `surface_container_lowest` (#ffffff) — Reserved for cards, inputs, and primary data containers. This "pops" against the darker background without needing a shadow.

### Signature Textures
- **The Gloss Factor:** For main CTAs, use a subtle linear gradient: `primary_container` (#2563eb) to `primary` (#004ac6). This adds a "weighted" feel that flat hex codes lack.
- **Glassmorphism:** For floating modals or "always-on-top" navigation, use `surface_container_lowest` at 80% opacity with a `20px` backdrop-blur to maintain context of the data beneath.

---

## 3. Typography: The Editorial Scale
We utilize a dual-font system to balance "Brand" and "Utility."

*   **Manrope (Display & Headlines):** Used for high-level data points and section headers. Its geometric nature feels modern and confident.
    *   *Headline-LG (2rem):* For primary dashboard titles.
    *   *Display-SM (2.25rem):* For hero KPI numbers (Revenue, Deal Flow).
*   **Inter (UI & Body):** The workhorse for data density.
    *   *Body-MD (0.875rem):* The standard for CRM tables and CRM notes.
    *   *Label-SM (0.6875rem):* Uppercase with 0.05em letter spacing for metadata and table headers to ensure a "compact" operational feel.

**Hierarchy Note:** Always prioritize weight over size. A `title-sm` in Semi-Bold is more effective for high-density sales data than a large Light-weight font.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering**, not structural scaffolding.

*   **The Layering Principle:** Place a `surface_container_lowest` card (White) on top of a `surface_container_low` background. The contrast (white on off-white) creates a "Soft Lift" that is easier on the eyes than a drop shadow during 8-hour workdays.
*   **Ambient Shadows:** For "Floating" elements (Popovers, Tooltips), use an extra-diffused shadow:
    *   `Y: 8px, Blur: 24px, Color: on_surface @ 6% opacity`.
    *   Shadows should be tinted with the `on_surface` (#191c1e) color to feel integrated with the charcoal text.
*   **The Ghost Border Fallback:** If a border is required for accessibility (e.g., in high-contrast modes), use `outline_variant` at **20% opacity**. Never use a 100% opaque border for containers.

---

## 5. Components & Interaction Patterns

### KPI Cards (The Pulse)
- **Structure:** No borders. Use `xl` (1.5rem) rounded corners.
- **Background:** `surface_container_lowest` (#ffffff).
- **Data:** Use `display-sm` for the primary metric. Integrate a "Sparkline" chart using a `primary` stroke (2px width) with no fill to keep it clean.

### Data Tables (The Engine)
- **Rows:** Avoid horizontal divider lines. Use a `4px` vertical gap between rows and apply `surface_container_high` on `:hover`.
- **Status Badges:** Pill-style (Round `full`). Use `secondary_container` with `on_secondary_container` text. For "High Priority," use `tertiary_fixed_dim` with a `2px` inner glow.

### Buttons & Inputs
- **Primary Button:** `primary_container` (#2563eb), `lg` (1rem) corner radius. Use `primary_fixed` for the hover state to create a "glow" effect.
- **Inputs:** Use `surface_container_highest` for the background. On focus, transition to a `2px` "Ghost Border" using the `primary` color.

### Charts
- **Palette:** Utilize the `tertiary` (#943700) for "Warning/Attention" data and `primary` (#004ac6) for growth.
- **Style:** Area charts should use a 10% opacity fill of the line color to maintain the "Glass" aesthetic.

---

## 6. Do’s and Don’ts

### Do
- **Do** use `8px` (0.9rem) increments for all spacing to maintain a mathematical rhythm.
- **Do** use `16px-20px` (`lg` to `xl`) radii for large containers to soften the "enterprise" feel.
- **Do** prioritize "Negative Space" over "Dividing Lines." If a section feels messy, add `2.75rem` (12) of padding rather than a line.

### Don't
- **Don't** use pure black (#000000). Use `on_surface` (#191c1e) for all primary text to maintain a premium charcoal tone.
- **Don't** use standard "Drop Shadows" on cards. Rely on the "Soft Lift" of white-on-gray layering.
- **Don't** use high-saturation reds for errors. Use `error` (#ba1a1a) which is balanced for a professional light theme.

---
*Director's Final Note: This system is about the "In-Between." It’s the space between the data that makes a CRM premium. Focus on the transitions and the breathing room.*

