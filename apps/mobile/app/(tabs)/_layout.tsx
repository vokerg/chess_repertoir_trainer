import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/theme/colors';

type IconName = keyof typeof Ionicons.glyphMap;

const icons: Record<string, IconName> = {
  library: 'library-outline',
  games: 'game-controller-outline',
  'opening-analysis': 'analytics-outline',
  review: 'podium-outline',
  settings: 'settings-outline',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surfaceStrong, borderTopColor: colors.border },
        headerShown: false,
        tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] ?? 'ellipse-outline'} color={color} size={size} />,
      })}
    >
      <Tabs.Screen name="library" options={{ title: 'Study' }} />
      <Tabs.Screen name="games" options={{ title: 'Games' }} />
      <Tabs.Screen name="opening-analysis" options={{ title: 'Opening' }} />
      <Tabs.Screen name="review" options={{ title: 'Review' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
