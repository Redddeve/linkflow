import type { Database } from '@/types/database.types';

type OrderStatus = Database['public']['Enums']['order_status'];

export const KANBAN_COLUMNS = [
  'New',
  'In Progress',
  'Content Sent',
  'Needs changes',
  'Content Approved',
  'Published',
  'Canceled',
] as const satisfies readonly OrderStatus[];

export type KanbanColumnStatus = (typeof KANBAN_COLUMNS)[number];

export function isKanbanColumn(s: string): s is KanbanColumnStatus {
  return (KANBAN_COLUMNS as readonly string[]).includes(s);
}
