'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { disableUser, activateUser, type BlockingOrder } from '../actions';
import type { UserRow } from '@/lib/auth';

interface Props {
  user: UserRow;
  currentUserId: string;
}

export function StatusActions({ user, currentUserId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showDisable, setShowDisable] = useState(false);
  const [disableReason, setDisableReason] = useState('');
  const [disableError, setDisableError] = useState('');
  const [blockingOrders, setBlockingOrders] = useState<BlockingOrder[] | null>(null);

  const [showActivate, setShowActivate] = useState(false);

  function resetDisable() {
    setShowDisable(false);
    setDisableReason('');
    setDisableError('');
    setBlockingOrders(null);
  }

  async function handleDisable() {
    setDisableError('');
    startTransition(async () => {
      try {
        const result = await disableUser(user.id, disableReason);
        if (result.ok) {
          resetDisable();
          router.refresh();
        } else if (result.code === 'BLOCKING_ORDERS') {
          setBlockingOrders(result.orders);
          setShowDisable(false);
        } else {
          setDisableError('You cannot disable your own account.');
        }
      } catch (e: unknown) {
        setDisableError(e instanceof Error ? e.message : 'An error occurred');
      }
    });
  }

  async function handleActivate() {
    startTransition(async () => {
      try {
        await activateUser(user.id);
        setShowActivate(false);
        router.refresh();
      } catch (e: unknown) {
        console.error(e);
      }
    });
  }

  function handleDisableReasonChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDisableReason(e.target.value);
  }

  function handleDisableDialogChange(o: boolean) {
    if (!o) resetDisable();
  }

  function handleBlockingOrdersDialogChange(o: boolean) {
    if (!o) resetDisable();
  }

  function handleActivateDialogChange(o: boolean) {
    if (!o) setShowActivate(false);
  }

  function handleOpenDisable() {
    setShowDisable(true);
  }

  function handleOpenActivate() {
    setShowActivate(true);
  }

  function handleCancelActivate() {
    setShowActivate(false);
  }

  const isSelf = user.id === currentUserId;

  return (
    <>
      <div className="flex gap-2">
        {user.status !== 'DISABLED' && !isSelf && (
          <Button variant="destructive" size="sm" onClick={handleOpenDisable}>
            Disable
          </Button>
        )}
        {user.status === 'DISABLED' && (
          <Button size="sm" onClick={handleOpenActivate}>
            Activate
          </Button>
        )}
      </div>

      <Dialog open={showDisable} onOpenChange={handleDisableDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable {user.first_name} {user.last_name}?</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="status-disable-reason">Reason</Label>
            <Textarea
              id="status-disable-reason"
              placeholder="Why is this account being disabled…"
              value={disableReason}
              onChange={handleDisableReasonChange}
              rows={3}
            />
            {disableError && <p className="text-sm text-destructive">{disableError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetDisable}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isPending || disableReason.trim().length < 5}
              onClick={handleDisable}
            >
              {isPending ? 'Disabling…' : 'Disable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!blockingOrders} onOpenChange={handleBlockingOrdersDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign active orders first</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This copywriter has active orders. Reassign each one before disabling.
          </p>
          <ul className="mt-2 space-y-1">
            {blockingOrders?.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/dashboard/orders/${o.id}`}
                  className="text-sm hover:underline text-primary"
                >
                  {o.site_domain} — <span className="text-muted-foreground">{o.status}</span>
                </Link>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={resetDisable}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showActivate} onOpenChange={handleActivateDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate {user.first_name} {user.last_name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Their account will be set to Active. Previously archived sites will not be automatically restored.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelActivate}>Cancel</Button>
            <Button disabled={isPending} onClick={handleActivate}>
              {isPending ? 'Activating…' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
