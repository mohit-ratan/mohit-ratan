import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CAR_MODEL_URL } from './assets';
import { resolveCollisions } from './useInteraction';

const CAR_RADIUS = 0.75;

// Simple arcade car model — no physics engine: acceleration/friction on
// speed, steering rate scaled by current speed (so it can't spin in place),
// clamped to an axis-aligned world boundary. A third-person chase camera
// follows behind and above, smoothed with a frame-rate-independent lerp.
const ACCEL = 6;
const MAX_SPEED_FORWARD = 8;
const MAX_SPEED_REVERSE = 4;
const FRICTION = 5;
const TURN_RATE = 2.2; // rad/sec at full speed

// Kenney's car models don't all share the same "forward" axis convention —
// if the car visually drives sideways/backwards, adjust this in increments
// of Math.PI / 2 (this is the one thing I can't verify without a browser).
const MODEL_YAW_OFFSET = 0;

const KEY_MAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'backward', ArrowDown: 'backward',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export default function CarController({ bounds, carPosRef, registryRef }) {
  const { scene } = useGLTF(CAR_MODEL_URL);
  const { camera } = useThree();
  const groupRef = useRef(null);
  const move = useRef({ forward: false, backward: false, left: false, right: false });
  const speed = useRef(0);
  const heading = useRef(0);
  const camPos = useRef(new THREE.Vector3(0, 3.2, 5));
  const camTarget = useRef(new THREE.Vector3());

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
    const group = groupRef.current;
    if (!group) return;
    const m = move.current;

    if (m.forward) {
      speed.current = Math.min(MAX_SPEED_FORWARD, speed.current + ACCEL * delta);
    } else if (m.backward) {
      speed.current = Math.max(-MAX_SPEED_REVERSE, speed.current - ACCEL * delta);
    } else {
      const sign = Math.sign(speed.current);
      speed.current -= sign * Math.min(Math.abs(speed.current), FRICTION * delta);
    }

    const speedRatio = THREE.MathUtils.clamp(speed.current / MAX_SPEED_FORWARD, -1, 1);
    if (m.left) heading.current += TURN_RATE * delta * speedRatio;
    if (m.right) heading.current -= TURN_RATE * delta * speedRatio;

    let nx = group.position.x + Math.sin(heading.current) * speed.current * delta;
    let nz = group.position.z + Math.cos(heading.current) * speed.current * delta;
    if (registryRef) {
      const corrected = resolveCollisions(nx, nz, registryRef, CAR_RADIUS);
      nx = corrected.x;
      nz = corrected.z;
    }
    if (bounds) {
      nx = THREE.MathUtils.clamp(nx, bounds.minX, bounds.maxX);
      nz = THREE.MathUtils.clamp(nz, bounds.minZ, bounds.maxZ);
    }
    group.position.x = nx;
    group.position.z = nz;
    group.rotation.y = heading.current;

    if (carPosRef) carPosRef.current = { x: nx, z: nz };

    camPos.current.set(
      nx - Math.sin(heading.current) * 5.5,
      3.2,
      nz - Math.cos(heading.current) * 5.5
    );
    camera.position.lerp(camPos.current, 1 - Math.pow(0.0005, delta));
    camTarget.current.set(nx, 0.6, nz);
    camera.lookAt(camTarget.current);
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={0.55} rotation={[0, MODEL_YAW_OFFSET, 0]} />
    </group>
  );
}

useGLTF.preload(CAR_MODEL_URL);
