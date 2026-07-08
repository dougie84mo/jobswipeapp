import { Ionicons } from '@expo/vector-icons';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useIntegration } from '@/features/integrations/queries';
import { useRequisitions } from '@/features/integrations/requisitions';
import {
  useNotificationTopics,
  useSetNotificationTopic,
} from '@/features/notifications/topics';
import type { Requisition } from '@/ats/types';

const EMPTY_TOPICS: ReadonlySet<string> = new Set();

export default function IntegrationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const integrationQuery = useIntegration(id);
  const requisitionsQuery = useRequisitions(integrationQuery.data ?? null);
  const topicsQuery = useNotificationTopics(integrationQuery.data?.id);
  const setTopic = useSetNotificationTopic();

  const integration = integrationQuery.data;
  const alertTopics = topicsQuery.data ?? EMPTY_TOPICS;
  const headerTitle = integration?.display_label ?? 'Requisitions';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerRight: () =>
            integration ? (
              <View style={styles.headerActions}>
                <Link
                  href={{
                    pathname: '/integration/[id]/activity',
                    params: { id: integration.id },
                  }}
                  asChild
                >
                  <Pressable hitSlop={8} style={styles.headerLink}>
                    <ThemedText type="linkPrimary">Activity</ThemedText>
                  </Pressable>
                </Link>
                <Link
                  href={{
                    pathname: '/integration/[id]/settings',
                    params: { id: integration.id },
                  }}
                  asChild
                >
                  <Pressable hitSlop={8} style={styles.headerLink}>
                    <ThemedText type="linkPrimary">Settings</ThemedText>
                  </Pressable>
                </Link>
              </View>
            ) : null,
        }}
      />
      <SafeAreaView style={styles.inner} edges={['bottom', 'left', 'right']}>
        <ThemedText type="subtitle">Open requisitions</ThemedText>
        <ThemedText themeColor="textSecondary">
          Pick a requisition to source candidates against.
        </ThemedText>

        {integrationQuery.isLoading ? (
          <ThemedText themeColor="textSecondary">Loading integration…</ThemedText>
        ) : !integration ? (
          <ThemedText themeColor="textSecondary">
            Integration not found. It may have been disconnected.
          </ThemedText>
        ) : requisitionsQuery.isLoading ? (
          <ThemedText themeColor="textSecondary">Loading requisitions…</ThemedText>
        ) : requisitionsQuery.isError ? (
          <ThemedText themeColor="textSecondary">
            Couldn’t load requisitions: {toMessage(requisitionsQuery.error)}
          </ThemedText>
        ) : (requisitionsQuery.data ?? []).length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.empty}>
            <ThemedText type="smallBold">No open requisitions</ThemedText>
            <ThemedText themeColor="textSecondary">
              This ATS doesn’t have any open requisitions right now.
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={requisitionsQuery.data}
            keyExtractor={(item) => item.externalId}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
            renderItem={({ item }) => {
              const alertsOn = alertTopics.has(item.externalId);
              return (
                <RequisitionCard
                  item={item}
                  alertsOn={alertsOn}
                  toggleDisabled={setTopic.isPending}
                  onToggleAlerts={() =>
                    setTopic.mutate({
                      integrationId: integration.id,
                      requisitionExternalId: item.externalId,
                      enabled: !alertsOn,
                    })
                  }
                  onOpenFilters={() =>
                    router.push({
                      pathname: '/requisition-filters',
                      params: {
                        integrationId: integration.id,
                        reqId: item.externalId,
                        reqTitle: item.title,
                      },
                    })
                  }
                  onPress={() =>
                    router.push({
                      pathname: '/swipe/[reqId]',
                      params: { reqId: item.externalId, integrationId: integration.id },
                    })
                  }
                />
              );
            }}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function RequisitionCard({
  item,
  onPress,
  alertsOn,
  onToggleAlerts,
  toggleDisabled,
  onOpenFilters,
}: {
  item: Requisition;
  onPress: () => void;
  alertsOn: boolean;
  onToggleAlerts: () => void;
  toggleDisabled: boolean;
  onOpenFilters: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
    >
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardText}>
          <ThemedText type="smallBold">{item.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {[item.department, item.location].filter(Boolean).join(' • ')}
          </ThemedText>
        </View>
        {/* Nested Pressables: taps act on the row without navigating into the deck. */}
        <Pressable
          onPress={onOpenFilters}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Candidate filters for ${item.title}`}
          style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
        >
          <Ionicons name="funnel-outline" size={20} color="#8a8a8a" />
        </Pressable>
        <Pressable
          onPress={onToggleAlerts}
          disabled={toggleDisabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ checked: alertsOn, disabled: toggleDisabled }}
          accessibilityLabel={alertsOn
            ? `Turn off new-candidate alerts for ${item.title}`
            : `Turn on new-candidate alerts for ${item.title}`}
          style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
        >
          <Ionicons
            name={alertsOn ? 'notifications' : 'notifications-outline'}
            size={20}
            color={alertsOn ? '#208AEF' : '#8a8a8a'}
          />
        </Pressable>
      </ThemedView>
    </Pressable>
  );
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  empty: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  listContent: { paddingBottom: Spacing.three },
  cardPressable: { borderRadius: Spacing.three },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  cardText: { flex: 1, gap: Spacing.one },
  bell: { padding: Spacing.one },
  pressed: { opacity: 0.7 },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingRight: Spacing.two,
  },
  headerLink: { paddingHorizontal: Spacing.two },
});
