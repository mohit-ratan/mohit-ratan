import { Suspense, useEffect, useRef } from 'react';
import { Sky, useTexture } from '@react-three/drei';
import { mediaUrl } from '../api';
import CarController from './CarController';
import FurnitureProp from './FurnitureProp';
import { FURNITURE_URLS } from './assets';
import { useInteractionRegistry, useRegisterInteractable, useProximityInteraction } from './useInteraction';

// Hex equivalents of the CSS category vars in styles.css :root — Three.js
// materials need real color values, not CSS custom properties. Ground is
// grass everywhere; category color is now the accent (plinths/road line),
// not the whole yard, so it reads as an actual outdoor space.
const CATEGORY_COLORS = {
  health: { accent: '#2F9E5B' },
  wealth: { accent: '#2B6CB0' },
  relationships: { accent: '#B0527A' },
};
const GRASS_COLOR = '#6FA85C';
const ROAD_COLOR = '#4A4A4E';
const SKY_COLOR = '#BFE3F5';

export const YARD_SIZE = 30;

function FrameTexture({ url }) {
  const texture = useTexture(url);
  return <meshStandardMaterial map={texture} />;
}

// One achievement's photo mounted on a small plinth, placed directly on the
// open ground — drive up to it (or bump it — it's collidable) and press E.
function AchievementPlinth({ achievement, position, registryRef, onOpen, accent }) {
  const cover = achievement.coverPost;
  const isVideo = cover?.mediaType === 'video';

  useRegisterInteractable(registryRef, {
    position: { x: position[0], z: position[2] },
    radius: 0.6,
    label: `#${achievement.tag}`,
    onInteract: () => onOpen(achievement),
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.4, 0.45, 0.8, 12]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <planeGeometry args={[1.1, 1.1]} />
        {isVideo ? (
          <meshStandardMaterial color={accent} />
        ) : (
          <Suspense fallback={<meshStandardMaterial color={accent} />}>
            <FrameTexture url={mediaUrl(cover.mediaUrl)} />
          </Suspense>
        )}
      </mesh>
      <mesh position={[0, 1.3, -0.03]}>
        <boxGeometry args={[1.22, 1.22, 0.05]} />
        <meshStandardMaterial color={accent} />
      </mesh>
    </group>
  );
}

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
// as ambient decor by count tier, a drivable car with a chase camera.
// Everything with a radius (plinths, decor) is collidable.
export default function RoomScene({ category, achievements, onOpen, onFocusChange }) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.health;
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
      <Sky sunPosition={[20, 25, 10]} turbidity={2} rayleigh={0.8} />
      <fog attach="fog" args={[SKY_COLOR, 18, 40]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[10, 16, 8]} intensity={0.9} />

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
