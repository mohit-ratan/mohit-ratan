import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import FurnitureProp from './FurnitureProp';
import { TREE_URLS } from './assets';

const GROUND_PALETTE = ['#6FA85C', '#5F9650', '#7BB868', '#6AA058'];

// A flat single-color plane reads as an obviously fake floor — this bakes
// per-vertex color noise (a patchy blend of a few grass shades, plus a
// brightness jitter) directly into the geometry, no texture file needed,
// so the ground has actual organic variation instead of one flat color.
export function NaturalGround({ size = 40, segments = 40, position = [0, 0, 0] }) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const count = geo.attributes.position.count;
    const colorAttr = new Float32Array(count * 3);
    const palette = GROUND_PALETTE.map((c) => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      const c = palette[Math.floor(Math.random() * palette.length)];
      const jitter = 0.88 + Math.random() * 0.24;
      colorAttr[i * 3] = c.r * jitter;
      colorAttr[i * 3 + 1] = c.g * jitter;
      colorAttr[i * 3 + 2] = c.b * jitter;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    return geo;
  }, [size, segments]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={position}>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}

const DEBRIS_COLORS = ['#B5502A', '#8C6239', '#C97B3D', '#A6472A'];

// Small scattered flat leaf/debris flecks across the ground — cheap way to
// add the "natural clutter" look the reference image has (little colored
// specks dotted across the terrain), avoiding a perfectly clean/empty floor.
export function GroundDebris({ count = 70, area = 34 }) {
  const items = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      position: [(Math.random() - 0.5) * area, 0.02, (Math.random() - 0.5) * area],
      rotation: Math.random() * Math.PI,
      color: DEBRIS_COLORS[i % DEBRIS_COLORS.length],
      scale: 0.14 + Math.random() * 0.14,
    }));
  }, [count, area]);

  return items.map((it, i) => (
    <mesh key={i} position={it.position} rotation={[-Math.PI / 2, 0, it.rotation]} scale={it.scale}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color={it.color} side={THREE.DoubleSide} />
    </mesh>
  ));
}

export function isNightNow() {
  const hour = new Date().getHours();
  return hour < 6 || hour >= 19;
}

// Sun+blue sky by day, stars+moon by night, based on the viewer's local
// clock at page load — "time of login," per the request.
export function SkyDome({ night }) {
  if (night) {
    return (
      <>
        <color attach="background" args={['#0B1330']} />
        <Stars radius={90} depth={40} count={2200} factor={3} fade speed={0.4} />
        <mesh position={[35, 32, -45]}>
          <sphereGeometry args={[3, 16, 16]} />
          <meshStandardMaterial color="#F2F1E8" emissive="#F2F1E8" emissiveIntensity={0.7} />
        </mesh>
      </>
    );
  }
  return <Sky sunPosition={[20, 25, 10]} turbidity={2} rayleigh={0.8} />;
}

// Scattered real tree models around a ring outside the drivable area —
// decorative only (no collision registration, they're out of the car's
// reach by design).
export function TreeRing({ innerRadius = 24, outerRadius = 34, count = 22 }) {
  const trees = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.sin(i) * 0.2;
      const r = innerRadius + ((i * 37) % (outerRadius - innerRadius));
      const url = TREE_URLS[i % TREE_URLS.length];
      const scale = 0.8 + ((i * 13) % 5) * 0.15;
      return { key: i, url, position: [Math.cos(angle) * r, 0, Math.sin(angle) * r], scale };
    });
  }, [innerRadius, outerRadius, count]);

  return (
    <Suspense fallback={null}>
      {trees.map((t) => (
        <FurnitureProp key={t.key} url={t.url} position={t.position} scale={t.scale} />
      ))}
    </Suspense>
  );
}

const GRASS_PALETTE = ['#8FBF5A', '#79A84D', '#A3D06B', '#6E9C48', '#98C862'];

// Dense spiky grass blades (instanced for performance), varied in color and
// swaying in a wind-like sine motion — a flat static field reads as fake;
// even a subtle sway sells "alive" far more than any amount of density.
export function GrassField({ innerRadius = 20, outerRadius = 32, count = 700 }) {
  const blades = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i * 2.4) % (Math.PI * 2);
      const r = innerRadius + ((i * 53) % Math.round((outerRadius - innerRadius) * 10)) / 10;
      const scale = 0.8 + ((i * 17) % 7) * 0.15;
      return {
        position: [Math.cos(angle) * r, 0.2 * scale, Math.sin(angle) * r],
        baseRotY: (i * 2.1) % (Math.PI * 2),
        scale,
        color: GRASS_PALETTE[i % GRASS_PALETTE.length],
        phase: (i * 0.37) % (Math.PI * 2),
      };
    });
  }, [innerRadius, outerRadius, count]);

  const instanceRefs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < blades.length; i++) {
      const inst = instanceRefs.current[i];
      if (!inst) continue;
      const sway = Math.sin(t * 1.6 + blades[i].phase) * 0.18;
      inst.rotation.set(sway, blades[i].baseRotY, sway * 0.6);
    }
  });

  return (
    <Instances limit={count}>
      <coneGeometry args={[0.06, 0.42, 4]} />
      <meshStandardMaterial />
      {blades.map((b, i) => (
        <Instance
          key={i}
          ref={(el) => { instanceRefs.current[i] = el; }}
          position={b.position}
          scale={b.scale}
          color={b.color}
        />
      ))}
    </Instances>
  );
}

// Alternating red/white blocks along a straight edge — the classic
// checkered road-curb look. `axis` is 'x' or 'z' (which axis the edge runs
// along); `cross` offsets perpendicular to it (the two sides of a road).
export function CheckeredEdge({ axis = 'z', from, to, cross, step = 1.4, blockSize = 0.9 }) {
  const blocks = useMemo(() => {
    const arr = [];
    let i = 0;
    for (let p = from; p < to; p += step) {
      const color = i % 2 === 0 ? '#C23B3B' : '#F2EFE7';
      const position = axis === 'z' ? [cross, 0.02, p] : [p, 0.02, cross];
      const size = axis === 'z' ? [blockSize, 0.03, step * 0.9] : [step * 0.9, 0.03, blockSize];
      arr.push({ key: i, color, position, size });
      i += 1;
    }
    return arr;
  }, [axis, from, to, cross, step, blockSize]);

  return blocks.map((b) => (
    <mesh key={b.key} position={b.position}>
      <boxGeometry args={b.size} />
      <meshStandardMaterial color={b.color} />
    </mesh>
  ));
}

function Bird({ radius, height, speed, offset, color }) {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + offset;
    if (!ref.current) return;
    ref.current.position.set(Math.cos(t) * radius, height + Math.sin(t * 3) * 0.4, Math.sin(t) * radius);
    ref.current.rotation.y = -t + Math.PI / 2;
  });
  return (
    <group ref={ref}>
      <mesh rotation={[0, 0, 0.35]}>
        <coneGeometry args={[0.13, 0.5, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh rotation={[0, 0, -0.35]} position={[0.18, 0, 0]}>
        <coneGeometry args={[0.11, 0.4, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// A handful of simple low-poly "birds" (paired angled cones for wings)
// circling at height — no bird asset exists in the Kenney nature pack, and
// this reads fine as a stylized flock from driving distance.
export function BirdFlock({ count = 5 }) {
  const birds = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      key: i,
      radius: 14 + i * 3,
      height: 9 + (i % 3) * 2,
      speed: 0.15 + (i % 3) * 0.05,
      offset: i * 1.7,
    })),
    [count]
  );
  return birds.map((b) => <Bird key={b.key} {...b} color="#2E2E33" />);
}
