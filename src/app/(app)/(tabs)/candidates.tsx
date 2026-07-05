import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { displayNameFor } from '@/ats/client';
import { useMatches, type MatchRow } from '@/features/swipes/matches';

// Matched candidates — the recruiter's positive swipes (Save / Boost) across
// every connected source. Pass swipes stay on the per-integration Activity
// screen; this tab is the shortlist.

const DIRECTION_LABEL: Record<MatchRow['direction'], string> = {
  right: 'Saved',
  up: 'Boosted',
};

const DIRECTION_COLOR: Record<MatchRow['direction'], string> = {
  right: '#30A46C',
  up: '#F5A524',
};

export default function CandidatesScreen() {
  const matchesQuery = useMatches();
  const rows = matchesQuery.data ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {matchesQuery.isLoading ? (
            <ThemedText themeColor="textSecondary">Loading…</ThemedText>
          ) : matchesQuery.isError ? (
            <ThemedText themeColor="textSecondary">
              Couldn’t load candidates: {toMessage(matchesQuery.error)}
            </ThemedText>
          ) : rows.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.empty}>
              <ThemedText type="smallBold">No matches yet</ThemedText>
              <ThemedText themeColor="textSecondary">
                Candidates you Save or Boost in the swipe deck land here. Pick
                a requisition from the Connections tab to start swiping.
              </ThemedText>
            </ThemedView>
          ) : (
            rows.map((row) => <MatchCard key={row.id} row={row} />)
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function MatchCard({ row }: { row: MatchRow }) {
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
          {row.candidate?.photo_url ? (
            <Image source={{ uri: row.candidate.photo_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <ThemedText type="smallBold">
                {initials(row.candidate?.full_name)}
              </ThemedText>
            </View>
          )}
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
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  directionPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
  directionText: { color: 'white', fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
