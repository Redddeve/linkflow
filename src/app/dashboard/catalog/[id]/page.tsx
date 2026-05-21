import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { requireRole } from '@/lib/auth';
import { BackLink } from '@/components/ui/back-link';
import { AddToCartButton } from '@/components/catalog/add-to-cart-button';
import { fetchActiveCatalogSiteById } from '@/lib/data/catalog';
import clsx from 'clsx';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Site details' };

export default async function CatalogSiteDetailPage({ params }: PageProps) {
  const { id } = await params;

  const actor = await requireRole(['Client']).catch(() => notFound());

  const site = await fetchActiveCatalogSiteById(id, actor.id);

  if (!site) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <BackLink href="/dashboard/catalog" label="Catalog" />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{site.domain}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {site.categories?.name && (
              <Badge variant="secondary">{site.categories.name}</Badge>
            )}
            <Badge
              variant="outline"
              className={clsx(
                site.link_type !== 'ugc' ? 'capitalize' : 'uppercase',
              )}
            >
              {site.link_type}
            </Badge>
          </div>
        </div>
        <div className="shrink-0">
          <AddToCartButton
            siteId={site.id}
            inMyCart={site.inMyCart}
            inActiveOrder={site.inActiveOrder}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Price</dt>
          <dd className="font-medium">
            {site.price_cents > 0
              ? `$${(site.price_cents / 100).toFixed(2)}`
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">DR</dt>
          <dd className="font-medium">{site.dr ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Top countries</dt>
          <dd className="font-medium">{site.top_countries ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Countries</dt>
          <dd className="font-medium">
            {site.countries.length > 0 ? site.countries.join(', ') : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Languages</dt>
          <dd className="font-medium">
            {site.languages.length > 0 ? site.languages.join(', ') : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Organic traffic</dt>
          <dd className="font-medium">
            {site.organic_traffic_count.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Organic keywords</dt>
          <dd className="font-medium">
            {site.organic_keywords_count.toLocaleString()}
          </dd>
        </div>
      </dl>

      {site.description && (
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground">
            Description
          </h2>
          <p className="text-sm whitespace-pre-wrap">{site.description}</p>
        </div>
      )}

      {site.keywords_relevance && (
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground">
            Keywords relevance
          </h2>
          <p className="text-sm whitespace-pre-wrap">
            {site.keywords_relevance}
          </p>
        </div>
      )}
    </div>
  );
}
