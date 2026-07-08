// Billing server state. Subscription rows are read-only in the app (the
// stripe-webhook edge function is the only writer); checkout and the billing
// portal are Stripe-hosted pages reached through the billing edge function
// and opened with expo-web-browser, which resolves when the browser hits the
// recruitswipe://billing-return deep link.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';

import { useSession } from '@/features/auth/SessionProvider';
import { useIntegrations } from '@/features/integrations/queries';
import { getSupabase } from '@/lib/supabase';
import { entitlementsFor, type Entitlements, type SubscriptionRow } from './entitlements';

export const SUBSCRIPTIONS_KEY = ['subscriptions'] as const;

const RETURN_URL = 'recruitswipe://billing-return';

export function useSubscriptions() {
  return useQuery({
    queryKey: SUBSCRIPTIONS_KEY,
    queryFn: async (): Promise<SubscriptionRow[]> => {
      const { data, error } = await getSupabase()
        .from('subscriptions')
        .select(
          'id, user_id, plan, status, seats, current_period_end, stripe_customer_id',
        );
      if (error) throw error;
      return (data ?? []) as SubscriptionRow[];
    },
  });
}

export function useEntitlements(): {
  entitlements: Entitlements;
  isLoading: boolean;
} {
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  const subsQuery = useSubscriptions();
  const integrationsQuery = useIntegrations();
  const ownSubs = (subsQuery.data ?? []).filter((s) => s.user_id === userId);
  const ownIntegrations = (integrationsQuery.data ?? []).filter(
    (i) => i.user_id === userId,
  );
  return {
    entitlements: entitlementsFor(ownSubs, {
      integrations: ownIntegrations.length,
    }),
    isLoading: subsQuery.isLoading || integrationsQuery.isLoading,
  };
}

async function invokeBilling(body: Record<string, unknown>): Promise<string> {
  const { data, error } = await getSupabase().functions.invoke('billing', {
    body,
  });
  if (error) throw error;
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error('Billing did not return a URL');
  return url;
}

function useOpenBillingPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<void> => {
      const url = await invokeBilling(body);
      await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
    },
    onSettled: () => {
      // The webhook may still be in flight when the browser closes — the
      // screen keeps a manual Refresh affordance for that race.
      void qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
    },
  });
}

export function useOpenCheckout() {
  const open = useOpenBillingPage();
  return {
    ...open,
    start: (plan: 'pro' | 'team', seats?: number) =>
      open.mutateAsync({ action: 'checkout', plan, seats }),
  };
}

export function useOpenPortal() {
  const open = useOpenBillingPage();
  return {
    ...open,
    start: () => open.mutateAsync({ action: 'portal' }),
  };
}
