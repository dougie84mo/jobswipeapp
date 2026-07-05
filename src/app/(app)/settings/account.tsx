import { useState } from 'react';
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
import { updatePassword } from '@/features/auth/auth-actions';
import { useSession } from '@/features/auth/SessionProvider';
import { useTheme } from '@/hooks/use-theme';

const MIN_PASSWORD_LENGTH = 8;

// Account settings — pushed from the Settings tab. Credentials only
// (email + password); in-app identity (name / org) lives on /settings/profile.

export default function AccountSettingsScreen() {
  const session = useSession();
  const theme = useTheme();
  const email =
    session.status === 'ready' && session.session
      ? session.session.user.email
      : undefined;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleChangePassword() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert(
        'Weak password',
        `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords don’t match', 'Re-enter the same password.');
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      setPassword('');
      setConfirm('');
      Alert.alert('Password updated', 'Use the new password next time you sign in.');
    } catch (err) {
      Alert.alert('Could not update password', toMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = [styles.input, { color: theme.text }];
  const canSubmit = password.length > 0 && confirm.length > 0 && !submitting;

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
              <ThemedText type="smallBold">Email</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {email}
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.section}>
              <ThemedText type="smallBold">Change password</ThemedText>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="New password (8+ characters)"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                style={inputStyle}
                editable={!submitting}
              />
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Confirm new password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                style={inputStyle}
                editable={!submitting}
                onSubmitEditing={handleChangePassword}
              />
              <Pressable
                onPress={handleChangePassword}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  !canSubmit && styles.disabled,
                ]}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {submitting ? 'Updating…' : 'Update password'}
                </ThemedText>
              </Pressable>
              <ThemedText type="small" themeColor="textSecondary">
                Forgot your current password? Sign out and use “Forgot
                password?” on the sign-in screen instead.
              </ThemedText>
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
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
  primaryButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  primaryButtonText: { color: 'white', fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
