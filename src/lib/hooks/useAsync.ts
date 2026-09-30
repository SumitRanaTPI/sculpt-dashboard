"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";

export type AsyncState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "error"; data: null; error: string };

export function messageFor(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiError) return err.message;
  return fallback;
}

/**
 * Run an async loader on mount (and whenever `deps` change) and expose
 * loading / ready / error plus `reload` and a local `setData`.
 *
 * `reload(true)` refreshes in the background: existing data stays on screen
 * and a failed refresh keeps the old data instead of showing an error.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading", data: null, error: null });
  const runId = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const run = useCallback(async (silent = false) => {
    const id = ++runId.current;
    const keep = silent && stateRef.current.status === "ready";
    if (!keep) setState({ status: "loading", data: null, error: null });
    try {
      const data = await loader();
      if (runId.current === id) setState({ status: "ready", data, error: null });
    } catch (err) {
      if (runId.current !== id) return;
      if (!keep) setState({ status: "error", data: null, error: messageFor(err) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  const setData = useCallback((updater: (prev: T) => T) => {
    setState((prev) => (prev.status === "ready" ? { ...prev, data: updater(prev.data) } : prev));
  }, []);

  return { ...state, reload: run, setData };
}
