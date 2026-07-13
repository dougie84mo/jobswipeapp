import { AdminApiError } from '../lib/api';

export function ErrorNote({ error }: { error: unknown }) {
  if (error instanceof AdminApiError && error.status === 403) {
    return (
      <p className="error">
        This account isn&apos;t an admin. Ask an existing admin to allowlist
        your email in admin_users.
      </p>
    );
  }
  const message = error instanceof Error ? error.message : 'Request failed';
  return <p className="error">{message}</p>;
}
