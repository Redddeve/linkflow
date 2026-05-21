interface Props {
  title: string;
  description?: string;
}

export function TableEmptyState({ title, description }: Props) {
  return (
    <div className="rounded-md border border-border border-t-0 bg-muted/20 px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
