import { Color } from '@/types';
import {
  getColorName,
  hexToRgb,
  rgbToHsl,
  contrastRatio,
} from './utils';

/**
 * Helpers for the single-color analyzer: building Color objects, tint/shade/
 * tone ramps, temperature classification, best text color and the hue family
 * used to look up psychology/usage copy.
 */

/** Build a full Color object from any #RRGGBB hex string. */
export function colorFromHex(hex: string): Color {
  const normalized = normalizeHex(hex) ?? '#000000';
  const rgb = hexToRgb(normalized);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return {
    hex: normalized,
    rgb,
    hsl,
    name: getColorName(normalized),
  };
}

/** Normalize loose input (#fff, fff, #FFFFFF, ffffff) to #RRGGBB, or null. */
export function normalizeHex(input: string): string | null {
  let v = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(v)) {
    v = v.split('').map((c) => c + c).join('');
  }
  if (/^[0-9a-fA-F]{6}$/.test(v)) {
    return ('#' + v).toUpperCase();
  }
  return null;
}

export function randomHex(): string {
  const n = Math.floor(Math.random() * 0xffffff);
  return '#' + n.toString(16).padStart(6, '0').toUpperCase();
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixToward(base: Color, target: { r: number; g: number; b: number }, t: number): Color {
  const r = Math.round(lerp(base.rgb.r, target.r, t));
  const g = Math.round(lerp(base.rgb.g, target.g, t));
  const b = Math.round(lerp(base.rgb.b, target.b, t));
  const hex =
    '#' +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  return {
    hex,
    rgb: { r, g, b },
    hsl: rgbToHsl(r, g, b),
    name: getColorName(hex),
  };
}

/** Steps mixing the base color toward white (lighter, washed out). */
export function generateTints(base: Color, steps = 5): Color[] {
  const out: Color[] = [base];
  for (let i = 1; i <= steps; i++) {
    out.push(mixToward(base, { r: 255, g: 255, b: 255 }, (i / (steps + 1))));
  }
  return out;
}

/** Steps mixing the base color toward black (darker, deeper). */
export function generateShades(base: Color, steps = 5): Color[] {
  const out: Color[] = [base];
  for (let i = 1; i <= steps; i++) {
    out.push(mixToward(base, { r: 0, g: 0, b: 0 }, (i / (steps + 1))));
  }
  return out;
}

/** Steps mixing the base color toward mid-gray (muted, desaturated). */
export function generateTones(base: Color, steps = 5): Color[] {
  const out: Color[] = [base];
  for (let i = 1; i <= steps; i++) {
    out.push(mixToward(base, { r: 128, g: 128, b: 128 }, (i / (steps + 1))));
  }
  return out;
}

export type Temperature = 'warm' | 'cool' | 'neutral';

/** Rough perceptual temperature from hue + saturation. */
export function colorTemperature(color: Color): Temperature {
  const { h, s, l } = color.hsl;
  if (s < 10 || l < 6 || l > 96) return 'neutral';
  if (h < 90 || h >= 300) return 'warm';
  if (h >= 150 && h < 270) return 'cool';
  return 'neutral';
}

/** Best readable text color (#000/#fff) over this background. */
export function bestTextColor(hex: string): '#000000' | '#FFFFFF' {
  return contrastRatio(hex, '#FFFFFF') >= contrastRatio(hex, '#000000')
    ? '#FFFFFF'
    : '#000000';
}

export interface ContrastResult {
  ratio: number;
  aaNormal: boolean; // >= 4.5
  aaLarge: boolean; // >= 3
  aaaNormal: boolean; // >= 7
}

export function contrastReport(hex: string, against: string): ContrastResult {
  const ratio = contrastRatio(hex, against);
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
  };
}

export type HueFamily =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'magenta'
  | 'neutral';

/** Bucket a color into a hue family for psychology/usage lookup. */
export function hueFamily(color: Color): HueFamily {
  const { h, s, l } = color.hsl;
  if (s < 10 || l < 8 || l > 94) return 'neutral';
  if (h < 15 || h >= 345) return 'red';
  if (h < 45) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 160) return 'green';
  if (h < 195) return 'cyan';
  if (h < 255) return 'blue';
  if (h < 290) return 'purple';
  return 'magenta';
}
