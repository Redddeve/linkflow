import { describe, it, expect } from 'vitest';
import { normalizeDomain, createSiteSchema, setSiteStatusSchema } from '@/lib/schemas/sites';
import { AppError } from '@/lib/errors';

describe('normalizeDomain()', () => {
  it('strips scheme and www', () => {
    expect(normalizeDomain('https://www.example.com')).toBe('example.com');
  });

  it('lowercases the hostname', () => {
    expect(normalizeDomain('http://WWW.Example.COM')).toBe('example.com');
  });

  it('strips path and query', () => {
    expect(normalizeDomain('https://www.example.com/path?q=1')).toBe('example.com');
  });

  it('handles domain without scheme', () => {
    expect(normalizeDomain('example.com')).toBe('example.com');
  });

  it('handles domain with trailing slash', () => {
    expect(normalizeDomain('example.com/')).toBe('example.com');
  });

  it('preserves eTLD+1 like co.uk', () => {
    expect(normalizeDomain('https://www.example.co.uk/path')).toBe('example.co.uk');
  });

  it('throws VALIDATION AppError for invalid domain', () => {
    expect(() => normalizeDomain('not a domain at all %%%')).toThrow(AppError);
    expect(() => normalizeDomain('not a domain at all %%%')).toThrow('Invalid domain');
  });
});

describe('createSiteSchema', () => {
  it('normalizes domain via transform', () => {
    const result = createSiteSchema.safeParse({ domain: 'https://WWW.Test.COM' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.domain).toBe('test.com');
  });

  it('fails on empty domain', () => {
    const result = createSiteSchema.safeParse({ domain: '' });
    expect(result.success).toBe(false);
  });

  it('applies defaults for numeric fields', () => {
    const result = createSiteSchema.safeParse({ domain: 'foo.com' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price_cents).toBe(0);
      expect(result.data.organic_traffic_count).toBe(0);
      expect(result.data.link_type).toBe('dofollow');
    }
  });
});

describe('setSiteStatusSchema', () => {
  it('passes for APPROVE', () => {
    const result = setSiteStatusSchema.safeParse({ action: 'APPROVE' });
    expect(result.success).toBe(true);
  });

  it('passes for ARCHIVE and REACTIVATE', () => {
    expect(setSiteStatusSchema.safeParse({ action: 'ARCHIVE' }).success).toBe(
      true,
    );
    expect(
      setSiteStatusSchema.safeParse({ action: 'REACTIVATE' }).success,
    ).toBe(true);
  });

  it('rejects unknown actions (including the removed NEEDS_CHANGES)', () => {
    expect(
      setSiteStatusSchema.safeParse({ action: 'NEEDS_CHANGES' }).success,
    ).toBe(false);
  });
});
