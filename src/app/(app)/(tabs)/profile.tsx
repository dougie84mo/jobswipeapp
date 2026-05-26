import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
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
  // Push notif preferences are local-only for now — wiring expo-notifications
  // device tokens to a notification_prefs column is a follow-up.
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    if (!dirty && profileQuery.data) {
      setDisplayName(profileQuery.data.display_name ?? '');
      setOrgName(profileQuery.data.org_name ?? '');
    }
  }, [profileQuery.data, dirty]);

  if (session.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.inner}>
          <ThemedText>Loading…</ThemedText>
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
      <SafeAreaView style={styles.inner} edges={['bottom', 'left', 'right']}>
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
                (Coming soon — toggle is local only.)
              </ThemedText>
            </View>
            <Switch value={pushEnabled} onValueChange={setPushEnabled} />
          </View>
        </ThemedView>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <ThemedText style={{ color: '#E5484D', fontWeight: '600' }}>Sign out</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four, gap: Spacing.three },
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
