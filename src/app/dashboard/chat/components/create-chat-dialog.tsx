'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { MultiSelect } from '@/components/ui/multi-select';
import { createChat } from '../actions';
import type { ChatParticipant } from '@/lib/data/chat';

interface Props {
  users: ChatParticipant[];
  actorId: string;
}

export function CreateChatDialog({ users, actorId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedNames, setSelectedNames] = useState<string[]>(() => {
    const self = users.find((u) => u.id === actorId);
    return self ? [`${self.first_name} ${self.last_name}`] : [];
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nameToId = Object.fromEntries(
    users.map((u) => [`${u.first_name} ${u.last_name}`, u.id]),
  );
  const options = users.map((u) => `${u.first_name} ${u.last_name}`);

  function getTitle() {
    return title.trim() || selectedNames.join(', ');
  }

  function handleSubmit() {
    const userIds = selectedNames.map((n) => nameToId[n]).filter(Boolean);
    if (userIds.length < 2) {
      setError('Select at least 2 participants');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const { chatId } = await createChat({ title: getTitle(), userIds });
        setOpen(false);
        router.push(`/dashboard/chat/${chatId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  function handleOpenChange(val: boolean) {
    if (!val) {
      setTitle('');
      const self = users.find((u) => u.id === actorId);
      setSelectedNames(self ? [`${self.first_name} ${self.last_name}`] : []);
      setError(null);
    }
    setOpen(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>New chat</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create chat</DialogTitle>
          <DialogDescription>
            Select participants and a title for the new chat.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Participants</Label>
            <MultiSelect
              options={options}
              value={selectedNames}
              onChange={setSelectedNames}
              placeholder="Select participants…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-title">Title</Label>
            <Input
              id="chat-title"
              placeholder={selectedNames.join(', ') || 'Chat title…'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || selectedNames.length < 2}>
            {isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
