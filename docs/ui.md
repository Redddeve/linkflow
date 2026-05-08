# UI Coding Standards

## Component Library

All UI must be built exclusively with [shadcn/ui](https://ui.shadcn.com/) components.

- **Do not create custom components.** If a UI element is needed, find the appropriate shadcn component and install it via `npx shadcn@latest add <component>`.
- **Do not use raw HTML elements** for UI primitives (buttons, inputs, dialogs, etc.) — always reach for the shadcn equivalent.
- **Do not install or use any other component library** (e.g. MUI, Chakra, Headless UI).

All installed components live in `src/components/ui/`. Do not modify these files unless absolutely necessary — shadcn components are meant to be used as-is or composed together.

Prefer shadcn `Button`, `Badge`, `Card`, `Dialog`, `Tabs`, `Input`, `Select`, `Textarea`, `Tooltip`, `Avatar`, `DropdownMenu`, `Separator` over the legacy CSS classes (`.btn`, `.badge`, `.card`, etc.). Existing components using legacy classes do not need to be retroactively converted unless you are editing them.

## Edit Forms

All edit forms must open in a **`Dialog`**, regardless of complexity. Never navigate to a separate `/edit` page.

- The dialog trigger is a `<Button variant="outline" size="sm">` on the detail page, wired via `<DialogTrigger>`.
- The form component accepts `onSuccess` and `onCancel` callbacks. On success: call `onSuccess()` which closes the dialog and calls `router.refresh()`. On cancel: call `onCancel()` which closes the dialog.
- For long forms use `<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">` to keep the dialog scrollable.
- The server page fetches all data (entity + any lookup lists) and passes it as props to the dialog component.
- The dialog component is a `'use client'` file that owns the `open` state and renders the form.

Pattern (edit dialog file):
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
        <XForm ... onSuccess={() => { setOpen(false); router.refresh(); }} onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
```
