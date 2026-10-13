import { useCallback, useEffect, useState } from 'react';
import type { Site } from '#shared/schema';
import { api, type History } from './api';

const noHistory: History = { undo: [], redo: [] };

/**
 * Holds the site data and its undo history. `run` performs an API call, records
 * any error, then reloads from the server so the UI always shows what was saved.
 */
export function useSite() {
  const [site, setSite] = useState<Site | null>(null);
  const [history, setHistory] = useState<History>(noHistory);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [s, h] = await Promise.all([api.getSite(), api.history().catch(() => noHistory)]);
    setSite(s);
    setHistory(h);
  }, []);

  useEffect(() => {
    reload().catch((e: Error) => setError(`Could not load site: ${e.message}`));
  }, [reload]);

  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
      setError(null);
      try {
        return await action();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        await reload().catch(() => {});
      }
    },
    [reload],
  );

  return { site, history, error, setError, run };
}