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
      <Stack.Screen name="index" options={{ title: 'Recruit Swipe' }} />
      <Stack.Screen name="connect" options={{ title: 'Connect ATS' }} />
      <Stack.Screen name="integration/[id]" options={{ title: 'Integration' }} />
    </Stack>
  );
}
