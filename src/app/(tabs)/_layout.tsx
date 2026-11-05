import { Tabs } from 'expo-router/js-tabs';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

function TabIcon({ name, color, size }: { name: SymbolViewProps['name']; color: ColorValue; size: number }) {
  return <SymbolView name={name} tintColor={color} size={size} />;
}

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: 12, fontWeight: 600 },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { fontSize: 20, fontWeight: 700 },
        headerTitleAlign: 'left',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: 'Manage',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
