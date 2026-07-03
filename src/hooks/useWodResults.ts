import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface WodResult {
  id: string;
  class_id: string;
  athlete_id: string;
  result_text: string;
  rx: boolean;
  notes: string | null;
  created_at: string;
  athlete_name: string;
  athlete_avatar: string | null;
  athlete_initials: string;
  athlete_color: string;
  sort_value: number;
}

// Detects result type from text and returns a sort key (lower = shown first).
// Times "12:34" sort ascending (lower is better).
// Rounds/reps "5+12", weight "100kg", plain numbers sort descending (higher is better).
function parseSortValue(text: string): number {
  const t = text.trim();
  const timeMatch = t.match(/^(\d+):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const hasHours = !!timeMatch[3];
    const h = hasHours ? parseInt(timeMatch[1]) : 0;
    const m = hasHours ? parseInt(timeMatch[2]) : parseInt(timeMatch[1]);
    const s = hasHours ? parseInt(timeMatch[3]) : parseInt(timeMatch[2]);
    return h * 3600 + m * 60 + s;
  }
  const rpMatch = t.match(/^(\d+)\s*\+\s*(\d+)/);
  if (rpMatch) return -(parseInt(rpMatch[1]) * 1000 + parseInt(rpMatch[2]));
  const weightMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:kg|lb|lbs|kgs)/i);
  if (weightMatch) return -parseFloat(weightMatch[1]);
  const numMatch = t.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) return -parseFloat(numMatch[1]);
  return 0;
}

export function useWodResults(classId: string | null) {
  const [results, setResults] = useState<WodResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    const { data } = await supabase
      .from('wod_results')
      .select('*')
      .eq('class_id', classId);

    if (data) {
      // RLS on `profiles` only lets you read your own row, so a plain
      // embedded join here returned null for every rival's name/avatar.
      const athleteIds = [...new Set((data as any[]).map(r => r.athlete_id))];
      const { data: profilesData } = athleteIds.length
        ? await supabase.rpc('public_profiles', { p_ids: athleteIds })
        : { data: [] as any[] };
      const profileMap = new Map<string, any>((profilesData ?? []).map((p: any) => [p.id, p]));

      const mapped: WodResult[] = (data as any[]).map(r => {
        const p = profileMap.get(r.athlete_id);
        return {
          ...r,
          athlete_name: p?.name ?? 'Atleta',
          athlete_avatar: p?.avatar_url ?? null,
          athlete_initials: p?.avatar_initials || (p?.name ?? 'A').slice(0, 2).toUpperCase(),
          athlete_color: p?.avatar_color ?? '#f95c00',
          sort_value: parseSortValue(r.result_text),
        };
      });

      // RX primero, luego por valor de resultado
      mapped.sort((a, b) => {
        if (a.rx !== b.rx) return a.rx ? -1 : 1;
        return a.sort_value - b.sort_value;
      });

      setResults(mapped);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    fetch();
    if (!classId) return;
    const ch = supabase
      .channel(`wod_results:${classId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wod_results', filter: `class_id=eq.${classId}` }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [classId, fetch]);

  const upsertResult = async (
    athleteId: string,
    resultText: string,
    rx: boolean,
    notes?: string,
  ) => {
    if (!classId) return { error: 'no class' };
    return supabase.from('wod_results').upsert(
      { class_id: classId, athlete_id: athleteId, result_text: resultText.trim(), rx, notes: notes?.trim() || null },
      { onConflict: 'class_id,athlete_id' },
    );
  };

  const deleteResult = async (athleteId: string) => {
    if (!classId) return;
    return supabase.from('wod_results').delete().eq('class_id', classId).eq('athlete_id', athleteId);
  };

  return { results, loading, refresh: fetch, upsertResult, deleteResult };
}
