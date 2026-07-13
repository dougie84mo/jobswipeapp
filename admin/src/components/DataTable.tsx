import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  keyFor,
  onRowClick,
  empty,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  keyFor: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty: string;
}) {
  if (rows.length === 0) return <p className="muted">{empty}</p>;
  return (
    <table>
      <thead>
        <tr>
          {columns.map((c) => <th key={c.key}>{c.header}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={keyFor(row)}
            className={onRowClick ? 'clickable' : undefined}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((c) => <td key={c.key}>{c.render(row)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
