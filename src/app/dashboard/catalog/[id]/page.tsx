import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { AddToCartButton } from '@/components/catalog/add-to-cart-button';
import { SiteDetailView } from '@/components/sites/site-detail-view';
import { fetchActiveCatalogSiteById } from '@/lib/data/catalog';

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
    <SiteDetailView
      backHref="/dashboard/catalog"
      backLabel="Catalog"
      site={{
        domain: site.domain,
        categoryName: site.categories?.name ?? null,
        linkType: site.link_type,
        price_cents: site.price_cents,
        dr: site.dr,
        organic_traffic_count: site.organic_traffic_count,
        organic_keywords_count: site.organic_keywords_count,
        countries: site.countries,
        languages: site.languages,
        top_countries: site.top_countries,
        description: site.description,
        keywords_relevance: site.keywords_relevance,
      }}
      actions={
        <AddToCartButton
          siteId={site.id}
          inMyCart={site.inMyCart}
          inActiveOrder={site.inActiveOrder}
        />
      }
    />
  );
}
