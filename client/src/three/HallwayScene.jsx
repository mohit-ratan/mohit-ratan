import { useEffect, useRef } from 'react';
import { Text } from '@react-three/drei';
import CarController from './CarController';
import { useInteractionRegistry, useRegisterInteractable, useProximityInteraction } from './useInteraction';
import { CATEGORIES } from '../lib/format';

const CATEGORY_COLORS = { health: '#2F9E5B', wealth: '#2B6CB0', relationships: '#B0527A' };

export const PLAZA_SIZE = 30;

function ZoneMarker({ category, position, registryRef, onEnter }) {
  const color = CATEGORY_COLORS[category.id];
  useRegisterInteractable(registryRef, {
    position: { x: position[0], z: position[2] },
    label: `${category.emoji} ${category.label}`,
    onInteract: () => onEnter(category.id),
  });

  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 2.2, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <coneGeometry args={[0.4, 0.6, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text position={[0, 3.1, 0]} fontSize={0.32} color={color} anchorX="center" anchorY="middle">
        {category.emoji} {category.label}
      </Text>
    </group>
  );
}

// An open plaza with three colored zone markers, one per category — drive
// up to one and press E to enter that category's open yard (RoomScene).
export default function HallwayScene({ onEnter, onFocusChange }) {
  const registryRef = useInteractionRegistry();
  const carPosRef = useRef({ x: 0, z: 10 });
  const focusedLabel = useProximityInteraction(registryRef, carPosRef, { enabled: true });

  useEffect(() => {
    onFocusChange?.(focusedLabel);
  }, [focusedLabel, onFocusChange]);

  const bounds = {
    minX: -PLAZA_SIZE / 2 + 1,
    maxX: PLAZA_SIZE / 2 - 1,
    minZ: -PLAZA_SIZE / 2 + 1,
    maxZ: PLAZA_SIZE / 2 - 1,
  };

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 10, 4]} intensity={0.7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PLAZA_SIZE, PLAZA_SIZE]} />
        <meshStandardMaterial color="#EFE9DE" />
      </mesh>

      {CATEGORIES.map((c, i) => (
        <ZoneMarker
          key={c.id}
          category={c}
          position={[(i - 1) * 8, 0, -6]}
          registryRef={registryRef}
          onEnter={onEnter}
        />
      ))}

      <CarController bounds={bounds} carPosRef={carPosRef} />
    </>
  );
}
