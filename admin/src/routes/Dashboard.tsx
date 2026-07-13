import { useQuery } from '@tanstack/react-query';
import { ErrorNote } from '../components/ErrorNote';
import { StatTile } from '../components/StatTile';
import { callAdminApi, type Metrics } from '../lib/api';

function TrendTable({ title, rows }: { title: string; rows: Metrics['signupsByDay'] }) {
  return (
    <section>
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day}>
              <td>{r.day}</td>
              <td>{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function Dashboard() {
  const { data, error, isPending } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => callAdminApi<Metrics>('metrics'),
  });

  if (isPending) return <p className="muted">Loading…</p>;
  if (error) return <ErrorNote error={error} />;

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="tiles">
        <StatTile label="Recruiters" value={data.totals.recruiters} />
        <StatTile label="Active (7d)" value={data.totals.activeLast7d} />
        <StatTile label="Grades" value={data.totals.grades} />
        <StatTile label="Basic" value={data.paidByPlan.basic ?? 0} />
        <StatTile label="Pro" value={data.paidByPlan.pro ?? 0} />
        <StatTile label="Team Pro" value={data.paidByPlan.team_pro ?? 0} />
      </div>
      <div className="row-grids">
        <TrendTable title="Signups (14d)" rows={data.signupsByDay} />
        <TrendTable title="Swipes (14d)" rows={data.swipesByDay} />
      </div>
    </div>
  );
}
