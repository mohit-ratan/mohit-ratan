import { useGLTF } from '@react-three/drei';
import { useRegisterInteractable } from './useInteraction';

// Loads one Kenney furniture .glb and drops it at a position — used for
// ambient decor scattered around each open-world room. Collidable (no
// label/onInteract) so the car bumps it instead of driving through it.
export default function FurnitureProp({ url, position, rotation = [0, 0, 0], scale = 1, registryRef, radius = 0.7 }) {
  const { scene } = useGLTF(url);

  useRegisterInteractable(registryRef, {
    position: { x: position[0], z: position[2] },
    radius,
  });

  return <primitive object={scene.clone()} position={position} rotation={rotation} scale={scale} />;
}
