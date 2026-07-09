// Grade mode: the requisition's candidates as a scrollable list (everyone,
// including already-swiped) with an inline overall-grade control per row.
// Tapping a row opens the grading detail screen (per-skill + categories +
// note). Sorting by grade is the point — the ranked list is what the
// recruiter takes to the client.

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import type { Candidate, Requisition } from '@/ats/types';
import { ThemedText } from '@/components/themed-text';
import type { CandidateFilters } from '@/features/filters/types';
import type { IntegrationRow } from '@/features/integrations/queries';
import { CandidateCard } from '@/features/swipes/CandidateCard';
import { useDeckCandidates, useSwipedIds } from '@/features/swipes/queries';
import { Spacing } from '@/constants/theme';
import { gradeValuesOf, mergeGrade } from './grade-utils';
import { useCandidateGrades, useSetCandidateGrade } from './queries';
import { sortByGrade } from './sort';
import { GradeControl } from './GradeControl';

type SortMode = 'deck' | 'grade';

export function GradeList({
  integration,
  requisition,
  filters,
  onOpenFilters,
}: {
  integration: IntegrationRow;
  requisition: Requisition;
  filters: CandidateFilters;
  onOpenFilters: () => void;
}) {
  const deck = useDeckCandidates(integration, requisition.externalId, filters, {
    includeSwiped: true,
  });
  const swipedIds = useSwipedIds(integration.id, requisition.externalId);
  const { byCandidate } = useCandidateGrades(
    integration.id,
    requisition.externalId,
  );
  const setGrade = useSetCandidateGrade();
  const [sort, setSort] = useState<SortMode>('deck');

  const items = useMemo(
    () =>
      sort === 'grade'
        ? sortByGrade(
            deck.candidates,
            (c) => byCandidate.get(c.externalId)?.grade ?? null,
          )
        : deck.candidates,
    [deck.candidates, byCandidate, sort],
  );

  function commitOverall(candidate: Candidate, value: number | null) {
    const row = byCandidate.get(candidate.externalId);
    setGrade.mutate({
      integrationId: integration.id,
      requisitionExternalId: requisition.externalId,
      candidateExternalId: candidate.externalId,
      values: mergeGrade(gradeValuesOf(row), { kind: 'overall', value }),
    });
  }

  function openDetail(candidate: Candidate) {
    router.push({
      pathname: '/candidate-grade',
      params: {
        integrationId: integration.id,
        reqId: requisition.externalId,
        candidateExternalId: candidate.externalId,
        reqTitle: requisition.title,
      },
    });
  }

  if (deck.isLoading) {
    return <ThemedText themeColor="textSecondary">Loading candidates…</ThemedText>;
  }
  if (deck.isError) {
    return (
      <ThemedText themeColor="textSecondary">
        Couldn’t load candidates. Please go back and try again.
      </ThemedText>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(c) => c.externalId}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (deck.hasNextPage && !deck.isFetchingNextPage) deck.fetchNextPage();
      }}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.sortRow}>
            <SortPill
              label="Deck order"
              active={sort === 'deck'}
              onPress={() => setSort('deck')}
            />
            <SortPill
              label="Highest grade"
              active={sort === 'grade'}
              onPress={() => setSort('grade')}
            />
          </View>
          {deck.filteredOutCount > 0 ? (
            <Pressable onPress={onOpenFilters} accessibilityRole="button">
              <ThemedText type="small" themeColor="textSecondary">
                {deck.filteredOutCount} candidate
                {deck.filteredOutCount === 1 ? '' : 's'} hidden by your filters
                — tap to edit.
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <ThemedText themeColor="textSecondary">
          No candidates on this requisition
          {deck.filteredOutCount > 0 ? ' match your filters' : ' yet'}.
        </ThemedText>
      }
      ListFooterComponent={
        deck.isFetchingNextPage ? (
          <ActivityIndicator style={styles.footer} />
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => openDetail(item)}
          accessibilityRole="button"
          accessibilityLabel={`Open detailed grading for ${item.fullName}`}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <CandidateCard
            variant="compact"
            candidate={item}
            highlightSkills={filters.skills?.values}
          />
          <View style={styles.rowFooter}>
            {swipedIds.has(item.externalId) ? (
              <View style={styles.swipedPill}>
                <ThemedText type="small" themeColor="textSecondary">
                  Swiped
                </ThemedText>
              </View>
            ) : (
              <View />
            )}
            <GradeControl
              value={byCandidate.get(item.externalId)?.grade ?? null}
              onCommit={(value) => commitOverall(item, value)}
              accessibilityLabel={item.fullName}
            />
          </View>
        </Pressable>
      )}
    />
  );
}

function SortPill({
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
      style={[styles.sortPill, active && styles.sortPillActive]}
    >
      <ThemedText type="small" style={active ? styles.sortPillActiveText : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listContent: { gap: Spacing.three, paddingBottom: Spacing.four },
  header: { gap: Spacing.two },
  sortRow: { flexDirection: 'row', gap: Spacing.two },
  sortPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  sortPillActive: { backgroundColor: '#208AEF' },
  sortPillActiveText: { color: 'white', fontWeight: '600' },
  row: { gap: Spacing.one },
  rowPressed: { opacity: 0.85 },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  swipedPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  footer: { marginVertical: Spacing.three },
});
