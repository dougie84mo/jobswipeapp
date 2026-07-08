// Matched candidates — every positive swipe (right = Save, up = Boost)
// across all of the recruiter's integrations, newest first. Reads the
// swipes table joined to the candidate/requisition caches that record_swipe
// upserts; RLS scopes everything to the signed-in user.

import { useQuery } from '@tanstack/react-query';

import { getSupabase } from '@/lib/supabase';
import type {
  EducationEntry,
  ExecutedAction,
  ExperienceEntry,
  ProviderId,
} from '@/ats/types';

export const MATCHES_KEY = ['matches'] as const;

/** 'mine' = my swipes only; 'team' = mine + teammates' (RLS scopes it). */
export type MatchScope = 'mine' | 'team';

export interface MatchRow {
  id: string;
  direction: 'right' | 'up';
  created_at: string;
  user_id: string;
  candidate: {
    id: string;
    full_name: string | null;
    headline: string | null;
    location: string | null;
    photo_url: string | null;
    integration: {
      id: string;
      provider: ProviderId;
      display_label: string | null;
    } | null;
  } | null;
  requisition: {
    id: string;
    title: string | null;
  } | null;
}

export function useMatches(scope: MatchScope, userId: string | undefined) {
  return useQuery({
    queryKey: [...MATCHES_KEY, scope, userId ?? null],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MatchRow[]> => {
      let query = getSupabase()
        .from('swipes')
        .select(
          'id, direction, created_at, user_id, ' +
            'candidate:candidates(id, full_name, headline, location, photo_url, ' +
            'integration:integrations(id, provider, display_label)), ' +
            'requisition:requisitions(id, title)',
        )
        .in('direction', ['right', 'up'])
        .order('created_at', { ascending: false });
      // Team scope drops the self filter: RLS returns own + teammates' rows.
      if (scope === 'mine' && userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as MatchRow[];
    },
  });
}

// Full detail for one match — everything the candidate profile screen shows.
// Keyed by swipe id (the Candidates tab lists swipes, and the swipe carries
// the outcome data the profile renders alongside the cached candidate).
export interface MatchDetailRow {
  id: string;
  direction: 'right' | 'up';
  created_at: string;
  executed_actions: ExecutedAction[];
  notes: string | null;
  candidate: {
    id: string;
    external_id: string;
    full_name: string | null;
    headline: string | null;
    location: string | null;
    photo_url: string | null;
    resume_url: string | null;
    skills: string[] | null;
    years_experience: number | null;
    experience: ExperienceEntry[] | null;
    education: EducationEntry[] | null;
    integration: {
      id: string;
      provider: ProviderId;
      display_label: string | null;
    } | null;
  } | null;
  requisition: {
    id: string;
    title: string | null;
    department: string | null;
    location: string | null;
  } | null;
}

export function useMatch(swipeId: string | undefined) {
  return useQuery({
    queryKey: [...MATCHES_KEY, swipeId],
    enabled: Boolean(swipeId),
    queryFn: async (): Promise<MatchDetailRow | null> => {
      if (!swipeId) return null;
      const { data, error } = await getSupabase()
        .from('swipes')
        .select(
          'id, direction, created_at, executed_actions, notes, ' +
            'candidate:candidates(id, external_id, full_name, headline, location, ' +
            'photo_url, resume_url, skills, years_experience, experience, education, ' +
            'integration:integrations(id, provider, display_label)), ' +
            'requisition:requisitions(id, title, department, location)',
        )
        .eq('id', swipeId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as MatchDetailRow | null) ?? null;
    },
  });
}
