import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';

// Click-to-lock mouse-look (via drei's PointerLockControls) plus a manual
// WASD position translator clamped to an axis-aligned box — no physics
// engine, just "don't let the camera leave the room."
const MOVE_SPEED = 4; // units/sec
const KEY_MAP = { KeyW: 'forward', KeyS: 'backward', KeyA: 'left', KeyD: 'right' };

export default function CameraController({ bounds, onLockChange }) {
  const controlsRef = useRef(null);
  const move = useRef({ forward: false, backward: false, left: false, right: false });
  const { camera } = useThree();
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  useEffect(() => {
    function onKeyDown(e) {
      const dir = KEY_MAP[e.code];
      if (dir) move.current[dir] = true;
    }
    function onKeyUp(e) {
      const dir = KEY_MAP[e.code];
      if (dir) move.current[dir] = false;
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (!controlsRef.current?.isLocked) return;
    const m = move.current;
    if (!m.forward && !m.backward && !m.left && !m.right) return;

    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();

    const step = MOVE_SPEED * delta;
    const next = camera.position.clone();
    if (m.forward) next.addScaledVector(forward.current, step);
    if (m.backward) next.addScaledVector(forward.current, -step);
    if (m.right) next.addScaledVector(right.current, step);
    if (m.left) next.addScaledVector(right.current, -step);

    if (bounds) {
      next.x = Math.min(bounds.maxX, Math.max(bounds.minX, next.x));
      next.z = Math.min(bounds.maxZ, Math.max(bounds.minZ, next.z));
    }
    camera.position.x = next.x;
    camera.position.z = next.z;
  });

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={() => onLockChange?.(true)}
      onUnlock={() => onLockChange?.(false)}
    />
  );
}
