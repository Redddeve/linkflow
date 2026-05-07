'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { createSite, editSite } from '../actions';
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
    sourcer_payout_cents?: number;
  };
}

const COUNTRIES = Constants.public.Enums.country;
const LANGUAGES = Constants.public.Enums.language;
const LINK_TYPES = Constants.public.Enums.link_type;

export function SiteForm({ mode, siteId, categories, actorRole, defaultValues }: SiteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [domain, setDomain] = useState(defaultValues?.domain ?? '');
  const [categoryId, setCategoryId] = useState(defaultValues?.category_id ?? '');
  const [description, setDescription] = useState(defaultValues?.description ?? '');
  const [contactInfo, setContactInfo] = useState(defaultValues?.contact_info ?? '');
  const [requirements, setRequirements] = useState(defaultValues?.requirements ?? '');
  const [countries, setCountries] = useState<string[]>(defaultValues?.countries ?? []);
  const [languages, setLanguages] = useState<string[]>(defaultValues?.languages ?? []);
  const [dr, setDr] = useState(defaultValues?.dr?.toString() ?? '');
  const [organicTraffic, setOrganicTraffic] = useState(
    defaultValues?.organic_traffic_count?.toString() ?? '0',
  );
  const [organicKeywords, setOrganicKeywords] = useState(
    defaultValues?.organic_keywords_count?.toString() ?? '0',
  );
  const [priceDollars, setPriceDollars] = useState(
    defaultValues?.price_cents ? (defaultValues.price_cents / 100).toString() : '0',
  );
  const [linkType, setLinkType] = useState(defaultValues?.link_type ?? 'dofollow');
  const [keywordsRelevance, setKeywordsRelevance] = useState(
    defaultValues?.keywords_relevance ?? '',
  );
  const [topCountries, setTopCountries] = useState(defaultValues?.top_countries ?? '');
  const [sourcerNotes, setSourcerNotes] = useState(defaultValues?.sourcer_notes ?? '');
  const [sourcerPayoutDollars, setSourcerPayoutDollars] = useState(
    defaultValues?.sourcer_payout_cents ? (defaultValues.sourcer_payout_cents / 100).toString() : '0',
  );

  const showSourcerFields = actorRole === 'Sourcer' || actorRole === 'Admin' || actorRole === 'Manager';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const payload = {
      domain,
      category_id: categoryId || null,
      description: description || null,
      contact_info: contactInfo || null,
      requirements: requirements || null,
      countries: countries as Database['public']['Enums']['country'][],
      languages: languages as Database['public']['Enums']['language'][],
      dr: dr ? parseInt(dr, 10) : null,
      organic_traffic_count: parseInt(organicTraffic, 10) || 0,
      organic_keywords_count: parseInt(organicKeywords, 10) || 0,
      price_cents: Math.round(parseFloat(priceDollars || '0') * 100),
      link_type: linkType as Database['public']['Enums']['link_type'],
      keywords_relevance: keywordsRelevance || null,
      top_countries: topCountries || null,
      sourcer_notes: sourcerNotes || null,
      sourcer_payout_cents: Math.round(parseFloat(sourcerPayoutDollars || '0') * 100),
    };

    startTransition(async () => {
      try {
        if (mode === 'create') {
          const { siteId: newId } = await createSite(payload);
          router.push(`/dashboard/sites/${newId}`);
        } else if (siteId) {
          await editSite(siteId, payload);
          router.push(`/dashboard/sites/${siteId}`);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Core */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Core details</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="domain">Domain *</Label>
          <Input
            id="domain"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="category">Category</Label>
          <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '')}>
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
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="contact-info">Contact info</Label>
          <Textarea
            id="contact-info"
            rows={2}
            maxLength={1000}
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="requirements">Requirements</Label>
          <Textarea
            id="requirements"
            rows={3}
            maxLength={2000}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
          />
        </div>
      </section>

      {/* SEO Metrics */}
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
              value={dr}
              onChange={(e) => setDr(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="organic-traffic">Organic traffic</Label>
            <Input
              id="organic-traffic"
              type="number"
              min={0}
              value={organicTraffic}
              onChange={(e) => setOrganicTraffic(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="organic-keywords">Organic keywords</Label>
            <Input
              id="organic-keywords"
              type="number"
              min={0}
              value={organicKeywords}
              onChange={(e) => setOrganicKeywords(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="top-countries">Top countries (text)</Label>
          <Input
            id="top-countries"
            maxLength={500}
            value={topCountries}
            onChange={(e) => setTopCountries(e.target.value)}
          />
        </div>
      </section>

      {/* Placement details */}
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
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="link-type">Link type</Label>
            <Select value={linkType} onValueChange={(v) => setLinkType(v ?? 'dofollow')}>
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
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Countries</Label>
          <MultiSelect
            options={[...COUNTRIES]}
            value={countries}
            onChange={setCountries}
            placeholder="Select countries…"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Languages</Label>
          <MultiSelect
            options={[...LANGUAGES]}
            value={languages}
            onChange={setLanguages}
            placeholder="Select languages…"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="keywords-relevance">Keywords relevance</Label>
          <Textarea
            id="keywords-relevance"
            rows={2}
            maxLength={500}
            value={keywordsRelevance}
            onChange={(e) => setKeywordsRelevance(e.target.value)}
          />
        </div>
      </section>

      {/* Sourcer notes (Sourcer/Manager/Admin only) */}
      {showSourcerFields && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Sourcer details</h2>
          <div className="grid gap-1.5">
            <Label htmlFor="sourcer-notes">Sourcer notes</Label>
            <Textarea
              id="sourcer-notes"
              rows={3}
              maxLength={2000}
              value={sourcerNotes}
              onChange={(e) => setSourcerNotes(e.target.value)}
            />
          </div>
          {(actorRole === 'Admin' || actorRole === 'Manager') && (
            <div className="grid gap-1.5 max-w-xs">
              <Label htmlFor="sourcer-payout">Sourcer payout (USD)</Label>
              <Input
                id="sourcer-payout"
                type="number"
                min={0}
                step="0.01"
                value={sourcerPayoutDollars}
                onChange={(e) => setSourcerPayoutDollars(e.target.value)}
              />
            </div>
          )}
        </section>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (mode === 'create' ? 'Adding…' : 'Saving…') : mode === 'create' ? 'Add site' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
