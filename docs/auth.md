# Authentication

Supabase Auth via [`@supabase/ssr`](https://supabase.com/docs/guides/auth/server-side/nextjs) — cookie-based sessions, JWT claims read on every request. See [routing.md](routing.md) for how routes are protected.

## Clients

| Where it runs | File | Notes |
|---|---|---|
| Server components / actions / route handlers | [src/lib/supabase/server.ts](../src/lib/supabase/server.ts) | `await createClient()` — cookie-aware. New instance per call (Fluid-compute safe). |
| Browser components | [src/lib/supabase/client.ts](../src/lib/supabase/client.ts) | `createClient()` — browser-side only. |
| Proxy / session refresh | [src/lib/supabase/middleware.ts](../src/lib/supabase/middleware.ts) | `updateSession()` — runs from `proxy.ts`. |
| Admin / service-role | [src/lib/supabase/admin.ts](../src/lib/supabase/admin.ts) | Bypasses RLS. **Server-only.** Never import from a client component. |

## Session refresh

[src/proxy.ts](../src/proxy.ts) calls `updateSession()` on every non-static request. The middleware:

1. Reads claims via `supabase.auth.getClaims()`.
2. If unauthenticated and the path is not `/login` or `/auth/*`, redirects to `/login`.
3. Otherwise propagates refreshed auth cookies on the response.

Do **not** add page- or layout-level auth guards for `/dashboard` routes — the proxy already covers them ([routing.md](routing.md)).

## Server helpers — `src/lib/auth.ts`

```ts
import { getCurrentUser, requireUser, requireRole } from '@/lib/auth';

const maybeUser = await getCurrentUser();        // UserRow | null
const user      = await requireUser();           // UserRow; redirects to /login
const admin     = await requireRole(['Admin']);  // UserRow; throws FORBIDDEN
```

- [`getCurrentUser`](../src/lib/auth.ts) — reads claims, then loads the matching `public.users` row. On first authenticated request it promotes `status` from `PENDING` → `ACTIVE` (M0 trigger pair).
- `requireUser` — `getCurrentUser` + redirect.
- `requireRole(roles[])` — `requireUser` + role check; throws `FORBIDDEN: requires role X` if the user's role is not in the allowed list.

**Rule:** never call `supabase.auth.getUser()` directly in app code. Always go through `getCurrentUser` / `requireUser` / `requireRole` so the typed `users` row (with role and status) is the single source of truth.

## RBAC

Permission map: [src/lib/rbac.ts](../src/lib/rbac.ts) — `PERMISSIONS` records the role × capability matrix from PRD §3.2. Check with `can(role, 'orders:publish')`. Server actions should `requireRole([...])` first; UI may additionally hide controls based on `can(...)` but UI hiding is never sufficient on its own (PRD §3.2).

## Auth UI

Route group [src/app/(auth)/](../src/app/(auth)/) — all public, sits outside the dashboard matcher:

- [login/page.tsx](../src/app/(auth)/login/page.tsx) + `actions.ts` — email/password sign-in.
- [auth/forgot-password/](../src/app/(auth)/auth/forgot-password/) — password-reset request.
- [auth/update-password/](../src/app/(auth)/auth/update-password/) — set new password after reset.
- [auth/confirm/route.ts](../src/app/(auth)/auth/confirm/route.ts) — email-link callback.
- [auth/error/page.tsx](../src/app/(auth)/auth/error/page.tsx) — generic auth error page.

Sign-out: server action invalidates the session and redirects to `/`.

## Invitations

Admin-only flow ([src/app/dashboard/users/invite/](../src/app/dashboard/users/invite/)) uses Supabase Auth `admin.inviteUserByEmail`. The DB trigger on `auth.users` inserts the matching `public.users` row with `status = PENDING` and the role passed in invite metadata; first sign-in promotes to `ACTIVE` via `getCurrentUser`.
