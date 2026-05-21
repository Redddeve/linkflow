'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import type { Database } from '@/types/database.types';

type SiteStatus = Database['public']['Enums']['site_status'];

interface SiteRow {
  id: string;
  domain: string;
  status: SiteStatus;
  price_cents: number;
  link_type: string;
  category_id: string | null;
  created_at: string;
  categories: { name: string } | null;
}

interface Props {
  sites: SiteRow[];
}

function statusVariant(status: SiteStatus): 'success' | 'warning' | 'destructive' | 'outline' {
  if (status === 'Active') return 'success';
  if (status === 'Pending') return 'warning';
  if (status === 'Needs changes') return 'destructive';
  return 'outline';
}

export function SitesTable({ sites }: Props) {
  const router = useRouter();

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Domain</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Link type</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>Added</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.map((site) => (
            <TableRow
              key={site.id}
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/sites/${site.id}`)}
            >
              <TableCell className="font-medium">{site.domain}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {site.categories?.name ?? '—'}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(site.status)}>{site.status}</Badge>
              </TableCell>
              <TableCell className="text-sm capitalize">{site.link_type}</TableCell>
              <TableCell className="text-right text-sm">
                {site.price_cents > 0 ? `$${(site.price_cents / 100).toFixed(2)}` : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {new Date(site.created_at).toLocaleDateString('en-CA')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {sites.length === 0 && (
        <TableEmptyState
          title="No sites found."
          description="Add a site or adjust filters above. New sites appear here once they're created."
        />
      )}
    </>
  );
}
