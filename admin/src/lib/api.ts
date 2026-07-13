// Typed client for the admin-api edge function. Response shapes mirror
// supabase/functions/admin-api/actions.ts — keep the two in sync by hand
// (no codegen; the function shapes responses explicitly).

import { FUNCTIONS_URL, SUPABASE_ANON_KEY, supabase } from './supabase';

export interface DayCount {
  day: string;
  count: number;
}

export interface Metrics {
  totals: { recruiters: number; grades: number; activeLast7d: number };
  paidByPlan: Record<string, number>;
  signupsByDay: DayCount[];
  swipesByDay: DayCount[];
}

export interface AdminUserRow {
  userId: string;
  email: string;
  displayName: string | null;
  orgName: string | null;
  createdAt: string;
  plan: string;
  connectionCount: number;
  teamNames: string[];
}

export interface UserDetail {
  user: {
    userId: string;
    email: string;
    createdAt: string;
    lastSignInAt: string | null;
  };
  profile: { displayName: string | null; orgName: string | null };
  subscriptions: Array<{
    plan: string;
    status: string;
    seats: number;
    currentPeriodEnd: string | null;
    stripeCustomerId: string;
  }>;
  integrations: Array<{
    id: string;
    provider: string;
    displayLabel: string | null;
    connectedAt: string;
    sharedTeamId: string | null;
  }>;
  teams: Array<{ teamId: string; name: string; role: string }>;
  deviceTokens: Array<{
    platform: string;
    deviceName: string | null;
    lastSeenAt: string;
  }>;
  counts: { swipes: number; grades: number };
}

export interface SubscriptionRow {
  userId: string;
  email: string;
  plan: string;
  status: string;
  seats: number;
  currentPeriodEnd: string | null;
  stripeCustomerId: string;
}

export interface Health {
  connectionsByProvider: Array<{ provider: string; count: number }>;
  recentFailures: Array<{
    provider: string;
    actionType: string;
    swipedAt: string;
    detail: string | null;
  }>;
  staleTopics: Array<{
    topicId: string;
    provider: string;
    requisitionExternalId: string;
    lastScannedAt: string | null;
  }>;
}

export class AdminApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function callAdminApi<T>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AdminApiError('not signed in', 401);

  const res = await fetch(`${FUNCTIONS_URL}/admin-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, params }),
  });

  const body: unknown = await res.json();
  if (!res.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new AdminApiError(message, res.status);
  }
  return body as T;
}
