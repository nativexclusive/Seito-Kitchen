import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  /** true when the signed-in user has a row in public.users (chef or staff). */
  isStaff: boolean;
  ready: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, isStaff: false, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, isStaff: false, ready: !isSupabaseConfigured });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const resolve = async (session: Session | null) => {
      let isStaff = false;
      if (session) {
        const { data } = await supabase.rpc('is_staff');
        isStaff = data === true;
      }
      setState({ session, isStaff, ready: true });
    };
    supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer so we don't call Supabase from inside its own auth callback.
      setTimeout(() => resolve(session), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
