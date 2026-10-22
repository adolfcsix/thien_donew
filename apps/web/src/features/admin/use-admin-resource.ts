'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Latest read wins; callers render an empty state only after a successful read. */
export function useAdminResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError('');
    try {
      const result = await load(controller.signal);
      if (controller.signal.aborted) return false;
      setData(result);
      return true;
    } catch (reason) {
      if (!controller.signal.aborted) setError((reason as Error).message);
      return false;
    } finally {
      if (active.current === controller && !controller.signal.aborted) setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    void reload();
    return () => active.current?.abort();
  }, [reload]);
  return {
    data,
    loading,
    error,
    reload
  };
}
