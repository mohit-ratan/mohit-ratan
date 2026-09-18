import { useGLTF } from '@react-three/drei';

// Loads one Kenney furniture .glb and drops it at a position — used for
// ambient decor scattered around each open-world room.
export default function FurnitureProp({ url, position, rotation = [0, 0, 0], scale = 1 }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene.clone()} position={position} rotation={rotation} scale={scale} />;
}
