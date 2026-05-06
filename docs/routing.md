# Routing Standards

## Route Structure

All application routes must be nested under `/dashboard`.

- The home page (`/`) is public — shows a sign-in CTA; authenticated users are redirected to `/dashboard` by the Server Component.
- All authenticated app functionality lives under `/dashboard` and its sub-routes (e.g. `/dashboard/orders`, `/dashboard/settings`).
- Do not create top-level app routes outside of `/dashboard`.

## Route Protection

All `/dashboard` routes are protected — only authenticated users may access them.

Route protection is enforced via the **Next.js 16 proxy** (`src/proxy.ts`), not in individual page components.

```ts
// src/proxy.ts
export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

- Do not add auth guards or redirect logic inside page or layout components — the proxy handles this.
- Any new route added under `/dashboard` is automatically protected by the matcher — no extra work needed.
- Public routes (e.g. `/`, `/auth/*`) are **not** in the matcher and are never intercepted.

## Auth helpers

Use the helpers in `src/lib/auth.ts` inside Server Components and Server Actions:

```ts
import { getCurrentUser, requireUser, requireRole } from '@/lib/auth';

// In layouts / pages — redirects to /login if unauthenticated
const user = await requireUser();

// In server actions — throws FORBIDDEN if wrong role
const user = await requireRole(['Admin', 'Manager']);
```

Never call `supabase.auth.getUser()` directly in page components — use `getCurrentUser()` which combines `getClaims()` (JWT decode, no network) with a single `public.users` query.
