// App-level error boundary. A throw during render anywhere in the (app) tree —
// e.g. an unknown provider reaching getAdapter(), or a bad enum index — would
// otherwise white-screen production. This catches it and offers a reset.
import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

interface Props {
  children: ReactNode;
  // Called when the user taps "Try again" (after clearing the error). The app
  // layout uses this to navigate home so the throwing screen unmounts.
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // Single surfacing point — wire crash reporting here later.
    console.error('App error boundary caught:', error.message);
  }

  private reset = (): void => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Something went wrong</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.message}>
          The app hit an unexpected error. You can try again.
        </ThemedText>
        <Pressable
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <ThemedText style={styles.buttonText}>Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  message: { textAlign: 'center' },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 999,
    backgroundColor: '#208AEF',
  },
  pressed: { opacity: 0.85 },
  buttonText: { color: 'white', fontWeight: '700' },
});
