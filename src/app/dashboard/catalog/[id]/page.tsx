import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/lib/auth';
import { BackLink } from '@/components/ui/back-link';
import { AddToCartButton } from '@/components/catalog/add-to-cart-button';
import { fetchActiveCatalogSiteById } from '@/lib/data/catalog';
import clsx from 'clsx';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Site details' };

function formatPrice(cents: number) {
  return cents > 0 ? `$${(cents / 100).toFixed(2)}` : '—';
}

export default async function CatalogSiteDetailPage({ params }: PageProps) {
  const { id } = await params;

  const actor = await requireRole(['Client']).catch(() => notFound());

  const site = await fetchActiveCatalogSiteById(id, actor.id);

  if (!site) notFound();

  const metrics: { label: string; value: React.ReactNode }[] = [
    { label: 'Price', value: formatPrice(site.price_cents) },
    { label: 'DR', value: site.dr ?? '—' },
    {
      label: 'Organic traffic',
      value: site.organic_traffic_count.toLocaleString(),
    },
    {
      label: 'Organic keywords',
      value: site.organic_keywords_count.toLocaleString(),
    },
  ];

  const details: { label: string; value: React.ReactNode }[] = [
    { label: 'Top countries', value: site.top_countries ?? '—' },
    {
      label: 'Countries',
      value: site.countries.length > 0 ? site.countries.join(', ') : '—',
    },
    {
      label: 'Languages',
      value: site.languages.length > 0 ? site.languages.join(', ') : '—',
    },
    { label: 'Link type', value: <span className={clsx(site.link_type !== 'ugc' ? 'capitalize' : 'uppercase')}>{site.link_type}</span> },
  ];

  return (
    <div className="space-y-6">
      <BackLink href="/dashboard/catalog" label="Catalog" />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight leading-tight">
            {site.domain}
          </h1>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <Card key={m.label} size="sm">
            <CardContent>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {m.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {m.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {site.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {site.description}
                </p>
              </CardContent>
            </Card>
          )}

          {site.keywords_relevance && (
            <Card>
              <CardHeader>
                <CardTitle>Keywords relevance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {site.keywords_relevance}
                </p>
              </CardContent>
            </Card>
          )}

          {!site.description && !site.keywords_relevance && (
            <Card>
              <CardContent>
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No additional description provided.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {details.map((d) => (
                <div
                  key={d.label}
                  className="flex items-start justify-between gap-3"
                >
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd className="font-medium text-right">{d.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
