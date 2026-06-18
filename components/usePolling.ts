"use client";

import { useEffect, useRef } from "react";

/**
 * Run `fn` immediately and then on an interval while `enabled`. Used to make
 * live surfaces (traces, health, control) auto-update without a reload.
 */
export function usePolling(fn: () => void, ms: number, enabled = true): void {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (!enabled) return;
    saved.current();
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
}
