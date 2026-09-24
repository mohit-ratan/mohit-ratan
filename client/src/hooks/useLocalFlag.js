import { useState } from 'react';

// A tiny per-browser "have I already seen this" flag — good enough for a
// gentle, skippable onboarding hint that doesn't need to sync across
// devices or survive clearing site data; not meant for anything that has
// to be authoritative.
export default function useLocalFlag(key) {
  const [done, setDone] = useState(() => {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
  });
  function markDone() {
    try { localStorage.setItem(key, '1'); } catch { /* private mode, storage disabled, etc. */ }
    setDone(true);
  }
  return [done, markDone];
}
