// Teams server state — teams, members (joined to profiles for display
// names), pending invites, and the membership mutations. All writes go
// through the SECURITY DEFINER RPCs from migration 0018; reads lean on RLS.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '@/lib/supabase';

export const TEAMS_KEY = ['teams'] as const;

export type TeamRole = 'owner' | 'admin' | 'member';

export interface TeamRow {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface TeamMemberRow {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  created_at: string;
  profile: { display_name: string | null } | null;
}

export interface TeamInviteRow {
  id: string;
  team_id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
}

export function useMyTeams() {
  return useQuery({
    queryKey: TEAMS_KEY,
    queryFn: async (): Promise<TeamRow[]> => {
      const { data, error } = await getSupabase()
        .from('teams')
        .select('id, name, created_by, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamRow[];
    },
  });
}

export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: [...TEAMS_KEY, teamId, 'members'],
    enabled: Boolean(teamId),
    queryFn: async (): Promise<TeamMemberRow[]> => {
      if (!teamId) return [];
      const { data, error } = await getSupabase()
        .from('team_members')
        .select(
          'id, team_id, user_id, role, created_at, profile:recruiter_profiles(display_name)',
        )
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TeamMemberRow[];
    },
  });
}

export function useTeamInvites(teamId: string | undefined) {
  return useQuery({
    queryKey: [...TEAMS_KEY, teamId, 'invites'],
    enabled: Boolean(teamId),
    queryFn: async (): Promise<TeamInviteRow[]> => {
      if (!teamId) return [];
      const { data, error } = await getSupabase()
        .from('team_invites')
        .select('id, team_id, email, role, status, created_at')
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeamInviteRow[];
    },
  });
}

function useTeamMutation<TInput>(
  run: (input: TInput) => Promise<void>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TEAMS_KEY });
      // Sharing state rides on integrations; membership changes what's visible.
      void qc.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

export function useCreateTeam() {
  return useTeamMutation(async (input: { name: string }) => {
    const { error } = await getSupabase().rpc('create_team', {
      p_name: input.name,
    });
    if (error) throw error;
  });
}

export function useInviteToTeam() {
  return useTeamMutation(
    async (input: { teamId: string; email: string; role?: 'admin' | 'member' }) => {
      const { error } = await getSupabase().rpc('invite_to_team', {
        p_team_id: input.teamId,
        p_email: input.email,
        p_role: input.role ?? 'member',
      });
      if (error) throw error;
    },
  );
}

export function useRevokeInvite() {
  return useTeamMutation(async (input: { inviteId: string }) => {
    const { error } = await getSupabase()
      .from('team_invites')
      .update({ status: 'revoked' })
      .eq('id', input.inviteId);
    if (error) throw error;
  });
}

export function useLeaveTeam() {
  return useTeamMutation(async (input: { teamId: string }) => {
    const { error } = await getSupabase().rpc('leave_team', {
      p_team_id: input.teamId,
    });
    if (error) throw error;
  });
}

export function useRemoveTeamMember() {
  return useTeamMutation(async (input: { teamId: string; userId: string }) => {
    const { error } = await getSupabase().rpc('remove_team_member', {
      p_team_id: input.teamId,
      p_user_id: input.userId,
    });
    if (error) throw error;
  });
}

export function useDeleteTeam() {
  return useTeamMutation(async (input: { teamId: string }) => {
    const { error } = await getSupabase().from('teams').delete().eq('id', input.teamId);
    if (error) throw error;
  });
}

/** Owner shares/unshares a connection with one of their teams. */
export function useSetIntegrationSharedTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      integrationId: string;
      teamId: string | null;
    }): Promise<void> => {
      const { error } = await getSupabase()
        .from('integrations')
        .update({ shared_team_id: input.teamId })
        .eq('id', input.integrationId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

/**
 * Display names for a set of user ids (self + teammates — RLS exposes
 * exactly those). Drives "Shared by {name}" / "Saved by {name}" labels.
 */
export function useProfileNames(userIds: string[]) {
  const key = [...userIds].sort();
  return useQuery({
    queryKey: ['profile-names', key],
    enabled: key.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await getSupabase()
        .from('recruiter_profiles')
        .select('user_id, display_name')
        .in('user_id', key);
      if (error) throw error;
      const out: Record<string, string> = {};
      for (const row of (data ?? []) as { user_id: string; display_name: string | null }[]) {
        if (row.display_name) out[row.user_id] = row.display_name;
      }
      return out;
    },
  });
}

/**
 * Claim pending invites addressed to the signed-in email. Fire-and-forget on
 * sign-in (app layout); errors are swallowed — an invite that fails to claim
 * now claims on the next session.
 */
export async function claimTeamInvites(): Promise<void> {
  try {
    await getSupabase().rpc('claim_team_invites');
  } catch {
    // Non-fatal by design.
  }
}
