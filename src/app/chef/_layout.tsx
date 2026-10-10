import { Redirect, Stack, useSegments } from 'expo-router';

import { Loading, Screen } from '../../components/ui';
import { useAuth } from '../../state/auth';
import { colors } from '../../theme';

// Everything under /chef requires a signed-in chef or staff member (public.users),
// except the login screen itself. The database enforces the same rule with RLS.
export default function ChefLayout() {
  const { session, isStaff, ready } = useAuth();
  const segments = useSegments();
  const onLogin = segments[segments.length - 1] === 'login';

  if (!ready) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  if (!onLogin && (!session || !isStaff)) return <Redirect href="/chef/login" />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />;
}
