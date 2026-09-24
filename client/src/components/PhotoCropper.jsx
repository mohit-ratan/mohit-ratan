import { useCallback, useRef, useState } from 'react';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// A minimal Instagram-style reposition tool: drag the photo within a
// fixed-aspect frame to choose which part shows once it's cropped to that
// shape. This doesn't add a new crop — object-fit:cover already crops
// every post to its frame everywhere it's displayed; this just lets the
// person choose WHERE within that crop, instead of always the center.
export default function PhotoCropper({ src, aspect, pan, onPanChange, filter }) {
  const frameRef = useRef(null);
  const dragState = useRef(null);
  const [naturalSize, setNaturalSize] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = useCallback((e) => {
    if (!naturalSize || !frameRef.current) return;
    frameRef.current.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, startPan: pan };
    setDragging(true);
  }, [naturalSize, pan]);

  const handlePointerMove = useCallback((e) => {
    if (!dragState.current || !frameRef.current || !naturalSize) return;
    const frameRect = frameRef.current.getBoundingClientRect();
    const frameAspect = frameRect.width / frameRect.height;
    const imgAspect = naturalSize.w / naturalSize.h;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;

    let nextX = dragState.current.startPan.x;
    let nextY = dragState.current.startPan.y;
    if (imgAspect > frameAspect) {
      const overflowPx = frameRect.height * imgAspect - frameRect.width;
      if (overflowPx > 0) nextX = clamp(dragState.current.startPan.x - (dx / overflowPx) * 100, 0, 100);
    } else if (imgAspect < frameAspect) {
      const overflowPx = frameRect.width / imgAspect - frameRect.height;
      if (overflowPx > 0) nextY = clamp(dragState.current.startPan.y - (dy / overflowPx) * 100, 0, 100);
    }
    onPanChange({ x: nextX, y: nextY });
  }, [naturalSize, onPanChange]);

  const endDrag = useCallback((e) => {
    if (frameRef.current?.hasPointerCapture?.(e.pointerId)) frameRef.current.releasePointerCapture(e.pointerId);
    dragState.current = null;
    setDragging(false);
  }, []);

  return (
    <div
      ref={frameRef}
      className={`photo-cropper${dragging ? ' dragging' : ''}`}
      style={{ aspectRatio: aspect }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        onLoad={(e) => setNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
        style={{ objectPosition: `${pan.x}% ${pan.y}%`, ...(filter ? { filter } : null) }}
      />
      <span className="photo-cropper-hint" aria-hidden="true">Drag to reposition</span>
    </div>
  );
}
