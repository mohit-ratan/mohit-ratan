import { Suspense } from 'react';
import * as THREE from 'three';
import { Text, useTexture } from '@react-three/drei';
import { mediaUrl } from '../api';
import { useRegisterInteractable } from './useInteraction';
import { CAT_MAP } from '../lib/format';

export const ROOM_WIDTH = 9;
export const ROOM_DEPTH = 7;
export const ROOM_HEIGHT = 3;

const WALL_COLOR = '#EDE6D6';
const FLOOR_COLOR = '#C9A876';
const CEILING_COLOR = '#F5F1E6';
const ACCENT = { health: '#2F9E5B', wealth: '#2B6CB0', relationships: '#B0527A' };

function StickerTexture({ url }) {
  const texture = useTexture(url);
  return <meshStandardMaterial map={texture} />;
}

// Lays achievement stickers out in a centered grid (up to 3 per row) on
// the back wall — a floor now holds every achievement in its category,
// not just one, so this needs to be a gallery rather than a single
// centerpiece.
function gridOffset(index, total) {
  const columns = Math.min(3, total);
  const rows = Math.ceil(total / columns);
  const col = index % columns;
  const row = Math.floor(index / columns);
  const spacingX = 2.1;
  const spacingY = 1.9;
  return {
    x: (col - (columns - 1) / 2) * spacingX,
    y: 1.8 - (row - (rows - 1) / 2) * spacingY,
  };
}

// One achievement's "sticker" — mounted on the back wall, shows its cover
// photo. Walk up and press E to open the full detail modal (unchanged).
function AchievementSticker({ achievement, accent, index, total, registryRef, onOpen }) {
  const cover = achievement.coverPost;
  const isVideo = cover?.mediaType === 'video';
  const halfD = ROOM_DEPTH / 2;
  const { x, y } = gridOffset(index, total);

  useRegisterInteractable(registryRef, {
    position: { x, z: -halfD + 0.3 },
    radius: 1,
    label: `#${achievement.tag}`,
    onInteract: () => onOpen(achievement),
  });

  return (
    <group position={[x, y, -halfD + 0.05]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.35, 1.35, 0.06]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      <mesh>
        <planeGeometry args={[1.18, 1.18]} />
        {isVideo || !cover ? (
          <meshStandardMaterial color={accent} />
        ) : (
          <Suspense fallback={<meshStandardMaterial color={accent} />}>
            <StickerTexture url={mediaUrl(cover.mediaUrl)} />
          </Suspense>
        )}
      </mesh>
      <Text position={[0, -0.82, 0.04]} fontSize={0.17} color="#33302A" anchorX="center" anchorY="middle">
        {`#${achievement.tag} · ${achievement.count}`}
      </Text>
    </group>
  );
}

// Simple primitives-only decor — deliberately not loading external models
// (that reliability trade-off is why the open-world approach kept
// breaking), just boxes/cylinders/cones that always render.
function FloorLamp({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 16]} />
        <meshStandardMaterial color="#5C564C" />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.8, 8]} />
        <meshStandardMaterial color="#7A7264" />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <coneGeometry args={[0.28, 0.4, 16, 1, true]} />
        <meshStandardMaterial color="#F2E9D0" emissive="#F2E9D0" emissiveIntensity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 1.8, 0]} intensity={0.7} distance={5.5} color="#FFE7B0" />
    </group>
  );
}

function Stool({ position, accent }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.34, 8]} />
        <meshStandardMaterial color="#6B5842" />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.08, 16]} />
        <meshStandardMaterial color={accent} />
      </mesh>
    </group>
  );
}

function PottedPlant({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.2, 0.16, 0.36, 10]} />
        <meshStandardMaterial color="#9C6B45" />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <coneGeometry args={[0.28, 0.68, 8]} />
        <meshStandardMaterial color="#4F8A56" />
      </mesh>
    </group>
  );
}

function FloorDecor({ accent }) {
  const halfW = ROOM_WIDTH / 2;
  const halfD = ROOM_DEPTH / 2;
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0.2]}>
        <circleGeometry args={[1.5, 28]} />
        <meshStandardMaterial color={accent} transparent opacity={0.35} />
      </mesh>
      <FloorLamp position={[-halfW + 0.9, 0, halfD - 1.3]} />
      <PottedPlant position={[halfW - 0.9, 0, halfD - 1.3]} />
      <Stool position={[-halfW + 1, 0, -halfD + 1.5]} accent={accent} />
    </>
  );
}

// One floor: a plain enclosed room (floor/ceiling/three walls, front left
// open — floors are switched via the DOM floor selector, not walked
// between, so no doorway/staircase is needed) representing one category,
// holding every achievement in it as a sticker gallery on the back wall.
export default function FloorInterior({ category, achievements, floorIndex, registryRef, onOpen }) {
  const cat = CAT_MAP[category] || CAT_MAP.health;
  const accent = ACCENT[category] || ACCENT.health;
  const halfW = ROOM_WIDTH / 2;
  const halfD = ROOM_DEPTH / 2;

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, ROOM_HEIGHT - 0.3, 0]} intensity={0.9} distance={14} />
      <directionalLight position={[3, 5, 4]} intensity={0.3} />
      <mesh position={[0, ROOM_HEIGHT - 0.1, 0]}>
        <boxGeometry args={[1.1, 0.08, 1.1]} />
        <meshStandardMaterial color="#FDF6E3" emissive="#FDF6E3" emissiveIntensity={0.5} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color={FLOOR_COLOR} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color={CEILING_COLOR} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2, -halfD]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color={WALL_COLOR} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-halfW, ROOM_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color={WALL_COLOR} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[halfW, ROOM_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color={WALL_COLOR} side={THREE.DoubleSide} />
      </mesh>

      <Text position={[0, ROOM_HEIGHT - 0.35, -halfD + 0.06]} fontSize={0.28} color={accent} anchorX="center" anchorY="middle">
        {`Floor ${floorIndex + 1} — ${cat.emoji} ${cat.label}`}
      </Text>

      {achievements.length === 0 ? (
        <Text position={[0, 1.6, -halfD + 0.3]} fontSize={0.18} color="#8A8272" anchorX="center" anchorY="middle" maxWidth={5} textAlign="center">
          {`No ${cat.label.toLowerCase()} achievements yet.`}
        </Text>
      ) : (
        achievements.map((a, i) => (
          <AchievementSticker
            key={a.tag}
            achievement={a}
            accent={accent}
            index={i}
            total={achievements.length}
            registryRef={registryRef}
            onOpen={onOpen}
          />
        ))
      )}

      <FloorDecor accent={accent} />
    </>
  );
}
