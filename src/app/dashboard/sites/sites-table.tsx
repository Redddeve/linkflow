'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Database } from '@/types/database.types';

type SiteStatus = Database['public']['Enums']['site_status'];
type UserRole = Database['public']['Enums']['user_role'];

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
  actorRole: UserRole;
}

function statusVariant(status: SiteStatus): 'success' | 'warning' | 'destructive' | 'outline' {
  if (status === 'Active') return 'success';
  if (status === 'Pending') return 'warning';
  if (status === 'Needs changes') return 'destructive';
  return 'outline';
}

export function SitesTable({ sites, actorRole }: Props) {
  void actorRole;

  return (
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
        {sites.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No sites found.
            </TableCell>
          </TableRow>
        )}
        {sites.map((site) => (
          <TableRow key={site.id}>
            <TableCell className="font-medium">
              <Link href={`/dashboard/sites/${site.id}`} className="hover:underline">
                {site.domain}
              </Link>
            </TableCell>
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
  );
}
