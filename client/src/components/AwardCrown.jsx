import { useId } from 'react';

export default function AwardCrown() {
  const id = useId();
  return <svg viewBox="0 0 80 46" width="64" height="38" aria-hidden="true">
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff4c4" /><stop offset=".3" stopColor="#e4bd58" /><stop offset=".6" stopColor="#f9df8a" /><stop offset="1" stopColor="#8d5d12" /></linearGradient></defs>
    <path d="m8 12 13 10 5-15 14 15L54 7l5 15 13-10-7 26H15L8 12Z" fill={`url(#${id})`} stroke="#ac7c23" strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="15" y="36" width="50" height="7" rx="3" fill={`url(#${id})`} stroke="#ac7c23" />
    <path d="m40 27 3 4-3 4-3-4Z" fill="#fff4c4" stroke="#ac7c23" />
    <g fill="#f9df8a" stroke="#ac7c23"><circle cx="8" cy="11" r="2.5" /><circle cx="26" cy="6" r="2.5" /><circle cx="54" cy="6" r="2.5" /><circle cx="72" cy="11" r="2.5" /></g>
  </svg>;
}
