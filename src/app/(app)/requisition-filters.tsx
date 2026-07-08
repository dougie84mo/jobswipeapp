import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { FilterEditor } from '@/features/filters/FilterEditor';
import {
  useGlobalCandidateFilters,
  useRequisitionFilters,
  useSetRequisitionFilters,
} from '@/features/filters/queries';
import type { CandidateFilters } from '@/features/filters/types';

// Per-requisition filter override — pushed from the swipe deck's funnel icon
// (and the requisition list). Starts from the stored override, or from the
// recruiter's global defaults when no override exists yet. Reset deletes the
// override row so the deck inherits the defaults again.

export default function RequisitionFiltersScreen() {
  const params = useLocalSearchParams<{
    integrationId?: string;
    reqId?: string;
    reqTitle?: string;
  }>();
  const integrationId = params.integrationId;
  const reqId = params.reqId;

  const { filters: globalFilters, isLoading: globalLoading } =
    useGlobalCandidateFilters();
  const overrideQuery = useRequisitionFilters(integrationId, reqId);
  const setFilters = useSetRequisitionFilters();

  const isLoading = globalLoading || overrideQuery.isLoading;

  async function handleSave(next: CandidateFilters) {
    if (!integrationId || !reqId) return;
    try {
      await setFilters.mutateAsync({
        integrationId,
        requisitionExternalId: reqId,
        filters: next,
      });
    } catch (err) {
      Alert.alert('Save failed', toMessage(err));
    }
  }

  async function handleReset() {
    if (!integrationId || !reqId) return;
    try {
      await setFilters.mutateAsync({
        integrationId,
        requisitionExternalId: reqId,
        filters: null,
      });
    } catch (err) {
      Alert.alert('Reset failed', toMessage(err));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{ title: params.reqTitle ? `Filters — ${params.reqTitle}` : 'Filters' }}
      />
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!integrationId || !reqId ? (
            <ThemedText themeColor="textSecondary">
              Missing requisition context. Go back and open filters from the
              deck.
            </ThemedText>
          ) : isLoading ? (
            <ThemedText themeColor="textSecondary">Loading…</ThemedText>
          ) : (
            <FilterEditor
              // A stored override wins; otherwise seed the editor from the
              // global defaults so "tweak one thing for this req" is one tap.
              key={overrideQuery.data ? 'override' : 'inherited'}
              value={overrideQuery.data ?? globalFilters ?? {}}
              inheritedValue={globalFilters ?? {}}
              onSave={(next) => void handleSave(next)}
              saving={setFilters.isPending}
              onReset={overrideQuery.data ? () => void handleReset() : undefined}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
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
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
});
