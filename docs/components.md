# Component Organization

All React components live in [`src/components/`](../src/components/), grouped by feature. **Never** create a `components/` directory inside [`src/app/`](../src/app/) — route folders contain only Next.js routing primitives.

## Allowed inside `src/app/dashboard/<feature>/`

- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `default.tsx`, `not-found.tsx`
- `[id]/` and other dynamic / nested route segments
- `actions.ts` (Server Actions) and co-located `*.test.ts`

That's it. No `components/`, no `_components/`, no UI files.

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

## Why

- One canonical location per feature — no `app/<x>/components/` vs `components/<x>/` split-brain
- Route folders stay focused on routing concerns (pages, actions, segments)
- Components are trivially reusable across routes without cross-segment imports
