'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCategory } from './actions';

export function CreateCategoryForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        await createCategory({ name });
        setName('');
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 max-w-sm">
      <div className="flex-1 grid gap-1.5">
        <Label htmlFor="new-category-name">New category</Label>
        <Input
          id="new-category-name"
          placeholder="e.g. Technology"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button type="submit" disabled={isPending || name.trim().length === 0}>
        {isPending ? 'Adding…' : 'Add'}
      </Button>
    </form>
  );
}
