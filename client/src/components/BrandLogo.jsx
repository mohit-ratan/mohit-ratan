// Three continuous loops gather around one centre: health, wealth, relationships.
// Flat geometry keeps the mark legible in one colour and at avatar sizes.
export default function BrandLogo({ size = 38 }) {
  return (
    <svg className="brand-icon" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="#D94B17" strokeWidth="7" strokeLinejoin="round">
        {[0, 120, 240].map((angle) => (
          <path key={angle} transform={`rotate(${angle} 32 32)`}
            d="M29 27 19 21C10 16 12 5 22 5c10 0 16 9 13 18l-3 9Z" />
        ))}
      </g>
    </svg>
  );
}
