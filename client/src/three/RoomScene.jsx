import { Suspense, useEffect, useRef } from 'react';
import CarController from './CarController';
import FurnitureProp from './FurnitureProp';
import AchievementPlinth from './AchievementPlinth';
import { FURNITURE_URLS } from './assets';
import { SkyDome, Mountains, TreeRing, BirdFlock, isNightNow } from './Environment';
import { useInteractionRegistry, useProximityInteraction } from './useInteraction';

// Hex equivalents of the CSS category vars in styles.css :root — Three.js
// materials need real color values, not CSS custom properties. Ground is
// grass everywhere; category color is the accent (plinths/road line), not
// the whole yard, so it reads as an actual outdoor space.
const CATEGORY_COLORS = {
  health: { accent: '#2F9E5B' },
  wealth: { accent: '#2B6CB0' },
  relationships: { accent: '#B0527A' },
};
const GRASS_COLOR = '#6FA85C';
const ROAD_COLOR = '#6B6B70';
const FOG_COLOR_DAY = '#BFE3F5';
const FOG_COLOR_NIGHT = '#0B1330';

export const YARD_SIZE = 30;

const DECOR_URLS = [FURNITURE_URLS.plant, FURNITURE_URLS.lamp, FURNITURE_URLS.sideTable, FURNITURE_URLS.bookcase, FURNITURE_URLS.rug, FURNITURE_URLS.table];

function Decor({ count, registryRef }) {
  const items = Math.min(DECOR_URLS.length, count >= 6 ? 6 : count >= 3 ? 3 : count >= 1 ? 1 : 0);
  const positions = [
    [-6, 0, -3], [6, 0, -3],
    [-6, 0, 4], [6, 0, 4],
    [-6, 0, 9], [6, 0, 9],
  ];
  return (
    <Suspense fallback={null}>
      {DECOR_URLS.slice(0, items).map((url, i) => (
        <FurnitureProp key={url} url={url} position={positions[i]} registryRef={registryRef} />
      ))}
    </Suspense>
  );
}

// Achievement plinths laid out in a loose grid either side of the road so
// there's room for the car to weave between them, wrapping to a new row
// every 2 (road runs down the middle).
function plinthPosition(index) {
  const row = Math.floor(index / 2);
  const side = index % 2 === 0 ? -1 : 1;
  return [side * 3.2, 0, -2 + row * 4.5];
}

// One category's open drivable yard — grass ground, a road down the
// middle, achievement photos on plinths either side, real furniture props
// and trees as ambient decor, a drivable car with a chase camera.
export default function RoomScene({ category, achievements, onOpen, onFocusChange }) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.health;
  const night = isNightNow();
  const registryRef = useInteractionRegistry();
  const carPosRef = useRef({ x: 0, z: 8 });
  const focusedLabel = useProximityInteraction(registryRef, carPosRef, { enabled: true });

  useEffect(() => {
    onFocusChange?.(focusedLabel);
  }, [focusedLabel, onFocusChange]);

  const bounds = {
    minX: -YARD_SIZE / 2 + 1,
    maxX: YARD_SIZE / 2 - 1,
    minZ: -YARD_SIZE / 2 + 1,
    maxZ: YARD_SIZE / 2 - 1,
  };

  return (
    <>
      <SkyDome night={night} />
      <fog attach="fog" args={[night ? FOG_COLOR_NIGHT : FOG_COLOR_DAY, 22, 48]} />
      <ambientLight intensity={night ? 0.35 : 0.85} />
      <directionalLight position={[10, 16, 8]} intensity={night ? 0.25 : 0.9} />

      <Mountains />
      <TreeRing />
      <BirdFlock />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[YARD_SIZE, YARD_SIZE]} />
        <meshStandardMaterial color={GRASS_COLOR} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[3, YARD_SIZE]} />
        <meshStandardMaterial color={ROAD_COLOR} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <planeGeometry args={[0.15, YARD_SIZE]} />
        <meshStandardMaterial color={colors.accent} />
      </mesh>

      <Decor count={achievements.length} registryRef={registryRef} />

      {achievements.map((a, i) => (
        <AchievementPlinth
          key={a.tag}
          achievement={a}
          position={plinthPosition(i)}
          registryRef={registryRef}
          onOpen={onOpen}
          accent={colors.accent}
        />
      ))}

      <CarController bounds={bounds} carPosRef={carPosRef} registryRef={registryRef} />
    </>
  );
}
