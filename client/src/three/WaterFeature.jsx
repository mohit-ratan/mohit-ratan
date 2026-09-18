import { useMemo, Suspense } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useRegisterInteractable } from './useInteraction';

// three.js's real Water object (a mirror-reflection render-to-texture
// effect) was tried first and dropped: it does its own internal render
// pass in onBeforeRender, which conflicts with @react-three/postprocessing's
// EffectComposer taking over the render loop — confirmed via screenshot as
// severe scanline/tearing corruption on the water surface once bloom was
// added. This is a self-contained shader instead: two scrolling copies of
// the same normal-map texture, combined into a moving sparkle highlight —
// no render target, no reflection camera, nothing for post-processing to
// conflict with.
const WATER_NORMALS_URL = 'https://threejs.org/examples/textures/waternormals.jpg';

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D normalMap;
  uniform float time;
  uniform vec3 waterColor;
  uniform vec3 highlightColor;
  varying vec2 vUv;

  void main() {
    vec2 uv1 = vUv * 6.0 + vec2(time * 0.05, time * 0.03);
    vec2 uv2 = vUv * 9.0 - vec2(time * 0.04, time * 0.06);
    vec3 n1 = texture2D(normalMap, uv1).rgb;
    vec3 n2 = texture2D(normalMap, uv2).rgb;
    float sparkle = pow(clamp(n1.g * n2.g, 0.0, 1.0), 3.0) * 1.6;
    vec3 color = mix(waterColor, highlightColor, clamp(sparkle, 0.0, 1.0));
    gl_FragColor = vec4(color, 0.88);
  }
`;

function AnimatedWater({ position, size }) {
  const waterNormals = useLoader(THREE.TextureLoader, WATER_NORMALS_URL);

  const material = useMemo(() => {
    waterNormals.wrapS = THREE.RepeatWrapping;
    waterNormals.wrapT = THREE.RepeatWrapping;
    return new THREE.ShaderMaterial({
      uniforms: {
        normalMap: { value: waterNormals },
        time: { value: 0 },
        waterColor: { value: new THREE.Color('#1a5f7a') },
        highlightColor: { value: new THREE.Color('#bfe8f0') },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
    });
  }, [waterNormals]);

  useFrame((_, delta) => {
    material.uniforms.time.value += delta * 0.6;
  });

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <circleGeometry args={[size, 32]} />
    </mesh>
  );
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
