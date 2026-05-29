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
type Country = Database['public']['Enums']['country'];
type Language = Database['public']['Enums']['language'];

interface SiteRow {
  id: string;
  domain: string;
  status: SiteStatus;
  price_cents: number;
  link_type: string;
  category_id: string | null;
  created_at: string;
  dr: number | null;
  top_countries: string | null;
  countries: Country[];
  languages: Language[];
  categories: { name: string } | null;
}

interface Props {
  sites: SiteRow[];
}

function statusVariant(
  status: SiteStatus,
): 'success' | 'warning' | 'outline' {
  if (status === 'Active') return 'success';
  if (status === 'Pending') return 'warning';
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
            <TableHead>DR</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Top countries</TableHead>
            <TableHead>Countries</TableHead>
            <TableHead>Languages</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
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
              <TableCell className="text-sm">{site.dr ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {site.categories?.name ?? '—'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {site.top_countries ?? '—'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {site.countries.length > 0 ? site.countries.join(', ') : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {site.languages.length > 0 ? site.languages.join(', ') : '—'}
              </TableCell>
              <TableCell className="text-sm">
                {site.price_cents > 0
                  ? `$${(site.price_cents / 100).toFixed(2)}`
                  : '—'}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(site.status)}>
                  {site.status}
                </Badge>
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
