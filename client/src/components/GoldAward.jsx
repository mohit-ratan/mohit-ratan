import { useId } from 'react';
import AwardCrown from './AwardCrown';

export default function GoldAward({ earned = false, preview = false, categories = [] }) {
  const id = useId();
  const gold = `${id}-gold`, edge = `${id}-edge`;
  return <div className={`gold-unity-award ${earned || preview ? 'gold-unity-revealed' : ''}`}>
    <svg className="gold-unity-medallion" viewBox="0 0 280 300" role="img" aria-label="Circular crowned gold Trifecta medallion with three interlocking gold rings and gold Health, Wealth and Relationships symbols">
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff4c4"/><stop offset=".18" stopColor="#e4bd58"/><stop offset=".4" stopColor="#b17b1b"/><stop offset=".52" stopColor="#f9df8a"/><stop offset=".72" stopColor="#d1a03a"/><stop offset="1" stopColor="#8d5d12"/></linearGradient>
        <linearGradient id={edge} x1="0" y1="0" x2="1" y2=".7"><stop stopColor="#a9761b"/><stop offset=".45" stopColor="#fff0b4"/><stop offset="1" stopColor="#b58426"/></linearGradient>
      </defs>
      <circle cx="140" cy="164" r="115" fill={`url(#${edge})`}/>
      <circle cx="140" cy="164" r="110" fill={`url(#${gold})`} stroke="#fff0b7" strokeWidth="2"/>
      <circle cx="140" cy="164" r="103" fill="none" stroke="#845c18" strokeOpacity=".55"/>
      <path d="M45 135a100 100 0 0 1 71-67" fill="none" stroke="#fff6d6" strokeWidth="3" strokeLinecap="round" opacity=".8"/>
      <svg x="100" y="12" width="80" height="48" viewBox="0 0 64 38"><AwardCrown /></svg>
      <g aria-hidden="true">
        {[[140, 108], [117, 148], [163, 148]].map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="25" fill="none" stroke={`url(#${edge})`} strokeWidth="8"/>
            <circle cx={cx} cy={cy} r="25" fill="none" stroke={`url(#${gold})`} strokeWidth="4.5"/>
          </g>
        ))}
      </g>
      <g fill="none" stroke="#b38938" strokeWidth=".8"><circle cx="99" cy="199" r="18"/><circle cx="140" cy="199" r="18"/><circle cx="181" cy="199" r="18"/></g>
      <g fill="#a17625" stroke="#ffeab0" strokeWidth=".7">
        <path d="M108 189c-12-2-21 4-18 13 3 9 17 6 18-13Z"/>
        <path d="m90 210 14-16m-7 7v-5m0 5h5" fill="none" stroke="#ffeab0" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M145 192h-7a3.5 3.5 0 0 0 0 7h4a3.5 3.5 0 0 1 0 7h-7m5-17v20" fill="none" stroke="#a17625" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M181 209l-8-8c-8-8 3-16 8-8 5-8 16 0 8 8z"/>
      </g>
      <text x="140" y="241" textAnchor="middle" fill="#886019" fontSize="8" letterSpacing="3">TRIFECTA</text>
    </svg>
    <h3>Prized Gold · Trifecta</h3><p>{preview ? 'Design preview' : earned ? 'Earned — yours to keep' : `${categories.length}/3 categories completed in the current 45-day window`}</p>
    <small>Complete at least one goal in each category within any rolling 45 days. Every task in each goal must be complete.</small>
  </div>;
}
