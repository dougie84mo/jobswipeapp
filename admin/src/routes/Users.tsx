import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { ErrorNote } from '../components/ErrorNote';
import { type AdminUserRow, callAdminApi } from '../lib/api';

export function Users() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data, error, isPending } = useQuery({
    queryKey: ['users', search],
    queryFn: () =>
      callAdminApi<{ users: AdminUserRow[] }>('list_users', { search }),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSearch(input.trim());
  }

  return (
    <div>
      <h2>Users</h2>
      <form className="searchbar" onSubmit={onSubmit}>
        <input
          placeholder="Search email or name…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>
      {error ? <ErrorNote error={error} /> : null}
      {isPending ? <p className="muted">Loading…</p> : null}
      {data
        ? (
          <DataTable
            columns={[
              { key: 'email', header: 'Email', render: (u) => u.email },
              {
                key: 'name',
                header: 'Name',
                render: (u) => u.displayName ?? '—',
              },
              { key: 'plan', header: 'Plan', render: (u) => u.plan },
              {
                key: 'connections',
                header: 'Connections',
                render: (u) => u.connectionCount,
              },
              {
                key: 'teams',
                header: 'Teams',
                render: (u) => u.teamNames.join(', ') || '—',
              },
              {
                key: 'created',
                header: 'Joined',
                render: (u) => u.createdAt.slice(0, 10),
              },
            ]}
            rows={data.users}
            keyFor={(u) => u.userId}
            onRowClick={(u) => navigate(`/users/${u.userId}`)}
            empty="No users match."
          />
        )
        : null}
    </div>
  );
}
