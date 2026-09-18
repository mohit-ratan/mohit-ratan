// Hand-coded room/furniture SVG pieces for the Achievements Room — same
// spirit as icons.jsx's single-purpose inline SVGs, scaled up to multi-shape
// scenery. All colors are passed in (category CSS vars), never hardcoded,
// so a zone's palette always matches its category.

export function EmptyRoomShell({ wallColor, floorColor, borderColor }) {
  return (
    <svg className="room-shell" viewBox="0 0 320 180" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="0" width="320" height="130" fill={wallColor} />
      <polygon points="0,130 320,130 300,180 20,180" fill={floorColor} />
      <rect x="0" y="127" width="320" height="4" fill={borderColor} opacity="0.4" />
      <rect x="130" y="24" width="60" height="60" rx="4" fill="#EAF4FC" stroke={borderColor} strokeWidth="3" />
      <line x1="160" y1="24" x2="160" y2="84" stroke={borderColor} strokeWidth="2" />
      <line x1="130" y1="54" x2="190" y2="54" stroke={borderColor} strokeWidth="2" />
    </svg>
  );
}

export function Rug({ color }) {
  return (
    <svg viewBox="0 0 100 40" aria-hidden="true">
      <ellipse cx="50" cy="20" rx="48" ry="18" fill={color} opacity="0.85" />
      <ellipse cx="50" cy="20" rx="34" ry="12" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" />
    </svg>
  );
}

export function Shelf({ color }) {
  return (
    <svg viewBox="0 0 90 24" aria-hidden="true">
      <rect x="0" y="16" width="90" height="6" rx="2" fill={color} />
      <rect x="8" y="2" width="10" height="14" fill={color} opacity="0.7" />
      <rect x="22" y="5" width="8" height="11" fill={color} opacity="0.5" />
      <circle cx="55" cy="9" r="6" fill={color} opacity="0.6" />
    </svg>
  );
}

export function PlantPot({ color }) {
  return (
    <svg viewBox="0 0 44 56" aria-hidden="true">
      <path d="M22 6C10 6 8 26 16 30C10 33 13 40 22 37C31 40 34 33 28 30C36 26 34 6 22 6Z" fill="#3F9E5B" />
      <path d="M13 37h18l-3 15h-12z" fill={color} />
    </svg>
  );
}

export function Lamp({ color }) {
  return (
    <svg viewBox="0 0 30 60" aria-hidden="true">
      <path d="M6 6 L24 6 L19 20 L11 20 Z" fill={color} />
      <rect x="14" y="20" width="2.5" height="32" fill={color} opacity="0.7" />
      <ellipse cx="15" cy="55" rx="10" ry="3" fill={color} opacity="0.45" />
    </svg>
  );
}

export function HouseFacade({ wallColor, roofColor, doorColor }) {
  return (
    <svg viewBox="0 0 320 280" preserveAspectRatio="none" aria-hidden="true">
      <rect x="224" y="34" width="24" height="56" fill={roofColor} />
      <rect x="224" y="34" width="24" height="10" fill="rgba(0,0,0,.12)" />
      <polygon points="14,138 160,32 306,138" fill={roofColor} />
      <polygon points="6,146 160,40 314,146 314,154 160,50 6,154" fill="rgba(0,0,0,.10)" />
      <rect x="40" y="138" width="240" height="112" fill={wallColor} />
      <rect x="40" y="138" width="240" height="6" fill="rgba(0,0,0,.06)" />
      <rect x="60" y="158" width="52" height="52" rx="4" fill="#EAF4FC" stroke="#fff" strokeWidth="3" />
      <line x1="86" y1="158" x2="86" y2="210" stroke="#fff" strokeWidth="2" />
      <line x1="60" y1="184" x2="112" y2="184" stroke="#fff" strokeWidth="2" />
      <rect x="208" y="158" width="52" height="52" rx="4" fill="#EAF4FC" stroke="#fff" strokeWidth="3" />
      <line x1="234" y1="158" x2="234" y2="210" stroke="#fff" strokeWidth="2" />
      <line x1="208" y1="184" x2="260" y2="184" stroke="#fff" strokeWidth="2" />
      <rect x="134" y="172" width="52" height="78" rx="4" fill={doorColor} />
      <rect x="134" y="172" width="52" height="78" rx="4" fill="rgba(255,255,255,.08)" />
      <circle cx="173" cy="212" r="3.5" fill="#fff" opacity="0.9" />
      <rect x="124" y="248" width="72" height="7" rx="2" fill={roofColor} opacity=".35" />
      <rect x="0" y="252" width="320" height="6" fill={roofColor} opacity=".2" />
    </svg>
  );
}

export function DoorArt({ color }) {
  return (
    <svg viewBox="0 0 100 170" preserveAspectRatio="none" aria-hidden="true">
      <rect x="4" y="4" width="92" height="162" rx="6" fill={color} />
      <rect x="14" y="14" width="72" height="142" rx="4" fill="#fff" opacity="0.12" />
      <circle cx="80" cy="88" r="4.5" fill="#fff" opacity="0.9" />
    </svg>
  );
}

export function SideTable({ color }) {
  return (
    <svg viewBox="0 0 54 34" aria-hidden="true">
      <rect x="0" y="0" width="54" height="7" rx="2" fill={color} />
      <rect x="5" y="7" width="4" height="25" fill={color} opacity="0.7" />
      <rect x="45" y="7" width="4" height="25" fill={color} opacity="0.7" />
    </svg>
  );
}
