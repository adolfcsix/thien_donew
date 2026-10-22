'use client';

import { useCallback, useState } from 'react';
import { usePendingOperation } from '@/lib/use-pending-operation';

/** Serializes one editor's actions, including confirmation and file reading. */
export function useAdminTask() {
  const operation = usePendingOperation();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const {
    begin,
    finish,
    isPending
  } = operation;
  const run = useCallback(async (work: (signal: AbortSignal) => Promise<string | void>) => {
    const controller = begin();
    if (!controller) return false;
    setError('');
    setNotice('');
    try {
      const message = await work(controller.signal);
      if (controller.signal.aborted) return false;
      if (message) setNotice(message);
      return true;
    } catch (reason) {
      if (!controller.signal.aborted) setError((reason as Error).message);
      return false;
    } finally {
      finish(controller);
    }
  }, [begin, finish]);
  return {
    pending: operation.pending,
    isPending,
    error,
    notice,
    setError,
    setNotice,
    run
  };
}
