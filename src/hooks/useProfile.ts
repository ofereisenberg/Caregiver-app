import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { getProfile } from '../services/profile';
import { Tables } from '../types/database';

type UserProfile = Tables<'user_profile'>;

interface UseProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useProfile(): UseProfileResult {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    const { data, error: fetchError } = await getProfile(session.user.id);
    if (fetchError) setError(fetchError);
    else setProfile(data);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, loading, error, reload: load };
}
