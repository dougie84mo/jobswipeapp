import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useIntegration } from '@/features/integrations/queries';
import { useRequisitions } from '@/features/integrations/requisitions';
import type { Requisition } from '@/ats/types';

export default function IntegrationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const integrationQuery = useIntegration(id);
  const requisitionsQuery = useRequisitions(integrationQuery.data ?? null);

  const integration = integrationQuery.data;
  const headerTitle = integration?.display_label ?? 'Requisitions';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerRight: () =>
            integration ? (
              <Link
                href={{
                  pathname: '/integration/[id]/settings',
                  params: { id: integration.id },
                }}
                asChild
              >
                <Pressable hitSlop={8} style={styles.settingsLink}>
                  <ThemedText type="linkPrimary">Settings</ThemedText>
                </Pressable>
              </Link>
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
            renderItem={({ item }) => (
              <RequisitionCard
                item={item}
                onPress={() =>
                  router.push({
                    pathname: '/swipe/[reqId]',
                    params: { reqId: item.externalId, integrationId: integration.id },
                  })
                }
              />
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function RequisitionCard({
  item,
  onPress,
}: {
  item: Requisition;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
    >
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{item.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {[item.department, item.location].filter(Boolean).join(' • ')}
        </ThemedText>
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
    gap: Spacing.one,
  },
  pressed: { opacity: 0.7 },
  settingsLink: { paddingHorizontal: Spacing.two },
});
