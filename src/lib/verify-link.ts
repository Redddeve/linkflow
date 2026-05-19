import dns from 'node:dns/promises';

export type VerifyReason =
  | 'scheme'
  | 'private_ip'
  | 'timeout'
  | 'http_status'
  | 'content_type'
  | 'host_mismatch'
  | 'anchor_missing'
  | 'redirect_loop'
  | 'unknown';

export type VerifyResult = { ok: true } | { ok: false; reason: VerifyReason };

export interface VerifyLinkOptions {
  expectedHost?: string;
  anchorText?: string;
}

const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 1_000_000;

function ipv4ToInt(addr: string): number | null {
  const parts = addr.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

function ipv4InRange(addr: string, cidr: string): boolean {
  const [base, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  const a = ipv4ToInt(addr);
  const b = ipv4ToInt(base);
  if (a === null || b === null) return false;
  if (bits === 0) return true;
  const mask = (~0 << (32 - bits)) >>> 0;
  return (a & mask) === (b & mask);
}

const PRIVATE_V4 = [
  '127.0.0.0/8',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '169.254.0.0/16',
  '100.64.0.0/10',
  '0.0.0.0/8',
];

function isPrivateIp(addr: string, family: number): boolean {
  if (family === 4) {
    return PRIVATE_V4.some((cidr) => ipv4InRange(addr, cidr));
  }
  // IPv6 — block loopback, link-local, ULA
  const lower = addr.toLowerCase();
  if (lower === '::1') return true;
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // IPv4-mapped IPv6: ::ffff:127.0.0.1
  const v4MappedMatch = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4MappedMatch) return isPrivateIp(v4MappedMatch[1], 4);
  return false;
}

async function resolveAndCheck(hostname: string): Promise<VerifyReason | null> {
  try {
    const addrs = await dns.lookup(hostname, { all: true });
    if (!addrs.length) return 'unknown';
    for (const a of addrs) {
      if (isPrivateIp(a.address, a.family)) return 'private_ip';
    }
    return null;
  } catch {
    return 'unknown';
  }
}

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

function findAnchor(body: string, anchorText: string): boolean {
  const needle = anchorText.toLowerCase();
  const re = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const inner = m[1].replace(/<[^>]+>/g, '').toLowerCase();
    if (inner.includes(needle)) return true;
  }
  return false;
}

export async function verifyLink(
  url: string,
  opts: VerifyLinkOptions = {},
): Promise<VerifyResult> {
  let current: URL;
  try {
    current = new URL(url);
  } catch {
    return { ok: false, reason: 'scheme' };
  }
  if (current.protocol !== 'https:') return { ok: false, reason: 'scheme' };

  let response: Response | null = null;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const reason = await resolveAndCheck(current.hostname);
    if (reason) return { ok: false, reason };

    let res: Response;
    try {
      res = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': 'linkflow-verifier/1.0' },
      });
    } catch (e) {
      const err = e as { name?: string };
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        return { ok: false, reason: 'timeout' };
      }
      return { ok: false, reason: 'unknown' };
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return { ok: false, reason: 'http_status' };
      if (hop === MAX_REDIRECTS) return { ok: false, reason: 'redirect_loop' };
      try {
        current = new URL(loc, current);
      } catch {
        return { ok: false, reason: 'unknown' };
      }
      if (current.protocol !== 'https:') return { ok: false, reason: 'scheme' };
      continue;
    }

    response = res;
    break;
  }

  if (!response) return { ok: false, reason: 'redirect_loop' };
  if (response.status < 200 || response.status >= 300) {
    return { ok: false, reason: 'http_status' };
  }

  const ct = response.headers.get('content-type') ?? '';
  if (!ct.toLowerCase().startsWith('text/html')) {
    return { ok: false, reason: 'content_type' };
  }

  if (opts.expectedHost) {
    if (normalizeHost(current.hostname) !== normalizeHost(opts.expectedHost)) {
      return { ok: false, reason: 'host_mismatch' };
    }
  }

  if (opts.anchorText) {
    let body: string;
    try {
      body = await response.text();
    } catch {
      return { ok: false, reason: 'unknown' };
    }
    if (body.length > MAX_BODY_BYTES) body = body.slice(0, MAX_BODY_BYTES);
    if (!findAnchor(body, opts.anchorText)) {
      return { ok: false, reason: 'anchor_missing' };
    }
  }

  return { ok: true };
}
