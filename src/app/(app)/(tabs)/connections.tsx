import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import {
  useIntegrations,
  type IntegrationRow,
} from '@/features/integrations/queries';
import { sourceKindFor, type ProviderId, type SourceKind } from '@/ats/types';

const KIND_LABEL: Record<SourceKind, string> = {
  ats: 'Applicant Tracking Systems',
  job_board: 'Job Boards',
};

export default function ConnectionsScreen() {
  const session = useSession();
  const integrationsQuery = useIntegrations();

  const email =
    session.status === 'ready' && session.session
      ? session.session.user.email
      : undefined;

  const rows = integrationsQuery.data ?? [];
  // Bucket connected sources by kind so each group renders under its own
  // header. Order: ATS first, job boards second.
  const grouped = useMemo(() => {
    const buckets: Record<SourceKind, IntegrationRow[]> = { ats: [], job_board: [] };
    for (const row of rows) {
      buckets[sourceKindFor(row.provider as ProviderId)].push(row);
    }
    return buckets;
  }, [rows]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            {email ? (
              <ThemedText themeColor="textSecondary">Signed in as {email}</ThemedText>
            ) : null}
          </View>

          {integrationsQuery.isLoading ? (
            <ThemedText themeColor="textSecondary">Loading…</ThemedText>
          ) : integrationsQuery.isError ? (
            <ThemedText themeColor="textSecondary">
              Couldn’t load connections: {toMessage(integrationsQuery.error)}
            </ThemedText>
          ) : rows.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.empty}>
              <ThemedText type="smallBold">No sources connected yet</ThemedText>
              <ThemedText themeColor="textSecondary">
                Open the Profile tab and tap Connect a source to add your first
                ATS or job board. The mock provider has demo data so you can try
                the swipe deck without a real account.
              </ThemedText>
            </ThemedView>
          ) : (
            (['ats', 'job_board'] as SourceKind[]).map((kind) => {
              const group = grouped[kind];
              if (group.length === 0) return null;
              return (
                <View key={kind} style={styles.group}>
                  <ThemedText type="smallBold">{KIND_LABEL[kind]}</ThemedText>
                  {group.map((item) => (
                    <IntegrationCard
                      key={item.id}
                      item={item}
                      onPress={() => router.push(`/integration/${item.id}`)}
                    />
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function IntegrationCard({
  item,
  onPress,
}: {
  item: IntegrationRow;
  onPress: () => void;
}) {
  const connectedAt = new Date(item.connected_at);
  const kind = sourceKindFor(item.provider as ProviderId);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardPressable,
        pressed && styles.pressed,
      ]}
    >
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardRow}>
          <ThemedText type="smallBold">
            {item.display_label ?? providerLabel(item.provider)}
          </ThemedText>
          <View style={styles.kindPill}>
            <ThemedText type="small">
              {kind === 'job_board' ? 'Job board' : 'ATS'}
            </ThemedText>
          </View>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {providerLabel(item.provider)} • {item.status} • connected{' '}
          {connectedAt.toLocaleDateString()}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function providerLabel(provider: string): string {
  switch (provider) {
    case 'mock':
      return 'Mock ATS';
    case 'greenhouse':
      return 'Greenhouse';
    case 'ashby':
      return 'Ashby';
    case 'lever':
      return 'Lever';
    case 'workable':
      return 'Workable';
    case 'recruitee':
      return 'Recruitee';
    case 'indeed':
      return 'Indeed';
    case 'ziprecruiter':
      return 'ZipRecruiter';
    default:
      return provider;
  }
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
  header: { gap: Spacing.one },
  group: { gap: Spacing.two },
  empty: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  cardPressable: { borderRadius: Spacing.three },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kindPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  pressed: { opacity: 0.7 },
});
