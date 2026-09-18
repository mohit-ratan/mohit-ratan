import { Suspense, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import { mediaUrl } from '../api';
import CameraController from './CameraController';
import { useInteractionRegistry, useRegisterInteractable, useInteractionRaycaster } from './useInteraction';

// Hex equivalents of the CSS category vars in styles.css :root — Three.js
// materials need real color values, not CSS custom properties.
const CATEGORY_COLORS = {
  health: { wall: '#E4F5E9', accent: '#2F9E5B' },
  wealth: { wall: '#E4EEF9', accent: '#2B6CB0' },
  relationships: { wall: '#F7E7EF', accent: '#B0527A' },
};

export const ROOM_WIDTH = 12;
export const ROOM_DEPTH = 10;
const ROOM_HEIGHT = 4;
const EYE_HEIGHT = 1.6;

function FrameTexture({ url }) {
  const texture = useTexture(url);
  return <meshStandardMaterial map={texture} />;
}

function AchievementFrame({ achievement, index, registryRef, onOpen, accent }) {
  const cover = achievement.coverPost;
  const isVideo = cover?.mediaType === 'video';
  const x = -ROOM_WIDTH / 2 + 2.2 + index * 1.7;

  const ref = useRegisterInteractable(registryRef, {
    label: `#${achievement.tag}`,
    onInteract: () => onOpen(achievement),
  });

  return (
    <group position={[x, EYE_HEIGHT, -ROOM_DEPTH / 2 + 0.06]}>
      <mesh ref={ref}>
        <planeGeometry args={[1.2, 1.2]} />
        {isVideo ? (
          <meshStandardMaterial color={accent} />
        ) : (
          <Suspense fallback={<meshStandardMaterial color={accent} />}>
            <FrameTexture url={mediaUrl(cover.mediaUrl)} />
          </Suspense>
        )}
      </mesh>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.34, 1.34, 0.05]} />
        <meshStandardMaterial color={accent} />
      </mesh>
    </group>
  );
}

function Decor({ count, accent }) {
  return (
    <>
      {count >= 1 && (
        <mesh position={[-ROOM_WIDTH / 2 + 1, 0.5, ROOM_DEPTH / 2 - 1]}>
          <cylinderGeometry args={[0.35, 0.4, 1, 10]} />
          <meshStandardMaterial color={accent} />
        </mesh>
      )}
      {count >= 3 && (
        <mesh position={[ROOM_WIDTH / 2 - 1.2, 0.4, ROOM_DEPTH / 2 - 1.2]}>
          <boxGeometry args={[1, 0.8, 1]} />
          <meshStandardMaterial color={accent} />
        </mesh>
      )}
      {count >= 6 && (
        <mesh position={[ROOM_WIDTH / 2 - 1, 1.2, -ROOM_DEPTH / 2 + 1]}>
          <coneGeometry args={[0.3, 0.9, 8]} />
          <meshStandardMaterial color={accent} />
        </mesh>
      )}
    </>
  );
}

// One category room: floor/walls tinted per category, achievement covers as
// wall-mounted frames along the back wall (interactable via the shared
// raycaster registry), a couple of simple decor primitives by count tier.
export default function RoomScene({ category, achievements, onOpen, locked, onLockChange, onFocusChange }) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.health;
  const registryRef = useInteractionRegistry();
  const focusedLabel = useInteractionRaycaster(registryRef, { enabled: locked });

  useEffect(() => {
    onFocusChange?.(focusedLabel);
  }, [focusedLabel, onFocusChange]);

  const bounds = {
    minX: -ROOM_WIDTH / 2 + 0.6,
    maxX: ROOM_WIDTH / 2 - 0.6,
    minZ: -ROOM_DEPTH / 2 + 0.6,
    maxZ: ROOM_DEPTH / 2 - 0.6,
  };

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 4]} intensity={0.6} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#F4EFE7" />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color={colors.wall} />
      </mesh>
      <mesh position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color={colors.wall} />
      </mesh>
      <mesh position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color={colors.wall} />
      </mesh>

      <Decor count={achievements.length} accent={colors.accent} />

      {achievements.map((a, i) => (
        <AchievementFrame
          key={a.tag}
          achievement={a}
          index={i}
          registryRef={registryRef}
          onOpen={onOpen}
          accent={colors.accent}
        />
      ))}

      <CameraController bounds={bounds} onLockChange={onLockChange} />
    </>
  );
}
