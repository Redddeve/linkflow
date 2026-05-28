'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { resendInvite } from '@/app/dashboard/users/actions';

interface Props {
  userId: string;
  userEmail: string;
}

export function ResendInviteButton({ userId, userEmail }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await resendInvite(userId);
        setOpen(false);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'An error occurred');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Resend Invite
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resend invitation to {userEmail}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          A new invitation email will be sent. The previous link will expire.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={isPending} onClick={handleConfirm}>
            {isPending ? 'Sending…' : 'Resend'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
