import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('BrevoMailer', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.BREVO_API_KEY = 'test-key';
    process.env.BREVO_SENDER_EMAIL = 'sender@example.com';
    process.env.BREVO_SENDER_NAME = 'LinkFlow';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it('POSTs to the Brevo API with the expected payload', async () => {
    const { getMailer } = await import('./index');
    const mailer = getMailer();
    await mailer.send({
      to: 'recipient@example.com',
      templateId: 7,
      params: { first_name: 'Alice', link: 'https://example.com' },
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.method).toBe('POST');
    expect(init.headers['api-key']).toBe('test-key');
    expect(init.headers['content-type']).toBe('application/json');
    const body = JSON.parse(init.body);
    expect(body.sender).toEqual({
      name: 'LinkFlow',
      email: 'sender@example.com',
    });
    expect(body.to).toEqual([{ email: 'recipient@example.com' }]);
    expect(body.templateId).toBe(7);
    expect(body.params).toEqual({
      first_name: 'Alice',
      link: 'https://example.com',
    });
  });

  it('no-ops when BREVO_API_KEY is unset', async () => {
    delete process.env.BREVO_API_KEY;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getMailer } = await import('./index');

    await getMailer().send({
      to: 'r@example.com',
      templateId: 1,
      params: {},
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('logs and does not throw on Brevo error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('boom', { status: 500 })),
    );
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getMailer } = await import('./index');

    await expect(
      getMailer().send({ to: 'r@example.com', templateId: 1, params: {} }),
    ).resolves.toBeUndefined();
    expect(err).toHaveBeenCalled();
  });
});
