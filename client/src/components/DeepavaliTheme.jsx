import { useEffect, useState } from 'react';

// A one-day celebration in India time, rather than a recurring annual theme.
const START = Date.parse('2026-11-08T00:00:00+05:30');
const END = Date.parse('2026-11-09T00:00:00+05:30');
export function isDeepavaliDay(now = Date.now()) {
  return now >= START && now < END;
}

function Diya() {
  return <svg className="deepavali-diya" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <ellipse cx="32" cy="31" rx="23" ry="23" fill="#FFC85B" opacity=".12" />
    <path d="M32 7c9 12 12 21 0 26-12-5-9-14 0-26Z" fill="#FFD975" />
    <path d="M32 19c4 6 5 10 0 14-5-4-4-8 0-14Z" fill="#FFF5CC" />
    <path d="M8 36h48c-3 15-13 22-24 22S11 51 8 36Z" fill="#C76535" />
    <path d="M9 36c13 7 33 7 46 0M21 46l3 3m7-2 1 4m8-5-2 3" stroke="#FFD975" strokeWidth="2" strokeLinecap="round" />
  </svg>;
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

  if (!active) return null;
  return <aside className="deepavali-greeting" aria-label="Deepavali greeting">
    <Diya />
    <div><p>Happy Deepavali</p><span>A little light. A little joy. A brighter tomorrow.</span></div>
    <Diya />
  </aside>;
}
