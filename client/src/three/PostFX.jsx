import { EffectComposer, Bloom, Vignette, BrightnessContrast, HueSaturation } from '@react-three/postprocessing';

// Soft bloom on bright surfaces, a darkened vignette to focus the eye
// toward the car, and a small saturation/contrast lift so colors pop the
// way a baked/painted low-poly scene does instead of raw PBR flatness.
// (Depth-of-field was tried and dropped — a fixed focus distance doesn't
// track a moving chase-cam target, so it just blurred the car and nearby
// grass along with everything else, which made driving harder to read.)
export default function PostFX() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.5} luminanceThreshold={0.4} luminanceSmoothing={0.25} mipmapBlur />
      <HueSaturation saturation={0.15} />
      <BrightnessContrast brightness={0.02} contrast={0.06} />
      <Vignette eskil={false} offset={0.22} darkness={0.42} />
    </EffectComposer>
  );
}
