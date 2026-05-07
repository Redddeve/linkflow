'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { inviteUser } from '../actions';
import type { InviteUserInput } from '@/lib/schemas/users';

interface Props {
  managers: { id: string; first_name: string; last_name: string }[];
}

export function InviteUserForm({ managers }: Props) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserInput>({
    defaultValues: { role: 'Client' },
  });

  const selectedRole = useWatch({ control, name: 'role' });

  async function onSubmit(data: InviteUserInput) {
    try {
      const { userId } = await inviteUser(data);
      router.push(`/dashboard/users/${userId}`);
    } catch (e: unknown) {
      setError('root', { message: e instanceof Error ? e.message : 'An error occurred' });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          {...register('email', { required: 'Email is required' })}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="first_name">First name</Label>
          <Input
            id="first_name"
            {...register('first_name', { required: 'First name is required' })}
          />
          {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            {...register('last_name', { required: 'Last name is required' })}
          />
          {errors.last_name && <p className="text-sm text-destructive">{errors.last_name.message}</p>}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Role</Label>
        <Select
          defaultValue="Client"
          onValueChange={(v) => setValue('role', v as InviteUserInput['role'])}
        >
          <SelectTrigger>
            <SelectValue />
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
          <Select onValueChange={(v) => setValue('manager_id', (v as string | null) ?? null)}>
            <SelectTrigger>
              <SelectValue placeholder="Assign a manager (optional)" />
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

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending invite…' : 'Send Invite'}
      </Button>
    </form>
  );
}
