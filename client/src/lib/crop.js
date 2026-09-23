// Renders exactly the window an object-fit:cover + object-position pan
// shows for a given frame aspect ratio — same math as the CSS the
// PhotoCropper preview uses, so what's dragged into view in the composer
// is exactly what gets uploaded, not a re-guessed crop.
export function cropImageToFrame(file, aspect, pan) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;
        const naturalAspect = naturalW / naturalH;

        let srcX = 0, srcY = 0, srcW = naturalW, srcH = naturalH;
        if (naturalAspect > aspect) {
          srcH = naturalH;
          srcW = naturalH * aspect;
          srcX = (naturalW - srcW) * (pan.x / 100);
        } else if (naturalAspect < aspect) {
          srcW = naturalW;
          srcH = naturalW / aspect;
          srcY = (naturalH - srcH) * (pan.y / 100);
        }

        const MAX_EDGE = 1600;
        const outW = aspect >= 1 ? MAX_EDGE : Math.round(MAX_EDGE * aspect);
        const outH = aspect >= 1 ? Math.round(MAX_EDGE / aspect) : MAX_EDGE;

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        canvas.getContext('2d').drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob); else reject(new Error('Could not process that image.'));
        }, 'image/jpeg', 0.92);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load that image.')); };
    img.src = url;
  });
}

export const ASPECT_RATIO_NUMBERS = { square: 1, portrait: 4 / 5, landscape: 16 / 9 };
