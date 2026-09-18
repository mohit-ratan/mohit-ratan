// Plain DOM overlay (not a 3D object) — shows a driving hint and, once
// close enough to something interactable, an "E — <label>" prompt.
export default function Crosshair({ focusedLabel }) {
  return (
    <div className="three-hint-overlay">
      {focusedLabel ? (
        <div className="three-crosshair-prompt">E · {focusedLabel}</div>
      ) : (
        <div className="three-drive-hint">WASD to drive</div>
      )}
    </div>
  );
}
