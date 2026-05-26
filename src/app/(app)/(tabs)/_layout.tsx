import { Tabs } from 'expo-router';

// Bottom tab navigator for the three primary destinations. Detail screens
// (integration/[id]/*, swipe/[reqId]) live in the parent (app) Stack so
// pushing to them hides the tab bar — useful for the swipe deck where we
// want full screen.

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
        name="connect"
        options={{
          title: 'Connect ATS',
          tabBarLabel: 'Connect',
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
