import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import {
  activeFilterCount,
  effectiveFilters,
  filtersKey,
} from '@/features/filters/predicate';
import {
  useGlobalCandidateFilters,
  useRequisitionFilters,
} from '@/features/filters/queries';
import { useIntegration } from '@/features/integrations/queries';
import { useRequisitions } from '@/features/integrations/requisitions';
import {
  actionsForDirection,
  useIntegrationSettings,
} from '@/features/integrations/settings';
import { useRecruiterProfile } from '@/features/profile/queries';
import { CandidateCard } from '@/features/swipes/CandidateCard';
import { executeActions } from '@/features/swipes/execute-actions';
import { useDeckCandidates, useRecordSwipe } from '@/features/swipes/queries';
import { SwipeableCard } from '@/features/swipes/SwipeableCard';
import type { ExecutedAction, SwipeDirection } from '@/ats/types';
import { useTheme } from '@/hooks/use-theme';

// Auto-paging stops after this many consecutive pages were entirely hidden
// by the recruiter's filters — otherwise strict filters would silently walk
// (and pay for) the provider's whole pipeline.
const MAX_CONSECUTIVE_FILTERED_PAGES = 5;

export default function SwipeDeckScreen() {
  const params = useLocalSearchParams<{ reqId: string; integrationId?: string }>();
  const reqId = params.reqId;
  const integrationId = params.integrationId;

  const integrationQuery = useIntegration(integrationId);
  const integration = integrationQuery.data ?? null;
  const requisitionsQuery = useRequisitions(integration);
  const requisition = useMemo(
    () =>
      (requisitionsQuery.data ?? []).find((r) => r.externalId === reqId),
    [requisitionsQuery.data, reqId],
  );
  const { filters: globalFilters } = useGlobalCandidateFilters();
  const reqFiltersQuery = useRequisitionFilters(integrationId, reqId);
  const filters = useMemo(
    () => effectiveFilters(globalFilters, reqFiltersQuery.data ?? undefined),
    [globalFilters, reqFiltersQuery.data],
  );
  const activeFilters = activeFilterCount(filters);
  const candidatesQuery = useDeckCandidates(integration, reqId, filters);
  const settingsQuery = useIntegrationSettings(integration?.id);
  const recordSwipe = useRecordSwipe();
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  const profileQuery = useRecruiterProfile(userId);
  const gestureSwiping = profileQuery.data?.app_prefs?.gesture_swiping ?? false;
  const theme = useTheme();

  const [topIndex, setTopIndex] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<ExecutedAction[] | null>(null);
  // True for the whole swipe op (ATS write + record) so controls are blocked
  // and re-entry is prevented until it settles.
  const [swiping, setSwiping] = useState(false);

  // Editing filters mounts a fresh deck (new query key) — restart from the
  // top card so topIndex doesn't point past the new, shorter list.
  const deckKey = filtersKey(filters);
  const prevDeckKey = useRef(deckKey);
  useEffect(() => {
    if (prevDeckKey.current !== deckKey) {
      prevDeckKey.current = deckKey;
      setTopIndex(0);
    }
  }, [deckKey]);

  const candidates = candidatesQuery.candidates;
  const current = candidates[topIndex];
  const headerTitle = requisition?.title ?? 'Swipe';

  // Keep paging when the current page filtered entirely to already-swiped
  // (or filtered-out) candidates but more pages remain — otherwise the deck
  // would stall on "Loading more" without ever requesting the next page.
  // Guarded: after MAX_CONSECUTIVE_FILTERED_PAGES card-less fetches with
  // active filters, stop and let the recruiter loosen the filters instead of
  // silently walking the provider's entire pipeline. (Declared before the
  // early return below so hook order stays stable.)
  const emptyFetches = useRef(0);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = candidatesQuery;
  const [pagingStopped, setPagingStopped] = useState(false);
  useEffect(() => {
    if (current) {
      emptyFetches.current = 0;
      if (pagingStopped) setPagingStopped(false);
      return;
    }
    if (!hasNextPage || isFetchingNextPage || pagingStopped) return;
    if (activeFilters > 0 && emptyFetches.current >= MAX_CONSECUTIVE_FILTERED_PAGES) {
      setPagingStopped(true);
      return;
    }
    emptyFetches.current += 1;
    fetchNextPage();
  }, [current, hasNextPage, isFetchingNextPage, fetchNextPage, activeFilters, pagingStopped]);

  if (!integrationId) {
    return <Redirect href="/" />;
  }

  function openFilters() {
    router.push({
      pathname: '/requisition-filters',
      params: {
        integrationId: integrationId!,
        reqId,
        reqTitle: requisition?.title ?? '',
      },
    });
  }

  async function handleSwipe(direction: SwipeDirection) {
    if (!integration || !requisition || !current || swiping) return;
    const candidateAtSwipe = current;
    const swipedIndex = topIndex;
    const nextIndex = topIndex + 1;
    setSwiping(true);
    setTopIndex(nextIndex);
    // Prefetch the next page before the recruiter runs out of cards.
    if (
      nextIndex >= candidates.length - 2 &&
      candidatesQuery.hasNextPage &&
      !candidatesQuery.isFetchingNextPage
    ) {
      candidatesQuery.fetchNextPage();
    }
    const actions = actionsForDirection(settingsQuery.data, direction);
    let executedActions: ExecutedAction[] = [];
    try {
      executedActions = await executeActions(
        { id: integration.id, provider: integration.provider },
        requisition.externalId,
        candidateAtSwipe,
        actions,
      );
      setLastOutcome(executedActions);
    } catch (err) {
      setLastOutcome(null);
      Alert.alert('Swipe actions failed', toMessage(err));
    }
    try {
      await recordSwipe.mutateAsync({
        integration,
        requisition,
        candidate: candidateAtSwipe,
        direction,
        executedActions,
      });
    } catch (err) {
      // Persisting the swipe failed — roll the card back so the recruiter's
      // decision isn't silently dropped. (Controls are blocked during the
      // swipe, so topIndex hasn't moved past nextIndex.) Note: any ATS action
      // already sent will re-run if they swipe again.
      setTopIndex(swipedIndex);
      Alert.alert('Swipe not saved', toMessage(err));
    } finally {
      setSwiping(false);
    }
  }

  const isLoading =
    integrationQuery.isLoading ||
    requisitionsQuery.isLoading ||
    candidatesQuery.isLoading;
  const isError =
    integrationQuery.isError ||
    requisitionsQuery.isError ||
    candidatesQuery.isError;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerRight: () => (
            <Pressable
              onPress={openFilters}
              accessibilityRole="button"
              accessibilityLabel={
                activeFilters > 0
                  ? `Candidate filters, ${activeFilters} active`
                  : 'Candidate filters'
              }
              style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
            >
              <Ionicons name="funnel-outline" size={20} color={theme.text} />
              {activeFilters > 0 ? <View style={styles.filterBadge} /> : null}
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.inner} edges={['bottom', 'left', 'right']}>
        {isLoading ? (
          <ThemedText themeColor="textSecondary">Loading candidates…</ThemedText>
        ) : isError ? (
          <ThemedText themeColor="textSecondary">
            Couldn’t load the deck. Please go back and try again.
          </ThemedText>
        ) : !integration ? (
          <ThemedText themeColor="textSecondary">Integration not found.</ThemedText>
        ) : !requisition ? (
          <ThemedText themeColor="textSecondary">
            Requisition no longer available.
          </ThemedText>
        ) : !current ? (
          pagingStopped ? (
            <ThemedView type="backgroundElement" style={styles.doneCard}>
              <ThemedText type="subtitle">Filters are hiding candidates</ThemedText>
              <ThemedText themeColor="textSecondary">
                The last {MAX_CONSECUTIVE_FILTERED_PAGES} pages of candidates
                were all hidden by your filters
                {candidatesQuery.filteredOutCount > 0
                  ? ` (${candidatesQuery.filteredOutCount} hidden so far)`
                  : ''}
                . Loosen them to keep swiping.
              </ThemedText>
              <Pressable
                onPress={openFilters}
                accessibilityRole="button"
                style={({ pressed }) => [styles.editFiltersButton, pressed && styles.pressed]}
              >
                <ThemedText style={styles.editFiltersLabel}>Edit filters</ThemedText>
              </Pressable>
            </ThemedView>
          ) : candidatesQuery.hasNextPage || candidatesQuery.isFetchingNextPage ? (
            <ThemedText themeColor="textSecondary">Loading more candidates…</ThemedText>
          ) : (
            <ThemedView type="backgroundElement" style={styles.doneCard}>
              <ThemedText type="subtitle">All caught up</ThemedText>
              <ThemedText themeColor="textSecondary">
                You’ve gone through every candidate on this requisition.
                {candidatesQuery.filteredOutCount > 0
                  ? ` Your filters hid ${candidatesQuery.filteredOutCount} candidate${
                      candidatesQuery.filteredOutCount === 1 ? '' : 's'
                    }.`
                  : ' Check back later for new applicants.'}
              </ThemedText>
              {candidatesQuery.filteredOutCount > 0 ? (
                <Pressable
                  onPress={openFilters}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.editFiltersButton, pressed && styles.pressed]}
                >
                  <ThemedText style={styles.editFiltersLabel}>Edit filters</ThemedText>
                </Pressable>
              ) : null}
            </ThemedView>
          )
        ) : (
          <>
            <SwipeableCard
              // Key on the candidate so each new card mounts fresh with
              // translateX/Y at zero rather than carrying state from the
              // previous card.
              key={current.externalId}
              enabled={gestureSwiping && !swiping}
              onSwipe={handleSwipe}
            >
              <CandidateCard
                candidate={current}
                highlightSkills={filters.skills?.values}
              />
            </SwipeableCard>
            <View style={styles.actions}>
              <ActionButton
                label="Pass"
                color="#E5484D"
                onPress={() => handleSwipe('left')}
                disabled={swiping}
                accessibilityLabel={`Pass on ${current.fullName}`}
              />
              <ActionButton
                label="Boost"
                color="#F5A524"
                onPress={() => handleSwipe('up')}
                disabled={swiping}
                accessibilityLabel={`Boost ${current.fullName}`}
              />
              <ActionButton
                label="Save"
                color="#30A46C"
                onPress={() => handleSwipe('right')}
                disabled={swiping}
                accessibilityLabel={`Save ${current.fullName}`}
              />
            </View>
            {lastOutcome && lastOutcome.length > 0 ? (
              <ThemedText
                themeColor="textSecondary"
                style={styles.outcome}
                type="small"
              >
                Last swipe ran {summarizeOutcome(lastOutcome)}
              </ThemedText>
            ) : null}
            <ThemedText
              themeColor="textSecondary"
              style={styles.deckCounter}
              type="small"
            >
              Candidate {topIndex + 1} of {candidates.length}
            </ThemedText>
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function ActionButton({
  label,
  color,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: color },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <ThemedText style={styles.actionLabel}>{label}</ThemedText>
    </Pressable>
  );
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

function summarizeOutcome(actions: ExecutedAction[]): string {
  const success = actions.filter((a) => a.status === 'success').length;
  const failure = actions.filter((a) => a.status === 'failure').length;
  const skipped = actions.filter((a) => a.status === 'skipped').length;
  const parts: string[] = [];
  if (success) parts.push(`${success} action${success === 1 ? '' : 's'}`);
  if (failure) parts.push(`${failure} failed`);
  if (skipped) parts.push(`${skipped} skipped`);
  return parts.join(' • ') || 'no actions';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  doneCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: Spacing.three,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: 999,
    alignItems: 'center',
  },
  actionLabel: { color: 'white', fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  deckCounter: { textAlign: 'center' },
  outcome: { textAlign: 'center' },
  filterButton: { padding: Spacing.one },
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#208AEF',
  },
  editFiltersButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  editFiltersLabel: { color: 'white', fontWeight: '600' },
});
