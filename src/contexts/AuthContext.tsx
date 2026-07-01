import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { Session } from '@supabase/supabase-js';

import { supabase } from '../services/supabase';
import { signOut as authSignOut } from '../services/auth';
import { getUserCircles, setActiveCircle } from '../services/circle';
import { registerPushToken } from '../services/notifications';
import i18n, { AppLanguage, getPendingLanguage, setPendingLanguage } from '../i18n';
import { updateLanguage } from '../services/profile';

export type SetupStage =
  | 'loading'
  | 'unauthenticated'
  | 'needs_profile'
  | 'needs_circle'
  | 'needs_active_circle'
  | 'complete';

interface AuthContextValue {
  session: Session | null;
  setupStage: SetupStage;
  activeCircleId: string | null;
  switchCircle: (circleId: string) => Promise<void>;
  recheckSetup: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  setupStage: 'loading',
  activeCircleId: null,
  switchCircle: async () => {},
  recheckSetup: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [setupStage, setSetupStage] = useState<SetupStage>('loading');
  const [activeCircleId, setActiveCircleIdState] = useState<string | null>(null);

  const checkSetup = useCallback(async (sess: Session) => {
    const { data: profile } = await supabase
      .from('user_profile')
      .select('display_name, active_circle_id, language')
      .eq('id', sess.user.id)
      .maybeSingle();

    if (!profile || !profile.display_name) {
      // New user: if they picked a language on the picker screen, sync it now.
      const pending = getPendingLanguage();
      if (pending) {
        await updateLanguage(sess.user.id, pending);
        await i18n.changeLanguage(pending);
        setPendingLanguage(null);
      }
      setSetupStage('needs_profile');
      return;
    }

    // Returning user: apply their saved language preference.
    const savedLang = (profile.language ?? 'de') as AppLanguage;
    if (i18n.language !== savedLang) {
      await i18n.changeLanguage(savedLang);
    }

    const { data: circles } = await getUserCircles(sess.user.id);

    if (!circles || circles.length === 0) {
      setSetupStage('needs_circle');
      return;
    }

    const storedId = profile.active_circle_id;
    const isValid = storedId && circles.some((c) => c.id === storedId);

    if (isValid) {
      setActiveCircleIdState(storedId);
      setSetupStage('complete');
      registerPushToken(sess.user.id);
    } else if (circles.length === 1) {
      await setActiveCircle(sess.user.id, circles[0].id);
      setActiveCircleIdState(circles[0].id);
      setSetupStage('complete');
      registerPushToken(sess.user.id);
    } else {
      setSetupStage('needs_active_circle');
    }
  }, []);

  const recheckSetup = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession) await checkSetup(currentSession);
  }, [checkSetup]);

  const switchCircle = useCallback(async (circleId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await setActiveCircle(user.id, circleId);
    setActiveCircleIdState(circleId);
  }, []);

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
    <AuthContext.Provider value={{ session, setupStage, activeCircleId, switchCircle, recheckSetup, signOut: authSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
