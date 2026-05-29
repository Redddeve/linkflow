import { MessageSquare } from 'lucide-react';

export function ChatEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary-text">
        <MessageSquare className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Pick a conversation</p>
        <p className="text-sm text-muted-foreground">
          Select a chat from the list to view messages, or start a new one.
        </p>
      </div>
    </div>
  );
}
