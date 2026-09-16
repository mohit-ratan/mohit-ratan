// The three-circle "health / wealth / relationships" mark from the artifact's
// header, ported verbatim as an SVG component.
export default function BrandLogo({ size = 32 }) {
  return (
    <svg className="brand-icon" viewBox="0 0 36 36" width={size} height={size} aria-hidden="true">
      <circle cx="12.5" cy="13" r="7.6" fill="var(--health)" stroke="var(--surface)" strokeWidth="1.4" />
      <circle cx="22.5" cy="13" r="7.6" fill="var(--wealth)" stroke="var(--surface)" strokeWidth="1.4" />
      <circle cx="17.5" cy="22" r="8" fill="var(--relationships)" stroke="var(--surface)" strokeWidth="1.4" />
      <rect x="11" y="9" width="3" height="8" rx="1.2" fill="#fff" />
      <rect x="8.5" y="11.5" width="8" height="3" rx="1.2" fill="#fff" />
      <text x="22.5" y="13.5" fontSize="10.5" fontWeight="700" fill="#fff" fontFamily="Work Sans, sans-serif" textAnchor="middle" dominantBaseline="central">$</text>
      <g transform="translate(12.3,17.6) scale(0.52)">
        <path d="M9.653 16.915l-.005-.003-.019-.01a20.76 20.76 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5 2 5.015 4.015 3 6.5 3c1.106 0 2.109.436 2.85 1.145A3.998 3.998 0 0113.5 3C15.985 3 18 5.015 18 7.5c0 2.852-2.045 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.001a.752.752 0 01-.69.002l-.001-.002z" fill="#fff" />
      </g>
    </svg>
  );
}
