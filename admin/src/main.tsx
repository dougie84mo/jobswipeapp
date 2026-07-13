import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SignIn } from './routes/SignIn';
import { Dashboard } from './routes/Dashboard';
import './styles.css';

// Tasks 8-10 replace these stubs with real routes.
const Stub = ({ name }: { name: string }) => <h2>{name} — coming in a later task</h2>;

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/sign-in" element={<SignIn />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Stub name="Users" />} />
            <Route path="/users/:userId" element={<Stub name="User" />} />
            <Route path="/subscriptions" element={<Stub name="Subscriptions" />} />
            <Route path="/health" element={<Stub name="Health" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
