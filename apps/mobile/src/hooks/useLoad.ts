import { useCallback, useEffect, useState } from "react";

interface LoadState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Minimal data-fetching hook (loading/error/reload) — avoids a data lib for Phase 3. */
export function useLoad<T>(loader: () => Promise<T>, deps: readonly unknown[] = []): LoadState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // `deps` is an intentional escape hatch so callers control when the loader re-runs.
  const run = useCallback(loader, deps);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    run()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Something went wrong");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [run]);

  useEffect(load, [load]);

  return { data, loading, error, reload: load };
}
