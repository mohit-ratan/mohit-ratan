import { Suspense } from 'react';
import * as THREE from 'three';
import { Text, useTexture } from '@react-three/drei';
import { mediaUrl } from '../api';
import { useRegisterInteractable } from './useInteraction';
import { iconForSubtask } from '../lib/subtaskIcons';
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

// The main achievement "sticker" — mounted on the back wall, shows the
// achievement's cover photo. Walk up and press E to open the full detail
// modal (unchanged from the previous scene).
function AchievementSticker({ achievement, accent, registryRef, onOpen }) {
  const cover = achievement.coverPost;
  const isVideo = cover?.mediaType === 'video';
  const halfD = ROOM_DEPTH / 2;

  useRegisterInteractable(registryRef, {
    position: { x: 0, z: -halfD + 0.3 },
    radius: 1.6,
    label: `#${achievement.tag}`,
    onInteract: () => onOpen(achievement),
  });

  return (
    <group position={[0, 1.75, -halfD + 0.05]}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[1.7, 1.7, 0.06]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      <mesh>
        <planeGeometry args={[1.5, 1.5]} />
        {isVideo || !cover ? (
          <meshStandardMaterial color={accent} />
        ) : (
          <Suspense fallback={<meshStandardMaterial color={accent} />}>
            <StickerTexture url={mediaUrl(cover.mediaUrl)} />
          </Suspense>
        )}
      </mesh>
      <Text position={[0, -1.05, 0.04]} fontSize={0.22} color="#33302A" anchorX="center" anchorY="middle">
        {`#${achievement.tag} · ${achievement.count} post${achievement.count === 1 ? '' : 's'}`}
      </Text>
    </group>
  );
}

// A small wall-mounted badge for one subtask — green when done, muted
// otherwise. Purely informational (subtask editing already lives on the
// 2D goal UI, no need to duplicate it here).
function SubtaskSticker({ subtask, position, rotationY }) {
  const done = !!subtask.done;
  const color = done ? '#3E8E52' : '#B7AE9C';
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[1.5, 0.55, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text position={[0, 0, 0.03]} fontSize={0.14} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={1.3} textAlign="center">
        {`${iconForSubtask(subtask.text)} ${subtask.text}`}
      </Text>
    </group>
  );
}

function wallStickerPositions(count, side) {
  const halfW = ROOM_WIDTH / 2;
  const x = side === 'left' ? -halfW + 0.05 : halfW - 0.05;
  const rotationY = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
  return Array.from({ length: count }, (_, i) => ({
    position: [x, 1.5, -ROOM_DEPTH / 2 + ((i + 1) / (count + 1)) * ROOM_DEPTH],
    rotationY,
  }));
}

// One floor: a plain enclosed room (floor/ceiling/three walls, front left
// open — floors are switched via the DOM floor selector, not walked
// between, so no doorway/staircase is needed) holding one achievement's
// cover sticker on the back wall and its subtasks as stickers along the
// side walls.
export default function FloorInterior({ achievement, floorIndex, registryRef, onOpen }) {
  const cat = CAT_MAP[achievement.category] || CAT_MAP.health;
  const accent = ACCENT[achievement.category] || ACCENT.health;
  const subtasks = achievement.goal?.subtasks || [];
  const halfW = ROOM_WIDTH / 2;
  const halfD = ROOM_DEPTH / 2;

  const leftItems = subtasks.filter((_, i) => i % 2 === 0);
  const rightItems = subtasks.filter((_, i) => i % 2 === 1);
  const leftPositions = wallStickerPositions(leftItems.length, 'left');
  const rightPositions = wallStickerPositions(rightItems.length, 'right');

  return (
    <>
      <ambientLight intensity={0.65} />
      <pointLight position={[0, ROOM_HEIGHT - 0.3, 0]} intensity={1} distance={14} />
      <directionalLight position={[3, 5, 4]} intensity={0.3} />

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

      <AchievementSticker achievement={achievement} accent={accent} registryRef={registryRef} onOpen={onOpen} />

      {subtasks.length === 0 && (
        <Text position={[0, 1, halfD - 1.2]} fontSize={0.16} color="#8A8272" anchorX="center" anchorY="middle" maxWidth={4} textAlign="center">
          No goal tracked for this achievement yet.
        </Text>
      )}

      {leftItems.map((s, i) => (
        <SubtaskSticker key={`l-${i}`} subtask={s} position={leftPositions[i].position} rotationY={leftPositions[i].rotationY} />
      ))}
      {rightItems.map((s, i) => (
        <SubtaskSticker key={`r-${i}`} subtask={s} position={rightPositions[i].position} rotationY={rightPositions[i].rotationY} />
      ))}
    </>
  );
}
