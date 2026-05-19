import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));
vi.mock('node:dns/promises', () => ({
  default: { lookup: lookupMock },
  lookup: lookupMock,
}));

const { verifyLink } = await import('./verify-link');

const PUBLIC_IP = { address: '93.184.216.34', family: 4 };

interface MockResponseInit {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  url?: string;
}

function mockFetchOnce(init: MockResponseInit = {}): Response {
  const headers = new Headers(init.headers ?? { 'content-type': 'text/html; charset=utf-8' });
  return {
    status: init.status ?? 200,
    headers,
    url: init.url ?? '',
    text: async () => init.body ?? '<html></html>',
  } as unknown as Response;
}

describe('verifyLink', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    lookupMock.mockReset();
    lookupMock.mockResolvedValue([PUBLIC_IP]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects non-https schemes', async () => {
    const result = await verifyLink('http://example.com/post');
    expect(result).toEqual({ ok: false, reason: 'scheme' });
  });

  it('rejects when DNS resolves to a loopback address', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);
    const result = await verifyLink('https://evil.local/post');
    expect(result).toEqual({ ok: false, reason: 'private_ip' });
  });

  it('rejects 10.0.0.0/8 private range', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '10.1.2.3', family: 4 }]);
    const result = await verifyLink('https://internal.example/post');
    expect(result).toEqual({ ok: false, reason: 'private_ip' });
  });

  it('rejects 172.16.0.0/12 private range', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '172.20.5.5', family: 4 }]);
    const result = await verifyLink('https://internal.example/post');
    expect(result).toEqual({ ok: false, reason: 'private_ip' });
  });

  it('rejects 192.168.0.0/16 private range', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '192.168.1.1', family: 4 }]);
    const result = await verifyLink('https://internal.example/post');
    expect(result).toEqual({ ok: false, reason: 'private_ip' });
  });

  it('rejects link-local 169.254.0.0/16', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }]);
    const result = await verifyLink('https://metadata.example/post');
    expect(result).toEqual({ ok: false, reason: 'private_ip' });
  });

  it('rejects IPv6 loopback ::1', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '::1', family: 6 }]);
    const result = await verifyLink('https://example.com/post');
    expect(result).toEqual({ ok: false, reason: 'private_ip' });
  });

  it('rejects when any resolved IP is private (mixed list)', async () => {
    lookupMock.mockResolvedValueOnce([PUBLIC_IP, { address: '10.0.0.5', family: 4 }]);
    const result = await verifyLink('https://example.com/post');
    expect(result).toEqual({ ok: false, reason: 'private_ip' });
  });

  it('rejects non-2xx status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockFetchOnce({ status: 404 })));
    const result = await verifyLink('https://example.com/post');
    expect(result).toEqual({ ok: false, reason: 'http_status' });
  });

  it('rejects non-html content-type', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockFetchOnce({ headers: { 'content-type': 'application/json' } })));
    const result = await verifyLink('https://example.com/post');
    expect(result).toEqual({ ok: false, reason: 'content_type' });
  });

  it('returns ok on a 200 text/html response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockFetchOnce({ status: 200, body: '<html><body>hi</body></html>' })));
    const result = await verifyLink('https://example.com/post');
    expect(result).toEqual({ ok: true });
  });

  it('rejects host_mismatch when expectedHost does not match', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockFetchOnce({ status: 200 })));
    const result = await verifyLink('https://other.com/post', { expectedHost: 'example.com' });
    expect(result).toEqual({ ok: false, reason: 'host_mismatch' });
  });

  it('accepts when expectedHost matches (strips www)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockFetchOnce({ status: 200 })));
    const result = await verifyLink('https://www.example.com/post', { expectedHost: 'example.com' });
    expect(result).toEqual({ ok: true });
  });

  it('follows up to 3 redirects, then redirect_loop', async () => {
    const fetchMock = vi.fn(async () =>
      ({
        status: 301,
        headers: new Headers({ location: 'https://example.com/next' }),
        url: '',
        text: async () => '',
      }) as unknown as Response,
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await verifyLink('https://example.com/post');
    expect(result).toEqual({ ok: false, reason: 'redirect_loop' });
    expect(fetchMock).toHaveBeenCalledTimes(4); // initial + 3 redirects
  });

  it('re-checks IP on redirect hop (blocks redirect to private IP)', async () => {
    lookupMock.mockResolvedValueOnce([PUBLIC_IP]).mockResolvedValueOnce([{ address: '10.0.0.1', family: 4 }]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 302,
        headers: new Headers({ location: 'https://internal.example/x' }),
        url: '',
        text: async () => '',
      } as unknown as Response)
      .mockResolvedValueOnce(mockFetchOnce({ status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await verifyLink('https://example.com/post');
    expect(result).toEqual({ ok: false, reason: 'private_ip' });
  });

  it('returns timeout when fetch is aborted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        throw err;
      }),
    );
    const result = await verifyLink('https://example.com/post');
    expect(result).toEqual({ ok: false, reason: 'timeout' });
  });

  it('returns unknown on generic fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('boom'); }));
    const result = await verifyLink('https://example.com/post');
    expect(result).toEqual({ ok: false, reason: 'unknown' });
  });

  it('rejects anchor_missing when anchorText is given and not present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        mockFetchOnce({ status: 200, body: '<html><a href="/x">hello world</a></html>' }),
      ),
    );
    const result = await verifyLink('https://example.com/post', { anchorText: 'click me' });
    expect(result).toEqual({ ok: false, reason: 'anchor_missing' });
  });

  it('matches anchorText case-insensitively', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        mockFetchOnce({ status: 200, body: '<html><a href="/x">Click Me Now</a></html>' }),
      ),
    );
    const result = await verifyLink('https://example.com/post', { anchorText: 'click me' });
    expect(result).toEqual({ ok: true });
  });
});
