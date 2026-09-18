import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars, Instances, Instance } from '@react-three/drei';
import FurnitureProp from './FurnitureProp';
import { TREE_URLS } from './assets';

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

// Large flattened cones on the horizon read as distant mountains without
// needing real terrain assets — cheap and always reliable.
export function Mountains({ radius = 55, color = '#8A96A8' }) {
  const peaks = useMemo(() => {
    const count = 10;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.15;
      const r = radius + (i % 3) * 6;
      const height = 12 + (i % 4) * 5;
      return { x: Math.cos(angle) * r, z: Math.sin(angle) * r, height, radius: 9 + (i % 3) * 3 };
    });
  }, [radius]);
  return (
    <>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, p.height / 2 - 1, p.z]}>
          <coneGeometry args={[p.radius, p.height, 5]} />
          <meshStandardMaterial color={color} fog={false} />
        </mesh>
      ))}
    </>
  );
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

// Dense spiky grass blades (instanced for performance) scattered in a ring
// between the drivable area and the tree line — stylized rather than a
// flat green plane, closer to the reference's spiky-grass look.
export function GrassField({ innerRadius = 20, outerRadius = 32, count = 500, color = '#8FBF5A' }) {
  const blades = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = ((i * 2.4) % (Math.PI * 2));
      const r = innerRadius + ((i * 53) % Math.round((outerRadius - innerRadius) * 10)) / 10;
      const scale = 0.7 + ((i * 17) % 6) * 0.12;
      return {
        position: [Math.cos(angle) * r, 0.18 * scale, Math.sin(angle) * r],
        rotation: [0, (i * 2.1) % (Math.PI * 2), 0],
        scale,
      };
    });
  }, [innerRadius, outerRadius, count]);

  return (
    <Instances limit={count}>
      <coneGeometry args={[0.06, 0.36, 4]} />
      <meshStandardMaterial color={color} />
      {blades.map((b, i) => (
        <Instance key={i} position={b.position} rotation={b.rotation} scale={b.scale} />
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
