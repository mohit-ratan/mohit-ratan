import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const MOVE_SPEED = 3;
const TURN_SPEED = 2.2; // rad/sec
const EYE_HEIGHT = 1.6;

// First-person walk, no vehicle/avatar mesh — the camera IS the player.
// WASD moves relative to facing direction (W/S forward-back, A/D strafe),
// left/right arrows turn. No mouse/pointer-lock (kept desktop-simple and
// avoids the focus-loss bugs pointer-lock tends to introduce), no physics,
// just an axis-aligned bounds clamp so you can't walk through walls.
const KEY_MAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'backward', ArrowDown: 'backward',
  KeyA: 'left',
  KeyD: 'right',
};

export default function WalkController({ bounds, spawn, playerPosRef }) {
  const { camera } = useThree();
  const move = useRef({ forward: false, backward: false, left: false, right: false });
  const yaw = useRef(spawn?.yaw ?? 0);
  const pos = useRef(new THREE.Vector3(spawn?.x ?? 0, EYE_HEIGHT, spawn?.z ?? 0));

  // Re-spawn whenever the floor changes (spawn is a new object each time).
  useEffect(() => {
    pos.current.set(spawn?.x ?? 0, EYE_HEIGHT, spawn?.z ?? 0);
    yaw.current = spawn?.yaw ?? 0;
    camera.position.copy(pos.current);
    camera.rotation.set(0, yaw.current, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spawn]);

  useEffect(() => {
    function onKeyDown(e) {
      const dir = KEY_MAP[e.code];
      if (dir) move.current[dir] = true;
      if (e.code === 'ArrowLeft') move.current.turnLeft = true;
      if (e.code === 'ArrowRight') move.current.turnRight = true;
    }
    function onKeyUp(e) {
      const dir = KEY_MAP[e.code];
      if (dir) move.current[dir] = false;
      if (e.code === 'ArrowLeft') move.current.turnLeft = false;
      if (e.code === 'ArrowRight') move.current.turnRight = false;
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const m = move.current;
    if (m.turnLeft) yaw.current += TURN_SPEED * delta;
    if (m.turnRight) yaw.current -= TURN_SPEED * delta;

    // three.js's camera looks down local -Z by default, so with
    // camera.rotation.y = yaw, its actual world-space forward is
    // (-sin(yaw), -cos(yaw)) — NOT (sin(yaw), cos(yaw)). Using the wrong
    // sign here (an earlier bug) made "forward" walk you away from
    // whatever you were looking at instead of toward it.
    const forwardX = -Math.sin(yaw.current);
    const forwardZ = -Math.cos(yaw.current);
    const rightX = Math.cos(yaw.current);
    const rightZ = -Math.sin(yaw.current);

    let dx = 0;
    let dz = 0;
    if (m.forward) { dx += forwardX; dz += forwardZ; }
    if (m.backward) { dx -= forwardX; dz -= forwardZ; }
    if (m.right) { dx += rightX; dz += rightZ; }
    if (m.left) { dx -= rightX; dz -= rightZ; }
    const len = Math.hypot(dx, dz);
    if (len > 0.0001) {
      dx = (dx / len) * MOVE_SPEED * delta;
      dz = (dz / len) * MOVE_SPEED * delta;
    }

    let nx = pos.current.x + dx;
    let nz = pos.current.z + dz;
    if (bounds) {
      nx = THREE.MathUtils.clamp(nx, bounds.minX, bounds.maxX);
      nz = THREE.MathUtils.clamp(nz, bounds.minZ, bounds.maxZ);
    }
    pos.current.x = nx;
    pos.current.z = nz;

    camera.position.set(nx, EYE_HEIGHT, nz);
    camera.rotation.set(0, yaw.current, 0);

    if (playerPosRef) playerPosRef.current = { x: nx, z: nz };
  });

  return null;
}
