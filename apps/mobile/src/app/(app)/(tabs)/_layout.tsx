import { Tabs } from 'expo-router';
import { colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.accent,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarLabel: 'Inicio' }} />
      <Tabs.Screen name="train" options={{ title: 'Entrenar', tabBarLabel: 'Entrenar' }} />
      <Tabs.Screen name="history" options={{ title: 'Historial', tabBarLabel: 'Historial' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progreso', tabBarLabel: 'Progreso' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarLabel: 'Perfil' }} />
    </Tabs>
  );
}
