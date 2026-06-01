'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createChat,
  listActiveUsersForChat,
} from '@/app/dashboard/chat/actions';
import type { ChatParticipant } from '@/lib/data/chat';

interface Props {
  actorId: string;
}

function displayName(u: ChatParticipant) {
  return `${u.first_name} ${u.last_name}`;
}

export function CreateChatDialog({ actorId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<ChatParticipant[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([actorId]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fetch the directory only once, the first time the dialog opens.
  useEffect(() => {
    if (!open || usersLoaded) return;
    let cancelled = false;
    listActiveUsersForChat()
      .then((rows) => {
        if (!cancelled) {
          setUsers(rows);
          setUsersLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load users');
      });
    return () => {
      cancelled = true;
    };
  }, [open, usersLoaded]);

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  );

  const selectedUsers = selectedIds
    .map((id) => usersById[id])
    .filter(Boolean) as ChatParticipant[];

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter((u) => !selectedIds.includes(u.id))
      .filter((u) => displayName(u).toLowerCase().includes(q))
      .slice(0, 6);
  }, [users, selectedIds, query]);

  function addUser(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setQuery('');
  }

  function removeUser(id: string) {
    if (id === actorId) return;
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  function getTitle() {
    return title.trim() || selectedUsers.map(displayName).join(', ');
  }

  function handleSubmit() {
    if (selectedIds.length < 2) {
      setError('Select at least 2 participants');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await createChat({
          title: getTitle(),
          userIds: selectedIds,
        });
        if (!result.success) {
          setError(result.message);
          return;
        }
        setOpen(false);
        router.push(`/dashboard/chat/${result.data.chatId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  function handleOpenChange(val: boolean) {
    if (!val) {
      setTitle('');
      setSelectedIds([actorId]);
      setQuery('');
      setError(null);
    }
    setOpen(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>New chat</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Chat</DialogTitle>
          <DialogDescription>
            Select participants and a title for the new chat.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chat-title">Title</Label>
            <Input
              id="chat-title"
              placeholder={
                selectedUsers.map(displayName).join(', ') || 'Chat title…'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Participants</Label>
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map((u) => {
                  const isCreator = u.id === actorId;
                  return (
                    <Badge
                      key={u.id}
                      variant="secondary"
                      className="gap-1 pl-2.5 pr-1 py-1 text-xs font-normal"
                    >
                      {displayName(u)}
                      {isCreator ? (
                        <span className="ml-1 text-muted-foreground">
                          (you)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeUser(u.id)}
                          className="ml-0.5 grid h-4 w-4 place-items-center rounded-full cursor-pointer hover:bg-foreground/10"
                          aria-label={`Remove ${displayName(u)}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
              </div>
            )}
            <div className="relative">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                  {suggestions.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => addUser(u.id)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span>{displayName(u)}</span>
                        {u.role && (
                          <span className="text-xs text-muted-foreground">
                            {u.role}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || selectedIds.length < 2}
          >
            {isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
