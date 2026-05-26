'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { publishOrder } from '../../../app/dashboard/orders/actions';

interface Props {
  orderId: string;
  defaultPublishDate: string;
}

export function PublishOrderForm({ orderId, defaultPublishDate }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [date, setDate] = useState(defaultPublishDate);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await publishOrder({
          orderId,
          published_url: url.trim(),
          publish_date: date,
        });
        router.push(`/dashboard/orders/${orderId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="published-url">Published URL</Label>
        <Input
          id="published-url"
          type="url"
          placeholder="https://example.com/your-article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">Must be an HTTPS URL.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="publish-date">Publish date</Label>
        <Input
          id="publish-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          disabled={isPending}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !url.trim()}>
          {isPending ? 'Publishing…' : 'Publish order'}
        </Button>
      </div>
    </form>
  );
}
