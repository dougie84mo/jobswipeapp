import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useIntegration } from '@/features/integrations/queries';
import {
  useActivity,
  useRetryAction,
  type ActivityRow,
} from '@/features/swipes/activity';
import type { ExecutedAction, ProviderId, SwipeDirection } from '@/ats/types';

const DIRECTION_LABEL: Record<SwipeDirection, string> = {
  right: 'Saved',
  left: 'Passed',
  up: 'Boosted',
};

const DIRECTION_COLOR: Record<SwipeDirection, string> = {
  right: '#30A46C',
  left: '#E5484D',
  up: '#F5A524',
};

const STATUS_LABEL: Record<ExecutedAction['status'], string> = {
  success: 'success',
  failure: 'failed',
  skipped: 'skipped',
};

const STATUS_COLOR: Record<ExecutedAction['status'], string> = {
  success: '#30A46C',
  failure: '#E5484D',
  skipped: '#888',
};

export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const integrationQuery = useIntegration(id);
  const activityQuery = useActivity(id);
  const provider = integrationQuery.data?.provider as ProviderId | undefined;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Activity' }} />
      <SafeAreaView style={styles.inner} edges={['bottom', 'left', 'right']}>
        <ThemedText themeColor="textSecondary">
          Past swipes for this ATS, newest first. Tap a row to see what ran in
          the ATS for that swipe.
        </ThemedText>

        {activityQuery.isLoading ? (
          <ThemedText themeColor="textSecondary">Loading…</ThemedText>
        ) : activityQuery.isError ? (
          <ThemedText themeColor="textSecondary">
            Couldn’t load activity:{' '}
            {activityQuery.error instanceof Error
              ? activityQuery.error.message
              : 'Unknown error'}
          </ThemedText>
        ) : (activityQuery.data ?? []).length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.empty}>
            <ThemedText type="smallBold">No swipes yet</ThemedText>
            <ThemedText themeColor="textSecondary">
              Swipes you make on requisitions from this ATS will show up here.
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={activityQuery.data}
            keyExtractor={(item) => item.swipe_id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
            renderItem={({ item }) => (
              <ActivityCard
                item={item}
                integrationId={id}
                provider={provider}
              />
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function ActivityCard({
  item,
  integrationId,
  provider,
}: {
  item: ActivityRow;
  integrationId: string;
  provider: ProviderId | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null);
  const retry = useRetryAction();
  const date = new Date(item.created_at);
  const summary = summarizeActions(item.executed_actions);

  async function handleRetry(index: number) {
    if (!provider) {
      Alert.alert('Retry failed', 'Integration not loaded yet.');
      return;
    }
    setRetryingIndex(index);
    try {
      await retry.mutateAsync({
        integrationId,
        provider,
        row: item,
        actionIndex: index,
      });
    } catch (err) {
      Alert.alert(
        'Retry failed',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setRetryingIndex(null);
    }
  }

  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
    >
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardHeader}>
          {item.candidate_photo_url ? (
            <Image
              source={{ uri: item.candidate_photo_url }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]} />
          )}
          <View style={{ flex: 1, gap: Spacing.half }}>
            <ThemedText type="smallBold">{item.candidate_full_name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.requisition_title}
            </ThemedText>
          </View>
          <View style={styles.directionPill}>
            <View
              style={[
                styles.directionDot,
                { backgroundColor: DIRECTION_COLOR[item.direction] },
              ]}
            />
            <ThemedText type="small">{DIRECTION_LABEL[item.direction]}</ThemedText>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <ThemedText type="small" themeColor="textSecondary">
            {summary}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {date.toLocaleString()}
          </ThemedText>
        </View>

        {open && item.executed_actions.length > 0 ? (
          <View style={styles.detailList}>
            {item.executed_actions.map((a, i) => (
              <View key={i} style={styles.detailRow}>
                <ThemedText
                  type="small"
                  style={{ color: STATUS_COLOR[a.status], fontWeight: '700' }}
                >
                  {STATUS_LABEL[a.status]}
                </ThemedText>
                <View style={{ flex: 1, gap: Spacing.half }}>
                  <ThemedText type="small">{describeAction(a)}</ThemedText>
                  {a.message ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {a.message}
                    </ThemedText>
                  ) : null}
                </View>
                {a.status === 'failure' ? (
                  <Pressable
                    onPress={(e) => {
                      // Card root is also pressable (toggles open/closed);
                      // stop the tap from collapsing the detail panel.
                      e.stopPropagation();
                      void handleRetry(i);
                    }}
                    disabled={retryingIndex !== null}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.retryButton,
                      pressed && styles.pressed,
                      retryingIndex !== null && styles.disabled,
                    ]}
                  >
                    <ThemedText style={styles.retryButtonText}>
                      {retryingIndex === i ? 'Retrying…' : 'Retry'}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ThemedView>
    </Pressable>
  );
}

function summarizeActions(actions: ExecutedAction[]): string {
  if (actions.length === 0) return 'No actions configured';
  const success = actions.filter((a) => a.status === 'success').length;
  const failure = actions.filter((a) => a.status === 'failure').length;
  const skipped = actions.filter((a) => a.status === 'skipped').length;
  const parts: string[] = [];
  if (success) parts.push(`${success} succeeded`);
  if (failure) parts.push(`${failure} failed`);
  if (skipped) parts.push(`${skipped} skipped`);
  return parts.join(' • ');
}

function describeAction(action: ExecutedAction): string {
  const d = action.descriptor;
  switch (d.type) {
    case 'advance_stage':
      return `Advance stage → ${d.stage_id}`;
    case 'reject':
      return d.reason_id ? `Reject (${d.reason_id})` : 'Reject';
    case 'apply_tag':
      return `Apply tag → ${d.tag_id}`;
    case 'send_template':
      return `Send template → ${d.template_id}`;
    case 'add_note':
      return `Add note: "${d.text}"`;
    case 'local_only':
      return 'Record locally only';
  }
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
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(127,127,127,0.2)',
  },
  avatarFallback: { backgroundColor: 'rgba(127,127,127,0.2)' },
  directionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  directionDot: { width: 8, height: 8, borderRadius: 4 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailList: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,127,127,0.25)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  retryButton: {
    backgroundColor: '#208AEF',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
  retryButtonText: { color: 'white', fontWeight: '700', fontSize: 12 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
