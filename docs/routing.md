# Routing Standards

## Route Structure

All application routes must be nested under `/dashboard`.

- The home page (`/`) is public and used for marketing or sign-in.
- All authenticated app functionality lives under `/dashboard` and its sub-routes (e.g. `/dashboard/workouts`, `/dashboard/settings`).
- Do not create top-level app routes outside of `/dashboard`.

## Route Protection

All `/dashboard` routes are protected — only authenticated users may access them.

Route protection is enforced via **Next.js middleware** (`src/proxy.ts`), not in individual page components.

```ts
// src/proxy.ts
export { proxy } from '@clerk/nextjs/server'

export const config = {
  matcher: ['/dashboard', '/dashboard/(.*)'],
}
```

- Do not add auth guards or redirect logic inside page or layout components — the middleware handles this.
- Any new route added under `/dashboard` is automatically protected by the middleware matcher — no extra work needed.
- Public routes (e.g. `/`, `/sign-in`, `/sign-up`) must not be added to the matcher.
