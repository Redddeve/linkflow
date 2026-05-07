'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { editUser } from '../actions';
import type { UserRow } from '@/lib/auth';
import type { EditUserInput } from '@/lib/schemas/users';

interface Props {
  user: UserRow;
  managers: { id: string; first_name: string; last_name: string }[];
}

export function EditUserForm({ user, managers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDeps, setConfirmDeps] = useState<{ activeOrders: number; activeSites: number } | null>(null);
  const [pendingPatch, setPendingPatch] = useState<EditUserInput | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<EditUserInput>({
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role ?? undefined,
      manager_id: user.manager_id ?? undefined,
    },
  });

  const selectedRole = watch('role');

  async function submit(data: EditUserInput, confirmed = false) {
    startTransition(async () => {
      try {
        const result = await editUser(user.id, data, { confirmRoleChange: confirmed });
        if ('requiresConfirm' in result && result.requiresConfirm) {
          setPendingPatch(data);
          setConfirmDeps(result.requiresConfirm);
        } else {
          router.refresh();
        }
      } catch (e: unknown) {
        setError('root', { message: e instanceof Error ? e.message : 'An error occurred' });
      }
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit((data) => submit(data))} className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" {...register('first_name', { required: 'Required' })} />
            {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" {...register('last_name', { required: 'Required' })} />
            {errors.last_name && <p className="text-sm text-destructive">{errors.last_name.message}</p>}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Role</Label>
          <Select
            defaultValue={user.role ?? undefined}
            onValueChange={(v) => setValue('role', v as EditUserInput['role'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Client">Client</SelectItem>
              <SelectItem value="Sourcer">Sourcer</SelectItem>
              <SelectItem value="Copywriter">Copywriter</SelectItem>
              <SelectItem value="Manager">Manager</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedRole === 'Client' && (
          <div className="grid gap-2">
            <Label>Manager</Label>
            <Select
              defaultValue={user.manager_id ?? undefined}
              onValueChange={(v) => setValue('manager_id', v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign manager" />
              </SelectTrigger>
              <SelectContent>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.first_name} {m.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>

      {/* Confirm role change dialog */}
      <Dialog open={!!confirmDeps} onOpenChange={(o) => { if (!o) { setConfirmDeps(null); setPendingPatch(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm role change</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This user has active dependencies:
            {confirmDeps && confirmDeps.activeOrders > 0 && (
              <span className="block mt-1">• {confirmDeps.activeOrders} active order{confirmDeps.activeOrders !== 1 ? 's' : ''}</span>
            )}
            {confirmDeps && confirmDeps.activeSites > 0 && (
              <span className="block">• {confirmDeps.activeSites} active site{confirmDeps.activeSites !== 1 ? 's' : ''}</span>
            )}
          </p>
          <p className="text-sm">Are you sure you want to change their role anyway?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmDeps(null); setPendingPatch(null); }}>
              Cancel
            </Button>
            <Button
              disabled={isPending}
              onClick={() => {
                if (pendingPatch) submit(pendingPatch, true);
                setConfirmDeps(null);
              }}
            >
              {isPending ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
