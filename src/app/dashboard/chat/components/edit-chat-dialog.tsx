'use client';

import { useState, useTransition } from 'react';
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
import { editChat } from '../actions';
import type { ChatParticipant } from '@/lib/data/chat';

interface Props {
  chatId: string;
  currentTitle: string;
  currentParticipants: ChatParticipant[];
  allUsers: ChatParticipant[];
}

export function EditChatDialog({ chatId, currentTitle, currentParticipants, allUsers }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [selectedNames, setSelectedNames] = useState<string[]>(
    currentParticipants.map((p) => `${p.first_name} ${p.last_name}`),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nameToId = Object.fromEntries(
    allUsers.map((u) => [`${u.first_name} ${u.last_name}`, u.id]),
  );
  const options = allUsers.map((u) => `${u.first_name} ${u.last_name}`);

  function handleSubmit() {
    const userIds = selectedNames.map((n) => nameToId[n]).filter(Boolean);
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
      setSelectedNames(currentParticipants.map((p) => `${p.first_name} ${p.last_name}`));
      setError(null);
    }
    setOpen(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Edit</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit chat</DialogTitle>
          <DialogDescription>Update the title or participants.</DialogDescription>
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
            <Label htmlFor="edit-chat-title">Title</Label>
            <Input
              id="edit-chat-title"
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
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
