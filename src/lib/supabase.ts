import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// With no backend configured the app still renders and shows a setup notice
// (see BackendNotice) instead of crashing.
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-anon-key', {
  auth: {
    storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Turn Supabase/Postgres errors into a sentence we can show to a customer or the chef.
export function errorMessage(err: unknown): string {
  if (!isSupabaseConfigured) return 'The app is not connected to its database yet.';
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    const msg = err.message;
    if (/Failed to fetch|Network request failed/i.test(msg)) return 'Could not reach Mama\'s Kitchen. Check your connection and try again.';
    return msg;
  }
  return 'Something went wrong. Please try again.';
}
