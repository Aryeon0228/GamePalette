import type { Color } from '@/types';
import { colorFromHex, generateShades, generateTints, normalizeHex } from './colorAnalysis';
import { generateColorHarmonies } from './colorVision';

function colorKey(hex: string): string {
  return normalizeHex(hex) ?? hex.toUpperCase();
}

/**
 * Resize a working palette without changing its existing colors or their order.
 * Counts are truncated and clamped to 1..32; NaN keeps the existing size (or 1).
 * Candidate order is independent of count, so growing by one keeps earlier fills.
 */
export function resizePaletteColors(source: Color[], count: number, fallbackHex: string): Color[] {
  const requested = Number.isNaN(count) ? source.length || 1 : Math.trunc(count);
  const target = Math.max(1, Math.min(32, requested));
  const result = source.slice(0, target);
  if (result.length === target) return result;

  const seen = new Set(result.map((color) => colorKey(color.hex)));
  const append = (color: Color) => {
    const key = colorKey(color.hex);
    if (result.length < target && !seen.has(key)) {
      result.push(color);
      seen.add(key);
    }
  };
  const picked = colorFromHex(fallbackHex);
  if (result.length === 0) append(picked);

  const seedKeys = Array.from(new Set([picked.hex, ...source.map((color) => colorKey(color.hex))]));
  const seeds = seedKeys.map(colorFromHex);
  for (const seed of seeds) {
    const tints = generateTints(seed, 3);
    const shades = generateShades(seed, 3);
    const harmonies = generateColorHarmonies(seed.hex);
    const analogous = harmonies.find((item) => item.type === 'analogous')!;
    const complement = harmonies.find((item) => item.type === 'complementary')!;
    const candidates = [
      tints[1], shades[1],
      colorFromHex(analogous.colors[0].hex), colorFromHex(analogous.colors[2].hex),
      tints[2], shades[2], colorFromHex(complement.colors[1].hex), tints[3], shades[3],
    ];
    for (const candidate of candidates) append(candidate);
    if (result.length === target) return result;
  }

  // A denser value ramp fills larger palettes, including pure black/white/gray.
  // At least one direction spans >=127 channel values, supplying 32 distinct
  // steps even when the opposite direction or hue harmonies produce duplicates.
  const tints = generateTints(picked, 32);
  const shades = generateShades(picked, 32);
  for (let step = 1; step <= 32 && result.length < target; step++) {
    append(tints[step]);
    append(shades[step]);
  }
  return result;
}
