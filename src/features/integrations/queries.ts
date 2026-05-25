// TanStack Query hooks for the `integrations` table.
//
// RLS scopes every query to the signed-in user, so we never have to filter
// by user_id from the app. New integration rows are created through the
// `create_integration` RPC (see supabase/migrations/0002_integration_rpc.sql)
// so the bytea credentials column can be encrypted server-side in phase 4
// without changing the app.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '@/lib/supabase';
import type { ProviderId } from '@/ats/types';

export interface IntegrationRow {
  id: string;
  user_id: string;
  provider: ProviderId;
  display_label: string | null;
  status: 'active' | 'expired' | 'revoked';
  connected_at: string;
  last_synced_at: string | null;
}

const KEY = ['integrations'] as const;

export function useIntegrations() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<IntegrationRow[]> => {
      const { data, error } = await getSupabase()
        .from('integrations')
        .select('id, user_id, provider, display_label, status, connected_at, last_synced_at')
        .order('connected_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as IntegrationRow[];
    },
  });
}

export function useIntegration(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    enabled: Boolean(id),
    queryFn: async (): Promise<IntegrationRow | null> => {
      if (!id) return null;
      const { data, error } = await getSupabase()
        .from('integrations')
        .select('id, user_id, provider, display_label, status, connected_at, last_synced_at')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as IntegrationRow | null) ?? null;
    },
  });
}

export interface CreateIntegrationInput {
  provider: ProviderId;
  displayLabel: string;
  credentials: string;
}

export function useCreateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateIntegrationInput): Promise<string> => {
      const { data, error } = await getSupabase().rpc('create_integration', {
        p_provider: input.provider,
        p_display_label: input.displayLabel,
        p_credentials: input.credentials,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await getSupabase().from('integrations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
