import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { Session } from '@supabase/supabase-js';

import { supabase } from '../services/supabase';
import { signOut as authSignOut } from '../services/auth';

export type SetupStage = 'loading' | 'unauthenticated' | 'needs_profile' | 'needs_circle' | 'complete';

interface AuthContextValue {
  session: Session | null;
  setupStage: SetupStage;
  recheckSetup: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  setupStage: 'loading',
  recheckSetup: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [setupStage, setSetupStage] = useState<SetupStage>('loading');

  const checkSetup = useCallback(async (sess: Session) => {
    const { data: profile } = await supabase
      .from('user_profile')
      .select('display_name')
      .eq('id', sess.user.id)
      .maybeSingle();

    if (!profile || !profile.display_name) {
      setSetupStage('needs_profile');
      return;
    }

    const { data: member } = await supabase
      .from('care_circle_member')
      .select('circle_id')
      .eq('user_id', sess.user.id)
      .maybeSingle();

    setSetupStage(member ? 'complete' : 'needs_circle');
  }, []);

  const recheckSetup = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession) await checkSetup(currentSession);
  }, [checkSetup]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) checkSetup(initialSession);
      else setSetupStage('unauthenticated');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) checkSetup(newSession);
      else setSetupStage('unauthenticated');
    });

    return () => subscription.unsubscribe();
  }, [checkSetup]);

  return (
    <AuthContext.Provider value={{ session, setupStage, recheckSetup, signOut: authSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
