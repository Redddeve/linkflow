import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SiteForm } from '../../new/site-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Edit site' };

export default async function EditSitePage({ params }: PageProps) {
  const { id } = await params;

  const actor = await requireRole(['Sourcer', 'Manager', 'Admin']).catch(() => notFound());

  const supabase = await createClient();

  const { data: site, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !site) notFound();

  if (actor.role === 'Sourcer' && site.sourcer_id !== actor.id) notFound();

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit site</h1>
        <p className="text-sm text-muted-foreground">{site.domain}</p>
      </div>
      <SiteForm
        mode="edit"
        siteId={id}
        categories={categories ?? []}
        actorRole={actor.role!}
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
          sourcer_payout_cents: site.sourcer_payout_cents,
        }}
      />
    </div>
  );
}
