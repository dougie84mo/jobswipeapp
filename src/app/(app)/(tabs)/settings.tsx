import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/auth-actions';
import { useSession } from '@/features/auth/SessionProvider';
import {
  useRecruiterProfile,
  useUpdateRecruiterProfile,
} from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';

// Settings is a grouped list so new options slot in as rows without a
// redesign. Navigation rows push detail screens (which live in the parent
// (app) Stack, above the tab bar); boolean prefs stay inline as switches.

export default function SettingsScreen() {
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  const email =
    session.status === 'ready' && session.session
      ? session.session.user.email
      : undefined;
  const profileQuery = useRecruiterProfile(userId);
  const updateProfile = useUpdateRecruiterProfile();

  const pushEnabled = profileQuery.data?.notification_prefs?.push_enabled ?? true;
  const gestureSwiping = profileQuery.data?.app_prefs?.gesture_swiping ?? false;
  const prefsBusy = updateProfile.isPending || profileQuery.isLoading;

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

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (err) {
      Alert.alert('Sign-out failed', toMessage(err));
    }
  }

  const profileName = profileQuery.data?.display_name;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SettingsGroup title="Account">
            <NavRow
              icon="person-circle-outline"
              label="Profile"
              detail={profileName ?? email ?? undefined}
              onPress={() => router.push('/settings/profile')}
            />
          </SettingsGroup>

          <SettingsGroup title="Sources">
            <NavRow
              icon="add-circle-outline"
              label="Connect a source"
              onPress={() => router.push('/connect')}
            />
          </SettingsGroup>

          <SettingsGroup title="Preferences">
            <SwitchRow
              icon="notifications-outline"
              label="Push notifications"
              description="Alerts when new candidates land on connected requisitions."
              value={pushEnabled}
              onValueChange={handleTogglePush}
              disabled={prefsBusy}
            />
            <RowDivider />
            <SwitchRow
              icon="hand-left-outline"
              label="Swipe gestures"
              description="Drag cards left, right, or up instead of tapping the buttons."
              value={gestureSwiping}
              onValueChange={handleToggleGestures}
              disabled={prefsBusy}
            />
          </SettingsGroup>

          <SettingsGroup>
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Ionicons name="log-out-outline" size={20} color="#E5484D" />
              <ThemedText style={styles.signOutText}>Sign out</ThemedText>
            </Pressable>
          </SettingsGroup>

          {email ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
              Signed in as {email}
            </ThemedText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      {title ? (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
          {title}
        </ThemedText>
      ) : null}
      <ThemedView type="backgroundElement" style={styles.groupCard}>
        {children}
      </ThemedView>
    </View>
  );
}

function NavRow({
  icon,
  label,
  detail,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={20} color={theme.textSecondary} />
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      {detail ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          numberOfLines={1}
          style={styles.rowDetail}
        >
          {detail}
        </ThemedText>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

function SwitchRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={theme.textSecondary} />
      <View style={styles.switchBody}>
        <ThemedText>{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

function RowDivider() {
  return <View style={styles.divider} />;
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
  group: { gap: Spacing.one },
  groupTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: Spacing.two,
  },
  groupCard: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowLabel: { flex: 1 },
  rowDetail: { maxWidth: 140 },
  switchBody: { flex: 1, gap: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(127,127,127,0.3)',
  },
  signOutText: { color: '#E5484D', fontWeight: '600' },
  footer: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
