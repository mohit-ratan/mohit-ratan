import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import CarController from './CarController';
import FurnitureProp from './FurnitureProp';
import AchievementPlinth from './AchievementPlinth';
import { FURNITURE_URLS } from './assets';
import { SkyDome, Mountains, TreeRing, BirdFlock, GrassField, GroundDebris, NaturalGround, CheckeredEdge, isNightNow } from './Environment';
import WaterFeature from './WaterFeature';
import { useInteractionRegistry, useProximityInteraction } from './useInteraction';
import { CATEGORIES, CAT_MAP } from '../lib/format';

const CATEGORY_COLORS = { health: '#2F9E5B', wealth: '#2B6CB0', relationships: '#B0527A' };
const ROAD_COLOR = '#6B6B70';
const FOG_COLOR_DAY = '#BFE3F5';
const FOG_COLOR_NIGHT = '#0B1330';

const ZONE_WIDTH = 13;
const ZONE_DEPTH = 11;
const ZONE_CENTER_Z = -8;
const WALL_HEIGHT = 2.6;
const ZONE_OFFSETS = { health: -16, wealth: 0, relationships: 16 };
export const WORLD_SIZE = 90;

function GlassWall({ position, rotation, width, height, color }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshPhysicalMaterial color={color} transparent opacity={0.22} roughness={0.15} metalness={0.05} side={THREE.DoubleSide} />
    </mesh>
  );
}

function plinthPositionInZone(zoneX, index) {
  const cols = 3;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return [zoneX + (col - 1) * 3.4, 0, ZONE_CENTER_Z - 3 + row * 3.2];
}

function ExteriorSign({ category, position, count, accent }) {
  const cat = CAT_MAP[category];
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1.7, 2, 0.12]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      <Text position={[0, 1, 0.08]} fontSize={0.22} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={1.4} textAlign="center">
        {`${cat.label}\n${count} achievement${count === 1 ? '' : 's'}`}
      </Text>
    </group>
  );
}

