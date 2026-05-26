# CLAUDE.md

We're building the app described in @PLAN.MD. Read that for architecture, DB structure, and tech stack.

Keep replies concise. No unnecessary fluff.

## Docs

Before writing any code, always check `docs/` for standards:

- `docs/routing.md` — Route structure, protection, auth helpers
- `docs/ui.md` — UI standards (component library, styling, layout patterns)
- `docs/code-layout.md` — Where things live: route folders, components, lib modules, tests
- `docs/validation.md` — react-hook-form, Zod, error display

## Commands

```bash
npm run dev      # Dev server (Turbopack, http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
npm run test     # Vitest
```

Import alias `@/*` → `./src/*`.

## Architecture

Next.js 16.2 App Router · TypeScript · Tailwind CSS v4 · React 19.2

- `src/app/` — layouts, pages, `globals.css`
- `public/` — static assets served from root path
- `next.config.ts` — typed config (no `webpack` key — breaks Turbopack)
- `eslint.config.mjs` — flat config only

## Next.js 16 Breaking Changes

**Async APIs** — `cookies()`, `headers()`, `params`, `searchParams` must be `await`ed.

**Proxy** — `middleware.ts` → `proxy.ts`; export `proxy` not `middleware`; no edge runtime.

**Removed** — `next lint` (use `eslint`), `serverRuntimeConfig`/`publicRuntimeConfig` (use `process.env`).

**Cache** — `revalidateTag('key', 'max')`; use `updateTag` in Server Actions for immediate updates; drop `unstable_` prefix from `cacheLife`/`cacheTag`.

**PPR** — replaced by `cacheComponents: true` in `next.config.ts`.

**Parallel routes** — every `@slot` needs an explicit `default.js`.

**Images** — use `next/image`; `images.domains` → `images.remotePatterns`.
