'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface OptimisticMessage {
  tempId: string;
  content: string;
  startedAt: number;
  status: 'pending' | 'failed';
  error?: string;
}

interface Ctx {
  pending: OptimisticMessage[];
  addPending: (content: string) => string;
  markFailed: (tempId: string, error: string) => void;
  remove: (tempId: string) => void;
}

const OptimisticContext = createContext<Ctx | null>(null);

export function OptimisticMessagesProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<OptimisticMessage[]>([]);

  const addPending = useCallback((content: string) => {
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPending((prev) => [
      ...prev,
      { tempId, content, startedAt: Date.now(), status: 'pending' },
    ]);
    return tempId;
  }, []);

  const markFailed = useCallback((tempId: string, error: string) => {
    setPending((prev) =>
      prev.map((m) => (m.tempId === tempId ? { ...m, status: 'failed', error } : m)),
    );
  }, []);

  const remove = useCallback((tempId: string) => {
    setPending((prev) => prev.filter((m) => m.tempId !== tempId));
  }, []);

  const value = useMemo(() => ({ pending, addPending, markFailed, remove }), [
    pending,
    addPending,
    markFailed,
    remove,
  ]);

  return <OptimisticContext.Provider value={value}>{children}</OptimisticContext.Provider>;
}

export function useOptimisticMessages(): Ctx {
  const ctx = useContext(OptimisticContext);
  if (!ctx) throw new Error('useOptimisticMessages must be used inside OptimisticMessagesProvider');
  return ctx;
}
