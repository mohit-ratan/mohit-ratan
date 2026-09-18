import { HouseFacade } from '../lib/roomArt';

// The first thing you see on the Achievements Room page — a house exterior
// you click into, leading to HouseHallway (the 3-door hub).
export default function HouseEntry({ displayName, onEnter }) {
  return (
    <button type="button" className="house-entry" onClick={onEnter}>
      <div className="house-entry-art">
        <HouseFacade wallColor="var(--surface-2)" roofColor="var(--text-muted)" doorColor="var(--accent)" />
      </div>
      <div className="house-entry-label">🚪 Enter {displayName}’s house</div>
    </button>
  );
}
