import { useId } from 'react';

export default function GoldAward({ earned = false, preview = false, categories = [] }) {
  const id = useId();
  const gold = `${id}-gold`, edge = `${id}-edge`;
  return <div className={`gold-unity-award ${earned || preview ? 'gold-unity-revealed' : ''}`}>
    <svg className="gold-unity-medallion" viewBox="0 0 280 300" role="img" aria-label="Circular crowned gold Trifecta medallion with 45-day engraving and gold Health, Wealth and Relationships symbols">
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff4c4"/><stop offset=".18" stopColor="#e4bd58"/><stop offset=".4" stopColor="#b17b1b"/><stop offset=".52" stopColor="#f9df8a"/><stop offset=".72" stopColor="#d1a03a"/><stop offset="1" stopColor="#8d5d12"/></linearGradient>
        <linearGradient id={edge} x1="0" y1="0" x2="1" y2=".7"><stop stopColor="#a9761b"/><stop offset=".45" stopColor="#fff0b4"/><stop offset="1" stopColor="#b58426"/></linearGradient>
      </defs>
      <circle cx="140" cy="164" r="115" fill={`url(#${edge})`}/>
      <circle cx="140" cy="164" r="110" fill={`url(#${gold})`} stroke="#fff0b7" strokeWidth="2"/>
      <circle cx="140" cy="164" r="103" fill="none" stroke="#845c18" strokeOpacity=".55"/>
      <path d="M45 135a100 100 0 0 1 71-67" fill="none" stroke="#fff6d6" strokeWidth="3" strokeLinecap="round" opacity=".8"/>
      <path d="M103 25l8 31h58l8-31-21 16-16-28-16 28z" fill={`url(#${gold})`} stroke="#ac7c23" strokeWidth="1.5"/>
      <rect x="109" y="56" width="62" height="7" rx="3" fill={`url(#${edge})`}/>
      <g fill="#efce73" stroke="#b88829"><circle cx="103" cy="24" r="3"/><circle cx="140" cy="12" r="3"/><circle cx="177" cy="24" r="3"/></g>
      <text x="140" y="153" textAnchor="middle" fill="#886019" fontSize="60" fontFamily="Georgia,serif">45</text>
      <path d="M114 165h52" stroke="#a77b29" strokeWidth=".8"/>
      <g fill="none" stroke="#b38938" strokeWidth=".8"><circle cx="99" cy="199" r="18"/><circle cx="140" cy="199" r="18"/><circle cx="181" cy="199" r="18"/></g>
      <g fill="#a17625" stroke="#ffeab0" strokeWidth=".7">
        <path d="M99 188l3.5 7.5 7.5 3.5-7.5 3.5-3.5 7.5-3.5-7.5-7.5-3.5 7.5-3.5z"/>
        <path d="M140 188l10 11-10 11-10-11z"/>
        <path d="M181 209l-8-8c-8-8 3-16 8-8 5-8 16 0 8 8z"/>
      </g>
      <text x="140" y="241" textAnchor="middle" fill="#886019" fontSize="8" letterSpacing="3">TRIFECTA</text>
    </svg>
    <h3>Prized Gold · Trifecta</h3><p>{preview ? 'Design preview' : earned ? 'Earned — yours to keep' : `${categories.length}/3 categories completed in the current 45-day window`}</p>
    <small>Complete at least one goal in each category within any rolling 45 days. Every task in each goal must be complete.</small>
  </div>;
}
