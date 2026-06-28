import { useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { getCircleMembers, CircleMemberWithName } from '../services/circle';
import { supabase } from '../services/supabase';
import { Tables } from '../types/database';

type CareCircle = Tables<'care_circle'>;

interface UseCircleResult {
  circle: CareCircle | null;
  members: CircleMemberWithName[];
  loading: boolean;
  error: string | null;
}

export function useCircle(): UseCircleResult {
  const { activeCircleId } = useAuth();
  const [circle, setCircle] = useState<CareCircle | null>(null);
  const [members, setMembers] = useState<CircleMemberWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCircleId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data: circleData, error: circleError } = await supabase
        .from('care_circle')
        .select('*')
        .eq('id', activeCircleId!)
        .single();

      if (cancelled) return;

      if (circleError || !circleData) {
        setError(circleError?.message ?? 'Circle not found.');
        setLoading(false);
        return;
      }

      setCircle(circleData);

      const { data: membersData, error: membersError } = await getCircleMembers(circleData.id);

      if (cancelled) return;

      if (!membersError) setMembers(membersData);
      setLoading(false);
    }

    load();

    return () => { cancelled = true; };
  }, [activeCircleId]);

  return { circle, members, loading, error };
}
