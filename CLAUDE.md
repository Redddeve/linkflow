# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Docs

Before writing any code, always check the `docs/` directory for a relevant standards document and follow it. Current docs:

- `docs/auth.md` — Auth standards (Clerk provider, middleware, server auth, UI components)
- `docs/routing.md` — Routing standards (route structure, protected /dashboard routes, middleware)

## Commands

```bash
npm run dev      # Start dev server (Turbopack, http://localhost:3000)
npm run build    # Production build (also uses Turbopack by default)
npm run start    # Start production server
npm run lint     # Run ESLint (note: build no longer runs lint automatically)
```

Import alias `@/*` maps to `./src/*`.

## Architecture

Next.js 16.2 App Router project with TypeScript, Tailwind CSS v4, and React 19.2.

- `src/app/` — App Router: `layout.tsx` (root layout), `page.tsx` (home), `globals.css` (Tailwind v4 via `@import "tailwindcss"`)
- `public/` — static assets served from root path
- `next.config.ts` — typed Next.js config
- `eslint.config.mjs` — ESLint flat config (required; legacy `.eslintrc` format is deprecated)

## Next.js 16 Breaking Changes

Before writing any code, read the relevant guide in `node_modules/next/dist/docs/`. Key breaking changes from v15:

**Async Request APIs** — `cookies()`, `headers()`, `draftMode()`, `params`, and `searchParams` are now async-only. Always `await` them:

```tsx
export default async function Page({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params;
}
```

Run `npx next typegen` to generate `PageProps`, `LayoutProps`, and `RouteContext` helpers.

**`middleware` renamed to `proxy`** — Rename `middleware.ts` → `proxy.ts` and the named export `middleware` → `proxy`. The edge runtime is not supported in `proxy`.

**`next lint` removed** — Use `eslint` directly (already reflected in `package.json` scripts). Do not add `eslint: {}` to `next.config.ts`.

**`serverRuntimeConfig` / `publicRuntimeConfig` removed** — Use `process.env` directly in Server Components; prefix client-accessible vars with `NEXT_PUBLIC_`.

**`revalidateTag` requires second argument** — `revalidateTag('key', 'max')`. For immediate updates use `updateTag` in Server Actions instead.

**`cacheLife` / `cacheTag`** — Stable; drop the `unstable_` prefix.

**PPR / `experimental.dynamicIO`** — Replaced by top-level `cacheComponents: true` in `next.config.ts`.

**Parallel routes** — All `@slot` directories now require an explicit `default.js`; builds fail without one.

**Turbopack is the default bundler** — Custom `webpack` config in `next.config.ts` will cause builds to fail. Use `turbopack` config at the top level (not under `experimental`).

**`next/legacy/image` deprecated** — Use `next/image`. Local images with query strings require `images.localPatterns.search` config. `images.domains` deprecated; use `images.remotePatterns`.
