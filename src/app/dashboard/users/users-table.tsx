'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { UserRow } from '@/lib/auth';
import {
  disableUser,
  activateUser,
  resendInvite,
  type DisableResult,
  type BlockingOrder,
} from './actions';

function userInitials(u: UserRow) {
  const f = u.first_name?.trim() ?? '';
  const l = u.last_name?.trim() ?? '';
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  return (u.email[0] ?? '?').toUpperCase();
}

function statusVariant(status: UserRow['status']): 'success' | 'warning' | 'destructive' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PENDING') return 'warning';
  return 'destructive';
}

function statusLabel(status: UserRow['status']) {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'PENDING') return 'Pending';
  return 'Disabled';
}

interface Props {
  users: UserRow[];
  currentUserId: string;
}

export function UsersTable({ users, currentUserId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Disable dialog state
  const [disableTarget, setDisableTarget] = useState<UserRow | null>(null);
  const [disableReason, setDisableReason] = useState('');
  const [disableError, setDisableError] = useState('');
  const [blockingOrders, setBlockingOrders] = useState<BlockingOrder[] | null>(null);

  // Activate dialog state
  const [activateTarget, setActivateTarget] = useState<UserRow | null>(null);

  // Resend invite state
  const [resendTarget, setResendTarget] = useState<UserRow | null>(null);

  function resetDisable() {
    setDisableTarget(null);
    setDisableReason('');
    setDisableError('');
    setBlockingOrders(null);
  }

  async function handleDisable() {
    if (!disableTarget) return;
    setDisableError('');
    startTransition(async () => {
      try {
        const result: DisableResult = await disableUser(disableTarget.id, disableReason);
        if (result.ok) {
          resetDisable();
          router.refresh();
        } else if (result.code === 'BLOCKING_ORDERS') {
          setBlockingOrders(result.orders);
        } else {
          setDisableError('You cannot disable your own account.');
        }
      } catch (e: unknown) {
        setDisableError(e instanceof Error ? e.message : 'An error occurred');
      }
    });
  }

  async function handleActivate() {
    if (!activateTarget) return;
    startTransition(async () => {
      try {
        await activateUser(activateTarget.id);
        setActivateTarget(null);
        router.refresh();
      } catch (e: unknown) {
        console.error(e);
      }
    });
  }

  async function handleResend() {
    if (!resendTarget) return;
    startTransition(async () => {
      try {
        await resendInvite(resendTarget.id);
        setResendTarget(null);
        router.refresh();
      } catch (e: unknown) {
        console.error(e);
      }
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Invited</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No users found.
              </TableCell>
            </TableRow>
          )}
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7 text-xs">
                    <AvatarFallback>{userInitials(u)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Link
                      href={`/dashboard/users/${u.id}`}
                      className="font-medium hover:underline"
                    >
                      {u.first_name} {u.last_name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{u.role ?? '—'}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(u.status)}>{statusLabel(u.status)}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {u.invited_at ? new Date(u.invited_at).toLocaleDateString('en-CA') : '—'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                    aria-label="User actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/dashboard/users/${u.id}`)}>
                      View / Edit
                    </DropdownMenuItem>
                    {u.status === 'PENDING' && (
                      <DropdownMenuItem onClick={() => setResendTarget(u)}>
                        Resend Invite
                      </DropdownMenuItem>
                    )}
                    {u.status === 'DISABLED' && (
                      <DropdownMenuItem onClick={() => setActivateTarget(u)}>
                        Activate
                      </DropdownMenuItem>
                    )}
                    {u.id !== currentUserId && u.status !== 'DISABLED' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDisableTarget(u)}
                        >
                          Disable
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Disable dialog */}
      <Dialog open={!!disableTarget && !blockingOrders} onOpenChange={(o) => { if (!o) resetDisable(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable {disableTarget?.first_name} {disableTarget?.last_name}?</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="disable-reason">Reason</Label>
            <Textarea
              id="disable-reason"
              placeholder="Why is this account being disabled…"
              value={disableReason}
              onChange={(e) => setDisableReason(e.target.value)}
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

      {/* Blocking orders dialog */}
      <Dialog open={!!blockingOrders} onOpenChange={(o) => { if (!o) resetDisable(); }}>
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

      {/* Activate dialog */}
      <Dialog open={!!activateTarget} onOpenChange={(o) => { if (!o) setActivateTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate {activateTarget?.first_name} {activateTarget?.last_name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Their account will be set to Active. Sites that were archived when this Sourcer was disabled will
            not be automatically restored.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateTarget(null)}>Cancel</Button>
            <Button disabled={isPending} onClick={handleActivate}>
              {isPending ? 'Activating…' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend invite dialog */}
      <Dialog open={!!resendTarget} onOpenChange={(o) => { if (!o) setResendTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resend invitation to {resendTarget?.email}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A new invitation email will be sent. The previous link will expire.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResendTarget(null)}>Cancel</Button>
            <Button disabled={isPending} onClick={handleResend}>
              {isPending ? 'Sending…' : 'Resend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