// One open-plan glass room, its exterior summary sign, and its achievement
// plinths — the sign is a legible at-a-glance summary before driving in,
// not a gate: the walls are transparent regardless, nothing is hidden.
function GlassZone({ category, achievements, registryRef, onOpen }) {
  const accent = CATEGORY_COLORS[category];
  const x = ZONE_OFFSETS[category];
  const halfW = ZONE_WIDTH / 2;
  const halfD = ZONE_DEPTH / 2;
  const cat = CAT_MAP[category];

  return (
    <>
      <group position={[x, 0, ZONE_CENTER_Z]}>
        <GlassWall position={[0, WALL_HEIGHT / 2, -halfD]} rotation={[0, 0, 0]} width={ZONE_WIDTH} height={WALL_HEIGHT} color={accent} />
        <GlassWall position={[-halfW, WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} width={ZONE_DEPTH} height={WALL_HEIGHT} color={accent} />
        <GlassWall position={[halfW, WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} width={ZONE_DEPTH} height={WALL_HEIGHT} color={accent} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[ZONE_WIDTH, ZONE_DEPTH]} />
          <meshStandardMaterial color={accent} transparent opacity={0.12} />
        </mesh>
        <Text position={[0, WALL_HEIGHT + 0.5, -halfD + 0.1]} fontSize={0.5} color={accent} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#ffffff">
          {cat.label}
        </Text>
      </group>

      <ExteriorSign category={category} position={[x, 0, ZONE_CENTER_Z + halfD + 3]} count={achievements.length} accent={accent} />

      {achievements.map((a, i) => (
        <AchievementPlinth
          key={a.tag}
          achievement={a}
          position={plinthPositionInZone(x, i)}
          registryRef={registryRef}
          onOpen={onOpen}
          accent={accent}
        />
      ))}
    </>
  );
}

const DECOR_URLS = [FURNITURE_URLS.plant, FURNITURE_URLS.lamp, FURNITURE_URLS.sideTable];

function ZoneDecor({ category, count, registryRef }) {
  const x = ZONE_OFFSETS[category];
  const items = count >= 3 ? DECOR_URLS.length : count >= 1 ? 1 : 0;
  const positions = [
    [x - 5.6, 0, ZONE_CENTER_Z - 4.6],
    [x + 5.6, 0, ZONE_CENTER_Z - 4.6],
    [x - 5.6, 0, ZONE_CENTER_Z + 4.2],
  ];
  return (
    <Suspense fallback={null}>
      {DECOR_URLS.slice(0, items).map((url, i) => (
        <FurnitureProp key={url} url={url} position={positions[i]} registryRef={registryRef} />
      ))}
    </Suspense>
  );
}

// The unified glass house — three open-plan rooms (health/wealth/
// relationships) under one shared glass roof, each with an exterior sign
// and its achievements inside, no doors/tight navigation: drive freely in
// and out of any room. Plus the full outdoor environment (day/night sky,
// mountains, trees, birds) around it.
export default function HouseScene({ achievements, onOpen, onFocusChange }) {
  const night = isNightNow();
  const registryRef = useInteractionRegistry();
  const carPosRef = useRef({ x: 0, z: 14 });
  const focusedLabel = useProximityInteraction(registryRef, carPosRef, { enabled: true });

  useEffect(() => {
    onFocusChange?.(focusedLabel);
  }, [focusedLabel, onFocusChange]);

  const byCategory = { health: [], wealth: [], relationships: [] };
  for (const a of achievements) (byCategory[a.category] || byCategory.health).push(a);

  const bounds = {
    minX: -WORLD_SIZE / 2 + 2,
    maxX: WORLD_SIZE / 2 - 2,
    minZ: -WORLD_SIZE / 2 + 2,
    maxZ: WORLD_SIZE / 2 - 2,
  };

  const roofWidth = (ZONE_OFFSETS.relationships - ZONE_OFFSETS.health) + ZONE_WIDTH + 2;

  return (
    <>
      <SkyDome night={night} />
      <fog attach="fog" args={[night ? FOG_COLOR_NIGHT : FOG_COLOR_DAY, 30, 68]} />
      <ambientLight intensity={night ? 0.35 : 0.85} />
      <directionalLight position={[14, 20, 10]} intensity={night ? 0.25 : 0.9} />

      <Mountains radius={68} />
      <TreeRing innerRadius={32} outerRadius={44} count={30} />
      <GrassField innerRadius={26} outerRadius={40} count={600} />
      <BirdFlock count={6} />
      <WaterFeature position={[34, 0, 26]} size={8} registryRef={registryRef} />

      <NaturalGround size={WORLD_SIZE} segments={60} />
      <GroundDebris area={WORLD_SIZE - 20} count={110} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 5]}>
        <planeGeometry args={[roofWidth, 20]} />
        <meshStandardMaterial color={ROAD_COLOR} />
      </mesh>
      <CheckeredEdge axis="z" from={-5} to={15} cross={-roofWidth / 2 - 0.6} />
      <CheckeredEdge axis="z" from={-5} to={15} cross={roofWidth / 2 + 0.6} />

      {/* Shared glass roof ties the three rooms together as one house. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT + 0.1, ZONE_CENTER_Z]}>
        <planeGeometry args={[roofWidth, ZONE_DEPTH + 1]} />
        <meshPhysicalMaterial color="#EAF4FC" transparent opacity={0.18} roughness={0.1} side={THREE.DoubleSide} />
      </mesh>

      {CATEGORIES.map((c) => (
        <GlassZone key={c.id} category={c.id} achievements={byCategory[c.id]} registryRef={registryRef} onOpen={onOpen} />
      ))}
      {CATEGORIES.map((c) => (
        <ZoneDecor key={c.id} category={c.id} count={byCategory[c.id].length} registryRef={registryRef} />
      ))}

      <CarController bounds={bounds} carPosRef={carPosRef} registryRef={registryRef} />
    </>
  );
}
