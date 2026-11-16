/**
 * Loads data for a component and tracks loading, success and failure. Results from an
 * outdated loader are ignored, so fast typing or quick navigation never shows stale data.
 */
import { useCallback, useEffect, useState } from 'react';
import { RequestFailed } from './api.js';

/** State of a remote value. */
export type Remote<T> =
  { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string };

const LOADING = { status: 'loading' } as const;
const GENERIC = 'Something went wrong. Please try again.';

interface Settled<T> {
  load: () => Promise<T>;
  attempt: number;
  value: Remote<T>;
}

/** Runs `load` (memoise it with useCallback) and returns its state plus a retry function. */
export function useRemote<T>(load: () => Promise<T>): [Remote<T>, () => void] {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    let live = true;
    const settle = (value: Remote<T>) => {
      if (live) setSettled({ load, attempt, value });
    };
    load().then(
      (data) => {
        settle({ status: 'ready', data });
      },
      (error: unknown) => {
        settle({
          status: 'error',
          message: error instanceof RequestFailed ? error.message : GENERIC,
        });
      },
    );
    return () => {
      live = false;
    };
  }, [load, attempt]);

  const retry = useCallback(() => {
    setAttempt((count) => count + 1);
  }, []);
  const current = settled?.load === load && settled.attempt === attempt ? settled.value : LOADING;
  return [current, retry];
}
