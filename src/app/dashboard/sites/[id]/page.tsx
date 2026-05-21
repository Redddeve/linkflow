import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

function statusVariant(
  status: SiteStatus,
): 'success' | 'warning' | 'destructive' | 'outline' {
  if (status === 'Active') return 'success';
  if (status === 'Pending') return 'warning';
  if (status === 'Needs changes') return 'destructive';
  return 'outline';
}

function formatPrice(cents: number) {
  return cents > 0 ? `$${(cents / 100).toFixed(2)}` : '—';
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

  const categoryName = (site.categories as { name: string } | null)?.name;

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
    {
      label: 'Link type',
      value: <span className="capitalize">{site.link_type}</span>,
    },
    {
      label: 'Countries',
      value: site.countries.length > 0 ? site.countries.join(', ') : '—',
    },
    {
      label: 'Languages',
      value: site.languages.length > 0 ? site.languages.join(', ') : '—',
    },
    { label: 'Category', value: categoryName ?? '—' },
    {
      label: 'Added',
      value: new Date(site.created_at).toLocaleDateString('en-CA'),
    },
  ];

  return (
    <div className="space-y-6">
      <BackLink href="/dashboard/sites" label="Sites" />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight leading-tight">
              {site.domain}
            </h1>
            <Badge variant={statusVariant(site.status)}>{site.status}</Badge>
          </div>
          {categoryName && (
            <p className="text-sm text-muted-foreground">{categoryName}</p>
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

      {isAdmin && <StatusActions siteId={id} currentStatus={site.status} />}

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

          {site.requirements && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {site.requirements}
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

          {site.contact_info && (
            <Card>
              <CardHeader>
                <CardTitle>Contact info</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {site.contact_info}
                </p>
              </CardContent>
            </Card>
          )}

          {showSourcerFields && (
            <Card>
              <CardHeader>
                <CardTitle>Sourcer details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Payout</span>
                  <span className="font-medium">
                    {formatPrice(site.sourcer_payout_cents)}
                  </span>
                </div>
                {site.sourcer_notes && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {site.sourcer_notes}
                    </p>
                  </div>
                )}
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
