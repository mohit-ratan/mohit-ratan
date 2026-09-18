import { Suspense } from 'react';
import { useTexture } from '@react-three/drei';
import { mediaUrl } from '../api';
import { useRegisterInteractable } from './useInteraction';

function FrameTexture({ url }) {
  const texture = useTexture(url);
  return <meshStandardMaterial map={texture} />;
}

// One achievement's photo mounted on a small plinth — collidable (bump it)
// and interactable (get close, press E). Shared between RoomScene (one
// category, focused view) and HouseScene (all three, unified glass house).
export default function AchievementPlinth({ achievement, position, registryRef, onOpen, accent }) {
  const cover = achievement.coverPost;
  const isVideo = cover?.mediaType === 'video';

  useRegisterInteractable(registryRef, {
    position: { x: position[0], z: position[2] },
    radius: 0.6,
    label: `#${achievement.tag}`,
    onInteract: () => onOpen(achievement),
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.4, 0.45, 0.8, 12]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <planeGeometry args={[1.1, 1.1]} />
        {isVideo ? (
          <meshStandardMaterial color={accent} />
        ) : (
          <Suspense fallback={<meshStandardMaterial color={accent} />}>
            <FrameTexture url={mediaUrl(cover.mediaUrl)} />
          </Suspense>
        )}
      </mesh>
      <mesh position={[0, 1.3, -0.03]}>
        <boxGeometry args={[1.22, 1.22, 0.05]} />
        <meshStandardMaterial color={accent} />
      </mesh>
    </group>
  );
}
