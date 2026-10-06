import { CustomUploadedStyle, StyleParameters } from '../types';

/**
 * Extracts dominant color palette and aesthetic parameters from any user-uploaded image
 */
export async function analyzeStyleImage(
  imageFile: File | Blob,
  customName: string
): Promise<CustomUploadedStyle> {
  const imageUrl = URL.createObjectURL(imageFile);
  const img = new Image();

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  const size = 128;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Color frequency map
  const colorBuckets: Record<string, { r: number; g: number; b: number; count: number }> = {};
  let totalSat = 0;
  let totalLum = 0;
  let sampleCount = 0;

  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;

    // Quantize into 32-value bins
    const qr = Math.round(r / 32) * 32;
    const qg = Math.round(g / 32) * 32;
    const qb = Math.round(b / 32) * 32;
    const key = `${qr},${qg},${qb}`;

    if (!colorBuckets[key]) {
      colorBuckets[key] = { r, g, b, count: 0 };
    }
    colorBuckets[key].count++;

    // Calculate saturation & lum
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const lum = (max + min) / 2;
    const sat = max === min ? 0 : lum > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);

    totalSat += sat;
    totalLum += lum;
    sampleCount++;
  }

  // Sort buckets by frequency
  const sorted = Object.values(colorBuckets).sort((a, b) => b.count - a.count);
  const dominant = sorted.slice(0, 6);

  // If fewer than 6, fill with defaults
  while (dominant.length < 6) {
    dominant.push({ r: 40, g: 40, b: 60, count: 1 });
  }

  // Convert to Hex strings
  const extractedColors = dominant.map((c) => rgbToHex(c.r, c.g, c.b));

  const avgSat = sampleCount > 0 ? (totalSat / sampleCount) * 100 : 50;
  const avgLum = sampleCount > 0 ? (totalLum / sampleCount) * 100 : 50;

  const parameters: StyleParameters = {
    edgeThreshold: 40,
    edgeThickness: 2,
    edgeDarkness: 75,
    colorBands: 6,
    smoothing: 6,
    saturation: Math.min(180, Math.max(80, Math.round(avgSat * 1.5))),
    contrast: 130,
    brightness: Math.round((avgLum - 50) * 0.4),
    bloomGlow: 35,
    halftoneDotSize: 0,
    pixelBlockSize: 1,
    sketchHatch: 0,
    paperGrain: 10,
    fpsThrottle: 24,
    colorTint: 'none',
    paletteExtract: extractedColors,
  };

  return {
    id: `custom_${Date.now()}`,
    name: customName || 'Custom Art Style',
    imageBlobUrl: imageUrl,
    extractedColors,
    parameters,
    createdAt: Date.now(),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
