import { Tabs } from 'expo-router';

// Bottom tab navigator.
//
// Home is the landing dashboard — who's signed in, how the workflow goes,
// what they should do next. Connections is the integrations list the
// swipe flow starts from. Profile holds account settings and the
// Connect ATS entry-point button.
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
          title: 'Recruit Swipe',
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="connections"
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
