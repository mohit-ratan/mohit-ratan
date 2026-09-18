import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

const DEFAULT_MAX_DISTANCE = 2.4;

// A mutable registry of { position: {x,z}, label, onInteract } entries —
// achievement plinths and zone markers register themselves once (their
// position is fixed) and unregister on unmount.
export function useInteractionRegistry() {
  return useRef([]);
}

export function useRegisterInteractable(registryRef, { position, label, onInteract }) {
  useEffect(() => {
    const entry = { position, label, onInteract };
    registryRef.current.push(entry);
    return () => {
      registryRef.current = registryRef.current.filter((e) => e !== entry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryRef, position.x, position.z, label, onInteract]);
}

// Each frame, finds the closest registered entry within maxDistance of the
// car's current position (read from carPosRef, updated by CarController) —
// proximity fits a chase-camera car much better than a raycast crosshair,
// which assumes you're looking directly at what you want. E interacts with
// whatever's currently focused. Returns the focused label for the overlay.
export function useProximityInteraction(registryRef, carPosRef, { enabled, maxDistance = DEFAULT_MAX_DISTANCE }) {
  const [focusedLabel, setFocusedLabel] = useState(null);
  const focusedInteract = useRef(null);

  useFrame(() => {
    if (!enabled || !carPosRef.current) {
      focusedInteract.current = null;
      if (focusedLabel) setFocusedLabel(null);
      return;
    }
    const { x, z } = carPosRef.current;
    let closest = null;
    let closestDist = maxDistance;
    for (const entry of registryRef.current) {
      const dx = entry.position.x - x;
      const dz = entry.position.z - z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= closestDist) {
        closest = entry;
        closestDist = dist;
      }
    }
    focusedInteract.current = closest?.onInteract || null;
    const nextLabel = closest?.label || null;
    if (nextLabel !== focusedLabel) setFocusedLabel(nextLabel);
  });

  useEffect(() => {
    function onKeyDown(e) {
      if (e.code === 'KeyE' && focusedInteract.current) focusedInteract.current();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return focusedLabel;
}
