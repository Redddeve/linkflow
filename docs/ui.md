# UI Standards

## Theme

**Light theme only.** No dark mode toggle, no `dark:` Tailwind variants. `color-scheme: light` is locked in [globals.css](../src/app/globals.css).

### Design tokens

Every color, radius, and shadow lives in `:root` in [globals.css](../src/app/globals.css). Never hard-code colors in components — reference tokens via Tailwind utilities or CSS vars.

**Primary (brand)** — Indigo `#4f46e5`. Defined once on `--primary`; everything else (`--accent`, `--ring`, `--sidebar-primary`, etc.) aliases to it. Re-skin the whole app by changing one variable.

| Token | Use |
| --- | --- |
| `--primary` / `bg-primary` / `text-primary` | Brand color. Primary buttons, active nav, focus rings, links. |
| `--primary-hover` / `bg-primary-hover` | Primary button hover state. |
| `--primary-active` / `bg-primary-active` | Primary button pressed state. |
| `--primary-soft` / `bg-primary-soft` | Tinted background for active nav, avatar fallbacks, role pills. |
| `--primary-soft-2` / `bg-primary-soft-2` | Hover state on soft surfaces. |
| `--primary-text` / `text-primary-text` | Foreground color on `--primary-soft` backgrounds. |
| `--primary-foreground` / `text-primary-foreground` | Foreground on `--primary` (= `#fff`). |
| `--accent` / `bg-accent` | **= `--primary-soft`.** Used by shadcn primitives for hover / highlighted states (Select item, DropdownMenu item, Command). Do NOT alias this to `--primary` — it makes every menu hover indigo-on-indigo. |
| `--accent-foreground` / `text-accent-foreground` | = `--primary-text`. Foreground on `--accent`. |

**Status colors** — `--st-{new,assign,write,review,pub,live,rejected}-{bg,fg}`. Use for badges, banners, and metric tones. Don't reach for raw Tailwind palette colors (`text-emerald-600`, `bg-amber-50`) — they bypass tokens and create drift.

**Surfaces** — `--bg` (page), `--surface` (card), `--surface-2` (subtle), `--surface-3` (stronger). Map to Tailwind `bg-background`, `bg-card`, `bg-muted`.

## Component Library

Use **shadcn/ui** exclusively — no other libraries (MUI, Chakra, etc.).

- Install missing components: `npx shadcn@latest add <component>`
- Components live in `src/components/ui/` — don't modify them
- No raw HTML primitives (buttons, inputs, dialogs) — use shadcn equivalents
- Prefer `Button`, `Badge`, `Card`, `Dialog`, `Tabs`, `Input`, `Select`, `Textarea`, `Tooltip`, `Avatar`, `DropdownMenu`, `Separator`
- Strip any `dark:` utilities when adding new shadcn components

## Page Layout

Every dashboard page renders inside the shell's `<main>`, which provides outer padding (`px-6 py-6 md:px-8 md:py-8`). **Pages must not add their own outer padding** — that creates double-padding and inconsistent gutters between tabs.

```tsx
// ✅ Correct
export default function MyPage() {
  return (
    <div>
      <PageHeader title="…" description="…" actions={…} />
      <div className="space-y-4">{/* content */}</div>
    </div>
  );
}

// ❌ Wrong — double padding
<div className="p-6 md:p-8 space-y-6">…</div>
```

## Page Header

Every listing/index page uses [`<PageHeader>`](../src/components/ui/page-header.tsx) for the title + description + CTA row. Do not roll your own `flex justify-between` headers — that's how Sites/Users/Invoices drifted out of sync.

```tsx
import { PageHeader } from '@/components/ui/page-header';

<PageHeader
  title="Sites"
  description="All sites in the platform"
  actions={canCreate && <Link className={buttonVariants()} href="…">Add site</Link>}
/>
```

The component handles spacing below itself (`mb-6`); content goes in a sibling `<div className="space-y-4">`.

## Buttons

**Always** use `<Button>` (or `buttonVariants()` for `<Link>` styled-as-button). Never hand-roll a `<button className="bg-primary …">` — primary state has multiple layers (shadow, hover, active, focus ring) that drift if duplicated.

```tsx
import { Button, buttonVariants } from '@/components/ui/button';

<Button>Save</Button>                                  // primary (default)
<Button variant="outline">Cancel</Button>              // secondary action
<Button variant="ghost">Dismiss</Button>               // tertiary / icon
<Button variant="destructive">Delete</Button>          // destructive

<Link href="/x" className={buttonVariants()}>Open</Link>
<Link href="/x" className={buttonVariants({ variant: 'outline' })}>Open</Link>
```

Default size is `h-9 px-3` — don't force `size="sm"` everywhere just to make a button smaller. Use `sm` for inline table actions and dialog buttons, `default` for page-header CTAs.

## Color Use

- **Primary** — single most important action per surface (e.g. "Add site", "Invite User", "Save"). Don't paint multiple primary buttons on the same screen.
- **Status colors** — only for the thing they describe. Don't use `bg-(--st-live-bg)` decoratively.
- **Soft tints** (`bg-primary-soft`, `bg-muted`) — for selected nav items, avatar fallbacks, pill backgrounds, hover targets.
- **No raw palette colors** in components. `text-emerald-600`, `bg-blue-50` — replace with status or primary tokens.

## Edit Forms

## Edit Forms

All edit forms open in a **`Dialog`** — never navigate to a `/edit` page.

- Trigger: `<Button variant="outline" size="sm">` via `<DialogTrigger>`
- Form accepts `onSuccess` / `onCancel` callbacks; on success call both then `router.refresh()`
- Long forms: `<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">`
- Server page fetches all data and passes as props; dialog component is `'use client'` and owns `open` state

```tsx
'use client';
export function EditXDialog({ id, defaultValues, ...lookups }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Edit</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit …</DialogTitle></DialogHeader>
        <XForm onSuccess={() => { setOpen(false); router.refresh(); }} onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
```
