import { Color } from '@/types';
import { rgbToHex, rgbToHsl, getColorName } from './utils';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface HslColor {
  h: number;
  s: number;
  l: number;
}

interface PixelData {
  rgb: RgbColor;
  hsl: HslColor;
}

interface HueBin {
  hue: number;
  count: number;
  pixels: PixelData[];
}

// Hue histogram-based color extraction
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
        const pixels = getPixelDataArray(imageData.data);

        // Use Hue histogram-based extraction
        const dominantColors = extractColorsFromHueHistogram(pixels, colorCount);

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

function getPixelDataArray(data: Uint8ClampedArray): PixelData[] {
  const pixels: PixelData[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip transparent pixels
    if (a < 128) continue;

    // Sample every 4th pixel for performance
    if (i % 16 === 0) {
      const hsl = rgbToHslInternal(r, g, b);
      pixels.push({
        rgb: { r, g, b },
        hsl
      });
    }
  }

  return pixels;
}

function rgbToHslInternal(r: number, g: number, b: number): HslColor {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function extractColorsFromHueHistogram(pixels: PixelData[], colorCount: number): RgbColor[] {
  if (pixels.length === 0) {
    return Array(colorCount).fill({ r: 128, g: 128, b: 128 });
  }

  // Separate chromatic and achromatic pixels
  const chromaticPixels: PixelData[] = [];
  const achromaticPixels: PixelData[] = [];

  for (const pixel of pixels) {
    // Low saturation or extreme lightness = achromatic (grayscale)
    if (pixel.hsl.s < 15 || pixel.hsl.l < 10 || pixel.hsl.l > 90) {
      achromaticPixels.push(pixel);
    } else {
      chromaticPixels.push(pixel);
    }
  }

  // Build Hue histogram (36 bins, each covering 10 degrees)
  const binCount = 36;
  const binSize = 360 / binCount;
  const histogram: HueBin[] = Array.from({ length: binCount }, (_, i) => ({
    hue: i * binSize + binSize / 2,
    count: 0,
    pixels: []
  }));

  for (const pixel of chromaticPixels) {
    const binIndex = Math.floor(pixel.hsl.h / binSize) % binCount;
    histogram[binIndex].count++;
    histogram[binIndex].pixels.push(pixel);
  }

  // Smooth histogram to reduce noise (moving average)
  const smoothedCounts = smoothHistogram(histogram.map(b => b.count));

  // Find peaks in the histogram
  const peaks = findPeaks(smoothedCounts, histogram);

  // Sort peaks by count (descending)
  peaks.sort((a, b) => b.count - a.count);

  // Calculate total chromatic pixels
  const totalChromatic = chromaticPixels.length;
  const minThreshold = totalChromatic * 0.02; // 2% minimum threshold

  // Select colors: prioritize high-frequency peaks, ensure minimum threshold inclusion
  const selectedBins: HueBin[] = [];
  const usedHues: number[] = [];

  // First pass: include all peaks above minimum threshold
  for (const peak of peaks) {
    if (peak.count >= minThreshold && selectedBins.length < colorCount) {
      // Check if this hue is too close to already selected hues
      let tooClose = false;
      for (const usedHue of usedHues) {
        const hueDiff = Math.min(
          Math.abs(peak.hue - usedHue),
          360 - Math.abs(peak.hue - usedHue)
        );
        if (hueDiff < 30) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        selectedBins.push(peak);
        usedHues.push(peak.hue);
      }
    }
  }

  // Second pass: fill remaining slots with weighted selection
  for (const peak of peaks) {
    if (selectedBins.length >= colorCount) break;
    if (selectedBins.includes(peak)) continue;

    let tooClose = false;
    for (const usedHue of usedHues) {
      const hueDiff = Math.min(
        Math.abs(peak.hue - usedHue),
        360 - Math.abs(peak.hue - usedHue)
      );
      if (hueDiff < 20) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose && peak.pixels.length > 0) {
      selectedBins.push(peak);
      usedHues.push(peak.hue);
    }
  }

  // Convert selected bins to representative colors
  const colors: RgbColor[] = selectedBins.map(bin => {
    return getRepresentativeColor(bin.pixels);
  });

  // Add achromatic color if we have space and significant achromatic pixels
  if (colors.length < colorCount && achromaticPixels.length > pixels.length * 0.1) {
    const achromaticColor = getRepresentativeColor(achromaticPixels);
    colors.push(achromaticColor);
  }

  // Fill remaining slots with variance-based subdivision
  while (colors.length < colorCount) {
    if (chromaticPixels.length > 0) {
      // Find the bin with highest variance and split it
      const remainingPeaks = peaks.filter(p => !selectedBins.includes(p) && p.pixels.length > 0);
      if (remainingPeaks.length > 0) {
        const nextPeak = remainingPeaks[0];
        colors.push(getRepresentativeColor(nextPeak.pixels));
        selectedBins.push(nextPeak);
      } else {
        // Fallback: use K-means on remaining pixels
        colors.push({ r: 128, g: 128, b: 128 });
      }
    } else {
      colors.push({ r: 128, g: 128, b: 128 });
    }
  }

  // Sort by luminance (brightness)
  return colors.slice(0, colorCount).sort((a, b) => {
    const lumA = 0.299 * a.r + 0.587 * a.g + 0.114 * a.b;
    const lumB = 0.299 * b.r + 0.587 * b.g + 0.114 * b.b;
    return lumB - lumA;
  });
}

function smoothHistogram(counts: number[]): number[] {
  const smoothed: number[] = [];
  const windowSize = 3;

  for (let i = 0; i < counts.length; i++) {
    let sum = 0;
    let count = 0;

    for (let j = -windowSize; j <= windowSize; j++) {
      const idx = (i + j + counts.length) % counts.length;
      sum += counts[idx];
      count++;
    }

    smoothed.push(sum / count);
  }

  return smoothed;
}

function findPeaks(smoothedCounts: number[], histogram: HueBin[]): HueBin[] {
  const peaks: HueBin[] = [];
  const n = smoothedCounts.length;

  for (let i = 0; i < n; i++) {
    const prev = smoothedCounts[(i - 1 + n) % n];
    const curr = smoothedCounts[i];
    const next = smoothedCounts[(i + 1) % n];

    // Local maximum: current is greater than or equal to neighbors
    if (curr >= prev && curr >= next && curr > 0) {
      // Merge nearby bins for this peak
      const peakBin: HueBin = {
        hue: histogram[i].hue,
        count: histogram[i].count,
        pixels: [...histogram[i].pixels]
      };

      // Include adjacent bins if they're part of the same peak
      const prevIdx = (i - 1 + n) % n;
      const nextIdx = (i + 1) % n;

      if (smoothedCounts[prevIdx] > smoothedCounts[i] * 0.5) {
        peakBin.count += histogram[prevIdx].count;
        peakBin.pixels.push(...histogram[prevIdx].pixels);
      }
      if (smoothedCounts[nextIdx] > smoothedCounts[i] * 0.5) {
        peakBin.count += histogram[nextIdx].count;
        peakBin.pixels.push(...histogram[nextIdx].pixels);
      }

      peaks.push(peakBin);
    }
  }

  return peaks;
}

function getRepresentativeColor(pixels: PixelData[]): RgbColor {
  if (pixels.length === 0) {
    return { r: 128, g: 128, b: 128 };
  }

  // Weight by saturation - more saturated colors are more "representative"
  let totalWeight = 0;
  let sumR = 0, sumG = 0, sumB = 0;

  for (const pixel of pixels) {
    // Weight: saturation gives more weight to vivid colors
    const weight = 1 + (pixel.hsl.s / 100);
    totalWeight += weight;
    sumR += pixel.rgb.r * weight;
    sumG += pixel.rgb.g * weight;
    sumB += pixel.rgb.b * weight;
  }

  return {
    r: Math.round(sumR / totalWeight),
    g: Math.round(sumG / totalWeight),
    b: Math.round(sumB / totalWeight)
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
