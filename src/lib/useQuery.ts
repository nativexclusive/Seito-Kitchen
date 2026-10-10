import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from './supabase';

/**
 * Minimal data loader: runs `fn` on mount and whenever `key` changes, and again when
 * the screen regains focus. `reload()` refetches without clearing the current data.
 */
export function useQuery<T>(fn: () => Promise<T>, key: unknown[] = [], opts: { refetchOnFocus?: boolean; pollMs?: number } = {}) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const run = useCallback(async () => {
    const id = ++seq.current;
    try {
      const result = await fnRef.current();
      if (id === seq.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (id === seq.current) setError(errorMessage(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, key);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false;
      else if (opts.refetchOnFocus !== false) run();
      if (!opts.pollMs) return;
      const t = setInterval(run, opts.pollMs);
      return () => clearInterval(t);
    }, [run, opts.refetchOnFocus, opts.pollMs]),
  );

  return { data, error, loading, reload: run, setData };
}
