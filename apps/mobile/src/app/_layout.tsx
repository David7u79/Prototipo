import '@/global.css';
import { Stack } from 'expo-router';
import { SessionProvider, useSession } from '@/lib/auth';

function RootNavigator() {
  const { ready, user } = useSession();

  // Keep the native splash visible until the secure session restoration ends.
  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(user)}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}
