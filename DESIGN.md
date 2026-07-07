# Itinerary Mate Design System

## Intent

Itinerary Mate should feel like a calm travel cockpit: structured, quick to scan, warm enough for personal trips, and restrained enough to trust with costs and bookings.

## Visual Strategy

- Product register, restrained color strategy.
- Tinted neutral surfaces with one trip accent at a time.
- No large decorative placeholder graphics. Use real destination imagery or compact missing-image states.
- Cards are for itinerary items, repeated objects, forms, and maps. Page sections should be grouped with spacing and 1px borders, not nested cards.

## Color

- Keep trip accents per destination, but harmonize shared UI around tinted neutrals.
- Use semantic roles: surface, surface-strong, line, muted text, accent, warning, danger, success.
- Accent color is for active nav, primary actions, selected filters, and key status.
- Avoid purple/blue gradients, neon glow, pure black, and pure white.

## Typography

- Use one high-quality sans/system stack for product clarity.
- Fixed scale, no viewport-scaling text.
- Dense surfaces use compact headings and tabular numbers.
- Every heading should introduce a real section, not restate body copy.

## Layout

- Mobile-first.
- Default mobile flow: trip header, nav, next action, day/map/list content.
- Desktop flow: broad content column with optional supporting rail.
- Keep action controls close to the thing they affect.
- Avoid equal metric grids when only two or three facts matter.

## Motion

- Motion conveys state, continuity, or feedback.
- Preferred durations: 150-260ms for controls, 260-360ms for card expansion or view entry.
- Animate transform and opacity only.
- Use subtle staggered reveals for day cards and itinerary items.
- Respect `prefers-reduced-motion`.
- Do not animate page load as a performance showpiece.

## Components

- Primary button: one per local action group.
- Ghost button: secondary actions such as open, copy, reset, map.
- Icon button: compact card actions with accessible title or label.
- Segmented controls: mode switches and small option sets.
- Inline sheets/details: editing, notes, metadata, and image fields.
- Expense rows: label, city/category, CAD amount, local subtext.
- Missing image state: compact message plus image URL field when editing.

## Accessibility

- Maintain 44px minimum touch targets.
- Keep visible labels for all inputs.
- Preserve focus rings.
- Do not rely on color alone for status.
- Use `prefers-reduced-motion` to stop nonessential transitions and animations.

