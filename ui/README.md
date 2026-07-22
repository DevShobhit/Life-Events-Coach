Steady Path is the Next.js 16 frontend for the LifeCurriculum relocation MVP.

## Foundation

- Use Bun for installs, scripts, and the checked-in lockfile.
- The design contract lives in `DESIGN.md`; semantic tokens are defined in `app/globals.css`.
- shadcn primitives are sourced from the configured `base-nova` registry and installed `components/ui` set. This phase adds no duplicate primitives; later screens compose existing blocks first.
- Next 16 App Router documentation under `node_modules/next/dist/docs/` is the source of truth for framework APIs.

## Offline behavior

The last successful roadmap is cached locally by user and phase. Failed idempotent card actions are queued and replayed when the browser is online again. The service worker uses a network-first strategy for same-origin shell assets and does not cache API responses, questions, or protected context.

## Verification

```bash
bun test
bun run lint
bunx tsc --noEmit
bun run build
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
