import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Recruit Team — stub. Multi-recruiter / org features are out of scope for
// now (see CLAUDE.md); this page is the clean extension point for when
// shared pipelines and teammate invites land.

export default function RecruitTeamScreen() {
  const theme = useTheme();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView type="backgroundElement" style={styles.section}>
            <Ionicons name="people-circle-outline" size={28} color={theme.textSecondary} />
            <ThemedText type="smallBold">Recruit Team is coming soon</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Work a pipeline together: invite teammates to your organization,
              share connected sources, split requisitions, and see who saved
              or boosted each candidate.
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">What&apos;s planned</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              • Teammate invites by email{'\n'}
              • Shared source connections with per-member permissions{'\n'}
              • Requisition assignment{'\n'}
              • A team view of matched candidates
            </ThemedText>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  section: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
});
