import { useEffect, useState } from 'react';

// A week of celebration in India time, rather than a recurring annual theme.
const START = Date.parse('2026-11-08T00:00:00+05:30');
const END = Date.parse('2026-11-15T00:00:00+05:30');
export function isDeepavaliDay(now = Date.now()) {
  return now >= START && now < END;
}

export default function DeepavaliTheme() {
  const [active, setActive] = useState(isDeepavaliDay);

  useEffect(() => {
    const update = () => setActive(isDeepavaliDay());
    // Recheck after sleep/tab restoration as well as at each date boundary.
    const now = Date.now();
    const timer = now < END
      ? window.setTimeout(update, Math.min(2_147_483_647, (now < START ? START : END) - now))
      : undefined;
    const interval = window.setInterval(update, 60_000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
    };
  }, [active]);

  useEffect(() => {
    if (active) document.documentElement.dataset.festival = 'deepavali';
    else delete document.documentElement.dataset.festival;
    return () => { delete document.documentElement.dataset.festival; };
  }, [active]);

  return null;
}
