import { Color } from '@/types';
import {
  getColorName,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHex,
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

// ── Shading scheme (single color → full lighting ramp) ──

function makeHsl(h: number, s: number, l: number): Color {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.min(Math.max(s, 0), 100);
  const ll = Math.min(Math.max(l, 0), 100);
  const rgb = hslToRgb(hh, ss, ll);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  return { hex, rgb, hsl: { h: Math.round(hh), s: Math.round(ss), l: Math.round(ll) }, name: getColorName(hex) };
}

function towardL(l: number, target: number, frac: number): number {
  return l + (target - l) * frac;
}

function hueDir(h: number, pole: number): number {
  let d = ((pole - h) % 360 + 360) % 360;
  if (d > 180) d -= 360;
  return Math.sign(d) || 1;
}

export type ShadingRole =
  | 'highlight'
  | 'light'
  | 'midtone'
  | 'shadowTone'
  | 'shadow'
  | 'rim'
  | 'background';

export interface ShadingStep {
  role: ShadingRole;
  color: Color;
}

/**
 * Derive a classic lighting ramp from a single base color, following the
 * "warm light / cool shadow" convention painters use:
 *  highlight · light · midtone (base) · shadow tone · core shadow,
 *  plus a rim/back light (luminous near-complement) and an ambient background.
 */
export function generateShadingScheme(base: Color): ShadingStep[] {
  const { h, s, l } = base.hsl;
  const warm = hueDir(h, 45); // toward orange
  const cool = hueDir(h, 250); // toward blue

  return [
    { role: 'highlight', color: makeHsl(h + warm * 18, s * 0.7, towardL(l, 96, 0.78)) },
    { role: 'light', color: makeHsl(h + warm * 9, s * 0.88, towardL(l, 96, 0.42)) },
    { role: 'midtone', color: base },
    { role: 'shadowTone', color: makeHsl(h + cool * 12, Math.min(s * 1.12, 100), towardL(l, 8, 0.34)) },
    { role: 'shadow', color: makeHsl(h + cool * 24, Math.min(s * 1.25, 100), towardL(l, 6, 0.62)) },
    { role: 'rim', color: makeHsl(h + 165, Math.min(s * 1.1 + 12, 100), towardL(l, 88, 0.62)) },
    { role: 'background', color: makeHsl(h + 200, s * 0.34, Math.min(Math.max(towardL(l, 26, 0.65), 14), 46)) },
  ];
}

// ── Poline-inspired gradient palette ──
// HSL anchors are projected to a polar XY plane (hue → angle, saturation →
// radius) with lightness as Z. Sampling a straight line between anchors in that
// space — eased per the position function — bows through hue space, giving the
// smooth, slightly "otherworldly" ramps poline is known for. No dependency.

export type EasingName = 'linear' | 'sinusoidal' | 'quadratic' | 'exponential';

const EASINGS: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,
  sinusoidal: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  quadratic: (t) => t * t,
  exponential: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
};

export const EASING_NAMES: EasingName[] = ['linear', 'sinusoidal', 'quadratic', 'exponential'];

export type GradientPartner = 'complement' | 'analogous' | 'triad';

const PARTNER_OFFSET: Record<GradientPartner, number> = {
  complement: 180,
  analogous: 45,
  triad: 120,
};

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function anchorToXYZ(h: number, s: number, l: number): Vec3 {
  const a = (h * Math.PI) / 180;
  return { x: Math.cos(a) * s, y: Math.sin(a) * s, z: l };
}

function xyzToColor(v: Vec3): Color {
  let h = (Math.atan2(v.y, v.x) * 180) / Math.PI;
  if (h < 0) h += 360;
  const s = Math.min(1, Math.hypot(v.x, v.y));
  const l = Math.min(1, Math.max(0, v.z));
  return makeHsl(h, s * 100, l * 100);
}

export interface GradientOptions {
  stops?: number;
  easing?: EasingName;
  partner?: GradientPartner;
}

/** Generate a smooth gradient palette starting from the base color. */
export function generateGradientPalette(base: Color, options: GradientOptions = {}): Color[] {
  const stops = Math.max(2, options.stops ?? 7);
  const ease = EASINGS[options.easing ?? 'sinusoidal'];
  const offset = PARTNER_OFFSET[options.partner ?? 'complement'];

  const a0 = anchorToXYZ(base.hsl.h, base.hsl.s / 100, base.hsl.l / 100);
  // Partner anchor: rotated hue, nudged toward the opposite value for range.
  const partnerL = base.hsl.l < 50 ? Math.min(base.hsl.l + 45, 92) : Math.max(base.hsl.l - 45, 12);
  const a1 = anchorToXYZ(base.hsl.h + offset, base.hsl.s / 100, partnerL / 100);

  const out: Color[] = [];
  for (let i = 0; i < stops; i++) {
    const t = stops === 1 ? 0 : i / (stops - 1);
    const tp = ease(t);
    out.push(
      xyzToColor({
        x: a0.x + (a1.x - a0.x) * tp,
        y: a0.y + (a1.y - a0.y) * tp,
        z: a0.z + (a1.z - a0.z) * tp,
      })
    );
  }
  return out;
}
