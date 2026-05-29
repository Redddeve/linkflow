import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAppUrl } from './index';

describe('getAppUrl', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalLocal = process.env.LOCAL_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.LOCAL_URL;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    process.env.LOCAL_URL = originalLocal;
  });

  it('returns NEXT_PUBLIC_SITE_URL when set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://linkflow-alpha.vercel.app';
    process.env.LOCAL_URL = 'http://localhost:3000';
    expect(getAppUrl()).toBe('https://linkflow-alpha.vercel.app');
  });

  it('falls back to LOCAL_URL when NEXT_PUBLIC_SITE_URL is unset', () => {
    process.env.LOCAL_URL = 'http://localhost:3000';
    expect(getAppUrl()).toBe('http://localhost:3000');
  });

  it('falls back to localhost when neither env var is set', () => {
    expect(getAppUrl()).toBe('http://localhost:3000');
  });
});
