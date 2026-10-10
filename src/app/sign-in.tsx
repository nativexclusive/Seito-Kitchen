import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { BackendNotice, ErrorText } from '../components/BackendNotice';
import { Button, Field, Notice, Screen, ScreenTitle, T } from '../components/ui';
import { errorMessage, supabase } from '../lib/supabase';
import { useAuth } from '../state/auth';
import { colors } from '../theme';

function toE164(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.length === 10 ? `+1${d}` : `+${d}`;
}

export default function SignIn() {
  const { session } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setError(null);
    if (phone.replace(/\D/g, '').length < 10) return setError('Please enter your phone number.');
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOtp({ phone: toE164(phone) });
    setBusy(false);
    if (err) setError(errorMessage(err));
    else setSent(true);
  };

  const verify = async () => {
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({ phone: toE164(phone), token: code.trim(), type: 'sms' });
    setBusy(false);
    if (err) setError(errorMessage(err));
    else router.replace('/menu');
  };

  return (
    <Screen>
      <ScreenTitle title="" />
      <T size={26} weight={800} style={{ marginTop: -12 }} accessibilityRole="header">
        {session ? "You're signed in" : 'Sign in'}
      </T>
      <BackendNotice />
      {session ? (
        <>
          <T color={colors.muted} lineHeight={1.5}>
            Your details and orders are saved to your account.
          </T>
          <Button label="View This Week's Menu" onPress={() => router.replace('/menu')} />
          <Button label="Sign Out" variant="outline" size={15} onPress={() => supabase.auth.signOut()} />
        </>
      ) : (
        <>
          <T color={colors.muted} lineHeight={1.5}>
            We'll text you a code. Signing in saves your details and order history so reordering takes seconds.
          </T>
          <Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="(202) 555-0134" style={{ height: 50, fontSize: 16 }} />
          {sent ? (
            <>
              <Notice>Code sent. Enter it below.</Notice>
              <Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} />
              <Button label="Verify & Sign In" loading={busy} onPress={verify} />
            </>
          ) : (
            <Button label="Send Code" loading={busy} onPress={sendCode} />
          )}
          <ErrorText message={error} />
          <Button label="Continue as Guest" variant="outline" size={15} onPress={() => router.replace('/menu')} />
        </>
      )}
      <Pressable accessibilityRole="link" onPress={() => router.push('/chef/login')} style={{ alignSelf: 'center', paddingVertical: 12 }}>
        <T size={13} weight={600} color={colors.muted} style={{ textDecorationLine: 'underline' }}>
          Chef & staff sign in
        </T>
      </Pressable>
    </Screen>
  );
}
