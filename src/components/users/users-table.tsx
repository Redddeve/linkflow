'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import type { UserRow } from '@/lib/features/auth';
import { avatarPublicUrl } from '@/lib/features/avatar';

function userInitials(u: UserRow) {
  const f = u.first_name?.trim() ?? '';
  const l = u.last_name?.trim() ?? '';
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  return (u.email[0] ?? '?').toUpperCase();
}

function statusVariant(
  status: UserRow['status'],
): 'success' | 'warning' | 'destructive' {
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
}

export function UsersTable({ users }: Props) {
  const router = useRouter();

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow clickable={false}>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Invited</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow
              key={u.id}
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/users/${u.id}`)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7 text-xs">
                    {u.avatar && (
                      <AvatarImage
                        src={avatarPublicUrl(u.avatar)}
                        alt="User avatar"
                      />
                    )}
                    <AvatarFallback className="text-xs font-semibold">
                      {userInitials(u)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {u.first_name} {u.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{u.role ?? '—'}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(u.status)}>
                  {statusLabel(u.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {u.invited_at
                  ? new Date(u.invited_at).toLocaleDateString('en-CA')
                  : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {users.length === 0 && (
        <TableEmptyState
          title="No users found."
          description="Invite a teammate to get started. New users appear here once they accept their invitation."
        />
      )}
    </>
  );
}
