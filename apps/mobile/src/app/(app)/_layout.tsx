import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="movements/index" options={{ title: 'Movimientos', headerShown: true }} />
      <Stack.Screen name="movements/[slug]" options={{ title: 'Movimiento', headerShown: true }} />
      <Stack.Screen name="records/new" options={{ title: 'Registrar marca', headerShown: true }} />
      <Stack.Screen
        name="records/[movementSlug]"
        options={{ title: 'Historial', headerShown: true }}
      />
      <Stack.Screen
        name="workouts/new"
        options={{ title: 'Nuevo entrenamiento', headerShown: true }}
      />
      <Stack.Screen name="workouts/[id]" options={{ title: 'Entrenamiento', headerShown: true }} />
    </Stack>
  );
}
