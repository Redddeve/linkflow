# Routing Standards

## Structure

- `/` — public, shows sign-in CTA; authenticated users are redirected to `/dashboard`
- `/dashboard/**` — all authenticated app functionality; no top-level routes outside this
- `/auth/*` — public auth routes

## Protection

`/dashboard` routes are protected by `src/proxy.ts` — **do not** add auth guards in page/layout components.

```ts
// src/proxy.ts
export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

Any route under `/dashboard` is automatically protected — no extra work needed.

## Auth Helpers (`src/lib/auth.ts`)

```ts
import { getCurrentUser, requireUser, requireRole } from '@/lib/auth';

const user = await requireUser();              // redirects to /login if unauthenticated
const user = await requireRole(['Admin']);     // throws FORBIDDEN if wrong role
```

Never call `supabase.auth.getUser()` directly — use `getCurrentUser()` (JWT decode + single `public.users` query).
