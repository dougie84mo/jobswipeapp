import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  RowDivider,
  SettingsGroup,
  SwitchRow,
} from '@/components/settings-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import {
  useRecruiterProfile,
  useUpdateRecruiterProfile,
} from '@/features/profile/queries';

// Preferences — pushed from the Settings tab. Everything here writes to the
// recruiter_profiles jsonb pref buckets (notification_prefs / app_prefs).

export default function PreferencesScreen() {
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  const profileQuery = useRecruiterProfile(userId);
  const updateProfile = useUpdateRecruiterProfile();

  const pushEnabled = profileQuery.data?.notification_prefs?.push_enabled ?? true;
  const gestureSwiping = profileQuery.data?.app_prefs?.gesture_swiping ?? false;
  const busy = updateProfile.isPending || profileQuery.isLoading;

  async function handleTogglePush(next: boolean) {
    if (!userId) return;
    try {
      await updateProfile.mutateAsync({
        userId,
        notification_prefs: {
          ...(profileQuery.data?.notification_prefs ?? {}),
          push_enabled: next,
        },
      });
    } catch (err) {
      Alert.alert('Update failed', toMessage(err));
    }
  }

  async function handleToggleGestures(next: boolean) {
    if (!userId) return;
    try {
      await updateProfile.mutateAsync({
        userId,
        app_prefs: {
          ...(profileQuery.data?.app_prefs ?? {}),
          gesture_swiping: next,
        },
      });
    } catch (err) {
      Alert.alert('Update failed', toMessage(err));
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
          <SettingsGroup title="Notifications">
            <SwitchRow
              icon="notifications-outline"
              label="Push notifications"
              description="Alerts when new candidates land on connected requisitions."
              value={pushEnabled}
              onValueChange={handleTogglePush}
              disabled={busy}
            />
          </SettingsGroup>

          <SettingsGroup title="Swiping">
            <SwitchRow
              icon="hand-left-outline"
              label="Swipe gestures"
              description="Drag cards left, right, or up instead of tapping the buttons."
              value={gestureSwiping}
              onValueChange={handleToggleGestures}
              disabled={busy}
            />
            <RowDivider />
            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              Pass / Boost / Save buttons stay visible either way.
            </ThemedText>
          </SettingsGroup>
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
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  note: { paddingVertical: Spacing.two },
});
