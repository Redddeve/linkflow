import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { requireRole } from '@/lib/auth';
import { StatusActions } from '@/components/sites/status-actions';
import { EditSiteDialog } from '@/components/sites/edit-dialog';
import { BackLink } from '@/components/ui/back-link';
import { fetchSiteById } from '@/lib/data/sites';
import { fetchCategories } from '@/lib/data/categories';
import type { Database } from '@/types/database.types';

interface PageProps {
  params: Promise<{ id: string }>;
}

type SiteStatus = Database['public']['Enums']['site_status'];

function statusVariant(status: SiteStatus): 'success' | 'warning' | 'destructive' | 'outline' {
  if (status === 'Active') return 'success';
  if (status === 'Pending') return 'warning';
  if (status === 'Needs changes') return 'destructive';
  return 'outline';
}

export default async function SiteDetailPage({ params }: PageProps) {
  const { id } = await params;

  const actor = await requireRole(['Sourcer', 'Manager', 'Admin']).catch(() => notFound());

  const { data: site, error } = await fetchSiteById(id);

  if (error || !site) notFound();

  if (actor.role === 'Sourcer' && site.sourcer_id !== actor.id) notFound();

  const canEdit =
    (actor.role === 'Sourcer' && site.sourcer_id === actor.id) ||
    actor.role === 'Admin';

  const categories = canEdit ? await fetchCategories() : [];

  const isAdmin = actor.role === 'Admin';
  const showSourcerFields = actor.role === 'Admin' || actor.role === 'Sourcer';

  const categoryName = (site.categories as { name: string } | null)?.name;

  return (
    <div className="space-y-6 max-w-3xl">
      <BackLink href="/dashboard/sites" label="Sites" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{site.domain}</h1>
            <Badge variant={statusVariant(site.status)}>{site.status}</Badge>
          </div>
          {categoryName && (
            <p className="text-sm text-muted-foreground mt-1">{categoryName}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {canEdit && (
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
          )}
        </div>
      </div>

      {isAdmin && (
        <StatusActions siteId={id} currentStatus={site.status} />
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Link type</dt>
          <dd className="font-medium capitalize">{site.link_type}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Price</dt>
          <dd className="font-medium">
            {site.price_cents > 0 ? `$${(site.price_cents / 100).toFixed(2)}` : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">DR</dt>
          <dd className="font-medium">{site.dr ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Organic traffic</dt>
          <dd className="font-medium">{site.organic_traffic_count.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Organic keywords</dt>
          <dd className="font-medium">{site.organic_keywords_count.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Countries</dt>
          <dd className="font-medium">{site.countries.length > 0 ? site.countries.join(', ') : '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Languages</dt>
          <dd className="font-medium">{site.languages.length > 0 ? site.languages.join(', ') : '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Added</dt>
          <dd className="font-medium">{new Date(site.created_at).toLocaleDateString('en-CA')}</dd>
        </div>
      </dl>

      {site.description && (
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground">Description</h2>
          <p className="text-sm whitespace-pre-wrap">{site.description}</p>
        </div>
      )}

      {site.contact_info && (
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground">Contact info</h2>
          <p className="text-sm whitespace-pre-wrap">{site.contact_info}</p>
        </div>
      )}

      {site.requirements && (
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground">Requirements</h2>
          <p className="text-sm whitespace-pre-wrap">{site.requirements}</p>
        </div>
      )}

      {site.keywords_relevance && (
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground">Keywords relevance</h2>
          <p className="text-sm whitespace-pre-wrap">{site.keywords_relevance}</p>
        </div>
      )}

      {showSourcerFields && (
        <div className="border-t pt-4 space-y-3">
          <h2 className="text-sm font-semibold">Sourcer details</h2>
          {site.sourcer_notes && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{site.sourcer_notes}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Payout</p>
            <p className="text-sm font-medium">
              {site.sourcer_payout_cents > 0
                ? `$${(site.sourcer_payout_cents / 100).toFixed(2)}`
                : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
