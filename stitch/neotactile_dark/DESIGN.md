```markdown
# Design System Specification: Tactile Maximalism

## 1. Overview & Creative North Star
**Creative North Star: The Kinetic Gallery**

This design system is not a utility; it is a performance. Moving away from the "flat" exhaustion of modern SaaS, this system embraces **Tactile Maximalism**. It treats the screen as a physical space—a high-tech gallery where information isn't just displayed, it is curated within a 3D environment. 

By blending the aggressive precision of NeoPOP with the softness of frosted glass and "clay-morphic" surfaces, we create an interface that feels expensive, responsive, and deeply intentional. We break the "template" look through a **Bento-Grid** modularity, using intentional asymmetry and kinetic typography scales to guide the eye through a high-art travel experience.

---

## 2. Color Architecture & Surface Philosophy
The palette is built on a foundation of "Absolute Depth," using deep blacks and charcoal grays to allow neon accents to vibrate with maximum luminosity.

### The Palette
*   **Base:** `background (#0e0e0e)` and `surface_container_lowest (#000000)`.
*   **Accents:** 
    *   **Electric Blue:** `primary (#8ff5ff)` — For primary navigation and "Action" states.
    *   **Acid Green:** `secondary (#c3f400)` — For success states, bookings, and growth metrics.
    *   **Hot Pink:** `tertiary (#ff51fa)` — For high-energy highlights, favorites, and "surprise" editorial moments.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning content. Boundaries must be defined through background color shifts. A section does not "end" with a line; it transitions from `surface_container_low` to `surface_container_highest`. 

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to create "nested" depth:
1.  **Level 0 (Foundation):** `surface` (#0e0e0e)
2.  **Level 1 (Sections):** `surface_container_low` (#131313)
3.  **Level 2 (Cards):** `surface_container` (#191919)
4.  **Level 3 (Interactive Elements):** `surface_container_highest` (#262626)

### The "Glass & Gradient" Rule
To achieve a "Tactile Maximalism" feel, floating elements (Modals, Hover Cards) must utilize **Glassmorphism**. 
*   **Recipe:** `surface_variant` at 40% opacity + 20px Backdrop Blur + a `primary` or `secondary` subtle inner-glow.
*   **Signature Textures:** Main CTAs should use a linear gradient from `primary` to `primary_container` to provide visual "soul" and a sense of brushed-chrome illumination.

---

## 3. Typography: Kinetic Hierarchy
Typography is the "architecture" of this system. We use a dual-font strategy to balance high-tech precision with editorial elegance.

*   **Display & Headlines (Space Grotesk):** This is our "Kinetic" voice. Use `display-lg` (3.5rem) and `headline-lg` (2rem) with tight letter-spacing (-0.02em). These headers should feel massive and authoritative, often breaking the grid or overlapping container edges.
*   **Title & Body (Manrope):** Our "Workhorse" font. Manrope provides a premium, modern sans-serif feel for readability. `title-lg` (1.375rem) handles card headers, while `body-md` (0.875rem) ensures long-form travel itineraries remain legible.
*   **Labels (Inter):** For micro-data, utility links, and tags. Use `label-md` (0.75rem) in All-Caps for a technical, "instrument panel" aesthetic.

---

## 4. Elevation & Depth: Tonal Layering
We move beyond standard drop shadows to create a physical "topography."

*   **The Layering Principle:** Depth is achieved by "stacking." A `surface_container_lowest` card sitting on a `surface_container_low` section creates a recessed, "carved-out" look. Conversely, a `surface_container_high` card on a `surface` foundation creates a soft, natural lift.
*   **Ambient Shadows:** For "floating" components, use multi-layered, extra-diffused shadows. 
    *   *Shadow 1:* 0px 4px 20px (4% opacity `on_surface`)
    *   *Shadow 2:* 0px 12px 40px (8% opacity `on_surface`)
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline_variant` at 15% opacity. Never use 100% opaque borders.
*   **Brushed Chrome & Soft-Touch Clay:** 
    *   **Chrome:** A sharp, 1px inner-top-stroke using `primary` at 30% opacity on a dark button creates a "metallic edge."
    *   **Clay:** Use high-radius corners (`xl: 0.75rem`) with a subtle inner-shadow to make buttons feel "pressable" and soft.

---

## 5. Component Logic

### Buttons
*   **Primary:** High-contrast `secondary` (Acid Green) background. Use `on_secondary` for text. Apply a "brushed chrome" top-inner-highlight.
*   **Secondary (Glass):** Semi-transparent `surface_variant` with a 40px backdrop blur. 
*   **Tertiary:** Ghost style. No background, `primary` (Electric Blue) text, with a kinetic underline on hover.

### Bento Cards
Cards must follow the **Bento-Grid** layout.
*   **Constraint:** Use `roundedness-xl` (0.75rem). 
*   **Separation:** Forbid divider lines. Use vertical white space or a shift from `surface_container` to `surface_container_highest` to separate content blocks within the card.

### Input Fields
*   **State:** "Etched" look. 
*   **Background:** `surface_container_lowest` (Absolute Black).
*   **Focus:** Change the "Ghost Border" from `outline_variant` to a glowing `primary` (Electric Blue) with a 4px outer-glow (spread).

### Signature Travel Components
*   **The Itinerary Timeline:** Do not use a vertical line. Use "Tonal Steps"—each day is a new `surface_container` block with an overlapping `display-sm` date.
*   **Glass Tooltips:** Floating hints using `surface_bright` at 60% opacity with a heavy blur, appearing to float 20px above the UI plane.

---

## 6. Do's and Don'ts

### Do
*   **Do** embrace asymmetry. Allow images to bleed off the edge of a Bento-grid container.
*   **Do** use neon accents sparingly. If everything is neon, nothing is neon.
*   **Do** use high-contrast typography scales (e.g., a huge headline next to tiny, technical label text).
*   **Do** experiment with "Overlapping." Let a high-res image of a destination overlap two grid cells.

### Don't
*   **Don't** use 1px solid borders to separate sections.
*   **Don't** use standard grey shadows. Use tinted, diffused ambient shadows.
*   **Don't** use default "Material" spacing. Use wide, editorial gutters to let the "Tactile" surfaces breathe.
*   **Don't** use pure white text for everything. Use `on_surface_variant` (#ababab) for secondary info to maintain the dark-mode premium feel.```