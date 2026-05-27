import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatBillingMonth } from '@/lib/features/billing';
import type { Database } from '@/types/database.types';

type InvoiceStatus = Database['public']['Enums']['invoice_status'];

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brand: { fontSize: 18, fontWeight: 'bold' },
  meta: { textAlign: 'right' },
  metaLabel: { color: '#666', fontSize: 9 },
  metaValue: { fontSize: 11 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 9,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  clientName: { fontSize: 13, fontWeight: 'bold' },
  table: { marginTop: 12, borderTopWidth: 1, borderColor: '#ddd' },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingVertical: 6,
  },
  headerRow: { backgroundColor: '#f5f5f5', fontWeight: 'bold', fontSize: 9 },
  cellSite: { flex: 3 },
  cellDate: { flex: 1.2 },
  cellPrice: { flex: 1, textAlign: 'right' },
  totals: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#000',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalLabel: { fontSize: 11, fontWeight: 'bold', marginRight: 24 },
  totalValue: { fontSize: 14, fontWeight: 'bold' },
  footer: { marginTop: 32, color: '#666', fontSize: 9 },
  stamp: {
    marginTop: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: '#888',
    color: '#888',
    fontSize: 10,
  },
});

export interface InvoicePdfOrder {
  id: string;
  site_domain: string;
  publish_date: string | null;
  price_cents: number;
}

export interface InvoicePdfProps {
  invoice: {
    id: string;
    billing_month: string;
    status: InvoiceStatus;
    total_price_cents: number;
    created_at: string;
    sent_at: string | null;
    marked_as_paid_at: string | null;
  };
  client: { first_name: string; last_name: string; email: string };
  orders: InvoicePdfOrder[];
}

export function InvoicePdf({ invoice, client, orders }: InvoicePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Linkflow</Text>
            <Text style={styles.metaLabel}>Invoice</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>Billing month</Text>
            <Text style={styles.metaValue}>
              {formatBillingMonth(invoice.billing_month)}
            </Text>
            <Text style={[styles.metaLabel, { marginTop: 6 }]}>Invoice #</Text>
            <Text style={styles.metaValue}>{invoice.id.slice(0, 8)}</Text>
            <Text style={[styles.metaLabel, { marginTop: 6 }]}>Issued</Text>
            <Text style={styles.metaValue}>
              {new Date(invoice.created_at).toLocaleDateString('en-CA')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill to</Text>
          <Text style={styles.clientName}>
            {client.first_name} {client.last_name}
          </Text>
          <Text>{client.email}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={styles.cellSite}>Site</Text>
            <Text style={styles.cellDate}>Published</Text>
            <Text style={styles.cellPrice}>Price</Text>
          </View>
          {orders.map((o) => (
            <View style={styles.row} key={o.id}>
              <Text style={styles.cellSite}>{o.site_domain}</Text>
              <Text style={styles.cellDate}>{o.publish_date ?? '—'}</Text>
              <Text style={styles.cellPrice}>
                ${(o.price_cents / 100).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            ${(invoice.total_price_cents / 100).toFixed(2)}
          </Text>
        </View>

        {invoice.status === 'Sent' && invoice.sent_at && (
          <View style={styles.stamp}>
            <Text>
              SENT — {new Date(invoice.sent_at).toLocaleDateString('en-CA')}
            </Text>
          </View>
        )}
        {invoice.status === 'Paid' && invoice.marked_as_paid_at && (
          <View style={[styles.stamp, { borderColor: '#080', color: '#080' }]}>
            <Text>
              PAID —{' '}
              {new Date(invoice.marked_as_paid_at).toLocaleDateString('en-CA')}
            </Text>
          </View>
        )}

        <Text style={styles.footer}>Thank you for your business.</Text>
      </Page>
    </Document>
  );
}
