// A compact P monogram: an open counter and rising stroke represent progress.
export default function BrandLogo({ size = 36 }) {
  return (
    <svg className="brand-icon" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#DB4B12" />
      <path d="M12 30V10h10a8 8 0 0 1 0 16h-4v4h-6Zm6-10h4a2 2 0 0 0 0-4h-4v4Z" fill="#fff" fillRule="evenodd" />
      <path d="m27 31 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
