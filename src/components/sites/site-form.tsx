'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { createSite, editSite } from '@/app/dashboard/sites/actions';
import { APP_COMMISSION_RATE } from '@/lib/features/commission';
import type { Database } from '@/types/database.types';
import { Constants } from '@/types/database.types';

type UserRole = Database['public']['Enums']['user_role'];

interface Category {
  id: string;
  name: string;
}

interface SiteFormProps {
  mode: 'create' | 'edit';
  siteId?: string;
  categories: Category[];
  actorRole: UserRole;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultValues?: {
    domain?: string;
    category_id?: string | null;
    description?: string | null;
    contact_info?: string | null;
    requirements?: string | null;
    countries?: string[];
    languages?: string[];
    dr?: number | null;
    organic_traffic_count?: number;
    organic_keywords_count?: number;
    price_cents?: number;
    link_type?: string;
    keywords_relevance?: string | null;
    top_countries?: string | null;
    sourcer_notes?: string | null;
  };
}

type FormValues = {
  domain: string;
  category_id: string;
  description: string;
  contact_info: string;
  requirements: string;
  countries: string[];
  languages: string[];
  dr: string;
  organic_traffic_count: string;
  organic_keywords_count: string;
  price_dollars: string;
  link_type: string;
  keywords_relevance: string;
  top_countries: string;
  sourcer_notes: string;
};

const COUNTRIES = Constants.public.Enums.country;
const LANGUAGES = Constants.public.Enums.language;
const LINK_TYPES = Constants.public.Enums.link_type;

export function SiteForm({
  mode,
  siteId,
  categories,
  actorRole,
  onSuccess,
  onCancel,
  defaultValues,
}: SiteFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      domain: defaultValues?.domain ?? '',
      category_id: defaultValues?.category_id ?? '',
      description: defaultValues?.description ?? '',
      contact_info: defaultValues?.contact_info ?? '',
      requirements: defaultValues?.requirements ?? '',
      countries: defaultValues?.countries ?? [],
      languages: defaultValues?.languages ?? [],
      dr: defaultValues?.dr?.toString() ?? '',
      organic_traffic_count:
        defaultValues?.organic_traffic_count?.toString() ?? '0',
      organic_keywords_count:
        defaultValues?.organic_keywords_count?.toString() ?? '0',
      price_dollars: defaultValues?.price_cents
        ? (defaultValues.price_cents / 100).toString()
        : '0',
      link_type: defaultValues?.link_type ?? 'dofollow',
      keywords_relevance: defaultValues?.keywords_relevance ?? '',
      top_countries: defaultValues?.top_countries ?? '',
      sourcer_notes: defaultValues?.sourcer_notes ?? '',
    },
  });

  const showSourcerFields = actorRole === 'Sourcer' || actorRole === 'Admin';

  const categoryLabels: Record<string, string> = {
    '': 'No category',
    ...Object.fromEntries(categories.map((c) => [c.id, c.name])),
  };

  async function onSubmit(data: FormValues) {
    const priceCents = Math.round(parseFloat(data.price_dollars || '0') * 100);
    const payload = {
      domain: data.domain,
      category_id: data.category_id || null,
      description: data.description || null,
      contact_info: data.contact_info || null,
      requirements: data.requirements || null,
      countries: data.countries as Database['public']['Enums']['country'][],
      languages: data.languages as Database['public']['Enums']['language'][],
      dr: data.dr ? parseInt(data.dr, 10) : null,
      organic_traffic_count: parseInt(data.organic_traffic_count, 10) || 0,
      organic_keywords_count: parseInt(data.organic_keywords_count, 10) || 0,
      price_cents: priceCents,
      link_type: data.link_type as Database['public']['Enums']['link_type'],
      keywords_relevance: data.keywords_relevance || null,
      top_countries: data.top_countries || null,
      sourcer_notes: data.sourcer_notes || null,
      sourcer_payout_cents: Math.round(priceCents * (1 - APP_COMMISSION_RATE)),
    };

    try {
      if (mode === 'create') {
        const { siteId: newId } = await createSite(payload);
        router.push(`/dashboard/sites/${newId}`);
      } else if (siteId) {
        await editSite(siteId, payload);
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/dashboard/sites/${siteId}`);
        }
      }
    } catch (err: unknown) {
      setError('root', {
        message: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Core details</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="domain">Domain *</Label>
          <Input
            id="domain"
            placeholder="example.com"
            {...register('domain', { required: 'Domain is required' })}
          />
          {errors.domain && (
            <p className="text-sm text-destructive">{errors.domain.message}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="category">Category</Label>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <Select
                items={categoryLabels}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            maxLength={2000}
            {...register('description')}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="contact-info">Contact info</Label>
          <Textarea
            id="contact-info"
            rows={2}
            maxLength={1000}
            {...register('contact_info')}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="requirements">Requirements</Label>
          <Textarea
            id="requirements"
            rows={3}
            maxLength={2000}
            {...register('requirements')}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">SEO metrics</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="dr">DR (0–100)</Label>
            <Input
              id="dr"
              type="number"
              min={0}
              max={100}
              {...register('dr')}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="organic-traffic">Organic traffic</Label>
            <Input
              id="organic-traffic"
              type="number"
              min={0}
              {...register('organic_traffic_count')}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="organic-keywords">Organic keywords</Label>
            <Input
              id="organic-keywords"
              type="number"
              min={0}
              {...register('organic_keywords_count')}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="top-countries">Top countries (text)</Label>
          <Input
            id="top-countries"
            maxLength={500}
            {...register('top_countries')}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Placement details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="price">Price (USD)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.01"
              {...register('price_dollars')}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="link-type">Link type</Label>
            <Controller
              control={control}
              name="link_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="link-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINK_TYPES.map((lt) => (
                      <SelectItem key={lt} value={lt} className="capitalize">
                        {lt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Countries</Label>
          <Controller
            control={control}
            name="countries"
            render={({ field }) => (
              <MultiSelect
                options={[...COUNTRIES]}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select countries…"
              />
            )}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Languages</Label>
          <Controller
            control={control}
            name="languages"
            render={({ field }) => (
              <MultiSelect
                options={[...LANGUAGES]}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select languages…"
              />
            )}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="keywords-relevance">Keywords relevance</Label>
          <Textarea
            id="keywords-relevance"
            rows={2}
            maxLength={500}
            {...register('keywords_relevance')}
          />
        </div>
      </section>

      {showSourcerFields && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Sourcer details</h2>
          <div className="grid gap-1.5">
            <Label htmlFor="sourcer-notes">Sourcer notes</Label>
            <Textarea
              id="sourcer-notes"
              rows={3}
              maxLength={2000}
              {...register('sourcer_notes')}
            />
          </div>
        </section>
      )}

      {errors.root && (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? mode === 'create'
              ? 'Adding…'
              : 'Saving…'
            : mode === 'create'
              ? 'Add site'
              : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
