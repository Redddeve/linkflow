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
import { AddToCartButton } from './add-to-cart-button';
import type { CatalogSite } from '@/lib/data/catalog';
import clsx from 'clsx';

interface Props {
  sites: CatalogSite[];
}

export function CatalogTable({ sites }: Props) {
  const router = useRouter();

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow clickable={true}>
            <TableHead>Domain</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Link type</TableHead>
            <TableHead>DR</TableHead>
            <TableHead>Top countries</TableHead>
            <TableHead>Countries</TableHead>
            <TableHead>Languages</TableHead>
            <TableHead>Price</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.map((site) => (
            <TableRow
              key={site.id}
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/catalog/${site.id}`)}
            >
              <TableCell className="font-medium">{site.domain}</TableCell>
              <TableCell>
                {site.categories?.name ? (
                  <Badge variant="secondary">{site.categories.name}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={clsx(
                    site.link_type !== 'ugc' ? 'capitalize' : 'uppercase',
                  )}
                >
                  {site.link_type}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{site.dr ?? '—'}</TableCell>
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
              <TableCell
                className="text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <AddToCartButton
                  siteId={site.id}
                  inMyCart={site.inMyCart}
                  inActiveOrder={site.inActiveOrder}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {sites.length === 0 && (
        <TableEmptyState
          title="No active sites found."
          description="Try clearing your filters. Approved sites appear here as soon as they go live."
        />
      )}
    </>
  );
}
