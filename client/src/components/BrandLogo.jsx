import { useId } from 'react';

// Three ascending folds bring the three life categories into one progress mark.
export default function BrandLogo({ size = 36 }) {
  const gradientId = useId();
  return (
    <svg className="brand-icon" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F87829" />
          <stop offset="1" stopColor="#C63D0B" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="12" fill={`url(#${gradientId})`} />
      <rect x="1.5" y="1.5" width="37" height="37" rx="11.5" fill="none" stroke="#fff" strokeOpacity=".22" />
      <path d="m9 23 6-3.5v10L9 33Z" fill="#fff" fillOpacity=".72" />
      <path d="m17 16 6-3.5v14L17 30Z" fill="#fff" fillOpacity=".9" />
      <path d="m25 9 6-3.5v18L25 27Z" fill="#fff" />
      <path d="m9 23 6-3.5 4 2.3-6 3.5Zm8-7 6-3.5 4 2.3-6 3.5Z" fill="#fff" fillOpacity=".3" />
    </svg>
  );
}
