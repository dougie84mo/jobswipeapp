import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import { FilterEditor } from '@/features/filters/FilterEditor';
import type { CandidateFilters } from '@/features/filters/types';
import {
  useRecruiterProfile,
  useUpdateRecruiterProfile,
} from '@/features/profile/queries';

// Global candidate-filter defaults — pushed from the Settings tab. Every deck
// starts from these; individual requisitions can override per-section from
// the deck's filter screen. Stored in app_prefs.candidate_filters.

export default function CandidateFiltersScreen() {
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  const profileQuery = useRecruiterProfile(userId);
  const updateProfile = useUpdateRecruiterProfile();

  async function handleSave(next: CandidateFilters) {
    if (!userId) return;
    try {
      await updateProfile.mutateAsync({
        userId,
        app_prefs: {
          ...(profileQuery.data?.app_prefs ?? {}),
          candidate_filters: next,
        },
      });
    } catch (err) {
      Alert.alert('Save failed', toMessage(err));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="small" themeColor="textSecondary">
            Defaults for every swipe deck. Candidates missing a filtered field
            still show unless you flip that filter’s strict toggle — most
            sources send only partial profiles.
          </ThemedText>
          {profileQuery.isLoading ? (
            <ThemedText themeColor="textSecondary">Loading…</ThemedText>
          ) : (
            <FilterEditor
              value={profileQuery.data?.app_prefs?.candidate_filters ?? {}}
              onSave={(next) => void handleSave(next)}
              saving={updateProfile.isPending}
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
