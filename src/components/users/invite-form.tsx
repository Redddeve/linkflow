'use client';

import { useState } from 'react';
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
import { inviteUser } from '@/app/dashboard/users/actions';
import type { InviteUserInput } from '@/lib/schemas/users';
import type { UserRole } from '@/lib/features/auth';
import { MANAGER_TARGET_ROLES } from '@/lib/rbac';

interface Props {
  managers: { id: string; first_name: string; last_name: string }[];
  actorRole: UserRole;
}

export function InviteUserForm({ managers, actorRole }: Props) {
  const isManagerActor = actorRole === 'Manager';
  const allowedRoles: UserRole[] = isManagerActor
    ? (MANAGER_TARGET_ROLES as readonly UserRole[]).slice()
    : ['Client', 'Sourcer', 'Copywriter', 'Manager', 'Admin'];
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserInput>({
    defaultValues: { role: 'Client' },
  });

  const selectedRole = useWatch({ control, name: 'role' });

  async function onSubmit(data: InviteUserInput) {
    const result = await inviteUser(data);
    if (!result.success) {
      setError('root', { message: result.message });
      return;
    }
    setOpen(false);
    reset();
    router.push(`/dashboard/users/${result.data.userId}`);
  }

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (!o) reset();
  }

  function handleRoleChange(v: string | null) {
    if (v) setValue('role', v as InviteUserInput['role']);
  }

  function handleManagerChange(name: string | null) {
    const manager = managers.find(
      (m) => `${m.first_name} ${m.last_name}` === name,
    );
    setValue('manager_id', manager?.id ?? null);
  }

  function handleCancel() {
    setOpen(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>Invite User</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>
        <form
          id="invite-user-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="user@example.com"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invite-first_name">First name</Label>
              <Input
                id="invite-first_name"
                {...register('first_name', {
                  required: 'First name is required',
                })}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">
                  {errors.first_name.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-last_name">Last name</Label>
              <Input
                id="invite-last_name"
                {...register('last_name', {
                  required: 'Last name is required',
                })}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={selectedRole ?? 'Client'}
              onValueChange={handleRoleChange}
            >
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRole === 'Client' && (
            <div className="grid gap-2">
              <Label htmlFor="invite-manager_id">Manager</Label>
              <Select onValueChange={handleManagerChange}>
                <SelectTrigger id="invite-manager_id">
                  <SelectValue
                    placeholder={
                      isManagerActor
                        ? 'Defaults to you (override optional)'
                        : 'Assign a manager (optional)'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((m) => (
                    <SelectItem
                      key={m.id}
                      value={`${m.first_name} ${m.last_name}`}
                    >
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
          <Button type="submit" form="invite-user-form" disabled={isSubmitting}>
            {isSubmitting ? 'Sending invite…' : 'Send Invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
