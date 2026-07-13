import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { ErrorNote } from '../components/ErrorNote';
import { StatTile } from '../components/StatTile';
import { callAdminApi, type UserDetail as UserDetailShape } from '../lib/api';

export function UserDetail() {
  const { userId = '' } = useParams();
  const { data, error, isPending } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => callAdminApi<UserDetailShape>('get_user', { userId }),
    enabled: userId.length > 0,
  });

  if (isPending) return <p className="muted">Loading…</p>;
  if (error) return <ErrorNote error={error} />;
  if (!data) return null;

  return (
    <div>
      <p>
        <Link to="/users">← Users</Link>
      </p>
      <h2>{data.profile.displayName ?? data.user.email}</h2>
      <p className="muted">
        {data.user.email} · joined {data.user.createdAt.slice(0, 10)} · last
        sign-in {data.user.lastSignInAt?.slice(0, 10) ?? 'never'}
        {data.profile.orgName ? ` · ${data.profile.orgName}` : ''}
      </p>
      <div className="tiles">
        <StatTile label="Swipes" value={data.counts.swipes} />
        <StatTile label="Grades" value={data.counts.grades} />
        <StatTile
          label="Plan"
          value={data.subscriptions[0]?.plan ?? 'freelancer'}
        />
      </div>

      <section>
        <h3>Subscriptions</h3>
        <DataTable
          columns={[
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
          rows={data.subscriptions}
          keyFor={(s) => `${s.plan}-${s.stripeCustomerId}`}
          empty="No subscription rows (freelancer)."
        />
      </section>

      <section>
        <h3>Connected sources</h3>
        <DataTable
          columns={[
            { key: 'provider', header: 'Provider', render: (i) => i.provider },
            {
              key: 'label',
              header: 'Label',
              render: (i) => i.displayLabel ?? '—',
            },
            {
              key: 'connected',
              header: 'Connected',
              render: (i) => i.connectedAt.slice(0, 10),
            },
            {
              key: 'shared',
              header: 'Team-shared',
              render: (i) => (i.sharedTeamId ? 'yes' : 'no'),
            },
          ]}
          rows={data.integrations}
          keyFor={(i) => i.id}
          empty="No connected sources."
        />
      </section>

      <section>
        <h3>Teams</h3>
        <DataTable
          columns={[
            { key: 'name', header: 'Team', render: (t) => t.name },
            { key: 'role', header: 'Role', render: (t) => t.role },
          ]}
          rows={data.teams}
          keyFor={(t) => t.teamId}
          empty="No team memberships."
        />
      </section>

      <section>
        <h3>Devices</h3>
        <DataTable
          columns={[
            { key: 'platform', header: 'Platform', render: (d) => d.platform },
            {
              key: 'device',
              header: 'Device',
              render: (d) => d.deviceName ?? '—',
            },
            {
              key: 'seen',
              header: 'Last seen',
              render: (d) => d.lastSeenAt.slice(0, 10),
            },
          ]}
          rows={data.deviceTokens}
          keyFor={(d) => `${d.platform}-${d.deviceName ?? ''}-${d.lastSeenAt}`}
          empty="No registered devices."
        />
      </section>
    </div>
  );
}
