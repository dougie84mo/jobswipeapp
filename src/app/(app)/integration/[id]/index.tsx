import { Ionicons } from '@expo/vector-icons';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import { useIntegration } from '@/features/integrations/queries';
import { useRequisitions } from '@/features/integrations/requisitions';
import {
  useNotificationTopics,
  useSetNotificationTopic,
} from '@/features/notifications/topics';
import {
  useMyTeams,
  useSetIntegrationSharedTeam,
} from '@/features/teams/queries';
import type { Requisition } from '@/ats/types';

const EMPTY_TOPICS: ReadonlySet<string> = new Set();

export default function IntegrationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const integrationQuery = useIntegration(id);
  const requisitionsQuery = useRequisitions(integrationQuery.data ?? null);
  const topicsQuery = useNotificationTopics(integrationQuery.data?.id);
  const setTopic = useSetNotificationTopic();
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  const teamsQuery = useMyTeams();
  const setSharedTeam = useSetIntegrationSharedTeam();

  const integration = integrationQuery.data;
  const alertTopics = topicsQuery.data ?? EMPTY_TOPICS;
  const headerTitle = integration?.display_label ?? 'Requisitions';
  const isOwner = Boolean(integration && userId && integration.user_id === userId);
  const teams = teamsQuery.data ?? [];
  const sharedTeam = teams.find((t) => t.id === integration?.shared_team_id);

  function handleSharePress() {
    if (!integration) return;
    if (integration.shared_team_id) {
      Alert.alert(
        'Stop sharing?',
        'Teammates will immediately lose access to this connection, its requisitions, and its decks.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Stop sharing',
            style: 'destructive',
            onPress: () => {
              setSharedTeam
                .mutateAsync({ integrationId: integration.id, teamId: null })
                .catch((err) => Alert.alert('Couldn’t update', toMessage(err)));
            },
          },
        ],
      );
      return;
    }
    Alert.alert(
      'Share with a team?',
      'Teammates will browse requisitions and swipe candidates through this connection using YOUR credentials — actions in the ATS are attributed to your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        ...teams.map((team) => ({
          text: team.name,
          onPress: () => {
            setSharedTeam
              .mutateAsync({ integrationId: integration.id, teamId: team.id })
              .catch((err) => Alert.alert('Couldn’t share', toMessage(err)));
          },
        })),
      ],
    );
  }

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

        {isOwner && teams.length > 0 ? (
          <Pressable
            onPress={handleSharePress}
            disabled={setSharedTeam.isPending}
            accessibilityRole="button"
            style={({ pressed }) => [styles.shareRow, pressed && styles.pressed]}
          >
            <Ionicons
              name={sharedTeam ? 'people' : 'people-outline'}
              size={18}
              color={sharedTeam ? '#208AEF' : '#8a8a8a'}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.shareText}>
              {sharedTeam
                ? `Shared with ${sharedTeam.name} — teammates swipe through your credentials`
                : 'Share this connection with a team'}
            </ThemedText>
          </Pressable>
        ) : null}

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
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  shareText: { flex: 1 },
  pressed: { opacity: 0.7 },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingRight: Spacing.two,
  },
  headerLink: { paddingHorizontal: Spacing.two },
});
