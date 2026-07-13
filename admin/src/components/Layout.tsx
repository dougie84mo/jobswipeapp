import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';

export function Layout() {
  const { session, loading } = useSession();
  if (loading) return <div className="center">Loading…</div>;
  if (!session) return <Navigate to="/sign-in" replace />;

  return (
    <div className="shell">
      <nav className="sidebar">
        <h1>Recruit Swipe Admin</h1>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/users">Users</NavLink>
        <NavLink to="/subscriptions">Subscriptions</NavLink>
        <NavLink to="/health">Health</NavLink>
        <button type="button" onClick={() => void supabase.auth.signOut()}>
          Sign out
        </button>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
