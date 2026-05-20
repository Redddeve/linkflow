# Development Plan — Linkbuilding Operations Platform (MVP)

> Scope: **MVP / v1 only** (PRD §13.1). Phase 2 / Phase 3 features are explicitly out of scope — see the "Out of scope" section at the end.
> Source of truth: [docs/PRD.md](docs/PRD.md). When this plan and the PRD disagree, the PRD wins; update this plan instead.
> Standards: [docs/routing.md](docs/routing.md), [docs/ui.md](docs/ui.md). Read [AGENTS.md](AGENTS.md) and the Next.js 16 notes in [CLAUDE.md](CLAUDE.md) before writing code.

## How to use this document

- Milestones M0 → M11 are **strictly sequential at the boundary** (M1 needs M0's RBAC primitives, etc.) but tasks within a milestone can run in parallel.
- Every milestone has a **Verification** section. A milestone is not done until its verification passes.
- Track per-FR/UC traceability via the §6 references inside each milestone — no separate matrix needed.
- Dates and estimates are intentionally absent; this is a dependency-ordered plan, not a Gantt chart.

## Stack snapshot (locked)

| Concern         | Choice                                                                  |
| --------------- | ----------------------------------------------------------------------- |
| Framework       | Next.js 16.2 (App Router, Turbopack, async request APIs, `proxy.ts`)    |
| UI              | shadcn/ui only (per [docs/ui.md](docs/ui.md)); Lucide icons             |
| Styling         | Tailwind v4 via `@import "tailwindcss"`                                 |
| Auth + DB       | Supabase Auth + Postgres + RLS + Storage (via `@supabase/ssr`)          |
| Cron / jobs     | Supabase scheduled Edge Functions (or `pg_cron`) — chosen in M6         |
| Email           | **Brevo** via `Mailer` interface — wired M8                             |
| Form / validate | Server actions + Zod schemas; **react-hook-form** for client-side state |
| Tests           | **Vitest** (unit) — set up in M1, expanded in every later milestone     |

## Cross-cutting principles

1. **RLS is the floor, server-side checks are the contract.** Every state transition runs through a typed server action that re-asserts the actor's role against [§3.2 of the PRD](docs/PRD.md). UI-only hiding is never sufficient.
2. **One canonical record per entity** (PRD §2.2). Snapshots on Order at creation; never join through Site for billing or content history.
3. **Append-only audit on every state change** — written from the same transaction that performs the transition.
4. **Status transitions are guarded by the source state.** Use `WHERE status = expected` in update queries to enforce optimistic concurrency (PRD §10.10).
5. **No new component libraries.** If a primitive is missing, install it with `npx shadcn@latest add <name>`.

---

## M0 — Foundation

**Goal:** A working `/dashboard` shell with real Supabase users, role-aware redirects, schema in place, RBAC + audit + notification primitives all callable by later milestones.

**Scope:** PRD §3 (RBAC), §4 (state machines — encoded as DB enums + check constraints), §5 (full schema), §6.1 (auth completion), §7.3 (security baseline).

**DB changes** (single Supabase migration `0001_init.sql`):

- Enums: `user_status`, `user_role`, `site_status`, `link_type`, `country`, `language`, `order_status`, `invoice_status`, `notification_channel`.
- Tables: `users`, `categories`, `sites`, `carts`, `cart_items`, `orders`, `comments`, `invoices`, `audit_log`, `notifications`, `notification_preferences`.
- Indexes: `sites.domain` unique, `sites.status`, `orders.status`, `orders.copywriter_id`, `orders.created_by_id`, `invoices(client_id, billing_month)` unique, `cart_items(cart_id, site_id)` unique.
- RLS policies per role × entity (rough draft per §3.2; refined in each later milestone).
- Trigger: `auth.users` insert → `public.users` row with `status = PENDING`, role from invite metadata.
- Trigger: `users.status` → `ACTIVE` on first sign-in (via `auth.users.last_sign_in_at` change or app-side on first authenticated request).
- Generated TypeScript types via Supabase MCP `generate_typescript_types` saved to `src/lib/database.types.ts`.

**Routes:**

- `/` — public landing; replace [src/app/page.tsx](src/app/page.tsx)'s prototype mount with a sign-in CTA + role-aware redirect for authed users.
- `/dashboard` — authed shell layout (sidebar + topbar via shadcn primitives); home redirects per role.
- Rename [src/proxy.ts](src/proxy.ts) export from `middleware` → `proxy`, narrow matcher to `['/dashboard', '/dashboard/(.*)']` per [docs/routing.md](docs/routing.md). Auth pages stay outside the matcher.

**Server actions / API:**

- `src/lib/auth.ts` — `getCurrentUser()`, `requireRole(roles)`, `requireUser()`. Uses `createClient()` from [src/lib/server.ts](src/lib/server.ts) and reads role from the `users` row.
- `src/lib/audit.ts` — `recordAudit({ entityType, entityId, action, before, after })`.
- `src/lib/notify.ts` — `notify({ recipientId, type, payload, channel })` (in-app only in M0; email wired in M8).
- `src/lib/rbac.ts` — typed permission map mirroring §3.2.

**Components (shadcn):** all already installed. App shell uses `Avatar`, `DropdownMenu`, `Separator`, `Button`, `Tooltip`.

**Deliverables:**

- Migration applied; types generated.
- `/dashboard` reachable only for authenticated users; sign-in redirects there post-login.
- `getCurrentUser()` returns the typed `User` row including role.
- `recordAudit()` and `notify()` round-trip a row in dev.

**Verification:**

- Sign in via [src/app/auth/login/page.tsx](src/app/auth/login/page.tsx) → land on `/dashboard`.
- Hit `/dashboard` unauthenticated → redirect to `/auth/login`.
- Insert a row through Supabase MCP `execute_sql` — confirm RLS blocks the wrong role.
- `npm run build` passes (Turbopack, no webpack config).

**Depends on:** nothing (foundation).

---

## M1 — User Management (Admin) + Test Harness

**Goal:** Admin can invite, edit, disable, and re-activate users with all UC-U-6 disable rules enforced. **Unit-test scaffolding lands here so every later milestone ships with tests.**

**Scope:** PRD §6.4 (UC-U-1..6), §8.5 (screens), plus testing infrastructure.

**Testing setup (one-time, done first in this milestone):**

- Install `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`.
- `vitest.config.ts` at project root; `npm run test` and `npm run test:watch` scripts.
- Test directory convention: co-located `*.test.ts(x)` for units; `tests/integration/` for server-action / RLS integration tests against a Supabase local stack.
- Initial coverage target: **server actions and RBAC helpers from M0** (`requireRole`, `recordAudit`, domain normalizer) — every later milestone is expected to add tests for its new server actions and state transitions.

**DB changes:** none (schema lands in M0). Adds RLS policies for `users` admin-only writes.

**Routes:**

- `/dashboard/users` — All Users list + filters (§8.5).
- `/dashboard/users/[id]` — User Details.
- `/dashboard/users/invite` — Invitation form.
- Modal-based confirms for resend, disable, activate.

**Server actions / API:**

- `inviteUser(input)` — calls Supabase Auth admin `inviteUserByEmail`, sets `users.role`, `manager_id`, records audit + notification.
- `resendInvite(userId)` — Supabase Auth admin re-invite; resets `invited_at`.
- `editUser(userId, patch)` — admin only; if changing role on user with active orders/sites → confirm flow.
- `disableUser(userId, reason)` — branches per role:
  - Self → 403.
  - **Copywriter with active orders (`In Progress` / `Needs changes`) → blocked**. Server returns 409 with the count of blocking orders; UI shows the list with deep-links so the admin can reassign each via the existing Reassign Copywriter flow (UC-OM-3.2) and retry the disable. **No bulk-reassignment step inside the disable flow.** (Departs from PRD UC-U-6.2 per product decision.)
  - **Sourcer → set `sourcer_id = NULL` AND `status = ARCHIVED` on every site that user owns**, so those sites disappear from the client catalog (PRD §6.5 only shows `ACTIVE`). Already-published orders keep their snapshotted `sourcer_payout_cents` (and remain payable); future orders on archived sites won't accrue payouts. (Extends PRD §10.7 / UC-U-6.3 with explicit catalog removal.)
  - Else → set `status = DISABLED`, `disabled_reason`.
- `activateUser(userId)`. Re-activating a sourcer does **not** auto-unarchive their sites — admin unarchives individually if needed.

**Components (shadcn):** `Card`, `Badge`, `Button`, `Input`, `Select`, `Dialog`, `DropdownMenu`, `Tabs`, `Avatar`. Install `Table` + `Form` if not present.

**Deliverables:** all UC-U-1..6 acceptance criteria pass.

**Verification:**

- Cannot disable yourself (UI hidden + 403 from server).
- Disabling a Copywriter who has any `In Progress` / `Needs changes` order returns 409 with the blocking-order list; admin must reassign each first.
- Disabling a Sourcer: their owned sites become `ARCHIVED` and `sourcer_id = NULL`; client catalog query confirms those sites no longer appear.
- Re-inviting a `PENDING` user re-sends the email.
- Vitest run for M0 helpers + M1 server actions is green and reported in CI.

**Depends on:** M0.

---

## M2 — Site & Category Management

**Goal:** Sites and Categories fully managed with all status transitions and the "edit-by-owner resets to Pending" rule.

**Scope:** §6.2 (UC-S-1..5), §6.3 (UC-C-6..8), §8.6 (screens).

**DB changes:** none. Add RLS for site visibility per §3.2, category admin-only writes.

**Routes:**

- `/dashboard/sites` — list + filters (§8.6).
- `/dashboard/sites/[id]` — view.
- `/dashboard/sites/new` — create (sourcer/manager/admin).
- `/dashboard/sites/[id]/edit` — edit (owner or admin/manager).
- `/dashboard/categories` — admin only.

**Server actions / API:**

- `createSite(input)` — normalize domain to `eTLD+1` (lowercase, no `www`, no scheme, no trailing slash); reject duplicates with PRD §10.1 message.
- `editSite(id, patch)` — owner edits reset `status = PENDING`; admin edits do not.
- `setSiteStatus(id, action, note?)` — admin-only; UC-S-5 transitions; require `change_note ≥ 10` on `NEEDS_CHANGES`.
- `createCategory`, `editCategory` (no delete; soft-archive only — PRD §6.3 / UC-C-8).

**Components (shadcn):** plus install `Table`, `Form`, `Popover`, `Command` (combobox for filters).

**Deliverables:** every site state transition logged, notifications fire to owner, duplicate detection works on `name.com` / `https://www.name.com/` / `Name.com`.

**Verification:**

- Submit `https://www.Foo.com/` — stored as `foo.com`. Submit `foo.com` again → duplicate error, no owner leak.
- Sourcer edits own site → resets to PENDING.
- Admin "Needs changes" with empty note → blocked.

**Depends on:** M0.

---

## M3 — Catalog, Cart, Order Creation (Client)

**Goal:** Client can browse the active catalog, manage a cart, and check out into one Order per Site.

**Scope:** §6.5 (UC-O-3..6), §8.7 (Cart & catalog screens), §10.1, §10.12, §10.13.

**DB changes:** none. RLS: clients only see ACTIVE sites in catalog endpoints; Cart restricted to owner.

**Routes:**

- `/dashboard/catalog` — client view of `sites WHERE status = ACTIVE`.
- `/dashboard/cart` — current client's cart with editable `publish_date`.

**Server actions / API:**

- `addToCart(siteId)` — creates Cart on first add; rejects duplicate `(cart_id, site_id)`.
- `removeFromCart(cartItemId)`.
- `updateCartItem(cartItemId, { publish_date })`.
- `checkoutCart()` — **idempotent via header `Idempotency-Key`** (PRD §9.1):
  - Reject if any item's site is no longer `ACTIVE`.
  - Reject if any `publish_date` is null or in the past.
  - In one transaction: insert N `Order` rows snapshotting `Site.*` + `Site.price_cents`; delete `cart_items`; notify Managers (group); audit.

**Components (shadcn):** `Card`, `Badge`, `Button`, `Input` (date), `Tooltip` (for "Already in cart"), `Separator`.

**Deliverables:** UC-O-3..6 acceptance criteria pass; cart shows disclaimer for non-ACTIVE site rows and blocks checkout.

**Verification:**

- Add same site twice → second action disabled w/ "Already in cart".
- Admin archives a site sitting in a cart → row gets disclaimer; checkout blocked until removed.
- Submit checkout twice with same idempotency key → one set of orders created.

**Depends on:** M0, M2.

---

## M4 — Order Lifecycle (Manager / Copywriter)

**Goal:** Managers route Orders through to `Content Sent`; Copywriters edit and submit content.

**Scope:** §6.6 (UC-O-7..9 client list/edit/cancel), §6.7 (UC-OM-1..3 manager), §6.8 (UC-OC-1..4 copywriter), §8.8, §8.9.

**DB changes:** check constraint `content_body IS NOT NULL AND length(content_body) >= 50 WHEN status = 'Content Sent'`.

**Routes:**

- `/dashboard/orders` — role-scoped list + kanban toggle (manager/admin); filtered to assigned for copywriter; client sees own only.
- `/dashboard/orders/[id]` — role-scoped view.
- `/dashboard/orders/[id]/edit` — copywriter content editor (assigned + `In Progress`/`Needs changes` only).

**Server actions / API:**

- `editOrder(id, { publish_date })` — client-only, status `New` only (UC-O-9).
- `cancelOrder(id, reason?)` — `New` only (UC-O-8); excluded from invoicing.
- `assignCopywriter(orderId, copywriterId)` — `New` → `In Progress`; sets `manager_id` if first action.
- `reassignCopywriter(orderId, copywriterId)` — status unchanged; notify both.
- `saveOrderContent(orderId, body)` — assigned copywriter; status unchanged.
- `submitOrderContent(orderId)` — `In Progress` → `Content Sent`; sets `sent_at`; requires body ≥ 50 chars.

**Components (shadcn):** install `Sheet` (filters drawer) and `ScrollArea`. Kanban built from `Card` + drag-and-drop primitives from `@base-ui/react` (already installed).

**Deliverables:** state transitions enforced; copywriter sees only assigned orders; reassignment logged.

**Verification:**

- Copywriter cannot edit unassigned order (server returns 403).
- Submit < 50 chars → blocked.
- Cancel an order in `In Progress` → blocked.

**Depends on:** M0, M3.

---

## M5 — Client Review & Publish

**Goal:** Client approves/rejects content; Manager publishes with verified link; Comments timeline lives on Order detail.

**Scope:** §6.6 (UC-O-10), §6.7 (UC-OM-4), §5.7 (Comment), §7.3 (SSRF protection).

**DB changes:** none.

**Routes:**

- `/dashboard/orders/[id]` extends with Comments timeline + Approve/Reject controls.
- `/dashboard/orders/[id]/publish` — manager publish form.

**Server actions / API:**

- `approveOrder(orderId)` — `Content Sent` → `Content Approved`; sets `approved_at`.
- `rejectOrder(orderId, comment)` — `Content Sent` → `Needs changes`; comment ≥ 20 chars; persists `Comment` row.
- `addComment(orderId, text)` — generic comment in any phase (per §5.7).
- `publishOrder(orderId, { published_url, publish_date })`:
  - HTTPS only.
  - **Link verifier** — `src/lib/verify-link.ts`: HEAD then GET, content-type allowlist (text/html), 10s timeout, max-3 redirects, **deny private IP ranges** (PRD §7.3 / §10.11), parse for `<a href>` matching `anchor_text` case-insensitive.
  - On verifier failure, allow manager override with typed reason; both paths logged.
  - On success → `Published`; set `published_at`, `published_by_id`, `billing_month = first day of month(published_at)`; snapshot `sites.sourcer_payout_cents` onto `orders.sourcer_payout_cents` if the site has a `sourcer_id` (sets up M7).

**Components (shadcn):** `Dialog` for confirms, `Textarea` for comments.

**Deliverables:** UC-O-10 + UC-OM-4 ACs pass; verifier blocks private-range URLs.

**Verification:**

- Reject with 19-char comment → blocked.
- Publish with a localhost URL → verifier rejects.
- Publish with mismatched anchor → verifier rejects, override path works and is logged with reason.

**Depends on:** M0, M4.

---

## M6 — Invoicing

**Goal:** Monthly invoice generation, manual send + mark-paid, billing-month reassignment, late-publish handling.

**Scope:** §6.9 (FR-INV-1..5), §8.10 (screens), §10.5, §10.6.

**DB changes:** none. Uniqueness `(client_id, billing_month)` already on `invoices` from M0.

**Routes:**

- `/dashboard/invoices` — admin/manager list + filters.
- `/dashboard/invoices/[id]` — view.
- `/dashboard/invoices/[id]/edit-orders` — reassign per-order `billing_month` while invoice is `Draft`.

**Server actions / API:**

- `sendInvoice(invoiceId)` — `Draft` → `Sent`; record `sent_at`, `sent_by_id`.
- `markInvoicePaid(invoiceId)` — `Sent` → `Paid`; record paid metadata.
- `reassignOrderBillingMonth(orderId, billingMonth)` — only while parent invoice is `Draft`; FR-INV-5 routes to corrective Draft if target month already `Sent`/`Paid`.
- `downloadInvoicePdf(invoiceId)` — server-rendered PDF (e.g. `@react-pdf/renderer`, decided at M6 start).

**Jobs:**

- **Monthly invoice generation** (cron `5 0 1 * *` UTC):
  - For each client × prior-calendar-month, find `Published` orders with no `invoice_id`; create one Draft invoice per `(client, billing_month)`; link orders; sum `total_price_cents`.
  - Idempotent — re-runs are no-ops.
  - Implementation: Supabase Edge Function + `pg_cron` schedule (decision in M6 kickoff).
- **Overdue notification job** — daily; emails client + admin if `Sent` invoice age > 30 days unpaid.

**Components (shadcn):** `Table`, `Card`, `Badge`, `Tabs`, `Dialog`.

**Deliverables:** all FR-INV ACs pass.

**Verification:**

- Run generator twice for same period → second run is a no-op.
- Move an order's `billing_month` into a `Sent` invoice's month → corrective Draft invoice created (FR-INV-5).
- Send and Mark-as-paid update `sent_at`/`marked_as_paid_at` plus actor IDs.

**Depends on:** M5.

---

## M7 — Sourcer Earnings

**Goal:** Sourcer payout is snapshot onto the Order at publish; Admin marks payouts paid; Sourcers see their orders + earnings.

**Scope:** §6.10 (FR-EARN-1..4), §3.2 sourcer caps, §8.2 sourcer dashboard.

**DB changes:** `orders.sourcer_payout_cents`, `orders.sourcer_paid_at`, `orders.sourcer_payout_reference`.

> Note: an earlier draft introduced a separate `commissions` table with `ACCRUED → PAYABLE → PAID → REVERSED` lifecycle, RPCs (`accrue_commission_for_order`, `promote_commissions_candidates`), and a nightly link-verification job. All of that has been **removed**. There is no Commission entity; sourcer payout state lives on the Order.

**Routes:**

- `/dashboard/earnings` — Admin (all sourcers, mark-paid) + Sourcer (own, read-only). Manager has no access.
- `/dashboard/orders` — Sourcer view scoped to orders on their sites (sites.sourcer_id = actor).

**Server actions / API:**

- `publishOrder` (from M5) snapshots `sites.sourcer_payout_cents` → `orders.sourcer_payout_cents` when the site has a sourcer.
- `markOrdersPayoutPaid(orderIds, payoutReference)` — Admin only; sets `sourcer_paid_at` + `sourcer_payout_reference` on eligible orders.

**Components (shadcn):** dashboard cards, `Table`, `Checkbox`, `Dialog`.

**Deliverables:** Sourcer dashboard shows last month's earnings totals (Earned / Paid / Unpaid); Admin can batch-mark payouts paid; Sourcer can browse orders placed on their sites with payout status.

**Verification:**

- Publish an order on a site with sourcer → `orders.sourcer_payout_cents` populated; row appears in `/dashboard/earnings` for that sourcer's billing month as Unpaid.
- Admin marks selection paid with a reference → `sourcer_paid_at` + `sourcer_payout_reference` set; sourcer sees Paid status + receives `order.payout_paid` notification.
- Sourcer hits `/dashboard/orders` → sees only orders for their sites; visiting an order for another sourcer's site returns 404.
- Manager visiting `/dashboard/earnings` returns 404.

**Depends on:** M5.

---

## M8 — Notifications & Audit

**Goal:** All trigger points from §6.11 deliver in-app + email per defaults; per-user preferences; full audit timeline.

**Scope:** §6.11 (FR-NOT-1..2), §6.12 (FR-AUD-1..2).

**DB changes:** seed default `notification_preferences` rows on user creation (M0 trigger updated).

**Routes:**

- `/dashboard/notifications` — center (unread count, mark read, mark all read).
- `/dashboard/settings/notifications` — per-user preference toggles.

**Server actions / API:**

- `markNotificationRead(id)`, `markAllRead()`.
- `Mailer` interface (`src/lib/mailer.ts`) with **Brevo** transactional API as the implementation. Templates managed in Brevo dashboard; identifiers stored in `src/lib/email-templates.ts`.
- Wire `notify()` calls into every event in §6.11 (most call sites already exist from M1–M7; this milestone audits coverage).

**Components (shadcn):** notifications popover (`Popover` + `ScrollArea`), `Badge` for unread count, switches for prefs (install `Switch`).

**Audit timeline:** Order detail page renders `audit_log` rows scoped to viewer role per §3.2 (manager scoped to assigned orders, admin all, copywriter assigned only, client own).

**Deliverables:** every event in the §6.11 table fires the configured channels; audit timeline matches scoping rules.

**Verification:**

- Toggle off "Content submitted" email pref → next submit produces in-app only.
- Manager not assigned to an order does not see its audit rows.

**Depends on:** M0–M7 (this is the wiring milestone).

---

## M9 — Role Dashboards

**Goal:** Each role lands on a dashboard matching §8.2.

**Scope:** §8.2.

**Routes:**

- `/dashboard` per role:
  - Client: active Orders by status, Orders awaiting review, Cart summary, latest Invoice + outstanding, Browse Catalog CTA.
  - Manager: All Orders filtered to active work; counters Unassigned / In Progress / Needs Changes / Awaiting Publication.
  - Copywriter: assigned Orders + quick filters (In Progress / Needs Changes).
  - Sourcer: my Sites by status, last month's earnings summary (Earned / Paid / Unpaid).
  - Admin: Site review queue, pending invitations, Draft/Sent invoice counts, unpaid sourcer payouts total.

**Components (shadcn):** `Card`, `Badge`, `Tabs`, `Separator`. Install `Skeleton` for loading states.

**Verification:** each role sees the correct widgets and links lead to filtered list views from M1–M7.

**Depends on:** M1–M7.

---

## M10 — NFRs & Hardening

**Goal:** PRD §15 Definition of Done is met for v1.

**Scope:** §7 (NFRs), §15.

**Tasks:**

- **State machine tests** — unit tests for every transition (Site, User, Order, Invoice) covering valid + invalid (PRD §15).
- **RBAC tests** — one test per server action × forbidden role ensuring 403 (PRD §3.2 enforcement, §15).
- **Cron tests** — invoice generation: no-eligible / single / multi / idempotency / late-publish.
- **SSRF / link verifier tests** — private IP, redirect cap, content-type allowlist, timeout.
- **File upload validation** — avatar (MIME allowlist, ≤ 10 MB).
- **Observability** — Sentry init (or equivalent); structured logger emits a record per state transition.
- **Performance** — load test against staging at 50% of §7.2 targets; p95 dashboard < 1.5s, list/search < 500ms.
- **Accessibility** — axe-core sweep on primary flows (login, dashboard, sites list, order detail, cart, checkout, publish, invoice send).
- **i18n** — externalize user-facing strings to `src/lib/i18n.ts`; English ships.
- **Runbooks** — `docs/runbooks/` for monthly invoicing, overdue invoice (PRD §15 last bullet).

**Verification:** `npm run lint` and full test suite pass; runbooks exist; accessibility report attached.

**Depends on:** M0–M9.

---

## M11 — Cleanup

**Goal:** Remove the prototype and stale references.

**Tasks:**

- Delete: [src/components/LinkFlowApp.tsx](src/components/LinkFlowApp.tsx), `ClientScreens.tsx`, `ManagerScreens.tsx`, `OtherRoleScreens.tsx`, `chrome.tsx`, `Icon.tsx`, [src/lib/data.ts](src/lib/data.ts).
- Delete `src/app/protected/page.tsx` (Supabase template scaffold not needed once dashboards land).
- Delete the prototype `--accent-h` / tweaks panel CSS from [src/app/globals.css](src/app/globals.css).
- Confirm or create `docs/auth.md` — currently referenced from [CLAUDE.md](CLAUDE.md) but not present. Author it from the M0 implementation (auth provider, server helpers, middleware/proxy, UI components).
- Final pass: `npm run build` clean, no dead exports (`tsc --noEmit`).

**Verification:** `git grep` for `LinkFlowApp`, `lib/data`, `chrome` returns no hits; build passes.

**Depends on:** M9 (so the live dashboards have replaced the prototype).

---

## Open product questions (from PRD §14)

These do **not** block any milestone — defaults assumed in the PRD are what M0–M11 implement. They are listed for product reference only; resolve as they arise.

## Out of scope

This plan covers the MVP only (PRD §13.1). Anything not enumerated in M0–M11 is out of scope, including: public marketing site, native mobile, white-label, AI-generated content, automated SEO crawling, online payment processing (Stripe), live Ahrefs/SEMrush metrics, inline comments on drafts, bulk operations, multi-currency, multi-tenant, and public API/webhooks.
