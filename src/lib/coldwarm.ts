import { Color } from '@/types';
import { hslToRgb, rgbToHex, getColorName } from './utils';

/**
 * Coldwarm — a 2D temperature × value palette grid.
 *
 * Inspired by Vasyl Kuznetsov's "Coldwarm" Photoshop plugin, which lets
 * artists grab colours that are progressively warmer or cooler than a base
 * colour while also stepping the value (lightness).
 *
 *   Horizontal axis (columns): temperature — cold (left) → warm (right)
 *     Cold steps rotate hue toward blue (COLD_HUE) and slightly desaturate.
 *     Warm steps rotate hue toward orange (WARM_HUE) and slightly saturate.
 *
 *   Vertical axis (rows): value — light (top) → dark (bottom)
 *     Lightness is distributed proportionally into the available head/foot
 *     room so colours never clip to pure white/black.
 *
 * Both axes are normalized: the column/row *count* only changes the
 * resolution, not the total range — so a denser grid is smoother, not wider.
 * The centre cell is always the untouched base colour.
 */

const WARM_HUE = 40; // orange — the warm pole
const COLD_HUE = 220; // blue — the cold pole

const MIN_L = 6;
const MAX_L = 94;
const VALUE_SPACE_USAGE = 0.85; // how much of the available value range to span
const MAX_SAT_SHIFT = 12; // saturation swing at the warm/cold extremes, in percent

export type ColdwarmIntensity = 'subtle' | 'normal' | 'strong';

/** Maximum hue rotation (degrees) at the warm/cold extremes, per intensity. */
const INTENSITY_MAX_HUE_SHIFT: Record<ColdwarmIntensity, number> = {
  subtle: 18,
  normal: 32,
  strong: 50,
};

export interface ColdwarmCell {
  color: Color;
  tempStep: number; // negative = colder, positive = warmer, 0 = base hue
  valueStep: number; // positive = lighter, negative = darker, 0 = base value
  isBase: boolean;
}

export interface ColdwarmGrid {
  rows: ColdwarmCell[][]; // top row = lightest, left column = coldest
  size: number; // grid is size × size
}

export interface ColdwarmOptions {
  /** Number of steps on each side of the base (4 → a 9×9 grid). */
  steps?: number;
  /** Hue rotation at the extreme columns, in degrees. */
  maxHueShift?: number;
}

/** Signed shortest angular distance from `from` to `to` (-180..180). */
function shortestDelta(from: number, to: number): number {
  let d = ((to - from) % 360 + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

/** Apply a temperature shift to hue/saturation based on normalized position. */
function shiftTemperature(
  h: number,
  s: number,
  tempStep: number,
  steps: number,
  maxHueShift: number
): { h: number; s: number } {
  if (tempStep === 0) return { h, s };

  const ratio = tempStep / steps; // -1..1
  const pole = tempStep > 0 ? WARM_HUE : COLD_HUE;
  const dir = Math.sign(shortestDelta(h, pole)) || 1;
  const newH = (h + dir * Math.abs(ratio) * maxHueShift + 360) % 360;

  // Warm light gains a touch of saturation, cool shadow loses a touch.
  const newS = Math.min(Math.max(s + ratio * MAX_SAT_SHIFT, 0), 100);

  return { h: newH, s: newS };
}

/** Apply a value step, distributed proportionally to avoid clipping. */
function shiftValue(l: number, valueStep: number, steps: number): number {
  if (valueStep === 0) return l;

  const ratio = Math.abs(valueStep) / steps;
  if (valueStep > 0) {
    const available = MAX_L - l;
    return l + available * ratio * VALUE_SPACE_USAGE;
  }
  const available = l - MIN_L;
  return l - available * ratio * VALUE_SPACE_USAGE;
}

function buildCell(base: Color, tempStep: number, valueStep: number, opts: Required<ColdwarmOptions>): ColdwarmCell {
  const isBase = tempStep === 0 && valueStep === 0;
  if (isBase) {
    return { color: base, tempStep, valueStep, isBase: true };
  }

  const { h, s } = shiftTemperature(base.hsl.h, base.hsl.s, tempStep, opts.steps, opts.maxHueShift);
  const l = Math.min(Math.max(shiftValue(base.hsl.l, valueStep, opts.steps), MIN_L), MAX_L);

  const rgb = hslToRgb(h, s, l);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

  return {
    color: {
      hex,
      rgb,
      hsl: { h: Math.round(h), s: Math.round(s), l: Math.round(l) },
      name: getColorName(hex),
    },
    tempStep,
    valueStep,
    isBase: false,
  };
}

/**
 * Generate the Coldwarm grid for a base colour.
 * Rows are ordered lightest → darkest; columns coldest → warmest.
 */
export function generateColdwarmGrid(base: Color, options: ColdwarmOptions = {}): ColdwarmGrid {
  const opts: Required<ColdwarmOptions> = {
    steps: options.steps ?? 4,
    maxHueShift: options.maxHueShift ?? INTENSITY_MAX_HUE_SHIFT.normal,
  };

  const { steps } = opts;
  const rows: ColdwarmCell[][] = [];

  // valueStep from +steps (lightest, top) down to -steps (darkest, bottom)
  for (let v = steps; v >= -steps; v--) {
    const row: ColdwarmCell[] = [];
    // tempStep from -steps (coldest, left) to +steps (warmest, right)
    for (let tmp = -steps; tmp <= steps; tmp++) {
      row.push(buildCell(base, tmp, v, opts));
    }
    rows.push(row);
  }

  return { rows, size: steps * 2 + 1 };
}

export function hueShiftForIntensity(intensity: ColdwarmIntensity): number {
  return INTENSITY_MAX_HUE_SHIFT[intensity];
}
