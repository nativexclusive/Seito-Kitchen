import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { BackendNotice, ErrorText } from '../../components/BackendNotice';
import { Button, Field, Screen, ScreenTitle, T } from '../../components/ui';
import { errorMessage, supabase } from '../../lib/supabase';
import { useAuth } from '../../state/auth';
import { colors } from '../../theme';

export default function ChefLogin() {
  const { session, isStaff } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session && isStaff) return <Redirect href="/chef" />;

  const signIn = async () => {
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(errorMessage(err));
  };

  return (
    <Screen>
      <ScreenTitle title="" fallback="/" />
      <T size={26} weight={800} style={{ marginTop: -12 }} accessibilityRole="header">
        Chef sign in
      </T>
      <T color={colors.muted} lineHeight={1.5}>
        For Mama and kitchen staff. Customers don't need an account to order.
      </T>
      <BackendNotice />
      {session && !isStaff ? (
        <>
          <ErrorText message="This account isn't set up as chef or staff. Ask the owner to add it (see README → Add the chef account)." />
          <Button label="Sign Out" variant="outline" size={15} onPress={() => supabase.auth.signOut()} />
        </>
      ) : (
        <>
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="username" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={signIn} />
          <ErrorText message={error} />
          <Button label="Sign In" loading={busy} onPress={signIn} />
        </>
      )}
      <Button label="Back to customer app" variant="link" size={14} onPress={() => router.replace('/')} />
    </Screen>
  );
}
