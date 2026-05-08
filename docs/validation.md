# Form Validation Standards

## Stack

- **Client:** `react-hook-form` — no `useState` for field values, loading, or errors
- **Server:** Zod schemas in `src/lib/schemas/` — validate in every `actions.ts` before any API call

## Form Setup

```tsx
'use client';
const {
  register,
  handleSubmit,
  setError,
  formState: { errors, isSubmitting },
} = useForm<FormValues>();
```

- `isSubmitting` replaces loading state
- `setError('root', ...)` for server errors
- `useWatch({ control, name })` instead of `watch()` (React Compiler compatibility)

## Field + Error Pattern

```tsx
<Input {...register('email', { required: 'Email is required' })} />;
{
  errors.email && (
    <p className="text-sm text-destructive">{errors.email.message}</p>
  );
}
{
  errors.root && (
    <p className="text-sm text-destructive">{errors.root.message}</p>
  );
}

<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>;
```

## Server Actions

```ts
const parsed = schema.safeParse(input);
if (!parsed.success) throw new Error(parsed.error.issues[0].message);
```

Catch in the form and surface via `setError('root', { message: err instanceof Error ? err.message : 'An error occurred' })`.

Zod schema is the **source of truth** — keep `react-hook-form` inline rules aligned or remove duplicates.
