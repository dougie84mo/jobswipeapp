import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

// Bottom tab navigator.
//
// Home is the landing dashboard. Connections is the integrations list the
// swipe flow starts from. Candidates is the recruiter's shortlist — every
// positive swipe (Save / Boost) across all sources. Settings is a grouped
// options list (profile, sources, preferences, sign out).
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
        name="candidates"
        options={{
          title: 'Candidates',
          tabBarLabel: 'Candidates',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
