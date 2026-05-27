# Code Layout

## Route folders (`src/app/`)

Route folders contain only Next.js routing primitives. **Never** create a `components/` directory inside [`src/app/`](../src/app/).

Allowed inside `src/app/dashboard/<feature>/`:

- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `default.tsx`, `not-found.tsx`
- `[id]/` and other dynamic / nested route segments
- `actions.ts` (Server Actions) and its co-located `actions.test.ts`

That's it. No `components/`, no `_components/`, no UI files, no ad-hoc `*-something.test.ts` files — all tests for `actions.ts` belong in a single `actions.test.ts`.

**Every `actions.ts` must have a co-located `actions.test.ts`.** If you add a new dashboard route with Server Actions, add the test file in the same commit.

## Where components go

```
src/components/
  <feature>/        # e.g. sites, users, orders, chat, invoices, earnings
    <feature>-table.tsx
    <feature>-filters.tsx
    edit-dialog.tsx
    ...
  ui/               # shadcn primitives — do not modify
```

Feature name in `src/components/<feature>/` matches the route segment in `src/app/dashboard/<feature>/`. Import via the `@/` alias:

```tsx
import { OrdersTable } from '@/components/orders/orders-table';
```

Why:

- One canonical location per feature — no `app/<x>/components/` vs `components/<x>/` split-brain
- Route folders stay focused on routing concerns (pages, actions, segments)
- Components are trivially reusable across routes without cross-segment imports

## Library code (`src/lib/`)

Every module is its own folder with `index.ts` (and `index.test.ts` if it has tests):

```
src/lib/
  auth/
    index.ts
    index.test.ts
  audit/
    index.ts
    index.test.ts
  billing/        rbac/         verify-link/
  avatar/         commission/   errors/
  notify/         pagination/   utils/
  data/           # data-access helpers, grouped by table
  schemas/        # Zod schemas, one file per domain
    __tests__/    # schema unit tests live here, not next to schemas
  supabase/       # client factories
  dashboard/      # role-home helpers
```

Imports stay terse thanks to `index.ts`:

```ts
import { requireUser } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
```

Rules:

- No flat `*.ts` at `src/lib/` root — every module is a folder, even single-file ones.
- Tests for `lib/<x>/index.ts` live next to it as `lib/<x>/index.test.ts`.
- Schema tests are the one exception: they live in [`src/lib/schemas/__tests__/`](../src/lib/schemas/__tests__/) so the `schemas/` directory itself contains only schema definitions.

Why:

- Predictable: one folder per concern, never wonder "is it `lib/foo.ts` or `lib/foo/`?"
- Symmetric with `src/components/<feature>/` — same mental model everywhere.
- New tests/helpers for a module land in its folder, not scattered at the root.
