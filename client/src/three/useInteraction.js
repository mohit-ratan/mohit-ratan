import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

const DEFAULT_MAX_DISTANCE = 2.4;

// A mutable registry of { position: {x,z}, radius, label, onInteract }
// entries — achievement plinths, zone markers, and decor all register
// themselves once (their position is fixed) and unregister on unmount.
// `radius` drives collision (resolveCollision); `label`/`onInteract` are
// optional — decor is collidable but not interactable.
export function useInteractionRegistry() {
  return useRef([]);
}

export function useRegisterInteractable(registryRef, { position, radius = 0, label, onInteract }) {
  useEffect(() => {
    if (!registryRef) return undefined; // e.g. decorative trees with no collision/interaction
    const entry = { position, radius, label, onInteract };
    registryRef.current.push(entry);
    return () => {
      registryRef.current = registryRef.current.filter((e) => e !== entry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryRef, position.x, position.z, radius, label, onInteract]);
}

// Each frame, finds the closest INTERACTABLE entry (has onInteract) within
// maxDistance of the car's current position (read from carPosRef, updated
// by CarController) — proximity fits a chase-camera car much better than a
// raycast crosshair, which assumes you're looking directly at what you
// want. E interacts with whatever's currently focused. Returns the focused
// label for the overlay.
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
      if (!entry.onInteract) continue;
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

// Simple circle-vs-circle position correction — not a physics engine, just
// "don't let the car's center get closer to an object's center than the
// sum of their radii," pushing it back out along the separation vector
// each frame it's overlapping. Called from CarController with the car's
// tentative next position; returns the corrected {x, z}.
export function resolveCollisions(nx, nz, registryRef, carRadius) {
  let x = nx;
  let z = nz;
  for (const entry of registryRef.current) {
    if (!entry.radius) continue;
    const dx = x - entry.position.x;
    const dz = z - entry.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = carRadius + entry.radius;
    if (dist < minDist && dist > 0.0001) {
      const push = minDist - dist;
      x += (dx / dist) * push;
      z += (dz / dist) * push;
    }
  }
  return { x, z };
}
