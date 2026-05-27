import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { requireRole } from '@/lib/features/auth';
import { StatusActions } from '@/components/sites/status-actions';
import { EditSiteDialog } from '@/components/sites/edit-dialog';
import { SiteDetailView } from '@/components/sites/site-detail-view';
import { fetchSiteById } from '@/lib/data/sites';
import { fetchCategories } from '@/lib/data/categories';
import type { Database } from '@/types/database.types';

interface PageProps {
  params: Promise<{ id: string }>;
}

type SiteStatus = Database['public']['Enums']['site_status'];

function statusVariant(
  status: SiteStatus,
): 'success' | 'warning' | 'destructive' | 'outline' {
  if (status === 'Active') return 'success';
  if (status === 'Pending') return 'warning';
  if (status === 'Needs changes') return 'destructive';
  return 'outline';
}

export default async function SiteDetailPage({ params }: PageProps) {
  const { id } = await params;

  const actor = await requireRole(['Sourcer', 'Manager', 'Admin']).catch(() =>
    notFound(),
  );

  const { data: site, error } = await fetchSiteById(id);
  if (error || !site) notFound();

  if (actor.role === 'Sourcer' && site.sourcer_id !== actor.id) notFound();

  const canEdit =
    (actor.role === 'Sourcer' && site.sourcer_id === actor.id) ||
    actor.role === 'Admin';

  const categories = canEdit ? await fetchCategories() : [];

  const isAdmin = actor.role === 'Admin';
  const showSourcerFields = actor.role === 'Admin' || actor.role === 'Sourcer';
  const categoryName =
    (site.categories as { name: string } | null)?.name ?? null;

  return (
    <SiteDetailView
      backHref="/dashboard/sites"
      backLabel="Sites"
      site={{
        domain: site.domain,
        categoryName,
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
        requirements: site.requirements,
        contact_info: site.contact_info,
        sourcer_notes: site.sourcer_notes,
        sourcer_payout_cents: site.sourcer_payout_cents,
        created_at: site.created_at,
      }}
      statusBadge={
        <Badge variant={statusVariant(site.status)}>{site.status}</Badge>
      }
      actions={
        canEdit ? (
          <EditSiteDialog
            siteId={id}
            actorRole={actor.role!}
            categories={categories}
            defaultValues={{
              domain: site.domain,
              category_id: site.category_id,
              description: site.description,
              contact_info: site.contact_info,
              requirements: site.requirements,
              countries: site.countries,
              languages: site.languages,
              dr: site.dr,
              organic_traffic_count: site.organic_traffic_count,
              organic_keywords_count: site.organic_keywords_count,
              price_cents: site.price_cents,
              link_type: site.link_type,
              keywords_relevance: site.keywords_relevance,
              top_countries: site.top_countries,
              sourcer_notes: site.sourcer_notes,
            }}
          />
        ) : undefined
      }
      beforeMetrics={
        isAdmin ? (
          <StatusActions siteId={id} currentStatus={site.status} />
        ) : undefined
      }
      showSourcerDetails={showSourcerFields}
    />
  );
}
