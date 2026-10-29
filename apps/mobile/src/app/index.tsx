import { Redirect } from 'expo-router';
import { useSession } from '@/lib/auth';

export default function Index() {
  // A restored session must not land on the protected login route: that loops into a blank screen.
  const { user } = useSession();
  return <Redirect href={user ? '/(app)/(tabs)' : '/(auth)/login'} />;
}
