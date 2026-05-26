import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
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

export default function ProfileScreen() {
  const session = useSession();
  const theme = useTheme();
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

  const [displayName, setDisplayName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [dirty, setDirty] = useState(false);
  // notification_prefs.push_enabled drives this toggle. Defaults to true on a
  // freshly-created recruiter_profiles row (migration 0010), so users opt
  // out rather than opt in.
  const pushEnabled = profileQuery.data?.notification_prefs?.push_enabled ?? true;
  const [pushPending, setPushPending] = useState(false);

  useEffect(() => {
    if (!dirty && profileQuery.data) {
      setDisplayName(profileQuery.data.display_name ?? '');
      setOrgName(profileQuery.data.org_name ?? '');
    }
  }, [profileQuery.data, dirty]);

  async function handleTogglePush(next: boolean) {
    if (!userId) return;
    setPushPending(true);
    try {
      await updateProfile.mutateAsync({
        userId,
        notification_prefs: {
          ...(profileQuery.data?.notification_prefs ?? {}),
          push_enabled: next,
        },
      });
    } catch (err) {
      Alert.alert(
        'Update failed',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setPushPending(false);
    }
  }

  if (session.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.loadingInner}>
            <ThemedText>Loading…</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }
  if (session.status !== 'ready' || !session.session) {
    return <Redirect href="/sign-in" />;
  }

  async function handleSave() {
    if (!userId) return;
    try {
      await updateProfile.mutateAsync({
        userId,
        display_name: displayName.trim() || null,
        org_name: orgName.trim() || null,
      });
      setDirty(false);
      Alert.alert('Saved', 'Profile updated.');
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (err) {
      Alert.alert('Sign-out failed', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  const inputStyle = [styles.input, { color: theme.text }];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">Account</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {email}
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">Integrations</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Connect an ATS so candidates show up on the Connections tab.
            Job board integrations (Indeed, ZipRecruiter, …) are on the
            roadmap.
          </ThemedText>
          <Pressable
            onPress={() => router.push('/connect')}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={styles.primaryButtonText}>Connect ATS</ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">Display name</ThemedText>
          <TextInput
            value={displayName}
            onChangeText={(v) => {
              setDisplayName(v);
              setDirty(true);
            }}
            placeholder="Your name"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
            autoCapitalize="words"
            autoComplete="name"
            editable={!updateProfile.isPending}
          />
          <ThemedText type="smallBold" style={{ marginTop: Spacing.two }}>
            Organization
          </ThemedText>
          <TextInput
            value={orgName}
            onChangeText={(v) => {
              setOrgName(v);
              setDirty(true);
            }}
            placeholder="Company name"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
            autoCapitalize="words"
            editable={!updateProfile.isPending}
          />
          <Pressable
            onPress={handleSave}
            disabled={!dirty || updateProfile.isPending}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.pressed,
              (!dirty || updateProfile.isPending) && styles.disabled,
            ]}
          >
            <ThemedText style={styles.saveButtonText}>
              {updateProfile.isPending
                ? 'Saving…'
                : dirty
                  ? 'Save profile'
                  : 'No changes'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.section}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">Push notifications</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Get notified when new candidates land on connected requisitions.
                Push delivery requires a dev-client build; the preference saves
                either way.
              </ThemedText>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePush}
              disabled={pushPending || profileQuery.isLoading}
            />
          </View>
        </ThemedView>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <ThemedText style={{ color: '#E5484D', fontWeight: '600' }}>Sign out</ThemedText>
        </Pressable>
        </ScrollView>
        </KeyboardAvoidingView>
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
  loadingInner: { flex: 1, padding: Spacing.four },
  section: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    backgroundColor: 'rgba(127,127,127,0.12)',
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  saveButtonText: { color: 'white', fontWeight: '700' },
  primaryButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  primaryButtonText: { color: 'white', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  signOut: {
    padding: Spacing.three,
    alignItems: 'center',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
