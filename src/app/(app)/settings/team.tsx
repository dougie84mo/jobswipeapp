// Recruit Team — create a team, invite by email, manage members. Covers both
// org recruitment teams and freelance recruiter partnerships (a partnership
// is just a 2-person team). Invited emails without an account join
// automatically the first time they sign in (claim_team_invites on session
// start). Sharing a connection with a team happens on the integration's
// detail screen.

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RowDivider, SettingsGroup } from '@/components/settings-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import {
  type TeamMemberRow,
  type TeamRow,
  useCreateTeam,
  useDeleteTeam,
  useInviteToTeam,
  useLeaveTeam,
  useMyTeams,
  useRemoveTeamMember,
  useRevokeInvite,
  useTeamInvites,
  useTeamMembers,
} from '@/features/teams/queries';
import { useTheme } from '@/hooks/use-theme';

export default function RecruitTeamScreen() {
  const theme = useTheme();
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  const teamsQuery = useMyTeams();
  const createTeam = useCreateTeam();
  const [newTeamName, setNewTeamName] = useState('');

  async function handleCreate() {
    const name = newTeamName.trim();
    if (!name) return;
    try {
      await createTeam.mutateAsync({ name });
      setNewTeamName('');
    } catch (err) {
      Alert.alert('Couldn’t create team', toMessage(err));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {teamsQuery.isLoading ? (
            <ThemedText themeColor="textSecondary">Loading…</ThemedText>
          ) : (
            <>
              {(teamsQuery.data ?? []).map((team) => (
                <TeamCard key={team.id} team={team} userId={userId} />
              ))}

              <SettingsGroup
                title={(teamsQuery.data ?? []).length > 0 ? 'New team' : 'Create your team'}
              >
                <View style={styles.inlineForm}>
                  <TextInput
                    value={newTeamName}
                    onChangeText={setNewTeamName}
                    placeholder="Team or partnership name"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text }]}
                    returnKeyType="done"
                    onSubmitEditing={() => void handleCreate()}
                  />
                  <Pressable
                    onPress={() => void handleCreate()}
                    disabled={!newTeamName.trim() || createTeam.isPending}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (!newTeamName.trim() || createTeam.isPending || pressed) &&
                        styles.dimmed,
                    ]}
                  >
                    <ThemedText style={styles.primaryButtonText}>
                      {createTeam.isPending ? 'Creating…' : 'Create'}
                    </ThemedText>
                  </Pressable>
                </View>
                <RowDivider />
                <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
                  Works for full recruitment teams and two-person freelance
                  partnerships alike: teammates see each other’s saved
                  candidates and activity, plus any connection you choose to
                  share (from that connection’s screen).
                </ThemedText>
              </SettingsGroup>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function TeamCard({ team, userId }: { team: TeamRow; userId: string | undefined }) {
  const theme = useTheme();
  const membersQuery = useTeamMembers(team.id);
  const invitesQuery = useTeamInvites(team.id);
  const invite = useInviteToTeam();
  const revoke = useRevokeInvite();
  const leave = useLeaveTeam();
  const removeMember = useRemoveTeamMember();
  const deleteTeam = useDeleteTeam();
  const [email, setEmail] = useState('');

  const members = membersQuery.data ?? [];
  const me = members.find((m) => m.user_id === userId);
  const canManage = me?.role === 'owner' || me?.role === 'admin';
  const isOwner = me?.role === 'owner';

  async function handleInvite() {
    const value = email.trim();
    if (!value) return;
    try {
      await invite.mutateAsync({ teamId: team.id, email: value });
      setEmail('');
    } catch (err) {
      Alert.alert('Invite failed', toMessage(err));
    }
  }

  function confirmLeave() {
    Alert.alert('Leave team?', `You’ll lose access to anything shared with ${team.name}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          leave.mutateAsync({ teamId: team.id }).catch((err) => {
            Alert.alert('Couldn’t leave', toMessage(err));
          });
        },
      },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      'Delete team?',
      'Shared connections revert to private and all members lose team access.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTeam.mutateAsync({ teamId: team.id }).catch((err) => {
              Alert.alert('Couldn’t delete', toMessage(err));
            });
          },
        },
      ],
    );
  }

  function confirmRemove(member: TeamMemberRow) {
    const name = member.profile?.display_name ?? 'this member';
    Alert.alert('Remove member?', `${name} will lose access to team-shared data.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeMember
            .mutateAsync({ teamId: team.id, userId: member.user_id })
            .catch((err) => Alert.alert('Couldn’t remove', toMessage(err)));
        },
      },
    ]);
  }

  return (
    <SettingsGroup title={team.name}>
      {members.map((member, i) => (
        <View key={member.id}>
          {i > 0 ? <RowDivider /> : null}
          <View style={styles.memberRow}>
            <Ionicons
              name={member.role === 'owner' ? 'star-outline' : 'person-outline'}
              size={18}
              color={theme.textSecondary}
            />
            <View style={styles.memberBody}>
              <ThemedText>
                {member.profile?.display_name ?? 'Unnamed recruiter'}
                {member.user_id === userId ? ' (you)' : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {member.role}
              </ThemedText>
            </View>
            {canManage && member.user_id !== userId && member.role !== 'owner' ? (
              <Pressable
                onPress={() => confirmRemove(member)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${member.profile?.display_name ?? 'member'}`}
              >
                <Ionicons name="close-circle-outline" size={20} color="#E5484D" />
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}

      {(invitesQuery.data ?? []).map((inv) => (
        <View key={inv.id}>
          <RowDivider />
          <View style={styles.memberRow}>
            <Ionicons name="mail-outline" size={18} color={theme.textSecondary} />
            <View style={styles.memberBody}>
              <ThemedText themeColor="textSecondary">{inv.email}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Invited — joins on their first sign-in
              </ThemedText>
            </View>
            {canManage ? (
              <Pressable
                onPress={() =>
                  revoke
                    .mutateAsync({ inviteId: inv.id })
                    .catch((err) => Alert.alert('Couldn’t revoke', toMessage(err)))
                }
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Revoke invite for ${inv.email}`}
              >
                <ThemedText type="small" themeColor="textSecondary">
                  Revoke
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}

      {canManage ? (
        <>
          <RowDivider />
          <View style={styles.inlineForm}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="teammate@company.com"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[styles.input, { color: theme.text }]}
              returnKeyType="done"
              onSubmitEditing={() => void handleInvite()}
            />
            <Pressable
              onPress={() => void handleInvite()}
              disabled={!email.trim() || invite.isPending}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                (!email.trim() || invite.isPending || pressed) && styles.dimmed,
              ]}
            >
              <ThemedText style={styles.primaryButtonText}>
                {invite.isPending ? 'Inviting…' : 'Invite'}
              </ThemedText>
            </Pressable>
          </View>
        </>
      ) : null}

      <RowDivider />
      <View style={styles.footerRow}>
        {isOwner ? (
          <Pressable onPress={confirmDelete} accessibilityRole="button">
            <ThemedText type="small" style={styles.destructive}>
              Delete team
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable onPress={confirmLeave} accessibilityRole="button">
            <ThemedText type="small" style={styles.destructive}>
              Leave team
            </ThemedText>
          </Pressable>
        )}
      </View>
    </SettingsGroup>
  );
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  inlineForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.35)',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  primaryButton: {
    backgroundColor: '#208AEF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  primaryButtonText: { color: 'white', fontWeight: '600' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  memberBody: { flex: 1, gap: 2 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: Spacing.two,
  },
  destructive: { color: '#E5484D', fontWeight: '600' },
  note: { paddingVertical: Spacing.two },
  dimmed: { opacity: 0.6 },
});
