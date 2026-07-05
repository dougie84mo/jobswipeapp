import { Link, Redirect } from 'expo-router';
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
import {
  resendSignupCode,
  signUpWithPassword,
  verifySignupCode,
} from '@/features/auth/auth-actions';
import { useSession } from '@/features/auth/SessionProvider';
import { useTheme } from '@/hooks/use-theme';

const MIN_PASSWORD_LENGTH = 8;

type Mode = 'form' | 'verify';

export default function SignUpScreen() {
  const session = useSession();
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
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
        // The confirmation email carries a 6-digit code (never a link — the
        // app has no deep linking), verified right here on this screen.
        setMode('verify');
        Alert.alert('Confirm your email', `We sent a 6-digit code to ${email.trim()}.`);
      }
      // No confirmation required → signUp returned a session and the
      // Redirect above navigates into the app on the next render.
    } catch (err) {
      Alert.alert('Sign-up failed', toMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    if (!code.trim()) {
      Alert.alert('Code required', 'Enter the 6-digit code from your email.');
      return;
    }
    setSubmitting(true);
    try {
      // Success creates a session; the Redirect above takes over.
      await verifySignupCode(email, code);
    } catch (err) {
      Alert.alert('Invalid code', toMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendCode() {
    setSubmitting(true);
    try {
      await resendSignupCode(email);
      Alert.alert('Code sent', `Check ${email.trim()} for a new 6-digit code.`);
    } catch (err) {
      Alert.alert('Could not resend code', toMessage(err));
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

          {mode === 'form' && (
            <>
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
            </>
          )}

          {mode === 'verify' && (
            <>
              <ThemedText themeColor="textSecondary">
                Enter the 6-digit code we sent to{' '}
                <ThemedText>{email.trim()}</ThemedText>.
              </ThemedText>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
                style={inputStyle}
                editable={!submitting}
                onSubmitEditing={handleVerifyCode}
              />
              <Pressable
                onPress={handleVerifyCode}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.pressed,
                  submitting && styles.disabled,
                ]}
              >
                <ThemedText style={styles.buttonText}>
                  {submitting ? 'Verifying…' : 'Verify code'}
                </ThemedText>
              </Pressable>
              <Pressable onPress={handleResendCode} disabled={submitting}>
                <ThemedText type="linkPrimary">Resend code</ThemedText>
              </Pressable>
            </>
          )}
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
