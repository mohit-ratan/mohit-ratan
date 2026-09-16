// AI-style look engine, ported from the original PackSomeWork artifact.
//
// There's no external image-generation model reachable here, so this is
// the honest alternative: each "look" is a real client-side canvas
// transform (color grade, tint, vignette, grain, glow) applied to the
// actual uploaded photo. It changes how the photo looks; it does not
// redraw or reimagine what's in it.

export const LOOK_RECIPES = [
  {
    id: 'golden', label: 'Golden Hour', emoji: '🌅',
    words: ['golden hour', 'golden', 'sunset', 'sunrise', 'warm', 'summer', 'cozy', 'honey'],
    filter: 'saturate(1.3) contrast(1.08) brightness(1.06) sepia(.22) hue-rotate(-8deg)',
    tint: 'rgba(255,171,64,0.16)', vignette: 0,
  },
  {
    id: 'moody', label: 'Moody Blue', emoji: '🌙',
    words: ['moody', 'blue hour', 'cool', 'night', 'calm', 'cinematic', 'ocean', 'misty'],
    filter: 'saturate(1.05) contrast(1.14) brightness(0.94) hue-rotate(8deg)',
    tint: 'rgba(28,74,140,0.20)', vignette: 0.35,
  },
  {
    id: 'noir', label: 'Noir', emoji: '🎞️',
    words: ['noir', 'black and white', 'black-and-white', 'monochrome', 'vintage', 'classic', 'film', 'retro'],
    filter: 'grayscale(1) contrast(1.22) brightness(1.03)',
    tint: 'rgba(0,0,0,0)', vignette: 0.45, grain: true,
  },
  {
    id: 'neon', label: 'Neon', emoji: '⚡',
    words: ['neon', 'cyberpunk', 'futuristic', 'vibrant', 'electric', 'glow', 'synthwave'],
    filter: 'saturate(1.65) contrast(1.28) hue-rotate(-16deg)',
    tint: 'rgba(255,0,180,0.10)', vignette: 0.2, glow: true,
  },
  {
    id: 'dreamy', label: 'Dreamy', emoji: '☁️',
    words: ['dreamy', 'soft', 'pastel', 'romantic', 'ethereal', 'gentle', 'airy'],
    filter: 'saturate(0.92) brightness(1.14) contrast(0.9) blur(0.5px)',
    tint: 'rgba(214,178,255,0.16)', vignette: 0,
  },
  {
    id: 'bold', label: 'Bold', emoji: '🔥',
    words: ['bold', 'confident', 'dramatic', 'powerful', 'intense', 'fierce', 'strong'],
    filter: 'contrast(1.38) saturate(1.18) brightness(0.98)',
    tint: 'rgba(0,0,0,0)', vignette: 0.5,
  },
];

const CATEGORY_TINTS = {
  health: 'rgba(47,158,91,0.14)',
  wealth: 'rgba(43,108,176,0.14)',
  relationships: 'rgba(176,82,122,0.14)',
};

export function pickLookRecipe(description, categoryId) {
  const d = (description || '').toLowerCase();
  for (const r of LOOK_RECIPES) {
    if (r.words.some((w) => d.indexOf(w) !== -1)) return r;
  }
  return {
    id: 'default',
    filter: 'saturate(1.14) contrast(1.1) brightness(1.02)',
    tint: CATEGORY_TINTS[categoryId] || 'rgba(22,86,201,0.12)',
    vignette: 0.3,
  };
}

export function getRecipeById(id) {
  return LOOK_RECIPES.find((r) => r.id === id) || null;
}

export function applyLookToImage(file, recipe) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const maxDim = 1500;
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        const cw = Math.round(w * scale);
        const ch = Math.round(h * scale);
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');

        ctx.filter = recipe.filter;
        ctx.drawImage(img, 0, 0, cw, ch);
        ctx.filter = 'none';

        if (recipe.tint) {
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = recipe.tint;
          ctx.fillRect(0, 0, cw, ch);
          ctx.globalCompositeOperation = 'source-over';
        }

        if (recipe.glow) {
          const glowCanvas = document.createElement('canvas');
          glowCanvas.width = cw;
          glowCanvas.height = ch;
          const gctx = glowCanvas.getContext('2d');
          gctx.filter = 'brightness(1.5) saturate(1.6) blur(6px)';
          gctx.drawImage(canvas, 0, 0);
          ctx.globalAlpha = 0.35;
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(glowCanvas, 0, 0);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }

        if (recipe.vignette && recipe.vignette > 0) {
          const grad = ctx.createRadialGradient(
            cw / 2, ch / 2, Math.min(cw, ch) * 0.35,
            cw / 2, ch / 2, Math.max(cw, ch) * 0.72
          );
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, `rgba(0,0,0,${recipe.vignette})`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, cw, ch);
        }

        if (recipe.grain) {
          const gCanvas = document.createElement('canvas');
          const gSize = 90;
          gCanvas.width = gSize;
          gCanvas.height = gSize;
          const gc = gCanvas.getContext('2d');
          const imgData = gc.createImageData(gSize, gSize);
          for (let i = 0; i < imgData.data.length; i += 4) {
            const v = Math.floor(Math.random() * 255);
            imgData.data[i] = v;
            imgData.data[i + 1] = v;
            imgData.data[i + 2] = v;
            imgData.data[i + 3] = 28;
          }
          gc.putImageData(imgData, 0, 0);
          const pattern = ctx.createPattern(gCanvas, 'repeat');
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, cw, ch);
          ctx.globalCompositeOperation = 'source-over';
        }

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objUrl);
          if (!blob) {
            reject(new Error('Could not render the styled photo.'));
            return;
          }
          resolve(blob);
        }, 'image/jpeg', 0.92);
      } catch (err) {
        URL.revokeObjectURL(objUrl);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error('Could not read that image.'));
    };
    img.src = objUrl;
  });
}
