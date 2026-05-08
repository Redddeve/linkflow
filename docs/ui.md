# UI Standards

## Component Library

Use **shadcn/ui** exclusively — no other libraries (MUI, Chakra, etc.).

- Install missing components: `npx shadcn@latest add <component>`
- Components live in `src/components/ui/` — don't modify them
- No raw HTML primitives (buttons, inputs, dialogs) — use shadcn equivalents
- Prefer `Button`, `Badge`, `Card`, `Dialog`, `Tabs`, `Input`, `Select`, `Textarea`, `Tooltip`, `Avatar`, `DropdownMenu`, `Separator`

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
