// Plain DOM overlay (not a 3D object) — a center-screen dot plus a context
// prompt, rendered over the <Canvas>.
export default function Crosshair({ locked, focusedLabel }) {
  return (
    <div className="three-crosshair-overlay">
      <div className="three-crosshair-dot" />
      {!locked && <div className="three-crosshair-prompt">Click to look around · WASD to move</div>}
      {locked && focusedLabel && <div className="three-crosshair-prompt">E · {focusedLabel}</div>}
    </div>
  );
}
