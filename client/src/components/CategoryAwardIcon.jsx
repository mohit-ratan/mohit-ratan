import { useId } from 'react';
import { CategoryIcon } from '../lib/icons';
import { awardStars } from '../lib/awardRank.mjs';
import AwardCrown from './AwardCrown';

// The gallery, progress checkpoints and celebration all render this artwork.
export default function CategoryAwardIcon({ category, targetDays = 1 }) {
  const id = useId();
  const stars = awardStars(targetDays);
  return <svg className={`category-award-icon award-rank-${stars}`} viewBox="0 0 160 190" fill="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff4c4"/><stop offset=".18" stopColor="#e4bd58"/><stop offset=".4" stopColor="#b17b1b"/><stop offset=".52" stopColor="#f9df8a"/><stop offset=".72" stopColor="#d1a03a"/><stop offset="1" stopColor="#8d5d12"/></linearGradient></defs>
    <circle cx="80" cy="93" r="58" fill={`url(#${id})`} stroke="#a17625" strokeWidth="2" />
    <circle cx="80" cy="93" r="53" stroke="#fff0b7" strokeWidth="2" />
    <circle cx="80" cy="93" r="49" stroke="#845c18" strokeOpacity=".5" />
    <path d="M31 83a50 50 0 0 1 39-39" stroke="#fff6d6" strokeWidth="2" strokeLinecap="round" opacity=".8" />
    {category === 'health' ? <g transform="translate(62 54) scale(1.5)">
      <path d="M20 4C10 2 3 7 5 14c2 7 13 5 15-10Z" fill="#a17625" stroke="#ffeab0" strokeWidth=".7" />
      <path d="M4 21 16 9M10 15v-5M10 15h5" fill="none" stroke="#ffeab0" strokeWidth="1" strokeLinecap="round" />
    </g> : category === 'relationships' ? <g transform="translate(62 54) scale(1.5)">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" fill="#a17625" stroke="#ffeab0" strokeWidth=".7" />
    </g> : <g transform="translate(62 54) scale(2)"><CategoryIcon category={category} /></g>}
    <text x="80" y="117" textAnchor="middle" fill="#674711" fontFamily="Georgia,serif" fontSize="28" fontWeight="bold">{targetDays}</text>
    <text x="80" y="131" textAnchor="middle" fill="#674711" fontSize="7" letterSpacing="3">DAYS</text>
    {stars >= 3 && <svg x="48" y="7" width="64" height="38" viewBox="0 0 64 38"><AwardCrown /></svg>}
    <text x="80" y="171" textAnchor="middle" fill="#a17625" fontSize="13" letterSpacing="2">{stars <= 6 ? '★'.repeat(stars) : `★ × ${stars}`}</text>
  </svg>;
}
