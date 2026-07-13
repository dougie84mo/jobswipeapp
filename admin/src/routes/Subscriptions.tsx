import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { ErrorNote } from '../components/ErrorNote';
import { callAdminApi, type SubscriptionRow } from '../lib/api';

export function Subscriptions() {
  const navigate = useNavigate();
  const { data, error, isPending } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () =>
      callAdminApi<{ subscriptions: SubscriptionRow[] }>('list_subscriptions'),
  });

  if (isPending) return <p className="muted">Loading…</p>;
  if (error) return <ErrorNote error={error} />;

  return (
    <div>
      <h2>Subscriptions</h2>
      <DataTable
        columns={[
          { key: 'email', header: 'User', render: (s) => s.email },
          { key: 'plan', header: 'Plan', render: (s) => s.plan },
          { key: 'status', header: 'Status', render: (s) => s.status },
          { key: 'seats', header: 'Seats', render: (s) => s.seats },
          {
            key: 'renews',
            header: 'Renews',
            render: (s) => s.currentPeriodEnd?.slice(0, 10) ?? '—',
          },
          {
            key: 'customer',
            header: 'Stripe customer',
            render: (s) => s.stripeCustomerId,
          },
        ]}
        rows={data?.subscriptions ?? []}
        keyFor={(s) => `${s.userId}-${s.plan}`}
        onRowClick={(s) => navigate(`/users/${s.userId}`)}
        empty="No subscriptions yet."
      />
    </div>
  );
}
