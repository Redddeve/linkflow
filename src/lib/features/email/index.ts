export interface MailerSendOpts {
  to: string;
  templateId: number;
  params: Record<string, unknown>;
}

export interface Mailer {
  send(opts: MailerSendOpts): Promise<void>;
}

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

class BrevoMailer implements Mailer {
  async send(opts: MailerSendOpts): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.warn(
        '[email] BREVO_API_KEY is not set; skipping send to',
        opts.to,
      );
      return;
    }

    const sender = {
      name: process.env.BREVO_SENDER_NAME ?? 'LinkFlow',
      email: process.env.BREVO_SENDER_EMAIL ?? 'noreply@example.com',
    };

    try {
      const res = await fetch(BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender,
          to: [{ email: opts.to }],
          templateId: opts.templateId,
          params: opts.params,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(
          `[email] Brevo send failed (${res.status}) to ${opts.to}:`,
          body,
        );
      }
    } catch (e) {
      console.error('[email] Brevo send threw:', e);
    }
  }
}

let cached: Mailer | null = null;

export function getMailer(): Mailer {
  if (!cached) cached = new BrevoMailer();
  return cached;
}

// Map of transactional events the app sends via Brevo.
// Template IDs come from the Brevo dashboard — set them after creating the
// corresponding template, then update this map. Until set, the Brevo call
// will still POST but Brevo returns 4xx; we log and don't throw.
export const EMAIL_TEMPLATES = {
  'user.invited': {
    // TODO: set after creating template in Brevo
    templateId: 1,
    buildParams: (input: {
      first_name?: string | null;
      last_name?: string | null;
      role: string;
      invite_link: string;
    }): Record<string, unknown> => ({
      first_name: input.first_name ?? '',
      last_name: input.last_name ?? '',
      role: input.role,
      invite_link: input.invite_link,
    }),
  },
  'user.invite_resent': {
    // TODO: set after creating template in Brevo
    templateId: 2,
    buildParams: (input: {
      first_name?: string | null;
      invite_link: string;
    }): Record<string, unknown> => ({
      first_name: input.first_name ?? '',
      invite_link: input.invite_link,
    }),
  },
} as const;

export type EmailTemplateKey = keyof typeof EMAIL_TEMPLATES;
