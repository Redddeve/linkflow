import clsx from 'clsx';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackLink } from '@/components/ui/back-link';
import type { Database } from '@/types/database.types';

type LinkType = Database['public']['Enums']['link_type'];
type Country = Database['public']['Enums']['country'];
type Language = Database['public']['Enums']['language'];

export interface SiteDetailData {
  domain: string;
  categoryName: string | null;
  linkType: LinkType;
  price_cents: number;
  dr: number | null;
  organic_traffic_count: number;
  organic_keywords_count: number;
  countries: Country[];
  languages: Language[];
  top_countries: string | null;
  description: string | null;
  keywords_relevance: string | null;
  /** Fields below are only populated for Manager/Admin/Sourcer; clients receive null. */
  requirements?: string | null;
  contact_info?: string | null;
  sourcer_notes?: string | null;
  sourcer_payout_cents?: number | null;
  created_at?: string | null;
}

export interface SiteDetailViewProps {
  site: SiteDetailData;
  backHref: string;
  backLabel: string;
  /** Optional status badge shown next to the title (e.g. site status for managers). */
  statusBadge?: React.ReactNode;
  /** Optional action area shown on the right of the header (edit dialog, add-to-cart, etc.). */
  actions?: React.ReactNode;
  /** Optional row rendered above the metrics (e.g. admin StatusActions). */
  beforeMetrics?: React.ReactNode;
  /** Whether to render the Sourcer details card (Admin/Sourcer only). */
  showSourcerDetails?: boolean;
}

function formatPrice(cents: number | null | undefined) {
  return cents != null && cents > 0 ? `$${(cents / 100).toFixed(2)}` : '—';
}

function longText(value: string | null | undefined) {
  if (!value) return '—';
  return <p className="whitespace-pre-wrap leading-relaxed">{value}</p>;
}

export function SiteDetailView({
  site,
  backHref,
  backLabel,
  statusBadge,
  actions,
  beforeMetrics,
  showSourcerDetails = false,
}: SiteDetailViewProps) {
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
      value: (
        <span
          className={clsx(site.linkType !== 'ugc' ? 'capitalize' : 'uppercase')}
        >
          {site.linkType}
        </span>
      ),
    },
    { label: 'Category', value: site.categoryName ?? '—' },
    { label: 'Top countries', value: site.top_countries ?? '—' },
    {
      label: 'Countries',
      value: site.countries.length > 0 ? site.countries.join(', ') : '—',
    },
    {
      label: 'Languages',
      value: site.languages.length > 0 ? site.languages.join(', ') : '—',
    },
  ];

  if (site.created_at) {
    details.push({
      label: 'Added',
      value: new Date(site.created_at).toLocaleDateString('en-CA'),
    });
  }

  details.push({ label: 'Description', value: longText(site.description) });
  if (site.requirements !== undefined) {
    details.push({ label: 'Requirements', value: longText(site.requirements) });
  }
  details.push({
    label: 'Keywords relevance',
    value: longText(site.keywords_relevance),
  });

  const sourcerDetails: { label: string; value: React.ReactNode }[] = [
    { label: 'Payout', value: formatPrice(site.sourcer_payout_cents) },
    { label: 'Contact info', value: longText(site.contact_info) },
    { label: 'Notes', value: longText(site.sourcer_notes) },
  ];

  return (
    <div className="space-y-6">
      <BackLink href={backHref} label={backLabel} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight leading-tight">
              {site.domain}
            </h1>
            {statusBadge}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {site.categoryName && (
              <Badge variant="secondary">{site.categoryName}</Badge>
            )}
            <Badge
              variant="outline"
              className={clsx(
                site.linkType !== 'ugc' ? 'capitalize' : 'uppercase',
              )}
            >
              {site.linkType}
            </Badge>
          </div>
        </div>
        {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
      </div>

      {beforeMetrics}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <Card key={m.label} size="sm">
            <CardContent>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {m.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {m.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
            {details.map((d) => (
              <div key={d.label} className="space-y-1">
                <dt className="text-muted-foreground">{d.label}</dt>
                <dd className="font-medium text-base">{d.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {showSourcerDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Sourcer details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
              {sourcerDetails.map((d) => (
                <div key={d.label} className="space-y-1">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd className="font-medium text-base">{d.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
