import { Alert, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/auth-actions';
import { useSession } from '@/features/auth/SessionProvider';

export default function HomeScreen() {
  const session = useSession();
  const email =
    session.status === 'ready' && session.session ? session.session.user.email : undefined;

  async function handleSignOut() {
    try {
      await signOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-out failed';
      Alert.alert('Sign-out failed', message);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.inner} edges={['bottom', 'left', 'right']}>
        <ThemedText type="title">Welcome</ThemedText>
        {email ? (
          <ThemedText themeColor="textSecondary">Signed in as {email}</ThemedText>
        ) : null}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">Coming soon</ThemedText>
          <ThemedText>
            • Connect your ATS (Greenhouse, Lever, Workable, …){'\n'}
            • Pick a requisition to source against{'\n'}
            • Swipe through candidates and push outcomes back to the ATS
          </ThemedText>
        </ThemedView>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <ThemedText themeColor="textSecondary">Sign out</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four, gap: Spacing.four },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  signOut: {
    padding: Spacing.three,
    alignSelf: 'flex-start',
  },
  pressed: { opacity: 0.7 },
});
