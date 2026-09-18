import { useEffect } from 'react';
import { Text } from '@react-three/drei';
import CameraController from './CameraController';
import { useInteractionRegistry, useRegisterInteractable, useInteractionRaycaster } from './useInteraction';
import { CATEGORIES } from '../lib/format';

const CATEGORY_COLORS = { health: '#2F9E5B', wealth: '#2B6CB0', relationships: '#B0527A' };

const ROOM_WIDTH = 12;
const ROOM_DEPTH = 8;
const ROOM_HEIGHT = 4;

function Door({ category, x, registryRef, onEnter }) {
  const color = CATEGORY_COLORS[category.id];
  const ref = useRegisterInteractable(registryRef, {
    label: `${category.emoji} ${category.label}`,
    onInteract: () => onEnter(category.id),
  });
  return (
    <group position={[x, 1.1, -ROOM_DEPTH / 2 + 0.05]}>
      <mesh ref={ref}>
        <boxGeometry args={[1.2, 2.2, 0.1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text position={[0, 1.5, 0.06]} fontSize={0.26} color={color} anchorX="center" anchorY="middle">
        {category.emoji} {category.label}
      </Text>
    </group>
  );
}

// The 3-door hub reached after entering the house. Interacting with a door
// (E while focused) navigates into that category's RoomScene.
export default function HallwayScene({ onEnter, locked, onLockChange, onFocusChange }) {
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
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 4]} intensity={0.6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#F4EFE7" />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#EDEAE3" />
      </mesh>

      {CATEGORIES.map((c, i) => (
        <Door key={c.id} category={c} x={(i - 1) * 3.6} registryRef={registryRef} onEnter={onEnter} />
      ))}

      <CameraController bounds={bounds} onLockChange={onLockChange} />
    </>
  );
}
