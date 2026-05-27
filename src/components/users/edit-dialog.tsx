'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { editUser } from '@/app/dashboard/users/actions';
import type { UserRow } from '@/lib/features/auth';
import type { EditUserInput } from '@/lib/schemas/users';

interface Props {
  user: UserRow;
  managers: { id: string; first_name: string; last_name: string }[];
}

export function EditUserDialog({ user, managers }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmDeps, setConfirmDeps] = useState<{
    activeOrders: number;
    activeSites: number;
  } | null>(null);
  const [pendingPatch, setPendingPatch] = useState<EditUserInput | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
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

  const selectedRole = useWatch({ control, name: 'role' });
  const managerId = useWatch({ control, name: 'manager_id' });

  const managerLabels = Object.fromEntries(
    managers.map((m) => [m.id, `${m.first_name} ${m.last_name}`]),
  );

  function handleRoleChange(v: string | null) {
    if (v) setValue('role', v as EditUserInput['role']);
  }

  function handleManagerChange(v: string | null) {
    setValue('manager_id', v || null);
  }

  function handleCancel() {
    setOpen(false);
  }

  function handleConfirmDialogChange(o: boolean) {
    if (!o) {
      setConfirmDeps(null);
      setPendingPatch(null);
    }
  }

  function handleCancelConfirm() {
    setConfirmDeps(null);
    setPendingPatch(null);
  }

  function handleConfirm() {
    if (pendingPatch) submit(pendingPatch, true);
    setConfirmDeps(null);
  }

  async function submit(data: EditUserInput, confirmed = false) {
    startTransition(async () => {
      try {
        const result = await editUser(user.id, data, {
          confirmRoleChange: confirmed,
        });
        if ('requiresConfirm' in result && result.requiresConfirm) {
          setPendingPatch(data);
          setConfirmDeps(result.requiresConfirm);
        } else {
          setOpen(false);
          router.refresh();
        }
      } catch (e: unknown) {
        setError('root', {
          message: e instanceof Error ? e.message : 'An error occurred',
        });
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          Edit
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit {user.first_name} {user.last_name}
            </DialogTitle>
          </DialogHeader>
          <form
            id="edit-user-form"
            onSubmit={handleSubmit((data) => submit(data))}
            className="grid gap-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  {...register('first_name', { required: 'Required' })}
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">
                    {errors.first_name.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  {...register('last_name', { required: 'Required' })}
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">
                    {errors.last_name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={selectedRole ?? ''}
                onValueChange={handleRoleChange}
              >
                <SelectTrigger id="edit-role">
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
                <Label htmlFor="edit-manager">Manager</Label>
                <Select
                  items={managerLabels}
                  value={managerId ?? ''}
                  onValueChange={handleManagerChange}
                >
                  <SelectTrigger id="edit-manager">
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

            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" form="edit-user-form" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDeps} onOpenChange={handleConfirmDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm role change</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This user has active dependencies:
            {confirmDeps && confirmDeps.activeOrders > 0 && (
              <span className="block mt-1">
                • {confirmDeps.activeOrders} active order
                {confirmDeps.activeOrders !== 1 ? 's' : ''}
              </span>
            )}
            {confirmDeps && confirmDeps.activeSites > 0 && (
              <span className="block">
                • {confirmDeps.activeSites} active site
                {confirmDeps.activeSites !== 1 ? 's' : ''}
              </span>
            )}
          </p>
          <p className="text-sm">
            Are you sure you want to change their role anyway?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelConfirm}>
              Cancel
            </Button>
            <Button disabled={isPending} onClick={handleConfirm}>
              {isPending ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
