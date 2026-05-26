import { Tabs } from 'expo-router';

// Bottom tab navigator for the primary destinations: the recruiter's
// existing connections (where the swipe flow starts) and their profile.
// Adding a new connection is reached via a button on Profile so the tab
// bar stays focused on the every-day workflow rather than the one-time
// setup action.
//
// Detail screens (integration/[id]/*, swipe/[reqId], connect) live in the
// parent (app) Stack so pushing to them hides the tab bar.

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Connections',
          tabBarLabel: 'Connections',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}
