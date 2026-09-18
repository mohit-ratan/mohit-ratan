import { Suspense, useEffect, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { mediaUrl } from '../api';
import CarController from './CarController';
import FurnitureProp from './FurnitureProp';
import { FURNITURE_URLS } from './assets';
import { useInteractionRegistry, useRegisterInteractable, useProximityInteraction } from './useInteraction';

// Hex equivalents of the CSS category vars in styles.css :root — Three.js
// materials need real color values, not CSS custom properties.
const CATEGORY_COLORS = {
  health: { ground: '#E4F5E9', accent: '#2F9E5B' },
  wealth: { ground: '#E4EEF9', accent: '#2B6CB0' },
  relationships: { ground: '#F7E7EF', accent: '#B0527A' },
};

export const YARD_SIZE = 26;

function FrameTexture({ url }) {
  const texture = useTexture(url);
  return <meshStandardMaterial map={texture} />;
}

// One achievement's photo mounted on a small plinth, placed directly on the
// open ground — drive up to it and press E.
function AchievementPlinth({ achievement, position, registryRef, onOpen, accent }) {
  const cover = achievement.coverPost;
  const isVideo = cover?.mediaType === 'video';

  useRegisterInteractable(registryRef, {
    position: { x: position[0], z: position[2] },
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

function Decor({ count }) {
  const items = Math.min(DECOR_URLS.length, count >= 6 ? 6 : count >= 3 ? 3 : count >= 1 ? 1 : 0);
  const positions = [
    [-YARD_SIZE / 2 + 2.5, 0, -3],
    [YARD_SIZE / 2 - 2.5, 0, -3],
    [-YARD_SIZE / 2 + 2.5, 0, 4],
    [YARD_SIZE / 2 - 2.5, 0, 4],
    [-YARD_SIZE / 2 + 2.5, 0, 9],
    [YARD_SIZE / 2 - 2.5, 0, 9],
  ];
  return (
    <Suspense fallback={null}>
      {DECOR_URLS.slice(0, items).map((url, i) => (
        <FurnitureProp key={url} url={url} position={positions[i]} />
      ))}
    </Suspense>
  );
}

// Achievement plinths laid out in a loose grid across the open yard so
// there's room for the car to weave between them, wrapping to a new row
// every 4.
function plinthPosition(index) {
  const cols = 4;
  const spacing = 4.5;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const x = -((cols - 1) * spacing) / 2 + col * spacing;
  const z = -2 + row * 4.5;
  return [x, 0, z];
}

// One category's open drivable yard — ground tinted per category,
// achievement photos on plinths scattered across it, a few real furniture
// props as ambient decor by count tier, a drivable car with a chase camera.
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
      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 10, 4]} intensity={0.7} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[YARD_SIZE, YARD_SIZE]} />
        <meshStandardMaterial color={colors.ground} />
      </mesh>

      <Decor count={achievements.length} />

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

      <CarController bounds={bounds} carPosRef={carPosRef} />
    </>
  );
}
