// The award itself is flame-shaped, with the actual streak length inside.
export default function FireAwardIcon({ days }) {
  return <svg className="fire-award-icon" viewBox="0 0 100 128" aria-hidden="true" focusable="false">
    <path className="fire-award-body" d="M53 3C67 28 45 36 66 52c5-8 8-15 6-24 20 20 25 38 23 55-2 26-20 42-45 42S6 108 5 83c-1-20 11-38 27-52-3 15-1 25 6 30C51 47 55 29 53 3Z" fill="currentColor" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
    <path d="M22 82c-2 12 3 25 14 30" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".35" />
    {days !== undefined ? <>
      <text x="51" y="91" textAnchor="middle" fill="#fff" fontFamily="Georgia,serif" fontSize={days > 999 ? 25 : 33} fontWeight="bold">{days}</text>
      <text x="51" y="106" textAnchor="middle" fill="#fff" fontSize="9" letterSpacing="2">DAYS</text>
    </> : <path d="M53 65c5 13-8 15-1 24 3-3 4-5 4-9 13 14 7 30-6 30s-22-16 3-45Z" fill="#fff" opacity=".85" />}
  </svg>;
}
