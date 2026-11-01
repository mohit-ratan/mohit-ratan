// Small inline icon set, ported 1:1 from the original artifact's ICONS object
// so the same visual language carries over into React.

export function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

export function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.4 8.4 0 0 1-8.4 8.4H7l-4 3v-5.4A8.4 8.4 0 1 1 21 11.5z" />
    </svg>
  );
}

export function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.6" />
      <path d="M21 15l-5-5-9 9" />
    </svg>
  );
}

export function CameraSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" />
      <path d="M21 15l-5-5-9 9" />
    </svg>
  );
}

export function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
      <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
    </svg>
  );
}

export function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14zM5 14l.7 2 2 .7-2 .7L5 19.4l-.7-2-2-.7 2-.7L5 14z" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h10v5a5 5 0 0 1-10 0V3Z" />
      <path d="M7 5H4v2a4 4 0 0 0 4 4M17 5h3v2a4 4 0 0 1-4 4M12 13v5M8 21v-3h8v3M6 21h12" />
    </svg>
  );
}

// One rounded outline family for category and interface symbols.
const THEME_PATHS = {
  play: ['m8 4 12 8-12 8V4Z'],
  pause: ['M8 4v16M16 4v16'],
  sound: ['M11 4 5 9H2v6h3l6 5V4Z', 'M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14'],
  muted: ['M11 4 5 9H2v6h3l6 5V4Z', 'm16 9 6 6M22 9l-6 6'],
  circle: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
  square: ['M4 4h16v16H4Z'],
  portrait: ['M6 2h12v20H6Z'],
  landscape: ['M2 6h20v12H2Z'],
  sun: ['M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5'],
  moon: ['M20 15A8 8 0 0 1 9 4 8.5 8.5 0 1 0 20 15Z'],
  film: ['M3 4h18v16H3Z', 'M7 4v16M17 4v16M3 8h4M3 16h4M17 8h4M17 16h4'],
  bolt: ['m13 2-9 12h7l-1 8 10-13h-8l1-7Z'],
  cloud: ['M6 18a4 4 0 0 1-1-7.9A6 6 0 0 1 16.7 9 4.5 4.5 0 1 1 1.8 9H6Z'],
  star: ['m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.2-.9L12 3Z'],
  close: ['M6 6l12 12M18 6 6 18'],
  globe: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z'],
  health: ['M20 4C10 2 3 7 5 14c2 7 13 5 15-10Z', 'M4 21 16 9M10 15v-5M10 15h5'],
  wealth: ['M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z', 'M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9M12 6v12'],
  relationships: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z'],
  flame: ['M12 3c1 5 6 6 6 12a6 6 0 0 1-12 0c0-3 1-5 3-7 0 3 1 4 2 4 2-2 2-5 1-9Z', 'M12 14c-3 3-2 6 0 6s3-3 0-6Z'],
  freeze: ['M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M3.5 10.5 7.6 9 7 4.5M17 19.5l-.6-4.5 4.1-1.5M3.5 13.5 7.6 15 7 19.5M17 4.5 16.4 9l4.1 1.5'],
  target: ['M21 12a9 9 0 1 1-9-9', 'M17 12a5 5 0 1 1-5-5M12 12 21 3M16 3h5v5'],
  sparkle: ['m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z'],
  bag: ['M8 7V5a4 4 0 0 1 8 0v2M6 7h12l2 14H4L6 7Z', 'M8 13h8v5H8Z'],
  people: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.9'],
  check: ['m5 12 4 4L19 6'],
  warning: ['m12 3 10 18H2L12 3ZM12 9v4M12 17h.01'],
  camera: ['M8 5l2-2h4l2 2h5v15H3V5h5Z', 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'],
};
export function ThemeIcon({ name, className = '' }) {
  return <svg className={`theme-icon ${className}`} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{(THEME_PATHS[name] || THEME_PATHS.sparkle).map((d, index) => <path d={d} key={index} />)}</svg>;
}
export function CategoryIcon({ category }) {
  return <ThemeIcon name={category} className={`category-icon category-icon-${category}`} />;
}
