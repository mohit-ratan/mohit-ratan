import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import HouseInterior from './HouseInterior';

const CAMERA = { position: [0, 1.6, 2.5], fov: 62 };
export default function AchievementRoom({ paused, ...props }) {
  return <Canvas camera={CAMERA}><Suspense fallback={null}>{!paused && <HouseInterior {...props} />}</Suspense></Canvas>;
}
