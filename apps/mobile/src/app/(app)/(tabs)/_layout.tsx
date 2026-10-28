import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/constants/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

function tabIcon(name: SymbolName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <SymbolView name={name} tintColor={color} size={size} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarLabel: 'Inicio', tabBarIcon: tabIcon({ ios: 'house', android: 'home' }) }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: 'Entrenar',
          tabBarLabel: 'Entrenar',
          tabBarIcon: tabIcon({ ios: 'dumbbell', android: 'fitness_center' }),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarLabel: 'Historial',
          tabBarIcon: tabIcon({ ios: 'clock.arrow.circlepath', android: 'history' }),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Marcas',
          tabBarLabel: 'Marcas',
          tabBarIcon: tabIcon({ ios: 'trophy', android: 'emoji_events' }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarLabel: 'Perfil', tabBarIcon: tabIcon({ ios: 'person', android: 'person' }) }}
      />
    </Tabs>
  );
}
