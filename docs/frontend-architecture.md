# Frontend Architecture

Next.js owns document rendering, route entry points, metadata, and build boundaries. Route files are composition layers; feature modules under `ui/features/<domain>/` own typed API adapters, query keys, queries, mutations, schemas, and domain presentation. Shared composition is focused and `ui/components/ui/` remains the shadcn primitive boundary.

TanStack Query owns remote data, cache lifetimes, request status, and mutation state. Zustand owns only active phase, development session identity, and route-adjacent preferences. URL state owns shareable overlays; `?ask=1` is the canonical Ask-sheet representation. The versioned offline roadmap store remains the persistence and replay boundary for the last safe roadmap and idempotent card actions; it must not cache Ask questions or protected context.

Query keys are stable factories: `roadmap.detail(userId, phaseId, stage)`, `enrollment.detail(userId, phaseId)`, and `phase.detail(phaseId)`. Mutation keys identify `roadmap.action`, `roadmap.fold`, `enrollment.save`, and `ask.submit`. Reads use bounded transient retry; mutations do not retry automatically and must reconcile, queue safely, or roll back.

`ui/DESIGN.md` is the product design contract and `ui/app/globals.css` is the runtime source for semantic variables and Tailwind mappings. Components use semantic tokens, the shared spacing/radius scale, and no literal colors or decorative animation. Supported API mappings and deferred contracts remain in [`frontend-contracts.md`](frontend-contracts.md).
