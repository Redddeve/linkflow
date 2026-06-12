# LinkFlow — Linkbuilding Operations Platform

A web-based internal platform that unifies all linkbuilding operations — from site sourcing and order creation through content writing, publication, invoicing, and sourcer payouts. It replaces spreadsheets and messaging tools with a single structured, role-based workflow backed by an append-only audit log.

## Roles

- **Client** — browses the catalog, builds a cart, places orders, reviews and approves content, tracks invoices
- **Manager** — assigns copywriters, oversees the order pipeline (Kanban + list), publishes links, sends invoices
- **Copywriter** — receives assigned orders, writes and submits content
- **Sourcer** — submits sites to the catalog, tracks earnings from published orders
- **Admin** — full access: invites users, approves sites, manages categories, marks payouts paid, audits everything

## Tech Stack

- **Next.js 16.2** (App Router, Turbopack, async request APIs, `proxy.ts`)
- **React 19** · **TypeScript**
- **Supabase** (Auth, Postgres, RLS, Storage)
- **shadcn/ui** + **Tailwind CSS v4**
- **react-hook-form** + **Zod**
- **Vitest** for unit and integration tests
- **@react-pdf/renderer** for server-rendered invoice PDFs
- **Brevo** for transactional email (behind a `Mailer` interface)

## Design Principles

1. **RLS is the floor; server-side checks are the contract.** Every server action re-asserts the actor's role via `requireRole()` — UI hiding is never sufficient.
2. **One canonical record per entity.** Orders snapshot site price and sourcer payout at creation; we never join back through Site for billing.
3. **Every state transition is guarded** by its source state (`WHERE status = expected`) and writes an `audit_log` row in the same transaction.

## Environments

| Environment | URL                          |
| ----------- | ---------------------------- |
| Local       | http://localhost:3000        |
| Staging     | _to be configured_           |
| Production  | _to be configured_           |

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=            # base URL used in emails and auth callbacks
LOCAL_URL=                       # falls back to http://localhost:3000
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=               # optional, defaults to "LinkFlow"
```

3. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Commands

```bash
npm run dev            # start dev server (Turbopack)
npm run build          # production build + TypeScript check
npm run start          # serve the production build
npm run lint           # run ESLint
npm run test           # run Vitest once
npm run test:watch     # watch mode
npm run test:coverage  # coverage report (v8)
npx tsc --noEmit       # typecheck without building
```

Import alias: `@/*` → `./src/*`.

## Repository Layout

```
src/
  app/                 # App Router routes (auth, dashboard, role-scoped pages)
  components/          # shadcn primitives + feature components
  lib/
    features/          # auth, audit, notify, verify-link, billing, email, ...
    data/              # data-access layer per entity
    supabase/          # ssr + browser + admin clients
    database.types.ts  # generated Supabase types
docs/
  PRD.md               # product requirements (source of truth)
  routing.md           # route structure, protection, auth helpers
  ui.md                # UI standards
  code-layout.md       # where things live
  validation.md        # forms, Zod, error display
  auth.md              # auth provider and helpers
  video-script.md      # 10-minute project overview script
PLAN.MD                # milestone-ordered development plan (M0–M11)
CLAUDE.md              # working agreements + Next.js 16 notes
AGENTS.md              # agent guidelines
```

## Key Features

- **User management** — invites via Supabase Auth, role-aware disable rules (Copywriter blocked on active orders; Sourcer disable auto-archives owned sites)
- **Site catalog** — domain normalization to eTLD+1, duplicate detection without owner leak, admin-gated status transitions
- **Cart & checkout** — idempotent checkout via `Idempotency-Key` header; one transaction creates N orders with full site snapshots
- **Order pipeline** — Kanban + table views, copywriter assignment, content editor with submission rules (≥ 50 chars), Cancel locked to `New`
- **Publishing & link verification** — HTTPS-only, HEAD→GET, 10s timeout, max 3 redirects, content-type allowlist, private-IP SSRF block (127/8, 10/8, 172.16/12, 192.168/16, IPv6 loopback, link-local, ULA), anchor-text match; manager override is logged
- **Invoicing** — monthly Draft generation per `(client, billing_month)` (idempotent), Send + Mark-Paid, per-order `billing_month` reassignment with corrective Drafts, server-rendered PDF
- **Sourcer earnings** — payout snapshotted onto the Order at publish, batch mark-paid with reference, role-scoped read-only view for sourcers
- **Notifications & audit** — in-app center + Brevo email per user preferences; scoped audit timeline on every Order

## Next.js 16 Notes

A few things differ from older Next.js guides:

- `cookies()`, `headers()`, `params`, `searchParams` are async — `await` them.
- Middleware lives in `src/proxy.ts` and exports `proxy` (no edge runtime).
- `next lint` is removed — run `eslint` directly.
- Use `next/image`; configure remote hosts via `images.remotePatterns`.
- `next.config.ts` must not set a `webpack` key — it breaks Turbopack.

Full list in [CLAUDE.md](CLAUDE.md).

## Documentation

Before changing code, check the standards in `docs/`:

- [PRD.md](docs/PRD.md) — product requirements, state machines, RBAC matrix
- [routing.md](docs/routing.md) — route structure, protection, auth helpers
- [ui.md](docs/ui.md) — component library, styling, layout patterns
- [code-layout.md](docs/code-layout.md) — where things live
- [validation.md](docs/validation.md) — forms, Zod, error display
- [auth.md](docs/auth.md) — auth provider, helpers, middleware

[PLAN.MD](PLAN.MD) is the dependency-ordered milestone plan (M0–M11). The PRD wins when the plan and the PRD disagree — update the plan, not the PRD.

## Status

MVP build is feature-complete through **M9** (role dashboards). Hardening (**M10** — runbooks, axe-core sweep, i18n externalization, load tests) and prototype cleanup (**M11**) remain.
