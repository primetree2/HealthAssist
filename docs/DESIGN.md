# Soft aurora identity — 2.0.1

The original project's moving multicolor treatment is retained as a quieter visual signature, not a full-screen animation. No external graphics, fonts, animation library, canvas or model calls are required.

## Placement

- **Wordmark:** a slow, pale sage/teal/lilac gradient inside “assist”; the brand icon has a complementary static two-tone fill.
- **Welcome:** a soft masked glow behind the editorial headline, with a darker moving gradient on “Better connected.” in light mode and a lighter equivalent in dark mode.
- **Overview:** a faint right-edge echo in the context card. Text and controls remain on their own foreground layer.
- **Task surfaces:** no ambient background in check-in forms, the lab notebook, timeline entries, visit notes, error banners or dialogs. Global wordmark remains consistent.

## Motion and accessibility

- Ambient ribbons drift over 24–32 seconds, with offset phases; the small text gradient shifts over 21 seconds. No flashing, parallax or information conveyed through movement.
- A sidebar **Pause aurora / Resume aurora** button pauses all aurora animations in the current page session. This visual preference is held in memory, not added to the health vault or sent to a server.
- `prefers-reduced-motion: reduce` disables these animations in CSS, including before JavaScript hydrates. The control reflects the system setting and cannot override it.
- Decorative layers use `aria-hidden`, ignore pointer input, and cannot block controls.
- Forced-colors mode removes the glow and restores solid system text colors.
- Narrow screens use a smaller/lower-opacity glow; dark mode lowers glow opacity and uses separately chosen text colors rather than mechanically inverting the palette.

## Implementation

- `components/aurora.tsx`: small decorative component; explicit welcome/card variants.
- `app/globals.css`: masked radial layers, transform-only ribbon movement, small-area gradient-text movement, motion/fallback rules.
- `components/workspace.tsx`: placements and page-scoped pause/system preference state.
- `e2e/aurora.spec.ts`: desktop/mobile decorative, pause, reduced-motion and task-surface regression checks.

Blur radii are static; the large ambient layers move using CSS transforms. There is no JavaScript animation loop. This avoids unnecessary animation dependencies but is not a measured performance benchmark—test on representative low-end devices before broader release.
