interface Comment {
  id: string;
  text: string;
  created_at: string;
  created_by_id: string;
}

interface UserInfo {
  first_name: string;
  last_name: string;
}

interface Props {
  comments: Comment[];
  userMap: Record<string, UserInfo>;
}

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CommentsTimeline({ comments, userMap }: Props) {
  if (comments.length === 0) return null;

  return (
    <div className="space-y-3">
      {comments.map((c) => {
        const author = userMap[c.created_by_id];
        const name = author ? `${author.first_name} ${author.last_name}` : 'Unknown';
        return (
          <div key={c.id} className="flex gap-3 text-sm">
            <div className="flex-1 rounded-md border bg-muted/40 px-3 py-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">{relativeTime(c.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{c.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
