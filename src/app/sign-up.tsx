import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { signUpWithPassword } from '@/features/auth/auth-actions';
import { useSession } from '@/features/auth/SessionProvider';
import { useTheme } from '@/hooks/use-theme';

const MIN_PASSWORD_LENGTH = 8;

export default function SignUpScreen() {
  const session = useSession();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (session.status === 'ready' && session.session) {
    return <Redirect href="/" />;
  }

  async function handleSignUp() {
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter your work email.');
      return;
    }
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
      const { needsConfirmation } = await signUpWithPassword(email, password);
      if (needsConfirmation) {
        Alert.alert(
          'Confirm your email',
          'Check your inbox to verify your account, then sign in.',
        );
        router.replace('/sign-in');
      }
    } catch (err) {
      Alert.alert(
        'Sign-up failed',
        err instanceof Error ? err.message : 'Something went wrong',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = [styles.input, { color: theme.text }];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}
        >
          <ThemedText type="title">Create account</ThemedText>
          <ThemedText themeColor="textSecondary">
            Sign up with your work email and a password.
          </ThemedText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor={theme.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            style={inputStyle}
            editable={!submitting}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password (8+ characters)"
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
            placeholder="Confirm password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            style={inputStyle}
            editable={!submitting}
            onSubmitEditing={handleSignUp}
          />
          <Pressable
            onPress={handleSignUp}
            disabled={submitting}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
              submitting && styles.disabled,
            ]}
          >
            <ThemedText style={styles.buttonText}>
              {submitting ? 'Creating account…' : 'Create account'}
            </ThemedText>
          </Pressable>
          <ThemedText themeColor="textSecondary" style={styles.footnote}>
            Already have an account?{' '}
            <Link href="/sign-in" asChild>
              <ThemedText type="linkPrimary">Sign in</ThemedText>
            </Link>
          </ThemedText>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four, justifyContent: 'center' },
  form: { gap: Spacing.three },
  input: {
    backgroundColor: 'rgba(127,127,127,0.12)',
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: '600' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  footnote: { marginTop: Spacing.two },
});
