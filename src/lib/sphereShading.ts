import type { Color } from '@/types';
import { colorFromHex } from './colorAnalysis';
import { hueShiftForIntensity } from './coldwarm';
import { rgbToHex } from './utils';

export type SphereShadingMode = 'normal' | 'coldwarm';

export interface SphereShadingStudy {
  mode: SphereShadingMode;
  /** The selected material color, preserved exactly at position zero. */
  base: Color;
  light: Color;
  shadow: Color;
  highlight: Color;
  /** Reflected light on the shadow side, between shadow and base. */
  bounce: Color;
  /** Nine equally spaced anchors from shadow (-1) through base (0) to highlight (+1). */
  ramp: Color[];
}

type Rgb = Color['rgb'];
const HALF_STEPS = 4;
// Match the temperature poles and normal-strength limit of the Coldwarm grid.
const WARM_HUE = 40;
const COOL_HUE = 220;
const MAX_HUE_SHIFT = hueShiftForIntensity('normal');

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function luminance(rgb: Rgb): number {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
}

/** Keep fractional channels until the final swatch conversion. */
function hslToFloatRgb(hue: number, saturation: number, lightness: number): Rgb {
  const h = ((hue % 360) + 360) % 360 / 60;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(h % 2 - 1));
  const offset = lightness - chroma / 2;
  const sectors = [
    [chroma, x, 0], [x, chroma, 0], [0, chroma, x],
    [0, x, chroma], [x, 0, chroma], [chroma, 0, x],
  ];
  const [r, g, b] = sectors[Math.min(5, Math.floor(h))];
  return { r: (r + offset) * 255, g: (g + offset) * 255, b: (b + offset) * 255 };
}

function floatHsl(rgb: Rgb): { hue: number; saturation: number; chroma: number } {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lightness = (max + min) / 2;
  if (chroma === 0) return { hue: 0, saturation: 0, chroma: 0 };
  const sector = max === r ? (g - b) / chroma : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
  return {
    hue: ((sector * 60) % 360 + 360) % 360,
    saturation: chroma / (1 - Math.abs(2 * lightness - 1)),
    chroma,
  };
}

function normalLighting(base: Rgb, position: number): Rgb {
  // Darken within the source color. Diffuse light stays restrained, with the
  // steeper lift reserved for the highlight at the end of the positive range.
  const amount = position < 0
    ? 0.8 * (-position) ** 0.8
    : 0.16 * position + 0.58 * position ** 3;
  const target = position < 0 ? 0 : 255;
  return {
    r: base.r + (target - base.r) * amount,
    g: base.g + (target - base.g) * amount,
    b: base.b + (target - base.b) * amount,
  };
}

function temperatureLighting(base: Rgb, normal: Rgb, position: number): Rgb {
  const material = floatHsl(base);
  const pole = position > 0 ? WARM_HUE : COOL_HUE;
  const shortestDelta = ((pole - material.hue + 540) % 360) - 180;
  const chromaWeight = Math.min(1, material.chroma / 0.12);
  const amount = Math.abs(position);
  const shiftedHue = material.hue + clamp(shortestDelta, -MAX_HUE_SHIFT, MAX_HUE_SHIFT) * amount;
  // Gray has no material hue. Fade toward the explicit light color instead of
  // treating its conventional H=0 as red; near-gray inputs transition smoothly.
  const toPole = ((pole - shiftedHue + 540) % 360) - 180;
  const hue = shiftedHue + toPole * (1 - chromaWeight);
  const neutralTint = (1 - chromaWeight) * amount;
  const saturation = clamp(
    floatHsl(normal).saturation * (1 + position * 0.08) * (1 - neutralTint) + 0.10 * neutralTint,
    0, 1,
  );
  const targetLuminance = luminance(normal);

  // Temperature changes perceived brightness (especially yellow -> orange).
  // Match the normal-lighting luminance so warming cannot invert the light ramp.
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 22; iteration++) {
    const middle = (low + high) / 2;
    if (luminance(hslToFloatRgb(hue, saturation, middle)) < targetLuminance) low = middle;
    else high = middle;
  }
  return hslToFloatRgb(hue, saturation, (low + high) / 2);
}

/** Build lighting solely from the selected color; no palette or application state is consulted. */
export function buildSphereShading(hex: string, mode: SphereShadingMode): SphereShadingStudy {
  const base = colorFromHex(hex);
  const ramp = Array.from({ length: HALF_STEPS * 2 + 1 }, (_, index) => {
    const position = (index - HALF_STEPS) / HALF_STEPS;
    if (position === 0) return base;
    const normal = normalLighting(base.rgb, position);
    const rgb = mode === 'coldwarm' ? temperatureLighting(base.rgb, normal, position) : normal;
    return colorFromHex(rgbToHex(clamp(rgb.r, 0, 255), clamp(rgb.g, 0, 255), clamp(rgb.b, 0, 255)));
  });
  return {
    mode,
    base,
    light: ramp[HALF_STEPS + 2],
    shadow: ramp[0],
    highlight: ramp[ramp.length - 1],
    bounce: ramp[HALF_STEPS - 2],
    ramp,
  };
}

/** Continuous RGB sampling, with source material at 0 and endpoints clamped to [-1, 1]. */
export function sampleSphereRamp(study: SphereShadingStudy, position: number): Rgb {
  const p = Number.isNaN(position) ? 0 : clamp(position, -1, 1);
  if (p === 0) return { ...study.base.rgb };
  if (p === -1) return { ...study.shadow.rgb };
  if (p === 1) return { ...study.highlight.rgb };
  const offset = (p + 1) * (study.ramp.length - 1) / 2;
  const index = Math.floor(offset);
  const fraction = offset - index;
  const start = study.ramp[index].rgb;
  const end = study.ramp[index + 1].rgb;
  return {
    r: start.r + (end.r - start.r) * fraction,
    g: start.g + (end.g - start.g) * fraction,
    b: start.b + (end.b - start.b) * fraction,
  };
}
