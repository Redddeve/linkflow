import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface BackLinkProps {
  href: string;
  label: string;
}

export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="mb-6 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
