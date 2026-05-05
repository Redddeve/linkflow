# UI Coding Standards

## Component Library

All UI must be built exclusively with [shadcn/ui](https://ui.shadcn.com/) components.

- **Do not create custom components.** If a UI element is needed, find the appropriate shadcn component and install it via `npx shadcn@latest add <component>`.
- **Do not use raw HTML elements** for UI primitives (buttons, inputs, dialogs, etc.) — always reach for the shadcn equivalent.
- **Do not install or use any other component library** (e.g. MUI, Chakra, Headless UI).

All installed components live in `src/components/ui/`. Do not modify these files unless absolutely necessary — shadcn components are meant to be used as-is or composed together.

Prefer shadcn `Button`, `Badge`, `Card`, `Dialog`, `Tabs`, `Input`, `Select`, `Textarea`, `Tooltip`, `Avatar`, `DropdownMenu`, `Separator` over the legacy CSS classes (`.btn`, `.badge`, `.card`, etc.). Existing components using legacy classes do not need to be retroactively converted unless you are editing them.
