import { LifeBuoy, Sparkles } from 'lucide-react';
import type { ChatCategory } from '@/lib/data/chat';

export function CategoryIcon({ category }: { category: ChatCategory }) {
  if (category === 'Support') {
    return (
      <LifeBuoy
        className="h-3.5 w-3.5 shrink-0 text-primary"
        aria-label="Support chat"
      />
    );
  }
  if (category === 'Sales') {
    return (
      <Sparkles
        className="h-3.5 w-3.5 shrink-0 text-primary"
        aria-label="Sales chat"
      />
    );
  }
  return null;
}
