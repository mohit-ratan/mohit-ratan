import { useEffect, useMemo, useRef } from 'react';
import FloorInterior, { ROOM_WIDTH, ROOM_DEPTH } from './FloorInterior';
import WalkController from './WalkController';
import { useInteractionRegistry, useProximityInteraction } from './useInteraction';

// One category's house — only the currently-selected floor is rendered
// (floors are switched via the DOM floor selector, not by physically
// climbing stairs), keeping the scene simple: one small room, one sticker
// board, a handful of subtask badges. `floorIndex` selects which
// achievement's floor is active.
export default function HouseInterior({ achievements, floorIndex, onOpen, onFocusChange }) {
  const registryRef = useInteractionRegistry();
  const playerPosRef = useRef({ x: 0, z: ROOM_DEPTH / 2 - 1 });
  const focusedLabel = useProximityInteraction(registryRef, playerPosRef, { enabled: true, maxDistance: 2.2 });

  useEffect(() => {
    onFocusChange?.(focusedLabel);
  }, [focusedLabel, onFocusChange]);

  const achievement = achievements[floorIndex];
  // Memoized so identity only changes when the floor actually changes —
  // WalkController resets the player position on every new `spawn`
  // reference, so a fresh object every render would reset it every frame.
  // The computed value is the same for every floor, but `floorIndex` is
  // deliberately kept as a dependency so switching floors still produces a
  // new reference and re-triggers that reset (not a lint mistake).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spawn = useMemo(() => ({ x: 0, z: ROOM_DEPTH / 2 - 1, yaw: Math.PI }), [floorIndex]);
  const bounds = useMemo(() => ({
    minX: -ROOM_WIDTH / 2 + 0.4,
    maxX: ROOM_WIDTH / 2 - 0.4,
    minZ: -ROOM_DEPTH / 2 + 0.4,
    maxZ: ROOM_DEPTH / 2 - 0.4,
  }), []);

  return (
    <>
      <color attach="background" args={['#DDE6E0']} />
      {achievement && (
        <FloorInterior
          key={achievement.tag}
          achievement={achievement}
          floorIndex={floorIndex}
          registryRef={registryRef}
          onOpen={onOpen}
        />
      )}
      <WalkController bounds={bounds} spawn={spawn} playerPosRef={playerPosRef} />
    </>
  );
}
