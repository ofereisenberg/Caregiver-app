import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { getUserCircles } from '../services/circle';
import { supabase } from '../services/supabase';
import { Tables } from '../types/database';

type CareCircle = Tables<'care_circle'>;

export interface CircleWithMemberCount extends CareCircle {
  memberCount: number;
}

interface UseUserCirclesResult {
  circles: CircleWithMemberCount[];
  loading: boolean;
  refresh: () => void;
}

export function useUserCircles(): UseUserCirclesResult {
  const { session } = useAuth();
  const [circles, setCircles] = useState<CircleWithMemberCount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    setLoading(true);

    const { data: userCircles } = await getUserCircles(session.user.id);
    if (!userCircles?.length) {
      setCircles([]);
      setLoading(false);
      return;
    }

    const circleIds = userCircles.map((c) => c.id);
    const { data: members } = await supabase
      .from('care_circle_member')
      .select('circle_id')
      .in('circle_id', circleIds);

    const countMap = new Map<string, number>();
    (members ?? []).forEach((m) => {
      countMap.set(m.circle_id, (countMap.get(m.circle_id) ?? 0) + 1);
    });

    setCircles(userCircles.map((c) => ({ ...c, memberCount: countMap.get(c.id) ?? 0 })));
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => { load(); }, [load]);

  return { circles, loading, refresh: load };
}
