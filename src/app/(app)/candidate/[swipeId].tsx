import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatDateRange, initials } from '@/ats/candidate-utils';
import { displayNameFor } from '@/ats/client';
import type { ExecutedAction } from '@/ats/types';
import { describeAction } from '@/features/swipes/action-labels';
import { useMatch } from '@/features/swipes/matches';
import { useTheme } from '@/hooks/use-theme';

// Candidate profile — pushed from the Candidates tab. Renders the cached
// candidate (what the deck showed at swipe time) plus the swipe outcome.
// The ATS stays the source of truth; this is the recruiter's snapshot.

const DIRECTION_LABEL = { right: 'Saved', up: 'Boosted' } as const;
const DIRECTION_COLOR = { right: '#30A46C', up: '#F5A524' } as const;

const STATUS_COLOR: Record<ExecutedAction['status'], string> = {
  success: '#30A46C',
  failure: '#E5484D',
  skipped: '#8F8F8F',
};

export default function CandidateProfileScreen() {
  const { swipeId } = useLocalSearchParams<{ swipeId: string }>();
  const theme = useTheme();
  const matchQuery = useMatch(swipeId);

  if (matchQuery.isLoading) {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary">Loading…</ThemedText>
      </Screen>
    );
  }
  if (matchQuery.isError) {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary">
          Couldn’t load candidate: {toMessage(matchQuery.error)}
        </ThemedText>
      </Screen>
    );
  }
  const match = matchQuery.data;
  if (!match || !match.candidate) {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary">
          This candidate is no longer available.
        </ThemedText>
      </Screen>
    );
  }

  const candidate = match.candidate;
  const integration = candidate.integration;
  const sourceLabel = integration
    ? (integration.display_label ?? displayNameFor(integration.provider))
    : 'Unknown source';
  const swipedAt = new Date(match.created_at);
  const actions = match.executed_actions ?? [];

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.avatarFallback}>
          {candidate.photo_url ? (
            <Image source={{ uri: candidate.photo_url }} style={styles.avatar} />
          ) : (
            <ThemedText type="subtitle">{initials(candidate.full_name)}</ThemedText>
          )}
        </View>
        <ThemedText type="title" style={styles.name}>
          {candidate.full_name ?? 'Unnamed candidate'}
        </ThemedText>
        {candidate.headline ? (
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            {candidate.headline}
          </ThemedText>
        ) : null}
        <View
          style={[
            styles.directionPill,
            { backgroundColor: DIRECTION_COLOR[match.direction] },
          ]}
        >
          <ThemedText type="small" style={styles.directionText}>
            {DIRECTION_LABEL[match.direction]} {swipedAt.toLocaleDateString()}
          </ThemedText>
        </View>
      </View>

      <ThemedView type="backgroundElement" style={styles.section}>
        <ThemedText type="smallBold">Details</ThemedText>
        {candidate.location ? (
          <DetailRow icon="location-outline" text={candidate.location} />
        ) : null}
        {candidate.years_experience != null ? (
          <DetailRow
            icon="briefcase-outline"
            text={`${candidate.years_experience} years of experience`}
          />
        ) : null}
        <DetailRow
          icon="git-branch-outline"
          text={`${match.requisition?.title ?? 'Unknown requisition'}${
            match.requisition?.department ? ` • ${match.requisition.department}` : ''
          }`}
        />
        <DetailRow icon="cloud-outline" text={sourceLabel} />
      </ThemedView>

      {candidate.experience && candidate.experience.length > 0 ? (
        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">Experience</ThemedText>
          {candidate.experience.map((entry, i) => {
            const range = formatDateRange(entry);
            const detail = [entry.company, range].filter(Boolean).join(' · ');
            return (
              <View key={i} style={styles.entryRow}>
                <ThemedText type="small" style={styles.entryTitle}>
                  {entry.title ?? entry.company ?? 'Role'}
                </ThemedText>
                {detail && detail !== entry.title ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {detail}
                  </ThemedText>
                ) : null}
                {entry.summary ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {entry.summary}
                  </ThemedText>
                ) : null}
              </View>
            );
          })}
        </ThemedView>
      ) : null}

      {candidate.education && candidate.education.length > 0 ? (
        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">Education</ThemedText>
          {candidate.education.map((entry, i) => {
            const degreeField = [entry.degree, entry.field]
              .filter(Boolean)
              .join(', ');
            return (
              <View key={i} style={styles.entryRow}>
                <ThemedText type="small">
                  {degreeField ? `${degreeField} — ${entry.school}` : entry.school}
                </ThemedText>
              </View>
            );
          })}
        </ThemedView>
      ) : null}

      {candidate.skills && candidate.skills.length > 0 ? (
        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">Skills</ThemedText>
          <View style={styles.skills}>
            {candidate.skills.map((skill) => (
              <View key={skill} style={styles.skillPill}>
                <ThemedText type="small">{skill}</ThemedText>
              </View>
            ))}
          </View>
        </ThemedView>
      ) : null}

      <ThemedView type="backgroundElement" style={styles.section}>
        <ThemedText type="smallBold">Swipe outcome</ThemedText>
        {actions.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No actions were configured for this swipe direction.
          </ThemedText>
        ) : (
          actions.map((action, i) => (
            <View key={i} style={styles.actionRow}>
              <View
                style={[styles.statusDot, { backgroundColor: STATUS_COLOR[action.status] }]}
              />
              <View style={styles.actionBody}>
                <ThemedText type="small">{describeAction(action)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {action.status}
                  {action.message ? ` — ${action.message}` : ''}
                </ThemedText>
              </View>
            </View>
          ))
        )}
        {match.notes ? (
          <ThemedText type="small" themeColor="textSecondary">
            Notes: {match.notes}
          </ThemedText>
        ) : null}
      </ThemedView>

      {candidate.resume_url ? (
        <Pressable
          onPress={() => void Linking.openURL(candidate.resume_url!)}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <ThemedText style={styles.primaryButtonText}>Open resume</ThemedText>
        </Pressable>
      ) : null}

      {integration ? (
        <Pressable
          onPress={() => router.push(`/integration/${integration.id}/activity`)}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <ThemedText type="linkPrimary" style={{ color: theme.text }}>
            View all activity for {sourceLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function DetailRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={theme.textSecondary} />
      <ThemedText type="small" style={styles.detailText}>
        {text}
      </ThemedText>
    </View>
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
  hero: { alignItems: 'center', gap: Spacing.two },
  // Identity circle is deliberately small (info-first design): initials are
  // the common case, a provider photo renders inside the same circle.
  avatar: { width: 64, height: 64 },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  entryRow: { gap: 2 },
  entryTitle: { fontWeight: '600' },
  name: { textAlign: 'center' },
  centered: { textAlign: 'center' },
  directionPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  directionText: { color: 'white', fontWeight: '700' },
  section: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  detailText: { flex: 1 },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  skillPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  actionBody: { flex: 1, gap: 2 },
  primaryButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonText: { color: 'white', fontWeight: '700' },
  secondaryButton: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  pressed: { opacity: 0.7 },
});
