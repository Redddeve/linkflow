'use client';

import { useEffect } from 'react';
import { markChatRead } from '../actions';

interface Props {
  chatId: string;
}

export function MarkReadOnMount({ chatId }: Props) {
  useEffect(() => {
    markChatRead(chatId).catch(() => {});
  }, [chatId]);

  return null;
}
