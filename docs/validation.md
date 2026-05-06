# Form Validation Standards

## Library

All forms use [react-hook-form](https://react-hook-form.com/). Do not use manual `useState` for field values, loading state, or field-level errors.

## Setup

```tsx
'use client';

import { useForm } from 'react-hook-form';

type FormValues = {
  email: string;
  password: string;
};

const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormValues>();
```

- `register` — connects inputs to the form (replaces `value` + `onChange`)
- `handleSubmit` — wraps your submit handler, prevents default, runs validation first
- `errors` — per-field validation errors
- `isSubmitting` — true while the async submit handler is running; replaces `isLoading` state
- `setError` — use with `root` key for server-side errors that aren't tied to a field
- `useWatch({ control, name })` — subscribe to a field's current value; use this instead of `watch()` from `useForm` (React Compiler flags `watch` as incompatible with memoization)

## Field registration

Wire shadcn `Input` via `{...register('fieldName', rules)}`:

```tsx
<Input id="email" type="email" placeholder="you@example.com" {...register('email', { required: 'Email is required' })} />
```

## Validation rules

Define rules inline in `register`. Common rules:

```tsx
register('email', {
  required: 'Email is required',
  pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
})

register('password', {
  required: 'Password is required',
  minLength: { value: 8, message: 'Password must be at least 8 characters' },
})
```

## Displaying errors

Use the shadcn `Label` + a `<p>` for field errors, and `errors.root` for server errors:

```tsx
{errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}

{/* Server / root error */}
{errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
```

## Server-side validation

All `actions.ts` files **must** validate their inputs with Zod before calling any API. Define schemas in `src/lib/schemas/` and import from there — do not inline schemas inside action files.

Use `safeParse` and throw the first issue message so the form's `catch` block picks it up:

```ts
import { z } from 'zod';
import { loginSchema } from '@/lib/schemas/auth';

export async function loginWithPassword(email: string, password: string) {
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  // proceed with parsed.data
}
```

Zod schemas are the **single source of truth** for field rules. Keep `react-hook-form` inline rules aligned with the schema, or remove duplicated constraints from the form layer if the server schema is sufficient.

## Server errors

Catch errors from `actions.ts` and surface them via `setError('root', ...)`:

```tsx
async function onSubmit(data: FormValues) {
  try {
    await someAction(data.email);
  } catch (err: unknown) {
    setError('root', { message: err instanceof Error ? err.message : 'An error occurred' });
  }
}
```

## Submit handler

Pass your async handler to `handleSubmit`. Do not call `e.preventDefault()` yourself:

```tsx
<form onSubmit={handleSubmit(onSubmit)}>
```

## Disabling the submit button

Use `isSubmitting` from `formState` — do not track loading with `useState`:

```tsx
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>
```

## Full example

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { someAction } from './actions';

type FormValues = { email: string };

export default function ExampleForm() {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormValues>();

  async function onSubmit(data: FormValues) {
    try {
      await someAction(data.email);
    } catch (err: unknown) {
      setError('root', { message: err instanceof Error ? err.message : 'An error occurred' });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email', { required: 'Email is required' })} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send'}
      </Button>
    </form>
  );
}
```
