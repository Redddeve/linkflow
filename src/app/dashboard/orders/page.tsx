// TODO(M4): Replace this stub with the full orders list page.
import { requireUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const metadata = { title: 'Orders' };

export default async function OrdersPage({ searchParams }: PageProps) {
  await requireUser();
  const params = await searchParams;
  const checkedOut = params.checked_out ? Number(params.checked_out) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Orders</h1>
      {checkedOut !== null && (
        <p className="text-sm text-green-600 font-medium">
          {checkedOut} order{checkedOut !== 1 ? 's' : ''} created successfully.
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Full order management will be available in M4.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
