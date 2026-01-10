import { Color } from '@/types';
import { rgbToHex, rgbToHsl, getColorName } from './utils';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

// K-means clustering for color extraction
export async function extractColors(imageUrl: string, colorCount: number = 5): Promise<Color[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Scale down for performance
        const maxDimension = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = getPixelArray(imageData.data);
        const dominantColors = kMeansClustering(pixels, colorCount);

        const colors: Color[] = dominantColors.map(rgb => {
          const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
          return {
            hex,
            rgb,
            hsl,
            name: getColorName(hex),
          };
        });

        resolve(colors);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

function getPixelArray(data: Uint8ClampedArray): RgbColor[] {
  const pixels: RgbColor[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip transparent pixels
    if (a < 128) continue;

    // Sample every 4th pixel for performance
    if (i % 16 === 0) {
      pixels.push({ r, g, b });
    }
  }

  return pixels;
}

function kMeansClustering(pixels: RgbColor[], k: number, maxIterations: number = 20): RgbColor[] {
  if (pixels.length === 0) {
    return Array(k).fill({ r: 128, g: 128, b: 128 });
  }

  if (pixels.length < k) {
    return pixels.concat(Array(k - pixels.length).fill(pixels[0] || { r: 128, g: 128, b: 128 }));
  }

  // Initialize centroids using k-means++ algorithm
  const centroids: RgbColor[] = initializeCentroids(pixels, k);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Assign pixels to clusters
    const clusters: RgbColor[][] = Array.from({ length: k }, () => []);

    for (const pixel of pixels) {
      let minDistance = Infinity;
      let closestCentroid = 0;

      for (let i = 0; i < centroids.length; i++) {
        const distance = colorDistance(pixel, centroids[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = i;
        }
      }

      clusters[closestCentroid].push(pixel);
    }

    // Update centroids
    let converged = true;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;

      const newCentroid = averageColor(clusters[i]);
      if (colorDistance(newCentroid, centroids[i]) > 1) {
        converged = false;
      }
      centroids[i] = newCentroid;
    }

    if (converged) break;
  }

  // Sort by luminance (brightness)
  return centroids.sort((a, b) => {
    const lumA = 0.299 * a.r + 0.587 * a.g + 0.114 * a.b;
    const lumB = 0.299 * b.r + 0.587 * b.g + 0.114 * b.b;
    return lumB - lumA;
  });
}

function initializeCentroids(pixels: RgbColor[], k: number): RgbColor[] {
  const centroids: RgbColor[] = [];

  // Choose first centroid randomly
  centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);

  // Choose remaining centroids with probability proportional to distance
  while (centroids.length < k) {
    const distances: number[] = pixels.map(pixel => {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = colorDistance(pixel, centroid);
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    });

    const totalDistance = distances.reduce((a, b) => a + b, 0);
    if (totalDistance === 0) {
      centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
      continue;
    }

    let random = Math.random() * totalDistance;
    for (let i = 0; i < pixels.length; i++) {
      random -= distances[i];
      if (random <= 0) {
        centroids.push(pixels[i]);
        break;
      }
    }
  }

  return centroids;
}

function colorDistance(c1: RgbColor, c2: RgbColor): number {
  // Weighted Euclidean distance for perceptual similarity
  const rmean = (c1.r + c2.r) / 2;
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;

  return Math.sqrt(
    (2 + rmean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rmean) / 256) * db * db
  );
}

function averageColor(colors: RgbColor[]): RgbColor {
  if (colors.length === 0) {
    return { r: 128, g: 128, b: 128 };
  }

  const sum = colors.reduce(
    (acc, color) => ({
      r: acc.r + color.r,
      g: acc.g + color.g,
      b: acc.b + color.b,
    }),
    { r: 0, g: 0, b: 0 }
  );

  return {
    r: Math.round(sum.r / colors.length),
    g: Math.round(sum.g / colors.length),
    b: Math.round(sum.b / colors.length),
  };
}

export function createColorFromRgb(r: number, g: number, b: number): Color {
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  return {
    hex,
    rgb: { r, g, b },
    hsl,
    name: getColorName(hex),
  };
}
