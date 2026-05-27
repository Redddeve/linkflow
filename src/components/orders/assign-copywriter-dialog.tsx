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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  assignCopywriter,
  reassignCopywriter,
} from '@/app/dashboard/orders/actions';

interface Copywriter {
  id: string;
  first_name: string;
  last_name: string;
}

interface Props {
  orderId: string;
  copywriters: Copywriter[];
  isReassign?: boolean;
  currentCopywriterId?: string | null;
}

export function AssignCopywriterDialog({
  orderId,
  copywriters,
  isReassign = false,
  currentCopywriterId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copywriterId, setCopywriterId] = useState(
    isReassign ? (currentCopywriterId ?? '') : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!copywriterId) return;
    setError(null);
    startTransition(async () => {
      try {
        if (isReassign) {
          await reassignCopywriter({ orderId, copywriterId });
        } else {
          await assignCopywriter({ orderId, copywriterId });
        }
        setOpen(false);
        setCopywriterId(isReassign ? (currentCopywriterId ?? '') : '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  const copywriterLabels = Object.fromEntries(
    copywriters.map((c) => [c.id, `${c.first_name} ${c.last_name}`]),
  );

  const isUnchanged = isReassign && copywriterId === currentCopywriterId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant={isReassign ? 'outline' : 'default'} />
        }
      >
        {isReassign ? 'Reassign copywriter' : 'Assign copywriter'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isReassign ? 'Reassign copywriter' : 'Assign copywriter'}
          </DialogTitle>
          <DialogDescription>
            {isReassign
              ? 'Select a different copywriter. The current one will be notified.'
              : 'Assign this order to a copywriter. Status will move to In Progress.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="copywriter-select">Copywriter</Label>
          <Select
            items={copywriterLabels}
            value={copywriterId}
            onValueChange={(v) => setCopywriterId(v ?? '')}
          >
            <SelectTrigger id="copywriter-select">
              <SelectValue placeholder="Select copywriter…" />
            </SelectTrigger>
            <SelectContent>
              {copywriters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                  {c.id === currentCopywriterId ? ' (current)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !copywriterId || isUnchanged}
          >
            {isPending ? 'Saving…' : isReassign ? 'Reassign' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
