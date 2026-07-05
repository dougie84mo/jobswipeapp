import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import {
  useRecruiterProfile,
  useUpdateRecruiterProfile,
} from '@/features/profile/queries';
import { useTheme } from '@/hooks/use-theme';

// Edit profile — pushed from the Settings tab's Profile row.

export default function EditProfileScreen() {
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

  useEffect(() => {
    if (!dirty && profileQuery.data) {
      setDisplayName(profileQuery.data.display_name ?? '');
      setOrgName(profileQuery.data.org_name ?? '');
    }
  }, [profileQuery.data, dirty]);

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
      Alert.alert(
        'Save failed',
        err instanceof Error ? err.message : 'Unknown error',
      );
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
              <ThemedText type="smallBold">Account email</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {email}
              </ThemedText>
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
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
