import { View } from 'react-native';

import { isSupabaseConfigured } from '../lib/supabase';
import { colors } from '../theme';
import { T } from './ui';

/** Shown in place of data when EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY are not set. */
export function BackendNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <View style={{ padding: 14, borderRadius: 12, backgroundColor: '#FDEBC8', gap: 4 }}>
      <T size={14} weight={700} color="#6B4700">
        Not connected to a database
      </T>
      <T size={13} color="#5C3D00" lineHeight={1.5}>
        Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (see README), then restart the app.
      </T>
    </View>
  );
}

export function ErrorText({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={{ padding: 12, borderRadius: 12, backgroundColor: '#FDE3E2' }}>
      <T size={13} weight={600} color={colors.dangerDeep} lineHeight={1.45}>
        {message}
      </T>
    </View>
  );
}
