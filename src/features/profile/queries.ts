// recruiter_profiles is auto-populated by the on_auth_user_created trigger
// in 0001_init.sql. RLS lets a recruiter select and update their own row,
// no others. We always query for the signed-in user; user_id filtering is
// enforced server-side.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '@/lib/supabase';

export interface RecruiterProfile {
  user_id: string;
  display_name: string | null;
  org_name: string | null;
  avatar_url: string | null;
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
        .select('user_id, display_name, org_name, avatar_url, created_at')
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
}

export function useUpdateRecruiterProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput): Promise<void> => {
      const patch: Record<string, string | null> = {};
      if (input.display_name !== undefined) patch.display_name = input.display_name;
      if (input.org_name !== undefined) patch.org_name = input.org_name;
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
