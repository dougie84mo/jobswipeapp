import { useQuery } from '@tanstack/react-query';
import { DataTable } from '../components/DataTable';
import { ErrorNote } from '../components/ErrorNote';
import { callAdminApi, type Health as HealthShape } from '../lib/api';

export function Health() {
  const { data, error, isPending } = useQuery({
    queryKey: ['integration-health'],
    queryFn: () => callAdminApi<HealthShape>('integration_health'),
  });

  if (isPending) return <p className="muted">Loading…</p>;
  if (error) return <ErrorNote error={error} />;
  if (!data) return null;

  return (
    <div>
      <h2>Integration health</h2>

      <section>
        <h3>Connections by provider</h3>
        <DataTable
          columns={[
            { key: 'provider', header: 'Provider', render: (r) => r.provider },
            { key: 'count', header: 'Connections', render: (r) => r.count },
          ]}
          rows={data.connectionsByProvider}
          keyFor={(r) => r.provider}
          empty="No connected sources."
        />
      </section>

      <section>
        <h3>Swipe-action failures (7d)</h3>
        <DataTable
          columns={[
            { key: 'provider', header: 'Provider', render: (f) => f.provider },
            { key: 'action', header: 'Action', render: (f) => f.actionType },
            {
              key: 'when',
              header: 'When',
              render: (f) => f.swipedAt.replace('T', ' ').slice(0, 16),
            },
            {
              key: 'detail',
              header: 'Error',
              render: (f) => f.detail ?? '—',
            },
          ]}
          rows={data.recentFailures}
          keyFor={(f) => `${f.swipedAt}-${f.actionType}-${f.provider}`}
          empty="No failures in the last 7 days."
        />
      </section>

      <section>
        <h3>Stale notification topics</h3>
        <p className="muted">
          Enabled topics never scanned, or last scanned over an hour ago (cron
          runs every 15 minutes).
        </p>
        <DataTable
          columns={[
            { key: 'provider', header: 'Provider', render: (t) => t.provider },
            {
              key: 'req',
              header: 'Requisition',
              render: (t) => t.requisitionExternalId,
            },
            {
              key: 'scanned',
              header: 'Last scanned',
              render: (t) =>
                t.lastScannedAt?.replace('T', ' ').slice(0, 16) ?? 'never',
            },
          ]}
          rows={data.staleTopics}
          keyFor={(t) => t.topicId}
          empty="No stale topics."
        />
      </section>
    </div>
  );
}
