import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/features/auth/SessionProvider';

export default function AppLayout() {
  const session = useSession();

  if (session.status === 'loading') {
    return null;
  }

  if (session.status === 'unconfigured' || !session.session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="connect" options={{ title: 'Connect ATS' }} />
      <Stack.Screen name="integration/[id]/index" options={{ title: 'Integration' }} />
      <Stack.Screen name="integration/[id]/settings" options={{ title: 'Swipe actions' }} />
      <Stack.Screen name="integration/[id]/activity" options={{ title: 'Activity' }} />
      <Stack.Screen name="swipe/[reqId]" options={{ title: 'Swipe' }} />
    </Stack>
  );
}
