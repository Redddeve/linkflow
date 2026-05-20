import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { InvoicePdf } from '../../components/invoice-pdf';
import { formatBillingMonth } from '@/lib/billing';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const actor = await requireUser();
  if (!actor.role) return new NextResponse('Forbidden', { status: 403 });
  if (!['Client', 'Manager', 'Admin'].includes(actor.role)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const supabase = await createClient();
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, client_id, billing_month, status, total_price_cents, created_at, sent_at, marked_as_paid_at')
    .eq('id', id)
    .single();

  if (error || !invoice) return new NextResponse('Not found', { status: 404 });

  // RBAC: Client may only download own; Manager/Admin all.
  if (actor.role === 'Client' && invoice.client_id !== actor.id) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const [{ data: client }, { data: orders }] = await Promise.all([
    supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', invoice.client_id)
      .single(),
    supabase
      .from('orders')
      .select('id, site_domain, publish_date, price_cents')
      .eq('invoice_id', invoice.id)
      .order('publish_date', { ascending: true }),
  ]);

  if (!client) return new NextResponse('Client not found', { status: 404 });

  const pdfBuffer = await renderToBuffer(
    <InvoicePdf invoice={invoice} client={client} orders={orders ?? []} />,
  );

  const filename = `invoice-${formatBillingMonth(invoice.billing_month).replace(' ', '-')}.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Private: never cached by shared caches (CDN, proxies). 60s browser
      // cache keeps repeated downloads cheap.
      'Cache-Control': 'private, max-age=60',
    },
  });
}
