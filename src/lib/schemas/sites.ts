import { z } from 'zod';
import { AppError } from '@/lib/errors';

export function normalizeDomain(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const withScheme = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
  let hostname: string;
  try {
    hostname = new URL(withScheme).hostname;
  } catch {
    throw new AppError('VALIDATION', 'Invalid domain');
  }
  return hostname.replace(/^www\./, '');
}

export const createSiteSchema = z.object({
  domain: z.string().min(1, 'Domain is required').transform(normalizeDomain),
  category_id: z.string().uuid().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  contact_info: z.string().max(1000).nullable().optional(),
  requirements: z.string().max(2000).nullable().optional(),
  countries: z.array(z.enum(['Ukraine', 'Germany', 'USA', 'United Kingdom', 'Canada', 'Australia', 'France', 'Japan', 'Brazil', 'India', 'Mexico'])).optional().default([]),
  languages: z.array(z.enum(['English', 'German', 'Spanish', 'Portuguese', 'French'])).optional().default([]),
  dr: z.number().int().min(0).max(100).nullable().optional(),
  organic_traffic_count: z.number().int().min(0).default(0),
  organic_keywords_count: z.number().int().min(0).default(0),
  price_cents: z.number().int().min(0).default(0),
  link_type: z.enum(['dofollow', 'nofollow', 'sponsored', 'ugc']).default('dofollow'),
  keywords_relevance: z.string().max(500).nullable().optional(),
  top_countries: z.string().max(500).nullable().optional(),
  sourcer_notes: z.string().max(2000).nullable().optional(),
  sourcer_payout_cents: z.number().int().min(0).default(0),
});

export const editSiteSchema = z.object({
  domain: z.string().min(1).transform(normalizeDomain).optional(),
  category_id: z.string().uuid().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  contact_info: z.string().max(1000).nullable().optional(),
  requirements: z.string().max(2000).nullable().optional(),
  countries: z.array(z.enum(['Ukraine', 'Germany', 'USA', 'United Kingdom', 'Canada', 'Australia', 'France', 'Japan', 'Brazil', 'India', 'Mexico'])).optional(),
  languages: z.array(z.enum(['English', 'German', 'Spanish', 'Portuguese', 'French'])).optional(),
  dr: z.number().int().min(0).max(100).nullable().optional(),
  organic_traffic_count: z.number().int().min(0).optional(),
  organic_keywords_count: z.number().int().min(0).optional(),
  price_cents: z.number().int().min(0).optional(),
  link_type: z.enum(['dofollow', 'nofollow', 'sponsored', 'ugc']).optional(),
  keywords_relevance: z.string().max(500).nullable().optional(),
  top_countries: z.string().max(500).nullable().optional(),
  sourcer_notes: z.string().max(2000).nullable().optional(),
  sourcer_payout_cents: z.number().int().min(0).optional(),
});

export const setSiteStatusSchema = z
  .object({
    action: z.enum(['APPROVE', 'NEEDS_CHANGES', 'ARCHIVE', 'REACTIVATE']),
    change_note: z.string().optional(),
  })
  .refine(
    (data) => data.action !== 'NEEDS_CHANGES' || (data.change_note?.trim().length ?? 0) >= 10,
    { message: 'Change note must be at least 10 characters', path: ['change_note'] },
  );

export type CreateSiteInput = z.input<typeof createSiteSchema>;
export type EditSiteInput = z.input<typeof editSiteSchema>;
export type SetSiteStatusInput = z.infer<typeof setSiteStatusSchema>;
export type SiteStatusAction = SetSiteStatusInput['action'];
