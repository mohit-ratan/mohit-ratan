import { useMemo, Suspense } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { useRegisterInteractable } from './useInteraction';

// A real animated water shader (ripples + reflection), not a flat blue
// plane — three.js's own official Water example object, textured with its
// standard normal-map asset (open CORS, ~250KB, loaded at runtime).
const WATER_NORMALS_URL = 'https://threejs.org/examples/textures/waternormals.jpg';

function AnimatedWater({ position, size }) {
  const waterNormals = useLoader(THREE.TextureLoader, WATER_NORMALS_URL);

  const water = useMemo(() => {
    waterNormals.wrapS = THREE.RepeatWrapping;
    waterNormals.wrapT = THREE.RepeatWrapping;
    const geometry = new THREE.CircleGeometry(size, 32);
    const w = new Water(geometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: new THREE.Vector3(0.5, 1, 0.3),
      sunColor: 0xffffff,
      waterColor: 0x1a5f7a,
      distortionScale: 2.2,
      fog: true,
    });
    w.rotation.x = -Math.PI / 2;
    return w;
  }, [waterNormals, size]);

  useFrame((_, delta) => {
    water.material.uniforms.time.value += delta * 0.6;
  });

  return <primitive object={water} position={position} />;
}

// Collision-only (no label/onInteract) so the car bumps the shoreline
// instead of driving into the lake.
export default function WaterFeature({ position = [0, 0, 0], size = 10, registryRef }) {
  useRegisterInteractable(registryRef, {
    position: { x: position[0], z: position[2] },
    radius: size * 0.92,
  });

  return (
    <Suspense fallback={null}>
      <AnimatedWater position={position} size={size} />
    </Suspense>
  );
}
