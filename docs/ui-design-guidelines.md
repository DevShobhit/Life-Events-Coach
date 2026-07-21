# UI Design Guidelines

- Use semantic utilities backed by `ui/app/globals.css`; components do not contain literal colors, arbitrary color values, or ad-hoc shadows.
- Keep the calm blue-white surface hierarchy: background for the page, low/container surfaces for grouping, and cards for primary content.
- Use the 8px rhythm, 16px mobile margins, 24px gutters, and a 1200px content maximum. Design mobile-first and preserve usable layouts at 320px, 768px, 1024px, and 1440px.
- Keep interactive targets at least 44px, provide visible focus, and pair status color with text or an icon.
- Use one page title, a clear heading hierarchy, Manrope at regular/medium weights, and concise supportive copy.
- Remote screens provide loading, retryable error, empty, updating, and success/rollback states. Never render raw API errors.
- Prefer existing shadcn primitives and Lucide icons. Use overlays only for focused decisions; route changes are immediate.
- Motion is functional and reduced-motion safe. Do not add decorative animation, automatic carousels, or aggressive card shadows.
