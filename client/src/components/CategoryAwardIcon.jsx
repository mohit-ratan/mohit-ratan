import { CategoryIcon } from '../lib/icons';

// Shared medallion artwork for the progress path and milestone celebration.
export default function CategoryAwardIcon({ category, tier = 1 }) {
  return <svg className={`category-award-icon award-rank-${tier}`} viewBox="0 0 48 58" fill="none" aria-hidden="true" focusable="false">
    <path d="m13 32-4 22 10-5 5 7 3-21M35 32l4 22-10-5-5 7-3-21" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    {tier >= 3 && <path d="m13 9-3-7 9 4 5-5 5 5 9-4-3 7" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />}
    <circle cx="24" cy="23" r="18" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
    <circle cx="24" cy="23" r="14" stroke="currentColor" strokeWidth="1" opacity=".45" />
    <g transform="translate(15 14)"><CategoryIcon category={category} /></g>
    {tier >= 2 && <path d="M7 16 3 20l3 5-1 6 5 3M41 16l4 4-3 5 1 6-5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>;
}
