'use client';

import { useMemo, useState, useTransition } from 'react';
import { X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { editChat } from '@/app/dashboard/chat/actions';
import type { ChatParticipant } from '@/lib/data/chat';

interface Props {
  chatId: string;
  currentTitle: string;
  currentParticipants: ChatParticipant[];
  allUsers: ChatParticipant[];
  creatorId: string;
  actorId: string;
}

function displayName(u: ChatParticipant) {
  return `${u.first_name} ${u.last_name}`;
}

export function EditChatDialog({
  chatId,
  currentTitle,
  currentParticipants,
  allUsers,
  creatorId,
  actorId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    currentParticipants.map((p) => p.id),
  );
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const usersById = useMemo(
    () => Object.fromEntries(allUsers.map((u) => [u.id, u])),
    [allUsers],
  );

  const selectedUsers = selectedIds
    .map((id) => usersById[id])
    .filter(Boolean) as ChatParticipant[];

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allUsers
      .filter((u) => !selectedIds.includes(u.id))
      .filter((u) => displayName(u).toLowerCase().includes(q))
      .slice(0, 6);
  }, [allUsers, selectedIds, query]);

  function addUser(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setQuery('');
  }

  function removeUser(id: string) {
    if (id === creatorId) return;
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  function handleSubmit() {
    const userIds = selectedIds.includes(creatorId)
      ? selectedIds
      : [creatorId, ...selectedIds];
    if (userIds.length < 2) {
      setError('At least 2 participants required');
      return;
    }
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await editChat({ chatId, title: title.trim(), userIds });
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  function handleOpenChange(val: boolean) {
    if (!val) {
      setTitle(currentTitle);
      setSelectedIds(currentParticipants.map((p) => p.id));
      setQuery('');
      setError(null);
    }
    setOpen(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Edit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Chat</DialogTitle>
          <DialogDescription>
            Update the title or participants.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-chat-title">Title</Label>
            <Input
              id="edit-chat-title"
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
                  const isCreator = u.id === creatorId;
                  const isSelf = u.id === actorId;
                  return (
                    <Badge
                      key={u.id}
                      variant="secondary"
                      className="gap-1 pl-2.5 pr-1 py-1 text-xs font-normal"
                    >
                      {displayName(u)}
                      {isCreator ? (
                        <span className="ml-1 text-muted-foreground">
                          {isSelf ? '(you, creator)' : '(creator)'}
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
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
