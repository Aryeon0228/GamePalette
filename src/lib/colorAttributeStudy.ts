import { hexToRgb, hslToRgb, relativeLuminance, rgbToHex } from './utils';

export type StudyHsl = { h: number; s: number; l: number };

/** Retain source precision so editing hue cannot silently round a dark color to black. */
export function preciseStudyHsl(hex: string): StudyHsl {
  const rgb = hexToRgb(hex);
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min, l = (max + min) / 2;
  if (delta === 0) return { h: 0, s: 0, l: l * 100 };
  const sector = max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: ((sector * 60) % 360 + 360) % 360, s: delta / (1 - Math.abs(2 * l - 1)) * 100, l: l * 100 };
}

/** This experiment deliberately uses HSL, not Munsell Value/Chroma. */
export function attributeColor(hsl: StudyHsl): string {
  const h = ((hsl.h % 360) + 360) % 360;
  const rgb = hslToRgb(h, Math.max(0, Math.min(100, hsl.s)), Math.max(0, Math.min(100, hsl.l)));
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/** Preserve relative luminance, then encode the neutral result for an sRGB display. */
export function luminanceGray(hex: string): string {
  const y = relativeLuminance(hex);
  const encoded = y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055;
  const channel = Math.round(encoded * 255);
  return rgbToHex(channel, channel, channel);
}
