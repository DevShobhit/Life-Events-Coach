---
name: Live Coach
colors:
  implementation: CSS custom properties in app/globals.css only
  semantic: background, foreground, surface, surface-container-low, surface-container, surface-container-high, surface-container-highest, card, popover, primary, secondary, muted, accent, destructive, border, input, ring
  product: attention, handled, hidden-factor, success
  rule: Components use semantic Tailwind token utilities, never literal color values or arbitrary color classes.
typography:
  headline-lg: { fontFamily: Manrope, fontSize: 32px, fontWeight: '500', lineHeight: 40px }
  headline-md: { fontFamily: Manrope, fontSize: 24px, fontWeight: '500', lineHeight: 32px }
  headline-sm: { fontFamily: Manrope, fontSize: 20px, fontWeight: '500', lineHeight: 28px }
  body-lg: { fontFamily: Manrope, fontSize: 18px, fontWeight: '400', lineHeight: 28px }
  body-md: { fontFamily: Manrope, fontSize: 16px, fontWeight: '400', lineHeight: 24px }
  label-md: { fontFamily: Manrope, fontSize: 14px, fontWeight: '500', lineHeight: 20px }
  label-sm: { fontFamily: Manrope, fontSize: 12px, fontWeight: '500', lineHeight: 16px }
rounded: { sm: 0.25rem, DEFAULT: 0.5rem, md: 0.75rem, lg: 1rem, xl: 1.5rem, full: 9999px }
spacing: { touch-target-min: 44px, gutter: 24px, margin-mobile: 16px, margin-desktop: 40px, stack-sm: 8px, stack-md: 16px, stack-lg: 32px }
---

## Brand & style

Steady Path is a calm, minimalist-professional coach, not an overwhelming course. Its visual language follows the mockups: a pale blue-white canvas, deep navy primary actions and headings, slate secondary text, restrained blue surface layers, and a warm amber tertiary note for human guidance. It uses generous whitespace, a low-density mobile-first layout, and clear, supportive writing at an 8th-grade reading level. Manrope uses only Regular (400) and Medium (500).

The mockups are used only as theme inspiration for the landing page. Do not copy their literal content, remote imagery, Material Symbols, unsupported features, or screen-specific composition into the product system.

## Tokens, layout, and components

Define light and dark semantic CSS variables in `app/globals.css`. The light theme uses the mockup palette: `#f8f9ff` background, `#002045` primary navy, `#d6e0f6` secondary blue, `#eff4ff` low surface, `#e5eeff` surface, `#dce9ff` high surface, `#43474e` muted text, and `#c4c6cf` outline. Map the product tokens `--attention`, `--handled`, `--hidden-factor`, and `--success` into Tailwind's `@theme inline` block. Components must not contain hex, RGB, HSL, OKLCH, or arbitrary color values. Use one global shadow token; cards never float aggressively.

Content has a 1200px desktop maximum width, 8px rhythm, 44px minimum targets, 16px mobile margins, and a one-column mobile layout. Use rounded cards and buttons with the global radius tokens. Prefer existing shadcn primitives/blocks before custom implementation and use `lucide-react` for every icon.

Visual-first cards accept typed data only: visual/icon, title, at most five bullets, why-now text, source tag/link, hidden-factor indicator, and actions. Source tags are tappable metadata; hidden factors pair an Eye or Spark icon with the hidden-factor token. Completed/handled states use the handled token and an icon/text label, never color alone.

## Interaction, feedback, and accessibility contract

- Every remote screen has first-load skeleton, actionable Retry error alert, meaningful empty state, and non-blocking updating state. User-facing error strings belong to a typed `errorMessages` configuration module keyed by stable API error codes; never show raw server text.
- Disable only the action being submitted, show an accessible spinner/status, and restore focus to the relevant card/control after success or failure. Do not block reading the roadmap while one action syncs.
- Success feedback is brief and calm: update the affected card/queue optimistically, announce it to assistive technology, and reconcile or roll back from the mutation result. “Not relevant” requires shadcn `AlertDialog` confirmation.
- Zustand owns only active phase, current route-adjacent preferences, and development session identity. Server data, pending mutations, and offline action queue have dedicated data-layer modules.
- Route/content changes are immediate. Permit only shadcn overlay/focus affordances and reduced-motion-safe loading indicators; do not add decorative animation or automatic carousels.
- Every control has a visible focus state, accessible name, keyboard support, 44px target, and token-based WCAG 2.1 AA contrast. Source links identify their destination and open safely.
