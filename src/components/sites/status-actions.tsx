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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { setSiteStatus } from '@/app/dashboard/sites/actions';
import { VALID_TRANSITIONS, type SiteStatus } from '@/lib/schemas/sites';

interface Props {
  siteId: string;
  currentStatus: SiteStatus;
}

const ACTION_LABELS: Record<string, string> = {
  APPROVE: 'Approve',
  NEEDS_CHANGES: 'Request changes',
  ARCHIVE: 'Archive',
  REACTIVATE: 'Reactivate',
};

const ACTION_VARIANTS: Record<string, 'default' | 'destructive' | 'outline'> = {
  APPROVE: 'default',
  NEEDS_CHANGES: 'outline',
  ARCHIVE: 'destructive',
  REACTIVATE: 'default',
};

export function StatusActions({ siteId, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [needsChangesOpen, setNeedsChangesOpen] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [changeNoteError, setChangeNoteError] = useState('');

  const availableActions = (
    Object.keys(VALID_TRANSITIONS) as (keyof typeof VALID_TRANSITIONS)[]
  ).filter((action) => VALID_TRANSITIONS[action].includes(currentStatus));

  async function handleAction(action: string) {
    if (action === 'NEEDS_CHANGES') {
      setNeedsChangesOpen(true);
      return;
    }
    setError('');
    startTransition(async () => {
      try {
        await setSiteStatus(
          siteId,
          action as Parameters<typeof setSiteStatus>[1],
        );
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'An error occurred');
      }
    });
  }

  async function handleNeedsChanges() {
    setChangeNoteError('');
    if (changeNote.trim().length < 10) {
      setChangeNoteError('Change note must be at least 10 characters');
      return;
    }
    startTransition(async () => {
      try {
        await setSiteStatus(siteId, 'NEEDS_CHANGES', changeNote);
        setNeedsChangesOpen(false);
        setChangeNote('');
        router.refresh();
      } catch (e: unknown) {
        setChangeNoteError(
          e instanceof Error ? e.message : 'An error occurred',
        );
      }
    });
  }

  function handleNeedsChangesDialogChange(open: boolean) {
    if (!open) {
      setNeedsChangesOpen(false);
      setChangeNote('');
      setChangeNoteError('');
    }
  }

  function handleChangeNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setChangeNote(e.target.value);
  }

  function handleNeedsChangesCancel() {
    setNeedsChangesOpen(false);
    setChangeNote('');
    setChangeNoteError('');
  }

  if (availableActions.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {availableActions.map((action) => (
          <Button
            key={action}
            variant={ACTION_VARIANTS[action]}
            size="sm"
            disabled={isPending}
            onClick={() => handleAction(action)}
          >
            {ACTION_LABELS[action]}
          </Button>
        ))}
        {error && <p className="text-sm text-destructive w-full">{error}</p>}
      </div>

      <Dialog open={needsChangesOpen} onOpenChange={handleNeedsChangesDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="change-note">Explain what needs to be changed</Label>
            <Textarea
              id="change-note"
              rows={4}
              value={changeNote}
              onChange={handleChangeNoteChange}
              placeholder="Describe the required changes (min 10 characters)…"
            />
            {changeNoteError && (
              <p className="text-sm text-destructive">{changeNoteError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleNeedsChangesCancel}>Cancel</Button>
            <Button disabled={isPending} onClick={handleNeedsChanges}>
              {isPending ? 'Sending…' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
