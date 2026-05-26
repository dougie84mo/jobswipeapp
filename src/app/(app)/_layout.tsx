import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from '@/features/auth/SessionProvider';
import { registerPushToken } from '@/features/notifications/register';

export default function AppLayout() {
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : null;

  // Re-register the device's push token on every sign-in. The RPC is
  // idempotent (UPSERT on expo_push_token) and silently no-ops in Expo Go
  // where getExpoPushTokenAsync isn't available — see register.ts.
  useEffect(() => {
    if (!userId) return;
    void registerPushToken();
  }, [userId]);

  if (session.status === 'loading') {
    return null;
  }

  if (session.status === 'unconfigured' || !session.session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="connect" options={{ title: 'Connect a source' }} />
      <Stack.Screen name="integration/[id]/index" options={{ title: 'Integration' }} />
      <Stack.Screen name="integration/[id]/settings" options={{ title: 'Swipe actions' }} />
      <Stack.Screen name="integration/[id]/activity" options={{ title: 'Activity' }} />
      <Stack.Screen name="swipe/[reqId]" options={{ title: 'Swipe' }} />
    </Stack>
  );
}
