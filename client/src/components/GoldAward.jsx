import { useId } from 'react';

export default function GoldAward({ earned = false, preview = false, categories = [] }) {
  const id = useId();
  const gold = `${id}-gold`, edge = `${id}-edge`;
  return <div className={`gold-unity-award ${earned || preview ? 'gold-unity-revealed' : ''}`}>
    <svg className="gold-unity-medallion" viewBox="0 0 280 300" role="img" aria-label="Refined gold Trifecta medallion with 45-day engraving and gold Health, Wealth and Relationships symbols">
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff1ba"/><stop offset=".32" stopColor="#e9c66a"/><stop offset=".65" stopColor="#c59431"/><stop offset="1" stopColor="#f9e6a0"/></linearGradient>
        <linearGradient id={edge} x1="0" y1="0" x2="1" y2=".7"><stop stopColor="#a9761b"/><stop offset=".45" stopColor="#fff0b4"/><stop offset="1" stopColor="#b58426"/></linearGradient>
      </defs>
      <rect x="29" y="17" width="222" height="264" rx="111" fill={`url(#${edge})`}/>
      <rect x="34" y="22" width="212" height="254" rx="106" fill={`url(#${gold})`} stroke="#fff0b7" strokeWidth="2"/>
      <rect x="41" y="29" width="198" height="240" rx="99" fill="none" stroke="#a77b29" strokeOpacity=".5"/>
      <path d="M54 102c9-35 36-60 69-64" fill="none" stroke="#fff6d6" strokeWidth="3" strokeLinecap="round" opacity=".8"/>
      <path d="M123 71l4 17h26l4-17-10 9-7-15-7 15z" fill="#a17625" stroke="#ffeab0" strokeWidth=".8"/>
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
