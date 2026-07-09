// recruiter_profiles is auto-populated by the on_auth_user_created trigger
// in 0001_init.sql. RLS lets a recruiter select and update their own row,
// no others. We always query for the signed-in user; user_id filtering is
// enforced server-side.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CandidateFilters } from '@/features/filters/types';
import type { DeckMode } from '@/features/swipes/deck-modes';
import { getSupabase } from '@/lib/supabase';

export interface NotificationPrefs {
  push_enabled?: boolean;
  // Future keys land here without a schema migration:
  // per-integration filters, quiet-hours start/end, etc.
}

export interface AppPrefs {
  gesture_swiping?: boolean;
  /** Global candidate-filter defaults; per-req overrides live in requisition_filters. */
  candidate_filters?: CandidateFilters;
  /** Last-used requisition working mode (swipe deck vs grade list). */
  deck_mode?: DeckMode;
  // Future UI / behavior toggles: haptics, deck stack size, theme override.
}

export interface RecruiterProfile {
  user_id: string;
  display_name: string | null;
  org_name: string | null;
  avatar_url: string | null;
  notification_prefs: NotificationPrefs;
  app_prefs: AppPrefs;
  created_at: string;
}

const KEY = ['recruiter-profile'] as const;

export function useRecruiterProfile(userId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, userId ?? null],
    enabled: Boolean(userId),
    queryFn: async (): Promise<RecruiterProfile | null> => {
      if (!userId) return null;
      const { data, error } = await getSupabase()
        .from('recruiter_profiles')
        .select(
          'user_id, display_name, org_name, avatar_url, notification_prefs, app_prefs, created_at',
        )
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data as RecruiterProfile | null) ?? null;
    },
  });
}

export interface UpdateProfileInput {
  userId: string;
  display_name?: string | null;
  org_name?: string | null;
  notification_prefs?: NotificationPrefs;
  app_prefs?: AppPrefs;
}

export function useUpdateRecruiterProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput): Promise<void> => {
      const patch: Record<string, string | NotificationPrefs | AppPrefs | null> = {};
      if (input.display_name !== undefined) patch.display_name = input.display_name;
      if (input.org_name !== undefined) patch.org_name = input.org_name;
      if (input.notification_prefs !== undefined)
        patch.notification_prefs = input.notification_prefs;
      if (input.app_prefs !== undefined) patch.app_prefs = input.app_prefs;
      if (Object.keys(patch).length === 0) return;
      const { error } = await getSupabase()
        .from('recruiter_profiles')
        .update(patch)
        .eq('user_id', input.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
