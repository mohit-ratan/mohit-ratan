import { EffectComposer, Bloom, Vignette, DepthOfField, BrightnessContrast, HueSaturation } from '@react-three/postprocessing';

// The single biggest lever for a "toy diorama" feel instead of a flat
// engineering-demo render: soft bloom on bright surfaces, a darkened
// vignette to focus the eye toward the car, a touch of depth-of-field so
// the middle distance goes soft the way a close chase-cam reads on a real
// lens, and a small saturation/contrast lift so colors pop the way a
// baked/painted low-poly scene does instead of raw PBR flatness.
export default function PostFX() {
  return (
    <EffectComposer multisampling={0}>
      <DepthOfField focusDistance={0.012} focalLength={0.04} bokehScale={2.2} height={480} />
      <Bloom intensity={0.55} luminanceThreshold={0.35} luminanceSmoothing={0.25} mipmapBlur />
      <HueSaturation saturation={0.18} />
      <BrightnessContrast brightness={0.02} contrast={0.08} />
      <Vignette eskil={false} offset={0.25} darkness={0.55} />
    </EffectComposer>
  );
}
