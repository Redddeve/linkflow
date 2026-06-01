'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { archiveChat, unarchiveChat } from '@/app/dashboard/chat/actions';

interface Props {
  chatId: string;
  action: 'archive' | 'unarchive';
}

export function ChangeChatStatusDialog({ chatId, action }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isArchive = action === 'archive';

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = isArchive
          ? await archiveChat({ chatId })
          : await unarchiveChat({ chatId });
        if (!result.success) {
          setError(result.message);
          return;
        }
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        {isArchive ? 'Archive' : 'Unarchive'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isArchive ? 'Archive chat' : 'Unarchive chat'}
          </DialogTitle>
          <DialogDescription>
            {isArchive
              ? 'This chat will be archived and moved out of your active chats. You can unarchive it at any time.'
              : 'This chat will be restored to your active chats.'}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending
              ? isArchive
                ? 'Archiving…'
                : 'Unarchiving…'
              : isArchive
                ? 'Archive'
                : 'Unarchive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
