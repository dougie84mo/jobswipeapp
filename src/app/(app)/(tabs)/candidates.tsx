import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { initials } from '@/ats/candidate-utils';
import { displayNameFor } from '@/ats/client';
import { useSession } from '@/features/auth/SessionProvider';
import { useMyTeams, useProfileNames } from '@/features/teams/queries';
import {
  type MatchRow,
  type MatchScope,
  useMatches,
} from '@/features/swipes/matches';

// Matched candidates — positive swipes (Save / Boost) across every connected
// source. The Team scope adds teammates' saves (RLS returns them once you
// share a team); "Saved by {name}" marks the ones that aren't yours.

const DIRECTION_LABEL: Record<MatchRow['direction'], string> = {
  right: 'Saved',
  up: 'Boosted',
};

const DIRECTION_COLOR: Record<MatchRow['direction'], string> = {
  right: '#30A46C',
  up: '#F5A524',
};

export default function CandidatesScreen() {
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  const [scope, setScope] = useState<MatchScope>('mine');
  const teamsQuery = useMyTeams();
  const hasTeam = (teamsQuery.data ?? []).length > 0;
  const matchesQuery = useMatches(scope, userId);
  const rows = matchesQuery.data ?? [];

  const teammateIds = useMemo(
    () =>
      Array.from(
        new Set(rows.filter((r) => r.user_id !== userId).map((r) => r.user_id)),
      ),
    [rows, userId],
  );
  const names = useProfileNames(teammateIds);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {hasTeam ? (
            <View style={styles.scopeRow}>
              <ScopeButton
                label="Mine"
                active={scope === 'mine'}
                onPress={() => setScope('mine')}
              />
              <ScopeButton
                label="Team"
                active={scope === 'team'}
                onPress={() => setScope('team')}
              />
            </View>
          ) : null}

          {matchesQuery.isLoading ? (
            <ThemedText themeColor="textSecondary">Loading…</ThemedText>
          ) : matchesQuery.isError ? (
            <ThemedText themeColor="textSecondary">
              Couldn’t load candidates: {toMessage(matchesQuery.error)}
            </ThemedText>
          ) : rows.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.empty}>
              <ThemedText type="smallBold">
                {scope === 'team' ? 'No team matches yet' : 'No matches yet'}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Candidates you Save or Boost in the swipe deck land here. Pick
                a requisition from the Connections tab to start swiping.
              </ThemedText>
            </ThemedView>
          ) : (
            rows.map((row) => (
              <MatchCard
                key={row.id}
                row={row}
                savedBy={
                  row.user_id !== userId
                    ? names.data?.[row.user_id] ?? 'a teammate'
                    : undefined
                }
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ScopeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.scopeButton,
        active && styles.scopeButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="small" style={active ? styles.scopeLabelActive : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function MatchCard({ row, savedBy }: { row: MatchRow; savedBy?: string }) {
  const integration = row.candidate?.integration ?? null;
  const sourceLabel = integration
    ? (integration.display_label ?? displayNameFor(integration.provider))
    : 'Unknown source';
  const swipedAt = new Date(row.created_at);

  return (
    <Pressable
      onPress={() => router.push(`/candidate/${row.id}`)}
      style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
    >
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.avatarFallback}>
            {row.candidate?.photo_url ? (
              <Image source={{ uri: row.candidate.photo_url }} style={styles.avatar} />
            ) : (
              <ThemedText type="smallBold">
                {initials(row.candidate?.full_name)}
              </ThemedText>
            )}
          </View>
          <View style={styles.cardBody}>
            <View style={styles.nameRow}>
              <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
                {row.candidate?.full_name ?? 'Unnamed candidate'}
              </ThemedText>
              <View
                style={[
                  styles.directionPill,
                  { backgroundColor: DIRECTION_COLOR[row.direction] },
                ]}
              >
                <ThemedText type="small" style={styles.directionText}>
                  {DIRECTION_LABEL[row.direction]}
                </ThemedText>
              </View>
            </View>
            {row.candidate?.headline ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {row.candidate.headline}
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {row.requisition?.title ?? 'Unknown requisition'} • {sourceLabel} •{' '}
              {swipedAt.toLocaleDateString()}
            </ThemedText>
            {savedBy ? (
              <ThemedText type="small" style={styles.savedBy} numberOfLines={1}>
                Saved by {savedBy}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </ThemedView>
    </Pressable>
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
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  scopeButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  scopeButtonActive: { backgroundColor: '#208AEF' },
  scopeLabelActive: { color: 'white', fontWeight: '600' },
  empty: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  cardPressable: { borderRadius: Spacing.three },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardBody: { flex: 1, gap: Spacing.half },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: { flexShrink: 1 },
  avatar: { width: 44, height: 44 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  directionPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
  directionText: { color: 'white', fontWeight: '700' },
  savedBy: { color: '#208AEF', fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
