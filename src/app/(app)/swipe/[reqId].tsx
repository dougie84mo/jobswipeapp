import { Image } from 'expo-image';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import { useIntegration } from '@/features/integrations/queries';
import { useRequisitions } from '@/features/integrations/requisitions';
import {
  actionsForDirection,
  useIntegrationSettings,
} from '@/features/integrations/settings';
import { useRecruiterProfile } from '@/features/profile/queries';
import { executeActions } from '@/features/swipes/execute-actions';
import { useDeckCandidates, useRecordSwipe } from '@/features/swipes/queries';
import { SwipeableCard } from '@/features/swipes/SwipeableCard';
import type { Candidate, ExecutedAction, SwipeDirection } from '@/ats/types';

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
  const candidatesQuery = useDeckCandidates(integration, reqId);
  const settingsQuery = useIntegrationSettings(integration?.id);
  const recordSwipe = useRecordSwipe();
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  const profileQuery = useRecruiterProfile(userId);
  const gestureSwiping = profileQuery.data?.app_prefs?.gesture_swiping ?? false;

  const [topIndex, setTopIndex] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<ExecutedAction[] | null>(null);
  // True for the whole swipe op (ATS write + record) so controls are blocked
  // and re-entry is prevented until it settles.
  const [swiping, setSwiping] = useState(false);

  const candidates = candidatesQuery.candidates;
  const current = candidates[topIndex];
  const headerTitle = requisition?.title ?? 'Swipe';

  // Keep paging when the current page filtered entirely to already-swiped
  // candidates but more pages remain — otherwise the deck would stall on
  // "Loading more" without ever requesting the next page. (Declared before the
  // early return below so hook order stays stable.)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = candidatesQuery;
  useEffect(() => {
    if (!current && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [current, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!integrationId) {
    return <Redirect href="/" />;
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
      <Stack.Screen options={{ title: headerTitle }} />
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
          candidatesQuery.hasNextPage || candidatesQuery.isFetchingNextPage ? (
            <ThemedText themeColor="textSecondary">Loading more candidates…</ThemedText>
          ) : (
            <ThemedView type="backgroundElement" style={styles.doneCard}>
              <ThemedText type="subtitle">All caught up</ThemedText>
              <ThemedText themeColor="textSecondary">
                You’ve gone through every candidate on this requisition. Check
                back later for new applicants.
              </ThemedText>
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
              <CandidateCard candidate={current} />
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

function CandidateCard({ candidate }: { candidate: Candidate }) {
  // Group the card into one screen-reader node so it announces the candidate
  // as a sentence instead of reading each chip / emoji separately.
  const a11yLabel = [
    candidate.fullName,
    candidate.headline,
    candidate.location ? `Location ${candidate.location}` : null,
    candidate.yearsExperience !== undefined
      ? `${Math.round(candidate.yearsExperience)} years experience`
      : null,
    candidate.skills?.length ? `Skills: ${candidate.skills.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('. ');
  return (
    <ThemedView
      type="backgroundElement"
      style={styles.card}
      accessible
      accessibilityLabel={a11yLabel}
    >
      {candidate.photoUrl ? (
        <Image
          source={{ uri: candidate.photoUrl }}
          style={styles.photo}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.photo, styles.photoFallback]} />
      )}
      <View style={styles.cardBody}>
        <ThemedText type="subtitle">{candidate.fullName}</ThemedText>
        {candidate.headline ? (
          <ThemedText themeColor="textSecondary">{candidate.headline}</ThemedText>
        ) : null}
        <View style={styles.metaRow}>
          {candidate.location ? (
            <ThemedText type="small" themeColor="textSecondary">
              📍 {candidate.location}
            </ThemedText>
          ) : null}
          {candidate.yearsExperience !== undefined ? (
            <ThemedText type="small" themeColor="textSecondary">
              {Math.round(candidate.yearsExperience)} yrs experience
            </ThemedText>
          ) : null}
        </View>
        {candidate.skills && candidate.skills.length > 0 ? (
          <View style={styles.skillRow}>
            {candidate.skills.map((skill) => (
              <View key={skill} style={styles.skillChip}>
                <ThemedText type="small">{skill}</ThemedText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
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
  card: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(127,127,127,0.2)',
  },
  photoFallback: {
    backgroundColor: 'rgba(127,127,127,0.2)',
  },
  cardBody: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  skillChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
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
});
