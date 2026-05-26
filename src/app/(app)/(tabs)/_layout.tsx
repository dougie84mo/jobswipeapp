import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

// Bottom tab navigator.
//
// Home is the landing dashboard. Connections is the integrations list the
// swipe flow starts from. Profile holds account settings and the
// Connect ATS entry-point button.
//
// Detail screens (integration/[id]/*, swipe/[reqId], connect) live in the
// parent (app) Stack so pushing to them hides the tab bar.
//
// Icons use Ionicons for a matched set; the outline variant renders when
// the tab is inactive and the filled variant when active so the recruiter
// gets a clear focused-state signal on iOS and Android.

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: '#208AEF',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recruit Swipe',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: 'Connections',
          tabBarLabel: 'Connections',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'link' : 'link-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
