// A packed bag with an upward check: bring your daily progress together.
export default function BrandLogo({ size = 36 }) {
  return (
    <svg className="brand-icon" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="#D94E12" />
      <path d="M3 11a8 8 0 0 1 8-8h18a8 8 0 0 1 8 8v4C25 10 14 24 3 19Z" fill="#F8792C" />
      <path d="M11 15h18l1.5 16h-21Z" fill="white" />
      <path d="M15 16v-4a5 5 0 0 1 10 0v4" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="m15 23 3.5 3.5L25 20" fill="none" stroke="#D94E12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
