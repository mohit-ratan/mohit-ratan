import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_DISTANCE = 3.5;

// A mutable registry of { ref, label, onInteract } entries that interactable
// meshes add themselves to on mount and remove on unmount — scene-agnostic,
// shared by RoomScene's achievement frames and HallwayScene's doorways.
export function useInteractionRegistry() {
  return useRef([]);
}

export function useRegisterInteractable(registryRef, { label, onInteract }) {
  const ref = useRef(null);
  useEffect(() => {
    const entry = { ref, label, onInteract };
    registryRef.current.push(entry);
    return () => {
      registryRef.current = registryRef.current.filter((e) => e !== entry);
    };
  }, [registryRef, label, onInteract]);
  return ref;
}

// Casts a ray from the camera's forward direction each frame against the
// registry, tracks the closest hit within MAX_DISTANCE as "focused," and
// fires its onInteract when E is pressed. Returns the focused label (or
// null) so the crosshair overlay can show "Press E to open #tag."
export function useInteractionRaycaster(registryRef, { enabled }) {
  const { camera } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const direction = useRef(new THREE.Vector3());
  const [focusedLabel, setFocusedLabel] = useState(null);
  const focusedInteract = useRef(null);

  useFrame(() => {
    if (!enabled) {
      focusedInteract.current = null;
      if (focusedLabel) setFocusedLabel(null);
      return;
    }
    camera.getWorldDirection(direction.current);
    raycaster.current.set(camera.position, direction.current);
    const objects = registryRef.current.map((e) => e.ref.current).filter(Boolean);
    const hits = raycaster.current.intersectObjects(objects, false);
    const hit = hits.find((h) => h.distance <= MAX_DISTANCE);
    const entry = hit ? registryRef.current.find((e) => e.ref.current === hit.object) : null;

    focusedInteract.current = entry?.onInteract || null;
    const nextLabel = entry?.label || null;
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
