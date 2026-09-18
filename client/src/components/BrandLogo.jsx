// Three continuous loops gather around one centre: health, wealth, relationships.
// Flat geometry keeps the mark legible in one colour and at avatar sizes.
export default function BrandLogo({ size = 38 }) {
  return (
    <svg className="brand-icon" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="#D94B17" strokeWidth="6.4" strokeLinejoin="round">
        {[0, 120, 240].map((angle) => (
          <path key={angle} transform={`rotate(${angle} 32 32)`}
            d="M29 26 19 20.5C11 16 12.5 6.5 22 6.5c9.5 0 14.5 8 12 16l-1 3Q32.2 28 29 26Z" />
        ))}
      </g>
    </svg>
  );
}
