import { useId } from 'react';

export default function GoldAward({ earned = false, preview = false, categories = [] }) {
  const id = useId();
  const gold = `${id}-gold`, edge = `${id}-edge`;
  return <div className={`gold-unity-award ${earned || preview ? 'gold-unity-revealed' : ''}`}>
    <svg className="gold-unity-trophy" viewBox="0 0 280 290" role="img" aria-label="Gold trophy with 45-day engraving and gold Health, Wealth and Relationships symbols">
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2=".4"><stop stopColor="#a66b12"/><stop offset=".25" stopColor="#ffe9a0"/><stop offset=".52" stopColor="#e6b64b"/><stop offset=".78" stopColor="#ffedaf"/><stop offset="1" stopColor="#bb811b"/></linearGradient>
        <linearGradient id={edge} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffe9a0"/><stop offset="1" stopColor="#a66b12"/></linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${edge})`} strokeWidth="12">
        <path d="M76 58H36v22c0 36 20 57 61 58"/>
        <path d="M204 58h40v22c0 36-20 57-61 58"/>
      </g>
      <g fill={`url(#${gold})`} stroke="#b58325" strokeWidth="1.5">
        <path d="M126 164h28v51l22 15h-72l22-15z"/>
        <path d="M69 40h142l-8 62c-5 44-29 72-63 72s-58-28-63-72z"/>
        <rect x="65" y="32" width="150" height="14" rx="7"/>
        <rect x="93" y="226" width="94" height="13" rx="5"/>
        <path d="M92 239h96l15 23H77z"/>
        <rect x="72" y="260" width="136" height="12" rx="4"/>
      </g>
      <path d="M85 52l6 46c3 22 10 35 20 44" fill="none" stroke="#fff2bd" strokeWidth="4" strokeLinecap="round" opacity=".7"/>
      <text x="140" y="104" textAnchor="middle" fill="#916011" fontSize="43" fontFamily="Georgia,serif" fontWeight="bold">45</text>
      <g fill="#a06c17" stroke="#ffe9a0" strokeWidth=".6">
        <path d="M104 116l4 8 8 4-8 4-4 8-4-8-8-4 8-4z"/>
        <path d="M140 116l11 12-11 12-11-12z"/>
        <path d="M176 140l-10-10c-9-10 4-19 10-10 6-9 19 0 10 10z"/>
      </g>
      <text x="140" y="254" textAnchor="middle" fill="#81510d" fontSize="9" letterSpacing="2" fontWeight="bold">TRIFECTA</text>
    </svg>
    <h3>Prized Gold · Trifecta</h3><p>{preview ? 'Design preview' : earned ? 'Earned — yours to keep' : `${categories.length}/3 categories completed in the current 45-day window`}</p>
    <small>Complete at least one goal in each category within any rolling 45 days. Every task in each goal must be complete.</small>
  </div>;
}
