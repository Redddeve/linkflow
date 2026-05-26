'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { sendMessage } from '@/app/dashboard/chat/actions';
import { useOptimisticMessages } from './optimistic-messages';

interface Props {
  chatId: string;
}

export function MessageInputForm({ chatId }: Props) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const { addPending, markFailed, remove } = useOptimisticMessages();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    setContent('');
    const tempId = addPending(trimmed);

    try {
      await sendMessage({ chatId, content: trimmed });
      remove(tempId);
      router.refresh();
    } catch (err) {
      markFailed(tempId, err instanceof Error ? err.message : 'Failed to send');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        maxLength={10_000}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!content.trim()}>
          Send
        </Button>
      </div>
    </form>
  );
}
