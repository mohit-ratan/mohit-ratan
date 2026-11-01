import { useId } from 'react';

// Shared reference-style flame for progress markers, previews and earned awards.
export default function FireAwardIcon({ days }) {
  const id = `fire-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const outer = `${id}-outer`, inner = `${id}-inner`;
  return <svg className="fire-award-icon" viewBox="0 0 100 132" width="38" height="48" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={outer} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="128">
        <stop stopColor="#FF3E35" /><stop offset=".35" stopColor="#FF650B" /><stop offset=".75" stopColor="#FF8700" /><stop offset="1" stopColor="#FF9C00" />
      </linearGradient>
      <linearGradient id={inner} gradientUnits="userSpaceOnUse" x1="0" y1="46" x2="0" y2="128">
        <stop stopColor="#FFF16B" /><stop offset=".6" stopColor="#FFF8A4" /><stop offset=".85" stopColor="#FFFAC3" /><stop offset="1" stopColor="#FFD15B" />
      </linearGradient>
    </defs>
    <path className="fire-award-body" d="M38 2c-3 0-4 2-1 5 13 16 10 28-3 42-9 10-11 17-11 25-4-5-4-14-3-22 0-3-2-5-5-2-24 26-16 58 9 72 19 11 44 5 60-12 19-20 15-38 2-52-2-3-4-1-5 2-3 9-12 10-13-1-1-11 6-25-2-39C60 9 50 3 38 2Z" fill={`url(#${outer})`} />
    <path className="fire-award-core" d="M59 46c2-2 3-1 2 1-9 22-1 32 8 43 14 18 10 33-8 37-19 4-34-5-35-21-1-7 1-14 5-20 1-2 2-2 3 0 3 7 8 11 10 7 3-5-6-10-2-23 4-12 10-18 17-24Z" fill={`url(#${inner})`} />
    {days !== undefined && <>
      <text x="51" y="104" textAnchor="middle" fill="#7D2B0B" fontFamily="Georgia,serif" fontSize={days > 999 ? 19 : days > 99 ? 23 : 28} fontWeight="bold">{days}</text>
      <text x="51" y="115" textAnchor="middle" fill="#7D2B0B" fontSize="6.5" fontWeight="bold" letterSpacing="1.5">DAYS</text>
    </>}
  </svg>;
}
